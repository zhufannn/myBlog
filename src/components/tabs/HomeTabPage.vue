<template>
  <div class="tab-page tab-page--home">
    <section class="hero-section" :style="heroParallaxStyle">
      <div class="hero-section__content surface-card surface-card--lg">
        <p class="eyebrow">Personal Blog · Vue3 + TypeScript</p>
        <h1 class="text-shimmer heading-display">{{ profile.headline }}</h1>
        <p class="site-slogan" lang="zh-CN">
          <span class="site-slogan__inner">凡心自持，敏思向阳，熙然安生</span>
        </p>
        <hr class="section-rule" aria-hidden="true" />
        <p class="hero-section__intro lede-secondary">
          这里暂存关于前端工程、体验设计、效率系统和生活观察的文章。数据保存在项目内，适合后续接入 CMS 或接口。
        </p>
        <div class="hero-actions">
          <button type="button" class="btn btn-primary" @click="$emit('go-posts')">开始阅读</button>
          <button type="button" class="btn btn-ghost" @click="$emit('go-about')">了解作者</button>
          <button
            v-if="showResumeLinks"
            type="button"
            class="btn btn-ghost"
            @click="$emit('go-resume')"
          >
            个人简历
          </button>
        </div>
      </div>
      <aside class="profile-card surface-card surface-card--lg" aria-label="作者资料">
        <div class="profile-card__accent" aria-hidden="true" />
        <div class="profile-card__head">
          <img class="profile-card__avatar" :src="profile.avatar" :alt="profile.name" loading="lazy" />
          <div class="profile-card__pill">
            <span class="status-dot" aria-hidden="true"></span>
            <span>Open to ideas</span>
          </div>
        </div>
        <h2 class="text-shimmer profile-card__name">{{ profile.name }}</h2>
        <p class="lede-secondary profile-card__role">{{ profile.role }}</p>
        <small class="meta-quiet profile-card__loc">{{ profile.location }}</small>
      </aside>
    </section>

    <hr class="page-gap-rule" aria-hidden="true" />

    <section class="stats-grid" aria-label="博客统计" :style="statsParallaxStyle">
      <div class="surface-card stat-pill hover-lift">
        <svg class="stat-pill__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true">
          <path d="M12 20h9M4 17V4h13v13H4z" stroke-linecap="round" stroke-linejoin="round" />
        </svg>
        <div>
          <strong>{{ gridPostCount }}</strong>
          <span class="meta-quiet">精选文章</span>
        </div>
      </div>
      <div class="surface-card stat-pill hover-lift">
        <svg class="stat-pill__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true">
          <path d="M4 13.5 8 9l4 4 8-9" stroke-linecap="round" stroke-linejoin="round" />
        </svg>
        <div>
          <strong>{{ categoryCount }}</strong>
          <span class="meta-quiet">写作主题</span>
        </div>
      </div>
      <div class="surface-card stat-pill hover-lift">
        <svg class="stat-pill__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true">
          <circle cx="12" cy="12" r="7.25" />
          <path d="M12 8.25v4.25l2.85 2.03" stroke-linecap="round" stroke-linejoin="round" />
        </svg>
        <div>
          <strong>2026</strong>
          <span class="meta-quiet">持续记录</span>
        </div>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import type { StyleValue } from 'vue'

export type HomeProfileBrief = {
  name: string
  role: string
  headline: string
  location: string
  avatar: string
}

defineProps<{
  profile: HomeProfileBrief
  heroParallaxStyle: StyleValue
  statsParallaxStyle: StyleValue
  gridPostCount: number
  categoryCount: number
  showResumeLinks: boolean
}>()

defineEmits<{
  'go-posts': []
  'go-about': []
  'go-resume': []
}>()
</script>
