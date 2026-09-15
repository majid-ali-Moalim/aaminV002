const ALLOWED_TAGS = new Set([
  'p',
  'br',
  'strong',
  'b',
  'em',
  'i',
  'u',
  'h1',
  'h2',
  'h3',
  'h4',
  'ul',
  'ol',
  'li',
  'a',
  'blockquote',
  'div',
  'span',
]);

/** Basic HTML sanitizer for blog article content. */
export function sanitizeBlogContent(html: string): string {
  if (!html?.trim()) return '';

  let sanitized = html
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '')
    .replace(/\son\w+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, '');

  sanitized = sanitized.replace(/<\/?([a-z0-9]+)([^>]*)>/gi, (match, tag: string, attrs: string) => {
    const normalized = tag.toLowerCase();
    if (!ALLOWED_TAGS.has(normalized)) return '';

    if (normalized === 'a') {
      const hrefMatch = attrs.match(/\shref\s*=\s*("([^"]*)"|'([^']*)'|([^\s>]+))/i);
      const href = hrefMatch?.[2] || hrefMatch?.[3] || hrefMatch?.[4] || '';
      if (!/^https?:\/\//i.test(href) && !/^mailto:/i.test(href) && !/^\/[^/]/i.test(href)) {
        return match.startsWith('</') ? '</a>' : '<a>';
      }
      const safeHref = href.replace(/"/g, '&quot;');
      return match.startsWith('</') ? '</a>' : `<a href="${safeHref}" rel="noopener noreferrer" target="_blank">`;
    }

    return match.startsWith('</') ? `</${normalized}>` : `<${normalized}>`;
  });

  return sanitized.trim();
}
