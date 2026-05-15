<!--
  文档评论列表（分页）+ 发表（游客/会员，与全站反馈规则一致）。
-->
<template>
  <section class="doc-comments surface-card surface-card--inset" aria-label="评论">
    <h3 class="doc-comments__title">评论</h3>

    <div v-if="loading" class="meta-quiet">加载中…</div>
    <ul v-else-if="items.length" class="doc-comments__list">
      <li v-for="c in items" :key="c.id" class="doc-comments__item">
        <div class="doc-comments__meta">
          <strong>{{ c.authorLabel }}</strong>
          <time class="meta-quiet" :datetime="c.createdAt">{{ formatDate(c.createdAt) }}</time>
        </div>
        <FeedbackRichBody class="doc-comments__body" :html="c.message" />
      </li>
    </ul>
    <p v-else class="lede-secondary">暂无评论，来抢沙发。</p>

    <div v-if="totalPages > 1" class="doc-comments__pager" role="navigation" aria-label="评论分页">
      <button class="btn btn-ghost btn--sm" type="button" :disabled="page <= 1" @click="goPage(page - 1)">
        上一页
      </button>
      <span class="meta-quiet">{{ page }} / {{ totalPages }}</span>
      <button
        class="btn btn-ghost btn--sm"
        type="button"
        :disabled="page >= totalPages"
        @click="goPage(page + 1)"
      >
        下一页
      </button>
    </div>

    <form v-if="authRole" class="doc-comments__form" @submit.prevent="submit">
      <label v-if="authRole === 'guest'" class="doc-comments__field">
        <span class="meta-quiet">昵称</span>
        <input v-model.trim="authorLabel" type="text" required maxlength="64" placeholder="怎么称呼你" />
      </label>
      <label class="doc-comments__field">
        <span class="meta-quiet">内容</span>
        <textarea v-model="message" rows="4" required maxlength="8000" placeholder="支持换行，提交后会按段落显示。" />
      </label>
      <p v-if="submitError" class="form-message">{{ submitError }}</p>
      <button class="btn btn-primary" type="submit" :disabled="submitting">发表</button>
    </form>
    <p v-else class="meta-quiet">登录后可参与评论。</p>
  </section>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import type { AuthRole } from '../composables/useBlogAuth'
import { readMemberDisplayName } from '../composables/useBlogAuth'
import type { CommentRow } from '../types/library'
import FeedbackRichBody from './FeedbackRichBody.vue'

const props = defineProps<{
  docSlug: string
  authRole: AuthRole | null
}>()

const page = ref(1)
const pageSize = 15
const total = ref(0)
const items = ref<CommentRow[]>([])
const loading = ref(false)

const authorLabel = ref('')
const message = ref('')
const submitError = ref('')
const submitting = ref(false)

const totalPages = computed(() => Math.max(1, Math.ceil(total.value / pageSize)))

watch(
  () => props.authRole,
  (r) => {
    if (r === 'member') {
      authorLabel.value = readMemberDisplayName()
    } else {
      authorLabel.value = ''
    }
  },
  { immediate: true },
)

function formatDate(iso: string): string {
  try {
    return new Intl.DateTimeFormat('zh-CN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(iso))
  } catch {
    return iso
  }
}

function goPage(p: number): void {
  page.value = Math.max(1, Math.min(totalPages.value, p))
}

async function load(): Promise<void> {
  if (!props.docSlug) return
  loading.value = true
  try {
    const r = await fetch(
      `/api/v1/documents/${encodeURIComponent(props.docSlug)}/comments?page=${page.value}&pageSize=${pageSize}`,
    )
    if (!r.ok) {
      items.value = []
      total.value = 0
      return
    }
    const data = (await r.json()) as { total?: number; items?: CommentRow[] }
    total.value = Number(data.total ?? 0)
    items.value = Array.isArray(data.items) ? data.items : []
  } catch {
    items.value = []
    total.value = 0
  } finally {
    loading.value = false
  }
}

watch(
  () => [props.docSlug, page.value] as const,
  () => {
    void load()
  },
  { immediate: true },
)

function escapeToHtml(s: string): string {
  return s
    .trim()
    .split(/\n{2,}/)
    .map((block) => `<p>${escapeToHtmlInline(block).replace(/\n/g, '<br />')}</p>`)
    .join('')
}

function escapeToHtmlInline(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

async function submit(): Promise<void> {
  submitError.value = ''
  const role = props.authRole
  if (!role) return
  const label = role === 'member' ? readMemberDisplayName().trim() || '会员' : authorLabel.value.trim()
  if (!label) {
    submitError.value = '请填写昵称'
    return
  }
  const raw = message.value.trim()
  if (!raw) return
  submitting.value = true
  try {
    const html = escapeToHtml(raw)
    const r = await fetch(`/api/v1/documents/${encodeURIComponent(props.docSlug)}/comments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json; charset=utf-8' },
      body: JSON.stringify({ role, authorLabel: label, message: html }),
    })
    if (!r.ok) {
      const j = (await r.json().catch(() => null)) as { error?: string } | null
      submitError.value = j?.error ?? '发表失败'
      return
    }
    message.value = ''
    page.value = 1
    await load()
  } finally {
    submitting.value = false
  }
}
</script>

<style scoped>
.doc-comments {
  margin-top: 1.75rem;
  padding: 1.25rem 1.35rem;
}

.doc-comments__title {
  margin: 0 0 1rem;
  font-size: 1.1rem;
}

.doc-comments__list {
  list-style: none;
  margin: 0 0 1rem;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.doc-comments__meta {
  display: flex;
  align-items: baseline;
  gap: 0.65rem;
  margin-bottom: 0.35rem;
}

.doc-comments__body {
  font-size: 0.95rem;
}

.doc-comments__pager {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  flex-wrap: wrap;
  margin-bottom: 1rem;
}

.doc-comments__form {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  padding-top: 0.5rem;
  border-top: 1px solid var(--border-subtle, rgba(120, 120, 140, 0.2));
}

.doc-comments__field {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
}

.doc-comments__field input,
.doc-comments__field textarea {
  font: inherit;
  padding: 0.5rem 0.65rem;
  border-radius: 8px;
  border: 1px solid var(--border-subtle, rgba(120, 120, 140, 0.25));
  background: var(--surface-elevated, rgba(255, 255, 255, 0.04));
  color: inherit;
  max-width: 100%;
}

.form-message {
  color: var(--danger, #c45c5c);
  margin: 0;
  font-size: 0.9rem;
}
</style>
