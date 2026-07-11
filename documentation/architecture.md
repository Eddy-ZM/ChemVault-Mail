# Architecture

ChemVault Mail combines a Cloudflare Worker mail API, D1/KV state, provider delivery adapters, a Vue web/desktop client, and native Apple client. The Worker is authoritative for mailbox roles, message metadata, send policy, and administrative mail access.
