# Critical Flows

| Flow | Actor/precondition | Protected steps/side effects | Deny/failure behavior |
| --- | --- | --- | --- |
| Sign-in/mailbox onboarding | Active User or Mail credential | Verify identity, bind/apply mailbox, load server roles, issue/reuse revocable session | Inactive/unbound/invalid identity denied; clients cannot self-assign roles |
| Send mail | Authorized mailbox | Validate sender/recipient/content/attachments, consume minute/day quota, persist state, call provider/binding, record result | Permission/quota/provider/binding failure prevents send; missing KV fails closed in production |
| Read/delete own mail | Mailbox owner | Resolve mailbox identity and message ownership before content mutation | Other mailbox denied even when IDs are known |
| All-mail administration | Explicit privileged role | Verify `all-email:query` or `all-email:delete`, perform audited operation | Admin UI presence is not authority; default external Access role has none |
| First deployment/init | Release workflow with dedicated init secret | Deploy Worker, store secrets, call `/api/init`, verify exact success | Wrangler or canary failure fails the job; JWT secret cannot initialize DB |
| Lifecycle delete/export | User Center service | Dedicated credential processes mailbox data idempotently | Missing authority denied; partial failure stays retryable |
