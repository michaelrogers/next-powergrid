/**
 * Robot AI Player System
 * Implements AI logic for robot players in single-player mode
 */

import { Player, PowerPlant, GameState, FuelType } from '@/types/game';
import { PowerGridEngine } from './gameEngine';

export interface RobotStrategy {
  aggressiveness: number; // 0-1, higher = more aggressive bidding
  fuelPreference: FuelType; // preferred fuel type
  expansionRate: number; // 0-1, how quickly to expand cities
}

export enum RobotDifficulty {
  EASY = 'easy',
  MEDIUM = 'medium',
  HARD = 'hard',
}

export class RobotAI {
  static readonly STRATEGIES: Record<RobotDifficulty, RobotStrategy> = {
    [RobotDifficulty.EASY]: {
      aggressiveness: 0.3,
      fuelPreference: FuelType.COAL,
      expansionRate: 0.3,
    },
    [RobotDifficulty.MEDIUM]: {
      aggressiveness: 0.6,
      fuelPreference: FuelType.OIL,
      expansionRate: 0.6,
    },
    [RobotDifficulty.HARD]: {
      aggressiveness: 0.9,
      fuelPreference: FuelType.NUCLEAR,
      expansionRate: 0.8,
    },
  };

  /**
   * Decide bid amount for power plant auction
   */
  static decideBid(
    player: Player,
    powerPlant: PowerPlant,
    currentBid: number,
    strategy: RobotStrategy
  ): number | null {
    // Don't bid if insufficient funds
    if (player.money < currentBid + 1) {
      return null;
    }

    // Evaluate power plant value
    const plantValue = this.evaluatePowerPlant(powerPlant, strategy);
    const maxBidAmount = Math.floor(player.money * 0.5); // Never spend more than 50% of money

    // Decide whether to participate based on strategy
    const shouldBid = Math.random() < strategy.aggressiveness * plantValue;

    if (!shouldBid) {
      return null;
    }

    // Calculate bid: current bid + (strategy aggression * available funds * plant value)
    const bidIncrease = Math.floor(
      (currentBid + 1) + (strategy.aggressiveness * maxBidAmount * plantValue)
    );

    return Math.min(bidIncrease, maxBidAmount);
  }

  /**
   * Evaluate power plant desirability (0-1)
   */
  private static evaluatePowerPlant(plant: PowerPlant, strategy: RobotStrategy): number {
    let score = 0.5; // Base score

    // Bonus for power output
    if (plant.power >= 30) score += 0.3;
    else if (plant.power >= 20) score += 0.2;

    // Bonus if fuel matches preference
    if (plant.fuelType.includes(strategy.fuelPreference)) {
      score += 0.2;
    }

    // Bonus for versatile fuel types
    if (plant.fuelType.length > 1) {
      score += 0.1;
    }

    return Math.min(score, 1);
  }

  /**
   * Decide how much fuel to purchase
   */
  static decideFuelPurchase(
    player: Player,
    gameState: GameState,
    strategy: RobotStrategy
  ): Record<FuelType, number> {
    const purchases: Record<FuelType, number> = {
      [FuelType.COAL]: 0,
      [FuelType.OIL]: 0,
      [FuelType.GARBAGE]: 0,
      [FuelType.NUCLEAR]: 0,
    };

    const maxSpend = player.money * 0.3; // Allocate 30% of money for fuel
    let spent = 0;

    // Buy fuel for each power plant
    for (const plant of player.powerPlants) {
      if (spent >= maxSpend) break;

      for (const fuelType of plant.fuelType) {
        const currentFuel = player.resources[fuelType] || 0;
        const maxCapacity = plant.fuelCapacity * 2;

        if (currentFuel < maxCapacity && spent < maxSpend) {
          const toBuy = Math.min(
            plant.fuelCapacity,
            maxCapacity - currentFuel,
            Math.floor((maxSpend - spent) / 2)
          );

          purchases[fuelType] += toBuy;
          spent += toBuy * 2;
        }
      }
    }

    return purchases;
  }

  /**
   * Decide which cities to build in
   */
  static decideCityBuilding(
    player: Player,
    availableCities: Map<string, number>,
    strategy: RobotStrategy
  ): Array<{ region: string; count: number }> {
    const builds: Array<{ region: string; count: number }> = [];
    const buildBudget = player.money * 0.4; // Allocate 40% for city building
    let spent = 0;

    // Cost per city: simplified as 10 + region_index * 2
    const costPerCity = 12;

    // Sort regions by name for consistency
    const sortedRegions = Array.from(availableCities.entries()).sort((a, b) =>
      a[0].localeCompare(b[0])
    );

    for (const [region, available] of sortedRegions) {
      if (available <= 0 || spent >= buildBudget) break;

      const currentCitiesInRegion = player.cities.get(region) || 0;
      const maxCanBuild = Math.min(3 - currentCitiesInRegion, available);

      if (maxCanBuild > 0 && strategy.expansionRate > Math.random()) {
        const buildCount = Math.min(
          maxCanBuild,
          Math.floor((buildBudget - spent) / costPerCity)
        );

        if (buildCount > 0) {
          builds.push({ region, count: buildCount });
          spent += buildCount * costPerCity;
        }
      }
    }

    return builds;
  }

  /**
   * Calculate electricity delivery (how many cities to supply power to)
   */
  static decideElectricityDelivery(player: Player): number {
    const maxPower = PowerGridEngine.calculateMaxPower(player);
    const totalCities = Array.from(player.cities.values()).reduce((a, b) => a + b, 0);

    // Supply power to as many cities as possible
    return Math.min(maxPower, totalCities);
  }
}
