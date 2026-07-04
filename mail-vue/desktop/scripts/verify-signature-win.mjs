import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, '../..');
const packageJson = JSON.parse(fs.readFileSync(path.join(projectRoot, 'package.json'), 'utf8'));
const appVersion = packageJson.version;
const releaseRoot = path.join(projectRoot, 'release', 'windows');
const releaseDir = path.join(releaseRoot, `v${appVersion}`);

const filesToVerify = [
  path.join(releaseDir, `ChemVault-Mail-Setup-${appVersion}.exe`),
  path.join(releaseRoot, 'win-unpacked', 'ChemVault Mail.exe'),
];

function fail(message) {
  console.error(message);
  process.exit(1);
}

if (process.platform !== 'win32') {
  fail('Windows Authenticode signature verification must run on Windows.');
}

for (const file of filesToVerify) {
  if (!fs.existsSync(file)) {
    fail(`Missing release file: ${file}`);
  }
}

const escapedFiles = filesToVerify.map((file) => `'${file.replaceAll("'", "''")}'`).join(',');
const command = `
  $ErrorActionPreference = 'Stop'
  $files = @(${escapedFiles})
  $files | ForEach-Object {
    $signature = Get-AuthenticodeSignature -LiteralPath $_
    [pscustomobject]@{
      Path = $_
      Status = [string]$signature.Status
      Subject = if ($signature.SignerCertificate) { $signature.SignerCertificate.Subject } else { '' }
      Issuer = if ($signature.SignerCertificate) { $signature.SignerCertificate.Issuer } else { '' }
      Thumbprint = if ($signature.SignerCertificate) { $signature.SignerCertificate.Thumbprint } else { '' }
      StatusMessage = $signature.StatusMessage
    }
  } | ConvertTo-Json -Depth 4
`;

const result = spawnSync('powershell', ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-Command', command], {
  encoding: 'utf8',
  windowsHide: true,
});

if (result.status !== 0) {
  process.stderr.write(result.stderr);
  process.stdout.write(result.stdout);
  fail(`Get-AuthenticodeSignature failed with exit code ${result.status}`);
}

const raw = result.stdout.trim();
if (!raw) {
  fail('Get-AuthenticodeSignature returned no output.');
}

const signatures = JSON.parse(raw);
const signatureList = Array.isArray(signatures) ? signatures : [signatures];

let failed = false;
for (const signature of signatureList) {
  console.log(`${signature.Status}: ${signature.Path}`);
  if (signature.Subject) {
    console.log(`  Subject: ${signature.Subject}`);
  }
  if (signature.Issuer) {
    console.log(`  Issuer: ${signature.Issuer}`);
  }
  if (signature.Status !== 'Valid') {
    console.error(`  ${signature.StatusMessage}`);
    failed = true;
  }
}

if (failed) {
  fail('Windows release is not Authenticode signed by a trusted code signing certificate.');
}

console.log('Windows Authenticode signatures are valid.');
