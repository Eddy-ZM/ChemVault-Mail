<template>
  <el-container class="layout premium-shell">
    <el-aside
        class="aside"
        :class="uiStore.asideShow ? 'aside-show' : 'el-aside-hide'">
      <Aside />
    </el-aside>
    <div
        :class="(uiStore.asideShow && isMobile)? 'overlay-show':'overlay-hide'"
        @click="uiStore.asideShow = false"
    ></div>
    <el-container class="main-container">
      <el-main>
        <el-header>
            <Header />
        </el-header>
        <Main />
      </el-main>
    </el-container>
  </el-container>
  <writer ref="writerRef" />
</template>

<script setup>
import Aside from '@/layout/aside/index.vue'
import Header from '@/layout/header/index.vue'
import Main from '@/layout/main/index.vue'
import { ref, onMounted, onBeforeUnmount } from 'vue'
import {useUiStore} from "@/store/ui.js";
import writer from '@/layout/write/index.vue'

const uiStore = useUiStore();
const writerRef = ref({})
const isMobile = ref(window.innerWidth < 1025)
const handleResize = () => {
  isMobile.value = window.innerWidth < 1025
  uiStore.asideShow = window.innerWidth > 1024;
}

onMounted(() => {
  uiStore.writerRef = writerRef

  window.addEventListener('resize', handleResize)
  handleResize()
})

onBeforeUnmount(() => {
  window.removeEventListener('resize', handleResize)
})
</script>

<style lang="scss" scoped>
.el-aside-hide {
  position: fixed;
  left: 0;
  height: 100%;
  z-index: 100;
  transform: translateX(-100%);
  transition:
      transform var(--motion-duration-base) var(--motion-smooth),
      opacity var(--motion-duration-base) var(--motion-smooth),
      box-shadow var(--motion-duration-base) var(--motion-smooth);
}

.aside-show {
  -webkit-box-shadow: none;
  box-shadow: none;
  transform: translateX(0);
  transition:
      transform var(--motion-duration-base) var(--motion-smooth),
      opacity var(--motion-duration-base) var(--motion-smooth),
      box-shadow var(--motion-duration-base) var(--motion-smooth);
  z-index: 101;
  @media (max-width: 1025px) {
    position: fixed;
    top: 0;
    left: 0;
    z-index: 101;
    height: 100%;
    background: var(--el-bg-color);
  }
}

.el-aside {
  width: auto;
  transition:
      transform var(--motion-duration-base) var(--motion-smooth),
      opacity var(--motion-duration-base) var(--motion-smooth),
      box-shadow var(--motion-duration-base) var(--motion-smooth);
}

.layout {
  height: 100%;
  position: fixed;
  width: 100%;
  top: 0;
  left: 0;
  overflow: hidden;
}

.premium-shell {
  background:
      radial-gradient(circle at 18% 0%, rgba(24, 144, 255, 0.09), transparent 34%),
      radial-gradient(circle at 100% 12%, rgba(58, 128, 221, 0.08), transparent 28%),
      var(--el-bg-color);
}

.main-container {
  min-height: 100%;
  background:
      linear-gradient(180deg, rgba(24, 144, 255, 0.035), transparent 28%),
      var(--el-bg-color);
  overflow-y: auto;
  -webkit-overflow-scrolling: touch;
}

.el-main {
  padding: 0;
}

.el-header {
  --el-header-height: 56px;
  height: 56px;
  background: var(--premium-surface);
  border-bottom: solid 1px var(--el-border-color);
  box-shadow: var(--premium-inset);
  backdrop-filter: blur(14px);
  -webkit-backdrop-filter: blur(14px);
  padding: 0 0 0 0;
  transition:
      background-color var(--motion-duration-base) var(--motion-smooth),
      box-shadow var(--motion-duration-base) var(--motion-smooth);
}

.overlay-show {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  background: rgba(0, 0, 0, 0.4);
  z-index: 99;
  transition:
      opacity var(--motion-duration-base) var(--motion-smooth),
      background-color var(--motion-duration-base) var(--motion-smooth);
}

.overlay-hide {
  display: flex;
  pointer-events: none;
  opacity: 0;
}
</style>
