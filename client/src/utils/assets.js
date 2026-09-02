/**
 * The API and the app are served from different origins in production, so any
 * root-relative image path the server returns ("/uploads/x.png",
 * "/api/v1/files/file-abc") has to be re-based onto the API origin. Left alone it
 * resolves against the frontend, whose SPA rewrite answers unknown paths with
 * index.html — the browser then fails to decode HTML as an image and the picture
 * silently disappears. That is exactly how "the profile picture is not set"
 * presents even though the upload succeeded.
 */
const apiOrigin = () => {
  const base = import.meta.env.VITE_API_URL || '';
  // A relative base ("/api/v1") means same-origin or the Vite dev proxy.
  if (!/^https?:\/\//i.test(base)) return '';
  try {
    return new URL(base).origin;
  } catch {
    return '';
  }
};

export const assetUrl = (value) => {
  const src = typeof value === 'string' ? value.trim() : '';
  if (!src) return '';
  if (/^(https?:|data:|blob:)/i.test(src)) return src;
  if (!src.startsWith('/')) return src;
  return `${apiOrigin()}${src}`;
};

const svg = (body) =>
  `data:image/svg+xml;utf8,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="900" viewBox="0 0 120 90">${body}</svg>`)}`;

/** Inline so a listing without a photo still renders on a firewalled or offline demo network. */
export const producePlaceholder = svg(
  '<rect width="120" height="90" fill="#eef4ec"/><path d="M30 64c22-2 34-19 54-37 0 32-15 56-44 56-5 0-10-2-12-7 12-10 24-19 41-29-19 7-29 12-39 17z" fill="#a7d65b"/>',
);

export const avatarPlaceholder = svg(
  '<rect width="120" height="90" fill="#eef4ec"/><circle cx="60" cy="36" r="14" fill="#a7d65b"/><path d="M28 88c4-16 16-24 32-24s28 8 32 24z" fill="#a7d65b"/>',
);
