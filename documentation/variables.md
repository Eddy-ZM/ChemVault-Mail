# Runtime variables

JWT signing, initialization, User synchronization, lifecycle deletion, and Mail SSO use distinct secrets. `MAIL_RATE_LIMIT_FAIL_CLOSED=true` is required in production. Provider tokens, sender bindings, D1, KV, and optional R2 are deployment-managed bindings.
