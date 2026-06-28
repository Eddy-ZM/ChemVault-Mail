<template>
  <div class="app-config-page">
    <el-scrollbar class="page-scroll">
      <div class="page-body">
        <div class="page-head">
          <div>
            <h1>App Config</h1>
            <p>Remote resource, version, maintenance, announcement, and template controls for ChemVault Mail native apps.</p>
          </div>
          <div class="head-actions">
            <el-button @click="load" :loading="loading">
              <Icon icon="lucide:refresh-cw" width="16" height="16"/>
              Refresh
            </el-button>
            <el-button type="primary" @click="saveAll" :loading="saving" v-perm="'setting:set'">
              <Icon icon="lucide:save" width="16" height="16"/>
              Save
            </el-button>
          </div>
        </div>

        <el-alert
            class="policy-alert"
            type="warning"
            show-icon
            :closable="false"
            title="Remote updates must stay limited to configuration, images, text, announcements, templates, links, feature flags, maintenance mode, and WebView content. Do not publish executable code or app packages."
        />

        <div class="grid">
          <section class="panel">
            <div class="panel-title">Version & Store</div>
            <el-form label-position="top">
              <el-row :gutter="14">
                <el-col :span="8">
                  <el-form-item label="Minimum Supported Version">
                    <el-input v-model="config.minimumSupportedVersion"/>
                  </el-form-item>
                </el-col>
                <el-col :span="8">
                  <el-form-item label="Latest Version">
                    <el-input v-model="config.latestVersion"/>
                  </el-form-item>
                </el-col>
                <el-col :span="8">
                  <el-form-item label="Config Version">
                    <el-input v-model="config.configVersion">
                      <template #append>
                        <el-button @click="publishVersion">Publish</el-button>
                      </template>
                    </el-input>
                  </el-form-item>
                </el-col>
              </el-row>
              <el-form-item label="App Store URL">
                <el-input v-model="config.appStoreUrl"/>
              </el-form-item>
              <el-form-item label="API Base URL">
                <el-input v-model="config.apiBaseUrl"/>
              </el-form-item>
              <el-form-item label="Resource Manifest URL">
                <el-input v-model="config.resourceManifestUrl"/>
              </el-form-item>
              <div class="switch-row">
                <span>Force Update</span>
                <el-switch v-model="config.forceUpdate"/>
              </div>
            </el-form>
          </section>

          <section class="panel">
            <div class="panel-title">Maintenance</div>
            <div class="switch-row">
              <span>Maintenance Mode</span>
              <el-switch v-model="config.maintenanceMode"/>
            </div>
            <el-form label-position="top">
              <el-form-item label="Title">
                <el-input v-model="config.maintenanceTitle"/>
              </el-form-item>
              <el-form-item label="Message">
                <el-input v-model="config.maintenanceMessage" type="textarea" :rows="4"/>
              </el-form-item>
            </el-form>
          </section>

          <section class="panel">
            <div class="panel-title">Announcement</div>
            <div class="switch-row">
              <span>Enabled</span>
              <el-switch v-model="config.announcement.enabled"/>
            </div>
            <el-form label-position="top">
              <el-form-item label="Title">
                <el-input v-model="config.announcement.title"/>
              </el-form-item>
              <el-form-item label="Message">
                <el-input v-model="config.announcement.message" type="textarea" :rows="3"/>
              </el-form-item>
              <el-form-item label="Link">
                <el-input v-model="config.announcement.link"/>
              </el-form-item>
            </el-form>
          </section>

          <section class="panel">
            <div class="panel-title">Feature Flags</div>
            <div class="flag-list">
              <div class="switch-row" v-for="(_, key) in config.featureFlags" :key="key">
                <span>{{ key }}</span>
                <el-switch v-model="config.featureFlags[key]"/>
              </div>
            </div>
          </section>

          <section class="panel">
            <div class="panel-title">Theme</div>
            <el-form label-position="top">
              <el-form-item label="Primary Color">
                <el-color-picker v-model="config.theme.primaryColor"/>
              </el-form-item>
              <el-form-item label="Logo URL">
                <el-input v-model="config.theme.logoUrl"/>
              </el-form-item>
              <el-form-item label="Banner URL">
                <el-input v-model="config.theme.bannerUrl"/>
              </el-form-item>
            </el-form>
          </section>

          <section class="panel">
            <div class="panel-title">Links</div>
            <el-form label-position="top">
              <el-form-item label="Privacy Policy URL">
                <el-input v-model="config.links.privacyPolicyUrl"/>
              </el-form-item>
              <el-form-item label="Terms URL">
                <el-input v-model="config.links.termsUrl"/>
              </el-form-item>
              <el-form-item label="Help Center URL">
                <el-input v-model="config.links.helpCenterUrl"/>
              </el-form-item>
              <el-form-item label="Support Email">
                <el-input v-model="config.links.supportEmail"/>
              </el-form-item>
            </el-form>
          </section>

          <section class="panel wide">
            <div class="panel-title">Resource Manifest</div>
            <el-input v-model="manifestText" type="textarea" :rows="12" spellcheck="false"/>
          </section>

          <section class="panel wide">
            <div class="panel-title">Templates</div>
            <el-input v-model="templatesText" type="textarea" :rows="12" spellcheck="false"/>
          </section>

          <section class="panel wide">
            <div class="panel-title">JSON Preview</div>
            <pre class="json-preview">{{ preview }}</pre>
          </section>
        </div>
      </div>
    </el-scrollbar>
  </div>
</template>

<script setup>
import {computed, onMounted, reactive, ref} from 'vue';
import {Icon} from '@iconify/vue';
import {
  appConfigQuery,
  appConfigSet,
  appManifestQuery,
  appManifestSet,
  appTemplatesQuery,
  appTemplatesSet
} from '@/request/app-config.js';

const loading = ref(false);
const saving = ref(false);
const manifestText = ref('{}');
const templatesText = ref('{}');

const config = reactive(defaultConfig());

const preview = computed(() => JSON.stringify(config, null, 2));

onMounted(load);

async function load() {
  loading.value = true;
  try {
    const [remoteConfig, manifest, templates] = await Promise.all([
      appConfigQuery(),
      appManifestQuery({platform: 'ios'}),
      appTemplatesQuery({platform: 'ios', locale: 'en'})
    ]);
    Object.assign(config, mergeConfig(remoteConfig));
    manifestText.value = JSON.stringify(manifest, null, 2);
    templatesText.value = JSON.stringify(templates, null, 2);
  } finally {
    loading.value = false;
  }
}

async function saveAll() {
  saving.value = true;
  try {
    validateConfig(config);
    const manifest = parseJSON(manifestText.value, 'Resource manifest');
    const templates = parseJSON(templatesText.value, 'Templates');
    validateManifest(manifest);
    validateTemplateJSON(templates);

    const [savedConfig] = await Promise.all([
      appConfigSet({...config}),
      appManifestSet({platform: 'ios', manifest}),
      appTemplatesSet({platform: 'ios', locale: 'en', templateType: 'mail', template: templates})
    ]);

    Object.assign(config, mergeConfig(savedConfig));
    ElMessage.success('App config saved.');
  } catch (error) {
    ElMessage.error(error?.message || 'Failed to save App config.');
  } finally {
    saving.value = false;
  }
}

function publishVersion() {
  const now = new Date();
  const stamp = now.toISOString().slice(0, 10);
  const time = [now.getHours(), now.getMinutes(), now.getSeconds()].map(v => String(v).padStart(2, '0')).join('');
  config.configVersion = `${stamp}-${time}`;
}

function defaultConfig() {
  return {
    platform: 'ios',
    minimumSupportedVersion: '0.2',
    latestVersion: '0.2',
    forceUpdate: false,
    appStoreUrl: 'https://apps.apple.com/app/idXXXXXXXXXX',
    apiBaseUrl: 'https://mail.chemvault.science/api',
    maintenanceMode: false,
    maintenanceTitle: 'Maintenance',
    maintenanceMessage: 'ChemVault Mail is temporarily under maintenance. Please try again later.',
    announcement: {
      enabled: false,
      title: '',
      message: '',
      link: ''
    },
    featureFlags: {
      enableNewInboxUI: false,
      enableSystemNotifications: true,
      enableBetaMailComposer: false,
      enableCloudflareLogin: true,
      enableDebugPanel: false
    },
    theme: {
      primaryColor: '#FACC15',
      logoUrl: 'https://assets.chemvault.science/mail/logo.png',
      bannerUrl: 'https://assets.chemvault.science/mail/banner.png'
    },
    links: {
      privacyPolicyUrl: 'https://chemvault.science/privacy',
      termsUrl: 'https://chemvault.science/terms',
      helpCenterUrl: 'https://chemvault.science/help',
      supportEmail: 'support@chemvault.science'
    },
    templates: {
      welcomeEmailTemplateVersion: 'bundled',
      notificationTemplateVersion: 'bundled'
    },
    resourceManifestUrl: 'https://assets.chemvault.science/mail/manifest.json',
    configVersion: 'bundled'
  }
}

function mergeConfig(remoteConfig = {}) {
  const base = defaultConfig();
  return {
    ...base,
    ...remoteConfig,
    announcement: {...base.announcement, ...(remoteConfig.announcement || {})},
    featureFlags: {...base.featureFlags, ...(remoteConfig.featureFlags || {})},
    theme: {...base.theme, ...(remoteConfig.theme || {})},
    links: {...base.links, ...(remoteConfig.links || {})},
    templates: {...base.templates, ...(remoteConfig.templates || {})}
  }
}

function parseJSON(value, label) {
  try {
    return JSON.parse(value);
  } catch (error) {
    ElMessage.error(`${label} JSON is invalid.`);
    throw error;
  }
}

function validateConfig(value) {
  requireAppStoreUrl(value.appStoreUrl);
  [
    value.apiBaseUrl,
    value.resourceManifestUrl,
    value.theme.logoUrl,
    value.theme.bannerUrl,
    value.links.privacyPolicyUrl,
    value.links.termsUrl,
    value.links.helpCenterUrl,
    value.announcement.link
  ].filter(Boolean).forEach(requireHttpsUrl);

  requireAssetUrl(value.resourceManifestUrl);
  requireAssetUrl(value.theme.logoUrl);
  requireAssetUrl(value.theme.bannerUrl);
}

function validateManifest(manifest) {
  if (!Array.isArray(manifest.assets)) {
    throw new Error('Manifest assets must be an array.');
  }
  manifest.assets.forEach(asset => {
    if (!asset.key) throw new Error('Manifest asset key is required.');
    if (!['image', 'json', 'text', 'html'].includes(asset.type)) throw new Error(`Invalid asset type: ${asset.type}`);
    requireAssetUrl(asset.url);
    if (!/^[a-f0-9]{64}$/i.test(asset.sha256 || '')) {
      throw new Error(`Invalid sha256 for ${asset.key}`);
    }
  });
}

function validateTemplateJSON(templates) {
  const text = JSON.stringify(templates);
  if (/<script\b/i.test(text)) {
    throw new Error('Templates cannot contain script tags.');
  }
}

function requireHttpsUrl(value) {
  const url = new URL(value);
  if (url.protocol !== 'https:') {
    throw new Error(`${value} must use https.`);
  }
}

function requireAppStoreUrl(value) {
  const url = new URL(value);
  if (url.protocol !== 'https:' || url.hostname !== 'apps.apple.com') {
    throw new Error('App Store URL must use apps.apple.com.');
  }
}

function requireAssetUrl(value) {
  const url = new URL(value);
  const blocked = ['.swift', '.m', '.h', '.framework', '.dylib', '.so', '.ipa', '.jsbundle', '.lua', '.py', '.wasm', '.exe'];
  if (url.protocol !== 'https:' || url.hostname !== 'assets.chemvault.science') {
    throw new Error(`${value} must use https://assets.chemvault.science.`);
  }
  if (blocked.some(ext => url.pathname.toLowerCase().endsWith(ext))) {
    throw new Error(`${value} is an executable resource type.`);
  }
}
</script>

<style scoped>
.app-config-page {
  height: 100%;
  background: var(--el-bg-color-page);
}

.page-scroll {
  height: 100%;
}

.page-body {
  padding: 22px;
}

.page-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 16px;
}

.page-head h1 {
  margin: 0;
  font-size: 24px;
  line-height: 1.2;
}

.page-head p {
  margin: 6px 0 0;
  color: var(--el-text-color-secondary);
}

.head-actions {
  display: flex;
  gap: 10px;
}

.policy-alert {
  margin-bottom: 16px;
}

.grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 16px;
}

.panel {
  padding: 16px;
  border: 1px solid var(--el-border-color-lighter);
  border-radius: 8px;
  background: var(--el-bg-color);
}

.panel.wide {
  grid-column: 1 / -1;
}

.panel-title {
  margin-bottom: 14px;
  font-size: 15px;
  font-weight: 700;
}

.switch-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  min-height: 34px;
}

.flag-list {
  display: grid;
  gap: 10px;
}

.json-preview {
  max-height: 360px;
  overflow: auto;
  margin: 0;
  padding: 12px;
  border-radius: 8px;
  background: var(--el-fill-color-light);
  color: var(--el-text-color-primary);
  font-size: 12px;
  line-height: 1.55;
}

@media (max-width: 900px) {
  .grid {
    grid-template-columns: 1fr;
  }

  .page-head {
    flex-direction: column;
  }
}
</style>
