# Runtime Variables

| Name/binding | Used by | Scope/source | Rotation | Failure/risk |
| --- | --- | --- | --- | --- |
| `JWT_SECRET` | Mail sessions | GitHub/Worker secret only | 90 days/incident | Auth fails; cannot be reused for initialization |
| `INIT_SECRET` | One-time schema/init canary | GitHub/Worker secret only | After bootstrap and incident | Init denied; must differ from JWT |
| User sync/SSO secrets | Mail ↔ User identity | Shared server secrets | 90 days/incident | Binding/sync unavailable |
| `LIFECYCLE_SERVICE_SECRET` | Distributed delete/export | Shared server secret | 90 days/incident | Lifecycle denied |
| OAuth client secrets | Optional external login | GitHub/Worker secrets only | Provider policy/incident | Provider login unavailable |
| Cloudflare API token | Deployment | GitHub secret only | 90 days/incident | Deployment fails; never allow Repository Variable fallback |
| D1/KV/R2 IDs/bindings | Mail state, quota, attachments | Deployment variables/bindings | Resource migration | Sending/state unavailable |
| Provider/send-email bindings | Delivery | Worker binding/secret | Provider policy | Sending fails closed |
| `MAIL_RATE_LIMIT_FAIL_CLOSED` | Production quota policy | Server variable, required `true` | Policy change | False permits unbounded behavior during KV outage |

No sensitive value may fall back to `vars.*` or enter a client-public variable. Pre-go-live checks verify distinct credentials, role mappings, quota canary, provider sender authorization, Wrangler exit propagation, and retained deployment history.
