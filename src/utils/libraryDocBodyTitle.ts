/**
 * 文库正文与标题：标题作为编辑器内首行 h1；存储时 body 不含该 h1，打开时再合并。
 */

export function mergeTitleLeadingH1(title: string, bodyHtml: string): string {
  const raw = (bodyHtml ?? '').trim() || '<p></p>'
  try {
    const doc = new DOMParser().parseFromString(raw, 'text/html')
    /** Lake 常把首行标题包在 div 等容器内，不能只看 firstElementChild */
    if (doc.body.querySelector('h1')) {
      return raw
    }
    const h1 = doc.createElement('h1')
    h1.textContent = title.trim() || '无标题'
    doc.body.insertBefore(h1, doc.body.firstChild)
    return doc.body.innerHTML
  } catch {
    const safe = title.trim() || '无标题'
    return `<h1>${escapeForTextNode(safe)}</h1>${raw.startsWith('<') ? raw : `<p>${escapeForTextNode(raw)}</p>`}`
  }
}

export function splitTitleFromBody(bodyHtml: string): { title: string; bodyHtml: string } {
  const raw = (bodyHtml ?? '').trim()
  if (!raw) {
    return { title: '', bodyHtml: '<p></p>' }
  }
  try {
    const doc = new DOMParser().parseFromString(raw, 'text/html')
    const h1 = doc.body.querySelector('h1')
    if (h1) {
      const title = h1.textContent?.trim() ?? ''
      h1.remove()
      const rest = doc.body.innerHTML.trim()
      return { title, bodyHtml: rest || '<p></p>' }
    }
    return { title: '', bodyHtml: raw }
  } catch {
    return { title: '', bodyHtml: raw }
  }
}

function escapeForTextNode(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}
