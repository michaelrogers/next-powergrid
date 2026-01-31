"use client";

import React, { useEffect, useRef, useState } from 'react';
import { MAPS, getMapByName } from '@/lib/mapData';
import { buildOutlinePath, getPolygonsFromGeoJson, selectBestPolygon, GeoJson } from '@/lib/geojsonOutline';
import VoronoiSuggester from './VoronoiSuggester';

const clamp = (v: number, a = 0, b = 100) => Math.max(a, Math.min(b, v));

function parsePathToPoints(path?: string) {
  if (!path) return [] as { x: number; y: number }[];
  const nums = path.match(/-?\d+\.?\d*/g)?.map((n) => parseFloat(n)) || [];
  const pairs: { x: number; y: number }[] = [];
  for (let i = 0; i + 1 < nums.length; i += 2) {
    pairs.push({ x: nums[i], y: nums[i + 1] });
  }
  return pairs;
}


type RegionData = {
  id: string;
  name: string;
  color: string;
  points: Array<{ x: number; y: number }>;
};

type CityData = {
  id: string;
  name: string;
  regionId: string;
  x: number;
  y: number;
};

type Props = {
  mapId: string;
};

export default function FullMapEditor({ mapId }: Props) {
  const normalizedId = typeof mapId === 'string' ? mapId.trim().toLowerCase() : '';
  const [resolvedMapId, setResolvedMapId] = useState<string>(normalizedId);

  // Hooks that must always run
  const [opacity, setOpacity] = useState(0.6);
  const [showReference, setShowReference] = useState(true);
  const [refAlign, setRefAlign] = useState({ x: 0, y: 0, scale: 1 });
  const [regions, setRegions] = useState<RegionData[]>([]);
  const [selectedRegionIndex, setSelectedRegionIndex] = useState<number>(0);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [visibleRegions, setVisibleRegions] = useState<Set<number>>(new Set());
  const [cities, setCities] = useState<CityData[]>([]);
  const [editMode, setEditMode] = useState<'polygons' | 'cities'>('polygons');
  const [draggedCityId, setDraggedCityId] = useState<string | null>(null);
  const [countryOutlinePath, setCountryOutlinePath] = useState<string | null>(null);
  const svgRef = useRef<SVGSVGElement | null>(null);
  const dragOffset = useRef<{ x: number; y: number } | null>(null);

  // UX: zoom & pan
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [spacePressed, setSpacePressed] = useState(false);
  const panStart = useRef<{ x: number; y: number } | null>(null);

  // Insert mode and history
  const [insertMode, setInsertMode] = useState(false);
  const history = useRef<RegionData[][]>([]);
  const historyIndex = useRef<number>(-1);
  const refAlignSaveTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastMousePos = useRef<{ x: number; y: number }>({ x: 50, y: 50 });

  // Snap to close
  const [snapTarget, setSnapTarget] = useState<{ regionIndex: number; pointIndex: number } | null>(null);
  const snapThreshold = 8; // pixels in screen space - reduced for less sensitive snapping

  // Resolve mapId from URL if needed
  useEffect(() => {
    if (resolvedMapId) return;
    try {
      const p = typeof window !== 'undefined' ? window.location.pathname : '';
      const parts = p.split('/').filter(Boolean);
      const idx = parts.indexOf('trace');
      if (idx >= 0 && parts.length > idx + 1) {
        const candidateMap = parts[idx + 1];
        if (candidateMap) setResolvedMapId(candidateMap.trim().toLowerCase());
      }
    } catch (e) {
      // ignore
    }
  }, [resolvedMapId]);

  const map = getMapByName(resolvedMapId) || MAPS[resolvedMapId as keyof typeof MAPS];

  useEffect(() => {
    let cancelled = false;
    async function loadAlign() {
      if (!map) return;
      try {
        const resp = await fetch(`/api/ref-align?mapId=${map.id}`);
        if (!resp.ok) return;
        const payload = (await resp.json()) as { ok: boolean; data?: { x: number; y: number; scale: number } };
        if (!payload.ok || !payload.data) return;
        if (!cancelled) {
          setRefAlign({
            x: payload.data.x,
            y: payload.data.y,
            scale: payload.data.scale,
          });
        }
      } catch (e) {
        // ignore
      }
    }

    loadAlign();
    return () => {
      cancelled = true;
    };
  }, [map]);

  useEffect(() => {
    if (!map) return;
    if (refAlignSaveTimeout.current) {
      clearTimeout(refAlignSaveTimeout.current);
    }
    refAlignSaveTimeout.current = setTimeout(async () => {
      try {
        await fetch('/api/ref-align', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ mapId: map.id, x: refAlign.x, y: refAlign.y, scale: refAlign.scale }),
        });
      } catch (e) {
        // ignore
      }
    }, 300);
    return () => {
      if (refAlignSaveTimeout.current) {
        clearTimeout(refAlignSaveTimeout.current);
      }
    };
  }, [map, refAlign]);

  useEffect(() => {
    let cancelled = false;
    async function loadOutline() {
      if (!map) {
        setCountryOutlinePath(null);
        return;
      }
      try {
        const resp = await fetch(`/maps/${map.id}.geo.json`);
        if (!resp.ok) {
          setCountryOutlinePath(null);
          return;
        }
        const data = (await resp.json()) as GeoJson;
        const polygons = getPolygonsFromGeoJson(data);
        const selected = selectBestPolygon(polygons, map.id);
        if (!selected) {
          setCountryOutlinePath(null);
          return;
        }
        const path = buildOutlinePath(selected, map.id);
        if (!cancelled) setCountryOutlinePath(path);
      } catch (err) {
        if (!cancelled) setCountryOutlinePath(null);
      }
    }

    loadOutline();
    return () => {
      cancelled = true;
    };
  }, [map]);

  // Initialize all regions
  useEffect(() => {
    if (!map) return;
    
    let cancelled = false;
    
    async function loadRegions() {
      const regionColors = ['#60a5fa', '#f59e0b', '#10b981', '#ef4444', '#8b5cf6', '#ec4899'];
      let initialRegions: RegionData[] = map.regions.map((reg, idx) => ({
        id: reg.id,
        name: reg.name,
        color: reg.regionColor || regionColors[idx % regionColors.length],
        points: parsePathToPoints(reg.regionOutline),
      }));

      // Load saved traces
      try {
        const resp = await fetch(`/api/get-traces?mapId=${map.id}`);
        if (resp.ok) {
          const payload = (await resp.json()) as { ok: boolean; traces?: Record<string, any> };
          if (payload.ok && payload.traces) {
            // Merge saved traces with initial regions
            initialRegions = initialRegions.map(reg => {
              const saved = payload.traces?.[reg.id];
              if (saved && saved.points && Array.isArray(saved.points)) {
                return { ...reg, points: saved.points };
              }
              return reg;
            });
          }
        }
      } catch (err) {
        // ignore fetch errors
      }

      if (!cancelled) {
        setRegions(initialRegions);
        setVisibleRegions(new Set(initialRegions.map((_, idx) => idx)));
        history.current = [initialRegions.map(r => ({ ...r, points: [...r.points] }))];
        historyIndex.current = 0;
      }
    }

    // Initialize cities
    const allCities: CityData[] = map.regions.flatMap(region =>
      region.cities.map(city => ({
        id: city.id,
        name: city.name,
        regionId: region.id,
        x: city.x,
        y: city.y,
      }))
    );
    setCities(allCities);

    loadRegions();
    return () => {
      cancelled = true;
    };
  }, [map]);

  useEffect(() => {
    let cancelled = false;
    async function loadCities() {
      if (!map) return;
      try {
        const resp = await fetch(`/api/cities?mapId=${map.id}`);
        if (!resp.ok) return;
        const payload = (await resp.json()) as { ok: boolean; data?: { cities: CityData[] } };
        if (!payload.ok || !payload.data?.cities) return;
        if (!cancelled) setCities(payload.data.cities);
      } catch (e) {
        // ignore
      }
    }
    loadCities();
    return () => {
      cancelled = true;
    };
  }, [map]);

  // Keyboard controls
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space' && !e.repeat) {
        e.preventDefault();
        setSpacePressed(true);
      }

      const panStep = 50;
      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        setPan(p => ({ x: p.x + panStep, y: p.y }));
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        setPan(p => ({ x: p.x - panStep, y: p.y }));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setPan(p => ({ x: p.x, y: p.y + panStep }));
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        setPan(p => ({ x: p.x, y: p.y - panStep }));
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        e.preventDefault();
        setSpacePressed(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  if (!map) {
    const known = Object.keys(MAPS).join(', ');
    return (
      <div className="p-6 text-red-400">
        Unknown map: "{mapId}". Known maps: {known}. Open <a className="text-blue-300 underline" href="/devtools">Devtools</a> to pick one.
      </div>
    );
  }

  const selectedRegion = regions[selectedRegionIndex];
  const viewWidth = map.width;
  const viewHeight = map.height;

  const toScreen = (p: { x: number; y: number }) => ({ x: (p.x / 100) * viewWidth, y: (p.y / 100) * viewHeight });
  const toPercent = (sx: number, sy: number) => ({ x: (sx / viewWidth) * 100, y: (sy / viewHeight) * 100 });

  // Snap to border polygon edge
  function snapToBorderEdge(point: { x: number; y: number }, threshold = 20): { x: number; y: number } {
    if (!countryOutlinePath) return point;
    
    // Parse outline path to extract points - simplified: look for L commands
    const matches = countryOutlinePath.match(/M[\d.,-\s]+/g) || [];
    if (!matches.length) return point;
    
    // Extract all coordinate pairs from path
    const coords: { x: number; y: number }[] = [];
    const numMatches = countryOutlinePath.match(/([\d.-]+)/g) || [];
    for (let i = 0; i + 1 < numMatches.length; i += 2) {
      coords.push({ x: parseFloat(numMatches[i]), y: parseFloat(numMatches[i + 1]) });
    }
    
    if (!coords.length) return point;
    
    // Find nearest point on outline
    let minDist = Infinity;
    let nearestPoint = point;
    
    for (let i = 0; i < coords.length; i++) {
      const p1 = coords[i];
      const p2 = coords[(i + 1) % coords.length];
      
      // Distance to this point
      const dist = Math.hypot(point.x - p1.x, point.y - p1.y);
      if (dist < minDist) {
        minDist = dist;
        nearestPoint = p1;
      }
      
      // Distance to line segment
      const dx = p2.x - p1.x;
      const dy = p2.y - p1.y;
      const len = Math.hypot(dx, dy);
      if (len > 0) {
        const t = Math.max(0, Math.min(1, ((point.x - p1.x) * dx + (point.y - p1.y) * dy) / (len * len)));
        const closestX = p1.x + t * dx;
        const closestY = p1.y + t * dy;
        const distToSegment = Math.hypot(point.x - closestX, point.y - closestY);
        if (distToSegment < minDist) {
          minDist = distToSegment;
          nearestPoint = { x: closestX, y: closestY };
        }
      }
    }
    
    // Only snap if within threshold
    return minDist < threshold ? nearestPoint : point;
  }

  // Extract border points from country outline path
  function extractBorderPoints(): { x: number; y: number }[] {
    if (!countryOutlinePath) return [];
    const numMatches = countryOutlinePath.match(/([-\d.]+)/g) || [];
    const points: { x: number; y: number }[] = [];
    for (let i = 0; i + 1 < numMatches.length; i += 2) {
      points.push({ x: parseFloat(numMatches[i]), y: parseFloat(numMatches[i + 1]) });
    }
    return points;
  }

  // Refine polygon edges that overlap with country border by adding detail points
  function refineEdgesNearBorder(points: { x: number; y: number }[]): { x: number; y: number }[] {
    const borderPoints = extractBorderPoints();
    if (!borderPoints.length || points.length < 2) return points;

    const edgeThreshold = 2.5; // tolerance in percentage points for detecting edge-border overlap
    const detailThreshold = 3.5; // tolerance for including detail points
    const refined = [...points];

    // Process each edge
    for (let i = 0; i < refined.length; i++) {
      const p1 = refined[i];
      const p2 = refined[(i + 1) % refined.length];
      const dx = p2.x - p1.x;
      const dy = p2.y - p1.y;
      const segmentLen = Math.hypot(dx, dy);
      
      if (segmentLen < 0.1) continue;

      // Find border points close to this edge
      const pointsOnEdge: { point: { x: number; y: number }; t: number; dist: number }[] = [];
      
      for (const bp of borderPoints) {
        const t = segmentLen > 0 
          ? ((bp.x - p1.x) * dx + (bp.y - p1.y) * dy) / (segmentLen * segmentLen)
          : 0;
        
        if (t >= -0.02 && t <= 1.02) {
          const closestX = p1.x + t * dx;
          const closestY = p1.y + t * dy;
          const dist = Math.hypot(bp.x - closestX, bp.y - closestY);
          
          // Only include if edge is close to border AND point adds detail
          if (dist < edgeThreshold && dist < detailThreshold) {
            pointsOnEdge.push({ point: bp, t, dist });
          }
        }
      }

      // Sort by position along edge and insert unique points
      if (pointsOnEdge.length > 0) {
        pointsOnEdge.sort((a, b) => a.t - b.t);
        
        // Insert in reverse to preserve indices
        for (let j = pointsOnEdge.length - 1; j >= 0; j--) {
          const existing = refined.some(p => 
            Math.hypot(p.x - pointsOnEdge[j].point.x, p.y - pointsOnEdge[j].point.y) < 0.3
          );
          if (!existing) {
            refined.splice(i + 1 + j, 0, { ...pointsOnEdge[j].point });
          }
        }
      }
    }

    return refined;
  }

  function pushHistory(snapshot: RegionData[]) {
    history.current = history.current.slice(0, historyIndex.current + 1);
    history.current.push(snapshot.map(r => ({ ...r, points: r.points.map(p => ({ ...p })) })));
    historyIndex.current = history.current.length - 1;
  }

  function undo() {
    if (historyIndex.current <= 0) return;
    historyIndex.current -= 1;
    setRegions(history.current[historyIndex.current].map(r => ({ ...r, points: [...r.points] })));
  }

  function redo() {
    if (historyIndex.current >= history.current.length - 1) return;
    historyIndex.current += 1;
    setRegions(history.current[historyIndex.current].map(r => ({ ...r, points: [...r.points] })));
  }

  function handlePointerDown(e: React.PointerEvent, regionIdx: number, pointIdx: number) {
    if (regionIdx !== selectedRegionIndex) {
      setSelectedRegionIndex(regionIdx);
    }
    setDragIndex(pointIdx);
    (e.target as Element).setPointerCapture(e.pointerId);
    if (svgRef.current) {
      const rect = svgRef.current.getBoundingClientRect();
      const pt = regions[regionIdx].points[pointIdx];
      const s = toScreen(pt);
      const screenX = rect.left + pan.x + zoom * s.x;
      const screenY = rect.top + pan.y + zoom * s.y;
      dragOffset.current = { x: e.clientX - screenX, y: e.clientY - screenY };
    } else {
      dragOffset.current = { x: 0, y: 0 };
    }
  }

  function handleCityPointerDown(e: React.PointerEvent, cityId: string) {
    e.stopPropagation();
    setDraggedCityId(cityId);
    (e.target as Element).setPointerCapture(e.pointerId);
    if (svgRef.current) {
      const rect = svgRef.current.getBoundingClientRect();
      const city = cities.find(c => c.id === cityId);
      if (city) {
        const s = toScreen({ x: city.x, y: city.y });
        const screenX = rect.left + pan.x + zoom * s.x;
        const screenY = rect.top + pan.y + zoom * s.y;
        dragOffset.current = { x: e.clientX - screenX, y: e.clientY - screenY };
      }
    } else {
      dragOffset.current = { x: 0, y: 0 };
    }
  }

  function handlePointerMove(e: React.PointerEvent) {
    // Track current mouse position for addPoint
    if (svgRef.current) {
      const rect = svgRef.current.getBoundingClientRect();
      const sx = (e.clientX - rect.left - pan.x) / zoom;
      const sy = (e.clientY - rect.top - pan.y) / zoom;
      const pct = toPercent(sx, sy);
      lastMousePos.current = { x: clamp(pct.x), y: clamp(pct.y) };
    }

    if (isPanning) {
      if (!panStart.current) return;
      const dx = e.clientX - panStart.current.x;
      const dy = e.clientY - panStart.current.y;
      setPan({ x: pan.x + dx, y: pan.y + dy });
      panStart.current = { x: e.clientX, y: e.clientY };
      return;
    }

    // Handle city dragging
    if (editMode === 'cities' && draggedCityId) {
      if (!svgRef.current) return;
      const rect = svgRef.current.getBoundingClientRect();
      const off = dragOffset.current || { x: 0, y: 0 };
      const sx = (e.clientX - rect.left - pan.x - off.x) / zoom;
      const sy = (e.clientY - rect.top - pan.y - off.y) / zoom;
      const pct = toPercent(sx, sy);

      setCities(prev =>
        prev.map(city =>
          city.id === draggedCityId
            ? { ...city, x: clamp(pct.x), y: clamp(pct.y) }
            : city
        )
      );
      return;
    }

    if (dragIndex === null) return;
    if (!svgRef.current) return;
    const rect = svgRef.current.getBoundingClientRect();
    const off = dragOffset.current || { x: 0, y: 0 };
    const sx = (e.clientX - rect.left - pan.x - off.x) / zoom;
    const sy = (e.clientY - rect.top - pan.y - off.y) / zoom;
    let pct = toPercent(sx, sy);

    // Check for snap to any point in any region
    let snapped: { regionIndex: number; pointIndex: number } | null = null;
    for (let rIdx = 0; rIdx < regions.length; rIdx++) {
      for (let pIdx = 0; pIdx < regions[rIdx].points.length; pIdx++) {
        if (rIdx === selectedRegionIndex && pIdx === dragIndex) continue;
        const pt = regions[rIdx].points[pIdx];
        const s = toScreen(pt);
        const dist = Math.hypot(sx - s.x, sy - s.y);
        if (dist < snapThreshold / zoom) {
          pct = { x: pt.x, y: pt.y };
          snapped = { regionIndex: rIdx, pointIndex: pIdx };
          break;
        }
      }
      if (snapped) break;
    }

    // If not snapped to another point, try snapping to border edge
    if (!snapped) {
      pct = snapToBorderEdge(pct, snapThreshold);
    }

    setSnapTarget(snapped);

    setRegions((prev) => {
      const next = prev.map((reg, idx) => {
        if (idx !== selectedRegionIndex) return reg;
        return {
          ...reg,
          points: reg.points.map((p, i) => (i === dragIndex ? { x: clamp(pct.x), y: clamp(pct.y) } : p)),
        };
      });
      return next;
    });
  }

  function handlePointerUp(e: React.PointerEvent) {
    if (isPanning) {
      setIsPanning(false);
      panStart.current = null;
      return;
    }

    if (dragIndex !== null) {
      pushHistory(regions);
    }
    if (draggedCityId !== null) {
      setDraggedCityId(null);
    }
    setDragIndex(null);
    setSnapTarget(null);
    dragOffset.current = null;
  }

  function addPoint() {
    if (!selectedRegion) return;
    // Add point at center of map
    const centerPoint = { x: 50, y: 50 };
    setRegions((prev) => {
      const next = prev.map((reg, idx) => {
        if (idx !== selectedRegionIndex) return reg;
        const newPoints = [...reg.points, centerPoint];
        return { ...reg, points: newPoints };
      });
      pushHistory(next);
      return next;
    });
  }

  function removePoint() {
    if (!selectedRegion || selectedRegion.points.length <= 1) return;
    setRegions((prev) => {
      const next = prev.map((reg, idx) => {
        if (idx !== selectedRegionIndex) return reg;
        return { ...reg, points: reg.points.slice(0, -1) };
      });
      pushHistory(next);
      return next;
    });
  }

  function handleBackgroundPointerDown(e: React.PointerEvent) {
    // Shift+click to add point at mouse position
    if (e.shiftKey && e.button === 0 && !spacePressed && editMode === 'polygons' && selectedRegion) {
      e.preventDefault();
      // Get mouse position in SVG coordinates
      if (svgRef.current) {
        const rect = svgRef.current.getBoundingClientRect();
        // SVG viewBox coordinates are already map space, but we're inside a scaled/translated group
        // The group has: translate(pan.x, pan.y) scale(zoom)
        // So we need to reverse that: (screenCoords - pan) / zoom
        const svgX = (e.clientX - rect.left) / rect.width * map.width;
        const svgY = (e.clientY - rect.top) / rect.height * map.height;
        
        // Now reverse the group transforms
        const groupX = (svgX - pan.x) / zoom;
        const groupY = (svgY - pan.y) / zoom;
        
        // This gives us coordinates in map space (0-map.width, 0-map.height)
        // Convert to percentage (0-100)
        const pct = toPercent(groupX, groupY);
        const newPoint = { x: clamp(pct.x), y: clamp(pct.y) };
        
        setRegions((prev) => {
          const next = prev.map((reg, idx) => {
            if (idx !== selectedRegionIndex) return reg;
            const newPoints = [...reg.points, newPoint];
            return { ...reg, points: newPoints };
          });
          pushHistory(next);
          return next;
        });
      }
      return;
    }

    if (e.button === 1 || e.button === 2 || (e.button === 0 && spacePressed)) {
      e.preventDefault();
      setIsPanning(true);
      panStart.current = { x: e.clientX, y: e.clientY };
    }
  }

  function handleWheel(e: React.WheelEvent) {
    e.preventDefault();
    const delta = -e.deltaY;
    const factor = delta > 0 ? 1.1 : 0.9;
    setZoom((z) => Math.max(0.2, Math.min(5, z * factor)));
  }

  function generatePathData(points: Array<{ x: number; y: number }>) {
    if (points.length === 0) return '';
    return 'M' + points.map((pt) => `${pt.x},${pt.y}`).join(' L ');
  }

  function toggleRegionVisibility(idx: number) {
    setVisibleRegions(prev => {
      const next = new Set(prev);
      if (next.has(idx)) {
        next.delete(idx);
      } else {
        next.add(idx);
      }
      return next;
    });
  }

  function downloadJSON() {
    const exportData = regions.map(reg => ({
      regionId: reg.id,
      regionName: reg.name,
      path: generatePathData(reg.points),
      points: reg.points,
    }));
    const blob = new Blob([JSON.stringify({ mapId: map.id, regions: exportData }, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${map.id}-all-regions.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  async function saveRegion(regionIdx: number) {
    const reg = regions[regionIdx];
    
    // Refine edges near border automatically
    const refinedPoints = refineEdgesNearBorder(reg.points);
    const pathData = generatePathData(refinedPoints);
    
    if (!pathData) {
      alert(`Cannot save ${reg.name}: no points drawn. Please draw a polygon for this region.`);
      return;
    }
    
    // Get cities for this region from the updated cities array
    const regionCities = cities.filter(c => c.regionId === reg.id).map(c => ({
      id: c.id,
      name: c.name,
      x: c.x,
      y: c.y,
    }));

    const payload = {
      mapId: map.id,
      regionId: reg.id,
      path: pathData,
      points: refinedPoints,
      cities: regionCities,
    };

    try {
      const resp = await fetch('/api/save-trace', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!resp.ok) {
        const errText = await resp.text();
        alert(`Failed to save: ${errText}`);
      } else {
        const pointsAdded = refinedPoints.length - reg.points.length;
        const msg = pointsAdded > 0 
          ? `Saved ${reg.name}! (+${pointsAdded} detail points from border)`
          : `Saved ${reg.name}!`;
        alert(msg);
      }
    } catch (err) {
      alert(`Error saving: ${err}`);
    }
  }

  async function saveAllRegions() {
    for (let i = 0; i < regions.length; i++) {
      await saveRegion(i);
    }
    alert(`All ${regions.length} regions saved!`);
  }

  async function saveCities() {
    const payload = {
      mapId: map.id,
      cities: cities,
    };

    try {
      const resp = await fetch('/api/save-cities', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!resp.ok) {
        const errText = await resp.text();
        alert(`Failed to save cities: ${errText}`);
      } else {
        alert(`Saved all cities!`);
      }
    } catch (err) {
      alert(`Error saving cities: ${err}`);
    }
  }


  return (
    <main className="min-h-screen flex items-start justify-center p-6 bg-slate-900">
      <div className="w-full max-w-7xl flex gap-4">
        {/* Layer Panel */}
        <div className="w-64 flex-shrink-0">
          <div className="bg-slate-800 rounded-lg p-4 sticky top-6">
            <h3 className="text-white font-semibold mb-3 flex items-center gap-2">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
              </svg>
              Region Layers
            </h3>
            <div className="space-y-2">
              {regions.map((reg, idx) => {
                const isVisible = visibleRegions.has(idx);
                const isSelected = idx === selectedRegionIndex;
                return (
                  <div key={reg.id}>
                    <div
                      className={`flex items-center gap-2 p-2 rounded ${isSelected ? 'bg-slate-700' : 'bg-slate-900'}`}
                    >
                      <input
                        type="checkbox"
                        checked={isVisible}
                        onChange={() => toggleRegionVisibility(idx)}
                        className="w-4 h-4 cursor-pointer flex-shrink-0"
                      />
                      <button
                        className="flex-1 flex items-center gap-2 text-left min-w-0"
                        onClick={() => setSelectedRegionIndex(idx)}
                      >
                        <div
                          className="w-3 h-3 rounded-full flex-shrink-0"
                          style={{ backgroundColor: reg.color }}
                        />
                        <span className={`text-sm truncate ${isSelected ? 'text-white font-semibold' : 'text-gray-300'}`}>
                          {reg.name}
                        </span>
                      </button>
                      <span className="text-xs text-gray-500 flex-shrink-0">{reg.points.length}</span>
                    </div>
                    {isSelected && reg.points.length > 0 && (
                      <button
                        className="w-full mt-1 px-2 py-1 bg-blue-600 hover:bg-blue-700 text-white text-xs rounded"
                        onClick={() => saveRegion(idx)}
                      >
                        Save {reg.name}
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
            <div className="mt-4 pt-4 border-t border-slate-700 space-y-2">
              <button
                className="w-full px-3 py-2 bg-slate-700 hover:bg-slate-600 text-white text-sm rounded"
                onClick={() => setVisibleRegions(new Set(regions.map((_, idx) => idx)))}
              >
                Show All
              </button>
              <button
                className="w-full px-3 py-2 bg-slate-700 hover:bg-slate-600 text-white text-sm rounded"
                onClick={() => setVisibleRegions(new Set())}
              >
                Hide All
              </button>
              <button
                className="w-full px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm rounded font-semibold"
                onClick={saveAllRegions}
              >
                Save All Regions
              </button>
            </div>

            <div className="mt-4 pt-4 border-t border-slate-700 space-y-2">
              <h3 className="text-white font-semibold mb-2">Edit Mode</h3>
              <button
                className={`w-full px-3 py-2 rounded text-white text-sm ${
                  editMode === 'polygons'
                    ? 'bg-blue-600'
                    : 'bg-slate-700 hover:bg-slate-600'
                }`}
                onClick={() => setEditMode('polygons')}
              >
                Edit Polygons
              </button>
              <button
                className={`w-full px-3 py-2 rounded text-white text-sm ${
                  editMode === 'cities'
                    ? 'bg-violet-600'
                    : 'bg-slate-700 hover:bg-slate-600'
                }`}
                onClick={() => setEditMode('cities')}
              >
                Edit Cities
              </button>
              {editMode === 'cities' && (
                <button
                  className="w-full px-3 py-2 bg-violet-600 hover:bg-violet-700 text-white text-sm rounded font-semibold"
                  onClick={saveCities}
                >
                  Save All Cities
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Main Editor */}
        <div className="flex-1">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-white text-2xl font-bold">{map.name} Full Map Editor</h1>
            <p className="text-sm text-gray-400">Mode: {editMode === 'polygons' ? '🔷 Editing Polygons' : '🏙️ Editing Cities'}</p>
          </div>
          <div className="flex gap-2 flex-wrap">
            {editMode === 'polygons' && (
              <>
                <button className="px-3 py-1 bg-slate-700 text-white rounded text-xs" onClick={addPoint}>Add Point (center)</button>
                <button className="px-3 py-1 bg-slate-700 text-white rounded text-xs" onClick={removePoint}>Remove Point</button>
                <button className="px-3 py-1 bg-slate-700 text-white rounded text-xs" onClick={() => { undo(); }} title="Undo">Undo</button>
                <button className="px-3 py-1 bg-slate-700 text-white rounded" onClick={() => { redo(); }} title="Redo">Redo</button>
                <button
                  className={`px-3 py-1 ${insertMode ? 'bg-amber-600' : 'bg-slate-700'} text-white rounded`}
                  onClick={() => setInsertMode((s) => !s)}
                  title="Insert mode"
                >
                  {insertMode ? 'Insert: ON' : 'Insert: OFF'}
                </button>
              </>
            )}
            <div className="inline-flex items-center gap-2 px-2 py-1 bg-slate-800 rounded">
              <button className="px-2 py-1 bg-slate-600 text-white rounded" onClick={() => setZoom((z) => Math.max(0.2, z / 1.1))}>−</button>
              <div className="text-white text-sm px-2">{Math.round(zoom * 100)}%</div>
              <button className="px-2 py-1 bg-slate-600 text-white rounded" onClick={() => setZoom((z) => Math.min(5, z * 1.1))}>+</button>
              <button className="px-2 py-1 bg-slate-600 text-white rounded" onClick={() => { setZoom(1); setPan({ x: 0, y: 0 }); }}>Reset</button>
            </div>
            <button className="px-3 py-1 bg-blue-600 text-white rounded" onClick={downloadJSON}>Export All Regions</button>
          </div>
        </div>

        <div className="mb-3 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <label className="inline-flex items-center text-sm text-gray-200">
              <input type="checkbox" checked={showReference} onChange={(e) => setShowReference(e.target.checked)} className="mr-2" />
              Show Reference
            </label>
            <div>
              <label className="text-gray-300 mr-2">Overlay opacity</label>
              <input type="range" min="0" max="1" step="0.05" value={opacity} onChange={(e) => setOpacity(Number(e.target.value))} disabled={!showReference} />
              <span className="text-gray-300 ml-2">{Math.round(opacity * 100)}%</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-gray-400 text-xs">Align</span>
              <span className="text-gray-500 text-xs">X</span>
              <input
                type="range"
                min={-200}
                max={200}
                step={1}
                value={refAlign.x}
                onChange={(e) => setRefAlign((prev) => ({ ...prev, x: Number(e.target.value) }))}
                disabled={!showReference}
              />
              <span className="text-gray-400 text-xs w-8 text-right">{refAlign.x}</span>
              <span className="text-gray-500 text-xs">Y</span>
              <input
                type="range"
                min={-200}
                max={200}
                step={1}
                value={refAlign.y}
                onChange={(e) => setRefAlign((prev) => ({ ...prev, y: Number(e.target.value) }))}
                disabled={!showReference}
              />
              <span className="text-gray-400 text-xs w-8 text-right">{refAlign.y}</span>
              <span className="text-gray-500 text-xs">Scale</span>
              <input
                type="range"
                min={0.5}
                max={2}
                step={0.01}
                value={refAlign.scale}
                onChange={(e) => setRefAlign((prev) => ({ ...prev, scale: Number(e.target.value) }))}
                disabled={!showReference}
              />
              <span className="text-gray-400 text-xs w-12 text-right">{refAlign.scale.toFixed(2)}</span>
              <button
                type="button"
                className="px-2 py-1 text-xs rounded bg-slate-700 text-gray-200 hover:bg-slate-600"
                onClick={() => setRefAlign({ x: 0, y: 0, scale: 1 })}
                disabled={!showReference}
              >
                Reset
              </button>
            </div>
          </div>
          <div className="text-sm text-gray-400">
            <span className={spacePressed ? 'text-amber-400 font-semibold' : ''}>
              {spacePressed ? '🖐️ Pan Mode Active' : '💡 Hold SPACE + drag to pan, or use arrow keys'}
            </span>
          </div>
        </div>

        <div className="relative bg-black rounded-lg overflow-hidden" style={{ height: '80vh' }}>
          <div style={{ position: 'absolute', inset: 0, cursor: spacePressed ? 'grab' : isPanning ? 'grabbing' : 'default' }}>
            <svg
              ref={svgRef}
              viewBox={`0 0 ${map.width} ${map.height}`}
              className="w-full h-full"
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              onPointerCancel={handlePointerUp}
            >
              <rect width={map.width} height={map.height} fill="transparent" />

              <defs>
                {countryOutlinePath && (
                  <clipPath id={`country-clip-${map.id}`} clipPathUnits="userSpaceOnUse">
                    <path
                      d={countryOutlinePath}
                      transform={`scale(${map.width / 100} ${map.height / 100})`}
                    />
                  </clipPath>
                )}
              </defs>

              {/* Reference image - render before main group so it bleeds over edges */}
              {showReference && (
                <g transform={`translate(${pan.x} ${pan.y}) scale(${zoom})`}>
                  <g transform={`translate(${refAlign.x} ${refAlign.y}) scale(${refAlign.scale})`}>
                    <image
                      href={`/maps/refs/${map.id}-ref.jpg`}
                      x="0"
                      y="0"
                      width={map.width}
                      height={map.height}
                      opacity={opacity}
                      preserveAspectRatio="xMidYMid slice"
                    />
                  </g>
                </g>
              )}

              <g transform={`translate(${pan.x} ${pan.y}) scale(${zoom})`} onPointerDown={handleBackgroundPointerDown} onWheel={handleWheel as any}>
                <rect width={map.width} height={map.height} fill="transparent" />

                {/* Render country outline */}
                {countryOutlinePath && (
                  <g transform={`scale(${map.width / 100} ${map.height / 100})`}>
                    <path
                      d={countryOutlinePath}
                      fill="none"
                      stroke="#fbbf24"
                      strokeWidth={0.9}
                      strokeOpacity={0.9}
                      strokeDasharray=""
                      vectorEffect="non-scaling-stroke"
                    />
                  </g>
                )}

                {/* Voronoi Region Suggester - shows suggested boundaries based on city seed points */}
                {editMode === 'polygons' && cities.length > 0 && (
                  <g transform={`scale(${map.width / 100} ${map.height / 100})`}>
                    <VoronoiSuggester
                      cities={cities}
                      mapBounds={map}
                      targetRegionCount={map.regions.length}
                      zoom={zoom}
                      pan={pan}
                      svgWidth={map.width}
                      svgHeight={map.height}
                      opacity={0.12}
                      showAdjacentRegionLabels={true}
                    />
                  </g>
                )}

                {/* Render all region outlines */}
                <g
                  transform={`scale(${map.width / 100} ${map.height / 100})`}
                  clipPath={countryOutlinePath ? `url(#country-clip-${map.id})` : undefined}
                >
                  {regions.map((reg, regIdx) => {
                    if (!visibleRegions.has(regIdx)) return null;
                    const pathData = generatePathData(reg.points);
                    const isSelected = regIdx === selectedRegionIndex;
                    const isClosed = reg.points.length >= 3; // Polygon is closed with 3+ points
                    
                    return (
                      <g key={reg.id}>
                        {/* Fill closed polygon with region color */}
                        {isClosed && (
                          <path
                            d={pathData}
                            fill={reg.color}
                            fillOpacity={0.15}
                            stroke="none"
                          />
                        )}
                        {/* Stroke outline */}
                        <path
                          d={pathData}
                          fill="none"
                          stroke={reg.color}
                          strokeWidth={isSelected ? 1.2 : 0.7}
                          strokeOpacity={isSelected ? 1.0 : 0.6}
                        />
                      </g>
                    );
                  })}
                </g>

                {/* Render all cities */}
                <g transform={`scale(${map.width / 100} ${map.height / 100})`}>
                  {cities.map(city => {
                    const regionData = regions.find(r => r.id === city.regionId);
                    const color = regionData?.color || '#999999';
                    const isDragged = draggedCityId === city.id;
                    
                    return (
                      <g key={city.id}>
                        <circle
                          cx={city.x}
                          cy={city.y}
                          r={editMode === 'cities' ? 1 : 1}
                          fill={isDragged ? '#FFD700' : color}
                          fillOpacity={0.9}
                          stroke="#ffffff"
                          strokeWidth={isDragged ? 1 : 0.5}
                          style={{ cursor: editMode === 'cities' ? 'grab' : 'default' }}
                          onPointerDown={(e: any) => editMode === 'cities' && handleCityPointerDown(e, city.id)}
                        />
                        <text
                          x={city.x}
                          y={city.y - 3}
                          fontSize={editMode === 'cities' ? '2' : '2'}
                          fill="#ffffff"
                          textAnchor="middle"
                          style={{ pointerEvents: 'none', userSelect: 'none' }}
                        >
                          {city.name}
                        </text>
                      </g>
                    );
                  })}
                </g>

                {/* Render control points for all regions - only in polygon mode */}
                {editMode === 'polygons' && regions.map((reg, regIdx) => {
                  if (!visibleRegions.has(regIdx)) return null;
                  const isSelected = regIdx === selectedRegionIndex;
                  return reg.points.map((pt, ptIdx) => {
                    const s = toScreen(pt);
                    const isSnapTarget = snapTarget?.regionIndex === regIdx && snapTarget?.pointIndex === ptIdx;
                    
                    return (
                      <g key={`${reg.id}-${ptIdx}`}>
                        {isSnapTarget && (
                          <circle
                            cx={s.x}
                            cy={s.y}
                            r={18}
                            fill="none"
                            stroke="#10b981"
                            strokeWidth={3}
                            opacity={0.8}
                          >
                            <animate
                              attributeName="r"
                              values="18;22;18"
                              dur="0.8s"
                              repeatCount="indefinite"
                            />
                          </circle>
                        )}
                        <circle
                          cx={s.x}
                          cy={s.y}
                          r={isSelected ? 6 : 4}
                          fill={isSelected ? "#111827" : reg.color}
                          stroke={isSnapTarget ? "#10b981" : isSelected ? "#f59e0b" : "#ffffff"}
                          strokeWidth={isSnapTarget ? 3 : isSelected ? 2 : 1}
                          opacity={isSelected ? 1 : 0.7}
                        />
                        {isSelected && (
                          <circle
                            cx={s.x}
                            cy={s.y}
                            r={12}
                            fill="transparent"
                            style={{ cursor: 'grab' }}
                            onPointerDown={(e) => handlePointerDown(e, regIdx, ptIdx)}
                          />
                        )}
                      </g>
                    );
                  });
                })}
              </g>
            </svg>
          </div>
        </div>

        <div className="mt-4 text-xs text-gray-400">
          <p>💡 Click a region name to select it for editing. Drag points from any region to align boundaries.</p>
          <p>Points will snap to nearby points from other regions to create seamless boundaries.</p>
        </div>
      </div>
      </div>
    </main>
  );
}
