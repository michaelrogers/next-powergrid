/**
 * PowerGrid Game Type Definitions
 * Comprehensive types for game entities, state, and mechanics
 */

import type { GameMap } from '@/lib/mapData';

export enum FuelType {
  COAL = 'coal',
  OIL = 'oil',
  GARBAGE = 'garbage',
  NUCLEAR = 'nuclear',
}

export enum RegionMap {
  USA_EAST = 'usa_east',
  USA_MIDWEST = 'usa_midwest',
  USA_WEST = 'usa_west',
  GERMANY = 'germany',
  ITALY = 'italy',
  FRANCE = 'france',
  UK = 'uk',
}

export interface PowerPlant {
  id: string;
  number: number;
  power: number; // megawatts
  fuelType: FuelType[];
  fuelCapacity: number;
  efficiency: number; // power output per fuel unit
}

export interface PlayerResource {
  playerId: string;
  fuel: Record<FuelType, number>;
  cities: number;
  money: number;
}

export interface Player {
  id: string;
  name: string;
  color: string;
  money: number;
  powerPlants: PowerPlant[];
  cities: Map<string, number>; // region -> count
  resources: Record<FuelType, number>;
  electricityProduced: number;
  isRobot?: boolean; // true if AI-controlled player
  robotDifficulty?: 'easy' | 'medium' | 'hard'; // robot difficulty level
}

export interface GameState {
  id: string;
  players: Player[];
  round: number;
  phase: GamePhase;
  currentTurn?: string; // player id
  map: RegionMap | string; // region map name
  gameMap?: GameMap; // detailed map object
  availablePowerPlants: PowerPlant[];
  fuelMarket: Record<FuelType, FuelMarketEntry[]>;
  auction?: AuctionState;
  history: GameEvent[];
}

export interface FuelMarketEntry {
  price: number;
  quantity: number;
}

export interface AuctionState {
  powerPlant: PowerPlant;
  currentBid: number;
  highestBidder?: string; // player id
  participants: Set<string>; // player ids
  round: number;
}

export enum GamePhase {
  SETUP = 'setup',
  AUCTION = 'auction',
  POWER_PLANT_DISCARD = 'power_plant_discard',
  FUEL_PURCHASE = 'fuel_purchase',
  BUILD_CITIES = 'build_cities',
  POWER_DELIVERY = 'power_delivery',
  BUREAUCRACY = 'bureaucracy',
}

export interface GameEvent {
  timestamp: Date;
  type: EventType;
  playerId?: string;
  data: Record<string, unknown>;
}

export enum EventType {
  PLAYER_JOINED = 'player_joined',
  AUCTION_STARTED = 'auction_started',
  BID_PLACED = 'bid_placed',
  AUCTION_ENDED = 'auction_ended',
  POWER_PLANT_PURCHASED = 'power_plant_purchased',
  FUEL_PURCHASED = 'fuel_purchased',
  CITY_BUILT = 'city_built',
  POWER_DELIVERED = 'power_delivered',
  ROUND_ENDED = 'round_ended',
}

export interface GameConfig {
  playerCount: number;
  map: RegionMap | 'usa' | 'germany' | 'france' | string;
  difficulty: 'easy' | 'normal' | 'medium' | 'hard';
  includedRobots?: number; // number of robot players (used for 1-player mode)
}
