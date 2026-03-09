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
 * To'liq URL yoki data: URL bo'lsa o'zgartirmaydi.
 * @param {string|null|undefined} url
 * @returns {string|null}
 */
export function resolveImageUrl(url) {
  if (!url || typeof url !== 'string') return null;
  if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('data:')) return url;
  const base = import.meta.env.VITE_API_BASE_URL || '/api/v1';
  const origin = base.replace(/\/api\/v1\/?$/, '');
  return origin + (url.startsWith('/') ? url : '/' + url);
}

/** @deprecated resolveImageUrl ni ishlating */
export const resolveBackendImageUrl = resolveImageUrl;

/** @deprecated resolveImageUrl ni ishlating */
export function resolveGameImageUrl(url) {
  return resolveImageUrl(url);
}
