<template>
  <!-- 文库内嵌：首行 h1 为标题 + 正文均在语雀编辑器；元信息在文库页右栏 -->
  <section
    v-if="embedded && libraryDoc"
    class="article-detail article-detail--lib"
    :class="{ 'article-detail--lib-editing': libraryEditing }"
  >
    <div
      class="article-detail__sheet"
      :class="libraryEditing ? 'article-detail__sheet--editing-lib' : 'surface-card surface-card--inset'"
    >
      <template v-if="!libraryEditing">
        <div data-article-body="1" class="article-detail__editor-wrap article-detail__editor-wrap--lake-view">
          <YuqueDocEditor
            ref="bodyEditorRef"
            :model-value="safeEmbeddedDisplayHtml"
            read-only
            :dark-mode="Boolean(editorDarkMode)"
            :show-hint="false"
          />
        </div>
      </template>
      <template v-else>
        <label class="article-detail__sr-only" for="lib-body-editor-wrap">正文</label>
        <div
          id="lib-body-editor-wrap"
          data-article-body="1"
          class="article-detail__editor-wrap article-detail__editor-wrap--lake-edit"
        >
          <YuqueDocEditor
            ref="bodyEditorRef"
            v-model="draftBodyHtml"
            layout-fill
            :dark-mode="Boolean(editorDarkMode)"
            :max-html-length="4900000"
          />
        </div>
        <div class="article-detail__edit-toolbar">
          <p v-if="inlineError" class="article-detail__inline-err">{{ inlineError }}</p>
          <div class="article-detail__edit-actions">
            <button
              type="button"
              class="btn btn--icon article-detail__toolbar-icon"
              title="保存"
              aria-label="保存"
              @click="$emit('save-inline')"
            >
              <svg class="article-detail__toolbar-svg" viewBox="0 0 24 24" aria-hidden="true">
                <polyline
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2.25"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  points="20 6 9 17 4 12"
                />
              </svg>
            </button>
            <button
              type="button"
              class="btn btn--icon article-detail__toolbar-icon"
              title="取消"
              aria-label="取消"
              @click="$emit('cancel-inline')"
            >
              <svg class="article-detail__toolbar-svg" viewBox="0 0 24 24" aria-hidden="true">
                <path
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2.25"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  d="M3 7v6h6"
                />
                <path
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2.25"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  d="M21 17a9 9 0 00-18 0"
                />
              </svg>
            </button>
          </div>
        </div>
      </template>
    </div>
    <DocumentComments
      v-if="libraryDoc && !libraryEditing"
      :doc-slug="libraryDoc.slug"
      :auth-role="authRole"
    />
  </section>

  <!-- 博客文章 / 非内嵌文库视图 -->
  <section v-else-if="post || libraryDoc" class="article-detail">
    <button
      v-if="!embedded"
      class="btn btn-ghost ghost-button"
      type="button"
      @click="$emit('close')"
    >
      ← 返回列表
    </button>
    <div class="article-detail__hero" :style="{ background: heroBackground }">
      <span>{{ displayCategory }}</span>
      <h2 class="text-shimmer">{{ displayTitle }}</h2>
      <p class="hero-excerpt">{{ displayExcerpt }}</p>
    </div>
    <div class="article-detail__meta">
      <template v-if="libraryDoc">
        <span>{{ libraryDoc.knowledge_base_title }}</span>
        <span v-if="libraryDoc.folder_title"> / {{ libraryDoc.folder_title }}</span>
        <span>{{ libraryDoc.author_display_name }}</span>
        <time :datetime="libraryDoc.updated_at">{{ formattedUpdated }}</time>
        <span v-for="tag in libraryDoc.tags" :key="tag"># {{ tag }}</span>
      </template>
      <template v-else-if="post">
        <time :datetime="post.date">{{ formattedDate }}</time>
        <span>{{ post.readTime }}</span>
        <span v-for="tag in post.tags" :key="tag"># {{ tag }}</span>
      </template>
    </div>
    <div
      v-if="libraryDoc"
      data-article-body="1"
      class="article-detail__content article-detail__content--rich article-detail__lake-standalone"
    >
      <YuqueDocEditor
        :model-value="safeLibraryHtml"
        read-only
        :dark-mode="Boolean(editorDarkMode)"
        :show-hint="false"
      />
    </div>
    <div v-else class="article-detail__content">
      <p v-for="paragraph in post!.content" :key="paragraph" class="article-para">{{ paragraph }}</p>
    </div>
    <DocumentComments v-if="libraryDoc" :doc-slug="libraryDoc.slug" :auth-role="authRole" />
  </section>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import type { AuthRole } from '../composables/useBlogAuth'
import type { BlogPost } from '../types/blog'
import type { LibraryDocumentDetail } from '../types/library'
import { sanitizeFeedbackHtml } from '../utils/sanitizeFeedbackHtml'
import { injectHeadingAnchors } from '../utils/extractHeadingOutline'
import { mergeTitleLeadingH1 } from '../utils/libraryDocBodyTitle'
import DocumentComments from './DocumentComments.vue'
import YuqueDocEditor from './YuqueDocEditor.vue'

const props = defineProps<{
  post: BlogPost | undefined
  libraryDoc: LibraryDocumentDetail | undefined
  authRole: AuthRole | null
  embedded?: boolean
  /** 文库内嵌：内联编辑标题/正文 */
  libraryEditing?: boolean
  inlineError?: string
  /** 语雀编辑器深色模式 */
  editorDarkMode?: boolean
}>()

const bodyEditorRef = ref<InstanceType<typeof YuqueDocEditor> | null>(null)

const draftBodyHtml = defineModel<string>('draftBodyHtml', { default: '' })

defineEmits<{
  close: []
  'save-inline': []
  'cancel-inline': []
}>()

function scrollToHeading(anchor: string, headingIndex?: number): void {
  bodyEditorRef.value?.scrollToAnchor(anchor, headingIndex)
}

defineExpose({ scrollToHeading })

const safeLibraryHtml = computed(() =>
  props.libraryDoc ? injectHeadingAnchors(sanitizeFeedbackHtml(props.libraryDoc.body_html)) : '',
)

/** 内嵌阅读：首行为 h1 标题（由 DB 标题与正文合并） */
const safeEmbeddedDisplayHtml = computed(() => {
  if (!props.libraryDoc) return ''
  return injectHeadingAnchors(
    sanitizeFeedbackHtml(mergeTitleLeadingH1(props.libraryDoc.title, props.libraryDoc.body_html)),
  )
})

const heroBackground = computed(() => {
  const c = props.libraryDoc?.cover?.trim()
  if (c) return c
  if (props.post?.cover) return props.post.cover
  return 'linear-gradient(145deg, #d8dde4 0%, #bcc4ce 100%)'
})

const displayCategory = computed(() => props.libraryDoc?.category ?? props.post?.category ?? '')

const displayTitle = computed(() => props.libraryDoc?.title ?? props.post?.title ?? '')

const displayExcerpt = computed(() => props.libraryDoc?.excerpt ?? props.post?.excerpt ?? '')

const formattedDate = computed(() => {
  if (!props.post) return ''
  return new Intl.DateTimeFormat('zh-CN', { year: 'numeric', month: 'long', day: 'numeric' }).format(
    new Date(props.post.date),
  )
})

const formattedUpdated = computed(() => {
  if (!props.libraryDoc) return ''
  try {
    return new Intl.DateTimeFormat('zh-CN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(props.libraryDoc.updated_at))
  } catch {
    return props.libraryDoc.updated_at
  }
})
</script>

<style scoped>
.article-detail--lib {
  padding: 0;
  min-width: 0;
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
}

.article-detail__sheet {
  padding: clamp(1rem, 2vw, 1.35rem) clamp(1rem, 2.5vw, 1.5rem);
}

/** 文库内联编辑：占满中间栏高度，无外框（避免与 Lake 叠边） */
.article-detail__sheet--editing-lib {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  margin: 0;
  padding: clamp(0.35rem, 0.75vw, 0.55rem) clamp(0.25rem, 0.65vw, 0.5rem)
    clamp(0.3rem, 0.7vw, 0.5rem);
  border: none;
  box-shadow: none;
  outline: none;
  background: var(--color-surface);
  border-radius: var(--radius-xl);
}

.article-detail__prose {
  padding: 0;
  margin: 0;
  max-width: none;
  border: none;
  background: transparent;
  box-shadow: none;
}

.article-detail__editor-wrap {
  margin-top: 0;
  overflow: hidden;
  background: transparent;
}

.article-detail__editor-wrap--lake-view {
  margin-top: 0.25rem;
  background: var(--surface-elevated, rgba(255, 255, 255, 0.04));
}

.article-detail__editor-wrap--lake-edit {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
}

.article-detail__editor-wrap--lake-edit :deep(.yuque-doc-editor) {
  flex: 1;
  min-height: 0;
}

.article-detail__edit-toolbar {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
  margin-top: 0.5rem;
  flex-shrink: 0;
}

.article-detail__edit-actions {
  display: flex;
  gap: 0.45rem;
}

.article-detail__toolbar-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 2.35rem;
  height: 2.35rem;
  min-height: unset;
  padding: 0;
  border-radius: 10px;
  border: 1px solid color-mix(in srgb, var(--color-accent-strong) 62%, transparent);
  box-shadow: var(--shadow-soft, 0 2px 10px rgba(20, 24, 32, 0.08));
  color: color-mix(in srgb, var(--color-bg) 94%, white);
  background: linear-gradient(135deg, var(--color-accent) 0%, var(--color-accent-strong) 100%);
}

.theme-dark .article-detail__toolbar-icon {
  color: #16181f;
}

.article-detail__toolbar-icon:hover {
  transform: var(--motion-lift);
  box-shadow: var(--shadow-soft-hover, 0 6px 20px rgba(20, 24, 32, 0.12));
}

.article-detail__toolbar-svg {
  width: 1.125rem;
  height: 1.125rem;
  display: block;
  flex-shrink: 0;
}

.article-detail__inline-err {
  margin: 0;
  flex: 1;
  min-width: 0;
  font-size: 0.85rem;
  color: var(--danger, #c45c5c);
}

.article-detail__sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}

.article-detail__content--rich {
  line-height: 1.75;
}

.article-detail__content--rich :deep(p) {
  margin: 0 0 0.85em;
}

.article-detail__content--rich :deep(h1),
.article-detail__content--rich :deep(h2),
.article-detail__content--rich :deep(h3) {
  margin: 1.25em 0 0.5em;
  font-weight: 650;
}

.article-detail__content--rich :deep(pre) {
  overflow: auto;
  padding: 0.75rem 1rem;
  border-radius: 10px;
  background: rgba(120, 120, 140, 0.12);
  font-size: 0.9em;
}

.article-detail__content--rich :deep(blockquote) {
  margin: 0.75em 0;
  padding-left: 1rem;
  border-left: 3px solid rgba(120, 120, 140, 0.45);
  color: var(--color-text-muted);
}
</style>
