import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, '../..');
const packageJson = JSON.parse(fs.readFileSync(path.join(projectRoot, 'package.json'), 'utf8'));
const currentVersion = packageJson.version;
const releaseRoot = path.join(projectRoot, 'release', 'windows');
const currentReleaseDir = path.join(releaseRoot, `v${currentVersion}`);
const installerPattern = /^ChemVault-Mail-Setup-(\d+\.\d+\.\d+)\.exe(?:\.blockmap)?$/;

function moveFile(source, target) {
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.rmSync(target, { force: true });
  fs.renameSync(source, target);
  console.log(`Archived ${path.relative(releaseRoot, target)}`);
}

function archiveVersionedInstallers() {
  if (!fs.existsSync(releaseRoot)) {
    throw new Error(`Missing Windows release directory: ${releaseRoot}`);
  }

  for (const entry of fs.readdirSync(releaseRoot, { withFileTypes: true })) {
    if (!entry.isFile()) {
      continue;
    }

    const match = entry.name.match(installerPattern);
    if (!match) {
      continue;
    }

    const version = match[1];
    moveFile(path.join(releaseRoot, entry.name), path.join(releaseRoot, `v${version}`, entry.name));
  }
}

function archiveCurrentMetadata() {
  for (const fileName of ['latest.yml', 'builder-debug.yml']) {
    const source = path.join(releaseRoot, fileName);
    if (fs.existsSync(source)) {
      moveFile(source, path.join(currentReleaseDir, fileName));
    }
  }
}

archiveVersionedInstallers();
archiveCurrentMetadata();

const expectedInstaller = path.join(currentReleaseDir, `ChemVault-Mail-Setup-${currentVersion}.exe`);
const expectedBlockmap = `${expectedInstaller}.blockmap`;
const expectedLatest = path.join(currentReleaseDir, 'latest.yml');

for (const requiredPath of [expectedInstaller, expectedBlockmap, expectedLatest]) {
  if (!fs.existsSync(requiredPath)) {
    throw new Error(`Missing archived Windows release file: ${requiredPath}`);
  }
}

console.log(`Windows release ${currentVersion} is archived in ${currentReleaseDir}`);
