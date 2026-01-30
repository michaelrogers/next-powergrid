/**
 * Fuel Market Component
 * Buy fuel resources for power plants with robot AI support
 */

'use client';

import { useState, useEffect } from 'react';
import { useGame } from '@/contexts/GameContext';
import { FuelType } from '@/types/game';
import { RobotAI } from '@/lib/robotAI';

const FUEL_COSTS: Record<FuelType, number> = {
  coal: 3,
  oil: 4,
  garbage: 5,
  nuclear: 8,
};

const FUEL_COLORS: Record<FuelType, string> = {
  coal: '#1f2937',
  oil: '#7c2d12',
  garbage: '#86efac',
  nuclear: '#fbbf24',
};

const FUEL_LABELS: Record<FuelType, string> = {
  coal: 'Coal',
  oil: 'Oil',
  garbage: 'Garbage',
  nuclear: 'Nuclear',
};

export default function FuelMarket() {
  const { state, dispatch } = useGame();
  const [selectedFuel, setSelectedFuel] = useState<FuelType | null>(null);
  const [quantity, setQuantity] = useState(1);

  const humanPlayer = state.players.find(p => !p.isRobot);
  const currentPlayer = state.players.find(p => p.id === state.currentTurn);
  const isHumanTurn = currentPlayer && !currentPlayer.isRobot;

  // Auto-play robot fuel purchases
  useEffect(() => {
    if (!currentPlayer || !currentPlayer.isRobot) return;

    const timer = setTimeout(() => {
      const difficulty = (currentPlayer.robotDifficulty || 'medium') as string;
      const strategy = RobotAI.STRATEGIES[difficulty.toLowerCase() as keyof typeof RobotAI.STRATEGIES];
      
      const purchases = RobotAI.decideFuelPurchase(currentPlayer, state, strategy);
      
      // Convert Record to array of purchases
      Object.entries(purchases).forEach(([fuelType, quantity]) => {
        if (quantity > 0) {
          const fuel = fuelType as FuelType;
          const fuelEntries = state.fuelMarket[fuel];
          if (fuelEntries && fuelEntries.length > 0) {
            const cost = fuelEntries[0].price * quantity;
            dispatch({
              type: 'BUY_FUEL',
              payload: {
                playerId: currentPlayer.id,
                fuelType: fuel,
                quantity,
                cost,
              },
            });
          }
        }
      });
      
      // Advance turn
      advanceTurn();
    }, 1500);

    return () => clearTimeout(timer);
  }, [currentPlayer, state.currentTurn]);

  const advanceTurn = () => {
    if (!state.currentTurn) return;
    
    const currentIndex = state.players.findIndex(p => p.id === state.currentTurn);
    const nextIndex = (currentIndex + 1) % state.players.length;
    
    dispatch({
      type: 'SET_CURRENT_TURN',
      payload: { playerId: state.players[nextIndex].id },
    });
  };

  if (!humanPlayer) return null;

  const handleBuyFuel = () => {
    if (!selectedFuel) return;
    
    const fuelEntries = state.fuelMarket[selectedFuel];
    if (!fuelEntries || fuelEntries.length === 0) return;
    
    // Get the cheapest available fuel
    const cheapestEntry = fuelEntries[0];
    const cost = cheapestEntry.price * quantity;
    
    if (humanPlayer.money >= cost) {
      dispatch({
        type: 'BUY_FUEL',
        payload: {
          playerId: humanPlayer.id,
          fuelType: selectedFuel,
          quantity,
          cost,
        },
      });
      setQuantity(1);
      advanceTurn();
    }
  };

  const handleNextPhase = () => {
    dispatch({ type: 'NEXT_PHASE' });
  };

  const fuelEntries = selectedFuel ? state.fuelMarket[selectedFuel] : [];
  const cheapestPrice = fuelEntries.length > 0 ? fuelEntries[0].price : 0;
  const cost = cheapestPrice * quantity;
  const canAfford = humanPlayer.money >= cost;

  // Calculate fuel capacity from power plants
  const totalFuelCapacity = humanPlayer.powerPlants.reduce((total, plant) => {
    return total + plant.fuelCapacity;
  }, 0);

  const currentFuelTotal = Object.values(humanPlayer.resources).reduce((a, b) => a + b, 0);
  const remainingCapacity = totalFuelCapacity - currentFuelTotal;

  return (
    <div className="w-full h-full bg-gradient-to-b from-slate-900 to-slate-950 rounded-lg p-6">
      <h2 className="text-2xl font-bold text-orange-400 mb-4">🛢️ Fuel Market</h2>
      <p className="text-slate-400 mb-6">Purchase fuel for your power plants</p>

      {/* Turn Indicator */}
      {currentPlayer && (
        <div className={`mb-4 rounded p-3 border ${isHumanTurn ? 'bg-blue-900/30 border-blue-500' : 'bg-slate-700 border-slate-600'}`}>
          <p className="text-xs text-slate-400 mb-1">Current Turn</p>
          <p className="text-lg font-bold text-slate-200">{currentPlayer.name}</p>
          {!isHumanTurn && <p className="text-xs text-slate-400 mt-1">Shopping...</p>}
        </div>
      )}

      {/* Player Info */}
      <div className="bg-slate-800 rounded-lg p-4 mb-6 border border-slate-600">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-xs text-slate-400">Your Money</p>
            <p className="text-2xl font-bold text-green-400">${humanPlayer.money}</p>
          </div>
          <div>
            <p className="text-xs text-slate-400">Storage Capacity</p>
            <p className="text-2xl font-bold text-blue-400">{currentFuelTotal}/{totalFuelCapacity}</p>
          </div>
        </div>
      </div>

      {humanPlayer.powerPlants.length === 0 ? (
        <div className="bg-slate-800 rounded-lg p-6 border border-slate-600 text-center">
          <p className="text-slate-400 mb-4">You don't own any power plants yet!</p>
          <button
            onClick={handleNextPhase}
            className="bg-orange-600 hover:bg-orange-700 text-white font-bold py-2 px-6 rounded transition-colors"
          >
            Continue
          </button>
        </div>
      ) : (
        <>
          {/* Fuel Selection */}
          <div className="grid grid-cols-4 gap-3 mb-6">
            {Object.entries(FUEL_LABELS).map(([fuel, label]) => {
              const fuelType = fuel as FuelType;
              const isSelected = selectedFuel === fuelType;
              const fuelEntries = state.fuelMarket[fuelType] || [];
              const available = fuelEntries.reduce((sum, entry) => sum + entry.quantity, 0);
              const price = fuelEntries.length > 0 ? fuelEntries[0].price : FUEL_COSTS[fuelType];

              return (
                <button
                  key={fuel}
                  onClick={() => setSelectedFuel(fuelType)}
                  className={`p-4 rounded-lg border-2 transition-all ${
                    isSelected
                      ? 'border-orange-400 bg-slate-700'
                      : 'border-slate-600 bg-slate-800 hover:border-slate-500'
                  }`}
                >
                  <div
                    className="w-12 h-12 rounded-full mx-auto mb-2"
                    style={{ backgroundColor: FUEL_COLORS[fuelType] }}
                  />
                  <p className="text-white font-semibold text-sm">{label}</p>
                  <p className="text-xs text-slate-400">${price} each</p>
                  <p className="text-xs text-slate-500 mt-1">Stock: {available}</p>
                </button>
              );
            })}
          </div>

          {/* Current Resources */}
          <div className="bg-slate-800 rounded-lg p-4 mb-6 border border-slate-600">
            <p className="text-sm text-slate-400 mb-3">Your Resources</p>
            <div className="grid grid-cols-4 gap-2">
              {Object.entries(humanPlayer.resources).map(([fuel, amount]) => (
                <div key={fuel} className="text-center">
                  <div
                    className="w-8 h-8 rounded-full mx-auto mb-1"
                    style={{ backgroundColor: FUEL_COLORS[fuel as FuelType] }}
                  />
                  <p className="text-xs text-slate-300 font-bold">{amount}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Purchase Controls */}
          {selectedFuel && (
            <div className="bg-slate-800 rounded-lg p-6 border-2 border-orange-500 space-y-4">
              <h3 className="text-lg font-bold text-white">
                Purchase {FUEL_LABELS[selectedFuel]}
              </h3>

              <div>
                <label className="block text-slate-300 text-sm font-semibold mb-2">
                  Quantity
                </label>
                <input
                  type="number"
                  value={quantity}
                  onChange={(e) => setQuantity(Math.max(1, Number(e.target.value)))}
                  min={1}
                  max={Math.min(remainingCapacity, Math.floor(humanPlayer.money / FUEL_COSTS[selectedFuel]))}
                  className="w-full px-4 py-3 rounded bg-slate-700 border-2 border-orange-400 text-white font-bold text-lg focus:outline-none focus:border-orange-300"
                />
                <p className="text-xs text-slate-400 mt-2">
                  Total cost: <span className="text-orange-400 font-bold">${cost}</span>
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={handleBuyFuel}
                  disabled={!canAfford || remainingCapacity < quantity}
                  className="bg-green-600 hover:bg-green-700 disabled:bg-slate-600 disabled:cursor-not-allowed text-white font-bold py-3 rounded transition-colors"
                >
                  Buy for ${cost}
                </button>
                <button
                  onClick={() => setSelectedFuel(null)}
                  className="bg-slate-600 hover:bg-slate-700 text-white font-bold py-3 rounded transition-colors"
                >
                  Cancel
                </button>
              </div>

              {!canAfford && (
                <p className="text-xs text-red-400 text-center">Insufficient funds</p>
              )}
              {remainingCapacity < quantity && (
                <p className="text-xs text-red-400 text-center">Not enough storage capacity</p>
              )}
            </div>
          )}

          {/* Done Button */}
          <div className="mt-6">
            <button
              onClick={handleNextPhase}
              className="w-full bg-orange-600 hover:bg-orange-700 text-white font-bold py-3 rounded transition-colors"
            >
              Continue to City Building
            </button>
          </div>
        </>
      )}
    </div>
  );
}
