import fs from 'fs';
import path from 'path';
import { spawn } from 'child_process';

const repoRoot = process.cwd();
const tracesDir = path.join(repoRoot, 'map-traces');
const generatorPath = path.join(repoRoot, 'scripts', 'generate-map-review.mjs');

if (!fs.existsSync(tracesDir)) {
  console.error(`map-traces directory not found at ${tracesDir}`);
  process.exit(1);
}

let timeoutId = null;

const runGenerator = () => {
  const child = spawn(process.execPath, [generatorPath], { stdio: 'inherit' });
  child.on('exit', (code) => {
    if (code !== 0) {
      console.error(`Map review generator exited with code ${code}`);
    }
  });
};

const scheduleRun = () => {
  if (timeoutId) clearTimeout(timeoutId);
  timeoutId = setTimeout(runGenerator, 150);
};

console.log('Watching map-traces for changes...');
runGenerator();

fs.watch(tracesDir, (eventType, filename) => {
  if (!filename) return;
  if (!filename.endsWith('-cities.json')) return;
  scheduleRun();
});
