<!--
  语雀式文库：左侧目录树 + 中间阅读/管理 + 右侧大纲；仅管理员显示树操作与「编辑」。
-->
<template>
  <div class="lib-workspace lib-workspace--fullscreen">
    <div
      class="lib-workspace__layout"
      :class="{
        'lib-workspace__layout--tree-collapsed': treeCollapsed,
        'lib-workspace__layout--outline-collapsed': outlineCollapsed,
      }"
    >
      <aside
        class="lib-workspace__col lib-workspace__col--tree surface-card surface-card--inset"
        :class="{ 'lib-workspace__col--rail-collapsed': treeCollapsed }"
      >
        <button
          type="button"
          class="lib-workspace__rail-toggle"
          :aria-expanded="!treeCollapsed"
          :aria-label="treeCollapsed ? '展开左侧目录' : '收起左侧目录'"
          title="折叠 / 展开目录"
          @click="treeCollapsed = !treeCollapsed"
        >
          <span class="lib-workspace__rail-chev" aria-hidden="true">{{ treeCollapsed ? '▶' : '◀' }}</span>
        </button>
        <template v-if="!treeCollapsed">
        <input
          v-model="treeFilter"
          type="search"
          class="lib-workspace__search"
          placeholder="搜索知识库与文档…"
          aria-label="搜索树"
        />
        <div class="lib-workspace__tree-scroll">
        <p v-if="treeLoading" class="lede-secondary">加载目录…</p>
        <p v-else-if="credError" class="lib-workspace__err">{{ credError }}</p>
        <ul v-else-if="visibleTree.length" class="lib-tree" role="tree">
          <li v-for="kb in visibleTree" :key="kb.id" class="lib-tree__block">
            <div class="lib-tree__row lib-tree__row--kb">
              <button
                v-if="kbHasBranches(kb)"
                type="button"
                class="lib-tree__twisty"
                :aria-expanded="isKbOpen(kb)"
                aria-label="展开或收起知识库目录"
                @click.stop="toggleKb(kb)"
              >
                <svg
                  class="lib-tree__twisty-chev"
                  :class="{ 'lib-tree__twisty-chev--open': isKbOpen(kb) }"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2"
                  aria-hidden="true"
                >
                  <path d="M9 6l6 6-6 6" stroke-linecap="round" stroke-linejoin="round" />
                </svg>
              </button>
              <span v-else class="lib-tree__twisty-spacer" aria-hidden="true" />
              <span class="lib-tree__icon" aria-hidden="true">📚</span>
              <button
                type="button"
                class="lib-tree__hit lib-tree__ellipsis"
                :title="kb.title"
                @click="goDocFromKb(kb)"
              >
                {{ kb.title }}
              </button>
              <div v-if="isAdmin" class="lib-tree__actions" @click.stop>
                <button type="button" class="lib-tree__icon-btn" title="新建目录" aria-label="新建目录" @click="openNewFolder(kb.slug)">⊕</button>
                <button type="button" class="lib-tree__icon-btn" title="新建文档" aria-label="新建文档" @click="openNewDocKb(kb.slug)">＋</button>
                <button type="button" class="lib-tree__icon-btn" title="编辑知识库" aria-label="编辑知识库" @click="openEditKb(kb)">⚙</button>
                <button type="button" class="lib-tree__icon-btn lib-tree__icon-btn--danger" title="删除知识库" aria-label="删除知识库" @click="deleteKb(kb.slug)">⌫</button>
              </div>
            </div>
            <ul v-show="isKbOpen(kb)" class="lib-tree__nested">
              <li
                v-for="d in kb.rootDocuments"
                :key="d.id"
                class="lib-tree__row lib-tree__row--doc"
                :class="{ 'is-active': docSlug === d.slug }"
                @click="goDoc(d.slug)"
              >
                <span class="lib-tree__icon" aria-hidden="true">📄</span>
                <span class="lib-tree__text lib-tree__ellipsis" :title="d.title">{{ d.title }}</span>
                <div v-if="isAdmin" class="lib-tree__actions" @click.stop>
                  <button type="button" class="lib-tree__icon-btn" title="编辑" aria-label="编辑" @click="openEditDoc(d.slug)">✎</button>
                  <button type="button" class="lib-tree__icon-btn lib-tree__icon-btn--danger" title="删除" aria-label="删除" @click="deleteDoc(d.slug)">⌫</button>
                </div>
              </li>
              <li v-for="fd in kb.folders" :key="fd.id" class="lib-tree__folder">
                <div class="lib-tree__row lib-tree__row--folder">
                  <button
                    v-if="folderHasDocs(fd)"
                    type="button"
                    class="lib-tree__twisty"
                    :aria-expanded="isFolderOpen(kb, fd)"
                    aria-label="展开或收起文件夹"
                    @click.stop="toggleFolder(kb, fd)"
                  >
                    <svg
                      class="lib-tree__twisty-chev"
                      :class="{ 'lib-tree__twisty-chev--open': isFolderOpen(kb, fd) }"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      stroke-width="2"
                      aria-hidden="true"
                    >
                      <path d="M9 6l6 6-6 6" stroke-linecap="round" stroke-linejoin="round" />
                    </svg>
                  </button>
                  <span v-else class="lib-tree__twisty-spacer" aria-hidden="true" />
                  <span class="lib-tree__icon" aria-hidden="true">📁</span>
                  <span class="lib-tree__text lib-tree__ellipsis" :title="fd.title">{{ fd.title }}</span>
                  <div v-if="isAdmin" class="lib-tree__actions" @click.stop>
                    <button type="button" class="lib-tree__icon-btn" title="新建文档" aria-label="新建文档" @click="openNewDocFolder(kb.slug, fd.slug)">＋</button>
                    <button type="button" class="lib-tree__icon-btn" title="编辑目录" aria-label="编辑目录" @click="openEditFolder(kb.slug, fd)">⚙</button>
                    <button type="button" class="lib-tree__icon-btn lib-tree__icon-btn--danger" title="删除目录" aria-label="删除目录" @click="deleteFolder(kb.slug, fd.slug)">⌫</button>
                  </div>
                </div>
                <ul v-show="isFolderOpen(kb, fd)" class="lib-tree__nested">
                  <li
                    v-for="d in fd.documents"
                    :key="d.id"
                    class="lib-tree__row lib-tree__row--doc"
                    :class="{ 'is-active': docSlug === d.slug }"
                    @click="goDoc(d.slug)"
                  >
                    <span class="lib-tree__icon" aria-hidden="true">📄</span>
                    <span class="lib-tree__text lib-tree__ellipsis" :title="d.title">{{ d.title }}</span>
                    <div v-if="isAdmin" class="lib-tree__actions" @click.stop>
                      <button type="button" class="lib-tree__icon-btn" title="编辑" aria-label="编辑" @click="openEditDoc(d.slug)">✎</button>
                      <button type="button" class="lib-tree__icon-btn lib-tree__icon-btn--danger" title="删除" aria-label="删除" @click="deleteDoc(d.slug)">⌫</button>
                    </div>
                  </li>
                </ul>
              </li>
            </ul>
          </li>
        </ul>
        <p v-else class="lede-secondary">暂无知识库数据。</p>
        </div>
        <div v-if="isAdmin" class="lib-workspace__new-kb">
          <button type="button" class="btn btn-primary btn--sm" @click="openNewKb">+ 新建知识库</button>
          <button type="button" class="btn btn-ghost btn--sm" @click="reloadTree">刷新</button>
        </div>
        </template>
      </aside>

      <main
        class="lib-workspace__col lib-workspace__col--main"
        :class="{
          'lib-workspace__col--main--clamp-editor':
            !!(libraryDoc && inlineDocEditing) || (creatingDoc && isAdmin),
        }"
      >
        <p v-if="docLoading" class="lede-secondary">加载正文…</p>
        <div
          v-else-if="creatingDoc && isAdmin"
          class="lib-workspace__new-doc-sheet surface-card surface-card--inset"
        >
          <div data-article-body="1" class="lib-workspace__new-doc-editor-wrap">
            <YuqueDocEditor
              ref="newDocEditorRef"
              v-model="newDocDraft.bodyHtml"
              layout-fill
              :dark-mode="Boolean(props.isDark)"
              :max-html-length="4900000"
            />
          </div>
          <footer class="lib-workspace__new-doc-actions">
            <p v-if="newDocError" class="lib-workspace__err">{{ newDocError }}</p>
            <div class="lib-workspace__new-doc-buttons">
              <button type="button" class="btn btn-primary btn--sm" @click="submitNewDoc">保存</button>
              <button type="button" class="btn btn-ghost btn--sm" @click="cancelCreatingDoc">取消</button>
            </div>
          </footer>
        </div>
        <div
          v-else-if="libraryDoc || staticPost"
          class="lib-workspace__main-stack"
          :class="{ 'lib-workspace__main-stack--fill': !!(libraryDoc && inlineDocEditing) }"
        >
          <ArticleDetail
            ref="articleDetailRef"
            embedded
            v-model:draft-body-html="editDraft.bodyHtml"
            :library-editing="inlineDocEditing"
            :inline-error="inlineDocError"
            :post="staticPost"
            :library-doc="libraryDoc ?? undefined"
            :auth-role="authRole"
            :editor-dark-mode="Boolean(props.isDark)"
            @save-inline="saveInlineDoc"
            @cancel-inline="cancelInlineDoc"
            @close="emit('back')"
          />
          <div
            v-if="isAdmin && libraryDoc && !inlineDocEditing"
            class="lib-workspace__pen-slot"
          >
            <button
              type="button"
              class="btn btn-primary lib-workspace__pen-btn"
              title="编辑正文与标题"
              aria-label="编辑"
              @click="openEditDoc(libraryDoc.slug)"
            >
              ✎ 编辑
            </button>
          </div>
        </div>
        <div
          v-else-if="docSlug && !docLoading"
          class="empty-state surface-card surface-card--inset"
        >
          <h3>未能加载该文档</h3>
          <p class="lede-secondary">请从左侧选择一篇知识库文章，或使用顶部导航返回。</p>
        </div>
        <div v-else class="lib-workspace__placeholder surface-card surface-card--inset">
          <h3 class="text-shimmer">选择一篇文档</h3>
          <p class="lede-secondary">从左侧目录点击文章标题开始阅读。管理员可使用左侧「＋」在中间栏直接新建文档。</p>
        </div>
      </main>

      <aside
        class="lib-workspace__col lib-workspace__col--outline surface-card surface-card--inset"
        :class="{ 'lib-workspace__col--rail-collapsed': outlineCollapsed }"
      >
        <button
          type="button"
          class="lib-workspace__rail-toggle"
          :aria-expanded="!outlineCollapsed"
          :aria-label="outlineCollapsed ? '展开右侧面板' : '收起右侧面板'"
          title="折叠 / 展开右栏"
          @click="outlineCollapsed = !outlineCollapsed"
        >
          <span class="lib-workspace__rail-chev" aria-hidden="true">{{ outlineCollapsed ? '◀' : '▶' }}</span>
        </button>
        <template v-if="!outlineCollapsed">
          <div class="lib-workspace__outline-inner">
            <dl v-if="libraryDoc && !creatingDoc" class="lib-workspace__facts">
              <div v-if="sidebarPathLabel" class="lib-workspace__fact">
                <dt>位置</dt>
                <dd :title="sidebarPathLabel">{{ sidebarPathLabel }}</dd>
              </div>
              <div class="lib-workspace__fact">
                <dt>作者</dt>
                <dd>{{ libraryDoc.author_display_name }}</dd>
              </div>
              <div class="lib-workspace__fact">
                <dt>更新于</dt>
                <dd>
                  <time :datetime="libraryDoc.updated_at">{{ sidebarFormattedUpdated }}</time>
                </dd>
              </div>
              <div v-if="libraryDoc.category?.trim()" class="lib-workspace__fact">
                <dt>分类</dt>
                <dd>{{ libraryDoc.category }}</dd>
              </div>
              <div v-if="sidebarTagLine" class="lib-workspace__fact lib-workspace__fact--tags">
                <dt>标签</dt>
                <dd>{{ sidebarTagLine }}</dd>
              </div>
            </dl>
            <div class="lib-workspace__outline-scroll">
              <ArticleOutlinePanel
                v-if="outlineItems.length"
                :outline="outlineItems"
                @jump-anchor="onOutlineJump"
              />
              <p v-else class="lib-workspace__outline-hint">
                {{
                  creatingDoc
                    ? '在正文首行使用一级标题作为文档标题，更多标题会出现在大纲中。'
                    : '编辑或新建文档后可在此跳转标题位置。'
                }}
              </p>
            </div>
          </div>
        </template>
      </aside>
    </div>

    <!-- 弹层：知识库 / 目录 -->
    <div v-if="modal === 'kb'" class="lib-workspace__modal" role="dialog" aria-modal="true" @click.self="modal = null">
      <div class="lib-workspace__dialog surface-card">
        <h3>{{ kbEditing ? '编辑知识库' : '新建知识库' }}</h3>
        <p v-if="!kbEditing" class="meta-quiet lib-workspace__hint">Slug 将根据标题自动生成；网址中将使用英文片段。</p>
        <label><span class="meta-quiet">标题</span><input v-model="fKb.title" /></label>
        <label><span class="meta-quiet">描述</span><input v-model="fKb.description" /></label>
        <div class="lib-workspace__dialog-actions">
          <button type="button" class="btn btn-primary btn--sm" @click="submitKb">保存</button>
          <button type="button" class="btn btn-ghost btn--sm" @click="modal = null">取消</button>
        </div>
        <p v-if="modalError" class="lib-workspace__err">{{ modalError }}</p>
      </div>
    </div>

    <div v-if="modal === 'folder'" class="lib-workspace__modal" role="dialog" aria-modal="true" @click.self="modal = null">
      <div class="lib-workspace__dialog surface-card">
        <h3>{{ folderEditing ? '编辑目录' : '新建目录' }}</h3>
        <p class="meta-quiet">知识库：{{ contextKbSlug }}</p>
        <p v-if="!folderEditing" class="meta-quiet lib-workspace__hint">在当前知识库下创建；Slug 根据标题自动生成。</p>
        <label><span class="meta-quiet">标题</span><input v-model="fFolder.title" /></label>
        <div class="lib-workspace__dialog-actions">
          <button type="button" class="btn btn-primary btn--sm" @click="submitFolder">保存</button>
          <button type="button" class="btn btn-ghost btn--sm" @click="modal = null">取消</button>
        </div>
        <p v-if="modalError" class="lib-workspace__err">{{ modalError }}</p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onMounted, ref, watch } from 'vue'
import type { AuthRole } from '../composables/useBlogAuth'
import type { BlogPost } from '../types/blog'
import type { LibraryDocumentDetail } from '../types/library'
import { extractHeadingOutline, injectHeadingAnchors } from '../utils/extractHeadingOutline'
import { mergeTitleLeadingH1, splitTitleFromBody } from '../utils/libraryDocBodyTitle'
import { sanitizeFeedbackHtml } from '../utils/sanitizeFeedbackHtml'
import ArticleDetail from './ArticleDetail.vue'
import ArticleOutlinePanel from './ArticleOutlinePanel.vue'
import YuqueDocEditor from './YuqueDocEditor.vue'

const emit = defineEmits<{ back: [] }>()

const props = defineProps<{
  docSlug: string | null
  authRole: AuthRole | null
  isAdmin: boolean
  staticPosts: BlogPost[]
  /** 与全站深色模式一致，传给语雀编辑器 */
  isDark?: boolean
}>()

type TreeDoc = {
  id: string
  slug: string
  title: string
  excerpt: string
  category: string
  tags: unknown
  cover: string
  updated_at: string
  author_display_name: string
}

type TreeFolder = {
  id: string
  slug: string
  title: string
  sortOrder: number
  documents: TreeDoc[]
}

type TreeKb = {
  id: string
  slug: string
  title: string
  description: string
  sortOrder: unknown
  folders: TreeFolder[]
  rootDocuments: TreeDoc[]
}

const tree = ref<TreeKb[]>([])
const treeLoading = ref(true)
const credError = ref('')
const treeFilter = ref('')
const modalError = ref('')
const modal = ref<'kb' | 'folder' | null>(null)
const libraryDoc = ref<LibraryDocumentDetail | null>(null)
const staticPost = ref<BlogPost | undefined>(undefined)
const docLoading = ref(false)
const treeCollapsed = ref(false)
const outlineCollapsed = ref(false)

/** 文库正文内联编辑（非弹窗） */
const inlineDocEditing = ref(false)
const inlineDocError = ref('')
const editDraft = ref({ bodyHtml: '' })
const pendingInlineEdit = ref<string | null>(null)
const kbEditing = ref(false)
const fKb = ref({ slug: '', title: '', description: '' })
const folderEditing = ref(false)
const contextKbSlug = ref('')
const fFolder = ref({ slug: '', title: '' })
const creatingDoc = ref(false)
const newDocError = ref('')
const newDocDraft = ref({
  bodyHtml: '<h1>无标题</h1><p></p>',
  knowledgeBaseSlug: '',
  folderSlug: '',
})

const sidebarPathLabel = computed(() => {
  const d = libraryDoc.value
  if (!d) return ''
  const kb = d.knowledge_base_title
  const fd = d.folder_title
  if (fd) return `${kb} / ${fd}`
  return kb
})

const sidebarTagLine = computed(() => {
  const tags = libraryDoc.value?.tags
  if (!tags?.length) return ''
  return tags.join('、')
})

const sidebarFormattedUpdated = computed(() => {
  const d = libraryDoc.value
  if (!d) return ''
  try {
    return new Intl.DateTimeFormat('zh-CN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(d.updated_at))
  } catch {
    return d.updated_at
  }
})

const outlineItems = computed(() => {
  if (creatingDoc.value) {
    const html = injectHeadingAnchors(sanitizeFeedbackHtml(newDocDraft.value.bodyHtml))
    return extractHeadingOutline(html)
  }
  if (inlineDocEditing.value && libraryDoc.value) {
    const html = injectHeadingAnchors(sanitizeFeedbackHtml(editDraft.value.bodyHtml))
    return extractHeadingOutline(html)
  }
  const d = libraryDoc.value
  if (!d) return []
  const merged = mergeTitleLeadingH1(d.title, d.body_html)
  const html = injectHeadingAnchors(sanitizeFeedbackHtml(merged))
  return extractHeadingOutline(html)
})

const articleDetailRef = ref<InstanceType<typeof ArticleDetail> | null>(null)
const newDocEditorRef = ref<InstanceType<typeof YuqueDocEditor> | null>(null)

function onOutlineJump(payload: { anchor: string; index: number }): void {
  void nextTick(() => {
    articleDetailRef.value?.scrollToHeading(payload.anchor, payload.index)
    newDocEditorRef.value?.scrollToAnchor(payload.anchor, payload.index)
  })
}

function cancelCreatingDoc(): void {
  creatingDoc.value = false
  newDocError.value = ''
}

async function submitNewDoc(): Promise<void> {
  newDocError.value = ''
  const split = splitTitleFromBody(newDocDraft.value.bodyHtml)
  const title = split.title.trim()
  const bodyHtml = split.bodyHtml.trim() || '<p></p>'
  if (!title) {
    newDocError.value = '正文首行需为一级标题（文档标题）'
    return
  }
  const payload = {
    title,
    bodyHtml,
    knowledgeBaseSlug: newDocDraft.value.knowledgeBaseSlug.trim(),
    folderSlug: newDocDraft.value.folderSlug.trim(),
    excerpt: '',
    category: 'Notes',
    tags: [] as string[],
    cover: '',
  }
  const { ok, json } = await req('POST', '/api/v1/documents', payload)
  if (!ok) {
    newDocError.value = (json as { error?: string })?.error ?? '创建失败'
    return
  }
  const row = json as { slug?: string }
  const newSlug = typeof row.slug === 'string' ? row.slug.trim() : ''
  if (!newSlug) {
    newDocError.value = '创建成功但未返回文档 slug'
    return
  }
  creatingDoc.value = false
  await reloadTree()
  window.location.hash = `post-${newSlug}`
  await reloadCurrentDoc()
}

function norm(s: string): string {
  return s.trim().toLowerCase()
}

const visibleTree = computed(() => {
  const q = norm(treeFilter.value)
  if (!q) return tree.value
  return tree.value.filter((kb) => {
    if (norm(kb.title).includes(q) || norm(String(kb.slug)).includes(q)) return true
    for (const d of kb.rootDocuments) {
      if (norm(d.title).includes(q) || norm(d.slug).includes(q)) return true
    }
    for (const fd of kb.folders) {
      if (norm(fd.title).includes(q) || norm(fd.slug).includes(q)) return true
      for (const d of fd.documents) {
        if (norm(d.title).includes(q) || norm(d.slug).includes(q)) return true
      }
    }
    return false
  })
})

/** 知识库 / 文件夹展开：默认展开知识库，子文件夹默认收起；再次展开知识库时重置其下文件夹为收起 */
const kbOpen = ref<Record<string, boolean>>({})
const folderOpen = ref<Record<string, boolean>>({})

function folderRowKey(kb: TreeKb, fd: TreeFolder): string {
  return `${kb.slug}::${fd.id}`
}

function kbHasBranches(kb: TreeKb): boolean {
  return kb.rootDocuments.length > 0 || kb.folders.length > 0
}

function folderHasDocs(fd: TreeFolder): boolean {
  return fd.documents.length > 0
}

function isKbOpen(kb: TreeKb): boolean {
  return kbOpen.value[kb.slug] !== false
}

function toggleKb(kb: TreeKb): void {
  const nextOpen = !isKbOpen(kb)
  kbOpen.value = { ...kbOpen.value, [kb.slug]: nextOpen }
  if (nextOpen) {
    const fo = { ...folderOpen.value }
    for (const fd of kb.folders) {
      fo[folderRowKey(kb, fd)] = false
    }
    folderOpen.value = fo
  }
}

function isFolderOpen(kb: TreeKb, fd: TreeFolder): boolean {
  return folderOpen.value[folderRowKey(kb, fd)] === true
}

function toggleFolder(kb: TreeKb, fd: TreeFolder): void {
  const k = folderRowKey(kb, fd)
  folderOpen.value = { ...folderOpen.value, [k]: !isFolderOpen(kb, fd) }
}

/** 搜索时自动展开路径，否则匹配项可能被收起的节点挡住 */
watch(
  () => norm(treeFilter.value),
  (q) => {
    if (!q) return
    const nextKb: Record<string, boolean> = { ...kbOpen.value }
    const nextFo: Record<string, boolean> = { ...folderOpen.value }
    for (const kb of visibleTree.value) {
      nextKb[kb.slug] = true
      for (const fd of kb.folders) {
        nextFo[folderRowKey(kb, fd)] = true
      }
    }
    kbOpen.value = nextKb
    folderOpen.value = nextFo
  },
)

async function req(method: string, url: string, body?: unknown): Promise<{ ok: boolean; status: number; json: unknown }> {
  credError.value = ''
  const init: RequestInit = { method, credentials: 'include' }
  if (body !== undefined && method !== 'GET') {
    init.headers = { 'Content-Type': 'application/json; charset=utf-8' }
    init.body = JSON.stringify(body)
  }
  const r = await fetch(url, init)
  let json: unknown = null
  try {
    json = await r.json()
  } catch {
    /* ignore */
  }
  return { ok: r.ok, status: r.status, json }
}

async function reloadTree(): Promise<void> {
  treeLoading.value = true
  credError.value = ''
  try {
    const r = await fetch('/api/v1/tree')
    if (!r.ok) {
      credError.value = '无法加载目录树'
      tree.value = []
      return
    }
    tree.value = (await r.json()) as TreeKb[]
  } catch {
    credError.value = '加载失败'
    tree.value = []
  } finally {
    treeLoading.value = false
  }
}

onMounted(() => {
  void reloadTree()
})

watch(
  () => props.docSlug,
  async (slug) => {
    inlineDocEditing.value = false
    inlineDocError.value = ''
    const trimmed = slug?.trim() ?? ''
    if (trimmed) {
      creatingDoc.value = false
    }
    if (pendingInlineEdit.value?.trim() !== trimmed) {
      pendingInlineEdit.value = null
    }
    libraryDoc.value = null
    staticPost.value = undefined
    if (!slug?.trim()) {
      docLoading.value = false
      return
    }
    docLoading.value = true
    try {
      const res = await fetch(`/api/v1/documents/${encodeURIComponent(slug)}`)
      if (res.ok) {
        libraryDoc.value = (await res.json()) as LibraryDocumentDetail
      } else {
        libraryDoc.value = null
        staticPost.value = props.staticPosts.find((p) => p.slug === slug)
      }
    } catch {
      libraryDoc.value = null
      staticPost.value = props.staticPosts.find((p) => p.slug === slug)
    } finally {
      docLoading.value = false
    }
  },
  { immediate: true },
)

watch(
  () => [libraryDoc.value?.slug, props.docSlug?.trim()] as const,
  () => {
    const pending = pendingInlineEdit.value?.trim()
    if (!pending) return
    const d = libraryDoc.value
    const cur = props.docSlug?.trim()
    if (!d || d.slug !== pending || cur !== pending) return
    pendingInlineEdit.value = null
    beginInlineEdit()
  },
)

function goDoc(slug: string): void {
  window.location.hash = `post-${slug}`
}

function goDocFromKb(kb: TreeKb): void {
  const first =
    kb.rootDocuments[0] ??
    kb.folders.flatMap((f) => f.documents)[0]
  if (first) goDoc(first.slug)
}

async function reloadCurrentDoc(): Promise<void> {
  const slug = props.docSlug?.trim()
  if (!slug) return
  docLoading.value = true
  try {
    const res = await fetch(`/api/v1/documents/${encodeURIComponent(slug)}`)
    if (res.ok) libraryDoc.value = (await res.json()) as LibraryDocumentDetail
  } finally {
    docLoading.value = false
  }
}

function beginInlineEdit(): void {
  const d = libraryDoc.value
  if (!d) return
  const merged = mergeTitleLeadingH1(d.title, d.body_html)
  editDraft.value = {
    bodyHtml: injectHeadingAnchors(sanitizeFeedbackHtml(merged)),
  }
  inlineDocEditing.value = true
  inlineDocError.value = ''
}

function cancelInlineDoc(): void {
  inlineDocEditing.value = false
  inlineDocError.value = ''
  pendingInlineEdit.value = null
}

async function saveInlineDoc(): Promise<void> {
  inlineDocError.value = ''
  const d = libraryDoc.value
  if (!d) return
  const split = splitTitleFromBody(editDraft.value.bodyHtml)
  const title = split.title.trim()
  const bodyHtml = split.bodyHtml.trim() || '<p></p>'
  if (!title) {
    inlineDocError.value = '正文首行需为一级标题（文档标题）'
    return
  }
  const payload = {
    title,
    bodyHtml,
    knowledgeBaseSlug: d.knowledge_base_slug,
    folderSlug: (d.folder_slug ?? '').trim(),
    excerpt: d.excerpt,
    category: d.category?.trim() || 'Notes',
    tags: Array.isArray(d.tags) ? d.tags : [],
    cover: d.cover ?? '',
  }
  const { ok, json } = await req('PUT', `/api/v1/documents/${encodeURIComponent(d.slug)}`, payload)
  if (!ok) {
    inlineDocError.value = (json as { error?: string })?.error ?? '保存失败'
    return
  }
  inlineDocEditing.value = false
  await reloadTree()
  await reloadCurrentDoc()
}

function openNewKb(): void {
  kbEditing.value = false
  fKb.value = { slug: '', title: '', description: '' }
  modalError.value = ''
  modal.value = 'kb'
}

function openEditKb(kb: TreeKb): void {
  kbEditing.value = true
  fKb.value = { slug: kb.slug, title: String(kb.title), description: String(kb.description ?? '') }
  modalError.value = ''
  modal.value = 'kb'
}

async function submitKb(): Promise<void> {
  modalError.value = ''
  if (!fKb.value.title.trim()) {
    modalError.value = '请填写标题'
    return
  }
  const body = { title: fKb.value.title.trim(), description: fKb.value.description, sortOrder: 0 }
  if (kbEditing.value) {
    const { ok, json } = await req('PUT', `/api/v1/knowledge-bases/${encodeURIComponent(fKb.value.slug)}`, body)
    if (!ok) {
      modalError.value = (json as { error?: string })?.error ?? '保存失败'
      return
    }
  } else {
    const { ok, json } = await req('POST', '/api/v1/knowledge-bases', body)
    if (!ok) {
      modalError.value = (json as { error?: string })?.error ?? '创建失败'
      return
    }
  }
  modal.value = null
  await reloadTree()
}

async function deleteKb(slug: string): Promise<void> {
  if (!window.confirm(`确定删除知识库「${slug}」？`)) return
  const { ok, json } = await req('DELETE', `/api/v1/knowledge-bases/${encodeURIComponent(slug)}`, {})
  if (!ok) {
    credError.value = (json as { error?: string })?.error ?? '删除失败'
    return
  }
  await reloadTree()
}

function openNewFolder(kbSlug: string): void {
  folderEditing.value = false
  contextKbSlug.value = kbSlug
  fFolder.value = { slug: '', title: '' }
  modalError.value = ''
  modal.value = 'folder'
}

function openEditFolder(kbSlug: string, fd: TreeFolder): void {
  folderEditing.value = true
  contextKbSlug.value = kbSlug
  fFolder.value = { slug: fd.slug, title: fd.title }
  modalError.value = ''
  modal.value = 'folder'
}

async function submitFolder(): Promise<void> {
  modalError.value = ''
  if (!fFolder.value.title.trim()) {
    modalError.value = '请填写标题'
    return
  }
  const kb = contextKbSlug.value
  const body = { title: fFolder.value.title.trim(), sortOrder: 0 }
  if (folderEditing.value) {
    const { ok, json } = await req(
      'PUT',
      `/api/v1/knowledge-bases/${encodeURIComponent(kb)}/folders/${encodeURIComponent(fFolder.value.slug)}`,
      body,
    )
    if (!ok) {
      modalError.value = (json as { error?: string })?.error ?? '保存失败'
      return
    }
  } else {
    const { ok, json } = await req('POST', `/api/v1/knowledge-bases/${encodeURIComponent(kb)}/folders`, body)
    if (!ok) {
      modalError.value = (json as { error?: string })?.error ?? '创建失败'
      return
    }
  }
  modal.value = null
  await reloadTree()
}

async function deleteFolder(kbSlug: string, folderSlug: string): Promise<void> {
  if (!window.confirm(`确定删除目录「${folderSlug}」？`)) return
  const { ok, json } = await req(
    'DELETE',
    `/api/v1/knowledge-bases/${encodeURIComponent(kbSlug)}/folders/${encodeURIComponent(folderSlug)}`,
    {},
  )
  if (!ok) {
    credError.value = (json as { error?: string })?.error ?? '删除失败'
    return
  }
  await reloadTree()
}

function openNewDocKb(kbSlug: string): void {
  openNewDoc(kbSlug, '')
}

function openNewDocFolder(kbSlug: string, folderSlug: string): void {
  openNewDoc(kbSlug, folderSlug)
}

function openNewDoc(kbSlug: string, folderSlug: string): void {
  inlineDocEditing.value = false
  creatingDoc.value = true
  newDocDraft.value = {
    bodyHtml: '<h1>无标题</h1><p></p>',
    knowledgeBaseSlug: kbSlug,
    folderSlug,
  }
  newDocError.value = ''
  window.location.hash = '#docs'
}

function openEditDoc(slug: string): void {
  const s = slug.trim()
  const cur = props.docSlug?.trim()
  inlineDocError.value = ''
  if (s !== cur) {
    pendingInlineEdit.value = s
    goDoc(s)
    return
  }
  beginInlineEdit()
}

async function deleteDoc(slug: string): Promise<void> {
  if (!window.confirm(`确定删除文档「${slug}」？`)) return
  const { ok, json } = await req('DELETE', `/api/v1/documents/${encodeURIComponent(slug)}`, {})
  if (!ok) {
    credError.value = (json as { error?: string })?.error ?? '删除失败'
    return
  }
  if (slug === props.docSlug) window.location.hash = '#docs'
  await reloadTree()
}
</script>

<style scoped>
.lib-workspace--fullscreen {
  height: 100%;
  min-height: 0;
  display: flex;
  flex-direction: column;
  padding: 0;
}

.lib-workspace__main-stack {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  min-height: 0;
}

.lib-workspace__pen-slot {
  position: sticky;
  bottom: 0.75rem;
  display: flex;
  justify-content: flex-end;
  padding-top: 0.25rem;
  pointer-events: none;
}

.lib-workspace__pen-btn {
  pointer-events: auto;
  border-radius: 999px;
}

.lib-workspace__layout {
  flex: 1;
  min-height: 0;
  display: grid;
  grid-template-columns: minmax(240px, 300px) minmax(0, 1fr) minmax(180px, 240px);
  gap: 0.65rem;
  align-items: stretch;
}

.lib-workspace__layout--tree-collapsed {
  grid-template-columns: 2.75rem minmax(0, 1fr) minmax(180px, 240px);
}

.lib-workspace__layout--outline-collapsed {
  grid-template-columns: minmax(240px, 300px) minmax(0, 1fr) 2.75rem;
}

.lib-workspace__layout--tree-collapsed.lib-workspace__layout--outline-collapsed {
  grid-template-columns: 2.75rem minmax(0, 1fr) 2.75rem;
}

.lib-workspace__rail-toggle {
  appearance: none;
  flex-shrink: 0;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  padding: 0.4rem 0.15rem;
  margin-bottom: 0.5rem;
  border: none;
  border-radius: var(--radius-sm, 10px);
  background: color-mix(in srgb, var(--color-surface-solid) 55%, transparent);
  color: var(--color-text-muted);
  cursor: pointer;
  font-size: 0.75rem;
}

.lib-workspace__rail-toggle:hover {
  color: var(--color-text-strong);
  background: color-mix(in srgb, var(--color-surface-solid) 72%, transparent);
}

.lib-workspace__col--rail-collapsed .lib-workspace__rail-toggle {
  margin-bottom: 0;
}

.lib-workspace__rail-chev {
  line-height: 1;
}

.lib-workspace__col--tree.lib-workspace__col--rail-collapsed {
  padding: 0.45rem 0.28rem;
  align-items: center;
}

.lib-workspace__col--outline.lib-workspace__col--rail-collapsed {
  padding: 0.45rem 0.28rem;
  align-items: center;
}

.lib-workspace__outline-inner {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  width: 100%;
  min-width: 0;
  padding-top: 0;
  padding-inline: 0;
  padding-bottom: 0.15rem;
}

.lib-workspace__facts {
  flex-shrink: 0;
  margin: 0;
  padding: 0 0.05rem 0.65rem;
  margin-bottom: 0.55rem;
  border-bottom: 1px solid var(--border-subtle, rgba(120, 120, 140, 0.22));
}

.lib-workspace__fact {
  margin: 0 0 0.55rem;
  min-width: 0;
}

.lib-workspace__fact:last-child {
  margin-bottom: 0;
}

.lib-workspace__fact dt {
  margin: 0 0 0.18rem;
  font-size: 0.66rem;
  font-weight: 650;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--color-text-muted);
}

.lib-workspace__fact dd {
  margin: 0;
  font-size: 0.8125rem;
  line-height: 1.45;
  color: var(--color-text-strong);
  white-space: normal;
  overflow-wrap: anywhere;
}

.lib-workspace__fact--tags dd {
  color: var(--color-text-muted);
  font-size: 0.78rem;
}

.lib-workspace__col--main.lib-workspace__col--main--clamp-editor {
  display: flex;
  flex-direction: column;
  overflow: hidden !important;
  padding-top: 0;
  padding-bottom: 0;
  padding-inline: clamp(0.02rem, 0.25vw, 0.25rem);
}

.lib-workspace__col--main--clamp-editor > .lib-workspace__main-stack--fill,
.lib-workspace__col--main--clamp-editor > .lib-workspace__new-doc-sheet {
  flex: 1;
  min-height: 0;
}

.lib-workspace__main-stack--fill {
  flex: 1;
  min-height: 0;
}

.lib-workspace__main-stack--fill :deep(.article-detail--lib) {
  flex: 1;
  min-height: 0;
}

@media (max-width: 960px) {
  .lib-workspace__layout--tree-collapsed,
  .lib-workspace__layout--outline-collapsed,
  .lib-workspace__layout--tree-collapsed.lib-workspace__layout--outline-collapsed {
    grid-template-columns: 1fr;
  }
  .lib-workspace__layout {
    grid-template-columns: 1fr;
    flex: unset;
    min-height: auto;
    overflow: visible;
  }
  .lib-workspace--fullscreen {
    height: auto;
    min-height: 100vh;
  }
  .lib-workspace__col--outline {
    order: 3;
  }
}

.lib-workspace__col--tree {
  display: flex;
  flex-direction: column;
  min-height: 0;
  min-width: 0;
  overflow: hidden;
  padding: 0.65rem 0.75rem;
}

.lib-workspace__tree-scroll {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  overflow-x: hidden;
  overscroll-behavior: contain;
}

.lib-workspace__search {
  flex-shrink: 0;
  width: 100%;
  margin-bottom: 0.55rem;
  font: inherit;
  padding: 0.45rem 0.55rem;
  border-radius: 8px;
  border: 1px solid var(--color-border);
  background: color-mix(in srgb, var(--color-surface-solid) 70%, transparent);
  color: var(--color-text-strong);
}

.lib-workspace__col--main {
  min-width: 0;
  min-height: 0;
  overflow-y: auto;
  overflow-x: hidden;
  overscroll-behavior: contain;
  padding-inline: clamp(0.05rem, 0.35vw, 0.35rem);
  padding-bottom: 1.25rem;
}

.lib-workspace__outline-hint {
  margin: 0;
  padding: 0.9rem 1rem;
  font-size: 0.8325rem;
  line-height: 1.55;
  color: var(--color-text-muted);
  border-radius: var(--radius-md, 14px);
  border: 1px solid var(--color-border);
  background: var(--color-surface);
}

.lib-workspace__col--outline {
  display: flex;
  flex-direction: column;
  min-height: 0;
  min-width: 0;
  overflow: hidden;
  padding: 0.65rem 0.75rem;
}

.lib-workspace__outline-scroll {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  overflow-x: hidden;
  overscroll-behavior: contain;
}

.lib-workspace__placeholder {
  padding: 2rem 1.25rem;
}

.lib-workspace__new-doc-sheet {
  display: flex;
  flex-direction: column;
  flex: 1;
  min-height: 0;
  padding: clamp(0.65rem, 1.2vw, 0.9rem);
  gap: 0;
}

.lib-workspace__new-doc-editor-wrap {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  border-radius: var(--radius-md, 14px);
  border: 1px solid var(--color-border);
  background: var(--color-surface);
}

/** 新建文档：禁止语雀根节点用 min-height 把编辑区撑满整屏，否则会盖住底部按钮 */
.lib-workspace__new-doc-editor-wrap :deep(.yuque-doc-editor),
.lib-workspace__new-doc-editor-wrap :deep(.yuque-doc-editor--layout-fill) {
  flex: 1;
  min-height: 0 !important;
}

.lib-workspace__new-doc-actions {
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  margin-top: 0.65rem;
  padding-top: 0.65rem;
  border-top: 1px solid var(--color-border, rgba(120, 120, 140, 0.25));
  background: color-mix(in srgb, var(--color-surface-solid) 92%, transparent);
  position: relative;
  z-index: 2;
}

.lib-workspace__new-doc-buttons {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.lib-workspace__new-kb {
  flex-shrink: 0;
  margin-top: 0.6rem;
  padding-top: 0.65rem;
  border-top: 1px solid var(--color-border);
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.lib-tree {
  list-style: none;
  margin: 0;
  padding: 0;
}

.lib-tree__block {
  margin-bottom: 1rem;
}

.lib-tree__nested {
  list-style: none;
  margin: 0.35rem 0 0 0.85rem;
  padding: 0 0 0 0.65rem;
  border-left: 1px solid var(--border-subtle, rgba(120, 120, 140, 0.25));
}

.lib-tree__folder {
  margin-bottom: 0.5rem;
}

.lib-tree__row {
  display: grid;
  grid-template-columns: 1.35rem minmax(0, 1fr) auto;
  align-items: center;
  column-gap: 0.4rem;
  padding: 0.28rem 0.35rem;
  margin: 0.08rem 0;
  border-radius: 8px;
  cursor: pointer;
  min-height: 2rem;
}

.lib-tree__row--doc:hover,
.lib-tree__row.is-active {
  background: rgba(120, 120, 140, 0.1);
}

.lib-tree__row.is-active {
  outline: 1px solid rgba(120, 120, 160, 0.35);
}

.lib-tree__row--kb,
.lib-tree__row--folder {
  cursor: default;
  font-weight: 600;
  grid-template-columns: 1.25rem 1.35rem minmax(0, 1fr) auto;
}

.lib-tree__row--folder {
  font-weight: 500;
}

.lib-tree__twisty {
  appearance: none;
  margin: 0;
  padding: 0.12rem;
  border: none;
  border-radius: 6px;
  background: transparent;
  color: inherit;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  align-self: center;
}

.lib-tree__twisty:hover {
  background: rgba(120, 120, 140, 0.14);
}

.lib-tree__twisty-spacer {
  width: 1.25rem;
  flex-shrink: 0;
  justify-self: center;
}

.lib-tree__twisty-chev {
  width: 13px;
  height: 13px;
  display: block;
  transform: rotate(0deg);
  transition: transform 0.16s var(--ease-soft, cubic-bezier(0.4, 0, 0.2, 1));
}

.lib-tree__twisty-chev--open {
  transform: rotate(90deg);
}

.lib-workspace__hint {
  margin: 0 0 0.75rem;
  line-height: 1.45;
  font-size: 0.82rem;
}

.lib-tree__hit {
  min-width: 0;
  text-align: left;
  border: none;
  background: none;
  color: inherit;
  font: inherit;
  font-weight: 600;
  cursor: pointer;
  padding: 0.15rem 0;
}

.lib-tree__hit:hover {
  text-decoration: underline;
  text-underline-offset: 0.2em;
}

.lib-tree__icon {
  flex-shrink: 0;
  opacity: 0.85;
}

.lib-tree__text {
  min-width: 0;
}

.lib-tree__hit.lib-tree__ellipsis {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.lib-tree__ellipsis {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.lib-tree__actions {
  display: flex;
  flex-wrap: nowrap;
  gap: 0.12rem;
  opacity: 0;
  pointer-events: none;
  transition: opacity 0.15s ease;
}

.lib-tree__icon-btn {
  width: 1.65rem;
  height: 1.65rem;
  min-height: unset;
  padding: 0;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: none;
  border-radius: 7px;
  font-size: 0.85rem;
  line-height: 1;
  cursor: pointer;
  color: inherit;
  background: rgba(120, 120, 140, 0.12);
}

.lib-tree__icon-btn:hover {
  background: rgba(120, 120, 160, 0.22);
}

.lib-tree__icon-btn--danger:hover {
  background: rgba(196, 92, 92, 0.25);
  color: var(--danger, #c45c5c);
}

.lib-tree__row:hover .lib-tree__actions {
  opacity: 1;
  pointer-events: auto;
}

@media (hover: none) {
  .lib-tree__actions {
    opacity: 1;
    pointer-events: auto;
  }
}

.btn--xs {
  font-size: 0.72rem;
  padding: 0.15rem 0.35rem;
  min-height: unset;
}

.lib-workspace__err {
  color: var(--danger, #c45c5c);
  font-size: 0.88rem;
}

.lib-workspace__modal {
  position: fixed;
  inset: 0;
  z-index: 50;
  background: rgba(0, 0, 0, 0.45);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1rem;
}

.lib-workspace__dialog {
  width: min(440px, 100%);
  max-height: 90vh;
  overflow: auto;
  padding: 1.25rem 1.35rem;
}

.lib-workspace__dialog--wide {
  width: min(720px, 100%);
}

.lib-workspace__dialog h3 {
  margin: 0 0 0.75rem;
  font-size: 1.1rem;
}

.lib-workspace__dialog label {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  margin-bottom: 0.65rem;
  font-size: 0.88rem;
}

.lib-workspace__dialog input {
  font: inherit;
  padding: 0.45rem 0.55rem;
  border-radius: 8px;
  border: 1px solid var(--border-subtle, rgba(120, 120, 140, 0.28));
  background: var(--surface-elevated, rgba(255, 255, 255, 0.05));
  color: inherit;
}

.lib-workspace__editor-label {
  display: block;
}

.lib-workspace__dialog-actions {
  display: flex;
  gap: 0.5rem;
  margin-top: 0.75rem;
}

.lib-workspace__icon-act {
  width: 2.35rem;
  height: 2.35rem;
  min-height: unset;
  padding: 0;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 10px;
  font-size: 1.1rem;
  line-height: 1;
}
</style>
