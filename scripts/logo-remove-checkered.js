/**
 * public/logo.png dagi cheker (katakcha) fonni haqiqiy shaffof qiladi.
 * Faqat gamepad + WIBESTORE matn qoladi, orqa fon alpha = 0.
 * Ishga tushirish: node scripts/logo-remove-checkered.js
 */

import sharp from 'sharp';
import { readFileSync, writeFileSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');
const inputPath = path.join(root, 'public', 'logo.png');
const outputPath = path.join(root, 'public', 'logo-transparent.png');

function colorDist(r1, g1, b1, r2, g2, b2) {
    return Math.abs(r1 - r2) + Math.abs(g1 - g2) + Math.abs(b1 - b2);
}

function isBackgroundPixel(r, g, b, a, cornerColors) {
    if (a < 100) return true;
    for (const c of cornerColors) {
        if (colorDist(r, g, b, c.r, c.g, c.b) < 60) return true;
    }
    return false;
}

async function main() {
    const image = sharp(inputPath);
    const { data, info } = await image.raw().ensureAlpha().toBuffer({ resolveWithObject: true });
    const channels = info.channels;
    const w = info.width;
    const h = info.height;

    const corners = [[0, 0], [w - 1, 0], [0, h - 1], [w - 1, h - 1]];
    const cornerColors = [];
    for (const [x, y] of corners) {
        const i = (y * w + x) * channels;
        cornerColors.push({ r: data[i], g: data[i + 1], b: data[i + 2] });
    }

    for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
            const i = (y * w + x) * channels;
            const r = data[i];
            const g = data[i + 1];
            const b = data[i + 2];
            const a = data[i + 3];
            if (isBackgroundPixel(r, g, b, a, cornerColors)) {
                data[i + 3] = 0;
            }
        }
    }

    await sharp(data, {
        raw: {
            width: w,
            height: h,
            channels: channels,
        },
    })
        .png()
        .toFile(outputPath);

    console.log('Yozildi:', outputPath);
}

main().catch((e) => {
    console.error(e);
    process.exit(1);
});
