# Account Avatar Permissions Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Split account avatar updates into self-service and admin-managed permissions.

**Architecture:** Keep owner-scoped updates on `/account/setAvatar` behind `account:set-avatar`. Add an admin-scoped `/user/setAccountAvatar` endpoint behind `user:set-account-avatar`, reusing the existing avatar normalization service. Surface both permissions through the role tree and show UI actions only when the current user has the matching permission.

**Tech Stack:** Cloudflare Workers, Hono, D1/Drizzle, Vitest, Vue 3, Element Plus.

---

## File Structure

- Modify: `mail-worker/src/security/security.js` to map the two new permission keys to routes and export `permKeyToPaths` for focused tests.
- Modify: `mail-worker/src/init/init.js` to add the permission rows.
- Modify: `mail-worker/src/service/account-service.js` to add admin-scoped avatar update.
- Modify: `mail-worker/src/api/user-api.js` to add `PUT /user/setAccountAvatar`.
- Modify: `mail-worker/src/i18n/zh.js` and `mail-worker/src/i18n/en.js` to translate permission labels.
- Modify: `mail-worker/test/account-service-avatar.spec.js` to test admin-scoped update.
- Create: `mail-worker/test/security-permissions.spec.js` to test permission route mapping.
- Modify: `mail-vue/src/request/user.js` to add `userSetAccountAvatar`.
- Modify: `mail-vue/src/layout/account/index.vue` to hide self-service avatar action without `account:set-avatar`.
- Modify: `mail-vue/src/views/user/index.vue` to add admin-managed avatar action and dialog.
- Modify: `mail-vue/src/i18n/zh.js` and `mail-vue/src/i18n/en.js` if extra admin UI copy is needed.

---

### Task 1: Backend Permission Mapping

**Files:**
- Create: `mail-worker/test/security-permissions.spec.js`
- Modify: `mail-worker/src/security/security.js`
- Modify: `mail-worker/src/init/init.js`
- Modify: `mail-worker/src/i18n/zh.js`
- Modify: `mail-worker/src/i18n/en.js`

- [ ] **Step 1: Write failing mapping tests**

Add tests:

```js
import { describe, expect, it } from 'vitest';
import { permKeyToPaths } from '../src/security/security.js';

describe('avatar permission route mapping', () => {
  it('maps self-service avatar updates to account:set-avatar', () => {
    expect(permKeyToPaths(['account:set-avatar'])).toContain('/account/setAvatar');
  });

  it('maps managed avatar updates to user:set-account-avatar', () => {
    expect(permKeyToPaths(['user:set-account-avatar'])).toContain('/user/setAccountAvatar');
  });
});
```

- [ ] **Step 2: Run RED**

Run: `./node_modules/.bin/vitest run test/security-permissions.spec.js --pool forks` from `mail-worker`.

Expected: FAIL because `permKeyToPaths` is not exported and the new mappings do not exist.

- [ ] **Step 3: Implement mapping and migration**

Update `requirePerms`, `premKey`, and export `permKeyToPaths`. Add a DB init migration inserting:

```sql
INSERT INTO perm (name, perm_key, pid, type, sort)
SELECT '邮箱头像修改', 'account:set-avatar', 21, 2, 3
WHERE NOT EXISTS (SELECT 1 FROM perm WHERE perm_key = 'account:set-avatar');

INSERT INTO perm (name, perm_key, pid, type, sort)
SELECT '用户邮箱头像修改', 'user:set-account-avatar', 6, 2, 8
WHERE NOT EXISTS (SELECT 1 FROM perm WHERE perm_key = 'user:set-account-avatar');
```

Add both permission labels to Worker zh/en i18n `perms`.

- [ ] **Step 4: Run GREEN**

Run: `./node_modules/.bin/vitest run test/security-permissions.spec.js --pool forks` from `mail-worker`.

Expected: PASS.

---

### Task 2: Backend Admin Avatar Update

**Files:**
- Modify: `mail-worker/test/account-service-avatar.spec.js`
- Modify: `mail-worker/src/service/account-service.js`
- Modify: `mail-worker/src/api/user-api.js`

- [ ] **Step 1: Write failing admin update tests**

Extend account service avatar tests:

```js
it('allows admin-scoped avatar updates for another user account', async () => {
  const service = {
    ...accountService,
    selectById: vi.fn().mockResolvedValue({ accountId: 1, userId: 8 })
  };

  const result = await service.setManagedAvatar(c, { accountId: 1, avatarType: 'logo' });

  expect(normalize).toHaveBeenCalledWith(c, { accountId: 1, avatarType: 'logo' });
  expect(set).toHaveBeenCalledWith({ avatarType: 'logo', avatar: '' });
  expect(result).toEqual({ avatarType: 'logo', avatar: '' });
});

it('rejects admin-scoped avatar updates for missing accounts', async () => {
  const service = {
    ...accountService,
    selectById: vi.fn().mockResolvedValue(null)
  };

  await expect(service.setManagedAvatar(c, { accountId: 999, avatarType: 'logo' }))
    .rejects.toMatchObject({ name: 'BizError' });
});
```

- [ ] **Step 2: Run RED**

Run: `./node_modules/.bin/vitest run test/account-service-avatar.spec.js --pool forks` from `mail-worker`.

Expected: FAIL because `setManagedAvatar` does not exist.

- [ ] **Step 3: Implement service and API**

Add `accountService.setManagedAvatar(c, params)` that checks `selectById`, reuses `accountAvatarService.normalize`, updates by `accountId`, and returns avatar data. Add `PUT /user/setAccountAvatar` in `user-api.js`.

- [ ] **Step 4: Run GREEN**

Run: `./node_modules/.bin/vitest run test/account-service-avatar.spec.js test/security-permissions.spec.js --pool forks` from `mail-worker`.

Expected: PASS.

---

### Task 3: Frontend Self-Service Permission

**Files:**
- Modify: `mail-vue/src/layout/account/index.vue`

- [ ] **Step 1: Hide self-service avatar action by permission**

Change the account settings dropdown so the `setAvatar` menu item is visible only when `hasPerm('account:set-avatar')`.

- [ ] **Step 2: Preserve other settings behavior**

Update `showNullSetting(item)` so the settings icon is disabled only when none of avatar, rename, pin, or delete actions are available.

---

### Task 4: Frontend Managed Avatar UI

**Files:**
- Modify: `mail-vue/src/request/user.js`
- Modify: `mail-vue/src/views/user/index.vue`

- [ ] **Step 1: Add request wrapper**

Add:

```js
export function userSetAccountAvatar(accountId, avatarType, avatar) {
  return http.put('/user/setAccountAvatar', {accountId, avatarType, avatar})
}
```

- [ ] **Step 2: Add avatar action to user account dialog**

In the user account dialog action dropdown, show `设置头像` when `hasPerm('user:set-account-avatar')` is true. Reuse the same avatar modes, upload handling, URL validation, and preview behavior as the account sidebar.

- [ ] **Step 3: Update account rows after save**

After successful admin-managed save, update the row in `accountList` with returned `avatarType` and `avatar`.

---

### Task 5: Verification

**Files:**
- All changed files.

- [ ] **Step 1: Run backend focused tests**

Run: `./node_modules/.bin/vitest run test/account-avatar-service.spec.js test/account-service-avatar.spec.js test/security-permissions.spec.js --pool forks` from `mail-worker`.

Expected: PASS.

- [ ] **Step 2: Run frontend build**

Run: `./node_modules/.bin/vite build --mode release` from `mail-vue`.

Expected: PASS.

- [ ] **Step 3: Run diff checks**

Run: `git diff --check` from repo root.

Expected: no output.
