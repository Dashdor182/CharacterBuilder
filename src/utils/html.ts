/**
 * HTML sanitizer for Foundry VTT description strings.
 * Strips potentially dangerous tags while preserving formatting.
 */

export function sanitizeHtml(html: string): string {
  if (!html) return '';

  // Replace Foundry-specific tags and inline roll notation
  let clean = html
    .replace(/@UUID\[([^\]]+)\]\{([^}]+)\}/g, '<em>$2</em>')
    .replace(/@Check\[([^\]]+)\]\{([^}]+)\}/g, '<strong>$2</strong>')
    .replace(/@Damage\[([^\]]+)\]\{([^}]+)\}/g, '<strong>$2</strong>')
    .replace(/@Template\[([^\]]+)\]\{([^}]+)\}/g, '<em>$2</em>')
    .replace(/@([A-Z][a-zA-Z]+)\[([^\]]+)\]/g, '<em>$2</em>');

  // Basic sanitization: allow only safe tags
  const allowed = new Set([
    'p', 'br', 'strong', 'b', 'em', 'i', 'ul', 'ol', 'li',
    'h1', 'h2', 'h3', 'h4', 'table', 'thead', 'tbody', 'tr', 'th', 'td',
    'hr', 'span', 'div', 'section', 'aside', 'header',
  ]);

  // Remove script/style tags entirely
  clean = clean.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
  clean = clean.replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '');

  // Strip disallowed tags (keep content)
  clean = clean.replace(/<\/?([a-zA-Z][a-zA-Z0-9]*)\b[^>]*>/g, (match, tag: string) => {
    if (allowed.has(tag.toLowerCase())) return match;
    return '';
  });

  // Remove on* event handlers
  clean = clean.replace(/\s+on\w+="[^"]*"/gi, '');
  clean = clean.replace(/\s+on\w+='[^']*'/gi, '');

  return clean;
}

export function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
}

export function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength - 1) + '…';
}
