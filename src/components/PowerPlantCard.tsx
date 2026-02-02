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
  const citiesPowered = plant.citiesPowered ?? 1;

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

  const getArtKey = () => {
    if (plant.artKey) return plant.artKey;
    if (plant.fuelType.length === 0) return 'wind';
    if (plant.fuelType.includes(FuelType.COAL) && plant.fuelType.includes(FuelType.OIL)) return 'hybrid';
    if (plant.fuelType.includes(FuelType.OIL)) return 'oil';
    if (plant.fuelType.includes(FuelType.COAL)) return 'coal';
    if (plant.fuelType.includes(FuelType.GARBAGE)) return 'garbage';
    if (plant.fuelType.includes(FuelType.NUCLEAR)) return 'nuclear';
    return 'wind';
  };

  const renderArt = () => {
    const artKey = getArtKey();
    switch (artKey) {
      case 'oil':
        return (
          <g>
            <path
              d="M42 70 C42 58 60 52 60 40 C60 52 78 58 78 70 C78 82 70 90 60 90 C50 90 42 82 42 70 Z"
              fill="#111827"
              stroke="#f8fafc"
              strokeWidth="2"
            />
            <path
              d="M100 80 C100 68 118 62 118 50 C118 62 136 68 136 80 C136 92 128 100 118 100 C108 100 100 92 100 80 Z"
              fill="#111827"
              stroke="#f8fafc"
              strokeWidth="2"
            />
            <path
              d="M70 95 C70 83 88 77 88 65 C88 77 106 83 106 95 C106 107 98 115 88 115 C78 115 70 107 70 95 Z"
              fill="#111827"
              stroke="#f8fafc"
              strokeWidth="2"
            />
          </g>
        );
      case 'hybrid':
        return (
          <g>
            <circle cx="55" cy="90" r="16" fill="#92400e" stroke="#f8fafc" strokeWidth="2" />
            <circle cx="80" cy="85" r="18" fill="#a16207" stroke="#f8fafc" strokeWidth="2" />
            <circle cx="108" cy="92" r="16" fill="#b45309" stroke="#f8fafc" strokeWidth="2" />
            <rect x="130" y="70" width="22" height="32" rx="4" fill="#111827" stroke="#f8fafc" strokeWidth="2" />
            <rect x="134" y="60" width="14" height="10" fill="#111827" stroke="#f8fafc" strokeWidth="2" />
            <rect x="140" y="58" width="2" height="8" fill="#f8fafc" />
          </g>
        );
      case 'wind':
        return (
          <g>
            <line x1="120" y1="50" x2="120" y2="125" stroke="#e2e8f0" strokeWidth="3" />
            <circle cx="120" cy="55" r="5" fill="#e2e8f0" />
            <line x1="120" y1="55" x2="95" y2="65" stroke="#e2e8f0" strokeWidth="3" />
            <line x1="120" y1="55" x2="145" y2="65" stroke="#e2e8f0" strokeWidth="3" />
            <line x1="120" y1="55" x2="120" y2="30" stroke="#e2e8f0" strokeWidth="3" />
          </g>
        );
      case 'coal':
        return (
          <g>
            <circle cx="70" cy="95" r="18" fill="#0f172a" stroke="#e2e8f0" strokeWidth="2" />
            <circle cx="95" cy="85" r="16" fill="#111827" stroke="#e2e8f0" strokeWidth="2" />
            <circle cx="115" cy="100" r="18" fill="#1f2937" stroke="#e2e8f0" strokeWidth="2" />
          </g>
        );
      case 'garbage':
        return (
          <g>
            <rect x="70" y="70" width="60" height="40" rx="6" fill="#86efac" stroke="#16a34a" strokeWidth="2" />
            <line x1="78" y1="80" x2="122" y2="80" stroke="#16a34a" strokeWidth="2" />
            <line x1="78" y1="92" x2="122" y2="92" stroke="#16a34a" strokeWidth="2" />
          </g>
        );
      case 'nuclear':
        return (
          <g>
            <circle cx="95" cy="85" r="22" fill="#fbbf24" stroke="#92400e" strokeWidth="2" />
            <circle cx="95" cy="85" r="6" fill="#92400e" />
            <path d="M95 63 L105 80 L85 80 Z" fill="#92400e" />
            <path d="M73 90 L90 100 L80 110 Z" fill="#92400e" />
            <path d="M117 90 L110 110 L100 100 Z" fill="#92400e" />
          </g>
        );
      default:
        return null;
    }
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
        <defs>
          <linearGradient id={`card-${plant.number}`} x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#e2e8f0" />
            <stop offset="100%" stopColor="#cbd5f5" />
          </linearGradient>
          <pattern id={`paper-${plant.number}`} width="6" height="6" patternUnits="userSpaceOnUse">
            <rect width="6" height="6" fill="transparent" />
            <circle cx="1" cy="1" r="0.6" fill="#94a3b8" opacity="0.15" />
            <circle cx="4" cy="3" r="0.7" fill="#cbd5f5" opacity="0.12" />
          </pattern>
        </defs>

        {/* Card background */}
        <rect width="200" height="260" fill="#e2e8f0" />
        <rect x="6" y="6" width="188" height="248" fill="#f1f5f9" rx="10" />
        <rect x="6" y="6" width="188" height="248" fill={`url(#paper-${plant.number})`} rx="10" opacity="0.5" />

        {/* Border */}
        <rect x="3" y="3" width="194" height="254" fill="none" stroke="#166534" strokeWidth="4" rx="12" />

        {/* Top-left number */}
        <rect x="12" y="12" width="48" height="38" rx="8" fill="#0f172a" />
        <text
          x="36"
          y="38"
          textAnchor="middle"
          fontSize="22"
          fontWeight="bold"
          fill="#f8fafc"
          className="select-none"
        >
          {plant.number.toString().padStart(2, '0')}
        </text>

        {/* Art panel */}
        <rect x="12" y="60" width="176" height="110" rx="10" fill="url(#card-${plant.number})" stroke="#94a3b8" strokeWidth="2" />
        {renderArt()}

        {/* Fuel requirement icons */}
        <g>
          {plant.fuelType.map((fuel, idx) => {
            const xPos = 28 + idx * 32;
            return (
              <g key={fuel}>
                <circle cx={xPos} cy="195" r="13" fill={getFuelColor(fuel)} opacity="0.85" />
                <text
                  x={xPos}
                  y="200"
                  textAnchor="middle"
                  fontSize="9"
                  fill="#f8fafc"
                  fontWeight="bold"
                  className="select-none"
                >
                  {getFuelLabel(fuel)[0]}
                </text>
              </g>
            );
          })}
          {plant.fuelType.length === 0 && (
            <text x="24" y="200" fontSize="10" fill="#475569" className="select-none">
              Renewable
            </text>
          )}
        </g>

        {/* City cube */}
        <g>
          <rect x="138" y="186" width="34" height="28" rx="4" fill="#f8fafc" stroke="#0f172a" strokeWidth="2" />
          <rect x="142" y="190" width="26" height="20" rx="3" fill="#e2e8f0" />
          <text x="155" y="205" textAnchor="middle" fontSize="14" fontWeight="bold" fill="#0f172a" className="select-none">
            {citiesPowered}
          </text>
        </g>

        {/* Details footer */}
        <text x="12" y="232" fontSize="9" fill="#475569" fontWeight="bold" className="select-none">Fuel Cap: {plant.fuelCapacity}</text>

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
