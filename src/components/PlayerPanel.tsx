/**
 * Player Panel Component
 * Shows player's power plants, resources, and stats
 */

'use client';

import { useGame } from '@/contexts/GameContext';
import { Player, FuelType } from '@/types/game';

const FUEL_COLORS: Record<FuelType, string> = {
  coal: '#1f2937',
  oil: '#7c2d12',
  garbage: '#86efac',
  nuclear: '#fbbf24',
};

interface PlayerPanelProps {
  compact?: boolean;
}

export default function PlayerPanel({ compact = false }: PlayerPanelProps) {
  const { state } = useGame();
  const humanPlayer = state.players.find(p => !p.isRobot);

  if (!humanPlayer) return null;

  return (
    <div className="bg-slate-800 rounded-lg p-4 space-y-4">
      <h2 className="text-xl font-bold text-white">Your Empire</h2>

      {/* Stats Summary */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-slate-700 rounded p-3">
          <p className="text-xs text-slate-400">Money</p>
          <p className="text-xl font-bold text-green-400">${humanPlayer.money}</p>
        </div>
        <div className="bg-slate-700 rounded p-3">
          <p className="text-xs text-slate-400">Cities</p>
          <p className="text-xl font-bold text-blue-400">
            {Array.from(humanPlayer.cities.values()).reduce((a, b) => a + b, 0)}
          </p>
        </div>
      </div>

      {/* Power Plants */}
      <div>
        <h3 className="text-sm font-semibold text-slate-300 mb-2">
          Power Plants ({humanPlayer.powerPlants.length})
        </h3>
        {humanPlayer.powerPlants.length === 0 ? (
          <div className="bg-slate-700 rounded p-4 text-center">
            <p className="text-slate-400 text-sm">No power plants yet</p>
            <p className="text-xs text-slate-500 mt-1">Win auctions to acquire plants</p>
          </div>
        ) : (
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {humanPlayer.powerPlants.map((plant) => (
              <div
                key={plant.id}
                className="bg-slate-700 rounded p-3 border-l-4 border-yellow-400"
              >
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <p className="font-bold text-yellow-400 text-lg">#{plant.number}</p>
                    <p className="text-xs text-slate-400">
                      {plant.fuelType.map(f => f.toUpperCase()).join(' / ')}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-slate-400">Power</p>
                    <p className="text-lg font-bold text-blue-400">{plant.power} MW</p>
                  </div>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-slate-400">
                    Capacity: <span className="text-white font-semibold">{plant.fuelCapacity}</span>
                  </span>
                  <span className="text-slate-400">
                    Efficiency: <span className="text-green-400 font-semibold">{plant.efficiency}x</span>
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Resources */}
      <div>
        <h3 className="text-sm font-semibold text-slate-300 mb-2">Fuel Resources</h3>
        <div className="bg-slate-700 rounded p-3">
          <div className="grid grid-cols-4 gap-3">
            {Object.entries(humanPlayer.resources).map(([fuel, amount]) => (
              <div key={fuel} className="text-center">
                <div
                  className="w-10 h-10 rounded-full mx-auto mb-1 flex items-center justify-center"
                  style={{ backgroundColor: FUEL_COLORS[fuel as FuelType] }}
                >
                  <span className="text-white font-bold text-sm">{amount}</span>
                </div>
                <p className="text-xs text-slate-400 capitalize">{fuel}</p>
              </div>
            ))}
          </div>
          {humanPlayer.powerPlants.length > 0 && (
            <div className="mt-3 pt-3 border-t border-slate-600">
              <p className="text-xs text-slate-400">
                Total Capacity:{' '}
                <span className="text-white font-semibold">
                  {Object.values(humanPlayer.resources).reduce((a, b) => a + b, 0)}/
                  {humanPlayer.powerPlants.reduce((sum, p) => sum + p.fuelCapacity, 0)}
                </span>
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Power Potential */}
      {humanPlayer.powerPlants.length > 0 && (
        <div className="bg-gradient-to-r from-yellow-900/30 to-orange-900/30 rounded p-3 border border-yellow-600/30">
          <p className="text-xs text-yellow-400 font-semibold mb-1">⚡ Power Potential</p>
          <p className="text-lg font-bold text-white">
            {humanPlayer.powerPlants.reduce((sum, p) => sum + p.power, 0)} MW
          </p>
          <p className="text-xs text-slate-400 mt-1">
            Max output with full fuel
          </p>
        </div>
      )}
    </div>
  );
}
