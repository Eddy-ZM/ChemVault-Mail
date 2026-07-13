# Automation

| Automation | Trigger/owner | Allowed calls | Guardrails/failure |
| --- | --- | --- | --- |
| Deployment/bootstrap | Push/manual release; Mail release owner | Cloudflare resource discovery, Worker deploy, secret writes, `/api/init` | Least GitHub permissions, Secrets-only sensitive values, immediate Wrangler exit capture, dedicated init credential, retained history |
| Delivery adapters | Validated send; Worker owns side effect | Configured email provider/binding only | Server permission/quota/content checks, provider result persistence, no client provider token |
| User/lifecycle sync | Signed User service request | Approved User and lifecycle endpoints only | Separate credentials, audience/owner scope, idempotency and audit state |

There is no autonomous LLM/tool-calling agent. AI analysis features, when enabled, may classify or summarize but cannot independently send, delete, grant roles, or bypass the Worker permission layer.
