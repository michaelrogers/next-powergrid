/**
 * Auction Market Component
 * Displays available power plants and handles bidding
 */

'use client';

import { useState } from 'react';
import { useGame } from '@/contexts/GameContext';
import PowerPlantCard from './PowerPlantCard';
import { PowerPlant } from '@/types/game';

export default function AuctionMarket() {
  const { state, dispatch } = useGame();
  const [bidAmount, setBidAmount] = useState(0);

  const humanPlayer = state.players.find(p => !p.isRobot);
  if (!humanPlayer) return null;

  const handleStartAuction = (plant: PowerPlant) => {
    dispatch({ type: 'START_AUCTION', payload: { plantId: plant.id } });
    setBidAmount(plant.number);
  };

  const handlePlaceBid = () => {
    if (!state.auction) return;
    
    const minimumBid = state.auction.currentBid > 0 ? state.auction.currentBid + 1 : state.auction.powerPlant.number;
    
    if (bidAmount >= minimumBid && humanPlayer.money >= bidAmount) {
      dispatch({
        type: 'PLACE_BID',
        payload: { playerId: humanPlayer.id, amount: bidAmount },
      });
      setBidAmount(bidAmount + 1);
    }
  };

  const handleAwardPlant = () => {
    if (!state.auction?.highestBidder) return;
    
    dispatch({
      type: 'AWARD_PLANT',
      payload: { playerId: state.auction.highestBidder },
    });
  };

  const handlePass = () => {
    dispatch({ type: 'NEXT_PHASE' });
  };

  // Active auction view
  if (state.auction) {
    const minimumBid = state.auction.currentBid > 0 ? state.auction.currentBid + 1 : state.auction.powerPlant.number;
    const isHighestBidder = state.auction.highestBidder === humanPlayer.id;

    return (
      <div className="w-full h-full bg-gradient-to-b from-slate-900 to-slate-950 rounded-lg p-6 flex flex-col items-center justify-center">
        <h2 className="text-2xl font-bold text-yellow-400 mb-6">⚡ Auction in Progress</h2>

        {/* Power Plant Card */}
        <div className="mb-6">
          <PowerPlantCard
            plant={state.auction.powerPlant}
            isBiddingOn={true}
            currentBid={state.auction.currentBid}
            highestBidder={state.players.find(p => p.id === state.auction?.highestBidder)?.name}
          />
        </div>

        {/* Bidding Controls */}
        <div className="bg-slate-800 rounded-lg p-6 w-full max-w-md border-2 border-slate-600 space-y-4">
          {/* Current Status */}
          <div className="bg-slate-700 rounded p-3 border border-slate-600">
            <p className="text-xs text-slate-400 mb-1">Current Highest Bid</p>
            <p className="text-2xl font-bold text-yellow-400">${state.auction.currentBid}</p>
            {state.auction.highestBidder && (
              <p className="text-xs text-slate-400 mt-1">
                by <span className="text-slate-300 font-semibold">
                  {state.players.find(p => p.id === state.auction?.highestBidder)?.name}
                </span>
              </p>
            )}
          </div>

          {/* Player Info */}
          <div className="bg-slate-700 rounded p-3 border border-slate-600">
            <p className="text-xs text-slate-400">Your Money: <span className="text-green-400 font-bold">${humanPlayer.money}</span></p>
          </div>

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
                max={humanPlayer.money}
                className="flex-1 px-4 py-3 rounded bg-slate-700 border-2 border-blue-500 text-white font-bold text-lg focus:outline-none focus:border-blue-400"
              />
            </div>
            <p className="text-xs text-slate-400 mt-2">
              Minimum: <span className="text-yellow-400 font-bold">${minimumBid}</span>
            </p>
          </div>

          {/* Action Buttons */}
          {isHighestBidder ? (
            <div className="space-y-2">
              <button
                onClick={handleAwardPlant}
                className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-3 rounded transition-colors"
              >
                Win Plant for ${state.auction.currentBid}
              </button>
              <p className="text-xs text-green-400 text-center">
                You have the highest bid!
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={handlePlaceBid}
                disabled={bidAmount < minimumBid || bidAmount > humanPlayer.money}
                className="bg-blue-600 hover:bg-blue-700 disabled:bg-slate-600 disabled:cursor-not-allowed text-white font-bold py-3 rounded transition-colors"
              >
                Place Bid
              </button>
              <button
                onClick={handlePass}
                className="bg-red-600 hover:bg-red-700 text-white font-bold py-3 rounded transition-colors"
              >
                Pass
              </button>
            </div>
          )}

          {bidAmount < minimumBid && (
            <p className="text-xs text-red-400 text-center">
              Bid must be at least ${minimumBid}
            </p>
          )}
          {bidAmount > humanPlayer.money && (
            <p className="text-xs text-red-400 text-center">
              Insufficient funds
            </p>
          )}
        </div>
      </div>
    );
  }

  // Market view (select plant to auction)
  return (
    <div className="w-full h-full bg-gradient-to-b from-slate-900 to-slate-950 rounded-lg p-6">
      <h2 className="text-2xl font-bold text-yellow-400 mb-4">⚡ Power Plant Market</h2>
      <p className="text-slate-400 mb-6">Select a power plant to start an auction</p>

      <div className="grid grid-cols-2 gap-4 overflow-y-auto max-h-[600px]">
        {state.availablePowerPlants.slice(0, 4).map((plant) => (
          <div key={plant.id} className="relative">
            <PowerPlantCard plant={plant} isClickable onClick={() => handleStartAuction(plant)} />
          </div>
        ))}
      </div>

      {state.availablePowerPlants.length === 0 && (
        <p className="text-slate-500 text-center mt-8">No power plants available</p>
      )}

      <div className="mt-6">
        <button
          onClick={handlePass}
          className="w-full bg-slate-600 hover:bg-slate-700 text-white font-bold py-2 rounded transition-colors"
        >
          Skip Auction Phase
        </button>
      </div>
    </div>
  );
}
