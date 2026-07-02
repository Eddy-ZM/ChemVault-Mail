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

The native Apple app should compile without environment variables. Xcode Cloud signing and TestFlight distribution should use Xcode Cloud's built-in Apple account integration.
