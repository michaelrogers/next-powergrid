/**
 * Game Board Component
 * Main game interface displaying current state
 */

'use client';

import { useGame } from '@/contexts/GameContext';
import { GamePhase } from '@/types/game';
import RobotBadge from './RobotBadge';
import GameMapComponent from './GameMap';
import { getMapByName } from '@/lib/mapData';

export default function GameBoard() {
  const { state } = useGame();

  const humanPlayers = state.players.filter((p) => !p.isRobot);
  const robotPlayers = state.players.filter((p) => p.isRobot);

  return (
    <div className="grid grid-cols-4 gap-6 p-6 h-screen bg-slate-900 text-white">
      {/* Left Panel: Game Info */}
      <div className="col-span-1 bg-slate-800 rounded-lg p-4">
        <h2 className="text-2xl font-bold mb-4">Game Info</h2>
        <div className="space-y-3">
          <div>
            <p className="text-sm text-gray-400">Round</p>
            <p className="text-xl font-semibold">{state.round}</p>
          </div>
          <div>
            <p className="text-sm text-gray-400">Phase</p>
            <p className="text-lg font-semibold capitalize">{state.phase.replace(/_/g, ' ')}</p>
          </div>
          <div>
            <p className="text-sm text-gray-400">Players</p>
            <p className="text-lg font-semibold">
              {humanPlayers.length} {humanPlayers.length > 1 ? 'Humans' : 'Human'}
              {robotPlayers.length > 0 ? ` + ${robotPlayers.length} Robot${robotPlayers.length > 1 ? 's' : ''}` : ''}
            </p>
          </div>
          {robotPlayers.length > 0 && (
            <div className="pt-2 border-t border-slate-600">
              <p className="text-xs text-gray-400 mb-1">Robot Difficulty</p>
              {robotPlayers[0].robotDifficulty && (
                <RobotBadge difficulty={robotPlayers[0].robotDifficulty} size="sm" />
              )}
            </div>
          )}
        </div>
      </div>

      {/* Center Panel: Main Board */}
      <div className="col-span-2 bg-slate-800 rounded-lg p-6 flex flex-col">
        {state.gameMap ? (
          <GameMapComponent
            map={state.gameMap}
            players={state.players}
            buildMode={state.phase === GamePhase.BUILD_CITIES}
          />
        ) : (
          <div className="flex items-center justify-center h-full">
            <p className="text-gray-400">Loading map...</p>
          </div>
        )}
      </div>

      {/* Right Panel: Players */}
      <div className="col-span-1 bg-slate-800 rounded-lg p-4">
        <h2 className="text-xl font-bold mb-4">Players</h2>
        <div className="space-y-3 max-h-96 overflow-y-auto">
          {state.players.map((player) => (
            <div
              key={player.id}
              className="bg-slate-700 rounded p-3 border-l-4 space-y-1.5"
              style={{ borderLeftColor: player.color }}
            >
              <div className="flex items-center justify-between gap-2">
                <p className="font-semibold text-sm">{player.name}</p>
                {player.isRobot && player.robotDifficulty && (
                  <RobotBadge difficulty={player.robotDifficulty} size="sm" />
                )}
              </div>
              <p className="text-xs text-gray-400">Money: ${player.money}</p>
              <p className="text-xs text-gray-400">
                Cities: {Array.from(player.cities.values()).reduce((a, b) => a + b, 0)}
              </p>
              <p className="text-xs text-gray-400">Power Plants: {player.powerPlants.length}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
