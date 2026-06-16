# Cloudflare Access Role Permissions Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let Cloudflare Access external email users inherit read/write permissions from a role configured in the Role screen.

**Architecture:** Store a `cloudflare_access_external_role_id` setting. When an external Cloudflare Access email signs in, load that role's button permission keys and attach them to the synthetic external user; route permission checks then allow or reject reads and writes from the normal role tree. Remove the hard-coded external read-only mutation block.

**Tech Stack:** Cloudflare Workers, Hono, D1/Drizzle, Vue 3, Element Plus, Vitest.

---

### Task 1: Backend Permission Behavior

**Files:**
- Modify: `mail-worker/src/entity/setting.js`
- Modify: `mail-worker/src/init/init.js`
- Modify: `mail-worker/src/security/cloudflare-access.js`
- Modify: `mail-worker/src/security/security.js`
- Modify: `mail-worker/src/service/perm-service.js`
- Modify: `mail-worker/src/service/setting-service.js`
- Test: `mail-worker/test/cloudflare-access-auth.spec.js`
- Test: `mail-worker/test/perm-service-avatar.spec.js`

- [ ] Write failing tests proving external Access permissions can include write permission keys and no longer use a global non-GET block.
- [ ] Add a setting column for the external Access role id.
- [ ] Add a permission service helper that returns button permission keys for a role id.
- [ ] Resolve external Access users with the configured role's permission keys.
- [ ] Keep the legacy external permission setting as a fallback when no role is configured.
- [ ] Run focused worker tests and the worker test suite.

### Task 2: Role Screen Configuration

**Files:**
- Modify: `mail-vue/src/views/role/index.vue`
- Modify: `mail-vue/src/i18n/zh.js`
- Modify: `mail-vue/src/i18n/en.js`

- [ ] Add a Cloudflare Access role marker/action to the Role table.
- [ ] Save the selected role through the existing setting update API.
- [ ] Refresh settings and show the selected role after saving.
- [ ] Build the Vue app.

### Task 3: Rendered Validation And Publish

**Files:**
- Verify changed Role UI in a browser.
- Commit and push the Mail repo changes to GitHub.
