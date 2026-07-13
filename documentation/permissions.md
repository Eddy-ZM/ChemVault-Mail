# Permissions

| Operation | Mailbox user | External Access identity | Mail role/admin | Configured admin mailbox | Lifecycle service |
| --- | --- | --- | --- | --- | --- |
| Read/send/delete own mail | Allow by server role/ownership | Deny by default | Allow when role grants | Allow own plus explicit bypass | Export/delete only |
| Query all mail | Deny | Deny until approved role | `all-email:query` required | Narrow configured bypass | Deny |
| Delete all mail | Deny | Deny until approved role | `all-email:delete` required | Narrow configured bypass | Owner lifecycle only |
| Manage roles/settings | Deny | Deny | Explicit admin capability | Configured admin | Deny |
| Initialize database | Deny | Deny | Deny | Deny | `INIT_SECRET` deployment path only |
| Account lifecycle | Through User Center | Deny | Audited support only | Audited support only | Dedicated lifecycle credential |

D1/KV do not replace application authorization. Worker checks are authoritative; Vue, Windows, and Apple visibility controls are convenience only.
