import { spawn, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import http from 'node:http';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, '../..');
const packageJson = JSON.parse(fs.readFileSync(path.join(projectRoot, 'package.json'), 'utf8'));
const appVersion = packageJson.version;
const releaseDir = path.join(projectRoot, 'release', 'windows');
const installerPath = path.join(releaseDir, `ChemVault-Mail-Setup-${appVersion}.exe`);
const blockmapPath = `${installerPath}.blockmap`;
const latestPath = path.join(releaseDir, 'latest.yml');
const unpackedExe = path.join(releaseDir, 'win-unpacked', 'ChemVault Mail.exe');
const updaterLog = path.join(process.env.APPDATA || '', 'ChemVault Mail', 'logs', 'desktop-updater.log');

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function waitForCondition(predicate, timeoutMs, message) {
  const startedAt = Date.now();
  while (Date.now() - startedAt < timeoutMs) {
    if (predicate()) {
      return;
    }
    await wait(500);
  }

  throw new Error(message);
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    stdio: 'inherit',
    windowsHide: true,
    ...options,
  });

  assert(result.status === 0, `${command} ${args.join(' ')} failed with exit code ${result.status}`);
}

function getWindowsKnownFolder(folderName) {
  const result = spawnSync('powershell', [
    '-NoProfile',
    '-Command',
    `[Environment]::GetFolderPath('${folderName}')`,
  ], {
    encoding: 'utf8',
    windowsHide: true,
  });

  assert(result.status === 0, `Unable to resolve Windows known folder: ${folderName}`);
  const folderPath = result.stdout.trim();
  assert(folderPath, `Windows known folder is empty: ${folderName}`);
  return folderPath;
}

function startApp(exePath, env = {}) {
  return spawn(exePath, [], {
    detached: false,
    stdio: 'ignore',
    windowsHide: true,
    env: {
      ...process.env,
      ...env,
    },
  });
}

async function stopProcess(child) {
  if (!child || child.exitCode !== null) {
    return;
  }

  child.kill('SIGTERM');
  await wait(1000);

  if (child.exitCode === null) {
    child.kill('SIGKILL');
  }
}

async function withHttpServer(directory, callback) {
  const root = path.resolve(directory);
  const server = http.createServer((request, response) => {
    const requestPath = decodeURIComponent(new URL(request.url, 'http://127.0.0.1').pathname);
    const filePath = path.resolve(path.join(root, requestPath));

    if (!filePath.startsWith(root)) {
      response.writeHead(403);
      response.end('Forbidden');
      return;
    }

    fs.createReadStream(filePath)
      .on('error', () => {
        response.writeHead(404);
        response.end('Not found');
      })
      .pipe(response);
  });

  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const { port } = server.address();

  try {
    return await callback(`http://127.0.0.1:${port}/`);
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
}

function resetUpdaterLog() {
  if (updaterLog && fs.existsSync(updaterLog)) {
    fs.rmSync(updaterLog, { force: true });
  }
}

function readUpdaterLog() {
  return updaterLog && fs.existsSync(updaterLog) ? fs.readFileSync(updaterLog, 'utf8') : '';
}

async function runUpdateCheck(feedUrl, expectedText) {
  resetUpdaterLog();
  const app = startApp(unpackedExe, {
    CHEMVAULT_DESKTOP_UPDATE_FEED_URL: feedUrl,
  });

  await wait(12000);
  const running = app.exitCode === null;
  await stopProcess(app);

  const log = readUpdaterLog();
  assert(running, `App exited during update check for ${feedUrl}`);
  assert(log.includes('Checking for Windows desktop update'), 'Updater did not check for updates');
  assert(log.includes(expectedText), `Updater log did not include expected text: ${expectedText}`);
}

function makeNewerFeed() {
  const feedDir = fs.mkdtempSync(path.join(os.tmpdir(), 'chemvault-mail-update-feed-'));
  fs.copyFileSync(installerPath, path.join(feedDir, path.basename(installerPath)));
  fs.copyFileSync(blockmapPath, path.join(feedDir, path.basename(blockmapPath)));
  const [major, minor, patch] = appVersion.split('.').map((part) => Number.parseInt(part, 10));
  const nextVersion = `${major}.${minor}.${patch + 1}`;
  const latest = fs.readFileSync(latestPath, 'utf8').replace(`version: ${appVersion}`, `version: ${nextVersion}`);
  fs.writeFileSync(path.join(feedDir, 'latest.yml'), latest);
  return feedDir;
}

async function main() {
  assert(process.platform === 'win32', 'Windows desktop smoke test must run on Windows');
  assert(fs.existsSync(installerPath), `Missing installer: ${installerPath}`);
  assert(fs.existsSync(blockmapPath), `Missing blockmap: ${blockmapPath}`);
  assert(fs.existsSync(latestPath), `Missing latest.yml: ${latestPath}`);
  assert(fs.existsSync(unpackedExe), `Missing unpacked app: ${unpackedExe}`);

  const installDir = path.join(releaseDir, 'test-install-smoke');
  fs.rmSync(installDir, { recursive: true, force: true });

  run(installerPath, ['/S', `/D=${installDir}`]);

  const installedExe = path.join(installDir, 'ChemVault Mail.exe');
  const uninstaller = path.join(installDir, 'Uninstall ChemVault Mail.exe');
  const desktopShortcut = path.join(getWindowsKnownFolder('Desktop'), 'ChemVault Mail.lnk');
  const startMenuShortcut = path.join(getWindowsKnownFolder('Programs'), 'ChemVault Mail.lnk');

  assert(fs.existsSync(installedExe), 'Installed app executable is missing');
  assert(fs.existsSync(uninstaller), 'Uninstaller is missing');
  assert(fs.existsSync(desktopShortcut), 'Desktop shortcut is missing');
  assert(fs.existsSync(startMenuShortcut), 'Start Menu shortcut is missing');

  fs.rmSync(desktopShortcut, { force: true });
  fs.rmSync(startMenuShortcut, { force: true });

  const app = startApp(installedExe, {
    CHEMVAULT_DESKTOP_DISABLE_AUTO_UPDATE: '1',
    CHEMVAULT_DESKTOP_FORCE_SHORTCUT_REPAIR: '1',
  });
  await wait(8000);
  assert(app.exitCode === null, 'Installed app exited during launch smoke test');
  assert(fs.existsSync(desktopShortcut), 'Desktop shortcut was not repaired on app launch');
  assert(fs.existsSync(startMenuShortcut), 'Start Menu shortcut was not repaired on app launch');
  await stopProcess(app);

  await withHttpServer(releaseDir, async (feedUrl) => {
    await runUpdateCheck(feedUrl, 'No update available');
  });

  const newerFeed = makeNewerFeed();
  try {
    await withHttpServer(newerFeed, async (feedUrl) => {
      await runUpdateCheck(feedUrl, 'Update available');
    });
  } finally {
    fs.rmSync(newerFeed, { recursive: true, force: true });
  }

  resetUpdaterLog();
  const failingApp = startApp(unpackedExe, {
    CHEMVAULT_DESKTOP_UPDATE_FEED_URL: 'http://127.0.0.1:9/',
  });
  await wait(8000);
  assert(failingApp.exitCode === null, 'App exited when update source failed');
  await stopProcess(failingApp);

  run(uninstaller, ['/S']);

  await waitForCondition(() => !fs.existsSync(installedExe), 15000, 'Installed app executable still exists after uninstall');
  await waitForCondition(() => !fs.existsSync(desktopShortcut), 15000, 'Desktop shortcut still exists after uninstall');
  await waitForCondition(() => !fs.existsSync(startMenuShortcut), 15000, 'Start Menu shortcut still exists after uninstall');

  console.log('Windows desktop smoke test passed');
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
