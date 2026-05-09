<template>
  <div class="site-shell">
    <header class="nav-bar">
      <a class="brand" href="#top" @click="closeArticle">
        <span class="brand__mark">S</span>
        <span>拾光札记</span>
      </a>
      <nav aria-label="主导航">
        <a href="#posts">文章</a>
        <a href="#about">关于</a>
        <a href="#subscribe">订阅</a>
      </nav>
    </header>

    <main id="top">
      <section class="hero-section">
        <div class="hero-section__content">
          <p class="eyebrow">Personal Blog / Vue3 + TypeScript</p>
          <h1>{{ profile.headline }}</h1>
          <p class="hero-section__intro">
            这里暂存关于前端工程、体验设计、效率系统和生活观察的文章。数据保存在项目内，适合后续接入 CMS 或接口。
          </p>
          <div class="hero-actions">
            <a class="primary-button" href="#posts">开始阅读</a>
            <a class="secondary-button" href="#about">了解作者</a>
          </div>
        </div>
        <aside class="profile-card" aria-label="作者资料">
          <img :src="profile.avatar" :alt="profile.name" />
          <div>
            <span class="status-dot"></span>
            <span>Available for ideas</span>
          </div>
          <h2>{{ profile.name }}</h2>
          <p>{{ profile.role }}</p>
          <small>{{ profile.location }}</small>
        </aside>
      </section>

      <section class="stats-grid" aria-label="博客统计">
        <div>
          <strong>{{ posts.length }}</strong>
          <span>篇精选文章</span>
        </div>
        <div>
          <strong>{{ categoryCount }}</strong>
          <span>个写作主题</span>
        </div>
        <div>
          <strong>2026</strong>
          <span>持续记录中</span>
        </div>
      </section>

      <section id="posts" class="content-section">
        <div class="section-heading">
          <p class="eyebrow">Latest Notes</p>
          <h2>文章精选</h2>
          <p>通过关键词和分类快速找到感兴趣的内容。</p>
        </div>

        <div class="toolbar">
          <label class="search-box">
            <span>搜索</span>
            <input v-model="searchText" type="search" placeholder="输入标题、摘要或标签" />
          </label>
          <div class="category-tabs" aria-label="文章分类">
            <button
              v-for="category in categories"
              :key="category"
              type="button"
              :class="{ active: selectedCategory === category }"
              @click="selectCategory(category)"
            >
              {{ category }}
            </button>
          </div>
        </div>

        <ArticleDetail v-if="activePost" :post="activePost" @close="closeArticle" />

        <div v-else-if="filteredPosts.length" class="posts-grid">
          <PostCard v-for="post in filteredPosts" :key="post.slug" :post="post" @open="openArticle" />
        </div>

        <div v-else class="empty-state">
          <h3>没有找到匹配文章</h3>
          <p>换一个关键词或分类试试。</p>
          <button type="button" @click="resetFilters">清空筛选</button>
        </div>
      </section>

      <section id="about" class="about-section">
        <div>
          <p class="eyebrow">About</p>
          <h2>写给长期主义的个人空间</h2>
          <p>
            这个博客以轻量的数据文件作为内容来源，方便快速维护和迁移。页面结构保留了真实博客需要的入口：作者简介、文章分类、搜索、详情阅读和订阅行动。
          </p>
        </div>
        <div class="link-list">
          <a v-for="link in profileLinks" :key="link.label" :href="link.href" target="_blank" rel="noreferrer">
            <span>{{ link.label }}</span>
            <strong>{{ link.value }}</strong>
          </a>
        </div>
      </section>

      <section id="subscribe" class="subscribe-card">
        <div>
          <p class="eyebrow">Newsletter</p>
          <h2>订阅下一封札记</h2>
          <p>当前为前端暂存交互，可在接入后端或 Vercel Serverless Function 后保存邮箱。</p>
        </div>
        <form @submit.prevent="subscribe">
          <input v-model="email" type="email" placeholder="you@example.com" aria-label="邮箱地址" required />
          <button type="submit">订阅</button>
        </form>
        <p v-if="subscribeMessage" class="form-message">{{ subscribeMessage }}</p>
      </section>
    </main>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import ArticleDetail from './components/ArticleDetail.vue'
import PostCard from './components/PostCard.vue'
import { categories, posts, profile, profileLinks } from './data/blog'

const selectedCategory = ref('All')
const searchText = ref('')
const activeSlug = ref<string | null>(null)
const email = ref('')
const subscribeMessage = ref('')

const categoryCount = computed(() => categories.filter((category) => category !== 'All').length)

const filteredPosts = computed(() => {
  const query = searchText.value.trim().toLowerCase()
  return posts.filter((post) => {
    const matchesCategory = selectedCategory.value === 'All' || post.category === selectedCategory.value
    const searchableText = [post.title, post.excerpt, post.category, ...post.tags].join(' ').toLowerCase()
    return matchesCategory && (!query || searchableText.includes(query))
  })
})

const activePost = computed(() => posts.find((post) => post.slug === activeSlug.value))

function selectCategory(category: string) {
  selectedCategory.value = category
  activeSlug.value = null
}

function openArticle(slug: string) {
  activeSlug.value = slug
  window.location.hash = `post-${slug}`
}

function closeArticle() {
  activeSlug.value = null
}

function resetFilters() {
  searchText.value = ''
  selectedCategory.value = 'All'
}

function subscribe() {
  subscribeMessage.value = `已记录 ${email.value}，后续可接入真实订阅服务。`
  email.value = ''
}
</script>
