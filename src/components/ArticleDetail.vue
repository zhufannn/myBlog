<template>
  <section class="article-detail" v-if="post">
    <button class="ghost-button" type="button" @click="$emit('close')">返回文章列表</button>
    <div class="article-detail__hero" :style="{ background: post.cover }">
      <span>{{ post.category }}</span>
      <h2>{{ post.title }}</h2>
      <p>{{ post.excerpt }}</p>
    </div>
    <div class="article-detail__meta">
      <time :datetime="post.date">{{ formattedDate }}</time>
      <span>{{ post.readTime }}</span>
      <span v-for="tag in post.tags" :key="tag"># {{ tag }}</span>
    </div>
    <div class="article-detail__content">
      <p v-for="paragraph in post.content" :key="paragraph">{{ paragraph }}</p>
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
