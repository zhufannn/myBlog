-- 知识库 / 目录 / 文档 / 评论：与 api/lib/libraryCore.ts 自动建表一致；可手动在 Neon SQL 编辑器执行。

CREATE TABLE IF NOT EXISTS blog_knowledge_bases (
  id TEXT PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS blog_folders (
  id TEXT PRIMARY KEY,
  knowledge_base_id TEXT NOT NULL REFERENCES blog_knowledge_bases(id) ON DELETE CASCADE,
  slug TEXT NOT NULL,
  title TEXT NOT NULL,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (knowledge_base_id, slug)
);

CREATE INDEX IF NOT EXISTS blog_folders_kb_idx ON blog_folders (knowledge_base_id);

CREATE TABLE IF NOT EXISTS blog_documents (
  id TEXT PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  excerpt TEXT NOT NULL DEFAULT '',
  cover TEXT NOT NULL DEFAULT '',
  category TEXT NOT NULL DEFAULT 'Notes',
  tags TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  body_html TEXT NOT NULL,
  author_id TEXT NOT NULL REFERENCES blog_users(id),
  knowledge_base_id TEXT NOT NULL REFERENCES blog_knowledge_bases(id) ON DELETE CASCADE,
  folder_id TEXT REFERENCES blog_folders(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS blog_documents_kb_folder_idx ON blog_documents (knowledge_base_id, folder_id);

CREATE TABLE IF NOT EXISTS blog_document_comments (
  id TEXT PRIMARY KEY,
  document_id TEXT NOT NULL REFERENCES blog_documents(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  role TEXT NOT NULL CHECK (role IN ('member', 'guest')),
  author_label TEXT NOT NULL,
  message TEXT NOT NULL CHECK (char_length(message) <= 2000000)
);

CREATE INDEX IF NOT EXISTS blog_document_comments_doc_created_idx ON blog_document_comments (document_id, created_at DESC);
