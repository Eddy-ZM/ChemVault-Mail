# Account Avatar Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add per-address avatars with initial, site-logo, and custom upload/URL modes.

**Architecture:** Store avatar selection on the existing `account` row. Keep avatar validation and upload handling in a focused Worker service, expose it through `PUT /account/setAvatar`, and render avatars in the existing Vue account sidebar with a small display helper.

**Tech Stack:** Cloudflare Workers, Hono, D1, Drizzle ORM, KV/R2/S3 object helper, Vitest, Vue 3, Pinia, Element Plus.

---

## File Structure

- Modify: `mail-worker/vitest.config.js` so Worker tests use the existing `wrangler-test.toml`.
- Create: `mail-worker/test/account-avatar-service.spec.js` for avatar validation and custom image storage.
- Create: `mail-worker/test/account-service-avatar.spec.js` for account ownership behavior.
- Create: `mail-worker/src/service/account-avatar-service.js` for avatar mode validation and custom upload storage.
- Modify: `mail-worker/src/const/constant.js` to add `AVATAR_PREFIX`.
- Modify: `mail-worker/src/const/entity-const.js` to add account avatar mode constants.
- Modify: `mail-worker/src/entity/account.js` to add `avatarType` and `avatar`.
- Modify: `mail-worker/src/init/init.js` to add the migration.
- Modify: `mail-worker/src/service/account-service.js` to add `setAvatar`.
- Modify: `mail-worker/src/api/account-api.js` to add `PUT /account/setAvatar`.
- Modify: `mail-worker/src/i18n/zh.js` and `mail-worker/src/i18n/en.js` for validation messages.
- Create: `mail-vue/src/utils/account-avatar.js` for display resolution.
- Modify: `mail-vue/src/request/account.js` to add `accountSetAvatar`.
- Modify: `mail-vue/src/layout/account/index.vue` for avatar display and settings dialog.
- Modify: `mail-vue/src/i18n/zh.js` and `mail-vue/src/i18n/en.js` for UI labels.

---

### Task 1: Backend Avatar Helper

**Files:**
- Create: `mail-worker/test/account-avatar-service.spec.js`
- Create: `mail-worker/src/service/account-avatar-service.js`
- Modify: `mail-worker/src/const/constant.js`
- Modify: `mail-worker/src/const/entity-const.js`
- Modify: `mail-worker/src/i18n/zh.js`
- Modify: `mail-worker/src/i18n/en.js`
- Modify: `mail-worker/vitest.config.js`

- [ ] **Step 1: Fix the test harness config**

Change `mail-worker/vitest.config.js` so `configPath` is `./wrangler-test.toml`.

- [ ] **Step 2: Write failing avatar helper tests**

Add tests that import `account-avatar-service.js`, mock `r2-service.js`, and verify:

```js
await service.normalize(c, { avatarType: 'initial', avatar: 'x' })
// returns { avatarType: 'initial', avatar: '' }

await service.normalize(c, { avatarType: 'logo', avatar: 'x' })
// returns { avatarType: 'logo', avatar: '' }

await service.normalize(c, { avatarType: 'custom', avatar: 'https://example.com/a.png' })
// returns { avatarType: 'custom', avatar: 'https://example.com/a.png' }

await service.normalize(c, { avatarType: 'custom', avatar: 'data:image/png;base64,...' })
// stores the object and returns a static/avatar/*.png key
```

- [ ] **Step 3: Run RED**

Run: `pnpm --prefix mail-worker exec vitest run test/account-avatar-service.spec.js --pool forks`

Expected: FAIL because `mail-worker/src/service/account-avatar-service.js` does not exist.

- [ ] **Step 4: Implement the avatar helper**

Create `account-avatar-service.js` with:

```js
async function normalize(c, params) {
  const avatarType = params.avatarType || accountConst.avatarType.INITIAL;
  if (!validAvatarType.has(avatarType)) throw new BizError(t('invalidAvatarType'));
  if (avatarType !== accountConst.avatarType.CUSTOM) return { avatarType, avatar: '' };
  const avatar = (params.avatar || '').trim();
  if (!avatar) throw new BizError(t('emptyAvatar'));
  if (/^https?:\/\//i.test(avatar)) return { avatarType, avatar };
  if (!/^data:image\/[a-zA-Z0-9.+-]+;base64,/.test(avatar)) throw new BizError(t('invalidAvatar'));
  const file = fileUtils.base64ToFile(avatar, 'avatar');
  const arrayBuffer = await file.arrayBuffer();
  const key = constant.AVATAR_PREFIX + await fileUtils.getBuffHash(arrayBuffer) + fileUtils.getExtFileName(file.name);
  await r2Service.putObj(c, key, arrayBuffer, {
    contentType: file.type,
    cacheControl: 'public, max-age=31536000, immutable',
    contentDisposition: `inline; filename="${file.name}"`
  });
  return { avatarType, avatar: key };
}
```

- [ ] **Step 5: Run GREEN**

Run: `pnpm --prefix mail-worker exec vitest run test/account-avatar-service.spec.js --pool forks`

Expected: PASS.

---

### Task 2: Backend Account API

**Files:**
- Create: `mail-worker/test/account-service-avatar.spec.js`
- Modify: `mail-worker/src/entity/account.js`
- Modify: `mail-worker/src/init/init.js`
- Modify: `mail-worker/src/service/account-service.js`
- Modify: `mail-worker/src/api/account-api.js`

- [ ] **Step 1: Write failing account service tests**

Add tests that mock `entity/orm.js` and `account-avatar-service.js`, then verify:

```js
await service.setAvatar(c, { accountId: 1, avatarType: 'logo' }, 7)
// calls normalize, updates the account row, and returns { avatarType: 'logo', avatar: '' }

await service.setAvatar(c, { accountId: 1, avatarType: 'logo' }, 7)
// rejects when selectById returns a row owned by a different user
```

- [ ] **Step 2: Run RED**

Run: `pnpm --prefix mail-worker exec vitest run test/account-service-avatar.spec.js --pool forks`

Expected: FAIL because `accountService.setAvatar` does not exist.

- [ ] **Step 3: Add schema, migration, service, and route**

Add `avatarType` and `avatar` to the Drizzle account entity. Add a `v3_2DB` migration that adds `avatar_type` and `avatar` columns and call it from `init()`. Add `setAvatar()` to `account-service.js`, and add `PUT /account/setAvatar` to `account-api.js`.

- [ ] **Step 4: Run GREEN**

Run: `pnpm --prefix mail-worker exec vitest run test/account-avatar-service.spec.js test/account-service-avatar.spec.js --pool forks`

Expected: PASS.

---

### Task 3: Frontend Avatar Utilities

**Files:**
- Create: `mail-vue/src/utils/account-avatar.js`
- Modify: `mail-vue/src/request/account.js`
- Modify: `mail-vue/src/i18n/zh.js`
- Modify: `mail-vue/src/i18n/en.js`

- [ ] **Step 1: Add display helper**

Create helper functions:

```js
export function resolveAccountAvatar(account) {
  if ((account?.avatarType || 'initial') === 'logo') return { type: 'image', src: '/mail.png' };
  if (account?.avatarType === 'custom' && account.avatar) return { type: 'image', src: cvtR2Url(account.avatar) };
  return { type: 'initial', text: getAccountInitial(account) };
}
```

- [ ] **Step 2: Add request wrapper and translations**

Add `accountSetAvatar(accountId, avatarType, avatar)` using `http.put('/account/setAvatar', ...)`. Add UI labels for set avatar, initial avatar, system logo, custom avatar, choose image, and empty custom avatar.

---

### Task 4: Account Sidebar UI

**Files:**
- Modify: `mail-vue/src/layout/account/index.vue`

- [ ] **Step 1: Add avatar previews to account cards**

Render a fixed 36px avatar to the left of the email address. Use `resolveAccountAvatar(item)` and fall back to the initial mode for accounts without avatar fields.

- [ ] **Step 2: Add settings menu item**

Add a dropdown item that calls `openSetAvatar(item)`.

- [ ] **Step 3: Add avatar dialog**

Add an Element Plus dialog with:

```vue
<el-radio-group v-model="avatarForm.avatarType">
  <el-radio-button label="initial">{{ $t('avatarInitial') }}</el-radio-button>
  <el-radio-button label="logo">{{ $t('avatarLogo') }}</el-radio-button>
  <el-radio-button label="custom">{{ $t('avatarCustom') }}</el-radio-button>
</el-radio-group>
```

For custom mode, include local upload and image URL controls.

- [ ] **Step 4: Wire save behavior**

On save, validate custom avatar input, convert local upload with `fileToBase64(file, true)`, call `accountSetAvatar`, update the selected account object, and update `accountStore.currentAccount` if it is the same account.

---

### Task 5: Verification

**Files:**
- All changed files.

- [ ] **Step 1: Run backend focused tests**

Run: `pnpm --prefix mail-worker exec vitest run test/account-avatar-service.spec.js test/account-service-avatar.spec.js --pool forks`

Expected: PASS.

- [ ] **Step 2: Run frontend build**

Run: `pnpm --prefix mail-vue run build`

Expected: PASS.

- [ ] **Step 3: Inspect final diff**

Run: `git diff --stat` and `git diff --check`.

Expected: no whitespace errors; diff only touches avatar-related files, test config, and plan docs.
