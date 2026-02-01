import { PowerPlant, FuelType } from '@/types/game';
import powerPlantsJson from '../../data/powerPlants.json';

export type PowerPlantArtKey = 'oil' | 'hybrid' | 'wind' | 'coal' | 'garbage' | 'nuclear';

const BASE_POWER_PLANTS: PowerPlant[] = powerPlantsJson as PowerPlant[];

const FUEL_OPTIONS: FuelType[] = [
  FuelType.COAL,
  FuelType.OIL,
  FuelType.GARBAGE,
  FuelType.NUCLEAR,
];

const ART_BY_FUEL: Record<FuelType, PowerPlantArtKey> = {
  [FuelType.COAL]: 'coal',
  [FuelType.OIL]: 'oil',
  [FuelType.GARBAGE]: 'garbage',
  [FuelType.NUCLEAR]: 'nuclear',
};

function getRandomFuelTypes(): FuelType[] {
  const roll = Math.random();
  if (roll < 0.15) return []; // renewable style
  if (roll < 0.35) return [FuelType.COAL, FuelType.OIL];
  return [FUEL_OPTIONS[Math.floor(Math.random() * FUEL_OPTIONS.length)]];
}

function getArtKeyForFuelTypes(fuels: FuelType[]): PowerPlantArtKey {
  if (fuels.length === 0) return 'wind';
  if (fuels.includes(FuelType.COAL) && fuels.includes(FuelType.OIL)) return 'hybrid';
  return ART_BY_FUEL[fuels[0]];
}

function createRandomPlant(index: number, existingNumbers: Set<number>): PowerPlant {
  let number = 6 + Math.floor(Math.random() * 20);
  while (existingNumbers.has(number)) {
    number = 6 + Math.floor(Math.random() * 20);
  }
  existingNumbers.add(number);

  const fuelType = getRandomFuelTypes();
  const fuelCapacity = fuelType.length === 0 ? 0 : 2 + Math.floor(Math.random() * 2);
  const citiesPowered = fuelType.length === 0 ? 2 + Math.floor(Math.random() * 3) : 1 + Math.floor(Math.random() * 2);

  return {
    id: `pp_random_${index}_${number}`,
    number,
    fuelType,
    fuelCapacity,
    citiesPowered,
    artKey: getArtKeyForFuelTypes(fuelType),
  };
}

export function buildDefaultPowerPlants(total = 12): PowerPlant[] {
  const existingNumbers = new Set(BASE_POWER_PLANTS.map(p => p.number));
  const plants: PowerPlant[] = [...BASE_POWER_PLANTS];

  for (let i = plants.length; i < total; i += 1) {
    plants.push(createRandomPlant(i, existingNumbers));
  }

  return plants.sort((a, b) => a.number - b.number);
}

export function getPowerPlants(): PowerPlant[] {
  if (BASE_POWER_PLANTS.length > 0) return BASE_POWER_PLANTS;
  return buildDefaultPowerPlants();
}

export { BASE_POWER_PLANTS };
