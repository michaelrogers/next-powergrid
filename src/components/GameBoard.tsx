/**
 * Game Board Component
 * Main game interface displaying current state
 */

'use client';

import { useState } from 'react';
import { useGame } from '@/contexts/GameContext';
import { FuelType, GamePhase } from '@/types/game';
import GameMapComponent from './GameMap';
import AuctionMarket from './AuctionMarket';
import FuelMarket from './FuelMarket';
import PlayerPanel from './PlayerPanel';
import RobotBadge from './RobotBadge';
import BureaucracyPhase from './BureaucracyPhase';
import PlantDiscardModal from './PlantDiscardModal';

const FUEL_COLORS: Record<FuelType, string> = {
  coal: '#1f2937',
  oil: '#7c2d12',
  garbage: '#86efac',
  nuclear: '#fbbf24',
};


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
              {!state.auction && state.availablePowerPlants.length > 0 && (
                <button
                  onClick={() => {
                    const plant = state.availablePowerPlants[0];
                    const participants = new Set(state.players.map(p => p.id));
                    dispatch({
                      type: 'START_AUCTION',
                      payload: { plantId: plant.id }
                    });
                    dispatch({
                      type: 'SET_CURRENT_TURN',
                      payload: { playerId: state.players[0].id }
                    });
                  }}
                  className="w-full bg-yellow-600 hover:bg-yellow-700 text-white font-bold py-2 px-4 rounded transition-colors"
                >
                  Start Next Auction
                </button>
              )}
              {state.auction && (
                <p className="text-sm text-yellow-200 text-center">
                  Auction in progress - see market below
                </p>
              )}
              {!state.auction && state.availablePowerPlants.length === 0 && (
                <button
                  onClick={handleNextPhase}
                  className="w-full bg-yellow-600 hover:bg-yellow-700 text-white font-bold py-2 px-4 rounded transition-colors"
                >
                  No More Plants - Move to Fuel Purchase
                </button>
              )}
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
    <div className="flex flex-col h-screen bg-slate-900 text-white">
      <div className="grid grid-cols-4 gap-6 p-6 flex-1 min-h-0">
        {/* Left Panel: Game Info & Controls */}
        <div className="col-span-1 bg-slate-800 rounded-lg p-4 space-y-4">
        <div>
          <h2 className="text-2xl font-bold mb-4">Game Info</h2>
          <div className="space-y-3">
            <div>
              <p className="text-sm text-gray-400">Round</p>
              <p className="text-xl font-semibold">{state.round}</p>
            </div>
            
            {/* Phase Progression */}
            <div>
              <p className="text-sm text-gray-400 mb-2">Game Phase</p>
              <div className="space-y-1">
                {[
                  { phase: GamePhase.AUCTION, label: 'Auction', icon: '⚡' },
                  { phase: GamePhase.FUEL_PURCHASE, label: 'Fuel', icon: '🛢️' },
                  { phase: GamePhase.BUILD_CITIES, label: 'Build', icon: '🏙️' },
                  { phase: GamePhase.BUREAUCRACY, label: 'Power', icon: '💰' },
                ].map(({ phase, label, icon }) => {
                  const isActive = state.phase === phase;
                  const isPast = Object.values(GamePhase).indexOf(state.phase) > Object.values(GamePhase).indexOf(phase);
                  return (
                    <div
                      key={phase}
                      className={`flex items-center gap-2 px-2 py-1.5 rounded transition-all ${
                        isActive
                          ? 'bg-yellow-500/20 border border-yellow-500 shadow-lg'
                          : isPast
                          ? 'bg-green-900/20 border border-green-700 opacity-50'
                          : 'bg-slate-700 border border-slate-600 opacity-40'
                      }`}
                    >
                      <span className="text-base">{icon}</span>
                      <span className={`text-xs font-semibold ${
                        isActive ? 'text-yellow-300' : isPast ? 'text-green-400' : 'text-slate-400'
                      }`}>
                        {label}
                      </span>
                      {isActive && (
                        <span className="ml-auto text-xs text-yellow-400 animate-pulse">▶</span>
                      )}
                      {isPast && (
                        <span className="ml-auto text-xs text-green-500">✓</span>
                      )}
                    </div>
                  );
                })}
              </div>
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

        {/* Right Panel: All Players */}
        <div className="col-span-1 space-y-4">
          <div className="bg-slate-800 rounded-lg p-4">
            <h2 className="text-xl font-bold mb-4">All Players</h2>
            <div className="space-y-3 max-h-[48rem] overflow-y-auto">
              {state.players.map((player) => {
                const isCurrentTurn = state.currentTurn === player.id;
                const totalFuelStored = Object.values(player.resources).reduce((a, b) => a + b, 0);
                const totalFuelCapacity = player.powerPlants.reduce(
                  (sum, p) => sum + p.fuelCapacity * 2,
                  0
                );
                const totalCities = Array.from(player.cities.values()).reduce((a, b) => a + b, 0);
                return (
                  <div
                    key={player.id}
                    className={`rounded p-2 border-l-4 space-y-1 transition-all ${
                      isCurrentTurn
                        ? 'bg-blue-900/40 border-2 border-blue-400 shadow-lg shadow-blue-500/20'
                        : 'bg-slate-700 border-l-4'
                    }`}
                    style={{ borderLeftColor: player.color }}
                  >
                    <div className="flex items-center justify-between gap-1">
                      <div className="flex items-center gap-1">
                        <p className="font-semibold text-xs">{player.name}</p>
                        {isCurrentTurn && (
                          <span className="text-[10px] bg-blue-500 text-white px-1.5 py-0.5 rounded-full font-bold animate-pulse">
                            TURN
                          </span>
                        )}
                      </div>
                      {player.isRobot && player.robotDifficulty && (
                        <RobotBadge difficulty={player.robotDifficulty} size="sm" />
                      )}
                    </div>
                    <p className="text-[11px] text-gray-400">Money: ${player.money}</p>
                    <p className="text-[11px] text-gray-400">Cities: {totalCities}</p>

                    {/* Fuel Overview */}
                    <div className="mt-1 rounded bg-slate-800/60 border border-slate-600 p-1.5">
                      <div className="grid grid-cols-4 gap-1">
                        {Object.entries(player.resources).map(([fuel, amount]) => (
                          <div key={fuel} className="text-center">
                            <div
                              className="w-7 h-7 rounded-full mx-auto mb-0.5 flex items-center justify-center"
                              style={{ backgroundColor: FUEL_COLORS[fuel as FuelType] }}
                            >
                              <span className="text-white font-bold text-[11px]">{amount}</span>
                            </div>
                            <p className="text-[9px] text-slate-400 capitalize">{fuel}</p>
                          </div>
                        ))}
                      </div>
                      <div className="mt-1.5 pt-1.5 border-t border-slate-600">
                        <p className="text-[10px] text-slate-400">
                          Fuel Storage: <span className="text-slate-200 font-semibold">{totalFuelStored}</span>
                          {' / '}
                          <span className="text-slate-200 font-semibold">{totalFuelCapacity}</span>
                          <span className="text-slate-500"> (2x capacity)</span>
                        </p>
                      </div>
                    </div>

                    {/* Power Plants */}
                    {player.powerPlants.length > 0 && (
                      <div className="mt-1">
                        <p className="text-[11px] text-gray-400 mb-1">Power Plants:</p>
                        <div className="space-y-1">
                          {player.powerPlants.map((plant) => (
                            <div
                              key={plant.id}
                              className="bg-slate-700 rounded px-2 py-1.5 border border-slate-600 hover:border-yellow-500 transition-colors group relative"
                              title={`Plant #${plant.number}: ${plant.citiesPowered} cities, ${plant.fuelCapacity} fuel`}
                            >
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  <span className="text-[11px] font-bold text-yellow-400">#{plant.number}</span>
                                  <span className="text-[11px] text-slate-300">⚡{plant.citiesPowered ?? 0}</span>
                                </div>
                                <span className="text-[10px] text-slate-400">
                                  Cap: <span className="text-slate-200 font-semibold">{plant.fuelCapacity}</span>
                                </span>
                              </div>
                              <div className="mt-0.5 flex items-center justify-between text-[10px] text-slate-400">
                                <div>
                                  Fuel: <span className="text-slate-200">
                                    {plant.fuelType.length === 0 ? 'Renewable' : plant.fuelType.join(' / ')}
                                  </span>
                                </div>
                                <div className="flex items-center gap-1">
                                  {plant.fuelType.length === 0 ? (
                                    <span className="text-slate-300">♻️</span>
                                  ) : (
                                    plant.fuelType.map((fuel) => (
                                      <span
                                        key={fuel}
                                        className="inline-flex h-2.5 w-2.5 rounded-full border border-slate-500"
                                        style={{ backgroundColor: FUEL_COLORS[fuel] }}
                                        title={fuel}
                                      />
                                    ))
                                  )}
                                </div>
                              </div>

                              {/* Tooltip on hover */}
                              <div className="absolute bottom-full left-0 mb-1 hidden group-hover:block z-10 bg-slate-900 border border-slate-600 rounded p-2 text-xs whitespace-nowrap shadow-lg">
                                <div className="font-bold text-yellow-400">Plant #{plant.number}</div>
                                <div className="text-slate-300">Cities: {plant.citiesPowered}</div>
                                <div className="text-slate-300">Fuel: {plant.fuelCapacity}</div>
                                <div className="text-slate-300">
                                  Type: {plant.fuelType.length === 0 ? 'Renewable' : plant.fuelType.join('/')}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {player.powerPlants.length === 0 && (
                      <p className="text-xs text-slate-500 italic mt-1">No power plants</p>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Panel: Your Empire */}
      <div className="px-6 pb-6">
        <div className="bg-slate-800 rounded-lg p-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold">Your Empire</h2>
            <p className="text-xs text-slate-400">Personal overview</p>
          </div>
          <div className="max-h-[18rem] overflow-y-auto">
            <PlayerPanel compact showTitle={false} />
          </div>
        </div>
      </div>

      {/* Plant Discard Modal - overlays everything when active */}
      <PlantDiscardModal />
    </div>
  );
}
