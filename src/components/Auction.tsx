/**
 * Auction Component
 * Handles power plant auctions
 */

'use client';

import { useState } from 'react';
import { useGame } from '@/contexts/GameContext';
import { PowerPlant } from '@/types/game';

interface AuctionProps {
  powerPlant: PowerPlant;
  onBidSubmit: (amount: number) => void;
  onPass: () => void;
}

export default function Auction({ powerPlant, onBidSubmit, onPass }: AuctionProps) {
  const { state } = useGame();
  const [bidAmount, setBidAmount] = useState(powerPlant.number);

  const currentBid = state.auction?.currentBid || 0;
  const minimumBid = currentBid > 0 ? currentBid + 1 : powerPlant.number;

  const handleBid = () => {
    if (bidAmount >= minimumBid) {
      onBidSubmit(bidAmount);
      setBidAmount(minimumBid + 1);
    }
  };

  return (
    <div className="bg-gradient-to-b from-amber-900 to-yellow-900 rounded-lg p-6 max-w-md mx-auto">
      <div className="bg-white rounded-lg p-4 mb-4">
        <h3 className="text-2xl font-bold text-center mb-2">Power Plant #{powerPlant.number}</h3>
        <div className="grid grid-cols-3 gap-2 text-center text-sm">
          <div>
            <p className="text-gray-600">Power</p>
            <p className="font-bold text-lg">{powerPlant.power} MW</p>
          </div>
          <div>
            <p className="text-gray-600">Fuel</p>
            <p className="font-bold">{powerPlant.fuelType.join(' / ')}</p>
          </div>
          <div>
            <p className="text-gray-600">Capacity</p>
            <p className="font-bold">{powerPlant.fuelCapacity}</p>
          </div>
        </div>
      </div>

      {state.auction && (
        <div className="bg-yellow-100 rounded p-3 mb-4 text-center">
          <p className="text-sm text-gray-700">Current Bid</p>
          <p className="text-3xl font-bold text-yellow-800">${state.auction.currentBid}</p>
          {state.auction.highestBidder && (
            <p className="text-xs text-gray-600 mt-1">
              by Player {state.auction.highestBidder}
            </p>
          )}
        </div>
      )}

      <div className="space-y-3">
        <div>
          <label className="block text-white text-sm mb-2">Your Bid</label>
          <input
            type="number"
            value={bidAmount}
            onChange={(e) => setBidAmount(Number(e.target.value))}
            min={minimumBid}
            className="w-full px-3 py-2 rounded bg-yellow-100 border-2 border-yellow-300 text-yellow-900 font-bold"
          />
          <p className="text-xs text-yellow-100 mt-1">Minimum: ${minimumBid}</p>
        </div>

        <button
          onClick={handleBid}
          disabled={bidAmount < minimumBid}
          className="w-full bg-green-600 hover:bg-green-700 disabled:bg-gray-600 text-white font-bold py-2 rounded"
        >
          Place Bid
        </button>

        <button
          onClick={onPass}
          className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-2 rounded"
        >
          Pass
        </button>
      </div>
    </div>
  );
}
