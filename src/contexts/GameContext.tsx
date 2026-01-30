/**
 * Game Context for managing global game state
 * Provides centralized state management for PowerGrid game
 */

'use client';

import React, { createContext, useContext, useReducer, ReactNode, useEffect } from 'react';
import { GameState, GamePhase, Player, GameConfig, RegionMap } from '@/types/game';
import { RobotAI } from '@/lib/robotAI';
import { getMapByName, USA_MAP } from '@/lib/mapData';

interface GameContextType {
  state: GameState;
  dispatch: React.Dispatch<GameAction>;
}

export type GameAction =
  | { type: 'INITIALIZE_GAME'; payload: { config: GameConfig; players: Player[] } }
  | { type: 'NEXT_PHASE' }
  | { type: 'PLACE_BID'; payload: { playerId: string; amount: number } }
  | { type: 'PASS_AUCTION'; payload: { playerId: string } }
  | { type: 'BUY_FUEL'; payload: { playerId: string; fuelType: string; quantity: number } }
  | { type: 'BUILD_CITY'; payload: { playerId: string; region: string; cityCount: number } }
  | { type: 'END_ROUND' }
  | { type: 'RESET_GAME' }
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
      
      return {
        ...state,
        id: `game_${Date.now()}`,
        players: action.payload.players,
        phase: GamePhase.AUCTION,
        map: mapName,
        gameMap,
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
