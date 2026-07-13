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
| `BILLING_API_ORIGIN` | Subscription entitlement lookup | Server variable | Billing service migration | Mail cannot verify paid access |
| `BILLING_SERVICE_SECRET` | Mail → main → User Center identity chain | Shared Worker/Page secret only | 90 days/incident | Enforced sending fails closed; never expose to clients |
| `BILLING_ENFORCEMENT_MODE` | Commercial quota rollout | `shadow` during canary, then `enforce` | Release decision | `off` disables commercial limits; `shadow` records without blocking |
| `MAIL_BILLING_{PLAN}_DAILY_RECIPIENTS` | Daily plan quota overrides | Server variable | Pricing/policy change | Defaults: Free 25, Pro 250, Team 1,000, Enterprise 5,000 |

No sensitive value may fall back to `vars.*` or enter a client-public variable. Pre-go-live checks verify distinct credentials, role mappings, quota canary, provider sender authorization, Wrangler exit propagation, and retained deployment history.

The production config intentionally remains in `shadow` until the same `BILLING_SERVICE_SECRET` is installed on Mail, the main billing API, and User Center. After a successful identity lookup and over-quota canary, change the mode to `enforce`.
