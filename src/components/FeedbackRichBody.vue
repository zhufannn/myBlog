<!--
  反馈正文 HTML：缩略图 + vue-easy-lightbox 预览（条内多图左右切换）。
-->
<template>
  <div class="feedback-rich-body">
    <div
      ref="bodyRef"
      class="feedback-rich-body__html"
      v-html="safeHtml"
    />
    <VueEasyLightbox
      :visible="lightVisible"
      :imgs="lightImgs"
      :index="lightIndex"
      :loop="true"
      teleport="body"
      @hide="lightVisible = false"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onMounted, ref, watch } from 'vue'
import VueEasyLightbox from 'vue-easy-lightbox'
import { sanitizeFeedbackHtml } from '../utils/sanitizeFeedbackHtml'

const props = defineProps<{
  html: string
}>()

const safeHtml = computed(() => sanitizeFeedbackHtml(props.html))

const bodyRef = ref<HTMLElement | null>(null)
const lightVisible = ref(false)
const lightImgs = ref<string[]>([])
const lightIndex = ref(0)

function collectImageUrls(container: HTMLElement): string[] {
  return Array.from(container.querySelectorAll('img'))
    .map((img) => img.currentSrc || img.src || '')
    .filter(Boolean)
}

function unwrapShells(container: HTMLElement): void {
  container.querySelectorAll('.feedback-rich-body__img-shell').forEach((shell) => {
    const img = shell.querySelector('img')
    const parent = shell.parentNode
    if (!img || !parent) return
    parent.insertBefore(img, shell)
    shell.remove()
  })
}

function decorateImages(): void {
  const el = bodyRef.value
  if (!el) return
  unwrapShells(el)
  el.querySelectorAll('img').forEach((img) => {
    if (img.closest('.feedback-rich-body__img-shell')) return
    const shell = document.createElement('span')
    shell.className = 'feedback-rich-body__img-shell'
    const btn = document.createElement('button')
    btn.type = 'button'
    btn.className = 'feedback-rich-body__zoom'
    btn.textContent = '放大'
    btn.setAttribute('aria-label', '放大查看图片')
    img.replaceWith(shell)
    shell.appendChild(img)
    shell.appendChild(btn)
    btn.addEventListener('click', (e) => {
      e.preventDefault()
      e.stopPropagation()
      const urls = collectImageUrls(el)
      const src = img.currentSrc || img.src
      const idx = Math.max(0, urls.indexOf(src))
      lightImgs.value = urls.length ? urls : [src]
      lightIndex.value = urls.length ? idx : 0
      lightVisible.value = true
    })
  })
}

async function refreshDecoration(): Promise<void> {
  await nextTick()
  decorateImages()
}

watch(safeHtml, () => {
  void refreshDecoration()
})

onMounted(() => {
  void refreshDecoration()
})
</script>

<style scoped>
.feedback-rich-body__html {
  margin: 0;
  overflow-wrap: anywhere;
}

.feedback-rich-body__html :deep(p) {
  margin: 0 0 0.5em;
}

.feedback-rich-body__html :deep(p:last-child) {
  margin-bottom: 0;
}

.feedback-rich-body__html :deep(.feedback-rich-body__img-shell) {
  position: relative;
  display: block;
  width: fit-content;
  max-width: 100%;
  margin: 0.5rem 0;
}

.feedback-rich-body__html :deep(.feedback-rich-body__img-shell img) {
  display: block;
  max-width: min(100%, 340px);
  max-height: 220px;
  width: auto;
  height: auto;
  object-fit: contain;
  border-radius: var(--radius-sm);
}

.feedback-rich-body__html :deep(.feedback-rich-body__zoom) {
  position: absolute;
  right: 6px;
  bottom: 6px;
  min-height: 32px;
  padding: 0.2rem 0.55rem;
  border: 1px solid color-mix(in srgb, var(--color-border) 85%, transparent);
  border-radius: 8px;
  font-size: 0.78rem;
  font-weight: 600;
  cursor: pointer;
  color: var(--color-text-strong);
  background: color-mix(in srgb, var(--color-surface-solid) 88%, transparent);
  box-shadow: 0 2px 10px color-mix(in srgb, var(--color-text-strong) 12%, transparent);
  backdrop-filter: blur(8px);
  transition:
    opacity 0.2s ease,
    background 0.2s ease;
}

/* 可悬浮设备：默认略透明，悬停图片再显示按钮 */
@media (hover: hover) and (pointer: fine) {
  .feedback-rich-body__html :deep(.feedback-rich-body__zoom) {
    opacity: 0;
  }

  .feedback-rich-body__html :deep(.feedback-rich-body__img-shell:hover .feedback-rich-body__zoom) {
    opacity: 1;
  }
}
</style>
