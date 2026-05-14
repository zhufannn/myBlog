<!--
  TipTap 富文本：与主流产品类似的粗体/列表/链接/插图（base64）。
-->
<template>
  <div class="rich-editor" :class="{ 'rich-editor--disabled': disabled }">
    <div v-if="editor" class="rich-editor__toolbar" role="toolbar" aria-label="富文本格式">
      <button
        type="button"
        class="rich-editor__tb-btn"
        :class="{ 'is-active': editor.isActive('bold') }"
        title="粗体"
        :aria-pressed="editor.isActive('bold')"
        @click="editor.chain().focus().toggleBold().run()"
      >
        <strong>B</strong>
      </button>
      <button
        type="button"
        class="rich-editor__tb-btn"
        :class="{ 'is-active': editor.isActive('italic') }"
        title="斜体"
        @click="editor.chain().focus().toggleItalic().run()"
      >
        <em>I</em>
      </button>
      <button
        type="button"
        class="rich-editor__tb-btn"
        :class="{ 'is-active': editor.isActive('strike') }"
        title="删除线"
        @click="editor.chain().focus().toggleStrike().run()"
      >
        <s>S</s>
      </button>
      <span class="rich-editor__sep" aria-hidden="true" />
      <button
        type="button"
        class="rich-editor__tb-btn"
        :class="{ 'is-active': editor.isActive('bulletList') }"
        title="无序列表"
        @click="editor.chain().focus().toggleBulletList().run()"
      >
        • 列表
      </button>
      <button
        type="button"
        class="rich-editor__tb-btn"
        :class="{ 'is-active': editor.isActive('orderedList') }"
        title="有序列表"
        @click="editor.chain().focus().toggleOrderedList().run()"
      >
        1. 列表
      </button>
      <span class="rich-editor__sep" aria-hidden="true" />
      <button type="button" class="rich-editor__tb-btn" title="插入链接" @click="promptLink">链接</button>
      <button
        type="button"
        class="rich-editor__tb-btn rich-editor__tb-btn--icon"
        title="插入图片"
        :disabled="disabled"
        @click="pickImage"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6">
          <rect x="3" y="5" width="18" height="14" rx="2" />
          <circle cx="8.5" cy="10" r="1.5" fill="currentColor" stroke="none" />
          <path d="M21 15l-5-5L5 21" stroke-linecap="round" stroke-linejoin="round" />
        </svg>
      </button>
      <input
        ref="fileInputRef"
        type="file"
        class="rich-editor__file"
        accept="image/jpeg,image/png,image/gif,image/webp"
        aria-hidden="true"
        tabindex="-1"
        @change="onImagePicked"
      />
    </div>
    <editor-content :editor="editor" class="rich-editor__content" />
  </div>
</template>

<script setup lang="ts">
import TiptapImage from '@tiptap/extension-image'
import Link from '@tiptap/extension-link'
import Placeholder from '@tiptap/extension-placeholder'
import StarterKit from '@tiptap/starter-kit'
import { EditorContent, useEditor } from '@tiptap/vue-3'
import { onBeforeUnmount, watch, ref } from 'vue'

const props = defineProps<{
  modelValue: string
  disabled?: boolean
  placeholder?: string
  maxHtmlLength?: number
}>()

const emit = defineEmits<{
  'update:modelValue': [html: string]
}>()

const fileInputRef = ref<HTMLInputElement | null>(null)

const maxLen = () => props.maxHtmlLength ?? 2_000_000

const editor = useEditor({
  extensions: [
    StarterKit.configure({
      heading: false,
      codeBlock: false,
    }),
    Link.configure({ openOnClick: false, autolink: true }),
    TiptapImage.configure({ inline: true, allowBase64: true }),
    Placeholder.configure({ placeholder: props.placeholder ?? '输入内容…' }),
  ],
  content: props.modelValue || '',
  editable: !props.disabled,
  editorProps: {
    attributes: {
      class: 'rich-editor__prose',
      spellcheck: 'true',
    },
  },
  onUpdate({ editor: ed }) {
    let html = ed.getHTML()
    if (html.length > maxLen()) {
      html = html.slice(0, maxLen())
      ed.commands.setContent(html, { emitUpdate: false })
    }
    emit('update:modelValue', html)
  },
})

watch(
  () => props.modelValue,
  (v) => {
    const ed = editor.value
    if (!ed || ed.isDestroyed) return
    if (v === ed.getHTML()) return
    ed.commands.setContent(v || '', { emitUpdate: false })
  },
)

watch(
  () => props.disabled,
  (d) => {
    editor.value?.setEditable(!d)
  },
)

onBeforeUnmount(() => {
  editor.value?.destroy()
})

const MAX_SRC_FILE_BYTES = 12 * 1024 * 1024

function loadImageFromFile(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file)
    const img = document.createElement('img')
    img.onload = () => {
      URL.revokeObjectURL(url)
      resolve(img)
    }
    img.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('无法读取图片'))
    }
    img.src = url
  })
}

/**
 * 将图片压成 JPEG data URL，使长度不超过 maxDataUrlLen（留空给 base64 插图）。
 */
async function compressFileToDataUrl(file: File, maxDataUrlLen: number): Promise<string | null> {
  const img = await loadImageFromFile(file)
  if (img.naturalWidth <= 0 || img.naturalHeight <= 0) return null

  const maxSides = [1920, 1440, 1080, 800, 640, 480]
  const qualities = [0.85, 0.75, 0.65, 0.55, 0.45, 0.35]

  for (const maxSide of maxSides) {
    let w = img.naturalWidth
    let h = img.naturalHeight
    const scale = Math.min(1, maxSide / Math.max(w, h))
    w = Math.max(1, Math.round(w * scale))
    h = Math.max(1, Math.round(h * scale))

    const canvas = document.createElement('canvas')
    canvas.width = w
    canvas.height = h
    const ctx = canvas.getContext('2d')
    if (!ctx) return null
    ctx.drawImage(img, 0, 0, w, h)

    for (const q of qualities) {
      const dataUrl = canvas.toDataURL('image/jpeg', q)
      if (dataUrl.length <= maxDataUrlLen) return dataUrl
    }
  }
  return null
}

function promptLink(): void {
  const ed = editor.value
  if (!ed || props.disabled) return
  const prev = ed.getAttributes('link').href as string | undefined
  const url = window.prompt('链接地址（https:// 开头）', prev || 'https://')
  if (url == null || url.trim() === '') {
    ed.chain().focus().extendMarkRange('link').unsetLink().run()
    return
  }
  const u = url.trim()
  if (!/^https?:\/\//i.test(u)) {
    window.alert('请使用 http:// 或 https:// 开头的地址')
    return
  }
  ed.chain().focus().extendMarkRange('link').setLink({ href: u, rel: 'noopener noreferrer', target: '_blank' }).run()
}

function pickImage(): void {
  if (props.disabled) return
  fileInputRef.value?.click()
}

function onImagePicked(ev: Event): void {
  const ed = editor.value
  const input = ev.target as HTMLInputElement
  const file = input.files?.[0]
  input.value = ''
  if (!file || !ed || props.disabled) return
  if (file.size > MAX_SRC_FILE_BYTES) {
    window.alert('图片文件过大（最大 12MB），请选择较小的文件')
    return
  }

  const budget = maxLen() - ed.getHTML().length - 200
  if (budget < 8000) {
    window.alert('正文过长，无法再插入图片，请先删减内容')
    return
  }

  void (async () => {
    try {
      const dataUrl = await compressFileToDataUrl(file, budget)
      if (!dataUrl) {
        window.alert('图片压缩后仍超出长度限制，请换更小的图或删减正文')
        return
      }
      ed.chain().focus().setImage({ src: dataUrl, alt: file.name || 'image' }).run()
      emit('update:modelValue', ed.getHTML())
    } catch {
      window.alert('图片处理失败，请换一张图重试')
    }
  })()
}
</script>

<style scoped>
.rich-editor {
  border-radius: var(--radius-md);
  border: 1px solid var(--color-border);
  background: var(--color-surface-solid);
  overflow: hidden;
  transition:
    border-color 0.28s var(--ease-soft),
    box-shadow 0.28s var(--ease-soft);
}

.rich-editor:focus-within {
  border-color: color-mix(in srgb, var(--color-accent-strong) 52%, transparent);
  box-shadow: 0 0 0 3px color-mix(in srgb, var(--color-accent) 22%, transparent);
}

.rich-editor--disabled {
  opacity: 0.72;
  pointer-events: none;
}

.rich-editor__toolbar {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.35rem;
  padding: 0.5rem 0.55rem;
  border-bottom: 1px solid var(--color-border);
  background: color-mix(in srgb, var(--color-accent) 5%, var(--color-surface-solid));
}

.rich-editor__sep {
  width: 1px;
  height: 1.25rem;
  background: var(--color-border);
  margin: 0 0.15rem;
}

.rich-editor__tb-btn {
  min-height: 36px;
  min-width: 36px;
  padding: 0.25rem 0.55rem;
  border: 1px solid transparent;
  border-radius: 8px;
  background: color-mix(in srgb, var(--color-surface-solid) 72%, transparent);
  color: var(--color-text-strong);
  font-size: 0.8125rem;
  cursor: pointer;
  transition:
    background 0.2s ease,
    border-color 0.2s ease,
    color 0.2s ease;
}

.rich-editor__tb-btn:hover {
  background: color-mix(in srgb, var(--color-accent) 14%, var(--color-surface-solid));
  border-color: color-mix(in srgb, var(--color-border) 80%, transparent);
}

.rich-editor__tb-btn.is-active {
  border-color: color-mix(in srgb, var(--color-accent-strong) 45%, transparent);
  background: color-mix(in srgb, var(--color-accent) 18%, transparent);
  color: var(--color-accent-strong);
}

.rich-editor__tb-btn--icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0.35rem;
}

.rich-editor__file {
  position: absolute;
  width: 0;
  height: 0;
  opacity: 0;
  pointer-events: none;
}

.rich-editor__content :deep(.rich-editor__prose) {
  min-height: 140px;
  max-height: min(48vh, 420px);
  overflow-y: auto;
  padding: 0.85rem 1rem;
  outline: none;
  font-size: 0.935rem;
  line-height: 1.65;
  color: var(--color-text-strong);
}

.rich-editor__content :deep(.rich-editor__prose p) {
  margin: 0 0 0.6em;
}

.rich-editor__content :deep(.rich-editor__prose p:last-child) {
  margin-bottom: 0;
}

.rich-editor__content :deep(.rich-editor__prose img) {
  max-width: 100%;
  height: auto;
  border-radius: var(--radius-sm);
  display: block;
  margin: 0.5rem 0;
}

.rich-editor__content :deep(.rich-editor__prose a) {
  color: var(--color-accent-strong);
  text-decoration: underline;
  text-underline-offset: 2px;
}

.rich-editor__content :deep(.rich-editor__prose ul),
.rich-editor__content :deep(.rich-editor__prose ol) {
  margin: 0.35rem 0 0.65rem;
  padding-left: 1.35rem;
}
</style>
