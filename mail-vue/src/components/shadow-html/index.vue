<template>
  <div class="content-box" ref="contentBox">
    <div ref="container" class="content-html"></div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, watch, nextTick } from 'vue'

const props = defineProps({
  html: {
    type: String,
    required: true
  }
})

const container = ref(null)
const contentBox = ref(null)
let shadowRoot = null
let scaleRaf = 0
const MIN_READABLE_SCALE = 0.86;

function updateContent() {
  if (!shadowRoot) return;

  // 1. 提取 <body> 的 style 属性（如果存在）
  const bodyStyleRegex = /<body[^>]*style="([^"]*)"[^>]*>/i;
  const bodyStyleMatch = props.html.match(bodyStyleRegex);
  const bodyStyle = bodyStyleMatch ? bodyStyleMatch[1] : '';

  // 2. 移除 <body> 标签（保留内容）
  const cleanedHtml = props.html.replace(/<\/?body[^>]*>/gi, '');

  // 3. 将 body 的 style 应用到 .shadow-content
  shadowRoot.innerHTML = `
    <style>
      :host {
        all: initial;
        display: block;
        width: 100%;
        min-height: 100%;
        font-family: -apple-system, Inter, BlinkMacSystemFont,
                    'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
        font-size: 14px;
        line-height: 1.5;
        color: #13181D;
        word-break: break-word;
      }

      h1, h2, h3, h4 {
          font-size: 18px;
          font-weight: 700;
      }

      p {
        margin: 0;
      }

      a {
        text-decoration: none;
        color: #0E70DF;
      }

      .shadow-content {
        background: #FFFFFF;
        width: fit-content;
        min-height: 100%;
        min-width: 100%;
        ${bodyStyle ? bodyStyle : ''} /* 注入 body 的 style */
      }

      img:not(table img) {
        max-width: 100%;
        height: auto !important;
      }

    </style>
    <div class="shadow-content">
      ${cleanedHtml}
    </div>
  `;

  nextTick(scheduleAutoScale)
}

function scheduleAutoScale() {
  if (scaleRaf) {
    cancelAnimationFrame(scaleRaf)
  }

  scaleRaf = requestAnimationFrame(() => {
    scaleRaf = 0
    autoScale()
  })
}

function autoScale() {
  if (!shadowRoot || !contentBox.value) return
  const parent = contentBox.value
  const shadowContent = shadowRoot.querySelector('.shadow-content')

  if (!shadowContent) return

  const parentWidth = parent.clientWidth
  const childWidth = shadowContent.scrollWidth

  if (!parentWidth || !childWidth) return

  const scale = Math.min(1, parentWidth / childWidth)

  const hostElement = shadowRoot.host

  if (scale >= 1) {
    hostElement.style.zoom = '1'
    parent.classList.remove('content-box-scroll-x')
    return
  }

  if (scale >= MIN_READABLE_SCALE) {
    hostElement.style.zoom = String(scale)
    parent.classList.remove('content-box-scroll-x')
    return
  }

  hostElement.style.zoom = '1'
  parent.classList.add('content-box-scroll-x')
}

onMounted(() => {
  shadowRoot = container.value.attachShadow({ mode: 'open' })
  updateContent()
  window.addEventListener('resize', scheduleAutoScale)
})

onUnmounted(() => {
  window.removeEventListener('resize', scheduleAutoScale)
  if (scaleRaf) {
    cancelAnimationFrame(scaleRaf)
  }
})

watch(() => props.html, () => {
  updateContent()
})
</script>

<style scoped>
.content-box {
  width: 100%;
  min-height: 100%;
  overflow-x: hidden;
  overflow-y: visible;
  font-family: -apple-system, Inter, BlinkMacSystemFont, "Segoe UI", "Noto Sans", Helvetica, Arial, sans-serif, "Apple Color Emoji", "Segoe UI Emoji";
}

.content-box-scroll-x {
  overflow-x: auto;
}

.content-html {
  width: 100%;
  min-height: 100%;
}
</style>
