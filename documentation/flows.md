# Critical flows

1. User System or Mail authentication establishes a mailbox identity and role.
2. Send validation checks permission, recipients, message size, attachment policy, per-minute and per-day rate limits, provider availability, and persistence.
3. Production sending fails closed when the KV rate-limit binding is unavailable.
4. Lifecycle deletion removes mailbox data through a dedicated internal credential.
