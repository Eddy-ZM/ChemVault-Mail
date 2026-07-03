# Environment Variables

Do not commit real keys, tokens, private keys, certificates or production `.env` files. Keep secrets in Xcode Cloud, Cloudflare, the mail gateway runtime or the backend service that owns them.

## Native Apple App

| Variable | Required | Purpose |
| --- | --- | --- |
| `APP_ENV` | Optional | Build/runtime environment name such as `development`, `staging` or `production`. |
| `API_BASE_URL` | Optional | Base URL for ChemVault Mail APIs if a future build script injects it. Current native fallback is `https://mail.chemvault.science/api`. |
| `REMOTE_CONFIG_URL` | Optional | Remote config endpoint override if added later. Current app uses the backend `/app/config` endpoint through `APIClient`. |
| `SENTRY_DSN` | Optional | Crash/error reporting DSN if Sentry is enabled later. |
| `FIREBASE_CONFIG` | Optional | Firebase client config if Firebase is added later. Do not store service account JSON. |

## Backend / Mail Gateway

| Variable | Required | Purpose |
| --- | --- | --- |
| `MAIL_DOMAIN` | Backend only | Mail domain for the gateway. |
| `MAILDIR_ROOT` | Backend only | Mail storage root path. |
| `IMAP_HOST` | Backend only | IMAP host exposed to clients. |
| `IMAP_PORT` | Backend only | IMAP port exposed to clients. Defaults to `993`. |
| `IMAP_SECURITY` | Backend only | IMAP security label shown to clients. Defaults to `SSL/TLS`. |
| `SMTP_HOST` | Backend only | SMTP host exposed to clients. |
| `SMTP_PORT` | Backend only | SMTP port exposed to clients. |
| `SMTP_SECURITY` | Backend only | SMTP security label shown to clients. Defaults to `STARTTLS`. |
| `MAIL_CLIENT_AUTH_METHOD` | Backend only | Optional authentication label shown to mail clients. Defaults to `Normal password`. |
| `IMAP_AUTH_METHOD` | Backend only | Optional IMAP-specific authentication label override. |
| `SMTP_AUTH_METHOD` | Backend only | Optional SMTP-specific authentication label override. |
| `MAIL_GATEWAY_URL` | Backend only | Internal URL for syncing App Password changes from the Worker to the mail gateway. |
| `RESEND_API_KEY` | Backend only | Resend API key. Never commit a real value. |
| `RESEND_WEBHOOK_SECRET` | Backend only | Webhook verification secret. Never commit a real value. |
| `INTERNAL_MAIL_GATEWAY_TOKEN` | Backend only | Internal mail gateway token. Never commit a real value. |
| `APP_PASSWORD_HASH_SECRET` | Backend only | Secret used for app-password hashing. Never commit a real value. |
| `CLOUDFLARE_API_TOKEN` | Backend/deploy only | Cloudflare deployment token. Never commit it. |

## Mail Web App

| Variable | Required | Purpose |
| --- | --- | --- |
| `VITE_USER_SYSTEM_URL` | Required for account management links | Base URL for ChemVault User System. Mail settings links users to `${VITE_USER_SYSTEM_URL}/settings/security` for password and account changes. |

## Windows Desktop App

These values are public build-time values for `mail-vue/.env.desktop`. They are bundled into the desktop app and must never contain secrets.

| Variable | Required | Purpose |
| --- | --- | --- |
| `VITE_BASE_URL` | Required | Public HTTPS ChemVault Mail API base URL used by the packaged desktop app. Default: `https://mail.chemvault.science/api`. |
| `VITE_USER_SYSTEM_URL` | Required | Public ChemVault User System URL for account-management links. |
| `VITE_STATIC_URL` | Required | Static asset base for the packaged Vite renderer. Desktop uses `./`. |
| `VITE_DESKTOP` | Required for desktop build | Enables desktop-specific hash routing for the packaged renderer. |
| `VITE_WINDOWS_DOWNLOAD_BASE_URL` | Optional | Public GitHub Release download base used by the `/download/windows` page. |
| `VITE_WINDOWS_DOWNLOAD_URL` | Optional | Full public installer URL override for the `/download/windows` page. |
| `VITE_WINDOWS_RELEASE_NOTES_URL` | Optional | Public release notes URL used by the `/download/windows` page. |

Runtime desktop update override:

| Variable | Required | Purpose |
| --- | --- | --- |
| `CHEMVAULT_DESKTOP_UPDATE_FEED_URL` | Optional for QA or self-hosted releases | Overrides the packaged GitHub updater feed with an electron-updater generic feed. The app accepts HTTPS URLs, plus `localhost` HTTP only for local QA. Do not put secrets in this URL. |
| `CHEMVAULT_DESKTOP_DISABLE_AUTO_UPDATE` | Optional for local QA | Set to `1` to skip startup update checks. |
| `CHEMVAULT_DESKTOP_FORCE_SHORTCUT_REPAIR` | Optional for local QA | Set to `1` to force Windows desktop and Start Menu shortcut repair during smoke tests. Do not use it as a normal production setting. |

## Windows Release / Signing Secrets

These values are for GitHub Actions or a local release shell only. Do not commit them to `.env` files.

| Variable | Required | Purpose |
| --- | --- | --- |
| `GH_TOKEN` | Required only for local `desktop:publish:win` | GitHub token with release upload permission. GitHub Actions uses the built-in `GITHUB_TOKEN`. |
| `WINDOWS_CODESIGN_CERTIFICATE` | Optional | GitHub Actions secret mapped to electron-builder `CSC_LINK` if a future EV/OV Windows code signing certificate is purchased. |
| `WINDOWS_CODESIGN_PASSWORD` | Optional | GitHub Actions secret mapped to electron-builder `CSC_KEY_PASSWORD`. |

The native Apple app should compile without environment variables. Xcode Cloud signing and TestFlight distribution should use Xcode Cloud's built-in Apple account integration.
