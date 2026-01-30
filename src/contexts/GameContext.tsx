/**
 * Game Context for managing global game state
 * Provides centralized state management for PowerGrid game
 */

'use client';

import React, { createContext, useContext, useReducer, ReactNode, useEffect } from 'react';
import { GameState, GamePhase, Player, GameConfig, RegionMap, FuelType } from '@/types/game';
import { RobotAI } from '@/lib/robotAI';
import { PowerGridEngine } from '@/lib/gameEngine';
import { getMapByName, USA_MAP } from '@/lib/mapData';

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
      const gameMap = getMapByName(mapName) || USA_MAP;
      const powerPlants = PowerGridEngine.createPowerPlants();
      
      return {
        ...state,
        id: `game_${Date.now()}`,
        players: action.payload.players,
        phase: GamePhase.AUCTION,
        currentTurn: action.payload.players[0]?.id,
        map: mapName,
        gameMap,
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

  return (
    <GameContext.Provider value={{ state, dispatch }}>
      {children}
    </GameContext.Provider>
  );
}

export function useGame() {
  const context = useContext(GameContext);
  if (!context) {
    throw new Error('useGame must be used within GameProvider');
  }
  return context;
}
