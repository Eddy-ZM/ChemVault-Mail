import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const root = new URL('../', import.meta.url);

function file(path) {
  return readFile(new URL(path, root), 'utf8');
}

const [contentView, shadowHtml, writeLayout, tinyEditor, loginView] = await Promise.all([
  file('src/views/content/index.vue'),
  file('src/components/shadow-html/index.vue'),
  file('src/layout/write/index.vue'),
  file('src/components/tiny-editor/index.vue'),
  file('src/views/login/index.vue')
]);

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
  /@keyframes auth-progress/,
  'authentication overlay should include a progress animation'
);
