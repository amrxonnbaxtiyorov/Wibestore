import { useEffect } from 'react';

/** Get or create a <meta> element by attribute selector */
function getOrCreateMeta(selector, createAttrs) {
    let el = document.querySelector(selector);
    if (!el) {
        el = document.createElement('meta');
        Object.entries(createAttrs).forEach(([k, v]) => el.setAttribute(k, v));
        document.head.appendChild(el);
    }
    return el;
}

/** Get or create a <link rel="canonical"> element */
function getOrCreateCanonical() {
    let el = document.querySelector('link[rel="canonical"]');
    if (!el) {
        el = document.createElement('link');
        el.setAttribute('rel', 'canonical');
        document.head.appendChild(el);
    }
    return el;
}

/**
 * useSEO — sahifa uchun dinamik meta teglar.
 * Meta teglar DOM da bo'lmasa yaratadi, bo'lsa yangilaydi.
 * @param {Object} options
 * @param {string} options.title - Sahifa sarlavhasi
 * @param {string} options.description - Sahifa tavsifi
 * @param {string} [options.canonical] - Canonical URL
 */
export function useSEO({ title, description, canonical }) {
    useEffect(() => {
        if (title) {
            document.title = title;
            getOrCreateMeta('meta[property="og:title"]', { property: 'og:title' }).setAttribute('content', title);
            getOrCreateMeta('meta[name="twitter:title"]', { name: 'twitter:title' }).setAttribute('content', title);
        }
        if (description) {
            getOrCreateMeta('meta[name="description"]', { name: 'description' }).setAttribute('content', description);
            getOrCreateMeta('meta[property="og:description"]', { property: 'og:description' }).setAttribute('content', description);
            getOrCreateMeta('meta[name="twitter:description"]', { name: 'twitter:description' }).setAttribute('content', description);
        }
        if (canonical) {
            getOrCreateCanonical().setAttribute('href', canonical);
            getOrCreateMeta('meta[property="og:url"]', { property: 'og:url' }).setAttribute('content', canonical);
        }
    }, [title, description, canonical]);
}
