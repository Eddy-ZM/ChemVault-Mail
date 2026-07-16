<template>
  <div class="header" :class="!hasPerm('email:send') ? 'not-send' : ''">
    <div class="header-btn">
      <hanburger :aria-label="$t('mainMenu')" @toggleClick="changeAside"></hanburger>
      <span class="breadcrumb-item">{{ $t(route.meta.title) }}</span>
    </div>
    <el-tooltip v-if="hasPerm('email:send')" effect="dark" :content="$t('composeEmail')">
      <div
          class="writer-box magnetic-action"
          role="button"
          tabindex="0"
          :aria-label="$t('composeEmail')"
          @click="openSend"
          @keydown.enter.prevent="openSend"
          @keydown.space.prevent="openSend"
      >
        <div class="writer">
          <Icon icon="material-symbols:edit-outline-sharp" width="22" height="22"/>
        </div>
      </div>
    </el-tooltip>
    <div class="toolbar">
      <el-tooltip effect="dark" :content="uiStore.dark ? $t('toggleLightMode') : $t('toggleDarkMode')">
        <div
            :class="[uiStore.dark ? 'sun-icon' : 'dark-icon', 'icon-item', 'magnetic-action']"
            role="button"
            tabindex="0"
            :aria-label="uiStore.dark ? $t('toggleLightMode') : $t('toggleDarkMode')"
            @click="openDark($event)"
            @keydown.enter.prevent="openDark"
            @keydown.space.prevent="openDark"
        >
          <Icon v-if="uiStore.dark" icon="mingcute:sun-fill"/>
          <Icon v-else icon="solar:moon-linear"/>
        </div>
      </el-tooltip>
      <el-tooltip effect="dark" :content="$t('openNotice')">
        <div
            class="notice icon-item magnetic-action"
            role="button"
            tabindex="0"
            :aria-label="$t('openNotice')"
            @click="openNotice"
            @keydown.enter.prevent="openNotice"
            @keydown.space.prevent="openNotice"
        >
          <Icon icon="streamline-plump:announcement-megaphone"/>
        </div>
      </el-tooltip>
      <el-dropdown ref="userinfoRef" @visible-change="e => userInfoShow = e" :teleported="true" popper-class="detail-dropdown user-detail-popper">
        <div
            class="avatar magnetic-action"
            role="button"
            tabindex="0"
            :aria-label="$t('userMenu')"
            @click="userInfoHide"
            @keydown.enter.prevent="userInfoHide"
            @keydown.space.prevent="userInfoHide"
        >
          <div class="avatar-text">
            <div>{{ formatName(userStore.user.email) }}</div>
          </div>
          <Icon class="setting-icon" icon="mingcute:down-small-fill" width="24" height="24"/>
        </div>
        <template #dropdown>
          <div class="user-details">
            <div class="details-avatar">
              {{ formatName(userStore.user.email) }}
            </div>
            <div class="user-name">
              {{ userStore.user.name || userStore.user.email || 'ChemVault' }}
            </div>
            <div class="detail-email" @click="copyEmail(userStore.user.email)">
              {{ userStore.user.email }}
            </div>
            <div class="detail-user-type">
              <el-tag>{{ userRole.name }}</el-tag>
            </div>
            <div class="action-info">
              <div class="quota-row">
                <span class="quota-label">{{ $t('sendCount') }}</span>
                <span class="quota-value">
                  <span v-if="sendCount" class="quota-count">{{ sendCount }}</span>
                  <el-tag size="small">{{ sendType }}</el-tag>
                </span>
              </div>
              <div class="quota-row">
                <span class="quota-label">{{ $t('accountCount') }}</span>
                <span class="quota-value">
                  <el-tag v-if="settingStore.settings.manyEmail || settingStore.settings.addEmail" size="small">
                    {{ $t('disabled') }}
                  </el-tag>
                  <span v-else-if="accountCount && hasPerm('account:add')" class="quota-count">
                    {{ $t('totalUserAccount', {msg: accountCount}) }}
                  </span>
                  <el-tag v-else-if="!accountCount && hasPerm('account:add')" size="small">{{ $t('unlimited') }}</el-tag>
                  <el-tag v-else-if="!hasPerm('account:add')" size="small">{{ $t('unauthorized') }}</el-tag>
                </span>
              </div>
            </div>
            <div class="logout">
              <el-button type="primary" :loading="logoutLoading" @click="clickLogout">{{ $t('logOut') }}</el-button>
            </div>
          </div>
        </template>
      </el-dropdown>
    </div>
  </div>
</template>

<script setup>
import router from "@/router";
import hanburger from '@/components/hamburger/index.vue'
import {logout} from "@/request/login.js";
import {Icon} from "@iconify/vue";
import {useUiStore} from "@/store/ui.js";
import {useUserStore} from "@/store/user.js";
import {useRoute} from "vue-router";
import {computed, ref} from "vue";
import {useSettingStore} from "@/store/setting.js";
import {hasPerm} from "@/perm/perm.js"
import {useI18n} from "vue-i18n";
import {setExtend} from "@/utils/day.js"

const {t} = useI18n();
const route = useRoute();
const settingStore = useSettingStore();
const userStore = useUserStore();
const uiStore = useUiStore();
const logoutLoading = ref(false)
const userInfoShow = ref(false)
const userinfoRef = ref({})

const accountCount = computed(() => {
  return userRole.value.accountCount
})

const userRole = computed(() => userStore.user?.role || {
  name: t('unauthorized'),
  accountCount: 0,
  sendType: 'ban',
  sendCount: 0
})

const sendType = computed(() => {

  if (settingStore.settings.send === 1) {
    return t('disabled')
  }

  if (!hasPerm('email:send')) {
    return t('unauthorized')
  }

  if (userRole.value.sendType === 'ban') {
    return t('sendBanned')
  }

  if (userRole.value.sendType === 'internal') {
    return t('sendInternal')
  }

  if (!userRole.value.sendCount) {
    return t('unlimited')
  }

  if (userRole.value.sendType === 'day') {
    return t('daily')
  }

  if (userRole.value.sendType === 'count') {
    return t('total')
  }
})

const sendCount = computed(() => {


  if (!hasPerm('email:send')) {
    return null
  }

  if (userRole.value.sendType === 'ban') {
    return null
  }

  if (userRole.value.sendType === 'internal') {
    return null
  }

  if (!userRole.value.sendCount) {
    return null
  }

  if (settingStore.settings.send === 1) {
    return null
  }

  return (userStore.user.sendCount || 0) + '/' + userRole.value.sendCount
})

function userInfoHide(e) {
    if (userInfoShow.value) {
        userinfoRef.value.handleClose()
    } else {
        userinfoRef.value.handleOpen()
    }
}

async function copyEmail(email) {
  try {
    await navigator.clipboard.writeText(email);
    ElMessage({
      message: t('copySuccessMsg'),
      type: 'success',
      plain: true,
    })
  } catch (err) {
    console.error(`${t('copyFailMsg')}:`, err);
    ElMessage({
      message: t('copyFailMsg'),
      type: 'error',
      plain: true,
    })
  }
}

function changeLang(lang) {
  setExtend(lang === 'en' ? 'en' : 'zh-cn')
  settingStore.lang = lang
}

function openNotice() {
  uiStore.showNotice()
}

function openDark(e = null) {

  const nextIsDark = !uiStore.dark
  const root = document.documentElement

  if (!document.startViewTransition) {
    switchDark(nextIsDark, root);
    return
  }

  const x = typeof e?.clientX === 'number' ? e.clientX : window.innerWidth / 2
  const y = typeof e?.clientY === 'number' ? e.clientY : 32

  const maxX = Math.max(x, window.innerWidth - x)
  const maxY = Math.max(y, window.innerHeight - y)
  const endRadius = Math.hypot(maxX, maxY)

  // 标记切换目标，供 CSS 选择器使用
  root.setAttribute('data-theme-to', nextIsDark ? 'dark' : 'light')
  root.style.setProperty('--vt-x', `${x}px`)
  root.style.setProperty('--vt-y', `${y}px`)
  root.style.setProperty('--vt-end-radius', `${endRadius + 10}px`)

  const transition = document.startViewTransition(() => {
    switchDark(nextIsDark, root);
  })

  transition.finished.finally(() => {
    // 清理标记
    root.removeAttribute('data-theme-to')
  })
}

function switchDark(nextIsDark, root) {
  root.setAttribute('class', nextIsDark ? 'dark' : '')
  const metaTag = document.getElementById('theme-color-meta');
  const isMobile =  !window.matchMedia("(pointer: fine) and (hover: hover)").matches;
  metaTag.setAttribute('content', nextIsDark ? (isMobile ? '#141414' : '#000000') : (isMobile ? '#FFFFFF' : '#F1F1F1'));
  uiStore.dark = nextIsDark
}

function openSend() {
  uiStore.writerRef.open()
}

function changeAside() {
  uiStore.asideShow = !uiStore.asideShow
}

function clickLogout() {
  if (userStore.user.authType === 'cloudflare-access') {
    localStorage.removeItem("token")
    window.location.href = '/cdn-cgi/access/logout'
    return
  }

  logoutLoading.value = true
  logout().then(() => {
    localStorage.removeItem("token")
    router.replace('/login')
  }).finally(() => {
    logoutLoading.value = false
  })
}

function formatName(email) {
  return email?.[0]?.toUpperCase() || 'C'
}

</script>
<style>
.detail-dropdown {
  color: var(--el-text-color-primary) !important;
}

.detail-dropdown.user-detail-popper {
  z-index: 3000 !important;
}

.detail-dropdown.user-detail-popper.el-popper {
  overflow: hidden;
  border: 1px solid var(--premium-surface-border);
  border-radius: 10px;
  background: var(--el-bg-color-overlay);
  box-shadow: 0 18px 44px rgba(15, 23, 42, 0.18);
}

.detail-dropdown.user-detail-popper .el-popper__arrow::before {
  border-color: var(--premium-surface-border);
  background: var(--el-bg-color-overlay);
}
</style>
<style lang="scss" scoped>

:deep(.el-popper.is-pure) {
  border-radius: 6px;
}

.user-details {
  box-sizing: border-box;
  width: min(320px, calc(100vw - 24px));
  padding: 18px;
  font-size: 14px;
  line-height: 1.4;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  background: var(--el-bg-color-overlay);

  .user-name {
    font-weight: bold;
    font-size: 15px;
    line-height: 20px;
    width: 100%;
    max-width: 100%;
    min-width: 0;
    overflow: hidden;
    white-space: nowrap;
    text-overflow: ellipsis;
    text-align: center;
  }

  .detail-user-type {
    max-width: 100%;
  }

  .detail-user-type :deep(.el-tag) {
    max-width: 100%;
  }

  .action-info {
    box-sizing: border-box;
    width: 100%;
    display: grid;
    grid-template-columns: 1fr;
    gap: 8px;
    margin-top: 6px;
    padding: 10px;
    border: 1px solid var(--premium-surface-border);
    border-radius: 8px;
    background: var(--premium-surface);
  }

  .quota-row {
    display: grid;
    grid-template-columns: minmax(0, 1fr) auto;
    gap: 12px;
    align-items: center;
    min-height: 24px;
  }

  .quota-label {
    min-width: 0;
    overflow: hidden;
    white-space: nowrap;
    text-align: left;
    text-overflow: ellipsis;
    color: var(--regular-text-color);
  }

  .quota-value {
    min-width: 0;
    max-width: 170px;
    display: inline-flex;
    align-items: center;
    justify-content: flex-end;
    gap: 6px;
    text-align: right;
  }

  .quota-count {
    min-width: 0;
    overflow: hidden;
    white-space: nowrap;
    text-overflow: ellipsis;
    font-weight: 600;
  }

  .detail-email {
    box-sizing: border-box;
    width: 100%;
    max-width: 100%;
    min-width: 0;
    padding: 0 8px;
    overflow: hidden;
    white-space: nowrap;
    text-overflow: ellipsis;
    text-align: center;
    color: var(--regular-text-color);
    cursor: pointer;
  }

  .logout {
    margin-top: 6px;
    width: 100%;
    padding: 0;

    .el-button {
      border-radius: 6px;
      height: 36px;
      width: 100%;
      font-weight: 600;
    }
  }

  .details-avatar {
    margin-bottom: 4px;
    height: 40px;
    width: 40px;
    background: var(--el-bg-color);
    color: var(--el-text-color-primary);
    border: 1px solid var(--dark-border);
    font-size: 18px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 10px;
  }
}


.header {
  text-align: right;
  font-size: 12px;
  display: grid;
  height: 100%;
  gap: 12px;
  grid-template-columns: minmax(0, max-content) 42px minmax(0, 1fr);
  align-items: center;
  padding: 0 18px 0 0;
  min-width: 0;
}

.header.not-send {
  grid-template-columns: minmax(0, max-content) minmax(0, 1fr);
}

.writer-box {
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 42px;
  height: 42px;
  margin-left: 0;
  justify-self: start;

  .writer {
    width: 34px;
    height: 34px;
    border-radius: 50%;
    color: #ffffff;
    background: linear-gradient(135deg, #1890ff, #3a80dd);
    box-shadow: 0 10px 24px rgba(24, 144, 255, 0.26);
    transition:
        transform var(--motion-duration-base) var(--motion-smooth),
        box-shadow var(--motion-duration-base) var(--motion-smooth),
        filter var(--motion-duration-base) var(--motion-smooth);
    display: flex;
    align-items: center;
    justify-content: center;

    .writer-text {
      margin-left: 15px;
      font-size: 14px;
      font-weight: bold;;
    }
  }
}

.magnetic-action {
  transition:
      transform var(--motion-duration-base) var(--motion-smooth),
      box-shadow var(--motion-duration-base) var(--motion-smooth),
      background-color var(--motion-duration-base) var(--motion-smooth),
      border-color var(--motion-duration-base) var(--motion-smooth);
  will-change: transform;
}

.magnetic-action:active {
  transform: scale(0.97);
}

@media (hover: hover) and (pointer: fine) {
  .magnetic-action:hover {
    transform: translate3d(0, -1px, 0);
  }

  .writer-box:hover .writer {
    box-shadow: 0 14px 34px rgba(24, 144, 255, 0.34);
    filter: saturate(1.08);
  }
}

.header-btn {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  height: 100%;
  min-width: 0;
  overflow: hidden;
}

.breadcrumb-item {
  font-weight: bold;
  font-size: 14px;
  color: var(--el-text-color-primary);
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
}

.toolbar {
  display: flex;
  justify-content: end;
  align-items: center;
  gap: 12px;
  min-width: 0;
  overflow: hidden;
  @media (max-width: 767px) {
    gap: 10px;
  }

  .icon-item {
    align-self: center;
    width: 34px;
    height: 34px;
    border-radius: 8px;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    background: transparent;
    border: 1px solid transparent;
  }

  .icon-item:hover {
    background: var(--premium-surface);
    border-color: var(--premium-surface-border);
    box-shadow: var(--premium-shadow);
  }

  .notice {
    font-size: 22px;
    margin-right: 0;
  }

  .dark-icon {
    font-size: 20px;
  }

  .sun-icon {
    font-size: 24px;
  }

  .avatar {
    display: flex;
    align-items: center;
    cursor: pointer;
    border-radius: 8px;

    .avatar-text {
      background: var(--premium-surface);
      color: var(--el-text-color-primary);
      height: 30px;
      width: 30px;
      display: flex;
      justify-content: center;
      align-items: center;
      border-radius: 8px;
      border: 1px solid var(--premium-surface-border);
      box-shadow: var(--premium-inset);
      transition:
          border-color var(--motion-duration-base) var(--motion-smooth),
          box-shadow var(--motion-duration-base) var(--motion-smooth),
          background-color var(--motion-duration-base) var(--motion-smooth);
    }

    &:hover .avatar-text {
      box-shadow: var(--premium-shadow);
      border-color: var(--el-color-primary-light-7);
    }

    .setting-icon {
      position: relative;
      top: 0;
      margin-right: 0;
      bottom: 10px;
    }
  }

}

.el-tooltip__trigger:first-child:focus-visible {
  outline: unset;
}
</style>
