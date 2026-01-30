/**
 * Auction Component
 * Visual auction interface with power plant cards
 */

'use client';

import { useState } from 'react';
import { useGame } from '@/contexts/GameContext';
import { PowerPlant } from '@/types/game';
import PowerPlantCard from './PowerPlantCard';

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
    <div className="w-full h-full bg-gradient-to-b from-slate-900 to-slate-950 rounded-lg p-8 flex flex-col items-center justify-center">
      {/* Title */}
      <h2 className="text-3xl font-bold text-yellow-400 mb-8">Auction in Progress</h2>

      {/* Power Plant Card Display */}
      <div className="mb-8">
        <PowerPlantCard
          plant={powerPlant}
          isBiddingOn={true}
          currentBid={currentBid}
          highestBidder={state.auction?.highestBidder}
        />
      </div>

      {/* Bidding Interface */}
      <div className="bg-slate-800 rounded-lg p-6 w-full max-w-md border-2 border-slate-600">
        <div className="space-y-4">
          {/* Bid Input */}
          <div>
            <label className="block text-slate-300 text-sm font-semibold mb-2">
              Your Bid
            </label>
            <div className="flex items-center gap-2">
              <span className="text-slate-400 text-lg font-bold">$</span>
              <input
                type="number"
                value={bidAmount}
                onChange={(e) => setBidAmount(Number(e.target.value))}
                min={minimumBid}
                className="flex-1 px-4 py-3 rounded bg-slate-700 border-2 border-blue-500 text-white font-bold text-lg focus:outline-none focus:border-blue-400"
              />
            </div>
            <p className="text-xs text-slate-400 mt-2">
              Minimum bid: <span className="text-yellow-400 font-bold">${minimumBid}</span>
            </p>
          </div>

          {/* Bid Status */}
          <div className="bg-slate-700 rounded p-3 border border-slate-600">
            <p className="text-xs text-slate-400 mb-1">Current highest bid</p>
            <p className="text-2xl font-bold text-yellow-400">${currentBid}</p>
            {state.auction?.highestBidder && (
              <p className="text-xs text-slate-400 mt-1">
                by <span className="text-slate-300 font-semibold">{state.auction.highestBidder}</span>
              </p>
            )}
          </div>

          {/* Action Buttons */}
          <div className="grid grid-cols-2 gap-3 pt-2">
            <button
              onClick={handleBid}
              disabled={bidAmount < minimumBid}
              className="bg-green-600 hover:bg-green-700 disabled:bg-slate-600 disabled:cursor-not-allowed text-white font-bold py-3 rounded transition-colors"
            >
              Place Bid
            </button>

            <button
              onClick={onPass}
              className="bg-red-600 hover:bg-red-700 text-white font-bold py-3 rounded transition-colors"
            >
              Pass
            </button>
          </div>

          {/* Info */}
          {bidAmount < minimumBid && (
            <p className="text-xs text-red-400 text-center">
              Your bid must be at least ${minimumBid}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
