/** 知识库 API 返回的文档详情（GET /api/v1/documents/:slug） */
export interface LibraryDocumentDetail {
  id: string
  slug: string
  title: string
  excerpt: string
  cover: string
  category: string
  tags: string[]
  body_html: string
  created_at: string
  updated_at: string
  author_id: string
  author_display_name: string
  knowledge_base_slug: string
  knowledge_base_title: string
  folder_slug: string | null
  folder_title: string | null
}

export interface KnowledgeBaseSummary {
  id: string
  slug: string
  title: string
  description: string
  sort_order: number
  created_at: string
  updated_at: string
}

export interface OutlineDocRow {
  id: string
  slug: string
  title: string
  excerpt: string
  category: string
  tags: string[]
  cover: string
  updated_at: string
  author_display_name: string
}

export interface OutlineResponse {
  knowledgeBase: Record<string, unknown>
  rootDocuments: OutlineDocRow[]
  folders: {
    folder: { id: string; slug: string; title: string; sortOrder: unknown }
    documents: OutlineDocRow[]
  }[]
}

/** GET /api/v1/home-feed：首页与筛选用的扁平列表 */
export interface HomeFeedRow {
  slug: string
  title: string
  excerpt: string
  category: string
  tags: string[] | unknown
  cover: string
  updated_at: string
  knowledge_base_slug: string
  knowledge_base_title: string
}

export interface CommentRow {
  id: string
  createdAt: string
  role: string
  authorLabel: string
  message: string
}
