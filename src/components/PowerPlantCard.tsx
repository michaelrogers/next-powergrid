/**
 * Power Plant Card Component
 * Visual representation of a power plant for auction display
 */

'use client';

import { PowerPlant, FuelType } from '@/types/game';

interface PowerPlantCardProps {
  plant: PowerPlant;
  isBiddingOn?: boolean;
  currentBid?: number;
  highestBidder?: string;
  isClickable?: boolean;
  onClick?: () => void;
}

export default function PowerPlantCard({
  plant,
  isBiddingOn = false,
  currentBid = 0,
  highestBidder,
  isClickable = false,
  onClick,
}: PowerPlantCardProps) {
  // Get fuel colors
  const getFuelColor = (fuel: FuelType): string => {
    const colors: Record<FuelType, string> = {
      coal: '#1f2937',
      oil: '#7c2d12',
      garbage: '#86efac',
      nuclear: '#fbbf24',
    };
    return colors[fuel];
  };

  const getFuelLabel = (fuel: FuelType): string => {
    return fuel.charAt(0).toUpperCase() + fuel.slice(1);
  };

  return (
    <div
      onClick={onClick}
      className={`relative w-48 h-64 rounded-lg overflow-hidden transition-all ${
        isClickable ? 'cursor-pointer hover:shadow-2xl hover:scale-105' : ''
      } ${isBiddingOn ? 'ring-2 ring-yellow-400 shadow-lg' : 'shadow-md'}`}
    >
      {/* SVG Card Background */}
      <svg className="absolute inset-0 w-full h-full" viewBox="0 0 200 260">
        {/* Card background gradient */}
        <defs>
          <linearGradient id={`grad-${plant.number}`} x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" style={{ stopColor: '#334155', stopOpacity: 1 }} />
            <stop offset="100%" style={{ stopColor: '#0f172a', stopOpacity: 1 }} />
          </linearGradient>
        </defs>

        {/* Card background */}
        <rect width="200" height="260" fill={`url(#grad-${plant.number})`} />

        {/* Border */}
        <rect
          width="200"
          height="260"
          fill="none"
          stroke="#64748b"
          strokeWidth="2"
          rx="8"
        />

        {/* Top section - Plant number */}
        <rect width="200" height="50" fill="#1e293b" />
        <text
          x="100"
          y="35"
          textAnchor="middle"
          fontSize="28"
          fontWeight="bold"
          fill="#fbbf24"
          className="select-none"
        >
          #{plant.number}
        </text>

        {/* Power output section */}
        <g>
          {/* Icon background */}
          <circle cx="50" cy="85" r="20" fill="#3b82f6" opacity="0.3" />
          <text
            x="50"
            y="92"
            textAnchor="middle"
            fontSize="12"
            fill="#93c5fd"
            fontWeight="bold"
            className="select-none"
          >
            MW
          </text>
          <text
            x="50"
            y="108"
            textAnchor="middle"
            fontSize="16"
            fill="#60a5fa"
            fontWeight="bold"
            className="select-none"
          >
            {plant.power}
          </text>

          {/* Fuel type section */}
          <g>
            {plant.fuelType.map((fuel, idx) => {
              const xPos = 100 + idx * 45;
              return (
                <g key={fuel}>
                  <circle
                    cx={xPos}
                    cy="85"
                    r="18"
                    fill={getFuelColor(fuel)}
                    opacity="0.4"
                  />
                  <text
                    x={xPos}
                    y="92"
                    textAnchor="middle"
                    fontSize="10"
                    fill="white"
                    fontWeight="bold"
                    className="select-none"
                  >
                    {getFuelLabel(fuel)[0]}
                  </text>
                </g>
              );
            })}
          </g>

          {/* Fuel capacity section */}
          <circle cx="150" cy="85" r="20" fill="#ef4444" opacity="0.3" />
          <text
            x="150"
            y="92"
            textAnchor="middle"
            fontSize="10"
            fill="#fca5a5"
            fontWeight="bold"
            className="select-none"
          >
            Cap
          </text>
          <text
            x="150"
            y="108"
            textAnchor="middle"
            fontSize="14"
            fill="#fca5a5"
            fontWeight="bold"
            className="select-none"
          >
            {plant.fuelCapacity}
          </text>
        </g>

        {/* Details section */}
        <g>
          {/* Efficiency */}
          <text
            x="10"
            y="135"
            fontSize="9"
            fill="#94a3b8"
            fontWeight="bold"
            className="select-none"
          >
            Efficiency:
          </text>
          <text
            x="10"
            y="147"
            fontSize="11"
            fill="#cbd5e1"
            fontWeight="bold"
            className="select-none"
          >
            {plant.fuelCapacity > 0 ? ((plant.power / plant.fuelCapacity) * 100).toFixed(0) : '∞'}%
          </text>

          {/* Fuel types listed */}
          <text
            x="10"
            y="165"
            fontSize="9"
            fill="#94a3b8"
            fontWeight="bold"
            className="select-none"
          >
            Fuels:
          </text>
          <text
            x="10"
            y="177"
            fontSize="10"
            fill="#cbd5e1"
            className="select-none"
          >
            {plant.fuelType.map((f) => getFuelLabel(f)).join(' / ')}
          </text>
        </g>

        {/* Current bid section (if bidding) */}
        {isBiddingOn && (
          <g>
            <rect y="190" width="200" height="70" fill="#1f2937" />
            <rect y="190" width="200" height="70" fill="none" stroke="#fbbf24" strokeWidth="2" />

            <text
              x="100"
              y="208"
              textAnchor="middle"
              fontSize="9"
              fill="#fcd34d"
              fontWeight="bold"
              className="select-none"
            >
              Current Bid
            </text>
            <text
              x="100"
              y="230"
              textAnchor="middle"
              fontSize="24"
              fill="#fbbf24"
              fontWeight="bold"
              className="select-none"
            >
              ${currentBid}
            </text>
            {highestBidder && (
              <text
                x="100"
                y="250"
                textAnchor="middle"
                fontSize="8"
                fill="#cbd5e1"
                className="select-none"
              >
                by {highestBidder}
              </text>
            )}
          </g>
        )}
      </svg>
    </div>
  );
}
