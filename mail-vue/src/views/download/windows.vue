<template>
  <main class="windows-download">
    <section class="download-hero">
      <img class="app-logo" src="/mail.png" alt="ChemVault Mail">
      <div class="hero-copy">
        <p class="eyebrow">{{ $t('windowsDesktopApp') }}</p>
        <h1>{{ $t('downloadForWindows') }}</h1>
        <p class="summary">{{ $t('windowsDownloadSummary') }}</p>
        <div class="actions">
          <a class="primary-action" :href="downloadUrl" rel="noopener noreferrer">
            {{ $t('downloadWindowsInstaller') }}
          </a>
          <a class="secondary-action" :href="releaseNotesUrl" target="_blank" rel="noopener noreferrer">
            {{ $t('releaseNotes') }}
          </a>
        </div>
      </div>
    </section>

    <section class="download-details" aria-label="Windows desktop release details">
      <div class="detail-row">
        <span>{{ $t('currentVersion') }}</span>
        <strong>{{ appVersion }}</strong>
      </div>
      <div class="detail-row">
        <span>{{ $t('installerFile') }}</span>
        <strong>{{ installerName }}</strong>
      </div>
      <div class="detail-row">
        <span>{{ $t('systemRequirements') }}</span>
        <strong>{{ $t('windowsSystemRequirements') }}</strong>
      </div>
      <div class="detail-row">
        <span>{{ $t('updateChannel') }}</span>
        <strong>{{ $t('githubReleases') }}</strong>
      </div>
    </section>

    <section class="notice" aria-label="Windows signing notice">
      <h2>{{ $t('unsignedBuildNoticeTitle') }}</h2>
      <p>{{ $t('unsignedBuildNoticeBody') }}</p>
    </section>
  </main>
</template>

<script setup>
const appVersion = __CHEMVAULT_MAIL_VERSION__;
const installerName = `ChemVault-Mail-Setup-${appVersion}.exe`;
const defaultDownloadBaseUrl = `https://github.com/Eddy-ZM/ChemVault-Mail/releases/download/v${appVersion}`;
const downloadBaseUrl = import.meta.env.VITE_WINDOWS_DOWNLOAD_BASE_URL || defaultDownloadBaseUrl;
const releaseNotesUrl = import.meta.env.VITE_WINDOWS_RELEASE_NOTES_URL || `https://github.com/Eddy-ZM/ChemVault-Mail/releases/tag/v${appVersion}`;
const downloadUrl = import.meta.env.VITE_WINDOWS_DOWNLOAD_URL || `${downloadBaseUrl}/${installerName}`;
</script>

<style scoped lang="scss">
.windows-download {
  min-height: 100vh;
  padding: 64px clamp(20px, 5vw, 72px);
  background: var(--el-bg-color);
  color: var(--el-text-color-primary);
}

.download-hero {
  display: grid;
  grid-template-columns: 96px minmax(0, 1fr);
  align-items: center;
  gap: 28px;
  max-width: 920px;
  margin: 0 auto;
}

.app-logo {
  width: 96px;
  height: 96px;
  object-fit: contain;
}

.hero-copy {
  min-width: 0;
}

.eyebrow {
  margin: 0 0 8px;
  color: var(--el-text-color-secondary);
  font-size: 13px;
  font-weight: 700;
  letter-spacing: 0;
  text-transform: uppercase;
}

h1 {
  margin: 0;
  color: var(--el-text-color-primary);
  font-size: clamp(32px, 5vw, 48px);
  line-height: 1.1;
  letter-spacing: 0;
}

.summary {
  max-width: 660px;
  margin: 16px 0 0;
  color: var(--el-text-color-regular);
  font-size: 16px;
  line-height: 1.7;
}

.actions {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  margin-top: 26px;
}

.primary-action,
.secondary-action {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 40px;
  padding: 0 18px;
  border-radius: 6px;
  font-size: 14px;
  font-weight: 700;
  text-decoration: none;
}

.primary-action {
  color: #ffffff;
  background: var(--el-color-primary);
}

.secondary-action {
  color: var(--el-color-primary);
  background: var(--el-color-primary-light-9);
}

.download-details,
.notice {
  max-width: 920px;
  margin: 32px auto 0;
  border: 1px solid var(--el-border-color-lighter);
  border-radius: 8px;
  background: var(--el-fill-color-blank);
}

.detail-row {
  display: grid;
  grid-template-columns: minmax(160px, 240px) minmax(0, 1fr);
  gap: 20px;
  padding: 16px 20px;
  border-bottom: 1px solid var(--el-border-color-lighter);
}

.detail-row:last-child {
  border-bottom: 0;
}

.detail-row span {
  color: var(--el-text-color-secondary);
}

.detail-row strong {
  min-width: 0;
  overflow-wrap: anywhere;
  color: var(--el-text-color-primary);
}

.notice {
  padding: 20px;
}

.notice h2 {
  margin: 0 0 10px;
  font-size: 18px;
  letter-spacing: 0;
}

.notice p {
  margin: 0;
  color: var(--el-text-color-regular);
  line-height: 1.7;
}

@media (max-width: 640px) {
  .windows-download {
    padding-top: 40px;
  }

  .download-hero {
    grid-template-columns: 1fr;
  }

  .app-logo {
    width: 76px;
    height: 76px;
  }

  .detail-row {
    grid-template-columns: 1fr;
    gap: 6px;
  }

  .primary-action,
  .secondary-action {
    width: 100%;
  }
}
</style>
