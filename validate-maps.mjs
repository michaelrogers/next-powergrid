import { MAPS, validateMapTopology } from './src/lib/mapData.js';

// Validate all maps
console.log('=== Map Topology Validation ===');
for (const [mapId, map] of Object.entries(MAPS)) {
  const result = validateMapTopology(map);
  console.log(`\n${map.name} (${mapId}): ${result.valid ? '✓ Valid' : '⚠ Issues'}`);
  if (result.warnings.length > 0) {
    result.warnings.forEach(w => console.log(`  • ${w}`));
  } else {
    console.log(`  ✓ All regions have bidirectional adjacencies`);
    console.log(`  ✓ ${map.regions.length} regions, ${map.regions.reduce((sum, r) => sum + r.cities.length, 0)} cities`);
  }
}
