<template>
  <div class="tab-page tab-page--posts">
    <section id="posts" class="content-section surface-card surface-card--block" :style="postsParallaxStyle">
      <div class="section-heading">
        <div>
          <p class="eyebrow">Latest notes</p>
          <h2 class="text-shimmer">文章精选</h2>
        </div>
        <p class="lede-secondary section-heading__aside">关键词、知识库与标签交叉筛选</p>
      </div>
      <hr class="section-rule" aria-hidden="true" />

      <div v-if="knowledgeBases.length || tagFilterList.length" class="filter-chips" aria-label="筛选">
        <div class="filter-chips__group">
          <span class="filter-chips__label meta-quiet">知识库</span>
          <button type="button" class="filter-chip" :class="{ active: !selectedKbFilter }" @click="$emit('update:selectedKbFilter', '')">
            全部
          </button>
          <button
            v-for="kb in knowledgeBases"
            :key="kb.slug"
            type="button"
            class="filter-chip"
            :class="{ active: selectedKbFilter === kb.slug }"
            @click="$emit('update:selectedKbFilter', kb.slug)"
          >
            {{ kb.title }}
          </button>
        </div>
        <div v-if="tagFilterList.length" class="filter-chips__group">
          <span class="filter-chips__label meta-quiet">标签</span>
          <button type="button" class="filter-chip" :class="{ active: !selectedTagFilter }" @click="$emit('update:selectedTagFilter', '')">
            全部
          </button>
          <button
            v-for="t in tagFilterList"
            :key="t"
            type="button"
            class="filter-chip"
            :class="{ active: selectedTagFilter === t }"
            @click="$emit('update:selectedTagFilter', t)"
          >
            {{ t }}
          </button>
        </div>
      </div>

      <div class="toolbar">
        <label class="search-box">
          <span class="meta-quiet search-box__label">搜索</span>
          <span class="search-box__wrap">
            <svg class="search-box__glyph" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6">
              <circle cx="10.75" cy="10.75" r="6.85" stroke-linecap="round" />
              <path d="M15.84 15.84L21 21" stroke-linecap="round" />
            </svg>
            <input
              :value="searchText"
              type="search"
              placeholder="标题 · 摘要 · 标签"
              autocomplete="off"
              @input="$emit('update:searchText', ($event.target as HTMLInputElement).value)"
            />
          </span>
        </label>
        <div v-if="!knowledgeBases.length" class="category-tabs" aria-label="文章分类">
          <button
            v-for="category in categories"
            :key="category"
            type="button"
            :class="{ active: selectedCategory === category }"
            @click="$emit('select-category', category)"
          >
            {{ category }}
          </button>
        </div>
      </div>

      <div v-if="homepageDisplayedPosts.length" class="posts-grid">
        <PostCard v-for="post in homepageDisplayedPosts" :key="post.slug" :post="post" @open="$emit('open-article', $event)" />
      </div>
      <p v-if="homepageDisplayedPosts.length && moreInLibraryCount > 0" class="home-more lede-secondary">
        <button type="button" class="text-link-soft text-link-soft--btn" @click="$emit('open-library')">
          文库中还有 {{ moreInLibraryCount }} 篇，进入文库查看全部 →
        </button>
      </p>

      <div v-else-if="!homepageDisplayedPosts.length" class="empty-state surface-card surface-card--inset">
        <svg class="empty-state__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4" aria-hidden="true">
          <circle cx="11.5" cy="11.5" r="6.85" opacity="0.35" stroke-dasharray="4 6" />
          <path d="M21 21l-4.2-4.2" stroke-linecap="round" />
        </svg>
        <h3>暂无匹配</h3>
        <p class="lede-secondary">换个关键词或筛选条件试试。</p>
        <button class="btn btn-primary btn--sm" type="button" @click="$emit('reset-filters')">清空筛选</button>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import type { StyleValue } from 'vue'
import type { KnowledgeBaseSummary } from '../../types/library'
import type { BlogPost } from '../../types/blog'
import PostCard from '../PostCard.vue'

defineProps<{
  postsParallaxStyle: StyleValue
  knowledgeBases: KnowledgeBaseSummary[]
  tagFilterList: string[]
  selectedKbFilter: string
  selectedTagFilter: string
  categories: readonly string[]
  selectedCategory: string
  searchText: string
  homepageDisplayedPosts: BlogPost[]
  moreInLibraryCount: number
}>()

defineEmits<{
  'update:selectedKbFilter': [v: string]
  'update:selectedTagFilter': [v: string]
  'update:searchText': [v: string]
  'select-category': [category: string]
  'open-article': [slug: string]
  'open-library': []
  'reset-filters': []
}>()
</script>

<style scoped>
.text-link-soft--btn {
  border: none;
  background: none;
  cursor: pointer;
  font: inherit;
  padding: 0;
  color: inherit;
}

.filter-chips {
  display: flex;
  flex-direction: column;
  gap: 0.65rem;
  margin-bottom: 1rem;
}

.filter-chips__group {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.4rem 0.5rem;
}

.filter-chips__label {
  flex: 0 0 auto;
  min-width: 3rem;
  font-size: 0.78rem;
}

.filter-chip {
  font: inherit;
  font-size: 0.82rem;
  padding: 0.35rem 0.7rem;
  border-radius: 999px;
  border: 1px solid var(--border-subtle, rgba(120, 120, 140, 0.35));
  background: transparent;
  color: inherit;
  cursor: pointer;
  transition:
    background 0.15s ease,
    border-color 0.15s ease;
}

.filter-chip:hover {
  background: rgba(120, 120, 140, 0.1);
}

.filter-chip.active {
  border-color: rgba(120, 160, 200, 0.55);
  background: rgba(120, 140, 180, 0.18);
}

.home-more {
  margin-top: 0.75rem;
  text-align: center;
}
</style>
