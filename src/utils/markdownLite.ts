/**
 * markdownLite ;  a deliberately tiny, zero-dependency markdown renderer
 * for the AI Chat panel (FR-6.9). Supports: bold, italic, inline code,
 * fenced code blocks, unordered & ordered lists, headings, links, and
 * horizontal rules. Aggressively escapes HTML so a model response can
 * never inject a script tag.
 *
 * Strict-mode-safe: never relies on `arr[i]` returning a defined value.
 */

export type MdBlock =
  | { kind: 'p'; inlines: MdInline[] }
  | { kind: 'h'; level: 1 | 2 | 3 | 4; inlines: MdInline[] }
  | { kind: 'ul'; items: MdInline[][] }
  | { kind: 'ol'; items: MdInline[][] }
  | { kind: 'code'; lang: string; text: string }
  | { kind: 'hr' }

export type MdInline =
  | { kind: 'text'; text: string }
  | { kind: 'bold'; children: MdInline[] }
  | { kind: 'italic'; children: MdInline[] }
  | { kind: 'code'; text: string }
  | { kind: 'link'; href: string; children: MdInline[] }

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

/* ---------- inline parser ---------- */

function isWordChar(ch: string | undefined): boolean {
  return !!ch && /\w/.test(ch)
}

function parseInlines(input: string): MdInline[] {
  const out: MdInline[] = []
  let buffer = ''

  const flush = () => {
    if (buffer) {
      out.push({ kind: 'text', text: buffer })
      buffer = ''
    }
  }

  let i = 0
  while (i < input.length) {
    const ch = input.charAt(i)
    const next = input.charAt(i + 1)

    // inline code
    if (ch === '`') {
      const end = input.indexOf('`', i + 1)
      if (end > i) {
        flush()
        out.push({ kind: 'code', text: input.slice(i + 1, end) })
        i = end + 1
        continue
      }
    }

    // bold **x**
    if (ch === '*' && next === '*') {
      const end = input.indexOf('**', i + 2)
      if (end > i + 1) {
        flush()
        out.push({ kind: 'bold', children: parseInlines(input.slice(i + 2, end)) })
        i = end + 2
        continue
      }
    }

    // italic *x*
    if (ch === '*' && next !== '*' && !isWordChar(input.charAt(i - 1))) {
      // find the closing *
      let j = i + 1
      while (j < input.length) {
        const cj = input.charAt(j)
        if (cj === '*' && input.charAt(j + 1) !== '*') break
        j++
      }
      if (j < input.length && j > i + 1) {
        flush()
        out.push({ kind: 'italic', children: parseInlines(input.slice(i + 1, j)) })
        i = j + 1
        continue
      }
    }

    // link [text](url)
    if (ch === '[') {
      const closeText = input.indexOf(']', i + 1)
      if (closeText !== -1 && input.charAt(closeText + 1) === '(') {
        const closeUrl = input.indexOf(')', closeText + 2)
        if (closeUrl !== -1) {
          const label = input.slice(i + 1, closeText)
          const href = input.slice(closeText + 2, closeUrl)
          if (/^https?:\/\//i.test(href) || href.startsWith('/')) {
            flush()
            out.push({ kind: 'link', href, children: parseInlines(label) })
            i = closeUrl + 1
            continue
          }
        }
      }
    }

    buffer += ch
    i++
  }

  flush()
  return out
}

/* ---------- block parser ---------- */

function isBlank(line: string): boolean {
  return line.trim().length === 0
}

function isBlockBoundary(line: string): boolean {
  if (isBlank(line)) return true
  if (/^#{1,4}\s+/.test(line)) return true
  if (/^```/.test(line)) return true
  if (/^---\s*$/.test(line)) return true
  if (/^[-*+]\s+/.test(line)) return true
  if (/^\d+\.\s+/.test(line)) return true
  return false
}

export function parseMarkdown(input: string): MdBlock[] {
  const lines = input.replace(/\r\n?/g, '\n').split('\n')
  const blocks: MdBlock[] = []

  let i = 0
  while (i < lines.length) {
    const line = lines[i] ?? ''

    if (isBlank(line)) {
      i++
      continue
    }

    if (/^---\s*$/.test(line)) {
      blocks.push({ kind: 'hr' })
      i++
      continue
    }

    if (/^```/.test(line)) {
      const lang = line.replace(/^```/, '').trim()
      const buf: string[] = []
      i++
      while (i < lines.length) {
        const cur = lines[i] ?? ''
        if (/^```/.test(cur)) {
          i++
          break
        }
        buf.push(cur)
        i++
      }
      blocks.push({ kind: 'code', lang, text: buf.join('\n') })
      continue
    }

    const heading = /^(#{1,4})\s+(.*)$/.exec(line)
    if (heading) {
      const hashes = heading[1] ?? '#'
      const level = Math.min(4, Math.max(1, hashes.length)) as 1 | 2 | 3 | 4
      const text = heading[2] ?? ''
      blocks.push({ kind: 'h', level, inlines: parseInlines(text) })
      i++
      continue
    }

    if (/^[-*+]\s+/.test(line)) {
      const items: MdInline[][] = []
      while (i < lines.length) {
        const cur = lines[i] ?? ''
        if (!/^[-*+]\s+/.test(cur)) break
        items.push(parseInlines(cur.replace(/^[-*+]\s+/, '')))
        i++
      }
      blocks.push({ kind: 'ul', items })
      continue
    }

    if (/^\d+\.\s+/.test(line)) {
      const items: MdInline[][] = []
      while (i < lines.length) {
        const cur = lines[i] ?? ''
        if (!/^\d+\.\s+/.test(cur)) break
        items.push(parseInlines(cur.replace(/^\d+\.\s+/, '')))
        i++
      }
      blocks.push({ kind: 'ol', items })
      continue
    }

    // paragraph
    const para: string[] = [line]
    i++
    while (i < lines.length) {
      const cur = lines[i] ?? ''
      if (isBlockBoundary(cur)) break
      para.push(cur)
      i++
    }
    blocks.push({ kind: 'p', inlines: parseInlines(para.join(' ')) })
  }

  return blocks
}

/* ---------- HTML renderers ---------- */

export function renderInlineToHtml(inlines: MdInline[]): string {
  let html = ''
  for (const node of inlines) {
    switch (node.kind) {
      case 'text':
        html += escapeHtml(node.text)
        break
      case 'bold':
        html += `<strong>${renderInlineToHtml(node.children)}</strong>`
        break
      case 'italic':
        html += `<em>${renderInlineToHtml(node.children)}</em>`
        break
      case 'code':
        html += `<code class="rounded bg-muted px-1 py-0.5 text-[0.85em]">${escapeHtml(node.text)}</code>`
        break
      case 'link': {
        const safeHref = escapeHtml(node.href)
        html += `<a href="${safeHref}" target="_blank" rel="noreferrer noopener" class="text-accent underline">${renderInlineToHtml(node.children)}</a>`
        break
      }
    }
  }
  return html
}

export function renderMarkdownToHtml(input: string): string {
  const blocks = parseMarkdown(input)
  let html = ''
  for (const block of blocks) {
    switch (block.kind) {
      case 'p':
        html += `<p class="mb-2 last:mb-0 leading-relaxed">${renderInlineToHtml(block.inlines)}</p>`
        break
      case 'h': {
        const cls =
          block.level === 1
            ? 'text-lg font-bold mt-2 mb-1'
            : block.level === 2
            ? 'text-base font-bold mt-2 mb-1'
            : 'text-sm font-semibold mt-1.5 mb-0.5'
        html += `<div class="${cls}">${renderInlineToHtml(block.inlines)}</div>`
        break
      }
      case 'ul':
        html += `<ul class="list-disc pl-5 mb-2 space-y-0.5">${block.items
          .map(it => `<li>${renderInlineToHtml(it)}</li>`)
          .join('')}</ul>`
        break
      case 'ol':
        html += `<ol class="list-decimal pl-5 mb-2 space-y-0.5">${block.items
          .map(it => `<li>${renderInlineToHtml(it)}</li>`)
          .join('')}</ol>`
        break
      case 'code':
        html += `<pre class="rounded-lg bg-ink/90 text-surface p-2.5 my-2 overflow-x-auto text-[0.8em]"><code>${escapeHtml(
          block.text,
        )}</code></pre>`
        break
      case 'hr':
        html += '<hr class="my-2 border-muted" />'
        break
    }
  }
  return html
}
