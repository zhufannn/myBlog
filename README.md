# 拾光札记 Personal Blog

一个使用 Node.js、TypeScript、Vue3 和 Vite 构建的个人博客网站。页面包含首页介绍、文章搜索、分类筛选、文章详情、关于作者和订阅交互。博客文章数据暂存在项目内，后续可以替换为接口、Markdown 或 CMS。

## 技术栈

- Vue 3 + Composition API
- TypeScript
- Vite
- CSS3 响应式布局
- Vercel 静态部署配置

## 本地运行

```bash
npm install
npm run dev
```

## 构建验证

```bash
npm run build
npm run preview
```

## 内容维护

文章数据位于 `src/data/blog.ts`，新增文章时复制 `posts` 数组中的对象并修改：

- `slug`: 文章唯一地址标识
- `title`: 标题
- `excerpt`: 摘要
- `category`: 分类
- `tags`: 标签
- `content`: 正文段落数组

## 部署到 Vercel

1. 将项目推送到 GitHub、GitLab 或 Bitbucket。
2. 在 Vercel 新建项目并导入仓库。
3. Framework Preset 选择 `Vite`。
4. Build Command 使用 `npm run build`。
5. Output Directory 使用 `dist`。
6. 点击 Deploy。

项目已包含 `vercel.json`，用于处理单页应用路由回退到 `index.html`。

## 说明

当前本地环境 Node 版本为 14.x，因此项目使用兼容该版本的 Vite 4 配置。如果使用 Node 18 或更高版本，也可以后续升级依赖到最新版。
