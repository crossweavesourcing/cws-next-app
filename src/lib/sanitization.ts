import sanitizeHtml from 'sanitize-html';

const ALLOWED_TAGS = ['p', 'b', 'i', 'em', 'strong', 'a', 'ul', 'ol', 'li', 'br', 'h2', 'h3', 'h4', 'h5', 'h6', 'blockquote', 'span', 'div'];
const ALLOWED_ATTRIBUTES = {
  a: ['href', 'title', 'target', 'rel'],
  span: ['class', 'style'],
  div: ['class', 'style'],
  p: ['class', 'style'],
  ul: ['class'],
  ol: ['class'],
  li: ['class'],
};

export function sanitizeRichText(html: string | undefined | null): string {
  if (!html) return '';
  return sanitizeHtml(html, {
    allowedTags: ALLOWED_TAGS,
    allowedAttributes: ALLOWED_ATTRIBUTES,
    allowedSchemes: ['http', 'https', 'mailto'],
    allowedSchemesByTag: {
      a: ['http', 'https', 'mailto'],
    },
    allowedSchemesAppliedToAttributes: ['href'],
    allowProtocolRelative: false,
    enforceHtmlBoundary: true,
  });
}
