<template>
  <!-- 单根包裹：稳定 #app 内叠层（粒子 z-1 → 主栏 z-2），避免多根片段 + isolation 导致的合成异常 -->
  <div class="app-shell" :class="{ 'app-shell--library': showLibraryWorkspace }">
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
      :class="{ 'site-root--ready': pageReady, 'site-root--library': showLibraryWorkspace }"
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

      <div class="site-shell" :class="{ 'site-shell--library': showLibraryWorkspace }">
        <UnifiedSiteHeader
          :mode="isAuthenticated ? 'app' : 'login'"
          :tabs="navTabsPublic"
          :active-tab-id="navHighlightTab"
          collapse-brand-on-narrow
          :show-tabs="isAuthenticated"
          :show-back="showUnifiedNavBack"
          :user-menu-openable="isAuthenticated"
          :show-change-password="authRole === 'member'"
          :is-dark="isDark"
          @brand-click="onBrandClick"
          @select-tab="onSelectNavTab"
          @back="unifiedNavBack"
          @toggle-theme="toggleTheme"
          @change-password="pwdDialogOpen = true"
          @logout="logout"
        />

        <main id="top" class="main-flow" :class="{ 'main-flow--library': showLibraryWorkspace }">
          <PersonalResumePage v-if="showResume" @back="exitResume" />

          <FeedbackListFullPage v-else-if="showFeedbackAll && authRole" @back="exitFeedbackAll" />

          <FeedbackPage v-else-if="showFeedback && authRole" :role="authRole" @back="exitFeedback" />

          <LibraryWorkspacePage
            v-else-if="showLibraryWorkspace"
            :doc-slug="activeSlug"
            :auth-role="authRole"
            :is-admin="isAdminUser"
            :static-posts="posts"
            :is-dark="isDark"
            @back="exitLibraryWorkspace"
          />

          <LoginPage v-else-if="!isAuthenticated" @success="onLoginSuccess" />

          <template v-else>
            <HomeTabPage
              v-if="shellTab === 'home'"
              :profile="profile"
              :hero-parallax-style="heroParallaxStyle"
              :stats-parallax-style="statsParallaxStyle"
              :grid-post-count="gridPostCount"
              :category-count="categoryCount"
              :show-resume-links="Boolean(showResumeLinks)"
              @go-posts="goPostsTab"
              @go-about="goAboutTab"
              @go-resume="openResume"
            />
            <PostsTabPage
              v-else-if="shellTab === 'posts'"
              :posts-parallax-style="postsParallaxStyle"
              :knowledge-bases="knowledgeBases"
              :tag-filter-list="tagFilterList"
              v-model:selected-kb-filter="selectedKbFilter"
              v-model:selected-tag-filter="selectedTagFilter"
              :categories="categories"
              :selected-category="selectedCategory"
              v-model:search-text="searchText"
              :homepage-displayed-posts="homepageDisplayedPosts"
              :more-in-library-count="moreInLibraryCount"
              @select-category="selectCategory"
              @open-article="openArticle"
              @open-library="openDocs"
              @reset-filters="resetFilters"
            />
            <AboutTabPage v-else-if="shellTab === 'about'" :about-parallax-style="aboutParallaxStyle" :visible-links="visibleProfileLinks" />
            <SubscribeTabPage
              v-else-if="shellTab === 'subscribe'"
              v-model:email="email"
              :subscribe-parallax-style="subscribeParallaxStyle"
              :subscribe-message="subscribeMessage"
              @subscribe="subscribe"
            />
            <HomeTabPage
              v-else
              :profile="profile"
              :hero-parallax-style="heroParallaxStyle"
              :stats-parallax-style="statsParallaxStyle"
              :grid-post-count="gridPostCount"
              :category-count="categoryCount"
              :show-resume-links="Boolean(showResumeLinks)"
              @go-posts="goPostsTab"
              @go-about="goAboutTab"
              @go-resume="openResume"
            />
          </template>
        </main>
      </div>

      <ChangePasswordDialog
        v-if="sessionMemberId"
        :open="pwdDialogOpen"
        :member-id="sessionMemberId"
        @close="pwdDialogOpen = false"
        @success="onPasswordChanged"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
/**
 * App shell：挂载动效偏好、深色主题平滑过渡、滚动视差，以及可选粒子背景扩展层。
 */

import {
  computed,
  nextTick,
  onMounted,
  onUnmounted,
  ref,
  watch,
} from 'vue'
import UnifiedSiteHeader, { type UniNavTab } from './components/UnifiedSiteHeader.vue'
import AboutTabPage from './components/tabs/AboutTabPage.vue'
import HomeTabPage from './components/tabs/HomeTabPage.vue'
import PostsTabPage from './components/tabs/PostsTabPage.vue'
import SubscribeTabPage from './components/tabs/SubscribeTabPage.vue'
import LibraryWorkspacePage from './components/LibraryWorkspacePage.vue'
import ChangePasswordDialog from './components/ChangePasswordDialog.vue'
import Live2dWaifu from './components/Live2dWaifu.vue'
import FeedbackListFullPage from './components/FeedbackListFullPage.vue'
import FeedbackPage from './components/FeedbackPage.vue'
import LoginPage from './components/LoginPage.vue'
import ParticleField from './components/ParticleField.vue'
import PersonalResumePage from './components/PersonalResumePage.vue'
import type { HomeFeedRow, KnowledgeBaseSummary } from './types/library'
import type { BlogPost } from './types/blog'
import type { AuthRole, MemberId } from './composables/useBlogAuth'
import {
  clearAuth,
  persistAuth,
  readAuthRole,
  readIsAdmin,
  readMemberId,
  readStoredAuth,
} from './composables/useBlogAuth'
import { useFxEnvironment } from './composables/useFxEnvironment'
import { useParallaxLayer } from './composables/useScrollParallax'
import { categories, posts, profile, profileLinks } from './data/blog'

const THEME_STORAGE = 'personal-blog-dark'

const {
  showParticles,
  particleGentle,
  particleBudget,
  showScrollParallax,
} = useFxEnvironment()

type NavHighlightTabId =
  | 'home'
  | 'posts'
  | 'about'
  | 'subscribe'
  | 'resume'
  | 'feedback'
  | 'library'

type ShellTabId = 'home' | 'posts' | 'about' | 'subscribe'

const navHighlightTab = ref<NavHighlightTabId>('home')

const shellTab = computed<ShellTabId>(() => {
  const id = navHighlightTab.value
  if (id === 'posts' || id === 'about' || id === 'subscribe') return id
  return 'home'
})

/** URL hash：#home · #posts · #resume · #feedback · #docs · #post-{slug} */
const showResume = ref(false)
const showFeedback = ref(false)
const showFeedbackAll = ref(false)
const showLibraryWorkspace = ref(false)

const pwdDialogOpen = ref(false)
const sessionMemberId = ref<MemberId | null>(readMemberId())

function syncSessionMemberId(): void {
  sessionMemberId.value = readMemberId()
}

function readInitialDark(): boolean {
  try {
    if (localStorage.getItem(THEME_STORAGE) === 'dark') return true
  } catch {
    /* ignore */
  }
  return false
}

const scrollY = ref(0)

const heroParallaxStyle = useParallaxLayer(scrollY, 0.068, { max: 54 })
const statsParallaxStyle = useParallaxLayer(scrollY, 0.036, { max: 42 })
const postsParallaxStyle = useParallaxLayer(scrollY, 0.022, { max: 36 })
const aboutParallaxStyle = useParallaxLayer(scrollY, 0.016, { max: 30 })
const subscribeParallaxStyle = useParallaxLayer(scrollY, 0.012, { max: 24 })

const selectedCategory = ref('All')
const searchText = ref('')
const activeSlug = ref<string | null>(null)
const knowledgeBases = ref<KnowledgeBaseSummary[]>([])
const homeFeed = ref<HomeFeedRow[]>([])
const allTags = ref<string[]>([])
const selectedKbFilter = ref('')
const selectedTagFilter = ref('')
const isAdminUser = ref(false)

async function loadKnowledgeBases(): Promise<void> {
  try {
    const r = await fetch('/api/v1/knowledge-bases')
    if (!r.ok) return
    const data = (await r.json()) as KnowledgeBaseSummary[]
    knowledgeBases.value = Array.isArray(data) ? data : []
  } catch {
    knowledgeBases.value = []
  }
}

async function loadHomeFeed(): Promise<void> {
  try {
    const r = await fetch('/api/v1/home-feed')
    if (!r.ok) {
      homeFeed.value = []
      return
    }
    homeFeed.value = (await r.json()) as HomeFeedRow[]
  } catch {
    homeFeed.value = []
  }
}

async function loadMetaTags(): Promise<void> {
  try {
    const r = await fetch('/api/v1/tags')
    if (!r.ok) {
      allTags.value = []
      return
    }
    const j = (await r.json()) as { tags?: string[] }
    allTags.value = Array.isArray(j.tags) ? j.tags : []
  } catch {
    allTags.value = []
  }
}

const tagFilterList = computed(() => allTags.value)

function scrollRouteTop(): void {
  void nextTick(() => {
    window.scrollTo({ top: 0, behavior: 'auto' })
  })
}

function syncRouteFromHash(): void {
  let raw = window.location.hash.replace(/^#/, '')
  const role = readAuthRole()
  const authed = readStoredAuth()

  if (raw === 'library-admin') {
    window.location.hash = '#docs'
    return
  }

  if (raw === 'layout-top') {
    window.history.replaceState(null, '', `${window.location.pathname}${window.location.search}#home`)
    raw = 'home'
  }

  if (raw === '') {
    if (authed) {
      navHighlightTab.value = 'home'
      window.history.replaceState(null, '', `${window.location.pathname}${window.location.search}#home`)
      scrollRouteTop()
    }
    showResume.value = false
    showFeedback.value = false
    showFeedbackAll.value = false
    showLibraryWorkspace.value = false
    activeSlug.value = null
    return
  }

  if (raw.startsWith('post-')) {
    showResume.value = false
    showFeedback.value = false
    showFeedbackAll.value = false
    showLibraryWorkspace.value = true
    navHighlightTab.value = 'library'
    const slug = raw.slice(5)
    activeSlug.value = slug || null
    scrollRouteTop()
    return
  }

  if (raw === 'docs') {
    showResume.value = false
    showFeedback.value = false
    showFeedbackAll.value = false
    showLibraryWorkspace.value = true
    navHighlightTab.value = 'library'
    activeSlug.value = null
    scrollRouteTop()
    return
  }

  activeSlug.value = null
  showLibraryWorkspace.value = false

  if (raw === 'resume') {
    showFeedback.value = false
    showFeedbackAll.value = false
    navHighlightTab.value = 'resume'
    if (role === 'member') {
      showResume.value = true
      scrollRouteTop()
    } else {
      showResume.value = false
      navHighlightTab.value = 'home'
      if (authed) {
        window.history.replaceState(null, '', `${window.location.pathname}${window.location.search}#home`)
      } else {
        window.history.replaceState(null, '', `${window.location.pathname}${window.location.search}`)
      }
    }
    return
  }

  if (raw === 'feedback') {
    showResume.value = false
    showFeedbackAll.value = false
    navHighlightTab.value = 'feedback'
    if (authed) {
      showFeedback.value = true
      scrollRouteTop()
    } else {
      showFeedback.value = false
      navHighlightTab.value = 'home'
      window.history.replaceState(null, '', `${window.location.pathname}${window.location.search}`)
    }
    return
  }

  if (raw === 'feedback-all') {
    showResume.value = false
    showFeedback.value = false
    navHighlightTab.value = 'feedback'
    if (authed) {
      showFeedbackAll.value = true
      scrollRouteTop()
    } else {
      showFeedbackAll.value = false
      navHighlightTab.value = 'home'
      window.history.replaceState(null, '', `${window.location.pathname}${window.location.search}`)
    }
    return
  }

  const shellIds = ['home', 'posts', 'about', 'subscribe'] as const
  if ((shellIds as readonly string[]).includes(raw)) {
    if (!authed) {
      window.history.replaceState(null, '', `${window.location.pathname}${window.location.search}`)
      showResume.value = false
      showFeedback.value = false
      showFeedbackAll.value = false
      return
    }
    showResume.value = false
    showFeedback.value = false
    showFeedbackAll.value = false
    navHighlightTab.value = raw as NavHighlightTabId
    scrollRouteTop()
    return
  }

  showResume.value = false
  showFeedback.value = false
  showFeedbackAll.value = false
  if (authed) {
    navHighlightTab.value = 'home'
    window.history.replaceState(null, '', `${window.location.pathname}${window.location.search}#home`)
    scrollRouteTop()
  }
}

function openResume(): void {
  window.location.hash = '#resume'
}

function openFeedback(): void {
  window.location.hash = '#feedback'
}

function openDocs(): void {
  window.location.hash = '#docs'
}

function exitLibraryWorkspace(): void {
  window.location.hash = '#home'
}

function exitResume(): void {
  window.location.hash = '#home'
}

function exitFeedback(): void {
  window.location.hash = '#home'
}

function exitFeedbackAll(): void {
  showFeedbackAll.value = false
  window.location.hash = '#feedback'
}

function onLoginSuccess(
  role: AuthRole,
  memberId?: MemberId,
  displayName?: string,
  isAdmin?: boolean,
  loginUsername?: string,
): void {
  persistAuth(role, memberId, displayName, isAdmin, loginUsername)
  authRole.value = role
  isAuthenticated.value = true
  isAdminUser.value = readIsAdmin()
  syncSessionMemberId()
  void loadKnowledgeBases()
  void loadHomeFeed()
  void loadMetaTags()
  void nextTick(() => {
    syncRouteFromHash()
    handleScroll()
  })
}

function onPasswordChanged(): void {
  pwdDialogOpen.value = false
}

function logout(): void {
  clearAuth()
  authRole.value = null
  isAuthenticated.value = false
  showResume.value = false
  showFeedback.value = false
  showFeedbackAll.value = false
  showLibraryWorkspace.value = false
  pwdDialogOpen.value = false
  isAdminUser.value = false
  activeSlug.value = null
  syncSessionMemberId()
  window.history.replaceState(null, '', `${window.location.pathname}${window.location.search}`)
  scrollToTop()
}

function onBrandClick(): void {
  if (!readStoredAuth()) {
    scrollToTop()
    return
  }
  window.location.hash = '#home'
}

const email = ref('')
const subscribeMessage = ref('')
const pageReady = ref(false)
const showBackTop = ref(false)
const isDark = ref(readInitialDark())

const authRole = ref<AuthRole | null>(readAuthRole())
const isAuthenticated = ref(readStoredAuth())

const showResumeLinks = computed(() => authRole.value === 'member')

const navTabsPublic = computed<UniNavTab[]>(() => {
  const row: UniNavTab[] = [
    { id: 'home', label: '首页' },
    { id: 'posts', label: '文章' },
    { id: 'about', label: '关于' },
  ]
  if (showResumeLinks.value) row.push({ id: 'resume', label: '履历' })
  row.push(
    { id: 'subscribe', label: '订阅' },
    { id: 'feedback', label: '反馈' },
    { id: 'library', label: '文库' },
  )
  return row
})

const showUnifiedNavBack = computed(() => {
  if (!isAuthenticated.value) return false
  if (
    showLibraryWorkspace.value ||
    showResume.value ||
    showFeedback.value ||
    showFeedbackAll.value
  )
    return true
  return shellTab.value !== 'home'
})

const visibleProfileLinks = computed(() =>
  authRole.value === 'guest' ? profileLinks.filter((l) => l.href !== '#resume') : profileLinks,
)

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

function homeFeedRowToBlogPost(row: HomeFeedRow): BlogPost {
  const tags = Array.isArray(row.tags) ? row.tags : []
  return {
    slug: row.slug,
    title: row.title,
    excerpt: row.excerpt,
    date: row.updated_at.slice(0, 10),
    readTime: '',
    category: row.knowledge_base_title || row.category,
    cover: row.cover?.trim() || 'linear-gradient(145deg, #cad4ce 0%, #aeb8ba 100%)',
    mood: 'Lib',
    tags,
    content: [],
  }
}

const filteredGridPosts = computed(() => {
  const q = searchText.value.trim().toLowerCase()
  if (homeFeed.value.length > 0) {
    let rows = homeFeed.value
    if (selectedKbFilter.value) {
      rows = rows.filter((r) => r.knowledge_base_slug === selectedKbFilter.value)
    }
    if (selectedTagFilter.value) {
      rows = rows.filter((r) => {
        const tags = Array.isArray(r.tags) ? r.tags : []
        return tags.includes(selectedTagFilter.value)
      })
    }
    return rows
      .filter((r) => {
        const tags = Array.isArray(r.tags) ? r.tags : []
        const text = [r.title, r.excerpt, r.category, ...tags, r.knowledge_base_title].join(' ').toLowerCase()
        return !q || text.includes(q)
      })
      .map(homeFeedRowToBlogPost)
  }
  return filteredPosts.value.filter((post) => {
    const searchableText = [post.title, post.excerpt, post.category, ...post.tags].join(' ').toLowerCase()
    return !q || searchableText.includes(q)
  })
})

const homepageDisplayedPosts = computed(() => filteredGridPosts.value.slice(0, 4))

const gridPostCount = computed(() => filteredGridPosts.value.length)

const moreInLibraryCount = computed(() => Math.max(0, filteredGridPosts.value.length - 4))

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

function unifiedNavBack(): void {
  if (showLibraryWorkspace.value) {
    exitLibraryWorkspace()
    return
  }
  if (showResume.value) {
    exitResume()
    return
  }
  if (showFeedback.value) {
    exitFeedback()
    return
  }
  if (showFeedbackAll.value) {
    exitFeedbackAll()
    return
  }
  window.location.hash = '#home'
}

function onSelectNavTab(id: string): void {
  if (id === 'library') {
    openDocs()
    return
  }
  if (id === 'resume') {
    openResume()
    return
  }
  if (id === 'feedback') {
    openFeedback()
    return
  }
  window.location.hash = `#${id}`
}

function goPostsTab(): void {
  window.location.hash = '#posts'
}

function goAboutTab(): void {
  window.location.hash = '#about'
}

function handleScroll(): void {
  const y = window.scrollY

  showBackTop.value =
    isAuthenticated.value &&
    !showResume.value &&
    !showFeedback.value &&
    !showFeedbackAll.value &&
    !showLibraryWorkspace.value &&
    y > 420

  if (
    !isAuthenticated.value ||
    showResume.value ||
    showFeedback.value ||
    showFeedbackAll.value ||
    showLibraryWorkspace.value
  ) {
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
  window.location.hash = `post-${slug}`
}

function resetFilters(): void {
  searchText.value = ''
  selectedCategory.value = 'All'
  selectedKbFilter.value = ''
  selectedTagFilter.value = ''
}

function subscribe(): void {
  subscribeMessage.value = `已记下 ${email.value}，可随时接入订阅服务。`
  email.value = ''
}

function runReveal(): void {
  requestAnimationFrame(() => {
    document.body.classList.add('body-mounted')
    setTimeout(() => {
      pageReady.value = true
    }, 32)
  })
}

onMounted(() => {
  syncSessionMemberId()
  isAdminUser.value = readIsAdmin()
  syncRouteFromHash()
  void loadKnowledgeBases()
  void loadHomeFeed()
  void loadMetaTags()
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
