-- 用户表：与 api/lib/authCore.ts 自动建表/种子一致；亦可手动在 SQL 编辑器执行。
CREATE TABLE IF NOT EXISTS blog_users (
  id TEXT PRIMARY KEY,
  username TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  display_name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE blog_users ADD COLUMN IF NOT EXISTS is_admin BOOLEAN NOT NULL DEFAULT FALSE;

CREATE INDEX IF NOT EXISTS blog_users_username_lower_idx ON blog_users (lower(username));

-- 首次部署可留空表，由接口在首次访问时写入种子；含管理员 admin（见 authCore SEED_USERS / ensureAdminAccount）。
