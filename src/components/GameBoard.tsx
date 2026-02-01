/**
 * Game Board Component
 * Main game interface displaying current state
 */

'use client';

import { useState } from 'react';
import { useGame } from '@/contexts/GameContext';
import { GamePhase } from '@/types/game';
import GameMapComponent from './GameMap';
import AuctionMarket from './AuctionMarket';
import FuelMarket from './FuelMarket';
import PlayerPanel from './PlayerPanel';
import RobotBadge from './RobotBadge';
import BureaucracyPhase from './BureaucracyPhase';


export default function GameBoard() {
  const { state, dispatch } = useGame();
  const [selectedCities, setSelectedCities] = useState<string[]>([]);

  const humanPlayers = state.players.filter((p) => !p.isRobot);
  const robotPlayers = state.players.filter((p) => p.isRobot);

  const handleReturnToMenu = () => {
    if (confirm('Are you sure you want to return to menu? All progress will be lost.')) {
      dispatch({ type: 'RESET_GAME' });
    }
  };

  const handleNextPhase = () => {
    dispatch({ type: 'NEXT_PHASE' });
  };

  const handleEndRound = () => {
    dispatch({ type: 'END_ROUND' });
  };

  const handleCityClick = (cityId: string, cityName: string) => {
    if (state.phase === GamePhase.BUILD_CITIES) {
      setSelectedCities((prev) => {
        if (prev.includes(cityId)) {
          return prev.filter((id) => id !== cityId);
        }
        return [...prev, cityId];
      });
    }
  };

  const handleBuildCity = () => {
    if (selectedCities.length > 0 && state.gameMap) {
      const player = state.players.find(p => !p.isRobot);
      if (!player) return;
      
      // Build each selected city
      selectedCities.forEach(cityId => {
        const city = state.gameMap?.regions
          .flatMap(r => r.cities)
          .find(c => c.id === cityId);
        
        if (city) {
          // Calculate cost using network validation
          const { isConnectedToNetwork, calculateBuildCost } = require('@/lib/mapData');
          const isConnected = isConnectedToNetwork(
            cityId, 
            player.cities, 
            state.gameMap!.connections
          );
          
          if (!isConnected) {
            alert(`Cannot build in ${city.name} - not connected to your network!`);
            return;
          }
          
          const cost = calculateBuildCost(
            cityId,
            player.cities,
            state.gameMap!.connections,
            10
          );
          
          if (player.money < cost) {
            alert(`Not enough money to build in ${city.name}! Cost: $${cost}`);
            return;
          }
          
          dispatch({
            type: 'BUILD_CITY',
            payload: {
              playerId: player.id,
              cityId: city.id,
              cityName: city.name,
              cost,
            },
          });
        }
      });
      setSelectedCities([]);
    }
  };

  // Render phase-specific controls
  const renderPhaseControls = () => {
    switch (state.phase) {
      case GamePhase.SETUP:
        return (
          <div className="bg-blue-900/50 border border-blue-500 rounded-lg p-4">
            <h3 className="font-bold mb-2">Setup Phase</h3>
            <p className="text-sm text-gray-300 mb-3">Game is being initialized...</p>
            <button
              onClick={handleNextPhase}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded transition-colors"
            >
              Start Game
            </button>
          </div>
        );

      case GamePhase.AUCTION:
        return (
          <div className="bg-yellow-900/50 border border-yellow-500 rounded-lg p-4">
            <h3 className="font-bold mb-2">⚡ Auction Phase</h3>
            <p className="text-sm text-gray-300 mb-3">
              Players bid on power plants. Highest bidder wins the plant.
            </p>
            <div className="space-y-2">
              <button
                onClick={handleNextPhase}
                className="w-full bg-yellow-600 hover:bg-yellow-700 text-white font-bold py-2 px-4 rounded transition-colors"
              >
                Skip Auction (For Now)
              </button>
              <p className="text-xs text-gray-400 text-center">
                Auction system will be fully implemented soon
              </p>
            </div>
          </div>
        );

      case GamePhase.FUEL_PURCHASE:
        return (
          <div className="bg-orange-900/50 border border-orange-500 rounded-lg p-4">
            <h3 className="font-bold mb-2">🛢️ Fuel Purchase Phase</h3>
            <p className="text-sm text-gray-300 mb-3">
              Buy fuel for your power plants from the market.
            </p>
            <button
              onClick={handleNextPhase}
              className="w-full bg-orange-600 hover:bg-orange-700 text-white font-bold py-2 px-4 rounded transition-colors"
            >
              Skip Fuel Purchase
            </button>
          </div>
        );

      case GamePhase.BUILD_CITIES:
        return (
          <div className="bg-green-900/50 border border-green-500 rounded-lg p-4">
            <h3 className="font-bold mb-2">🏙️ Build Cities Phase</h3>
            <p className="text-sm text-gray-300 mb-3">
              Click cities on the map to select them, then build connections.
            </p>
            {selectedCities.length > 0 && (
              <div className="mb-3 p-2 bg-slate-700 rounded">
                <p className="text-xs text-gray-400">Selected: {selectedCities.length} cities</p>
              </div>
            )}
            <div className="space-y-2">
              {selectedCities.length > 0 && (
                <button
                  onClick={handleBuildCity}
                  className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded transition-colors"
                >
                  Build in Selected Cities (${selectedCities.length * 10})
                </button>
              )}
              <button
                onClick={handleNextPhase}
                className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded transition-colors"
              >
                {selectedCities.length > 0 ? 'Skip & Continue' : 'Continue (No Build)'}
              </button>
            </div>
          </div>
        );

      case GamePhase.BUREAUCRACY:
        return (
          <div className="bg-purple-900/50 border border-purple-500 rounded-lg p-4">
            <h3 className="font-bold mb-2">💰 Bureaucracy Phase</h3>
            <p className="text-sm text-gray-300 mb-3">
              Players earn money based on cities they can power.
            </p>
            <button
              onClick={handleEndRound}
              className="w-full bg-purple-600 hover:bg-purple-700 text-white font-bold py-2 px-4 rounded transition-colors"
            >
              End Round → Round {state.round + 1}
            </button>
          </div>
        );

      default:
        return (
          <div className="bg-slate-700 rounded-lg p-4">
            <button
              onClick={handleNextPhase}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded transition-colors"
            >
              Next Phase
            </button>
          </div>
        );
    }
  };

  return (
    <div className="grid grid-cols-4 gap-6 p-6 h-screen bg-slate-900 text-white">
      {/* Left Panel: Game Info & Controls */}
      <div className="col-span-1 bg-slate-800 rounded-lg p-4 space-y-4">
        <div>
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
            {state.currentTurn && (
              <div className="mt-2 p-3 bg-blue-900/30 rounded border border-blue-500">
                <p className="text-sm text-gray-400 mb-1">Current Turn</p>
                <p className="text-lg font-semibold text-blue-300">
                  {state.players.find(p => p.id === state.currentTurn)?.name}
                </p>
              </div>
            )}
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

        {/* Phase Controls */}
        <div className="border-t border-slate-600 pt-4">
          <h3 className="text-lg font-bold mb-3">Phase Actions</h3>
          {renderPhaseControls()}
        </div>

        {/* Return to Menu */}
        <div className="border-t border-slate-600 pt-4">
          <button
            onClick={handleReturnToMenu}
            className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded transition-colors text-sm"
          >
            ← Return to Menu
          </button>
        </div>
      </div>

      {/* Center Panel: Main Board */}
      <div className="col-span-2 bg-slate-800 rounded-lg p-6 flex flex-col">
        {state.phase === GamePhase.AUCTION ? (
          <AuctionMarket />
        ) : state.phase === GamePhase.FUEL_PURCHASE ? (
          <FuelMarket />
        ) : state.phase === GamePhase.BUREAUCRACY ? (
          <BureaucracyPhase />
        ) : state.gameMap ? (
          <GameMapComponent
            map={state.gameMap}
            mapId={state.mapId}
            players={state.players}
            buildMode={state.phase === GamePhase.BUILD_CITIES}
            onCityClick={handleCityClick}
            selectedCities={selectedCities}
          />
        ) : (
          <div className="flex items-center justify-center h-full">
            <p className="text-gray-400">Loading map...</p>
          </div>
        )}
      </div>

      {/* Right Panel: Player Panel + Players List */}
      <div className="col-span-1 space-y-4">
        {/* Player's Empire Panel */}
        <PlayerPanel />

        {/* All Players List */}
        <div className="bg-slate-800 rounded-lg p-4">
          <h2 className="text-xl font-bold mb-4">All Players</h2>
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
    </div>
  );
}
