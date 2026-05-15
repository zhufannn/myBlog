<!--
  文库正文编辑：yuque-editor-core（Lake）离线资源 + Vue 封装。
  静态资源由 vite.config 中 yuqueAssets 插件拷贝至 public/yuque-assets。
-->
<template>
  <div
    ref="rootEl"
    class="yuque-doc-editor"
    :class="{
      'yuque-doc-editor--compact': compact,
      'yuque-doc-editor--layout-fill': layoutFill,
    }"
  >
    <YuqueRichText
      :value="editorValue"
      scheme="text/html"
      :read-only="readOnly"
      :show-toolbar="!readOnly"
      :show-toc="false"
      :dark-mode="darkMode"
      @change="onChange"
      @error="onError"
    />
    <p v-if="showHint && lengthHint" class="yuque-doc-editor__hint meta-quiet">{{ lengthHint }}</p>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import YuqueRichText from 'yuque-editor-core/vue'

const props = withDefaults(
  defineProps<{
    /** v-model：HTML 正文 */
    modelValue: string
    readOnly?: boolean
    darkMode?: boolean
    /** 超过时仅提示，仍同步全文（保存时后端还会校验） */
    maxHtmlLength?: number
    compact?: boolean
    /** 只读预览时可关闭字数提示 */
    showHint?: boolean
    /**
     * 占满父级高度：工具栏固定，仅正文区域垂直滚动（文库内联编辑）。
     */
    layoutFill?: boolean
  }>(),
  {
    readOnly: false,
    darkMode: false,
    maxHtmlLength: 4_900_000,
    compact: false,
    showHint: true,
    layoutFill: false,
  },
)

const emit = defineEmits<{ 'update:modelValue': [v: string] }>()

const rootEl = ref<HTMLElement | null>(null)

/** Lake 不接受空字符串作为初始文档 */
const editorValue = computed(() => {
  const v = props.modelValue ?? ''
  return v.trim() === '' ? '<p></p>' : v
})

const lengthHint = ref('')

watch(
  () => props.modelValue,
  (v) => {
    const len = (v ?? '').length
    if (!props.showHint) {
      lengthHint.value = ''
      return
    }
    if (props.maxHtmlLength > 0 && len > props.maxHtmlLength) {
      lengthHint.value = `当前约 ${len} 字符，已超过建议上限 ${props.maxHtmlLength}，保存可能被服务端拒绝。`
    } else {
      lengthHint.value = ''
    }
  },
  { immediate: true },
)

function onChange(next: string): void {
  if (props.readOnly) return
  emit('update:modelValue', next)
  if (!props.showHint) return
  if (props.maxHtmlLength > 0 && next.length > props.maxHtmlLength) {
    lengthHint.value = `当前约 ${next.length} 字符，已超过建议上限 ${props.maxHtmlLength}，保存可能被服务端拒绝。`
  } else {
    lengthHint.value = ''
  }
}

function onError(err: unknown): void {
  console.error('[YuqueDocEditor]', err)
}

function escapeCssId(id: string): string {
  if (typeof CSS !== 'undefined' && typeof CSS.escape === 'function') {
    return CSS.escape(id)
  }
  return id.replace(/([^\w\u0080-\uFFFF-])/g, '\\$1')
}

/** 在大纲或外链中滚动到对应标题（依赖正文 HTML 已为 h1–h3 注入 id） */
function scrollToAnchor(anchorId: string, headingIndex?: number): void {
  const root = rootEl.value
  if (!root || !anchorId.trim()) return
  let el: HTMLElement | null = null
  try {
    el = root.querySelector(`#${escapeCssId(anchorId)}`) as HTMLElement | null
  } catch {
    el = null
  }
  if (!el) {
    try {
      el = root.querySelector(`[id="${anchorId.replace(/"/g, '')}"]`) as HTMLElement | null
    } catch {
      el = null
    }
  }
  if (!el && headingIndex != null && headingIndex >= 0) {
    const heads = root.querySelectorAll('h1, h2, h3')
    el = heads.item(headingIndex) as HTMLElement | null
  }
  el?.scrollIntoView({ behavior: 'smooth', block: 'start' })
}

defineExpose({ scrollToAnchor })
</script>

<style scoped>
.yuque-doc-editor {
  min-height: min(420px, 55vh);
  width: 100%;
}

.yuque-doc-editor--compact {
  min-height: min(280px, 45vh);
}

.yuque-doc-editor__hint {
  margin: 0.5rem 0 0;
  font-size: 0.82rem;
}

/**
 * Lake 默认 .ne-editor-wrap 整体滚动；改为仅 .ne-editor-body 内滚动，工具栏固定。
 * 注意：createYuqueEditor 会在 Vue 的 div 下再套一层 root，.ne-editor 不是「直接子节点」，
 * 不能用 `> div > .ne-editor`，否则 flex/overflow 整链断掉，表现为无法滚动。
 */
.yuque-doc-editor--layout-fill {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  height: 100%;
}

.yuque-doc-editor--layout-fill > div {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.yuque-doc-editor--layout-fill > div > * {
  flex: 1;
  min-height: 0;
  min-width: 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.yuque-doc-editor--layout-fill :deep(.ne-layout-mode-fixed.ne-editor),
.yuque-doc-editor--layout-fill :deep(.ne-layout-mode-adapt.ne-editor),
.yuque-doc-editor--layout-fill :deep(.ne-simple-ui.ne-editor) {
  flex: 1;
  min-height: 0;
  height: auto !important;
  max-height: none !important;
  overflow: hidden !important;
}

.yuque-doc-editor--layout-fill :deep(.ne-layout-mode-fixed.ne-editor),
.yuque-doc-editor--layout-fill :deep(.ne-layout-mode-adapt.ne-editor) {
  display: flex !important;
  flex-direction: column !important;
}

.yuque-doc-editor--layout-fill :deep(.ne-ui) {
  flex-shrink: 0;
}

.yuque-doc-editor--layout-fill :deep(.ne-editor-wrap) {
  flex: 1;
  min-height: 0 !important;
  height: auto !important;
  max-height: none !important;
  display: flex !important;
  flex-direction: column !important;
  overflow: hidden !important;
}

.yuque-doc-editor--layout-fill :deep(.ne-editor-body) {
  flex: 1;
  min-height: 0 !important;
  height: auto !important;
  max-height: none !important;
  overflow-x: hidden !important;
  overflow-y: auto !important;
  -webkit-overflow-scrolling: touch;
}

/** 小包皮肤下 wrap 常为 height:auto overflow:visible */
.yuque-doc-editor--layout-fill :deep(.ne-simple-ui .ne-editor-wrap) {
  flex: 1;
  min-height: 0 !important;
  overflow: hidden !important;
}

.yuque-doc-editor--layout-fill :deep(.ne-simple-ui .ne-editor-body) {
  flex: 1;
  min-height: 0 !important;
  overflow-y: auto !important;
  overflow-x: hidden !important;
}

.yuque-doc-editor--layout-fill :deep(.ne-editor-wrap-content),
.yuque-doc-editor--layout-fill :deep(.ne-editor-outer-wrap-box) {
  min-width: 0 !important;
}
</style>
