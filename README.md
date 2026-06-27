# ChemVault Mail

## About

ChemVault Mail is a Cloudflare-powered email platform developed for the ChemVault ecosystem.

The system provides reliable custom-domain email services through a fully serverless architecture built on Cloudflare Workers and D1.

## Key Features

- Custom domain email hosting
- Webmail client
- Cloudflare Workers backend
- D1 database integration
- Contact management
- Global edge deployment
- Lightweight serverless infrastructure

## Tech Stack

| Component | Technology |
|-----------|------------|
| Frontend | Vue.js |
| Backend | Cloudflare Workers |
| Database | Cloudflare D1 |
| Hosting | Cloudflare Pages |

## Website

🌐 https://mail.chemvault.science

## ChemVault User Center Sync

When ChemVault Mail creates a user or mailbox, the Worker pushes that identity to the main ChemVault User Center immediately.

Synced paths:

- Admin creates a Mail user with `POST /api/user/add`
- A user self-registers with `POST /api/register`
- Admin/public batch import creates users with `POST /api/public/addUser`
- An existing Mail user adds another mailbox with `POST /api/account/add`

The Mail Worker calls:

```text
POST https://user.chemvault.science/api/integrations/mail/users/sync
```

Required Worker configuration:

```bash
npx wrangler secret put USER_SYSTEM_SYNC_SECRET --config mail-worker/wrangler.toml
```

The secret value must match the User Center `MAIL_SYSTEM_SYNC_SECRET` Pages secret. During migration, Mail Worker falls back to the existing `mail_sso_secret`, and User Center accepts `MAIL_SYSTEM_SSO_SECRET`, so production can sync before a dedicated sync secret is added. For local testing, set `chemvault_user_sync_url` to the local User Center Pages dev URL, for example:

```toml
[vars]
chemvault_user_sync_url = "http://localhost:8788/api/integrations/mail/users/sync"
```

Do not commit `USER_SYSTEM_SYNC_SECRET`, `MAIL_SYSTEM_SYNC_SECRET`, SSO secrets, or JWT secrets.

User Center also delegates Mail password verification to Mail Worker when a synced Mail user signs in through the User Center email/password form. The protected endpoint is:

```text
POST /api/internal/user-center/password-login
```

It is excluded from public auth middleware but requires the shared User Center/Mail secret in `x-chemvault-sso-secret`, `x-chemvault-sync-secret`, or a Bearer token. It returns only normalized identity and mailbox permission metadata after the Mail password is verified.

## App Update and Remote Resource Policy

ChemVault Mail's Apple native app does not download or execute remote code.
Remote updates are limited to configuration, text, images, announcements,
templates, links, feature flags, maintenance mode, and WebView content.

Native functionality changes still require a new App Store submission. Feature
flags only enable or disable functionality already included in the app bundle.
The app does not download dynamic libraries, executable code, scripts, remote
native code bundles, or alternative app packages. Version updates redirect users
to the official App Store page.

## Maintainer

Ziwen M.
University of Manchester  
Chemistry BSc

## Acknowledgements

This project is based on the excellent cloud-mail project by the MailLab team and has been adapted for ChemVault.

## License

ChemVault-specific code and content in this repository are source-available but
not open source. Public visibility is for review and reference only; no rights
are granted to use, copy, modify, distribute, host, deploy, or create derivative
works without prior written permission from Ziwen Mu or the repository owner.

See [LICENSE](./LICENSE). Upstream MailLab cloud-mail notices are preserved in
[THIRD_PARTY_NOTICES.md](./THIRD_PARTY_NOTICES.md).
