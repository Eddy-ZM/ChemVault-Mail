import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, '../..');
const publishMode = process.argv[2] || 'never';
const allowedPublishModes = new Set(['never', 'always', 'onTag', 'onTagOrDraft']);

if (!allowedPublishModes.has(publishMode)) {
  console.error(`Unsupported electron-builder publish mode: ${publishMode}`);
  process.exit(1);
}

const electronBuilderBin = path.join(
  projectRoot,
  'node_modules',
  '.bin',
  process.platform === 'win32' ? 'electron-builder.cmd' : 'electron-builder',
);

const electronDist = path.join(projectRoot, 'node_modules', 'electron', 'dist');
const electronExecutable = path.join(electronDist, process.platform === 'win32' ? 'electron.exe' : 'electron');
const args = ['--win', 'nsis', '--x64', '--publish', publishMode];

if (fs.existsSync(electronExecutable)) {
  args.push(`--config.electronDist=${electronDist}`);
  console.log(`Using local Electron runtime: ${electronDist}`);
} else {
  console.log('Local Electron runtime not found; electron-builder will use its configured download/cache behavior.');
}

const result = spawnSync(electronBuilderBin, args, {
  cwd: projectRoot,
  stdio: 'inherit',
  shell: process.platform === 'win32',
  windowsHide: true,
});

if (result.error) {
  console.error(result.error);
  process.exit(1);
}

process.exit(result.status ?? 1);
