import DOMPurify from 'dompurify';

const allowedTags = [
  'p', 'br', 'div', 'span', 'strong', 'b', 'em', 'i', 'u', 'h2', 'h3',
  'ul', 'ol', 'li', 'blockquote', 'a', 'hr', 'font',
];

export const sanitizeRichText = (value) => {
  const source = String(value ?? '').trim();
  if (!source) return '';

  const clean = DOMPurify.sanitize(source, {
    ALLOWED_TAGS: allowedTags,
    ALLOWED_ATTR: ['href', 'title', 'style', 'color'],
  });
  const container = document.createElement('div');
  container.innerHTML = clean;

  container.querySelectorAll('[style]').forEach((element) => {
    const alignment = element.style.textAlign;
    const color = element.style.color;
    element.removeAttribute('style');
    if (['left', 'center', 'right', 'justify'].includes(alignment)) element.style.textAlign = alignment;
    if (/^#[0-9a-f]{3,8}$/i.test(color) || /^rgba?\([\d\s,.%]+\)$/i.test(color)) element.style.color = color;
  });

  const result = container.innerHTML;
  return /<\/?[a-z][^>]*>/i.test(source) ? result : `<p>${result.replace(/\r?\n/g, '<br>')}</p>`;
};
