import type { BlogPost, ProfileLink } from '../types/blog'

export const profile = {
  name: '诸凡',
  role: '前端开发工程师 · 成都',
  headline: '把技术、审美与日常观察写成可以反复回看的札记。',
  location: '成都，中国',
  avatar: 'https://cdn.myanimelist.net/images/characters/3/512788.jpg',
}
export const profileLinks: ProfileLink[] = [
  { label: 'GitHub', value: '@time-notes', href: 'https://github.com' },
  { label: 'Email', value: '1040079402@qq.com', href: 'mailto:1040079402@qq.com' },
  { label: '履历', value: 'PDF 同步详情页', href: '#resume' },
  { label: 'Newsletter', value: '每周日更新', href: '#subscribe' },
]

export const posts: BlogPost[] = [
  {
    slug: 'designing-a-calm-workflow',
    title: '给创作系统留一点呼吸感',
    excerpt: '记录我如何把任务、灵感和复盘拆成三个小循环，让工作台不再被待办列表淹没。',
    date: '2026-05-02',
    readTime: '6 min read',
    category: 'Productivity',
    cover: 'linear-gradient(145deg, #d8dde4 0%, #bcc4ce 100%)',
    mood: 'Calm',
    tags: ['工作流', '复盘', 'Notion'],
    content: [
      '一个好用的创作系统不应该让人产生维护系统本身的压力。它更像一张安静的桌面：重要的东西就在手边，不重要的东西自然被收进抽屉。',
      '我现在把所有记录分为三类：今天要推进的任务、随手捕捉的想法、每周固定回看的观察。这样的颗粒度足够轻，也足够帮助我在忙碌时找回方向。',
      '真正改变效率的不是模板数量，而是每个入口是否清晰。只保留最常用的动作，反而能让长期坚持变得更容易。',
    ],
  },
  {
    slug: 'vue-composition-notes',
    title: 'Vue 组合式 API 的三个实践习惯',
    excerpt: '从状态命名、逻辑拆分到副作用管理，总结几个在中小型项目里很实用的 Vue3 写法。',
    date: '2026-04-18',
    readTime: '8 min read',
    category: 'Engineering',
    cover: 'linear-gradient(145deg, #cad4ce 0%, #aeb8ba 100%)',
    mood: 'Focused',
    tags: ['Vue3', 'TypeScript', '前端工程'],
    content: [
      '组合式 API 的价值不只是把代码写进 setup，而是让一段业务逻辑能以更清晰的形状存在。命名良好的 computed 和 composable 往往比注释更能表达意图。',
      '我倾向于把页面状态分成三层：原始数据、派生视图、用户动作。这样在排查问题时，可以很快知道数据变化来自哪里。',
      '副作用要靠近它依赖的状态，同时避免把网络请求、滚动监听和 UI 状态混在同一个函数里。清晰的边界会让后续维护轻松很多。',
    ],
  },
  {
    slug: 'weekend-city-walk',
    title: '周末城市漫游：从街角咖啡到河边黄昏',
    excerpt: '一次没有明确目的的散步，反而收集到了最近最喜欢的色彩、气味和灵感。',
    date: '2026-03-30',
    readTime: '5 min read',
    category: 'Life',
    cover: 'linear-gradient(145deg, #c9c9d8 0%, #b2b8c9 100%)',
    mood: 'Warm',
    tags: ['城市观察', '摄影', '生活'],
    content: [
      '有时候最好的周末计划，就是不做计划。沿着熟悉的街道慢慢走，会发现一些平时被速度略过的小细节。',
      '下午四点的光落在旧楼外墙上，咖啡店门口的风铃被风吹响，河边有人在练习萨克斯。这些片段没有宏大的意义，却让人重新感到生活是具体的。',
      '我把几张照片和几句短句存进了素材库。未来某一天，它们也许会变成一篇文章、一张海报，或者只是提醒我曾经认真看过这个城市。',
    ],
  },
  {
    slug: 'small-products-big-details',
    title: '小产品里的大细节',
    excerpt: '那些看似微小的空状态、加载提示和按钮反馈，为什么会决定用户是否愿意继续探索。',
    date: '2026-03-12',
    readTime: '7 min read',
    category: 'Design',
    cover: 'linear-gradient(145deg, #d4cdd4 0%, #bfb6bc 100%)',
    mood: 'Bright',
    tags: ['体验设计', '交互', '产品'],
    content: [
      '用户对产品的信任经常来自细节：点击后是否有反馈，加载时是否知道还要等多久，空页面是否告诉下一步能做什么。',
      '这些地方通常不在主流程里，却在真实使用中频繁出现。把它们做好，会让产品显得更有温度，也更可靠。',
      '设计细节不是装饰，而是沟通。它告诉用户：系统理解你现在的状态，也准备好了接住你的下一步。',
    ],
  },
]

export const categories = ['All', ...Array.from(new Set(posts.map((post) => post.category)))]
