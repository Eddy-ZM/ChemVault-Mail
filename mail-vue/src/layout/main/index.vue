<template>
  <div :class="accountShow && hasPerm('account:query') ? 'main-box-show' : 'main-box-hide'">
    <div :class="accountShow && hasPerm('account:query') ? 'block-show' : 'block-hide'" @click="uiStore.accountShow = false"></div>
    <account  :class="accountShow && hasPerm('account:query') ? 'show' : 'hide'" />
    <router-view class="main-view" v-slot="{ Component,route }">
      <keep-alive :include="['email','all-email','send','sys-setting','star','user','role','analysis','reg-key','draft']">
        <component :is="Component" :key="route.name"/>
      </keep-alive>
    </router-view>
  </div>
</template>
<script setup>
import account from '@/layout/account/index.vue'
import {useUiStore} from "@/store/ui.js";
import {useSettingStore} from "@/store/setting.js";
import {computed, onBeforeUnmount, onMounted, watch} from "vue";
import { useRoute } from 'vue-router'
import { hasPerm } from "@/perm/perm.js"

const settingStore = useSettingStore()
const uiStore = useUiStore();
const route = useRoute()
let  innerWidth =  window.innerWidth

let elNotification = null

const accountShow = computed(() => {
  return uiStore.accountShow && settingStore.settings.manyEmail === 0
})

watch(() => uiStore.changeNotice, () => {

  const settings = settingStore.settings

  let data = {
    notice: settings.notice,
    noticeWidth: settings.noticeWidth,
    noticeTitle: settings.noticeTitle,
    noticeContent: settings.noticeContent,
    noticeType: settings.noticeType,
    noticeDuration: settings.noticeDuration,
    noticePosition: settings.noticePosition,
    noticeOffset: settings.noticeOffset
  }

  showNotice(data)
})

watch(() => uiStore.changePreview, () => {
  showNotice(uiStore.previewData)
})

function showNotice(data) {

  if (data.notice === 1) {
    return;
  }

  if (elNotification) {
    elNotification.close()
  }

  ensureNoticeStyle(data.noticeWidth);

  elNotification = ElNotification({
    title: '',
    message: buildNoticeMessage(data),
    type: '',
    duration: data.noticeDuration,
    position: data.noticePosition,
    offset: data.noticeOffset,
    dangerouslyUseHTMLString: true,
    customClass: `custom-notice custom-notice--${normalizeNoticeType(data.noticeType)}`
  })
}

function ensureNoticeStyle(width) {
  const styleId = 'chemvault-custom-notice-style';
  let style = document.getElementById(styleId);
  if (!style) {
    style = document.createElement('style');
    style.id = styleId;
    document.head.appendChild(style);
  }

  const noticeWidth = Math.max(280, Number(width) || 340);
  style.innerHTML = `
  .custom-notice.el-notification {
    --el-notification-width: min(${noticeWidth}px, calc(100% - 30px)) !important;
    width: var(--el-notification-width) !important;
    padding: 16px !important;
    border-radius: 8px !important;
    border: 1px solid var(--el-border-color-light) !important;
    background: var(--el-bg-color) !important;
    color: var(--el-text-color-primary) !important;
    box-shadow: 0 18px 48px rgba(15, 23, 42, 0.16) !important;
  }
  .custom-notice.custom-notice--destructive.el-notification {
    border-color: rgba(245, 108, 108, 0.5) !important;
    color: var(--el-color-danger) !important;
  }
  .custom-notice.custom-notice--warning.el-notification {
    border-color: rgba(230, 162, 60, 0.55) !important;
    color: var(--el-color-warning) !important;
  }
  .custom-notice.custom-notice--success.el-notification {
    border-color: rgba(103, 194, 58, 0.5) !important;
    color: var(--el-color-success) !important;
  }
  .custom-notice.custom-notice--info.el-notification,
  .custom-notice.custom-notice--primary.el-notification {
    border-color: rgba(64, 158, 255, 0.45) !important;
  }
  .custom-notice .el-notification__group {
    width: 100%;
    margin: 0 !important;
  }
  .custom-notice .el-notification__content {
    margin: 0 !important;
    text-align: left !important;
  }
  .custom-notice .el-notification__closeBtn {
    top: 15px !important;
    right: 14px !important;
    color: var(--el-text-color-secondary) !important;
  }
  .custom-notice .notice-alert {
    position: relative;
    width: 100%;
    min-height: 18px;
    padding-left: 28px;
    padding-right: 22px;
  }
  .custom-notice .notice-alert__icon {
    position: absolute;
    top: 1px;
    left: 0;
    width: 16px;
    height: 16px;
    color: currentColor;
    stroke: currentColor;
  }
  .custom-notice .notice-alert__title {
    margin-bottom: 6px;
    color: var(--el-text-color-primary);
    font-size: 14px;
    font-weight: 600;
    line-height: 1;
    letter-spacing: 0;
  }
  .custom-notice.custom-notice--destructive .notice-alert__title {
    color: var(--el-color-danger);
  }
  .custom-notice .notice-alert__description {
    color: var(--el-text-color-regular);
    font-size: 13px;
    line-height: 1.625;
    overflow-wrap: anywhere;
  }
  .custom-notice .notice-alert__description p {
    margin: 0 0 8px;
    line-height: 1.625;
  }
  .custom-notice .notice-alert__description p:last-child {
    margin-bottom: 0;
  }
  .custom-notice .notice-alert__description a {
    margin-top: 10px;
    display: inline-flex;
    color: currentColor;
    font-size: 13px;
    font-weight: 600;
    text-decoration: underline;
    text-underline-offset: 3px;
  }
  .dark .custom-notice.el-notification {
    box-shadow: 0 18px 48px rgba(0, 0, 0, 0.35) !important;
  }
  @media (max-width: 480px) {
    .custom-notice.el-notification {
      padding: 14px !important;
    }
    .custom-notice .notice-alert {
      padding-right: 20px;
    }
  }
  `;
}

function buildNoticeMessage(data) {
  const type = normalizeNoticeType(data.noticeType);
  const title = escapeHtml(data.noticeTitle || '');
  const content = data.noticeContent || '';

  return `
    <div class="notice-alert" role="alert">
      ${noticeIcon(type)}
      <div>
        ${title ? `<div class="notice-alert__title">${title}</div>` : ''}
        <div class="notice-alert__description">${content}</div>
      </div>
    </div>
  `;
}

function normalizeNoticeType(type) {
  if (type === 'warning') return 'warning';
  if (type === 'success') return 'success';
  if (type === 'info') return 'info';
  if (type === 'primary') return 'primary';
  if (type === 'error' || type === 'destructive') return 'destructive';
  return 'default';
}

function noticeIcon(type) {
  if (type === 'warning' || type === 'destructive') {
    return `
      <svg class="notice-alert__icon" viewBox="0 0 24 24" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
        <path d="m21.7 18-8-14a2 2 0 0 0-3.4 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.7-3Z"></path>
        <path d="M12 9v4"></path>
        <path d="M12 17h.01"></path>
      </svg>
    `;
  }

  if (type === 'success') {
    return `
      <svg class="notice-alert__icon" viewBox="0 0 24 24" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
        <path d="M20 6 9 17l-5-5"></path>
      </svg>
    `;
  }

  return `
    <svg class="notice-alert__icon" viewBox="0 0 24 24" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="10"></circle>
      <path d="M12 16v-4"></path>
      <path d="M12 8h.01"></path>
    </svg>
  `;
}

function escapeHtml(value) {
  return String(value)
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#039;');
}

onMounted(() => {
  window.addEventListener('resize', handleResize)
  handleResize()
})

onBeforeUnmount(() => {
  window.removeEventListener('resize', handleResize)
})

const handleResize = () => {
  if (['content','email','send'].includes(route.meta.name)) {
    if (innerWidth !==  window.innerWidth) {
      innerWidth = window.innerWidth;
      uiStore.accountShow = window.innerWidth >= 767;
    }
  }
}

</script>
<style lang="scss" scoped>

.block-show {
  position: fixed;
  @media (max-width: 767px) {
    position: absolute;
    right: 0;
    border: 0;
    height: 100%;
    width: 100%;
    background: #000000;
    opacity: 0.6;
    z-index: 10;
    transition: opacity 300ms;
  }
}

.block-hide {
  position: fixed;
  pointer-events: none;
  transition: opacity 300ms;
}

.show {
  transition: transform 100ms, opacity 100ms;
  @media (max-width: 767px) {
    position: fixed;
    z-index: 100;
    width: 260px;
  }
}

.hide {
  transition: transform 100ms, opacity 100ms;
  position: fixed;
  transform: translateX(-100%);
  opacity: 0;
  @media (max-width: 1024px) {
    width: 260px;
    z-index: 100;
  }
}


.main-box-show {
  display: grid;
  grid-template-columns: 260px minmax(0, 1fr);
  height: calc(100% - 60px);
  min-width: 0;
  @media (max-width: 767px) {
    grid-template-columns: 1fr;
  }
}

.main-box-hide {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  height: calc(100% - 60px);
  min-width: 0;
}


.main-view {
  background: var(--el-bg-color);
  min-width: 0;
  overflow: hidden;
}


.navigation {
  height: 30px;
  border-bottom: solid 1px var(--el-menu-border-color);
  display: inline-flex;
  justify-items: center;
  align-items: center;
  width: 100%;
  .tag {
    background: var(--el-bg-color);
    margin-left: 5px;
  }
}
</style>
