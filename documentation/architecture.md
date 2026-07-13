# Architecture

ChemVault Mail combines a Cloudflare Worker authority API, D1/KV state, optional R2, provider delivery bindings, a Vue web/Windows client, and a native Apple client. The Worker owns mailbox identity, roles, metadata, sending policy, administrative access, initialization, and account lifecycle.

## Trust boundaries

- ChemVault User/Mail authentication establishes identity; clients never grant their own Mail roles.
- Every send is revalidated server-side for role, recipients, size, attachment policy, quotas, provider availability, and persistence.
- JWT signing, first-time initialization, Mail/User synchronization, OAuth providers, and lifecycle deletion use separate credentials.
- Cloudflare Access identities default to no permissions until an approved external role is assigned.

## Known risks/assumptions

- Mail content is high sensitivity; all-mail query/delete and administrator bypasses require narrow audited grants.
- KV rate limiting must fail closed in production.
- Deployment success is valid only when Wrangler exits successfully and the initialization canary returns success; run history is retained.

There is no scheduled work owned by this repository. Delivery/initialization automation is documented in `automation.md`; outbound mail paths are documented in `emails.md`.

## Related documents

- [Flows](flows.md)
- [Permissions](permissions.md)
- [Variables](variables.md)
- [Tests](tests.md)
- [Email delivery](emails.md)
- [Automation](automation.md)
