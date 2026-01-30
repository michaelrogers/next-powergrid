/**
 * Bureaucracy Phase Component
 * Handles power delivery and payment calculations with robot AI
 */

'use client';

import { useState, useEffect } from 'react';
import { useGame } from '@/contexts/GameContext';
import { PowerGridEngine } from '@/lib/gameEngine';
import { FuelType } from '@/types/game';
import { RobotAI } from '@/lib/robotAI';

export default function BureaucracyPhase() {
  const { state, dispatch } = useGame();
  const [hasDelivered, setHasDelivered] = useState<Set<string>>(new Set());

  const currentPlayer = state.players.find(p => p.id === state.currentTurn);
  const isHumanTurn = currentPlayer && !currentPlayer.isRobot;
  const allDelivered = hasDelivered.size === state.players.length;

  // Auto-play robot power delivery
  useEffect(() => {
    if (!currentPlayer || !currentPlayer.isRobot || hasDelivered.has(currentPlayer.id)) return;

    const timer = setTimeout(() => {
      handlePowerCity(currentPlayer.id, 'auto');
    }, 1500);

    return () => clearTimeout(timer);
  }, [currentPlayer, hasDelivered]);

  const handlePowerCity = (playerId: string, mode: 'auto' | 'manual' = 'manual') => {
    if (hasDelivered.has(playerId)) return;

    const player = state.players.find(p => p.id === playerId);
    if (!player) return;

    const maxPower = PowerGridEngine.calculateMaxPower(player);
    const totalCities = Array.from(player.cities.values()).reduce((a, b) => a + b, 0);
    const citiesSupplied = Math.min(maxPower, totalCities);
    
    // Calculate fuel consumption
    let remainingCities = citiesSupplied;
    const fuelConsumed: Record<FuelType, number> = {
      [FuelType.COAL]: 0,
      [FuelType.OIL]: 0,
      [FuelType.GARBAGE]: 0,
      [FuelType.NUCLEAR]: 0,
    };

    // Use plants in order, consuming fuel
    for (const plant of player.powerPlants) {
      if (remainingCities <= 0) break;
      
      const citiesPowered = Math.min(plant.power, remainingCities);
      const fuelNeeded = Math.ceil(citiesPowered / plant.efficiency);
      
      // Consume fuel
      for (const fuelType of plant.fuelType) {
        if (player.resources[fuelType] >= fuelNeeded) {
          fuelConsumed[fuelType] += fuelNeeded;
          remainingCities -= citiesPowered;
          break;
        }
      }
    }

    // Calculate payment
    const payment = PowerGridEngine.calculatePayment(citiesSupplied, state.players.length);
    
    // Dispatch power delivery action
    dispatch({
      type: 'DELIVER_POWER',
      payload: {
        playerId,
        citiesSupplied,
        fuelConsumed,
        payment,
      },
    });

    // Mark as delivered
    setHasDelivered(prev => new Set(prev).add(playerId));
    
    // Advance turn if auto mode
    if (mode === 'auto') {
      advanceTurn();
    }
  };

  const advanceTurn = () => {
    if (!state.currentTurn) return;
    
    const currentIndex = state.players.findIndex(p => p.id === state.currentTurn);
    const nextIndex = (currentIndex + 1) % state.players.length;
    
    dispatch({
      type: 'SET_CURRENT_TURN',
      payload: { playerId: state.players[nextIndex].id },
    });
  };

  const handleEndRound = () => {
    if (!allDelivered) return;
    dispatch({ type: 'END_ROUND' });
    setHasDelivered(new Set());
  };

  return (
    <div className="w-full h-full bg-gradient-to-b from-slate-900 to-slate-950 rounded-lg p-6">
      <h2 className="text-2xl font-bold text-purple-400 mb-6">⚡ Bureaucracy - Power Your Cities</h2>

      <div className="space-y-4">
        {state.players.map(player => {
          const maxPower = PowerGridEngine.calculateMaxPower(player);
          const totalCities = Array.from(player.cities.values()).reduce((a, b) => a + b, 0);
          const canPower = Math.min(maxPower, totalCities);
          const hasPlayerDelivered = hasDelivered.has(player.id);

          return (
            <div
              key={player.id}
              className={`bg-slate-800 rounded-lg p-4 border-2 ${hasPlayerDelivered ? 'border-green-500' : 'border-slate-600'}`}
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div
                    className="w-6 h-6 rounded-full"
                    style={{ backgroundColor: player.color }}
                  />
                  <h3 className="text-lg font-bold text-white">{player.name}</h3>
                </div>
                <div className="text-right">
                  <p className="text-xs text-slate-400">Cities Owned</p>
                  <p className="text-xl font-bold text-white">{totalCities}</p>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3 mb-3">
                <div className="bg-slate-700 rounded p-2">
                  <p className="text-xs text-slate-400">Max Power</p>
                  <p className="text-lg font-bold text-green-400">{maxPower} MW</p>
                </div>
                <div className="bg-slate-700 rounded p-2">
                  <p className="text-xs text-slate-400">Can Power</p>
                  <p className="text-lg font-bold text-yellow-400">{canPower} cities</p>
                </div>
                <div className="bg-slate-700 rounded p-2">
                  <p className="text-xs text-slate-400">Payment</p>
                  <p className="text-lg font-bold text-green-400">
                    ${PowerGridEngine.calculatePayment(canPower, state.players.length)}
                  </p>
                </div>
              </div>

              <div className="flex gap-2 mb-3">
                <div className="flex-1 bg-slate-700 rounded p-2">
                  <p className="text-xs text-slate-400 mb-1">Fuel Resources</p>
                  <div className="flex gap-2">
                    <span className="text-sm">🪨 {player.resources.coal}</span>
                    <span className="text-sm">🛢️ {player.resources.oil}</span>
                    <span className="text-sm">🗑️ {player.resources.garbage}</span>
                    <span className="text-sm">☢️ {player.resources.nuclear}</span>
                  </div>
                </div>
              </div>

              {!player.isRobot ? (
                <button
                  onClick={() => handlePowerCity(player.id, 'manual')}
                  disabled={canPower === 0 || hasPlayerDelivered}
                  className="w-full bg-purple-600 hover:bg-purple-700 disabled:bg-slate-600 disabled:cursor-not-allowed text-white font-bold py-2 rounded transition-colors"
                >
                  {hasPlayerDelivered ? '✓ Powered' : `Power ${canPower} Cities for $${PowerGridEngine.calculatePayment(canPower, state.players.length)}`}
                </button>
              ) : (
                <div className="text-center text-slate-400 text-sm">
                  {hasPlayerDelivered ? '✓ Robot Delivered Power' : '⏳ Robot Calculating...'}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="mt-6">
        <button
          onClick={handleEndRound}
          disabled={!allDelivered}
          className="w-full bg-green-600 hover:bg-green-700 disabled:bg-slate-600 disabled:cursor-not-allowed text-white font-bold py-3 rounded transition-colors"
        >
          {allDelivered ? 'End Round & Restock Market' : `Waiting for ${state.players.length - hasDelivered.size} player(s)...`}
        </button>
      </div>
    </div>
  );
}
