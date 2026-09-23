import { copyFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const src = join(root, 'src', 'assets', 'duka+logo.png');
const publicDir = join(root, 'public');

mkdirSync(publicDir, { recursive: true });

for (const name of ['brand_logo.png', 'favicon.png', 'apple-touch-icon.png', 'pwa-icon-512.png']) {
  copyFileSync(src, join(publicDir, name));
}

console.info('[sync-brand-public] Updated favicon & PWA icons from src/assets/duka+logo.png');
