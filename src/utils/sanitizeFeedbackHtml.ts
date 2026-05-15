import DOMPurify from 'dompurify'

/** 反馈列表渲染：允许常用富文本与 data/http(s) 图片，防 XSS */
export function sanitizeFeedbackHtml(html: string): string {
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS: [
      'p',
      'br',
      'strong',
      'b',
      'em',
      'i',
      'u',
      's',
      'strike',
      'a',
      'img',
      'ul',
      'ol',
      'li',
      'h1',
      'h2',
      'h3',
      'blockquote',
      'code',
      'pre',
      'span',
    ],
    ALLOWED_ATTR: ['href', 'src', 'alt', 'title', 'class', 'id'],
    ALLOW_DATA_ATTR: false,
    ADD_ATTR: ['target', 'rel'],
    FORBID_TAGS: ['style', 'iframe', 'object', 'embed', 'script'],
  })
}
