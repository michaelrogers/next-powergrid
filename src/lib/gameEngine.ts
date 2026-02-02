/**
 * PowerGrid Game Engine
 * Core game logic and rule enforcement
 */

import { GameState, PowerPlant, Player, FuelType, GamePhase, AuctionState } from '@/types/game';
import { getPowerPlants } from './powerPlants';

export class PowerGridEngine {
  /**
   * Initialize a new power plant market
   * Power plants are numbered 1-10 for each region/difficulty
   */
  static createPowerPlants(): PowerPlant[] {
    return getPowerPlants();
  }

  /**
   * Calculate maximum electricity a player can produce
   */
  static calculateMaxPower(player: Player): number {
    return player.powerPlants.reduce((total, plant) => {
      const citiesPowered = plant.citiesPowered ?? 0;
      if (plant.fuelType.length === 0 || plant.fuelCapacity === 0) {
        return total + citiesPowered;
      }

      const availableFuelTotal = plant.fuelType.reduce(
        (sum, fuel) => sum + (player.resources[fuel] || 0),
        0
      );

      if (availableFuelTotal < plant.fuelCapacity) {
        return total;
      }

      return total + citiesPowered;
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
