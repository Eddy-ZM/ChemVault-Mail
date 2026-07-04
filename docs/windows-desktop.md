# ChemVault Mail Windows Desktop

ChemVault Mail Windows desktop uses Electron plus electron-builder. The app packages the existing Vue/Vite frontend as a local desktop renderer and talks to the public ChemVault Mail HTTPS API. It does not use Microsoft Store distribution or Microsoft Store review.

## Why Electron

- The existing desktop-ready surface is `mail-vue`, a Vue/Vite app.
- Electron reuses the current frontend build with the smallest code change.
- electron-builder produces a Windows NSIS installer with user-selectable Start Menu and Desktop shortcuts, uninstall support, `latest.yml`, and blockmap files.
- electron-updater can consume GitHub Releases directly.

Tauri was not chosen for this iteration because the repo does not already contain Rust/Tauri structure, and adding Rust/MSI/NSIS tooling would increase maintenance for no immediate benefit.

## Local Development

From the repo root:

```powershell
npm run desktop:dev
```

Equivalent from the frontend package:

```powershell
cd mail-vue
pnpm desktop:dev
```

This starts Vite in `desktop` mode and opens Electron with auto-update disabled for development.

If Electron runtime download is slow on Windows, the verified fallback is:

```powershell
cd mail-vue
$env:ELECTRON_MIRROR='https://npmmirror.com/mirrors/electron/'
$env:ELECTRON_BUILDER_BINARIES_MIRROR='https://npmmirror.com/mirrors/electron-builder-binaries/'
node node_modules\electron\install.js
```

## Build EXE Installer

From the repo root:

```powershell
npm run desktop:dist:win
```

Output:

- `mail-vue/release/windows/v0.1.5/ChemVault-Mail-Setup-0.1.5.exe`
- `mail-vue/release/windows/v0.1.5/ChemVault-Mail-Setup-0.1.5.exe.blockmap`
- `mail-vue/release/windows/v0.1.5/latest.yml`

The installer supports Windows 10 and Windows 11, includes an uninstaller, keeps `ChemVault Mail.exe` in the selected installation directory, and lets the user choose whether to add Start Menu and Desktop shortcuts. The installer shows detailed install output so users can review copied files, shortcuts, and registry entries. The app does not recreate Start Menu or Desktop shortcuts after a user removes or declines them.

`win-unpacked` remains at `mail-vue/release/windows/win-unpacked` for smoke testing and unpacked QA. Versioned installer artifacts are archived under `mail-vue/release/windows/vX.Y.Z`.

Run the local Windows installer/update smoke test after building:

```powershell
npm run desktop:test:win
```

The smoke test installs the generated NSIS package, checks the installation directory contains `ChemVault Mail.exe`, checks the app can launch, verifies the default Start Menu and Desktop shortcuts on a fresh silent install, verifies shortcuts are not force-recreated after removal, verifies same-version and newer-version `latest.yml` handling through a local update feed, verifies a failed update source does not close the app, and silently uninstalls the test install.

## Security Model

The Electron shell uses:

- `nodeIntegration: false`
- `contextIsolation: true`
- `sandbox: true`
- a preload bridge that exposes only updater methods
- a Content Security Policy for the packaged renderer
- external URL handling through the system browser
- denied permission requests by default
- a local startup splash screen with no remote code or third-party runtime dependency

Do not add backend secrets to `mail-vue`, Electron preload, GitHub releases, or installer resources. The desktop app must only call public APIs or authenticated user APIs.

Current web login stores the user JWT in `localStorage`; the desktop package preserves that existing behavior for compatibility. A future hardening pass should migrate the desktop token to protected storage such as Electron `safeStorage` plus a small authenticated session bridge, or a keytar-backed storage layer.

## Auto Update

The app checks for updates after launch when packaged. Development builds skip auto-update.

Update flow:

1. Read update metadata from `Chemaster-org/ChemVault-Mail` GitHub Releases.
2. Compare the installed app version with `latest.yml`.
3. Prompt the user when a newer version exists.
4. Download only after the user confirms.
5. Prompt again after download with "Restart and update".
6. Keep the current app usable if update check or download fails.

Updater logs are written to Electron's app log directory as `desktop-updater.log`.

For QA or self-hosted releases, `CHEMVAULT_DESKTOP_UPDATE_FEED_URL` can point at an electron-updater generic feed. Production feed overrides must be HTTPS. Local QA may use `http://localhost` or `http://127.0.0.1`.

## Code Signing

Current public Windows releases are unsigned because EV/OV code signing certificates are expensive. Windows can show "Unknown publisher", SmartScreen can warn, and enterprise security tools can block the installer.

Do not add registry edits, SmartScreen bypass instructions, or unsafe installer behavior to hide the warning.

The workflow still keeps optional signing inputs for a future certificate:

- `CSC_LINK`: path, URL, or base64 certificate payload for the `.pfx` / `.p12` certificate
- `CSC_KEY_PASSWORD`: certificate password

In GitHub Actions, configure these as repository secrets:

- `WINDOWS_CODESIGN_CERTIFICATE`
- `WINDOWS_CODESIGN_PASSWORD`

When a certificate becomes available, run this after building to verify both the installer and packaged app executable:

```powershell
npm run desktop:verify-signature:win
```

For unsigned releases this command returns `NotSigned`; that is expected and should be disclosed in release notes.

## Desktop Environment Values

`mail-vue/.env.desktop` contains public desktop build values only:

- `VITE_BASE_URL=https://mail.chemvault.science/api`
- `VITE_USER_SYSTEM_URL=https://user.chemvault.science`
- `VITE_STATIC_URL=./`
- `VITE_DESKTOP=true`
- GitHub Release download URLs for the Windows download page

No Cloudflare token, Resend key, JWT secret, OAuth secret, admin token, database key, or signing certificate belongs in this file.

## Turnstile Note

The login path does not require Turnstile in the current Vue flow. Registration can require Turnstile depending on server settings. Before publishing broadly, verify that any enabled Turnstile widget works from the packaged desktop environment, or route registration through a browser-hosted page that uses the approved production domain.
