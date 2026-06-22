const PRESENCE_TAG_PATTERN = /<(img|video|audio|iframe|table|hr|ul|ol|blockquote|pre|canvas|svg)\b/i;

export function isBlankEditorContent(content) {
  const html = String(content || '');

  if (!html.trim()) {
    return true;
  }

  if (PRESENCE_TAG_PATTERN.test(html)) {
    return false;
  }

  const text = html
      .replace(/<script[\s\S]*?<\/script>/gi, '')
      .replace(/<style[\s\S]*?<\/style>/gi, '')
      .replace(/<br\b[^>]*>/gi, '')
      .replace(/&nbsp;|&#160;/gi, ' ')
      .replace(/<[^>]*>/g, '')
      .trim();

  return text.length === 0;
}
