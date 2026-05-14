<!--
  反馈：/api/feedback + Vercel Postgres；仅 vite 时可能只读 JSON 快照。
-->
<template>
  <article class="feedback-page stack-subpage surface-card surface-card--block" aria-labelledby="feedback-title">
    <header class="feedback-page__hero">
      <a class="feedback-page__back text-link-soft meta-quiet" href="#" @click.prevent="$emit('back')">← 返回首页</a>
      <p class="eyebrow">Feedback · 意见反馈</p>
      <h1 id="feedback-title" class="text-shimmer feedback-page__title">说说你的想法</h1>
      <p class="feedback-page__subtitle meta-quiet">
        数据保存在
        <strong class="feedback-page__role">Vercel Postgres</strong>
        （经
        <code class="feedback-page__path">/api/feedback</code>
        读写）。当前身份：
        <strong class="feedback-page__role">{{ roleLabel }}</strong>
      </p>
      <p v-if="readOnlyNotice" class="feedback-page__notice meta-quiet" role="status">
        当前未连上数据库 API（例如仅跑了
        <code class="feedback-page__path">npm run dev</code>
        且未配置转发）：列表为构建时 JSON 快照。部署到 Vercel 并关联 Postgres 后，或使用
        <code class="feedback-page__path">npm run dev:vercel</code>
        本地联调。
      </p>
    </header>

    <section class="feedback-section" aria-labelledby="feedback-form-heading">
      <h2 id="feedback-form-heading" class="feedback-h2 text-shimmer">提交反馈</h2>
      <hr class="section-rule" aria-hidden="true" />
      <label class="feedback-field">
        <span class="meta-quiet feedback-field__label">内容（富文本，可插图）</span>
        <RichFeedbackEditor
          v-model="messageHtml"
          :disabled="readOnlyNotice"
          placeholder="功能建议、页面问题……支持粗体、列表、链接与图片。"
          :max-html-length="MAX_HTML"
        />
      </label>
      <p id="feedback-hint" class="meta-quiet feedback-hint">当前约 {{ htmlBytesLabel }}（上限 {{ MAX_HTML.toLocaleString() }} 字符）</p>
      <transition name="login-error-pop">
        <p v-if="formError" class="feedback-form-error" role="alert">{{ formError }}</p>
      </transition>
      <button
        class="btn btn-primary feedback-submit"
        type="button"
        :disabled="submitting || readOnlyNotice"
        @click="submit"
      >
        {{ submitting ? '提交中…' : readOnlyNotice ? '当前不可提交' : '提交反馈' }}
      </button>
    </section>

    <section class="feedback-section" aria-labelledby="feedback-list-heading">
      <div class="feedback-section__head">
        <h2 id="feedback-list-heading" class="feedback-h2 text-shimmer">已收到的反馈</h2>
        <button v-if="items.length" type="button" class="btn btn-ghost btn--sm feedback-all-btn" @click="openFullList">
          全部
        </button>
      </div>
      <hr class="section-rule" aria-hidden="true" />
      <p v-if="listLoading" class="lede-secondary feedback-empty">加载中…</p>
      <template v-else-if="items.length">
        <ul class="feedback-list">
          <li v-for="item in mainPageItems" :key="item.id" class="feedback-item surface-card surface-card--inset">
            <div class="feedback-item__meta">
              <span class="feedback-item__name">{{ item.authorLabel }}</span>
              <span class="meta-quiet feedback-item__role">{{ item.role === 'member' ? '正式' : '游客' }}</span>
              <time class="meta-quiet feedback-item__time" :datetime="item.createdAt">{{ formatTime(item.createdAt) }}</time>
            </div>
            <FeedbackRichBody class="feedback-item__body lede-secondary" :html="item.message" />
          </li>
        </ul>
        <nav v-if="totalMainPages > 1" class="feedback-pager" aria-label="反馈列表分页">
          <button
            type="button"
            class="btn btn-ghost feedback-pager__btn"
            :disabled="mainPage <= 1"
            @click="mainPage = mainPage - 1"
          >
            上一页
          </button>
          <span class="meta-quiet feedback-pager__info">{{ mainPage }} / {{ totalMainPages }}</span>
          <button
            type="button"
            class="btn btn-ghost feedback-pager__btn"
            :disabled="mainPage >= totalMainPages"
            @click="mainPage = mainPage + 1"
          >
            下一页
          </button>
        </nav>
      </template>
      <p v-else class="lede-secondary feedback-empty">还没有反馈，快来写第一条吧。</p>
    </section>
  </article>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import type { AuthRole } from '../composables/useBlogAuth'
import { readMemberDisplayName } from '../composables/useBlogAuth'
import {
  appendFeedbackToProject,
  loadFeedbackFromProject,
  type FeedbackRecord,
} from '../composables/useFeedback'
import RichFeedbackEditor from './RichFeedbackEditor.vue'
import FeedbackRichBody from './FeedbackRichBody.vue'

const props = defineProps<{
  role: AuthRole
}>()

defineEmits<{
  back: []
}>()

const MAX_HTML = 2_000_000
const PAGE_SIZE_MAIN = 5

const messageHtml = ref('<p></p>')
const formError = ref('')
const items = ref<FeedbackRecord[]>([])
const readOnlyNotice = ref(false)
const listLoading = ref(true)
const submitting = ref(false)
const mainPage = ref(1)

const roleLabel = computed(() =>
  props.role === 'member' ? `正式（${readMemberDisplayName()}）` : '游客',
)

const htmlBytesLabel = computed(() => `${messageHtml.value.length.toLocaleString()} 字符`)

const totalMainPages = computed(() => Math.max(1, Math.ceil(items.value.length / PAGE_SIZE_MAIN)))

const mainPageItems = computed(() => {
  const start = (mainPage.value - 1) * PAGE_SIZE_MAIN
  return items.value.slice(start, start + PAGE_SIZE_MAIN)
})

watch(items, () => {
  const maxP = Math.max(1, Math.ceil(items.value.length / PAGE_SIZE_MAIN))
  if (mainPage.value > maxP) mainPage.value = maxP
})

function hasMeaningfulRichContent(html: string): boolean {
  const div = document.createElement('div')
  div.innerHTML = html
  const text = (div.textContent || '').replace(/\u200b/g, '').trim()
  if (text.length > 0) return true
  return div.querySelector('img') !== null
}

async function refresh(): Promise<void> {
  const { items: list, live } = await loadFeedbackFromProject()
  items.value = list
  readOnlyNotice.value = !live
}

function formatTime(iso: string): string {
  try {
    const d = new Date(iso)
    return d.toLocaleString('zh-CN', { dateStyle: 'short', timeStyle: 'short' })
  } catch {
    return iso
  }
}

function openFullList(): void {
  window.location.hash = '#feedback-all'
}

async function submit(): Promise<void> {
  formError.value = ''
  const html = messageHtml.value.trim()
  if (!hasMeaningfulRichContent(html)) {
    formError.value = '请填写反馈内容或插入图片'
    return
  }
  if (html.length > MAX_HTML) {
    formError.value = '内容过长，请删减后再试'
    return
  }
  submitting.value = true
  try {
    await appendFeedbackToProject({
      role: props.role,
      authorLabel: props.role === 'member' ? readMemberDisplayName() : '游客',
      message: html,
    })
    messageHtml.value = '<p></p>'
    mainPage.value = 1
    await refresh()
  } catch (e) {
    formError.value = e instanceof Error ? e.message : '提交失败'
  } finally {
    submitting.value = false
  }
}

onMounted(async () => {
  listLoading.value = true
  try {
    await refresh()
  } finally {
    listLoading.value = false
  }
})
</script>

<style scoped>
.feedback-page__hero {
  margin-bottom: clamp(1.5rem, 3vw, 2rem);
}

.feedback-page__back {
  display: inline-block;
  margin-bottom: 1rem;
}

.feedback-page__title {
  margin: 0 0 0.65rem;
  font-size: clamp(1.65rem, 2.4vw + 1rem, 2.25rem);
}

.feedback-page__subtitle {
  margin: 0;
  line-height: 1.65;
}

.feedback-page__path {
  font-size: 0.82em;
  padding: 0.12rem 0.35rem;
  border-radius: 6px;
  background: color-mix(in srgb, var(--color-accent) 12%, transparent);
  color: var(--color-text-muted);
}

.feedback-page__notice {
  margin: 0.75rem 0 0;
  padding: 0.65rem 0.85rem;
  border-radius: var(--radius-sm);
  border: 1px solid color-mix(in srgb, var(--color-border) 90%, transparent);
  background: color-mix(in srgb, var(--color-accent) 8%, transparent);
  line-height: 1.55;
}

.feedback-page__role {
  font-weight: 600;
  color: var(--color-text-muted);
}

.feedback-section + .feedback-section {
  margin-top: clamp(1.75rem, 3vw, 2.35rem);
}

.feedback-section__head {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 0.65rem 1rem;
}

.feedback-h2 {
  margin: 0 0 0.75rem;
  font-size: clamp(1.2rem, 1.2vw + 1rem, 1.45rem);
  font-weight: 650;
  letter-spacing: -0.02em;
}

.feedback-section__head .feedback-h2 {
  margin-bottom: 0;
}

.feedback-all-btn {
  min-height: 40px;
}

.feedback-field {
  display: flex;
  flex-direction: column;
  gap: 0.45rem;
  margin-top: 1rem;
}

.feedback-field__label {
  padding-left: 0.12rem;
}

.feedback-hint {
  margin: 0.35rem 0 0;
  font-variant-numeric: tabular-nums;
}

.feedback-form-error {
  margin: 0.65rem 0 0;
  padding: 0.6rem 0.8rem;
  border-radius: var(--radius-sm);
  font-size: 0.8625rem;
  color: color-mix(in srgb, #b42318 82%, var(--color-text-strong));
  background: color-mix(in srgb, #b42318 9%, var(--color-surface-solid));
  border: 1px solid color-mix(in srgb, #b42318 22%, transparent);
}

:global(html.theme-dark) .feedback-form-error {
  color: color-mix(in srgb, #fca5a5 92%, white);
  background: color-mix(in srgb, #f87171 10%, var(--color-surface-solid));
  border-color: color-mix(in srgb, #f87171 26%, transparent);
}

.feedback-submit {
  margin-top: 1.1rem;
}

.feedback-list {
  list-style: none;
  padding: 0;
  margin: 1rem 0 0;
  display: flex;
  flex-direction: column;
  gap: 0.85rem;
}

.feedback-item__meta {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: 0.35rem 0.75rem;
  margin-bottom: 0.5rem;
}

.feedback-item__name {
  font-weight: 600;
  color: var(--color-text-strong);
}

.feedback-item__role {
  font-size: 0.8125rem;
}

.feedback-item__time {
  margin-left: auto;
  font-size: 0.8125rem;
}

.feedback-item__body {
  margin: 0;
}

.feedback-empty {
  margin: 1rem 0 0;
}

.feedback-pager {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: center;
  gap: 0.65rem 1rem;
  margin-top: 1.1rem;
}

.feedback-pager__btn {
  min-height: 44px;
  min-width: 88px;
}

.feedback-pager__info {
  font-variant-numeric: tabular-nums;
}

.login-error-pop-enter-active,
.login-error-pop-leave-active {
  transition:
    opacity 0.28s var(--ease-soft),
    transform 0.32s var(--ease-out);
}

.login-error-pop-enter-from,
.login-error-pop-leave-to {
  opacity: 0;
  transform: translateY(-6px);
}
</style>
