'use client';

import { useEffect } from 'react';
import { initializeVoronoiCache } from '@/lib/voronoiCache';

/**
 * Initializes the Voronoi region cache at app startup
 * This is a client component that runs once when the app loads
 */
export function VoronoiInitializer() {
  useEffect(() => {
    // Initialize Voronoi cache for all maps asynchronously
    const init = async () => {
      try {
        await initializeVoronoiCache();
      } catch (err) {
        console.error('Failed to initialize Voronoi cache:', err);
      }
    };
    init();
  }, []);

  return null; // This component doesn't render anything
}
