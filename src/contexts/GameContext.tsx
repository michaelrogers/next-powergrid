/**
 * Game Context for managing global game state
 * Provides centralized state management for PowerGrid game
 */

'use client';

import React, { createContext, useContext, useReducer, ReactNode, useEffect } from 'react';
import { GameState, GamePhase, Player, GameConfig, RegionMap, FuelType } from '@/types/game';
import { RobotAI } from '@/lib/robotAI';
import { PowerGridEngine } from '@/lib/gameEngine';
import { getCachedMap } from '@/lib/mapCache';
import { getMapByName, USA_MAP } from '@/lib/mapData';
import type { GameMapV2 } from '@/lib/mapDataV2';

interface GameContextType {
  state: GameState;
  dispatch: React.Dispatch<GameAction>;
}

export type GameAction =
  | { type: 'INITIALIZE_GAME'; payload: { config: GameConfig; players: Player[] } }
  | { type: 'START_AUCTION'; payload: { plantId: string } }
  | { type: 'PLACE_BID'; payload: { playerId: string; amount: number } }
  | { type: 'AWARD_PLANT'; payload: { playerId: string } }
  | { type: 'PASS_AUCTION'; payload: { playerId: string } }
  | { type: 'BUY_FUEL'; payload: { playerId: string; fuelType: FuelType; quantity: number; cost: number } }
  | { type: 'BUILD_CITY'; payload: { playerId: string; cityId: string; cityName: string; cost: number } }
  | { type: 'DELIVER_POWER'; payload: { playerId: string; citiesSupplied: number; fuelConsumed: Record<FuelType, number>; payment: number } }
  | { type: 'NEXT_PHASE' }
  | { type: 'END_ROUND' }
  | { type: 'RESET_GAME' }
  | { type: 'SET_CURRENT_TURN'; payload: { playerId: string } }
  | { type: 'ROBOT_TURN'; payload: { playerId: string } };

const GameContext = createContext<GameContextType | undefined>(undefined);

const initialGameState: GameState = {
  id: '',
  players: [],
  round: 1,
  phase: GamePhase.SETUP,
  map: RegionMap.USA_EAST,
  availablePowerPlants: [],
  fuelMarket: {
    coal: [],
    oil: [],
    garbage: [],
    nuclear: [],
  },
  history: [],
};

function gameReducer(state: GameState, action: GameAction): GameState {
  switch (action.type) {
    case 'INITIALIZE_GAME': {
      const mapName = typeof action.payload.config.map === 'string' 
        ? action.payload.config.map 
        : 'usa';
      
      // Use the preloaded game map (which was set asynchronously)
      // If not available yet, fallback to old map system
      const gameMap = (action.payload as any).gameMap;
      
      const powerPlants = PowerGridEngine.createPowerPlants();
      
      return {
        ...state,
        id: `game_${Date.now()}`,
        players: action.payload.players,
        phase: GamePhase.AUCTION,
        currentTurn: action.payload.players[0]?.id,
        map: mapName,
        gameMap: gameMap || USA_MAP,
        availablePowerPlants: powerPlants,
        fuelMarket: {
          coal: Array.from({ length: 18 }, (_, i) => ({ price: 3 + Math.floor(i / 3), quantity: 1 })),
          oil: Array.from({ length: 14 }, (_, i) => ({ price: 3 + Math.floor(i / 2), quantity: 1 })),
          garbage: Array.from({ length: 9 }, (_, i) => ({ price: 4 + Math.floor(i * 1.5), quantity: 1 })),
          nuclear: Array.from({ length: 5 }, (_, i) => ({ price: 8 + i * 2, quantity: 1 })),
        },
      };
    }

    case 'START_AUCTION': {
      const plant = state.availablePowerPlants.find(p => p.id === action.payload.plantId);
      if (!plant) return state;
      
      return {
        ...state,
        auction: {
          powerPlant: plant,
          currentBid: plant.number,
          participants: new Set(state.players.map(p => p.id)),
          round: 1,
        },
      };
    }

    case 'AWARD_PLANT': {
      if (!state.auction || !state.auction.highestBidder) return state;
      
      const playerIndex = state.players.findIndex(p => p.id === action.payload.playerId);
      if (playerIndex === -1) return state;
      
      const player = state.players[playerIndex];
      const updatedPlayer = PowerGridEngine.endAuction(state.auction, player);
      
      if (!updatedPlayer) return state;
      
      const updatedPlayers = [...state.players];
      updatedPlayers[playerIndex] = updatedPlayer;
      
      return {
        ...state,
        players: updatedPlayers,
        availablePowerPlants: state.availablePowerPlants.filter(
          p => p.id !== state.auction?.powerPlant.id
        ),
        auction: undefined,
      };
    }

    case 'NEXT_PHASE': {
      const phases = Object.values(GamePhase);
      const currentIndex = phases.indexOf(state.phase);
      const nextIndex = (currentIndex + 1) % phases.length;
      return {
        ...state,
        phase: phases[nextIndex],
      };
    }

    case 'END_ROUND':
      return {
        ...state,
        round: state.round + 1,
        phase: GamePhase.AUCTION,
      };

    case 'PLACE_BID':
      if (state.auction) {
        return {
          ...state,
          auction: {
            ...state.auction,
            currentBid: action.payload.amount,
            highestBidder: action.payload.playerId,
          },
        };
      }
      return state;

    case 'BUY_FUEL': {
      const playerIndex = state.players.findIndex(p => p.id === action.payload.playerId);
      if (playerIndex === -1) return state;
      
      const player = state.players[playerIndex];
      if (player.money < action.payload.cost) return state;
      
      const updatedPlayers = [...state.players];
      updatedPlayers[playerIndex] = {
        ...player,
        money: player.money - action.payload.cost,
        resources: {
          ...player.resources,
          [action.payload.fuelType]: (player.resources[action.payload.fuelType] || 0) + action.payload.quantity,
        },
      };
      
      return {
        ...state,
        players: updatedPlayers,
      };
    }

    case 'BUILD_CITY': {
      const playerIndex = state.players.findIndex(p => p.id === action.payload.playerId);
      if (playerIndex === -1) return state;
      
      const player = state.players[playerIndex];
      if (player.money < action.payload.cost) return state;
      
      const updatedPlayers = [...state.players];
      const newCities = new Map(player.cities);
      const cityCount = newCities.get(action.payload.cityId) || 0;
      newCities.set(action.payload.cityId, cityCount + 1);
      
      updatedPlayers[playerIndex] = {
        ...player,
        money: player.money - action.payload.cost,
        cities: newCities,
      };
      
      return {
        ...state,
        players: updatedPlayers,
      };
    }

    case 'SET_CURRENT_TURN': {
      return {
        ...state,
        currentTurn: action.payload.playerId,
      };
    }

    case 'DELIVER_POWER': {
      const playerIndex = state.players.findIndex(p => p.id === action.payload.playerId);
      if (playerIndex === -1) return state;

      const player = state.players[playerIndex];
      const updatedPlayers = [...state.players];
      
      // Deduct fuel consumed
      const newResources = { ...player.resources };
      Object.entries(action.payload.fuelConsumed).forEach(([fuelType, amount]) => {
        const fuel = fuelType as FuelType;
        newResources[fuel] = Math.max(0, newResources[fuel] - amount);
      });
      
      // Add payment
      updatedPlayers[playerIndex] = {
        ...player,
        money: player.money + action.payload.payment,
        resources: newResources,
      };

      return {
        ...state,
        players: updatedPlayers,
      };
    }

    case 'ROBOT_TURN': {
      // Robot AI makes automatic decisions
      // This would be extended to handle robot auction, fuel, and build decisions
      return state;
    }

    case 'RESET_GAME':
      return initialGameState;

    default:
      return state;
  }
}

export function GameProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(gameReducer, initialGameState);
  const [pendingInit, setPendingInit] = React.useState<{ config: GameConfig; players: Player[] } | null>(null);

  // Handle async map loading before game initialization
  useEffect(() => {
    if (!pendingInit) return;

    const loadAndInitialize = async () => {
      const mapName = typeof pendingInit.config.map === 'string' 
        ? pendingInit.config.map 
        : 'usa';
      
      // Load map from trace files
      const mapV2 = await getCachedMap(mapName);
      
      // Convert GameMapV2 to GameMap format for compatibility
      const gameMap = mapV2 ? convertGameMapV2ToGameMap(mapV2) : (getMapByName(mapName) || USA_MAP);
      
      // Now dispatch with the loaded map
      dispatch({ 
        type: 'INITIALIZE_GAME', 
        payload: { 
          config: pendingInit.config, 
          players: pendingInit.players,
          gameMap, // Pass the loaded map
        } as any
      });
      
      setPendingInit(null);
    };

    loadAndInitialize();
  }, [pendingInit]);

  // Expose a function to start initialization with async map loading
  const dispatchWithMapLoading = React.useCallback((action: GameAction) => {
    if (action.type === 'INITIALIZE_GAME') {
      // Store pending init and let useEffect handle async loading
      setPendingInit({
        config: action.payload.config,
        players: action.payload.players,
      });
    } else {
      dispatch(action);
    }
  }, []);

  return (
    <GameContext.Provider value={{ state, dispatch: dispatchWithMapLoading }}>
      {children}
    </GameContext.Provider>
  );
}

/**
 * Convert GameMapV2 (from trace files) to GameMap (for game logic)
 */
function convertGameMapV2ToGameMap(mapV2: GameMapV2): typeof USA_MAP {
  const mapDimensions = {
    usa: { width: 1000, height: 600 },
    germany: { width: 800, height: 600 },
    france: { width: 800, height: 700 },
  } as const;
  
  const dims = mapDimensions[mapV2.id as keyof typeof mapDimensions] || { width: 1000, height: 600 };

  return {
    id: mapV2.id,
    name: mapV2.name,
    width: dims.width,
    height: dims.height,
    regions: mapV2.regions.map(region => ({
      id: region.id,
      name: region.name,
      cities: mapV2.cities
        .filter(city => 
          mapV2.regions
            .find(r => r.id === region.id)
            ?.cityIds.includes((city as any).id)
        )
        .map(city => ({
          id: (city as any).id,
          name: city.name,
          x: city.x,
          y: city.y,
          region: region.id,
        })),
      costMultiplier: 1.0,
      regionColor: region.regionColor,
    })),
    connections: mapV2.connections.map(conn => ({
      cityA: conn.cityA,
      cityB: conn.cityB,
    })),
    countryOutline: mapV2.countryOutline,
  } as any;
}

export function useGame() {
  const context = useContext(GameContext);
  if (!context) {
    throw new Error('useGame must be used within GameProvider');
  }
  return context;
}
