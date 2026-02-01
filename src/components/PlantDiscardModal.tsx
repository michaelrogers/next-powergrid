/**
 * Plant Discard Modal Component
 * Enforces 3-plant limit by requiring player to discard when buying 4th plant
 */

'use client';

import { useGame } from '@/contexts/GameContext';
import PowerPlantCard from './PowerPlantCard';
import { PowerPlant } from '@/types/game';

export default function PlantDiscardModal() {
  const { state, dispatch } = useGame();

  if (!state.pendingPlantAward) return null;

  const player = state.players.find(p => p.id === state.pendingPlantAward!.playerId);
  if (!player) return null;

  const handleDiscard = (plantId: string) => {
    dispatch({
      type: 'DISCARD_PLANT',
      payload: {
        playerId: state.pendingPlantAward!.playerId,
        plantId,
      },
    });
  };

  // Auto-discard for robots - choose lowest-numbered plant
  if (player.isRobot && player.powerPlants.length > 0) {
    const lowestPlant = player.powerPlants.reduce((lowest, plant) => 
      plant.number < lowest.number ? plant : lowest
    );
    
    setTimeout(() => {
      handleDiscard(lowestPlant.id);
    }, 1500);
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
      <div className="bg-slate-800 rounded-lg p-6 max-w-4xl w-full border-2 border-yellow-500">
        <h2 className="text-2xl font-bold text-yellow-400 mb-4">
          ⚠️ Plant Limit Reached (3 Max)
        </h2>
        
        <div className="bg-slate-700 rounded p-4 mb-6">
          <p className="text-white mb-2">
            <span className="font-bold" style={{ color: player.color }}>{player.name}</span> won:
          </p>
          <div className="flex justify-center">
            <div className="w-48">
              <PowerPlantCard plant={state.pendingPlantAward.plant} />
            </div>
          </div>
          <p className="text-center text-slate-300 mt-2">
            Cost: ${state.pendingPlantAward.cost}
          </p>
        </div>

        {!player.isRobot && (
          <>
            <p className="text-slate-200 mb-4">
              You must discard one of your existing plants to make room:
            </p>

            <div className="grid grid-cols-3 gap-4">
              {player.powerPlants.map(plant => (
                <button
                  key={plant.id}
                  onClick={() => handleDiscard(plant.id)}
                  className="relative group transition-transform hover:scale-105"
                >
                  <PowerPlantCard plant={plant} />
                  <div className="absolute inset-0 bg-red-500 bg-opacity-0 group-hover:bg-opacity-30 rounded-lg transition-opacity flex items-center justify-center">
                    <span className="text-white font-bold text-lg opacity-0 group-hover:opacity-100 transition-opacity">
                      DISCARD
                    </span>
                  </div>
                </button>
              ))}
            </div>
          </>
        )}

        {player.isRobot && (
          <p className="text-slate-300 text-center">
            {player.name} is deciding which plant to discard...
          </p>
        )}
      </div>
    </div>
  );
}
