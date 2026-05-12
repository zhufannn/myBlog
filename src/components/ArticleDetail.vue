<template>
  <section class="article-detail" v-if="post">
    <button class="btn btn-ghost ghost-button" type="button" @click="$emit('close')">← 返回列表</button>
    <div class="article-detail__hero" :style="{ background: post.cover }">
      <span>{{ post.category }}</span>
      <h2 class="text-shimmer">{{ post.title }}</h2>
      <p class="hero-excerpt">{{ post.excerpt }}</p>
    </div>
    <div class="article-detail__meta">
      <time :datetime="post.date">{{ formattedDate }}</time>
      <span>{{ post.readTime }}</span>
      <span v-for="tag in post.tags" :key="tag"># {{ tag }}</span>
    </div>
    <div class="article-detail__content">
      <p v-for="paragraph in post.content" :key="paragraph" class="article-para">{{ paragraph }}</p>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { BlogPost } from '../types/blog'

const props = defineProps<{
  post: BlogPost | undefined
}>()

defineEmits<{
  close: []
}>()

const formattedDate = computed(() => {
  if (!props.post) return ''
  return new Intl.DateTimeFormat('zh-CN', { year: 'numeric', month: 'long', day: 'numeric' }).format(new Date(props.post.date))
})
</script>
