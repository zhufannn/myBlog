<!--
  全部分页列表：每页 10 条，独立路由 #feedback-all。
-->
<template>
  <article class="feedback-full stack-subpage surface-card surface-card--block" aria-labelledby="feedback-full-title">
    <header class="feedback-full__hero">
      <a class="feedback-full__back text-link-soft meta-quiet" href="#" @click.prevent="$emit('back')">
        ← 返回反馈
      </a>
      <p class="eyebrow">Feedback · 全部</p>
      <h1 id="feedback-full-title" class="text-shimmer feedback-full__title">全部反馈</h1>
      <p class="feedback-full__subtitle meta-quiet">按时间倒序，每页 10 条。</p>
    </header>

    <p v-if="listLoading" class="lede-secondary feedback-full__empty">加载中…</p>
    <template v-else>
      <ul v-if="pageItems.length" class="feedback-full__list">
        <li v-for="item in pageItems" :key="item.id" class="feedback-full__item surface-card surface-card--inset">
          <div class="feedback-full__meta">
            <span class="feedback-full__name">{{ item.authorLabel }}</span>
            <span class="meta-quiet">{{ item.role === 'member' ? '正式' : '游客' }}</span>
            <time class="meta-quiet feedback-full__time" :datetime="item.createdAt">{{ formatTime(item.createdAt) }}</time>
          </div>
          <FeedbackRichBody class="feedback-full__body lede-secondary" :html="item.message" />
        </li>
      </ul>
      <p v-else class="lede-secondary feedback-full__empty">暂无反馈。</p>

      <nav v-if="totalPages > 1" class="feedback-full__pager" aria-label="分页">
        <button
          type="button"
          class="btn btn-ghost feedback-full__page-btn"
          :disabled="page <= 1"
          @click="page = page - 1"
        >
          上一页
        </button>
        <span class="meta-quiet feedback-full__page-info">{{ page }} / {{ totalPages }}</span>
        <button
          type="button"
          class="btn btn-ghost feedback-full__page-btn"
          :disabled="page >= totalPages"
          @click="page = page + 1"
        >
          下一页
        </button>
      </nav>
    </template>
  </article>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { loadFeedbackFromProject, type FeedbackRecord } from '../composables/useFeedback'
import FeedbackRichBody from './FeedbackRichBody.vue'

defineEmits<{ back: [] }>()

const PAGE_SIZE = 10

const items = ref<FeedbackRecord[]>([])
const listLoading = ref(true)
const page = ref(1)

const totalPages = computed(() => Math.max(1, Math.ceil(items.value.length / PAGE_SIZE)))

const pageItems = computed(() => {
  const start = (page.value - 1) * PAGE_SIZE
  return items.value.slice(start, start + PAGE_SIZE)
})

watch(items, () => {
  const maxP = Math.max(1, Math.ceil(items.value.length / PAGE_SIZE))
  if (page.value > maxP) page.value = maxP
})

function formatTime(iso: string): string {
  try {
    const d = new Date(iso)
    return d.toLocaleString('zh-CN', { dateStyle: 'short', timeStyle: 'short' })
  } catch {
    return iso
  }
}

onMounted(async () => {
  listLoading.value = true
  try {
    const { items: list } = await loadFeedbackFromProject()
    items.value = list
  } finally {
    listLoading.value = false
  }
})
</script>

<style scoped>
.feedback-full__hero {
  margin-bottom: clamp(1.25rem, 2.5vw, 1.75rem);
}

.feedback-full__back {
  display: inline-block;
  margin-bottom: 0.85rem;
}

.feedback-full__title {
  margin: 0 0 0.5rem;
  font-size: clamp(1.5rem, 2vw + 1rem, 2rem);
}

.feedback-full__subtitle {
  margin: 0;
  line-height: 1.6;
}

.feedback-full__list {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 0.85rem;
}

.feedback-full__meta {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: 0.35rem 0.75rem;
  margin-bottom: 0.5rem;
}

.feedback-full__name {
  font-weight: 600;
  color: var(--color-text-strong);
}

.feedback-full__time {
  margin-left: auto;
  font-size: 0.8125rem;
}

.feedback-full__body {
  margin: 0;
}

.feedback-full__empty {
  margin: 1rem 0;
}

.feedback-full__pager {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: center;
  gap: 0.65rem 1rem;
  margin-top: 1.35rem;
  padding-top: 1rem;
  border-top: 1px solid color-mix(in srgb, var(--color-border) 88%, transparent);
}

.feedback-full__page-btn {
  min-height: 44px;
  min-width: 88px;
}

.feedback-full__page-info {
  font-variant-numeric: tabular-nums;
}
</style>
