/**
 * Interactive Game Map Component
 * Displays the PowerGrid map with cities and networks
 */

'use client';

import { useState } from 'react';
import { GameMap, City } from '@/lib/mapData';
import { Player } from '@/types/game';

interface GameMapProps {
  map: GameMap;
  players: Player[];
  onCityClick?: (cityId: string, cityName: string) => void;
  selectedCities?: string[];
  buildMode?: boolean;
}

export default function GameMapComponent({
  map,
  players,
  onCityClick,
  selectedCities = [],
  buildMode = false,
}: GameMapProps) {
  const [hoveredCity, setHoveredCity] = useState<string | null>(null);

  // Get player color for a city
  const getCityColor = (cityId: string): string => {
    for (const player of players) {
      for (const [region, count] of player.cities) {
        // Find city by its region and count
        const citiesInRegion = map.regions
          .find((r) => r.id === region)
          ?.cities.slice(0, count);
        if (citiesInRegion?.some((c) => c.id === cityId)) {
          return player.color;
        }
      }
    }
    return '#64748b'; // default gray
  };

  const getCityOwner = (cityId: string): Player | undefined => {
    for (const player of players) {
      for (const [region, count] of player.cities) {
        const citiesInRegion = map.regions
          .find((r) => r.id === region)
          ?.cities.slice(0, count);
        if (citiesInRegion?.some((c) => c.id === cityId)) {
          return player;
        }
      }
    }
    return undefined;
  };

  const handleCityClick = (city: City) => {
    if (buildMode && onCityClick) {
      onCityClick(city.id, city.name);
    }
  };

  const getTooltipText = (city: City): string => {
    const owner = getCityOwner(city.id);
    if (owner) {
      return `${city.name} - Owned by ${owner.name}`;
    }
    return city.name;
  };

  return (
    <div className="w-full h-full bg-gradient-to-br from-slate-700 to-slate-900 rounded-lg p-4 flex flex-col">
      {/* Map Title */}
      <div className="mb-2">
        <h3 className="text-lg font-bold text-white">{map.name}</h3>
        <p className="text-xs text-gray-400">
          {map.regions.length} regions • {map.regions.flatMap((r) => r.cities).length} cities
        </p>
      </div>

      {/* SVG Map */}
      <svg
        viewBox={`0 0 ${map.width} ${map.height}`}
        className="flex-1 bg-slate-800 rounded border-2 border-slate-600 hover:border-slate-500 transition-colors"
        style={{ maxHeight: '100%' }}
      >
        {/* Background */}
        <rect width={map.width} height={map.height} fill="#1e293b" />

        {/* Region backgrounds */}
        {map.regions.map((region) => (
          <g key={region.id} opacity={0.1}>
            <rect
              x={region.cities.reduce((min, c) => Math.min(min, (c.x / 100) * map.width - 50), Infinity)}
              y={region.cities.reduce((min, c) => Math.min(min, (c.y / 100) * map.height - 50), Infinity)}
              width={100}
              height={100}
              fill="#3b82f6"
              rx={5}
            />
          </g>
        ))}

        {/* Connections (Power Lines) */}
        {map.connections.map((conn, idx) => {
          const cityA = map.regions
            .flatMap((r) => r.cities)
            .find((c) => c.id === conn.cityA);
          const cityB = map.regions
            .flatMap((r) => r.cities)
            .find((c) => c.id === conn.cityB);

          if (!cityA || !cityB) return null;

          const x1 = (cityA.x / 100) * map.width;
          const y1 = (cityA.y / 100) * map.height;
          const x2 = (cityB.x / 100) * map.width;
          const y2 = (cityB.y / 100) * map.height;

          return (
            <line
              key={`conn-${idx}`}
              x1={x1}
              y1={y1}
              x2={x2}
              y2={y2}
              stroke="#475569"
              strokeWidth="2"
              opacity="0.4"
            />
          );
        })}

        {/* Cities */}
        {map.regions.flatMap((region) =>
          region.cities.map((city) => {
            const x = (city.x / 100) * map.width;
            const y = (city.y / 100) * map.height;
            const isSelected = selectedCities.includes(city.id);
            const isHovered = hoveredCity === city.id;
            const color = getCityColor(city.id);
            const isClickable = buildMode;

            return (
              <g
                key={city.id}
                onClick={() => handleCityClick(city)}
                className={isClickable ? 'cursor-pointer' : ''}
                onMouseEnter={() => setHoveredCity(city.id)}
                onMouseLeave={() => setHoveredCity(null)}
              >
                {/* Outer ring for selection */}
                {isSelected && (
                  <circle
                    cx={x}
                    cy={y}
                    r={12}
                    fill="none"
                    stroke="#fbbf24"
                    strokeWidth="2"
                    opacity="0.8"
                  />
                )}

                {/* Outer ring for hover */}
                {isHovered && (
                  <circle
                    cx={x}
                    cy={y}
                    r={10}
                    fill="none"
                    stroke="#60a5fa"
                    strokeWidth="2"
                    opacity={isClickable ? 1 : 0.5}
                  />
                )}

                {/* City circle */}
                <circle
                  cx={x}
                  cy={y}
                  r={6}
                  fill={color}
                  stroke="white"
                  strokeWidth="1.5"
                  opacity={isHovered ? 1 : 0.85}
                />

                {/* City label on hover */}
                {isHovered && (
                  <g>
                    <rect
                      x={x - 35}
                      y={y - 30}
                      width="70"
                      height="22"
                      fill="rgba(15, 23, 42, 0.95)"
                      stroke="#64748b"
                      strokeWidth="1"
                      rx="3"
                    />
                    <text
                      x={x}
                      y={y - 14}
                      textAnchor="middle"
                      fontSize="11"
                      fill="white"
                      fontWeight="bold"
                      className="pointer-events-none select-none"
                    >
                      {city.name}
                    </text>
                  </g>
                )}
              </g>
            );
          })
        )}
      </svg>

      {/* Legend */}
      <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-gray-600 border border-white" />
          <span className="text-gray-400">Unowned</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full border-2 border-yellow-400" />
          <span className="text-gray-400">Selected</span>
        </div>
      </div>

      {/* Player Legend */}
      <div className="mt-2 space-y-1 border-t border-slate-600 pt-2">
        <p className="text-xs font-semibold text-gray-400 mb-1">Players</p>
        <div className="grid grid-cols-2 gap-1">
          {players.map((player) => (
            <div key={player.id} className="flex items-center gap-2 text-xs">
              <div
                className="w-2 h-2 rounded-full border border-white"
                style={{ backgroundColor: player.color }}
              />
              <span className="text-gray-300">{player.name}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
