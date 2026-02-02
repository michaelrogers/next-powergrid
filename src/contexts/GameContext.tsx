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
  | { type: 'DISCARD_PLANT'; payload: { playerId: string; plantId: string } }
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
  actualMarket: [],
  futuresMarket: [],
  powerPlantDeck: [],
  fuelMarket: {
    coal: [],
    oil: [],
    garbage: [],
    nuclear: [],
  },
  playersWithPlantsThisRound: new Set(),
  history: [],
};
// Helper function to find next player who hasn't won a plant this round
function findNextPlayerNeedingPlant(
  players: Player[], 
  playersWithPlants: Set<string>, 
  startAfterPlayerId?: string
): Player | null {
  if (playersWithPlants.size >= players.length) {
    return null; // All players have plants
  }
  
  let startIndex = 0;
  if (startAfterPlayerId) {
    const playerIndex = players.findIndex(p => p.id === startAfterPlayerId);
    if (playerIndex !== -1) {
      startIndex = playerIndex + 1;
    }
  }
  
  // Check players after the starting point
  for (let i = startIndex; i < players.length; i++) {
    if (!playersWithPlants.has(players[i].id)) {
      return players[i];
    }
  }
  
  // Wrap around and check from beginning
  for (let i = 0; i < startIndex; i++) {
    if (!playersWithPlants.has(players[i].id)) {
      return players[i];
    }
  }
  
  return null;
}
function gameReducer(state: GameState, action: GameAction): GameState {
  switch (action.type) {
    case 'INITIALIZE_GAME': {
      const mapName = typeof action.payload.config.map === 'string' 
        ? action.payload.config.map 
        : 'usa';
      
      // Use the preloaded game map (which was set asynchronously)
      // If not available yet, fallback to old map system
      const gameMap = (action.payload as any).gameMap;
      
      const allPlants = PowerGridEngine.createPowerPlants();
      
      // Sort all plants by number (ascending)
      const sortedPlants = [...allPlants].sort((a, b) => a.number - b.number);
      
      // Split into actual market (4), futures market (4), and deck (rest)
      const actualMarket = sortedPlants.slice(0, 4);
      const futuresMarket = sortedPlants.slice(4, 8);
      const powerPlantDeck = sortedPlants.slice(8);
      
      return {
        ...state,
        id: `game_${Date.now()}`,
        players: action.payload.players,
        phase: GamePhase.AUCTION,
        currentTurn: action.payload.players[0]?.id,
        map: mapName,
        mapId: mapName, // Store map ID for loading GameMapV2 for Voronoi rendering
        gameMap: gameMap || USA_MAP,
        availablePowerPlants: actualMarket, // For backwards compatibility
        actualMarket,
        futuresMarket,
        powerPlantDeck,
        fuelMarket: {
          coal: Array.from({ length: 18 }, (_, i) => ({ price: 3 + Math.floor(i / 3), quantity: 1 })),
          oil: Array.from({ length: 14 }, (_, i) => ({ price: 3 + Math.floor(i / 2), quantity: 1 })),
          garbage: Array.from({ length: 9 }, (_, i) => ({ price: 4 + Math.floor(i * 1.5), quantity: 1 })),
          nuclear: Array.from({ length: 5 }, (_, i) => ({ price: 8 + i * 2, quantity: 1 })),
        },
      };
    }

    case 'START_AUCTION': {
      // Only allow starting auction with plants from actual market
      let plant = state.actualMarket.find(p => p.id === action.payload.plantId);
      
      // If no specific plant, use first in actual market
      if (!plant && state.actualMarket.length > 0) {
        plant = state.actualMarket[0];
      }
      
      if (!plant) return state;
      
      // Initialize auction with only players who haven't won a plant this round
      const participants = new Set(
        state.players
          .filter(p => !state.playersWithPlantsThisRound.has(p.id))
          .map(p => p.id)
      );
      
      // If no eligible participants, skip auction
      if (participants.size === 0) {
        return state;
      }
      
      const firstPlayer = state.players.find(p => participants.has(p.id));
      
      return {
        ...state,
        auction: {
          powerPlant: plant,
          currentBid: 0, // Start at 0, first bid must be >= plant.number
          participants,
          round: 1,
        },
        currentTurn: firstPlayer?.id || '',
      };
    }

    case 'AWARD_PLANT': {
      if (!state.auction || !state.auction.highestBidder) return state;
      
      const playerIndex = state.players.findIndex(p => p.id === action.payload.playerId);
      if (playerIndex === -1) return state;
      
      const player = state.players[playerIndex];
      
      // Check 3-plant limit - if player has 3 plants, store pending award for discard selection
      if (player.powerPlants.length >= 3) {
        return {
          ...state,
          pendingPlantAward: {
            playerId: action.payload.playerId,
            plant: state.auction.powerPlant,
            cost: state.auction.currentBid,
          },
        };
      }
      
      const updatedPlayer = PowerGridEngine.endAuction(state.auction, player);
      
      if (!updatedPlayer) return state;
      
      const updatedPlayers = [...state.players];
      updatedPlayers[playerIndex] = updatedPlayer;
      
      // Remove awarded plant from market and refresh
      const removedPlantId = state.auction.powerPlant.id;
      const newActualMarket = state.actualMarket.filter(p => p.id !== removedPlantId);
      
      // Draw new plant from deck if available
      let newDeck = [...state.powerPlantDeck];
      let newFuturesMarket = [...state.futuresMarket];
      
      if (newDeck.length > 0) {
        const drawnPlant = newDeck[0];
        newDeck = newDeck.slice(1);
        
        // Combine markets and drawn plant, then re-sort
        const allMarketPlants = [...newActualMarket, ...newFuturesMarket, drawnPlant]
          .sort((a, b) => a.number - b.number);
        
        // Split back into actual (4) and futures (4)
        newActualMarket.splice(0, newActualMarket.length, ...allMarketPlants.slice(0, 4));
        newFuturesMarket = allMarketPlants.slice(4, 8);
      } else if (newFuturesMarket.length > 0) {
        // No deck, move from futures to actual
        const allMarketPlants = [...newActualMarket, ...newFuturesMarket]
          .sort((a, b) => a.number - b.number);
        newActualMarket.splice(0, newActualMarket.length, ...allMarketPlants.slice(0, 4));
        newFuturesMarket = allMarketPlants.slice(4);
      }
      
      // Add winner to players who won plants this round
      const updatedPlayersWithPlants = new Set(state.playersWithPlantsThisRound);
      updatedPlayersWithPlants.add(action.payload.playerId);
      
      // Find next player who hasn't won a plant yet
      const nextPlayerWhoNeedsPlant = findNextPlayerNeedingPlant(
        state.players,
        updatedPlayersWithPlants,
        action.payload.playerId
      );
      
      // If all players have won plants, move to next phase
      if (!nextPlayerWhoNeedsPlant) {
        return {
          ...state,
          players: updatedPlayers,
          actualMarket: newActualMarket,
          futuresMarket: newFuturesMarket,
          powerPlantDeck: newDeck,
          availablePowerPlants: newActualMarket,
          auction: undefined,
          playersWithPlantsThisRound: updatedPlayersWithPlants,
          phase: GamePhase.FUEL_PURCHASE,
        };
      }
      
      return {
        ...state,
        players: updatedPlayers,
        actualMarket: newActualMarket,
        futuresMarket: newFuturesMarket,
        powerPlantDeck: newDeck,
        availablePowerPlants: newActualMarket, // Backwards compatibility
        auction: undefined,
        playersWithPlantsThisRound: updatedPlayersWithPlants,
        currentTurn: nextPlayerWhoNeedsPlant.id || 'player_1',
      };
    }

    case 'DISCARD_PLANT': {
      if (!state.pendingPlantAward) return state;
      
      const playerIndex = state.players.findIndex(p => p.id === action.payload.playerId);
      if (playerIndex === -1) return state;
      
      const player = state.players[playerIndex];
      const pendingAward = state.pendingPlantAward; // Store for type safety
      
      // Remove the discarded plant
      const updatedPlants = player.powerPlants.filter(p => p.id !== action.payload.plantId);
      
      // Add the new plant and deduct money
      const playerWithNewPlant = {
        ...player,
        powerPlants: [...updatedPlants, pendingAward.plant],
        money: player.money - pendingAward.cost,
      };
      
      const updatedPlayers = [...state.players];
      updatedPlayers[playerIndex] = playerWithNewPlant;
      
      // Remove awarded plant from market and refresh
      const removedPlantId = pendingAward.plant.id;
      const newActualMarket = state.actualMarket.filter(p => p.id !== removedPlantId);
      
      // Draw new plant from deck if available
      let newDeck = [...state.powerPlantDeck];
      let newFuturesMarket = [...state.futuresMarket];
      
      if (newDeck.length > 0) {
        const drawnPlant = newDeck[0];
        newDeck = newDeck.slice(1);
        
        // Combine markets and drawn plant, then re-sort
        const allMarketPlants = [...newActualMarket, ...newFuturesMarket, drawnPlant]
          .sort((a, b) => a.number - b.number);
        
        // Split back into actual (4) and futures (4)
        newActualMarket.splice(0, newActualMarket.length, ...allMarketPlants.slice(0, 4));
        newFuturesMarket = allMarketPlants.slice(4, 8);
      } else if (newFuturesMarket.length > 0) {
        // No deck, move from futures to actual
        const allMarketPlants = [...newActualMarket, ...newFuturesMarket]
          .sort((a, b) => a.number - b.number);
        newActualMarket.splice(0, newActualMarket.length, ...allMarketPlants.slice(0, 4));
        newFuturesMarket = allMarketPlants.slice(4);
      }
      
      // Add winner to players who won plants this round
      const updatedPlayersWithPlants = new Set(state.playersWithPlantsThisRound);
      updatedPlayersWithPlants.add(action.payload.playerId);
      
      // Find next player who hasn't won a plant yet
      const nextPlayerWhoNeedsPlant = findNextPlayerNeedingPlant(
        state.players,
        updatedPlayersWithPlants,
        action.payload.playerId
      );
      
      // If all players have won plants, move to next phase
      if (!nextPlayerWhoNeedsPlant) {
        return {
          ...state,
          players: updatedPlayers,
          actualMarket: newActualMarket,
          futuresMarket: newFuturesMarket,
          powerPlantDeck: newDeck,
          availablePowerPlants: newActualMarket,
          auction: undefined,
          pendingPlantAward: undefined,
          playersWithPlantsThisRound: updatedPlayersWithPlants,
          phase: GamePhase.FUEL_PURCHASE,
        };
      }
      
      return {
        ...state,
        players: updatedPlayers,
        actualMarket: newActualMarket,
        futuresMarket: newFuturesMarket,
        powerPlantDeck: newDeck,
        availablePowerPlants: newActualMarket, // Backwards compatibility
        auction: undefined,
        pendingPlantAward: undefined,
        playersWithPlantsThisRound: updatedPlayersWithPlants,
        currentTurn: nextPlayerWhoNeedsPlant.id,
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
        playersWithPlantsThisRound: new Set(), // Reset for new round
      };

    case 'PLACE_BID':
      if (state.auction) {
        const updatedAuction = PowerGridEngine.placeBid(state.auction, action.payload.playerId, action.payload.amount);
        if (updatedAuction) {
          // Advance to next active participant
          const activeParticipants = Array.from(updatedAuction.participants);
          const currentIndex = activeParticipants.indexOf(action.payload.playerId);
          const nextIndex = (currentIndex + 1) % activeParticipants.length;
          const nextPlayerId = activeParticipants[nextIndex];
          
          return {
            ...state,
            auction: updatedAuction,
            currentTurn: nextPlayerId,
          };
        }
      }
      return state;

    case 'PASS_AUCTION':
      if (state.auction) {
        const updatedParticipants = new Set(state.auction.participants);
        updatedParticipants.delete(action.payload.playerId);
        
        // If all passed (no one bid), plant is discarded and market refreshed
        if (updatedParticipants.size === 0) {
          const removedPlantId = state.auction.powerPlant.id;
          const newActualMarket = state.actualMarket.filter(p => p.id !== removedPlantId);
          
          // Draw new plant from deck if available
          let newDeck = [...state.powerPlantDeck];
          let newFuturesMarket = [...state.futuresMarket];
          
          if (newDeck.length > 0) {
            const drawnPlant = newDeck[0];
            newDeck = newDeck.slice(1);
            
            // Combine markets and drawn plant, then re-sort
            const allMarketPlants = [...newActualMarket, ...newFuturesMarket, drawnPlant]
              .sort((a, b) => a.number - b.number);
            
            // Split back into actual (4) and futures (4)
            newActualMarket.splice(0, newActualMarket.length, ...allMarketPlants.slice(0, 4));
            newFuturesMarket = allMarketPlants.slice(4, 8);
          } else if (newFuturesMarket.length > 0) {
            // No deck, move from futures to actual
            const allMarketPlants = [...newActualMarket, ...newFuturesMarket]
              .sort((a, b) => a.number - b.number);
            newActualMarket.splice(0, newActualMarket.length, ...allMarketPlants.slice(0, 4));
            newFuturesMarket = allMarketPlants.slice(4);
          }
          
          // Find next player who needs a plant
          const nextPlayerNeedingPlant = findNextPlayerNeedingPlant(
            state.players,
            state.playersWithPlantsThisRound
          );
          
          // If all players have won, move to next phase
          if (!nextPlayerNeedingPlant) {
            return {
              ...state,
              auction: undefined,
              actualMarket: newActualMarket,
              futuresMarket: newFuturesMarket,
              powerPlantDeck: newDeck,
              availablePowerPlants: newActualMarket,
              phase: GamePhase.FUEL_PURCHASE,
            };
          }
          
          return {
            ...state,
            auction: undefined,
            actualMarket: newActualMarket,
            futuresMarket: newFuturesMarket,
            powerPlantDeck: newDeck,
            availablePowerPlants: newActualMarket,
            currentTurn: nextPlayerNeedingPlant.id,
          };
        }
        
        // If only 1 participant left and someone has bid, award plant automatically
        if (updatedParticipants.size === 1 && state.auction.highestBidder) {
          const winnerId = Array.from(updatedParticipants)[0];
          const winner = state.players.find(p => p.id === winnerId);
          
          if (winner && winner.money >= state.auction.currentBid) {
            // Check 3-plant limit
            if (winner.powerPlants.length >= 3) {
              return {
                ...state,
                auction: {
                  ...state.auction,
                  participants: updatedParticipants,
                },
                pendingPlantAward: {
                  playerId: winnerId,
                  plant: state.auction.powerPlant,
                  cost: state.auction.currentBid,
                },
              };
            }
            
            const updatedWinner = PowerGridEngine.endAuction(state.auction, winner);
            if (updatedWinner) {
              const updatedPlayers = state.players.map(p => p.id === winnerId ? updatedWinner : p);
              
              // Refresh market after awarding plant
              const removedPlantId = state.auction.powerPlant.id;
              const newActualMarket = state.actualMarket.filter(p => p.id !== removedPlantId);
              
              let newDeck = [...state.powerPlantDeck];
              let newFuturesMarket = [...state.futuresMarket];
              
              if (newDeck.length > 0) {
                const drawnPlant = newDeck[0];
                newDeck = newDeck.slice(1);
                
                const allMarketPlants = [...newActualMarket, ...newFuturesMarket, drawnPlant]
                  .sort((a, b) => a.number - b.number);
                
                newActualMarket.splice(0, newActualMarket.length, ...allMarketPlants.slice(0, 4));
                newFuturesMarket = allMarketPlants.slice(4, 8);
              } else if (newFuturesMarket.length > 0) {
                const allMarketPlants = [...newActualMarket, ...newFuturesMarket]
                  .sort((a, b) => a.number - b.number);
                newActualMarket.splice(0, newActualMarket.length, ...allMarketPlants.slice(0, 4));
                newFuturesMarket = allMarketPlants.slice(4);
              }
              
              // Add winner to players who won plants this round
              const updatedPlayersWithPlants = new Set(state.playersWithPlantsThisRound);
              updatedPlayersWithPlants.add(winnerId);
              
              // Find next player who needs a plant
              const nextPlayerNeedingPlant = findNextPlayerNeedingPlant(
                state.players,
                updatedPlayersWithPlants,
                winnerId
              );
              
              // If all players have won, move to next phase
              if (!nextPlayerNeedingPlant) {
                return {
                  ...state,
                  players: updatedPlayers,
                  auction: undefined,
                  actualMarket: newActualMarket,
                  futuresMarket: newFuturesMarket,
                  powerPlantDeck: newDeck,
                  availablePowerPlants: newActualMarket,
                  playersWithPlantsThisRound: updatedPlayersWithPlants,
                  phase: GamePhase.FUEL_PURCHASE,
                };
              }
              
              return {
                ...state,
                players: updatedPlayers,
                auction: undefined,
                actualMarket: newActualMarket,
                futuresMarket: newFuturesMarket,
                powerPlantDeck: newDeck,
                availablePowerPlants: newActualMarket,
                playersWithPlantsThisRound: updatedPlayersWithPlants,
                currentTurn: nextPlayerNeedingPlant.id,
              };
            }
          }
        }
        
        // Move to next participant
        const remainingPlayers = Array.from(updatedParticipants);
        const nextPlayer = remainingPlayers[0];
        
        return {
          ...state,
          auction: {
            ...state.auction,
            participants: updatedParticipants,
          },
          currentTurn: nextPlayer,
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
      // Robot AI makes automatic decisions during auction
      const robotId = action.payload.playerId;
      const robot = state.players.find(p => p.id === robotId);
      
      
      if (!robot || !robot.isRobot || !state.auction) {
        return state;
      }
      
      // Check if robot is still in auction
      if (!state.auction.participants.has(robotId)) {
        return state;
      }
      
      
      // Get robot's difficulty and strategy
      const difficulty = robot.robotDifficulty || 'medium';
      const strategy = RobotAI.STRATEGIES[difficulty];
      
      // Decide whether to bid or pass
      const bidAmount = RobotAI.decideBid(
        robot,
        state.auction.powerPlant,
        state.auction.currentBid,
        strategy
      );
      
      
      if (bidAmount !== null && bidAmount > 0) {
        // Place bid and advance to next participant
        const updatedAuction = PowerGridEngine.placeBid(state.auction, robotId, bidAmount);
        if (updatedAuction) {
          const activeParticipants = Array.from(updatedAuction.participants);
          const currentIndex = activeParticipants.indexOf(robotId);
          const nextIndex = (currentIndex + 1) % activeParticipants.length;
          const nextPlayerId = activeParticipants[nextIndex];
          
          
          return {
            ...state,
            auction: updatedAuction,
            currentTurn: nextPlayerId,
          };
        }
      } else {
        // Pass auction
        const updatedParticipants = new Set(state.auction.participants);
        updatedParticipants.delete(robotId);
        
        // If all passed, award to highest bidder if possible, otherwise discard plant
        if (updatedParticipants.size === 0) {
          if (state.auction.highestBidder) {
            const winnerId = state.auction.highestBidder;
            const winner = state.players.find(p => p.id === winnerId);
            
            if (winner && winner.money >= state.auction.currentBid) {
              const updatedWinner = PowerGridEngine.endAuction(state.auction, winner);
              if (updatedWinner) {
                const updatedPlayers = state.players.map(p => p.id === winnerId ? updatedWinner : p);
                
                // Add winner to players who won plants this round
                const updatedPlayersWithPlants = new Set(state.playersWithPlantsThisRound);
                updatedPlayersWithPlants.add(winnerId);
                
                // Find next player who needs a plant
                const nextPlayerNeedingPlant = findNextPlayerNeedingPlant(
                  state.players,
                  updatedPlayersWithPlants,
                  winnerId
                );
                
                
                if (!nextPlayerNeedingPlant) {
                  return {
                    ...state,
                    players: updatedPlayers,
                    auction: undefined,
                    availablePowerPlants: state.availablePowerPlants.filter(p => p.id !== state.auction!.powerPlant.id),
                    playersWithPlantsThisRound: updatedPlayersWithPlants,
                    phase: GamePhase.FUEL_PURCHASE,
                  };
                }
                
                return {
                  ...state,
                  players: updatedPlayers,
                  auction: undefined,
                  availablePowerPlants: state.availablePowerPlants.filter(p => p.id !== state.auction!.powerPlant.id),
                  playersWithPlantsThisRound: updatedPlayersWithPlants,
                  currentTurn: nextPlayerNeedingPlant.id,
                };
              }
            }
          }
          
          // Find next player who needs a plant
          const nextPlayerNeedingPlant = findNextPlayerNeedingPlant(
            state.players,
            state.playersWithPlantsThisRound
          );
          
          if (!nextPlayerNeedingPlant) {
            return {
              ...state,
              auction: undefined,
              availablePowerPlants: state.availablePowerPlants.filter(p => p.id !== state.auction!.powerPlant.id),
              phase: GamePhase.FUEL_PURCHASE,
            };
          }
          
          return {
            ...state,
            auction: undefined,
            availablePowerPlants: state.availablePowerPlants.filter(p => p.id !== state.auction!.powerPlant.id),
            currentTurn: nextPlayerNeedingPlant.id,
          };
        }
        
        // If only 1 left with bid, award plant
        if (updatedParticipants.size === 1 && state.auction.highestBidder) {
          const winnerId = Array.from(updatedParticipants)[0];
          const winner = state.players.find(p => p.id === winnerId);
          
          if (winner && winner.money >= state.auction.currentBid) {
            const updatedWinner = PowerGridEngine.endAuction(state.auction, winner);
            if (updatedWinner) {
              const updatedPlayers = state.players.map(p => p.id === winnerId ? updatedWinner : p);
              
              // Add winner to players who won plants this round
              const updatedPlayersWithPlants = new Set(state.playersWithPlantsThisRound);
              updatedPlayersWithPlants.add(winnerId);
              
              // Find next player who needs a plant
              const nextPlayerNeedingPlant = findNextPlayerNeedingPlant(
                state.players,
                updatedPlayersWithPlants,
                winnerId
              );
              
              
              if (!nextPlayerNeedingPlant) {
                return {
                  ...state,
                  players: updatedPlayers,
                  auction: undefined,
                  availablePowerPlants: state.availablePowerPlants.filter(p => p.id !== state.auction!.powerPlant.id),
                  playersWithPlantsThisRound: updatedPlayersWithPlants,
                  phase: GamePhase.FUEL_PURCHASE,
                };
              }
              
              return {
                ...state,
                players: updatedPlayers,
                auction: undefined,
                availablePowerPlants: state.availablePowerPlants.filter(p => p.id !== state.auction!.powerPlant.id),
                playersWithPlantsThisRound: updatedPlayersWithPlants,
                currentTurn: nextPlayerNeedingPlant.id,
              };
            }
          }
        } else {
          // Move to next participant (cycling)
          const remainingPlayers = Array.from(updatedParticipants);
          
          // Find where the current robot would be in the list (for cycling)
          const allParticipants = Array.from(state.auction.participants);
          const currentIndex = allParticipants.indexOf(robotId);
          
          // Find next participant cyclically from current position
          let nextPlayer: string;
          let searchIndex = (currentIndex + 1) % allParticipants.length;
          let attempts = 0;
          
          // Keep looking for a remaining participant
          while (attempts < allParticipants.length && !updatedParticipants.has(allParticipants[searchIndex])) {
            searchIndex = (searchIndex + 1) % allParticipants.length;
            attempts++;
          }
          
          if (attempts < allParticipants.length) {
            nextPlayer = allParticipants[searchIndex];
          } else {
            // Fallback: just take first remaining (shouldn't happen)
            nextPlayer = remainingPlayers[0];
          }
          
          
          return {
            ...state,
            auction: {
              ...state.auction,
              participants: updatedParticipants,
            },
            currentTurn: nextPlayer,
          };
        }
      }
      
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
