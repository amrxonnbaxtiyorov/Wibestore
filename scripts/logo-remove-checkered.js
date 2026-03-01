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

function isCheckeredColor(r, g, b, a) {
    if (a < 128) return true;
    const gray = (r + g + b) / 3;
    const isNearWhite = gray >= 250 && r >= 248 && g >= 248 && b >= 248;
    const isLightGray = gray >= 190 && gray <= 230 && Math.abs(r - g) < 15 && Math.abs(g - b) < 15 && Math.abs(r - b) < 15;
    return isNearWhite || isLightGray;
}

async function main() {
    const image = sharp(inputPath);
    const meta = await image.metadata();
    const { data, info } = await image.raw().ensureAlpha().toBuffer({ resolveWithObject: true });
    const channels = info.channels;
    const w = info.width;
    const h = info.height;

    for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
            const i = (y * w + x) * channels;
            const r = data[i];
            const g = data[i + 1];
            const b = data[i + 2];
            const a = data[i + 3];
            if (isCheckeredColor(r, g, b, a)) {
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
