<template>
  <div class="tab-page tab-page--about">
    <section id="about" class="about-section" :style="aboutParallaxStyle">
      <div class="surface-card surface-card--block about-panel">
        <p class="eyebrow">About</p>
        <h2 class="text-shimmer">写给长期主义的个人空间</h2>
        <hr class="section-rule" aria-hidden="true" />
        <p class="lede-secondary">
          这个博客以轻量数据文件承载内容，方便维护与迁移。结构保留作者简介、筛选、订阅等真实博客该有的入口。
        </p>
      </div>
      <div class="link-list">
        <a
          v-for="link in visibleLinks"
          :key="link.label"
          class="surface-card link-tile hover-lift text-link-soft"
          :href="link.href"
          target="_blank"
          rel="noreferrer"
        >
          <span class="meta-quiet">{{ link.label }}</span>
          <strong class="tile-value">{{ link.value }}</strong>
          <svg class="link-tile__chev" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true">
            <path d="M9 18l6-6-6-6" stroke-linecap="round" stroke-linejoin="round" />
          </svg>
        </a>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import type { StyleValue } from 'vue'
import type { ProfileLink } from '../../types/blog'

defineProps<{
  aboutParallaxStyle: StyleValue
  visibleLinks: ProfileLink[]
}>()
</script>
