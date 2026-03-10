/**
 * Ism/display uchun birinchi harfni katta qilib qaytaradi (avatar initial va matn).
 * @param {string} [name] - Ism yoki display_name
 * @param {string} [fallback='U'] - Bo'sh bo'lsa qaytariladigan belgi
 * @returns {string} Birinchi harf bosh harf (masalan "J")
 */
export function getDisplayInitial(name, fallback = 'U') {
  const s = (name ?? fallback).toString().trim();
  return (s.charAt(0) || fallback).toUpperCase();
}

/**
 * Ismning birinchi harfini bosh harf qiladi (to'liq matn: "john" → "John").
 * @param {string} [str]
 * @returns {string}
 */
export function capitalizeFirst(str) {
  if (!str || typeof str !== 'string') return str ?? '';
  const s = str.trim();
  return s ? s.charAt(0).toUpperCase() + s.slice(1) : '';
}

/**
 * Backend nisbiy URL'ni (/media/...) to'liq URL'ga aylantiradi.
 * Rasmlar backend domenida bo'ladi — VITE_API_BASE_URL yoki VITE_BACKEND_ORIGIN to'liq backend manziliga o'rnatilishi kerak.
 * @param {string|{url?:string, file?:string}|null|undefined} url - URL string yoki Django-style object
 * @returns {string|null}
 */
export function resolveImageUrl(url) {
  let path = url;
  if (path && typeof path === 'object') {
    path = path.url ?? path.file ?? path.image ?? null;
  }
  if (!path || typeof path !== 'string') return null;
  path = path.trim();
  if (!path) return null;
  if (path.startsWith('http://') || path.startsWith('https://') || path.startsWith('data:')) return path;
  // Backend origin: VITE_BACKEND_ORIGIN (faqat domen) yoki VITE_API_BASE_URL dan (/api/v1 ni olib tashlash)
  const backendOrigin =
    import.meta.env.VITE_BACKEND_ORIGIN ||
    (() => {
      const base = import.meta.env.VITE_API_BASE_URL || '/api/v1';
      return base.replace(/\/api\/v1\/?$/, '').trim();
    })();
  const origin = backendOrigin && !backendOrigin.startsWith('/') ? backendOrigin.replace(/\/$/, '') : '';
  return origin ? origin + (path.startsWith('/') ? path : '/' + path) : path;
}

/** @deprecated resolveImageUrl ni ishlating */
export const resolveBackendImageUrl = resolveImageUrl;

/** @deprecated resolveImageUrl ni ishlating */
export function resolveGameImageUrl(url) {
  return resolveImageUrl(url);
}
