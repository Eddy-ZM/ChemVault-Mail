# Outlook / Mail Client Support

This is a code and configuration template for adding Outlook-compatible IMAP + SMTP access to ChemVault Mail. It does not deploy servers, modify DNS, or include secrets.

## Architecture

Inbound:

```text
Resend inbound webhook -> mail-gateway -> Maildir -> Dovecot IMAP -> Outlook
```

Outbound:

```text
Outlook SMTP submission -> mail-gateway -> Resend API -> recipient
                                    \-> Maildir .Sent copy
```

ChemVault Mail on Cloudflare remains the user-facing web app and database owner. The new `services/mail-gateway` service is intended for a future Singapore VPS because Cloudflare Workers cannot run IMAP or SMTP TCP servers.

## Outlook Manual Configuration

Use the full mailbox address as the username and use an App Password generated from ChemVault Mail settings. Do not use the main account password.

Incoming mail:

| Field | Value |
| --- | --- |
| Protocol | IMAP |
| Server | `imap.chemvault.science` |
| Port | `993` |
| Security | SSL/TLS |
| Username | Full email address, for example `user@chemvault.science` |
| Password | App Password |

Outgoing mail:

| Field | Value |
| --- | --- |
| Protocol | SMTP |
| Server | `smtp.chemvault.science` |
| Port | `587` |
| Security | STARTTLS |
| Username | Full email address, for example `user@chemvault.science` |
| Password | App Password |

## Local Development

Install dependencies:

```bash
pnpm --prefix mail-worker install
pnpm --prefix mail-vue install
pnpm --prefix services/mail-gateway install
```

Start the Cloudflare Worker main app:

```bash
pnpm --prefix mail-worker dev
```

Start the Vue app:

```bash
pnpm --prefix mail-vue dev
```

Start mail-gateway locally:

```bash
cd services/mail-gateway
cp ../../.env.example .env
MAIL_DOMAIN=chemvault.science \
MAILDIR_ROOT="$PWD/data/vmail" \
MAIL_GATEWAY_AUTH_STORE="$PWD/data/auth-store.json" \
DOVECOT_USERS_FILE="$PWD/data/dovecot-users" \
INTERNAL_MAIL_GATEWAY_TOKEN="local-dev-token" \
RESEND_API_KEY="replace-in-local-env-only" \
MAIN_APP_INTERNAL_URL="http://localhost:8787" \
pnpm dev
```

For local Worker to gateway sync, set Worker vars in your local dev environment:

```bash
MAIL_GATEWAY_URL=http://localhost:8789
INTERNAL_MAIL_GATEWAY_TOKEN=local-dev-token
APP_PASSWORD_HASH_SECRET=local-only-random-string
```

Use a local Maildir root:

```bash
find services/mail-gateway/data/vmail -maxdepth 5 -type d
```

Test SMTP STARTTLS after configuring `SMTP_TLS_KEY_PATH` and `SMTP_TLS_CERT_PATH`:

```bash
openssl s_client -starttls smtp -connect localhost:2525
```

Test SMTP AUTH with `swaks`:

```bash
swaks \
  --server localhost \
  --port 2525 \
  --auth LOGIN \
  --auth-user user@chemvault.science \
  --auth-password xxxx-xxxx-xxxx-xxxx \
  --from user@chemvault.science \
  --to recipient@example.com \
  --tls
```

Manual client testing:

1. Generate an App Password from ChemVault Mail settings.
2. Add the account manually in Thunderbird or Outlook.
3. Use IMAP `localhost:993` only if you have Dovecot running locally.
4. Use SMTP `localhost:2525` for local gateway testing.

## Tests

Worker App Password tests:

```bash
pnpm --prefix mail-worker exec vitest run test/app-password-service.spec.js --pool=forks
```

mail-gateway tests:

```bash
pnpm --prefix services/mail-gateway test
```

Vue build:

```bash
pnpm --prefix mail-vue build
```

## Production Deployment TODO

These are manual future steps, not performed by this repo change:

1. Buy a Singapore VPS.
2. Install Ubuntu 24.04.
3. Create a `vmail` user and group, typically uid/gid `5000`.
4. Install Dovecot.
5. Install Node.js or another supported runtime for `services/mail-gateway`.
6. Configure systemd for mail-gateway.
7. Configure Let's Encrypt certificates for `imap.chemvault.science` and `smtp.chemvault.science`.
8. Copy `deploy/dovecot` templates into `/etc/dovecot` and adjust paths as needed.
9. Set `MAILDIR_ROOT=/var/vmail` and `DOVECOT_USERS_FILE=/etc/dovecot/users`.
10. Add Cloudflare DNS records:
    - `A imap -> VPS IP`, DNS only.
    - `A smtp -> VPS IP`, DNS only.
11. Keep MX records pointing to Resend.
12. Keep SPF, DKIM, and DMARC aligned with Resend.
13. Open only required ports: `22`, `80`, `443`, `993`, `587`.
14. Do not allow open relay.

## Security Notes

- App Passwords are only shown once in the web UI.
- ChemVault stores App Password hashes, not plaintext.
- mail-gateway stores bcrypt hashes, not plaintext.
- Revoked App Passwords are rejected by gateway after sync.
- SMTP AUTH requires App Password scope `smtp`.
- Dovecot IMAP uses App Password scope `imap` through generated passwd-file rows.
- SMTP From must equal the authenticated mailbox.
- SMTP is not an open relay.
- Resend API keys and App Passwords must never be logged or sent to the frontend.
- Webhook handlers must validate `RESEND_WEBHOOK_SECRET` or a signature before accepting inbound mail.
- Logs should include metadata only, never full mail bodies or attachments.
