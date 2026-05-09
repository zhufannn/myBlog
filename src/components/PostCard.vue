<template>
  <article class="post-card" @click="$emit('open', post.slug)">
    <div class="post-card__cover" :style="{ background: post.cover }">
      <span>{{ post.mood }}</span>
    </div>
    <div class="post-card__body">
      <div class="post-card__meta">
        <span>{{ post.category }}</span>
        <span>{{ post.readTime }}</span>
      </div>
      <h3>{{ post.title }}</h3>
      <p>{{ post.excerpt }}</p>
      <div class="post-card__footer">
        <time :datetime="post.date">{{ formattedDate }}</time>
        <button type="button" aria-label="阅读文章">阅读全文</button>
      </div>
    </div>
  </article>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { BlogPost } from '../types/blog'

const props = defineProps<{
  post: BlogPost
}>()

defineEmits<{
  open: [slug: string]
}>()

const formattedDate = computed(() =>
  new Intl.DateTimeFormat('zh-CN', { year: 'numeric', month: 'short', day: 'numeric' }).format(new Date(props.post.date)),
)
</script>
