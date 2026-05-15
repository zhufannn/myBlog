/**
 * 从富文本 HTML 中提取 h1–h3 用于右侧大纲（纯浏览器端）。
 */
export type HeadingOutlineItem = { level: number; text: string; anchor: string }

export function extractHeadingOutline(html: string): HeadingOutlineItem[] {
  if (typeof window === 'undefined' || !html?.trim()) return []
  try {
    const doc = new DOMParser().parseFromString(html, 'text/html')
    const nodes = doc.querySelectorAll('h1, h2, h3')
    const out: HeadingOutlineItem[] = []
    const used = new Map<string, number>()
    nodes.forEach((el, i) => {
      const level = Number(el.tagName[1]) || 2
      const text = el.textContent?.trim() || ''
      if (!text) return
      let base =
        el.id?.trim() ||
        text
          .toLowerCase()
          .replace(/[^\w\u4e00-\u9fff\s-]/g, '')
          .trim()
          .replace(/\s+/g, '-')
      if (!base) base = `section-${i}`
      const n = (used.get(base) ?? 0) + 1
      used.set(base, n)
      const anchor = n > 1 ? `${base}-${n}` : base
      out.push({ level, text, anchor })
    })
    return out
  } catch {
    return []
  }
}

/** 为正文中的 h1–h3 注入与 extractHeadingOutline 一致的 id，供大纲锚点与滚动。 */
export function injectHeadingAnchors(html: string): string {
  if (typeof window === 'undefined' || !html?.trim()) return html
  const outline = extractHeadingOutline(html)
  if (!outline.length) return html
  try {
    const doc = new DOMParser().parseFromString(html, 'text/html')
    const heads = doc.querySelectorAll('h1, h2, h3')
    heads.forEach((el, i) => {
      const o = outline[i]
      if (o && !el.id) el.id = o.anchor
    })
    return doc.body.innerHTML
  } catch {
    return html
  }
}
