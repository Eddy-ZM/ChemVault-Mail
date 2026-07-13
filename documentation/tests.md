# Verification Map

## Existing coverage

| Use case | Rule/negative case | Evidence | Status |
| --- | --- | --- | --- |
| Mail permissions | Own/all-mail/admin operations require explicit server grants; external Access defaults empty | Worker permission tests | CI required |
| Send safety | Size/recipient/attachment/minute/day/provider failures deny send | Worker send/provider tests | CI required |
| Rate-limit outage | Production missing/unavailable KV fails closed | Worker limit tests | CI required |
| Initialization | Dedicated init secret is required and differs from JWT | init/deployment tests | CI and deploy canary |
| Lifecycle | Owner mailbox delete/export is credentialed and repeat-safe | lifecycle tests | CI required |
| Clients | Vue builds; Worker suite runs with a Windows-safe 60-second hook timeout | CI workflow | CI required |

## Proposed tests

| Test | Type | Expected result |
| --- | --- | --- |
| Deployment failure fixture | Workflow unit/static | Nonzero Wrangler exit remains nonzero through output filtering |
| Delivered-message canary | Guarded live | Authorized test sender delivers once and records provider/result without leaking content |
| All-mail audit review | Manual release | Every active grant has owner, purpose, and expiry |

## Gaps

- Provider delivery, DNS reputation, and complaint routing require deployed canaries/provider-console evidence.
- Windows signing and Apple archive/TestFlight verification remain platform release gates.
- Deployment credentials and provider behavior still require guarded production canaries beyond the static workflow policy check.
## Commercial quota checks

The worker suite verifies canonical email-based entitlement lookup, service-secret forwarding, production fail-closed behavior, atomic plan-limit enforcement, and rollback of a failed-delivery reservation.
