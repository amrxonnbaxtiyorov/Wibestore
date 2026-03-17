import { useEffect } from 'react';

/**
 * useSEO — sahifa uchun dinamik meta teglar
 * @param {Object} options
 * @param {string} options.title - Sahifa sarlavhasi
 * @param {string} options.description - Sahifa tavsifi
 * @param {string} [options.canonical] - Canonical URL
 */
export function useSEO({ title, description, canonical }) {
    useEffect(() => {
        if (title) {
            document.title = title;
        }
        if (description) {
            let metaDesc = document.querySelector('meta[name="description"]');
            if (metaDesc) metaDesc.setAttribute('content', description);

            let ogDesc = document.querySelector('meta[property="og:description"]');
            if (ogDesc) ogDesc.setAttribute('content', description);

            let twDesc = document.querySelector('meta[name="twitter:description"]');
            if (twDesc) twDesc.setAttribute('content', description);
        }
        if (title) {
            let ogTitle = document.querySelector('meta[property="og:title"]');
            if (ogTitle) ogTitle.setAttribute('content', title);

            let twTitle = document.querySelector('meta[name="twitter:title"]');
            if (twTitle) twTitle.setAttribute('content', title);
        }
        if (canonical) {
            let link = document.querySelector('link[rel="canonical"]');
            if (link) link.setAttribute('href', canonical);
        }
    }, [title, description, canonical]);
}
