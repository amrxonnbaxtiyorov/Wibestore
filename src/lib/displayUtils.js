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
 * O'yin rasmi URL — backend nisbiy (/media/...) yoki to'liq qaytarsa ham ishlaydi.
 * @param {string|null|undefined} url - Backenddan kelgan image (yoki banner) qiymati
 * @returns {string|null} To'liq URL yoki null
 */
export function resolveGameImageUrl(url) {
  if (!url || typeof url !== 'string') return null;
  if (url.startsWith('http://') || url.startsWith('https://')) return url;
  const base = import.meta.env.VITE_API_BASE_URL || '/api/v1';
  const origin = base.replace(/\/api\/v1\/?$/, '');
  return origin + (url.startsWith('/') ? url : '/' + url);
}
