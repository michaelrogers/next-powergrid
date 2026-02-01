/**
 * Auction Market Component
 * Displays available power plants and handles bidding with turn-based gameplay
 */

'use client';

import { useState, useEffect } from 'react';
import { useGame } from '@/contexts/GameContext';
import PowerPlantCard from './PowerPlantCard';
import { PowerPlant } from '@/types/game';

export default function AuctionMarket() {
  const { state, dispatch } = useGame();
  const [bidAmount, setBidAmount] = useState(0);

  const humanPlayer = state.players.find(p => !p.isRobot);
  const currentPlayer = state.players.find(p => p.id === state.currentTurn);
  const isHumanTurn = currentPlayer && !currentPlayer.isRobot;

  // Check if all remaining auction participants are robots
  const allRemainingAreRobots = state.auction 
    ? Array.from(state.auction.participants).every(playerId => {
        const player = state.players.find(p => p.id === playerId);
        return player?.isRobot;
      })
    : false;

  // Check if all players who still need plants are robots (for auto-start logic)
  const allPlayersNeedingPlantsAreRobots = state.players
    .filter(p => !state.playersWithPlantsThisRound.has(p.id))
    .every(p => p.isRobot);

  // Auto-play robot turns in active auction
  useEffect(() => {
    if (!currentPlayer || !currentPlayer.isRobot || !state.auction) return;

    // Use shorter delay if all remaining players are robots
    const delay = allRemainingAreRobots ? 100 : 1500;

    // Dispatch ROBOT_TURN action instead of manual logic
    const timer = setTimeout(() => {
      dispatch({
        type: 'ROBOT_TURN',
        payload: { playerId: currentPlayer.id },
      });
    }, delay);

    return () => clearTimeout(timer);
  }, [currentPlayer, state.auction, dispatch, allRemainingAreRobots]);

  // Auto-start auction for robot players when no auction is active
  useEffect(() => {
    
    if (!currentPlayer || !currentPlayer.isRobot || state.auction) {
      return;
    }
    
    // Check if robot already won a plant this round
    if (state.playersWithPlantsThisRound.has(currentPlayer.id)) {
      return;
    }
    
    // Check if there are plants available
    if (state.actualMarket.length === 0) {
      return;
    }
    
    // Robot automatically starts an auction after short delay
    const delay = allPlayersNeedingPlantsAreRobots ? 100 : 1500;
    
    
    const timer = setTimeout(() => {
      // Select a plant using robot AI logic (for now, just pick first available)
      const plant = state.actualMarket[0];
      dispatch({ type: 'START_AUCTION', payload: { plantId: plant.id } });
    }, delay);

    return () => clearTimeout(timer);
  }, [currentPlayer, state.auction, state.actualMarket, state.playersWithPlantsThisRound, dispatch, allPlayersNeedingPlantsAreRobots]);

  // Update bid amount to minimum when auction state changes
  useEffect(() => {
    if (state.auction) {
      const minimumBid = state.auction.currentBid > 0 
        ? state.auction.currentBid + 1 
        : state.auction.powerPlant.number;
      setBidAmount(minimumBid);
    }
  }, [state.auction?.currentBid, state.auction?.powerPlant.number]);

  if (!humanPlayer) return null;

  const handleStartAuction = (plant: PowerPlant) => {
    // Check if human player already won a plant this round
    if (humanPlayer && state.playersWithPlantsThisRound.has(humanPlayer.id)) {
      return; // Already won a plant, can't start another auction
    }
    
    dispatch({ type: 'START_AUCTION', payload: { plantId: plant.id } });
    setBidAmount(plant.number);
  };

  const handlePlaceBid = () => {
    if (!state.auction || !isHumanTurn) return;
    
    const minimumBid = state.auction.currentBid > 0 ? state.auction.currentBid + 1 : state.auction.powerPlant.number;
    
    if (bidAmount >= minimumBid && humanPlayer.money >= bidAmount) {
      dispatch({
        type: 'PLACE_BID',
        payload: { playerId: humanPlayer.id, amount: bidAmount },
      });
      setBidAmount(bidAmount + 1);
    }
  };

  const handlePass = () => {
    if (isHumanTurn && state.auction) {
      dispatch({
        type: 'PASS_AUCTION',
        payload: { playerId: humanPlayer.id },
      });
    }
  };

  const handleAwardPlant = () => {
    if (!state.auction?.highestBidder) return;
    
    dispatch({
      type: 'AWARD_PLANT',
      payload: { playerId: state.auction.highestBidder },
    });
    
    // Refresh market by removing the awarded plant
    // And advance to next phase if all players have plants
  };

  // Active auction view
  if (state.auction) {
    const minimumBid = state.auction.currentBid > 0 ? state.auction.currentBid + 1 : state.auction.powerPlant.number;
    const isHighestBidder = state.auction.highestBidder === humanPlayer.id;
    
    // Check if human player already won a plant this round
    const humanAlreadyWonPlant = humanPlayer && state.playersWithPlantsThisRound.has(humanPlayer.id);
    
    // In first round, can only pass if you're the highest bidder or already won a plant
    const isFirstRound = state.round === 1;
    const canPass = !isFirstRound || isHighestBidder || humanAlreadyWonPlant;

    return (
      <div className="w-full h-full bg-gradient-to-b from-slate-900 to-slate-950 rounded-lg p-6 flex flex-col items-center justify-center">
        <h2 className="text-2xl font-bold text-yellow-400 mb-6">⚡ Auction in Progress</h2>
        
        {/* Already won plant warning */}
        {humanAlreadyWonPlant && (
          <div className="mb-4 bg-blue-900/30 border border-blue-500 rounded-lg p-3 max-w-md">
            <p className="text-blue-300 text-sm font-semibold text-center">
              ✓ You already won a power plant this round. You cannot participate in this auction.
            </p>
          </div>
        )}

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
          {/* Turn Indicator */}
          {currentPlayer && (
            <div className={`rounded p-3 border ${isHumanTurn ? 'bg-blue-900/30 border-blue-500' : 'bg-slate-700 border-slate-600'}`}>
              <p className="text-xs text-slate-400 mb-1">Current Turn</p>
              <p className="text-lg font-bold text-slate-200">{currentPlayer.name}</p>
              {!isHumanTurn && <p className="text-xs text-slate-400 mt-1">Thinking...</p>}
            </div>
          )}

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
                disabled={!isHumanTurn || humanAlreadyWonPlant}
                className="w-full bg-green-600 hover:bg-green-700 disabled:bg-slate-600 disabled:cursor-not-allowed text-white font-bold py-3 rounded transition-colors"
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
                disabled={!isHumanTurn || humanAlreadyWonPlant || bidAmount < minimumBid || bidAmount > humanPlayer.money}
                className="bg-blue-600 hover:bg-blue-700 disabled:bg-slate-600 disabled:cursor-not-allowed text-white font-bold py-3 rounded transition-colors"
              >
                Place Bid
              </button>
              <button
                onClick={handlePass}
                disabled={!isHumanTurn || humanAlreadyWonPlant || !canPass}
                className="bg-red-600 hover:bg-red-700 disabled:bg-slate-600 disabled:cursor-not-allowed text-white font-bold py-3 rounded transition-colors"
                title={!canPass ? "First round: Must place a bid before passing" : ""}
              >
                Pass
              </button>
            </div>
          )}

          {!canPass && isFirstRound && !humanAlreadyWonPlant && (
            <p className="text-xs text-orange-400 text-center">
              ⚠️ First round: Must place a bid to pass
            </p>
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
  const humanAlreadyWon = humanPlayer && state.playersWithPlantsThisRound.has(humanPlayer.id);
  
  return (
    <div className="w-full h-full bg-gradient-to-b from-slate-900 to-slate-950 rounded-lg p-6">
      <h2 className="text-2xl font-bold text-yellow-400 mb-6">⚡ Power Plant Market</h2>

      {humanAlreadyWon && (
        <div className="mb-4 bg-blue-900/30 border border-blue-500 rounded-lg p-3 text-center">
          <p className="text-blue-300 text-sm font-semibold">
            ✓ You already won a power plant this round. Watching other players' auctions...
          </p>
        </div>
      )}

      {/* Actual Market - Biddable Plants */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-lg font-bold text-green-400">Available for Auction</h3>
          <span className="text-xs text-slate-400 bg-slate-800 px-3 py-1 rounded-full">
            {humanAlreadyWon ? 'Watching...' : 'Click to start auction'}
          </span>
        </div>
        <div className="grid grid-cols-4 gap-4 p-4 bg-green-900/20 border-2 border-green-500 rounded-lg">
          {state.actualMarket.length > 0 ? (
            state.actualMarket.map((plant) => (
              <div key={plant.id} className="relative">
                <PowerPlantCard 
                  plant={plant} 
                  isClickable={!humanAlreadyWon}
                  onClick={() => handleStartAuction(plant)} 
                />
                {humanAlreadyWon && (
                  <div className="absolute inset-0 bg-slate-900/60 rounded-lg flex items-center justify-center">
                    <span className="text-slate-400 text-xs font-semibold">Watching</span>
                  </div>
                )}
              </div>
            ))
          ) : (
            <div className="col-span-4 text-center text-slate-500 py-8">
              No plants available for auction
            </div>
          )}
        </div>
      </div>

      {/* Futures Market - Preview Only */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-lg font-bold text-slate-400">Futures Market (Preview)</h3>
          <span className="text-xs text-slate-500 bg-slate-800 px-3 py-1 rounded-full">
            Not available yet
          </span>
        </div>
        <div className="grid grid-cols-4 gap-4 p-4 bg-slate-800/50 border-2 border-slate-600 rounded-lg opacity-75">
          {state.futuresMarket.length > 0 ? (
            state.futuresMarket.map((plant) => (
              <div key={plant.id} className="relative pointer-events-none">
                <PowerPlantCard plant={plant} />
              </div>
            ))
          ) : (
            <div className="col-span-4 text-center text-slate-600 py-8">
              No plants in futures market
            </div>
          )}
        </div>
      </div>

      {/* Deck Info */}
      {state.powerPlantDeck.length > 0 && (
        <div className="mt-4 text-center">
          <span className="text-xs text-slate-400 bg-slate-800 px-4 py-2 rounded-full inline-block">
            📚 {state.powerPlantDeck.length} plants remaining in deck
          </span>
        </div>
      )}

      {state.actualMarket.length === 0 && state.futuresMarket.length === 0 && (
        <p className="text-slate-500 text-center mt-8">No power plants available</p>
      )}
    </div>
  );
}
