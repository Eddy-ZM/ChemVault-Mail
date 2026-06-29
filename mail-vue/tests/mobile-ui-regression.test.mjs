import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { isBlankEditorContent } from '../src/utils/editor-content.js';
import {
  chemVaultProductFromReturnTo,
  chemVaultSsoSourceFromSearch
} from '../src/utils/chemvault-sso.js';

const root = new URL('../', import.meta.url);

function file(path) {
  return readFile(new URL(path, root), 'utf8');
}

const [contentView, shadowHtml, writeLayout, tinyEditor, loginView, routerSource, ssoUtil] = await Promise.all([
  file('src/views/content/index.vue'),
  file('src/components/shadow-html/index.vue'),
  file('src/layout/write/index.vue'),
  file('src/components/tiny-editor/index.vue'),
  file('src/views/login/index.vue'),
  file('src/router/index.js'),
  file('src/utils/chemvault-sso.js')
]);

assert.equal(
  isBlankEditorContent('<div><br data-mce-bogus="1"></div>'),
  true,
  'TinyMCE empty placeholder HTML should not force the compose window into draft confirmation'
);

assert.equal(
  isBlankEditorContent('<p>&nbsp;</p>'),
  true,
  'non-breaking-space only editor HTML should be treated as blank'
);

assert.equal(
  isBlankEditorContent('<div>Hello</div>'),
  false,
  'real editor text should still count as compose content'
);

assert.equal(
  chemVaultProductFromReturnTo('https://file.chemvault.science/?project=spectra')?.key,
  'files',
  'Files production URLs should resolve to the Files SSO source'
);

assert.equal(
  chemVaultProductFromReturnTo('https://501bcba2.chemvault-files.pages.dev/')?.key,
  'files',
  'Files preview URLs should resolve to the Files SSO source'
);

assert.equal(
  chemVaultSsoSourceFromSearch('?sso=chemvault-user&return_to=https%3A%2F%2Ffile.chemvault.science%2F')?.visual,
  'files',
  'Mail login should detect Files as the original site during ChemVault SSO'
);

assert.equal(
  chemVaultSsoSourceFromSearch('?return_to=https%3A%2F%2Ffile.chemvault.science%2F'),
  null,
  'plain return_to URLs should not theme normal Mail login without SSO context'
);

assert.match(
  contentView,
  /\.content\s*\{[\s\S]*min-height:\s*0;/,
  'mail content column should allow the body pane to claim real height on mobile'
);

assert.match(
  contentView,
  /\.htm-scrollbar\s*\{[\s\S]*height:\s*clamp\(360px,\s*calc\(100dvh - 260px\),\s*680px\);/,
  'email body viewport should keep a readable mobile height instead of collapsing'
);

assert.match(
  shadowHtml,
  /const MIN_READABLE_SCALE = 0\.86;/,
  'shadow html should clamp auto-scale to a readable minimum'
);

assert.match(
  shadowHtml,
  /content-box-scroll-x/,
  'shadow html should switch to horizontal scrolling for very wide messages'
);

assert.match(
  shadowHtml,
  /window\.addEventListener\('resize', scheduleAutoScale\)/,
  'shadow html should recalculate readable scale after viewport changes'
);

assert.match(
  writeLayout,
  /grid-template-rows:\s*auto auto minmax\(280px, 1fr\) auto;/,
  'compose layout should reserve a real row for the editor on compact screens'
);

assert.match(
  writeLayout,
  /height:\s*100dvh;/,
  'compose modal should use dynamic viewport height in the mobile app'
);

assert.match(
  writeLayout,
  /import\s+\{isBlankEditorContent\}\s+from\s+["']@\/utils\/editor-content\.js["'];/,
  'compose close should use normalized editor content emptiness checks'
);

assert.match(
  writeLayout,
  /isBlankEditorContent\(form\.content\)/,
  'compose close should not treat TinyMCE empty placeholder markup as draft content'
);

assert.match(
  tinyEditor,
  /const mobileToolbarMode = 'wrap';/,
  'TinyMCE should expose all formatting controls on mobile instead of hiding overflow'
);

assert.match(
  tinyEditor,
  /mobile:\s*\{[\s\S]*toolbar:\s*editorToolbar,[\s\S]*toolbar_mode:\s*mobileToolbarMode/,
  'TinyMCE mobile config should explicitly keep the formatting toolbar enabled'
);

assert.match(
  tinyEditor,
  /return editor\.value\?\.getContent\(\) \|\| '';/,
  'TinyMCE getContent should be safe while the editor script is still initializing'
);

assert.match(
  loginView,
  /const authenticating = computed\(\(\) => loginLoading\.value \|\| oauthLoading\.value \|\| bindLoading\.value\);/,
  'login page should drive one authentication animation state'
);

assert.match(
  loginView,
  /class="auth-overlay"/,
  'login page should render a custom authentication overlay'
);

assert.match(
  loginView,
  /const canRegister = computed\(\(\) => Number\(settingStore\.settings\.register\) === 0\);/,
  'login page should normalize the website register setting before showing registration UI'
);

assert.match(
  loginView,
  /v-show="canRegister && show !== 'login'"/,
  'registration form should be hidden when website registration is closed'
);

assert.match(
  loginView,
  /<template v-if="canRegister">/,
  'registration switch should be hidden when website registration is closed'
);

assert.match(
  loginView,
  /watch\(canRegister,\s*\(enabled\) => \{[\s\S]*show\.value = 'login'/,
  'login page should leave registration mode when website registration is closed'
);

assert.match(
  loginView,
  /<span class="form-title">ChemVault<\/span>/,
  'login title should display ChemVault instead of the configured site title'
);

assert.match(
  loginView,
  /\.form-title\s*\{[\s\S]*text-align:\s*center;/,
  'login title should be centered in the form'
);

assert.match(
  loginView,
  /class="logo-wallpaper"/,
  'default login background should keep the logo wallpaper'
);

assert.match(
  loginView,
  /src="\/mail\.png"/,
  'logo wallpaper should use the existing mail logo asset'
);

assert.doesNotMatch(
  loginView,
  /login-grid|login-backdrop/,
  'default login background should not use the grid/card wallpaper'
);

assert.match(
  loginView,
  /@keyframes auth-mail-flight/,
  'authentication overlay should include the mail-flight animation'
);

assert.match(
  loginView,
  /authExperience\.visual === 'files'/,
  'SSO authentication overlay should switch to the Files visual when Files is the original site'
);

assert.match(
  loginView,
  /class="auth-folder"/,
  'SSO authentication overlay should include the Files folder icon'
);

assert.match(
  loginView,
  /@keyframes auth-folder-scan/,
  'SSO authentication overlay should include the Files folder scan animation'
);

assert.match(
  loginView,
  /@keyframes auth-progress/,
  'authentication overlay should include a progress animation'
);

assert.match(
  loginView,
  /const pendingSsoAuthorizeUrl = chemVaultSsoAuthorizeUrlFromSearch\(window\.location\.search\);/,
  'login page should preserve ChemVault SSO context from the URL'
);

assert.match(
  loginView,
  /if \(pendingSsoAuthorizeUrl\) \{[\s\S]*window\.location\.replace\(pendingSsoAuthorizeUrl\)/,
  'login success should continue ChemVault SSO instead of entering the mailbox'
);

assert.match(
  loginView,
  /function cleanLinuxDoCallbackUrl\(\)/,
  'login page should only clean LinuxDo callback parameters'
);

assert.doesNotMatch(
  loginView,
  /const cleanUrl = window\.location\.origin \+ window\.location\.pathname[\s\S]*window\.history\.replaceState\(\{\}, '', cleanUrl\)/,
  'login page should not wipe SSO query parameters on load'
);

assert.match(
  routerSource,
  /chemVaultSsoAuthorizeUrlFromQuery\(to\.query\)/,
  'router should continue ChemVault SSO when a Mail session already exists'
);

assert.match(
  ssoUtil,
  /\/api\/sso\/chemvault-user\/authorize/,
  'SSO utility should target the Mail Worker authorize endpoint'
);

assert.match(
  ssoUtil,
  /return Boolean\(redirectUri && returnTo\)/,
  'SSO utility should continue SSO even when the login URL only has redirect_uri and return_to'
);
