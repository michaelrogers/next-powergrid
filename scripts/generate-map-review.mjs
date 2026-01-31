import fs from 'fs';
import path from 'path';

const repoRoot = process.cwd();
const tracesDir = path.join(repoRoot, 'map-traces');
const outputFile = path.join(tracesDir, 'REVIEW.md');

const readJson = (filePath) => {
  const raw = fs.readFileSync(filePath, 'utf8');
  return JSON.parse(raw);
};

const formatNumber = (value) => {
  if (typeof value !== 'number') return '';
  return Number.isInteger(value) ? String(value) : value.toFixed(2);
};

const safeText = (value) => (value === undefined || value === null ? '' : String(value));

const buildMarkdown = (maps) => {
  const lines = [];
  lines.push('# Map Trace Review');
  lines.push('');
  lines.push(`Generated: ${new Date().toISOString()}`);
  lines.push('');

  for (const map of maps) {
    lines.push(`## ${safeText(map.mapId).toUpperCase()}`);
    lines.push('');
    lines.push(`Map ID: ${safeText(map.mapId)}`);
    lines.push('');

    const cities = Array.isArray(map.cities) ? map.cities : [];
    lines.push('### Cities');
    lines.push('');
    lines.push('| ID | Name | X | Y | Region |');
    lines.push('| --- | --- | --- | --- | --- |');
    for (const city of cities) {
      lines.push(`| ${safeText(city.id)} | ${safeText(city.name)} | ${formatNumber(city.x)} | ${formatNumber(city.y)} | ${safeText(city.regionId)} |`);
    }
    lines.push('');

    const regions = Array.isArray(map.regions) ? map.regions : [];
    lines.push('### Regions');
    lines.push('');
    if (regions.length === 0) {
      lines.push('_No regions data in map-traces file._');
      lines.push('');
    } else {
      lines.push('| ID | Name | Color | City Count | Cities |');
      lines.push('| --- | --- | --- | --- | --- |');
      for (const region of regions) {
        const cityIds = Array.isArray(region.cityIds) ? region.cityIds : [];
        lines.push(`| ${safeText(region.id)} | ${safeText(region.name)} | ${safeText(region.regionColor)} | ${cityIds.length} | ${cityIds.join(', ')} |`);
      }
      lines.push('');
    }

    const connections = Array.isArray(map.connections) ? map.connections : [];
    lines.push('### Connections');
    lines.push('');
    if (connections.length === 0) {
      lines.push('_No connections data in map-traces file._');
      lines.push('');
    } else {
      lines.push('| City A | City B | Cost |');
      lines.push('| --- | --- | --- |');
      for (const connection of connections) {
        lines.push(`| ${safeText(connection.cityA)} | ${safeText(connection.cityB)} | ${formatNumber(connection.cost)} |`);
      }
      lines.push('');
    }
  }

  return lines.join('\n');
};

const generateReview = () => {
  if (!fs.existsSync(tracesDir)) {
    throw new Error(`map-traces directory not found at ${tracesDir}`);
  }

  const files = fs
    .readdirSync(tracesDir)
    .filter((file) => file.endsWith('-cities.json'))
    .sort();

  const maps = files.map((file) => readJson(path.join(tracesDir, file)));
  const markdown = buildMarkdown(maps);

  fs.writeFileSync(outputFile, markdown, 'utf8');
  return outputFile;
};

try {
  const filePath = generateReview();
  console.log(`Map review generated: ${filePath}`);
} catch (error) {
  console.error(`Failed to generate map review: ${error.message}`);
  process.exit(1);
}
