export function buildChatShareUrl(chatId) {
  if (!chatId) return window.location.origin;

  const url = new URL(window.location.href);
  url.pathname = '/chat';
  url.searchParams.set('chat', chatId);
  return url.toString();
}

export function buildChatShareText(chatTitle) {
  return `Check out this chat${chatTitle ? `: ${chatTitle}` : ''}`;
}

export function buildShareTargets(url, text) {
  const encodedUrl = encodeURIComponent(url);
  const encodedText = encodeURIComponent(text);

  return {
    x: `https://twitter.com/intent/tweet?url=${encodedUrl}&text=${encodedText}`,
    facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`,
    linkedin: `https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}`,
    whatsapp: `https://wa.me/?text=${encodeURIComponent(`${text} ${url}`)}`,
  };
}
