'use client';

import { GameProvider, useGame } from '@/contexts/GameContext';
import GameBoard from '@/components/GameBoard';
import { useState } from 'react';
import { Player, GameConfig, RegionMap } from '@/types/game';

function GameSetup() {
  const { dispatch } = useGame();
  const [playerCount, setPlayerCount] = useState(2);
  const [gameMode, setGameMode] = useState<'pvp' | 'solo'>('solo');
  const [robotDifficulty, setRobotDifficulty] = useState<'easy' | 'medium' | 'hard'>('medium');
  const [selectedMap, setSelectedMap] = useState<'usa' | 'germany' | 'france'>('usa');

  const handleStartGame = () => {
    let totalPlayers = playerCount;
    let robotCount = 0;

    if (gameMode === 'solo') {
      totalPlayers = 1 + playerCount; // 1 human + N robots
      robotCount = playerCount;
    }

    const players: Player[] = Array.from({ length: totalPlayers }, (_, i) => {
      const isRobot = gameMode === 'solo' && i > 0;
      return {
        id: `player_${i}`,
        name: isRobot ? `Robot ${i}` : 'You',
        color: ['#3B82F6', '#EF4444', '#10B981', '#F59E0B', '#8B5CF6', '#EC4899'][i % 6],
        money: 50,
        powerPlants: [],
        cities: new Map(),
        resources: { coal: 0, oil: 0, garbage: 0, nuclear: 0 },
        electricityProduced: 0,
        isRobot,
        robotDifficulty: isRobot ? robotDifficulty : undefined,
      };
    });

    const config: GameConfig = {
      playerCount: totalPlayers,
      map: selectedMap,
      difficulty: gameMode === 'solo' ? robotDifficulty : 'normal',
      includedRobots: robotCount,
    };

    dispatch({ type: 'INITIALIZE_GAME', payload: { config, players } });
  };

  return (
    <main className="flex min-h-screen w-full flex-col items-center justify-center bg-gradient-to-br from-slate-900 to-slate-800 p-6">
      <div className="max-w-md w-full bg-slate-800 rounded-lg shadow-2xl p-8 border border-slate-700">
        <h1 className="text-4xl font-bold text-white mb-2 text-center">Power Grid</h1>
        <p className="text-gray-400 text-center mb-8">Recharged - Build your power empire</p>

        <div className="space-y-6">
          {/* Game Mode Selection */}
          <div>
            <label className="block text-white font-semibold mb-3">Game Mode</label>
            <div className="flex gap-2">
              <button
                onClick={() => setGameMode('pvp')}
                className={`flex-1 py-2 px-3 rounded font-semibold transition-colors text-sm ${
                  gameMode === 'pvp'
                    ? 'bg-blue-600 text-white'
                    : 'bg-slate-700 text-gray-400 hover:bg-slate-600'
                }`}
              >
                Multiplayer
              </button>
              <button
                onClick={() => setGameMode('solo')}
                className={`flex-1 py-2 px-3 rounded font-semibold transition-colors text-sm ${
                  gameMode === 'solo'
                    ? 'bg-purple-600 text-white'
                    : 'bg-slate-700 text-gray-400 hover:bg-slate-600'
                }`}
              >
                Solo (Robots)
              </button>
            </div>
          </div>

          {/* Player Count Selection */}
          <div>
            <label className="block text-white font-semibold mb-2">
              {gameMode === 'solo' ? 'Number of Robots' : 'Number of Players'}
            </label>
            <div className="flex gap-2">
              {gameMode === 'solo' ? (
                [1, 2, 3, 4, 5].map((num) => (
                  <button
                    key={num}
                    onClick={() => setPlayerCount(num)}
                    className={`flex-1 py-2 rounded font-bold transition-colors ${
                      playerCount === num
                        ? 'bg-purple-600 text-white'
                        : 'bg-slate-700 text-gray-400 hover:bg-slate-600'
                    }`}
                  >
                    {num}
                  </button>
                ))
              ) : (
                [2, 3, 4, 5, 6].map((num) => (
                  <button
                    key={num}
                    onClick={() => setPlayerCount(num)}
                    className={`flex-1 py-2 rounded font-bold transition-colors ${
                      playerCount === num
                        ? 'bg-blue-600 text-white'
                        : 'bg-slate-700 text-gray-400 hover:bg-slate-600'
                    }`}
                  >
                    {num}
                  </button>
                ))
              )}
            </div>
          </div>

          {/* Robot Difficulty Selection */}
          {gameMode === 'solo' && (
            <div>
              <label className="block text-white font-semibold mb-2">Robot Difficulty</label>
              <div className="flex gap-2">
                {['easy', 'medium', 'hard'].map((diff) => (
                  <button
                    key={diff}
                    onClick={() => setRobotDifficulty(diff as 'easy' | 'medium' | 'hard')}
                    className={`flex-1 py-2 rounded font-semibold transition-colors text-sm capitalize ${
                      robotDifficulty === diff
                        ? 'bg-purple-600 text-white'
                        : 'bg-slate-700 text-gray-400 hover:bg-slate-600'
                    }`}
                  >
                    {diff}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Map Selection */}
          <div>
            <label className="block text-white font-semibold mb-2">Map</label>
            <div className="grid grid-cols-3 gap-2">
              {['usa', 'germany', 'france'].map((map) => (
                <button
                  key={map}
                  onClick={() => setSelectedMap(map as 'usa' | 'germany' | 'france')}
                  className={`py-2 px-3 rounded font-semibold transition-colors text-sm capitalize ${
                    selectedMap === map
                      ? 'bg-green-600 text-white'
                      : 'bg-slate-700 text-gray-400 hover:bg-slate-600'
                  }`}
                >
                  {map === 'usa' ? '🇺🇸 USA' : map === 'germany' ? '🇩🇪 Germany' : '🇫🇷 France'}
                </button>
              ))}
            </div>
          </div>

          <button
            onClick={handleStartGame}
            className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-3 rounded-lg transition-colors text-lg"
          >
            Start Game
          </button>
        </div>
      </div>
    </main>
  );
}

export default function Home() {
  const { state } = useGame();

  return state.players.length > 0 ? <GameBoard /> : <GameSetup />;
}
