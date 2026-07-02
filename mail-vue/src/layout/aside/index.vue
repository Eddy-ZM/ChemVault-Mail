<template>
  <aside
      class="sidebar-shell"
      :class="{ 'is-expanded': isExpanded, 'is-collapsed': !isExpanded }"
      @mouseenter="setExpanded(true)"
      @mouseleave="setExpanded(false)"
  >
    <div class="sidebar-inner">
      <div class="sidebar-head">
        <button class="org-switch" type="button" @click="router.push({ name: 'email' })">
          <span class="org-avatar">
            <Icon icon="mdi:email-outline" width="16" height="16"/>
          </span>
          <span class="org-copy">
            <span class="org-name">{{ settingStore.settings.title }}</span>
          </span>
        </button>
        <button
            class="sidebar-pin"
            :class="{ 'is-active': uiStore.sidebarPinned }"
            type="button"
            :title="uiStore.sidebarPinned ? $t('unpinSidebar') : $t('pinSidebar')"
            :aria-label="uiStore.sidebarPinned ? $t('unpinSidebar') : $t('pinSidebar')"
            @click.stop="toggleSidebarPinned"
        >
          <Icon :icon="uiStore.sidebarPinned ? 'lucide:pin-off' : 'lucide:pin'" width="16" height="16"/>
        </button>
      </div>

      <el-scrollbar class="nav-scroll">
        <el-menu :collapse="false" class="sidebar-menu">
          <el-menu-item
              class="nav-item"
              @click="router.push({ name: 'email' })"
              index="email"
              :class="route.meta.name === 'email' ? 'choose-item' : ''"
          >
            <Icon class="nav-icon" icon="hugeicons:mailbox-01" width="18" height="18"/>
            <span class="menu-name">{{ $t('inbox') }}</span>
          </el-menu-item>
          <el-menu-item
              class="nav-item"
              @click="router.push({ name: 'send' })"
              index="send"
              v-perm="'email:send'"
              :class="route.meta.name === 'send' ? 'choose-item' : ''"
          >
            <Icon class="nav-icon" icon="cil:send" width="18" height="18"/>
            <span class="menu-name">{{ $t('sent') }}</span>
          </el-menu-item>
          <el-menu-item
              class="nav-item"
              @click="router.push({ name: 'draft' })"
              index="draft"
              v-perm="'email:send'"
              :class="route.meta.name === 'draft' ? 'choose-item' : ''"
          >
            <Icon class="nav-icon" icon="ep:document" width="18" height="18"/>
            <span class="menu-name">{{ $t('drafts') }}</span>
          </el-menu-item>
          <el-menu-item
              class="nav-item"
              @click="router.push({ name: 'star' })"
              index="star"
              :class="route.meta.name === 'star' ? 'choose-item' : ''"
          >
            <Icon class="nav-icon" icon="solar:star-line-duotone" width="18" height="18"/>
            <span class="menu-name">{{ $t('starred') }}</span>
          </el-menu-item>
          <el-menu-item
              class="nav-item"
              @click="router.push({ name: 'flagged' })"
              index="flagged"
              :class="route.meta.name === 'flagged' ? 'choose-item' : ''"
          >
            <Icon class="nav-icon" icon="mdi:flag-outline" width="18" height="18"/>
            <span class="menu-name">{{ $t('flagged') }}</span>
          </el-menu-item>
          <el-menu-item
              class="nav-item"
              @click="router.push({ name: 'archive' })"
              index="archive"
              :class="route.meta.name === 'archive' ? 'choose-item' : ''"
          >
            <Icon class="nav-icon" icon="material-symbols:archive-outline" width="18" height="18"/>
            <span class="menu-name">{{ $t('archive') }}</span>
          </el-menu-item>
          <el-menu-item
              class="nav-item"
              @click="router.push({ name: 'setting' })"
              index="setting"
              :class="route.meta.name === 'setting' ? 'choose-item' : ''"
          >
            <Icon class="nav-icon" icon="fluent:settings-48-regular" width="18" height="18"/>
            <span class="menu-name">{{ $t('settings') }}</span>
          </el-menu-item>
          <el-menu-item
              class="nav-item"
              @click="openDocs"
              index="docs"
          >
            <Icon class="nav-icon" icon="solar:document-text-line-duotone" width="18" height="18"/>
            <span class="menu-name">{{ $t('document') }}</span>
          </el-menu-item>

          <template v-if="hasManageAccess">
            <div class="sidebar-separator"></div>
            <div class="manage-title">
              <span>{{ $t('manage') }}</span>
            </div>

            <el-menu-item
                class="nav-item"
                @click="router.push({ name: 'analysis' })"
                index="analysis"
                v-perm="'analysis:query'"
                :class="route.meta.name === 'analysis' ? 'choose-item' : ''"
            >
              <Icon class="nav-icon" icon="fluent:data-pie-20-regular" width="18" height="18"/>
              <span class="menu-name">{{ $t('analytics') }}</span>
            </el-menu-item>
            <el-menu-item
                class="nav-item"
                @click="router.push({ name: 'user' })"
                index="user"
                v-perm="'user:query'"
                :class="route.meta.name === 'user' ? 'choose-item' : ''"
            >
              <Icon class="nav-icon" icon="si:user-alt-2-line" width="18" height="18"/>
              <span class="menu-name">{{ $t('allUsers') }}</span>
            </el-menu-item>
            <el-menu-item
                class="nav-item"
                @click="router.push({ name: 'all-email' })"
                index="all-email"
                v-perm="'all-email:query'"
                :class="route.meta.name === 'all-email' ? 'choose-item' : ''"
            >
              <Icon class="nav-icon" icon="fluent:mail-list-28-regular" width="18" height="18"/>
              <span class="menu-name">{{ $t('allMail') }}</span>
            </el-menu-item>
            <el-menu-item
                class="nav-item"
                @click="router.push({ name: 'role' })"
                index="role"
                v-perm="'role:query'"
                :class="route.meta.name === 'role' ? 'choose-item' : ''"
            >
              <Icon class="nav-icon" icon="fluent:lock-closed-16-regular" width="18" height="18"/>
              <span class="menu-name">{{ $t('permissions') }}</span>
            </el-menu-item>
            <el-menu-item
                class="nav-item"
                @click="router.push({ name: 'reg-key' })"
                index="reg-key"
                v-perm="'reg-key:query'"
                :class="route.meta.name === 'reg-key' ? 'choose-item' : ''"
            >
              <Icon class="nav-icon" icon="fluent:fingerprint-20-filled" width="18" height="18"/>
              <span class="menu-name">{{ $t('inviteCode') }}</span>
            </el-menu-item>
            <el-menu-item
                class="nav-item"
                @click="router.push({ name: 'sys-setting' })"
                index="sys-setting"
                v-perm="'setting:query'"
                :class="route.meta.name === 'sys-setting' ? 'choose-item' : ''"
            >
              <Icon class="nav-icon" icon="eos-icons:system-ok-outlined" width="18" height="18"/>
              <span class="menu-name">{{ $t('SystemSettings') }}</span>
            </el-menu-item>
            <el-menu-item
                class="nav-item"
                @click="router.push({ name: 'app-config' })"
                index="app-config"
                v-perm="'setting:query'"
                :class="route.meta.name === 'app-config' ? 'choose-item' : ''"
            >
              <Icon class="nav-icon" icon="lucide:smartphone" width="18" height="18"/>
              <span class="menu-name">{{ $t('appConfig') }}</span>
            </el-menu-item>
          </template>
        </el-menu>
      </el-scrollbar>

      <div class="sidebar-footer">
        <button class="account-card" type="button" @click="router.push({ name: 'setting' })">
          <span class="account-avatar">{{ userInitial }}</span>
          <span class="account-copy">
            <span class="account-name">{{ accountName }}</span>
            <span class="account-email">{{ userStore.user.email }}</span>
          </span>
          <Icon class="account-toggle" icon="lucide:chevrons-up-down" width="16" height="16"/>
        </button>
      </div>
    </div>
  </aside>
</template>

<script setup>
import router from "@/router/index.js";
import {useRoute} from "vue-router";
import {Icon} from "@iconify/vue";
import {computed, onBeforeUnmount, onMounted, ref} from "vue";
import {useSettingStore} from "@/store/setting.js";
import {useUserStore} from "@/store/user.js";
import {useUiStore} from "@/store/ui.js";

const settingStore = useSettingStore();
const userStore = useUserStore();
const uiStore = useUiStore();
const route = useRoute();
const hoverExpanded = ref(false);
const isDesktop = ref(window.innerWidth > 1024);
const managePermKeys = ['all-email:query', 'user:query', 'role:query', 'setting:query', 'analysis:query', 'reg-key:query'];

const isExpanded = computed(() => !isDesktop.value || uiStore.sidebarPinned || hoverExpanded.value);
const userInitial = computed(() => formatInitial(userStore.user.email));
const accountName = computed(() => userStore.user.name || userStore.user.email || '');
const userPermKeys = computed(() => Array.isArray(userStore.user?.permKeys) ? userStore.user.permKeys : []);
const hasManageAccess = computed(() => {
  const permKeys = userPermKeys.value;
  return permKeys.includes('*') || managePermKeys.some(key => permKeys.includes(key));
});

function setExpanded(value) {
  if (isDesktop.value && !uiStore.sidebarPinned) {
    hoverExpanded.value = value;
  }
}

function toggleSidebarPinned() {
  uiStore.sidebarPinned = !uiStore.sidebarPinned;
  if (uiStore.sidebarPinned) {
    hoverExpanded.value = false;
  }
}

function openDocs() {
  window.open('https://docs.chemvault.science/manual/mail/', '_blank', 'noopener,noreferrer');
}

function handleResize() {
  isDesktop.value = window.innerWidth > 1024;
  if (!isDesktop.value) {
    hoverExpanded.value = true;
  } else {
    hoverExpanded.value = false;
  }
}

function formatInitial(email) {
  return email?.[0]?.toUpperCase() || 'C';
}

onMounted(() => {
  window.addEventListener('resize', handleResize);
  handleResize();
});

onBeforeUnmount(() => {
  window.removeEventListener('resize', handleResize);
});
</script>

<style lang="scss" scoped>
.sidebar-shell {
  width: 49px;
  height: 100%;
  overflow: hidden;
  border-right: 1px solid var(--el-border-color-lighter);
  background: var(--el-bg-color);
  color: var(--el-text-color-regular);
  transition:
      width 200ms ease-out,
      border-color var(--motion-duration-base) var(--motion-smooth),
      background-color var(--motion-duration-base) var(--motion-smooth),
      box-shadow var(--motion-duration-base) var(--motion-smooth);
}

.sidebar-shell.is-expanded {
  width: 240px;
  box-shadow: 8px 0 28px rgba(15, 23, 42, 0.07);
}

.sidebar-inner {
  position: relative;
  z-index: 1;
  display: flex;
  width: 240px;
  height: 100%;
  flex-direction: column;
  background: var(--el-bg-color);
}

.org-switch,
.account-card {
  width: 100%;
  border: 0;
  color: var(--el-text-color-regular);
  background: transparent;
  cursor: pointer;
}

.sidebar-head {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 36px;
  align-items: center;
  height: 54px;
  padding: 8px;
  border-bottom: 1px solid var(--el-border-color-lighter);
}

.org-switch {
  display: grid;
  grid-template-columns: 32px minmax(0, 1fr);
  align-items: center;
  gap: 8px;
  min-width: 0;
  height: 36px;
  padding: 0;
  border-radius: 6px;
  text-align: left;
  transition:
      background-color var(--motion-duration-base) var(--motion-smooth),
      color var(--motion-duration-base) var(--motion-smooth);
}

.sidebar-pin {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border: 0;
  border-radius: 6px;
  color: var(--el-text-color-secondary);
  background: transparent;
  cursor: pointer;
  transition:
      opacity 180ms ease-out,
      transform 180ms ease-out,
      background-color var(--motion-duration-base) var(--motion-smooth),
      color var(--motion-duration-base) var(--motion-smooth);
}

.sidebar-pin.is-active {
  color: var(--el-color-primary);
  background: var(--el-color-primary-light-9);
}

.org-avatar,
.account-avatar {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  color: var(--el-color-primary);
  background: var(--el-color-primary-light-9);
}

.org-avatar {
  width: 32px;
  height: 32px;
  border-radius: 7px;
}

.org-copy,
.account-copy,
.account-toggle,
.menu-name,
.manage-title span {
  opacity: 1;
  transform: translateX(0);
  transition:
      opacity 180ms ease-out,
      transform 180ms ease-out;
}

.is-collapsed {
  .org-copy,
  .account-copy,
  .account-toggle,
  .menu-name,
  .manage-title span {
    opacity: 0;
    transform: translateX(-12px);
    pointer-events: none;
  }
}

.org-name,
.account-name,
.account-email,
.menu-name {
  display: block;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
}

.org-name {
  color: var(--el-text-color-primary);
  font-size: 14px;
  font-weight: 650;
}

.account-toggle {
  color: var(--el-text-color-secondary);
}

.nav-scroll {
  flex: 1;
  min-height: 0;
}

:deep(.sidebar-menu.el-menu) {
  width: 100%;
  padding: 8px;
  border-right: 0;
  background: transparent;
}

:deep(.sidebar-menu .el-menu-item.nav-item) {
  display: grid;
  grid-template-columns: 32px minmax(0, 1fr);
  align-items: center;
  width: 100%;
  min-width: 0;
  height: 32px;
  margin: 1px 0;
  padding: 0 !important;
  border-radius: 6px;
  color: var(--el-text-color-regular);
  background: transparent;
  line-height: 32px;
  transition:
      background-color var(--motion-duration-base) var(--motion-smooth),
      color var(--motion-duration-base) var(--motion-smooth),
      transform var(--motion-duration-base) var(--motion-smooth);
}

.nav-icon {
  justify-self: center;
  flex-shrink: 0;
  color: currentColor;
}

.menu-name {
  min-width: 0;
  padding-left: 2px;
  color: currentColor;
  font-size: 14px;
  font-weight: 560;
  letter-spacing: 0;
  user-select: none;
}

:deep(.sidebar-menu .el-menu-item.nav-item:hover) {
  color: var(--el-color-primary);
  background: var(--el-fill-color-light);
}

:deep(.sidebar-menu .el-menu-item.nav-item.choose-item) {
  color: var(--el-color-primary);
  background: var(--el-fill-color-light);
  font-weight: 650;
}

:deep(.sidebar-menu .el-menu-item.nav-item.choose-item .nav-icon) {
  transform: scale(1.04);
}

.sidebar-separator {
  height: 1px;
  margin: 8px 0;
  background: var(--el-border-color-lighter);
}

.manage-title {
  display: flex;
  align-items: center;
  height: 22px;
  padding: 0 8px 0 10px;
  color: var(--el-text-color-secondary);
  font-size: 12px;
  font-weight: 600;
  line-height: 22px;
}

.sidebar-footer {
  flex-shrink: 0;
  padding: 8px;
  border-top: 1px solid var(--el-border-color-lighter);
}

.account-card {
  display: grid;
  grid-template-columns: 32px minmax(0, 1fr) 18px;
  align-items: center;
  gap: 8px;
  min-height: 36px;
  padding: 2px 0;
  border-radius: 6px;
  text-align: left;
  transition:
      background-color var(--motion-duration-base) var(--motion-smooth),
      color var(--motion-duration-base) var(--motion-smooth);
}

.account-avatar {
  width: 24px;
  height: 24px;
  margin-left: 4px;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 700;
}

.account-name {
  color: var(--el-text-color-primary);
  font-size: 13px;
  font-weight: 620;
  line-height: 18px;
}

.account-email {
  color: var(--el-text-color-secondary);
  font-size: 12px;
  line-height: 16px;
}

@media (hover: hover) {
  .org-switch:hover,
  .account-card:hover,
  .sidebar-pin:hover {
    color: var(--el-color-primary);
    background: var(--el-fill-color-light);
  }
}

:deep(.el-scrollbar__wrap--hidden-default) {
  background: transparent !important;
}

:global(.dark) .sidebar-shell,
:global(.dark) .sidebar-inner {
  background: #000000;
}

@media (max-width: 1024px) {
  .sidebar-shell,
  .sidebar-shell.is-expanded {
    width: 240px;
  }

  .sidebar-pin {
    display: none;
  }
}
</style>
