<!--
  反馈：写入本地列表，游客与正式账号均可用。
-->
<template>
  <article class="feedback-page surface-card surface-card--block" aria-labelledby="feedback-title">
    <header class="feedback-page__hero">
      <a class="feedback-page__back text-link-soft meta-quiet" href="#" @click.prevent="$emit('back')">← 返回首页</a>
      <p class="eyebrow">Feedback · 意见反馈</p>
      <h1 id="feedback-title" class="text-shimmer feedback-page__title">说说你的想法</h1>
      <p class="feedback-page__subtitle meta-quiet">
        内容保存在本机浏览器。身份：
        <strong class="feedback-page__role">{{ roleLabel }}</strong>
      </p>
    </header>

    <section class="feedback-section" aria-labelledby="feedback-form-heading">
      <h2 id="feedback-form-heading" class="feedback-h2 text-shimmer">提交反馈</h2>
      <hr class="section-rule" aria-hidden="true" />
      <label class="feedback-field">
        <span class="meta-quiet feedback-field__label">内容</span>
        <textarea
          v-model.trim="message"
          class="feedback-textarea"
          rows="5"
          maxlength="2000"
          placeholder="功能建议、页面问题、内容相关……"
          aria-describedby="feedback-hint"
        />
      </label>
      <p id="feedback-hint" class="meta-quiet feedback-hint">还可输入 {{ remaining }} 字</p>
      <transition name="login-error-pop">
        <p v-if="formError" class="feedback-form-error" role="alert">{{ formError }}</p>
      </transition>
      <button class="btn btn-primary feedback-submit" type="button" @click="submit">提交反馈</button>
    </section>

    <section class="feedback-section" aria-labelledby="feedback-list-heading">
      <h2 id="feedback-list-heading" class="feedback-h2 text-shimmer">已收到的反馈</h2>
      <hr class="section-rule" aria-hidden="true" />
      <ul v-if="items.length" class="feedback-list">
        <li v-for="item in items" :key="item.id" class="feedback-item surface-card surface-card--inset">
          <div class="feedback-item__meta">
            <span class="feedback-item__name">{{ item.authorLabel }}</span>
            <span class="meta-quiet feedback-item__role">{{ item.role === 'member' ? '正式' : '游客' }}</span>
            <time class="meta-quiet feedback-item__time" :datetime="item.createdAt">{{ formatTime(item.createdAt) }}</time>
          </div>
          <p class="lede-secondary feedback-item__body">{{ item.message }}</p>
        </li>
      </ul>
      <p v-else class="lede-secondary feedback-empty">还没有反馈，快来写第一条吧。</p>
    </section>
  </article>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import type { AuthRole } from '../composables/useBlogAuth'
import { MEMBER_PUBLIC_NAME } from '../composables/useBlogAuth'
import { appendFeedback, loadFeedback, type FeedbackRecord } from '../composables/useFeedback'

const props = defineProps<{
  role: AuthRole
}>()

defineEmits<{
  back: []
}>()

const message = ref('')
const formError = ref('')
const items = ref<FeedbackRecord[]>(loadFeedback())

const roleLabel = computed(() => (props.role === 'member' ? `正式（${MEMBER_PUBLIC_NAME}）` : '游客'))

const remaining = computed(() => Math.max(0, 2000 - message.value.length))

function refresh(): void {
  items.value = loadFeedback()
}

function formatTime(iso: string): string {
  try {
    const d = new Date(iso)
    return d.toLocaleString('zh-CN', { dateStyle: 'short', timeStyle: 'short' })
  } catch {
    return iso
  }
}

function submit(): void {
  formError.value = ''
  const text = message.value.trim()
  if (!text) {
    formError.value = '请填写反馈内容'
    return
  }
  appendFeedback({
    role: props.role,
    authorLabel: props.role === 'member' ? MEMBER_PUBLIC_NAME : '游客',
    message: text,
  })
  message.value = ''
  refresh()
}
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
}

.feedback-page__role {
  font-weight: 600;
  color: var(--color-text-muted);
}

.feedback-section + .feedback-section {
  margin-top: clamp(1.75rem, 3vw, 2.35rem);
}

.feedback-h2 {
  margin: 0 0 0.75rem;
  font-size: clamp(1.2rem, 1.2vw + 1rem, 1.45rem);
  font-weight: 650;
  letter-spacing: -0.02em;
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

.feedback-textarea {
  width: 100%;
  min-height: 120px;
  padding: 0.85rem 1rem;
  border-radius: var(--radius-md);
  border: 1px solid var(--color-border);
  background: var(--color-surface-solid);
  color: var(--color-text-strong);
  font: inherit;
  font-size: 0.935rem;
  line-height: 1.65;
  resize: vertical;
  transition:
    border-color 0.28s var(--ease-soft),
    box-shadow 0.28s var(--ease-soft);
}

.feedback-textarea:focus {
  outline: none;
  border-color: color-mix(in srgb, var(--color-accent-strong) 52%, transparent);
  box-shadow: 0 0 0 3px color-mix(in srgb, var(--color-accent) 22%, transparent);
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
  white-space: pre-wrap;
  overflow-wrap: anywhere;
}

.feedback-empty {
  margin: 1rem 0 0;
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
