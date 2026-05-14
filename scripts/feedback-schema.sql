-- 可选：在 Vercel Postgres「SQL 编辑器」中手动执行（与 api/feedback.ts 自动建表等价）
CREATE TABLE IF NOT EXISTS feedback (
  id TEXT PRIMARY KEY,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  role TEXT NOT NULL CHECK (role IN ('member', 'guest')),
  author_label TEXT NOT NULL,
  message TEXT NOT NULL CHECK (char_length(message) <= 2000000)
);

CREATE INDEX IF NOT EXISTS feedback_created_at_idx ON feedback (created_at DESC);

-- 若早期建表为 2000 字限制，可在控制台执行：
-- ALTER TABLE feedback DROP CONSTRAINT IF EXISTS feedback_message_check;
-- ALTER TABLE feedback ADD CONSTRAINT feedback_message_check CHECK (char_length(message) <= 2000000);
