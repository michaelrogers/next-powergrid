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
  showTitle?: boolean;
}

export default function PlayerPanel({ compact = false, showTitle = true }: PlayerPanelProps) {
  const { state } = useGame();
  const humanPlayer = state.players.find(p => !p.isRobot);

  if (!humanPlayer) return null;

  return (
    <div className={`bg-slate-800 rounded-lg ${compact ? 'p-2 space-y-2' : 'p-4 space-y-4'}`}>
      {showTitle && (
        <h2 className={`${compact ? 'text-base' : 'text-xl'} font-bold text-white`}>Your Empire</h2>
      )}

      {/* Stats Summary */}
      <div className={`grid grid-cols-2 ${compact ? 'gap-2' : 'gap-3'}`}>
        <div className={`bg-slate-700 rounded ${compact ? 'p-2' : 'p-3'}`}>
          <p className={`${compact ? 'text-[10px]' : 'text-xs'} text-slate-400`}>Money</p>
          <p className={`${compact ? 'text-base' : 'text-xl'} font-bold text-green-400`}>${humanPlayer.money}</p>
        </div>
        <div className={`bg-slate-700 rounded ${compact ? 'p-2' : 'p-3'}`}>
          <p className={`${compact ? 'text-[10px]' : 'text-xs'} text-slate-400`}>Cities</p>
          <p className={`${compact ? 'text-base' : 'text-xl'} font-bold text-blue-400`}>
            {Array.from(humanPlayer.cities.values()).reduce((a, b) => a + b, 0)}
          </p>
        </div>
      </div>

      {/* Power Plants */}
      <div>
        <h3 className={`${compact ? 'text-xs' : 'text-sm'} font-semibold text-slate-300 mb-2`}>
          Power Plants ({humanPlayer.powerPlants.length})
        </h3>
        {humanPlayer.powerPlants.length === 0 ? (
          <div className={`bg-slate-700 rounded ${compact ? 'p-2' : 'p-4'} text-center`}>
            <p className={`text-slate-400 ${compact ? 'text-xs' : 'text-sm'}`}>No power plants yet</p>
            {!compact && (
              <p className="text-xs text-slate-500 mt-1">Win auctions to acquire plants</p>
            )}
          </div>
        ) : (
          <div className={`${compact ? 'space-y-1 max-h-28' : 'space-y-2 max-h-64'} overflow-y-auto`}>
            {humanPlayer.powerPlants.map((plant) => (
              <div
                key={plant.id}
                className={`bg-slate-700 rounded ${compact ? 'p-2' : 'p-3'} border-l-4 border-yellow-400`}
              >
                <div className={`flex justify-between items-start ${compact ? 'mb-1' : 'mb-2'}`}>
                  <div>
                    <p className={`${compact ? 'text-sm' : 'text-lg'} font-bold text-yellow-400`}>#{plant.number}</p>
                    <p className={`${compact ? 'text-[10px]' : 'text-xs'} text-slate-400`}>
                      {plant.fuelType.map(f => f.toUpperCase()).join(' / ')}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className={`${compact ? 'text-[10px]' : 'text-sm'} text-slate-400`}>Cities</p>
                    <p className={`${compact ? 'text-sm' : 'text-lg'} font-bold text-blue-400`}>{plant.citiesPowered ?? 1}</p>
                  </div>
                </div>
                <div className={`flex justify-between ${compact ? 'text-[10px]' : 'text-xs'}`}>
                  <span className="text-slate-400">
                    Capacity: <span className="text-white font-semibold">{plant.fuelCapacity}</span>
                  </span>
                  <span className="text-slate-400">Fuel Types: <span className="text-white font-semibold">{plant.fuelType.length || 0}</span></span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Resources */}
      <div>
        <h3 className={`${compact ? 'text-xs' : 'text-sm'} font-semibold text-slate-300 mb-2`}>Fuel Resources</h3>
        <div className={`bg-slate-700 rounded ${compact ? 'p-2' : 'p-3'}`}>
          <div className={`grid grid-cols-4 ${compact ? 'gap-2' : 'gap-3'}`}>
            {Object.entries(humanPlayer.resources).map(([fuel, amount]) => (
              <div key={fuel} className="text-center">
                <div
                  className={`${compact ? 'w-7 h-7 mb-0.5' : 'w-10 h-10 mb-1'} rounded-full mx-auto flex items-center justify-center`}
                  style={{ backgroundColor: FUEL_COLORS[fuel as FuelType] }}
                >
                  <span className={`${compact ? 'text-[11px]' : 'text-sm'} text-white font-bold`}>{amount}</span>
                </div>
                <p className={`${compact ? 'text-[9px]' : 'text-xs'} text-slate-400 capitalize`}>{fuel}</p>
              </div>
            ))}
          </div>
          {humanPlayer.powerPlants.length > 0 && (
            <div className={`${compact ? 'mt-2 pt-2' : 'mt-3 pt-3'} border-t border-slate-600`}>
              <p className={`${compact ? 'text-[10px]' : 'text-xs'} text-slate-400`}>
                Total Capacity (2x):{' '}
                <span className="text-white font-semibold">
                  {Object.values(humanPlayer.resources).reduce((a, b) => a + b, 0)}/
                  {humanPlayer.powerPlants.reduce((sum, p) => sum + p.fuelCapacity * 2, 0)}
                </span>
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Power Potential */}
      {!compact && humanPlayer.powerPlants.length > 0 && (
        <div className="bg-gradient-to-r from-yellow-900/30 to-orange-900/30 rounded p-3 border border-yellow-600/30">
          <p className="text-xs text-yellow-400 font-semibold mb-1">⚡ Power Potential</p>
          <p className="text-lg font-bold text-white">
            {humanPlayer.powerPlants.reduce((sum, p) => sum + (p.citiesPowered ?? 0), 0)} cities
          </p>
          <p className="text-xs text-slate-400 mt-1">
            Max output with full fuel
          </p>
        </div>
      )}
    </div>
  );
}
