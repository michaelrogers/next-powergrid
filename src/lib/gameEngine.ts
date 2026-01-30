/**
 * PowerGrid Game Engine
 * Core game logic and rule enforcement
 */

import { GameState, PowerPlant, Player, FuelType, GamePhase, AuctionState } from '@/types/game';

export class PowerGridEngine {
  /**
   * Initialize a new power plant market
   * Power plants are numbered 1-10 for each region/difficulty
   */
  static createPowerPlants(): PowerPlant[] {
    return [
      {
        id: 'pp_1',
        number: 3,
        power: 10,
        fuelType: [FuelType.COAL],
        fuelCapacity: 2,
        efficiency: 1,
      },
      {
        id: 'pp_2',
        number: 4,
        power: 12,
        fuelType: [FuelType.COAL],
        fuelCapacity: 2,
        efficiency: 1,
      },
      {
        id: 'pp_3',
        number: 5,
        power: 15,
        fuelType: [FuelType.OIL],
        fuelCapacity: 2,
        efficiency: 1,
      },
      {
        id: 'pp_4',
        number: 6,
        power: 20,
        fuelType: [FuelType.COAL, FuelType.OIL],
        fuelCapacity: 2,
        efficiency: 1,
      },
      {
        id: 'pp_5',
        number: 8,
        power: 35,
        fuelType: [FuelType.GARBAGE],
        fuelCapacity: 1,
        efficiency: 1,
      },
      {
        id: 'pp_6',
        number: 9,
        power: 40,
        fuelType: [FuelType.NUCLEAR],
        fuelCapacity: 1,
        efficiency: 2,
      },
    ];
  }

  /**
   * Calculate maximum electricity a player can produce
   */
  static calculateMaxPower(player: Player): number {
    return player.powerPlants.reduce((total, plant) => {
      const availableFuel = Math.min(
        ...plant.fuelType.map((fuel) => player.resources[fuel] || 0)
      );
      return total + plant.power * Math.min(availableFuel, plant.fuelCapacity);
    }, 0);
  }

  /**
   * Calculate minimum bid for a power plant auction
   */
  static getMinimumBid(currentBid: number, hasValidBid: boolean): number {
    if (!hasValidBid) return 1;
    return currentBid + 1;
  }

  /**
   * Calculate payment for supplied cities
   */
  static calculatePayment(citiesSupplied: number, playerCount: number): number {
    // Base payment schedule (simplified)
    const basePayment = citiesSupplied * 10;
    const multiplier = 1 + (playerCount - citiesSupplied) * 0.1;
    return Math.floor(basePayment * multiplier);
  }

  /**
   * Validate if a player can build in a city
   */
  static canBuildCity(player: Player, region: string, availableCities: number): boolean {
    const playerCitiesInRegion = player.cities.get(region) || 0;
    return availableCities > 0 && playerCitiesInRegion < 3; // Max 3 cities per region per player
  }

  /**
   * Start auction for a power plant
   */
  static startAuction(powerPlant: PowerPlant, participants: Set<string>): AuctionState {
    return {
      powerPlant,
      currentBid: 0,
      participants,
      round: 1,
    };
  }

  /**
   * Handle auction bid
   */
  static placeBid(
    auction: AuctionState,
    playerId: string,
    bidAmount: number
  ): AuctionState | null {
    if (!auction.participants.has(playerId)) {
      return null;
    }

    const minimumBid = this.getMinimumBid(auction.currentBid, auction.highestBidder !== undefined);

    if (bidAmount < minimumBid) {
      return null;
    }

    return {
      ...auction,
      currentBid: bidAmount,
      highestBidder: playerId,
    };
  }

  /**
   * End auction and award power plant
   */
  static endAuction(auction: AuctionState, player: Player): Player | null {
    if (!auction.highestBidder || player.id !== auction.highestBidder) {
      return null;
    }

    if (player.money < auction.currentBid) {
      return null; // Insufficient funds
    }

    return {
      ...player,
      powerPlants: [...player.powerPlants, auction.powerPlant],
      money: player.money - auction.currentBid,
    };
  }
}
