/**
 * logo-transparent.png dan dark rejim uchun versiya: chap qism (gamepad) oq, matn asl rangda.
 * Natija: public/logo-dark.png
 * Ishga tushirish: node scripts/logo-dark-mode.js
 */

import sharp from 'sharp';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');
const inputPath = path.join(root, 'public', 'logo-transparent.png');
const outputPath = path.join(root, 'public', 'logo-dark.png');

// Chap qismning kengligi (gamepad): taxminan 35–38% — faqat shu qism oq bo‘ladi
const GAMEPAD_WIDTH_RATIO = 0.37;

async function main() {
    const { data, info } = await sharp(inputPath)
        .raw()
        .ensureAlpha()
        .toBuffer({ resolveWithObject: true });

    const channels = info.channels;
    const w = info.width;
    const h = info.height;
    const splitX = Math.round(w * GAMEPAD_WIDTH_RATIO);

    for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
            const i = (y * w + x) * channels;
            const a = data[i + 3];
            if (x < splitX && a > 0) {
                data[i] = 255;
                data[i + 1] = 255;
                data[i + 2] = 255;
            }
        }
    }

    await sharp(data, {
        raw: { width: w, height: h, channels },
    })
        .png()
        .toFile(outputPath);

    console.log('Yozildi:', outputPath);
}

main().catch((e) => {
    console.error(e);
    process.exit(1);
});
