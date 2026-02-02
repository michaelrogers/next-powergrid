'use client';

import { useEffect, useMemo, useState } from 'react';
import { FuelType, PowerPlant } from '@/types/game';
import { buildDefaultPowerPlants } from '@/lib/powerPlants';
import PowerPlantCard from './PowerPlantCard';

const FUEL_OPTIONS: FuelType[] = [FuelType.COAL, FuelType.OIL, FuelType.GARBAGE, FuelType.NUCLEAR];
const ART_OPTIONS = ['oil', 'hybrid', 'wind', 'coal', 'garbage', 'nuclear'] as const;

export default function PowerPlantEditor() {
  const [plants, setPlants] = useState<PowerPlant[]>(() => buildDefaultPowerPlants());
  const [selectedId, setSelectedId] = useState<string>('');
  const [jsonDraft, setJsonDraft] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const loadPlants = async () => {
      try {
        const res = await fetch('/api/power-plants');
        const data = await res.json();
        if (Array.isArray(data.plants) && data.plants.length > 0) {
          setPlants(data.plants);
          setSelectedId(data.plants[0].id);
          return;
        }
      } catch {
        // fall back to defaults
      }
      const defaults = buildDefaultPowerPlants();
      setPlants(defaults);
      setSelectedId(defaults[0]?.id ?? '');
      setIsLoading(false);
    };

    loadPlants().finally(() => setIsLoading(false));
  }, []);

  const selectedPlant = useMemo(
    () => plants.find((p) => p.id === selectedId) ?? plants[0],
    [plants, selectedId]
  );

  const updatePlant = (patch: Partial<PowerPlant>) => {
    setPlants((prev) =>
      prev.map((p) => (p.id === selectedPlant?.id ? { ...p, ...patch } : p))
    );
  };

  const toggleFuel = (fuel: FuelType) => {
    if (!selectedPlant) return;
    const fuelType = selectedPlant.fuelType.includes(fuel)
      ? selectedPlant.fuelType.filter((f) => f !== fuel)
      : [...selectedPlant.fuelType, fuel];
    updatePlant({ fuelType, fuelCapacity: fuelType.length === 0 ? 0 : selectedPlant.fuelCapacity || 1 });
  };

  const toggleRenewable = () => {
    if (!selectedPlant) return;
    if (selectedPlant.fuelType.length === 0) {
      updatePlant({ fuelType: [FuelType.COAL], fuelCapacity: 1, artKey: 'coal' });
      return;
    }
    updatePlant({ fuelType: [], fuelCapacity: 0, artKey: 'wind' });
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await fetch('/api/power-plants', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plants }),
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleReset = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/power-plants');
      const data = await res.json();
      if (Array.isArray(data.plants) && data.plants.length > 0) {
        setPlants(data.plants);
        setSelectedId(data.plants[0].id);
        setIsLoading(false);
        return;
      }
    } catch {
      // fall back to defaults
    }

    const defaults = buildDefaultPowerPlants();
    setPlants(defaults);
    setSelectedId(defaults[0]?.id ?? '');
    setIsLoading(false);
  };

  const handleAddRandom = () => {
    const defaults = buildDefaultPowerPlants(plants.length + 1);
    setPlants(defaults);
  };

  const handleExport = () => {
    setJsonDraft(JSON.stringify(plants, null, 2));
  };

  const handleImport = () => {
    try {
      const parsed = JSON.parse(jsonDraft) as PowerPlant[];
      if (Array.isArray(parsed) && parsed.length > 0) {
        setPlants(parsed);
        setSelectedId(parsed[0].id);
      }
    } catch {
      // no-op
    }
  };

  if (isLoading) {
    return <div className="text-slate-300">Loading power plants...</div>;
  }

  if (!selectedPlant) {
    return <div className="text-slate-300">No plants available.</div>;
  }

  return (
    <div className="grid grid-cols-[320px_1fr] gap-6">
      <div className="space-y-4">
        <div className="bg-slate-800 border border-slate-700 rounded-lg p-4">
          <h2 className="text-lg font-bold text-white mb-3">Power Plant Deck</h2>
          <div className="space-y-2 max-h-[480px] overflow-y-auto">
            {plants.map((plant) => (
              <button
                key={plant.id}
                className={`w-full text-left px-3 py-2 rounded border ${
                  plant.id === selectedId
                    ? 'border-emerald-400 bg-emerald-900/30'
                    : 'border-slate-700 bg-slate-900/50'
                }`}
                onClick={() => setSelectedId(plant.id)}
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-200">#{plant.number}</span>
                  <span className="text-xs text-slate-400">{plant.id}</span>
                </div>
                <div className="text-xs text-slate-400">
                  Fuels: {plant.fuelType.length > 0 ? plant.fuelType.join(' / ') : 'renewable'}
                </div>
              </button>
            ))}
          </div>
        </div>

        <div className="flex gap-2">
          <button
            onClick={handleSave}
            className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-2 rounded disabled:opacity-60"
            disabled={isSaving}
          >
            {isSaving ? 'Saving...' : 'Save Deck'}
          </button>
          <button
            onClick={handleReset}
            className="flex-1 bg-slate-600 hover:bg-slate-700 text-white font-semibold py-2 rounded"
          >
            Reset
          </button>
        </div>

        <button
          onClick={handleAddRandom}
          className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-2 rounded"
        >
          Add Random Plant
        </button>
      </div>

      <div className="space-y-6">
        <div className="grid grid-cols-[260px_1fr] gap-6">
          <div className="bg-slate-900 rounded-lg p-4 border border-slate-700">
            <PowerPlantCard plant={selectedPlant} />
          </div>
          <div className="bg-slate-800 rounded-lg p-4 border border-slate-700 space-y-4">
            <div>
              <label className="text-xs text-slate-400">Number</label>
              <input
                type="number"
                value={selectedPlant.number}
                onChange={(e) => updatePlant({ number: Number(e.target.value) })}
                className="w-full mt-1 px-3 py-2 bg-slate-900 border border-slate-600 rounded text-white"
              />
            </div>
            <div>
              <label className="text-xs text-slate-400">Cities Powered</label>
              <input
                type="number"
                value={selectedPlant.citiesPowered ?? 1}
                onChange={(e) => updatePlant({ citiesPowered: Number(e.target.value) })}
                className="w-full mt-1 px-3 py-2 bg-slate-900 border border-slate-600 rounded text-white"
              />
            </div>
            <div>
              <label className="text-xs text-slate-400">Fuel Capacity</label>
              <input
                type="number"
                value={selectedPlant.fuelCapacity}
                onChange={(e) => updatePlant({ fuelCapacity: Number(e.target.value) })}
                className="w-full mt-1 px-3 py-2 bg-slate-900 border border-slate-600 rounded text-white"
              />
            </div>
            <div>
              <label className="text-xs text-slate-400">Art Style</label>
              <select
                value={selectedPlant.artKey ?? 'oil'}
                onChange={(e) => updatePlant({ artKey: e.target.value as PowerPlant['artKey'] })}
                className="w-full mt-1 px-3 py-2 bg-slate-900 border border-slate-600 rounded text-white"
              >
                {ART_OPTIONS.map((key) => (
                  <option key={key} value={key}>
                    {key}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs text-slate-400">Fuel Types</label>
              <label className="mt-2 flex items-center gap-2 text-sm text-slate-200">
                <input
                  type="checkbox"
                  checked={selectedPlant.fuelType.length === 0}
                  onChange={toggleRenewable}
                />
                Renewable (no fuel)
              </label>
              <div className="mt-2 grid grid-cols-2 gap-2">
                {FUEL_OPTIONS.map((fuel) => (
                  <label key={fuel} className="flex items-center gap-2 text-sm text-slate-200">
                    <input
                      type="checkbox"
                      checked={selectedPlant.fuelType.includes(fuel)}
                      onChange={() => toggleFuel(fuel)}
                      disabled={selectedPlant.fuelType.length === 0}
                    />
                    {fuel}
                  </label>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="bg-slate-800 rounded-lg p-4 border border-slate-700 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-white">Import / Export</h3>
            <div className="flex gap-2">
              <button
                onClick={handleExport}
                className="px-3 py-1 bg-slate-700 hover:bg-slate-600 text-white text-sm rounded"
              >
                Export JSON
              </button>
              <button
                onClick={handleImport}
                className="px-3 py-1 bg-slate-700 hover:bg-slate-600 text-white text-sm rounded"
              >
                Import JSON
              </button>
            </div>
          </div>
          <textarea
            value={jsonDraft}
            onChange={(e) => setJsonDraft(e.target.value)}
            rows={8}
            className="w-full bg-slate-900 border border-slate-600 rounded text-slate-200 p-3 text-xs"
            placeholder="Export to JSON or paste JSON here"
          />
        </div>
      </div>
    </div>
  );
}
