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
  compact?: boolean; // when true, hide UI chrome (title, legend, player list)
}

export default function GameMapComponent({
  map,
  players,
  onCityClick,
  selectedCities = [],
  buildMode = false,
  compact = false,
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
      {!compact && (
        <div className="mb-2">
          <h3 className="text-lg font-bold text-white">{map.name}</h3>
          <p className="text-xs text-gray-400">
            {map.regions.length} regions • {map.regions.flatMap((r) => r.cities).length} cities
          </p>
        </div>
      )}

      {/* SVG Map */}
      <svg
        viewBox={`0 0 ${map.width} ${map.height}`}
        className={`flex-1 ${compact ? '' : 'bg-slate-800 rounded border-2 border-slate-600 hover:border-slate-500 transition-colors'}`}
        style={{ maxHeight: '100%' }}
      >
        {/* Background */}
        <rect width={map.width} height={map.height} fill="#1e293b" />

        {/* Country Outline */}
        {map.countryOutline && (
          <path
            d={map.countryOutline}
            fill="#1e3a5f"
            fillOpacity="0.2"
            stroke="#3b82f6"
            strokeWidth="3"
            strokeOpacity="0.6"
          />
        )}

        {/* Region outlines and backgrounds */}
        {map.regions.map((region) => {
          const cities = region.cities;
          if (cities.length === 0) return null;

          const xs = cities.map((c) => (c.x / 100) * map.width);
          const ys = cities.map((c) => (c.y / 100) * map.height);
          const minX = Math.min(...xs);
          const maxX = Math.max(...xs);
          const minY = Math.min(...ys);
          const maxY = Math.max(...ys);
          const padding = 40;

          return (
            <g key={`region-${region.id}`}>
              {/* If a regionOutline is provided, render it (assumed in 0-100 coord space) */}
              {region.regionOutline ? (
                <g transform={`scale(${map.width / 100} ${map.height / 100})`}>
                  <path
                    d={region.regionOutline}
                    fill="#2563eb"
                    fillOpacity="0.06"
                    stroke="#60a5fa"
                    strokeWidth="0.8"
                    strokeOpacity="0.45"
                  />
                </g>
              ) : (
                /* Fallback rectangle bounding box when no outline provided */
                <>
                  <rect
                    x={minX - padding}
                    y={minY - padding}
                    width={maxX - minX + padding * 2}
                    height={maxY - minY + padding * 2}
                    fill="none"
                    stroke="#3b82f6"
                    strokeWidth="2"
                    opacity="0.4"
                    rx="8"
                  />

                  {/* Semi-transparent region fill */}
                  <rect
                    x={minX - padding}
                    y={minY - padding}
                    width={maxX - minX + padding * 2}
                    height={maxY - minY + padding * 2}
                    fill="#3b82f6"
                    opacity="0.05"
                    rx="8"
                  />
                </>
              )}

              {/* Region label */}
              <text
                x={minX - padding + 10}
                y={minY - padding + 18}
                fontSize="12"
                fill="#60a5fa"
                fontWeight="bold"
                className="pointer-events-none select-none"
              >
                {region.name}
              </text>
            </g>
          );
        })}

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

                {/* City label - always visible */}
                <g>
                  <text
                    x={x}
                    y={y + 18}
                    textAnchor="middle"
                    fontSize="10"
                    fill="white"
                    fontWeight="bold"
                    className="pointer-events-none select-none drop-shadow"
                    style={{
                      textShadow: '0 1px 3px rgba(0,0,0,0.8)',
                      filter: 'drop-shadow(0 0 2px rgba(0,0,0,0.9))',
                    }}
                  >
                    {city.name}
                  </text>
                </g>

                {/* Hover tooltip with ownership info */}
                {isHovered && (
                  <g>
                    <rect
                      x={x - 40}
                      y={y - 35}
                      width="80"
                      height="24"
                      fill="rgba(15, 23, 42, 0.98)"
                      stroke="#60a5fa"
                      strokeWidth="1.5"
                      rx="4"
                    />
                    <text
                      x={x}
                      y={y - 18}
                      textAnchor="middle"
                      fontSize="9"
                      fill="#93c5fd"
                      fontWeight="bold"
                      className="pointer-events-none select-none"
                    >
                      {city.name}
                    </text>
                    <text
                      x={x}
                      y={y - 8}
                      textAnchor="middle"
                      fontSize="8"
                      fill="#cbd5e1"
                      className="pointer-events-none select-none"
                    >
                      {getCityOwner(city.id)?.name || 'Unowned'}
                    </text>
                  </g>
                )}
              </g>
            );
          })
        )}
      </svg>

      {!compact && (
        <>
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
        </>
      )}
    </div>
  );
}
