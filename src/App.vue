<template>
  <!-- 单根包裹：稳定 #app 内叠层（粒子 z-1 → 主栏 z-2），避免多根片段 + isolation 导致的合成异常 -->
  <div class="app-shell">
    <!-- 画布层：非「减少动态效果」时在后台运行，独立于内容栈避免挡住点击 -->
    <ParticleField
    v-if="showParticles"
    :enabled="true"
    :gentle="particleGentle"
    :dark="isDark"
    :count="particleBudget"
  />

  <Live2dWaifu />

  <div
    id="layout-top"
    class="site-root site-stack"
    :class="{ 'site-root--ready': pageReady }"
    :data-theme="isDark ? 'dark' : 'light'"
  >
    <button
      v-show="showBackTop"
      class="back-top"
      type="button"
      aria-label="回到顶部"
      @click="scrollToTop"
    >
      <svg class="icon-svg" aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75">
        <path d="M12 19V5M12 5l-6 6M12 5l6 6" stroke-linecap="round" stroke-linejoin="round" />
      </svg>
    </button>

    <div class="site-shell">
      <header class="nav-bar nav-bar--floating nav-bar--glass" aria-label="站点顶部">
        <div class="nav-bar__head">
          <a class="brand text-link-soft" href="#layout-top" @click.prevent="onBrandClick">
            <span class="brand__mark" aria-hidden="true">
              <svg class="brand__glyph" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                <path d="M7 17V7h5c2.07 0 3.76 1.68 3.76 3.76S14.07 14.53 12 14.53H9.3" stroke-linecap="round" stroke-linejoin="round" />
              </svg>
            </span>
            <span class="brand__text text-shimmer">枕月听风</span>
          </a>
          <div class="nav-bar__head-tools">
            <button
              v-if="navExpanded && isAuthenticated"
              class="nav-bar__meta-btn"
              type="button"
              @click="logout"
            >
              退出
            </button>
            <button
              class="theme-toggle theme-toggle--head"
              type="button"
              :aria-label="isDark ? '切换到浅色模式' : '切换到深色模式'"
              :aria-pressed="isDark"
              @click="toggleTheme"
            >
              <svg v-if="isDark" class="icon-svg" aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.65">
                <circle cx="12" cy="12" r="4.25" />
                <path
                  d="M12 2.25v1.85M12 19.9v1.85M21.75 12h-1.85M4.1 12H2.25M18.364 5.636l-1.3 1.3M6.936 17.065l-1.3 1.3M18.364 18.364l-1.3-1.3M6.936 6.935l-1.3-1.3"
                  stroke-linecap="round"
                />
              </svg>
              <svg v-else class="icon-svg" aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.65">
                <path
                  d="M20 14.74A8.47 8.47 0 019.47 4a8.5 8.5 0 0010.53 10.74z"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                />
              </svg>
            </button>
          </div>
        </div>
        <nav v-if="navExpanded" class="nav-bar__tabs" aria-label="主导航">
          <a class="nav-link nav-link--tab" href="#posts">
            <svg class="nav-link__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true">
              <path d="M8 7h13M8 12h13M8 17h13M5 7h.01M5 12h.01M5 17h.01" stroke-linecap="round" />
            </svg>
            文章
          </a>
          <a class="nav-link nav-link--tab" href="#about">
            <svg class="nav-link__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true">
              <circle cx="12" cy="8" r="3.25" />
              <path d="M6.5 19.25c0-3.59 3-5.84 5.5-5.84s5.5 2.25 5.5 5.84" stroke-linecap="round" />
            </svg>
            关于
          </a>
          <a
            v-if="showResumeLinks"
            class="nav-link nav-link--tab"
            href="#resume"
            @click.prevent="openResume"
          >
            <svg class="nav-link__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true">
              <path d="M8 7v10M16 7v10M8 11h8M8 15h5" stroke-linecap="round" />
              <rect x="5" y="5.5" width="14" height="13" rx="2" ry="2" stroke-linecap="round" />
            </svg>
            履历
          </a>
          <a class="nav-link nav-link--tab" href="#subscribe">
            <svg class="nav-link__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true">
              <rect x="3.5" y="6.5" width="17" height="11" rx="2" ry="2" stroke-linecap="round" />
              <path d="M3.75 9.25L12 14l8.25-4.75" stroke-linecap="round" stroke-linejoin="round" />
            </svg>
            订阅
          </a>
          <a class="nav-link nav-link--tab" href="#feedback" @click.prevent="openFeedback">
            <svg class="nav-link__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true">
              <path d="M12 18.5c-1.05 0-2-.35-2.8-.95" stroke-linecap="round" />
              <path d="M4.5 17.5c.5-2.1 2-3.65 4.2-4.25M8.2 8.3L12 12l4.8-4.8" stroke-linecap="round" stroke-linejoin="round" />
              <path
                d="M8.25 3.75h7.5a3 3 0 013 3v4.75a3 3 0 01-1.08 2.3L12 17.25l-5.67-3.45a3 3 0 01-1.08-2.3V6.75a3 3 0 013-3z"
                stroke-linecap="round"
                stroke-linejoin="round"
              />
            </svg>
            反馈
          </a>
        </nav>
      </header>

      <main id="top" class="main-flow">
        <PersonalResumePage v-if="showResume" @back="exitResume" />

        <FeedbackPage v-else-if="showFeedback && authRole" :role="authRole" @back="exitFeedback" />

        <LoginPage v-else-if="!isAuthenticated" @success="onLoginSuccess" />

        <template v-else>
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
                <a class="btn btn-primary" href="#posts">开始阅读</a>
                <a class="btn btn-ghost" href="#about">了解作者</a>
                <a
                  v-if="showResumeLinks"
                  class="btn btn-ghost"
                  href="#resume"
                  @click.prevent="openResume"
                >
                  个人简历
                </a>
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
              <strong>{{ posts.length }}</strong>
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

        <section id="posts" class="content-section surface-card surface-card--block" :style="postsParallaxStyle">
          <div class="section-heading">
            <div>
              <p class="eyebrow">Latest notes</p>
              <h2 class="text-shimmer">文章精选</h2>
            </div>
            <p class="lede-secondary section-heading__aside">通过关键词与分类快速找到相关内容。</p>
          </div>
          <hr class="section-rule" aria-hidden="true" />

          <div class="toolbar">
            <label class="search-box">
              <span class="meta-quiet search-box__label">搜索</span>
              <span class="search-box__wrap">
                <svg class="search-box__glyph" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6">
                  <circle cx="10.75" cy="10.75" r="6.85" stroke-linecap="round" />
                  <path d="M15.84 15.84L21 21" stroke-linecap="round" />
                </svg>
                <input v-model="searchText" type="search" placeholder="标题 · 摘要 · 标签" autocomplete="off" />
              </span>
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

          <div v-else class="empty-state surface-card surface-card--inset">
            <svg class="empty-state__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4" aria-hidden="true">
              <circle cx="11.5" cy="11.5" r="6.85" opacity="0.35" stroke-dasharray="4 6" />
              <path d="M21 21l-4.2-4.2" stroke-linecap="round" />
            </svg>
            <h3>暂无匹配</h3>
            <p class="lede-secondary">换个关键词或分类试试。</p>
            <button class="btn btn-primary btn--sm" type="button" @click="resetFilters">清空筛选</button>
          </div>
        </section>

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
            <a v-for="link in visibleProfileLinks" :key="link.label" class="surface-card link-tile hover-lift text-link-soft" :href="link.href" target="_blank" rel="noreferrer">
              <span class="meta-quiet">{{ link.label }}</span>
              <strong class="tile-value">{{ link.value }}</strong>
              <svg class="link-tile__chev" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true">
                <path d="M9 18l6-6-6-6" stroke-linecap="round" stroke-linejoin="round" />
              </svg>
            </a>
          </div>
        </section>

        <section id="subscribe" class="subscribe-card surface-card surface-card--block" :style="subscribeParallaxStyle">
          <div class="subscribe-card__decor" aria-hidden="true">
            <svg viewBox="0 0 64 64" fill="none" stroke="currentColor" stroke-width="0.85" opacity=".22">
              <path d="M8 46c8-24 26-38 46-42M12 54c14-26 38-42 54-52" stroke-linecap="round" />
              <circle cx="18" cy="18" r="4" /><circle cx="48" cy="22" r="3" /><circle cx="30" cy="40" r="2.25" />
            </svg>
          </div>
          <div>
            <p class="eyebrow">Newsletter</p>
            <h2 class="subscribe-title text-shimmer">订阅札记</h2>
            <p class="lede-secondary subscribe-lede">
              暂为前端占位交互；接入服务端或 Edge Function 后即可真实收集邮箱。
            </p>
          </div>
          <form class="subscribe-form" @submit.prevent="subscribe">
            <input v-model="email" type="email" placeholder="you@example.com" aria-label="邮箱地址" required />
            <button class="btn btn-primary subscribe-submit" type="submit">订阅</button>
          </form>
          <p v-if="subscribeMessage" class="form-message meta-quiet">{{ subscribeMessage }}</p>
        </section>
        </template>
      </main>
    </div>
  </div>
  </div>
</template>

<script setup lang="ts">
/**
 * App shell：挂载动效偏好、深色主题平滑过渡、滚动视差，以及可选粒子背景扩展层。
 * 结构与视觉尽量保持拆分，复杂度集中在独立组件 / composable 内。
 */

import {
  computed,
  nextTick,
  onMounted,
  onUnmounted,
  ref,
  watch,
} from 'vue'
import ArticleDetail from './components/ArticleDetail.vue'
import Live2dWaifu from './components/Live2dWaifu.vue'
import FeedbackPage from './components/FeedbackPage.vue'
import LoginPage from './components/LoginPage.vue'
import ParticleField from './components/ParticleField.vue'
import PersonalResumePage from './components/PersonalResumePage.vue'
import PostCard from './components/PostCard.vue'
import type { AuthRole } from './composables/useBlogAuth'
import { clearAuth, persistAuth, readAuthRole, readStoredAuth } from './composables/useBlogAuth'
import { useFxEnvironment } from './composables/useFxEnvironment'

import { useParallaxLayer } from './composables/useScrollParallax'
import { categories, posts, profile, profileLinks } from './data/blog'

/** 与用户本地存储键一致——index.html 中的预解析脚本也需同步此项，避免深浅切换闪烁 */

const THEME_STORAGE = 'personal-blog-dark'

const {
  showParticles,
  particleGentle,
  particleBudget,
  showScrollParallax,
} = useFxEnvironment()

/** URL hash：#resume 履历 · #feedback 反馈 · #post-{slug} 文章 */
const showResume = ref(false)
const showFeedback = ref(false)

function readInitialDark(): boolean {
  try {
    /** 只有当用户手动切到浅色时记录为 light；缺失键则默认沉浸式科技深色 */
    if (localStorage.getItem(THEME_STORAGE) === 'dark') return true
  } catch {
    /* ignore */
  }
  return false
}

const scrollY = ref(0)

/** 视差每层独立系数 —— clamp 最大值在 composable 内保护长页面不出现大幅跳动 */
const heroParallaxStyle = useParallaxLayer(scrollY, 0.068, { max: 54 })
const statsParallaxStyle = useParallaxLayer(scrollY, 0.036, { max: 42 })
const postsParallaxStyle = useParallaxLayer(scrollY, 0.022, { max: 36 })
const aboutParallaxStyle = useParallaxLayer(scrollY, 0.016, { max: 30 })
const subscribeParallaxStyle = useParallaxLayer(scrollY, 0.012, { max: 24 })

const selectedCategory = ref('All')
const searchText = ref('')
const activeSlug = ref<string | null>(null)

function syncRouteFromHash(): void {
  const raw = window.location.hash.replace(/^#/, '')
  const role = readAuthRole()

  if (raw.startsWith('post-')) {
    showResume.value = false
    showFeedback.value = false
    const slug = raw.slice(5)
    activeSlug.value = posts.some((p) => p.slug === slug) ? slug : null
    return
  }

  activeSlug.value = null

  if (raw === 'resume') {
    showFeedback.value = false
    if (role === 'member') {
      showResume.value = true
      void nextTick(() => {
        window.scrollTo({ top: 0, behavior: 'auto' })
      })
    } else {
      showResume.value = false
      window.history.replaceState(null, '', `${window.location.pathname}${window.location.search}`)
    }
    return
  }

  if (raw === 'feedback') {
    showResume.value = false
    if (readStoredAuth()) {
      showFeedback.value = true
      void nextTick(() => {
        window.scrollTo({ top: 0, behavior: 'auto' })
      })
    } else {
      showFeedback.value = false
      window.history.replaceState(null, '', `${window.location.pathname}${window.location.search}`)
    }
    return
  }

  showResume.value = false
  showFeedback.value = false
}

function openResume(): void {
  window.location.hash = '#resume'
}

function openFeedback(): void {
  window.location.hash = '#feedback'
}

function exitResume(): void {
  window.history.replaceState(null, '', `${window.location.pathname}${window.location.search}`)
  showResume.value = false
  scrollToTop()
}

function exitFeedback(): void {
  window.history.replaceState(null, '', `${window.location.pathname}${window.location.search}`)
  showFeedback.value = false
  scrollToTop()
}

function onLoginSuccess(role: AuthRole): void {
  persistAuth(role)
  authRole.value = role
  isAuthenticated.value = true
  void nextTick(() => {
    syncRouteFromHash()
    handleScroll()
  })
}

function logout(): void {
  clearAuth()
  authRole.value = null
  isAuthenticated.value = false
  showResume.value = false
  showFeedback.value = false
  activeSlug.value = null
  window.history.replaceState(null, '', `${window.location.pathname}${window.location.search}`)
  scrollToTop()
}

function onBrandClick(): void {
  if (showFeedback.value) {
    exitFeedback()
    return
  }
  if (showResume.value || isAuthenticated.value) {
    goTop()
    return
  }
  scrollToTop()
}

const email = ref('')
const subscribeMessage = ref('')
const pageReady = ref(false)
const showBackTop = ref(false)
const isDark = ref(readInitialDark())

const authRole = ref<AuthRole | null>(readAuthRole())
const isAuthenticated = ref(readStoredAuth())

/** 登录页仅保留主题切换；履历或已登录显示完整导航 */
const navExpanded = computed(() => showResume.value || isAuthenticated.value)

const showResumeLinks = computed(() => authRole.value === 'member')

const visibleProfileLinks = computed(() =>
  authRole.value === 'guest' ? profileLinks.filter((l) => l.href !== '#resume') : profileLinks,
)

/** 浅色模式切换节流计时器——用于卸载 theme-crossfade 类 */
let themeCrossfadeTimer = 0

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

/** 持久化深浅模式 + 打上 theme-crossfade 以便 CSS 做 0.5s 级过渡 */

function toggleTheme(): void {

  isDark.value = !isDark.value

  try {
    localStorage.setItem(THEME_STORAGE, isDark.value ? 'dark' : 'light')
  } catch {
    /* ignore */
  }
}



function bumpThemePalette(): void {
  const root = document.documentElement
  root.classList.toggle('theme-dark', isDark.value)
  root.style.colorScheme = isDark.value ? 'dark' : 'light'
}

watch(
  isDark,
  () => {
    bumpThemePalette()
    /** 短时 crossfade——避免所有元素常驻 transition（会带来额外合成成本） */

    document.documentElement.classList.add('theme-crossfade')

    window.clearTimeout(themeCrossfadeTimer)

    themeCrossfadeTimer = window.setTimeout(() => {
      document.documentElement.classList.remove('theme-crossfade')
    }, 540)
  },

  { immediate: true },
)

function scrollToTop(): void {
  window.scrollTo({ top: 0, behavior: 'smooth' })
}

function goTop(): void {
  if (showResume.value) {
    exitResume()
    return
  }
  if (showFeedback.value) {
    exitFeedback()
    return
  }
  scrollToTop()
  closeArticle()
}

/** 回溯顶部状态 + （可选）采样滚动以实现视差 */
function handleScroll(): void {
  const y = window.scrollY

  showBackTop.value = isAuthenticated.value && !showResume.value && !showFeedback.value && y > 420

  if (!isAuthenticated.value || showResume.value || showFeedback.value) {
    scrollY.value = 0
    return
  }

  if (showScrollParallax.value) {
    scrollY.value = y
  }
}





function selectCategory(category: string): void {





  selectedCategory.value = category
  activeSlug.value = null
}







function openArticle(slug: string): void {


  activeSlug.value = slug
  window.location.hash = `post-${slug}`


}




function closeArticle(): void {


  activeSlug.value = null
}





function resetFilters(): void {


  searchText.value = ''
  selectedCategory.value = 'All'


}








function subscribe(): void {


  subscribeMessage.value = `已记下 ${email.value}，可随时接入订阅服务。`


  email.value = ''


}









/** 首屏渐入：挂载 body 后立即显示内容层，避免出现长时间白屏 */


function runReveal(): void {


  requestAnimationFrame(() => {


    document.body.classList.add('body-mounted')


    setTimeout(() => {


      pageReady.value = true





    },




    32)





  })



}









onMounted(() => {
  syncRouteFromHash()
  window.addEventListener('hashchange', syncRouteFromHash)
  window.addEventListener('scroll', handleScroll, { passive: true })
  handleScroll()
  runReveal()
})



















onUnmounted(() => {
  window.removeEventListener('hashchange', syncRouteFromHash)
  window.removeEventListener('scroll', handleScroll)
})
</script>
