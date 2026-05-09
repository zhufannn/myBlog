export interface BlogPost {
  slug: string
  title: string
  excerpt: string
  date: string
  readTime: string
  category: string
  cover: string
  mood: string
  tags: string[]
  content: string[]
}

export interface ProfileLink {
  label: string
  value: string
  href: string
}
