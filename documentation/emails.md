# Email Delivery

| Path | Trigger | Template/content inputs | Provider/retry | Failure evidence |
| --- | --- | --- | --- | --- |
| User-authored mail | Authorized send request | Validated sender, recipients, subject/body, approved attachments | Configured Cloudflare/provider binding; quota consumed before delivery | Persisted send result and provider error without secret/body logging |
| System/administrative mail | Explicit server event/operator action | Fixed template plus allowlisted variables | Same authorized delivery adapter; bounded retry policy | Worker logs and message state |

Recipients, attachment sizes/types, sender authority, and per-minute/per-day quotas are revalidated on the Worker. Templates must escape untrusted variables. Failed sends remain observable and are never reported delivered solely because a provider call started.
