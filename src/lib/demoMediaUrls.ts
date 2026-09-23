/** Client-side Unsplash fallbacks when API omits demo images (matches backend demo_media.py pools). */

import type { BusinessType } from '@/types/v1';

const unsplash = (photoId: string) =>
  `https://images.unsplash.com/${photoId}?w=480&h=480&auto=format&fit=crop&q=80`;

const PRODUCT_POOL: Partial<Record<BusinessType, string[]>> = {
  pharmacy: [
    'photo-1584308666744-24d5c474f2ae',
    'photo-1471864190281-a93a3070b6de',
    'photo-1587854692152-cf660f5970a0',
  ],
  supermarket: [
    'photo-1542838132-92c53300491e',
    'photo-1604719312566-8912e9227c6a',
    'photo-1578916171728-46686eac8d58',
  ],
  retail: [
    'photo-1607082350899-7e105aa8868b',
    'photo-1523275335684-37898b6baf30',
    'photo-1505740420928-5e560c06d30e',
  ],
  hardware: [
    'photo-1504148455328-c376907a0816',
    'photo-1581094794329-c8112a89af12',
    'photo-1504328345606-18bbc8c9d7d1',
  ],
  electronics: [
    'photo-1511707171634-5f897ff02aa9',
    'photo-1527864550417-7fd91fc51a46',
    'photo-1498049794561-7780e7231661',
  ],
  restaurant: [
    'photo-1504674900247-0877df9cc836',
    'photo-1546069901-ba9599a7e63c',
    'photo-1565299624946-b28f40a0ae38',
  ],
};

const DEFAULT_PRODUCT = [
  'photo-1564466809058-bfaba4c45d04',
  'photo-1472851294608-062f824d29cc',
  'photo-1441986300917-64674bd600d8',
];

const STAFF_PORTRAITS = [
  'photo-1507003211169-0a1dd7228f2d',
  'photo-1494790108377-be9c29b29330',
  'photo-1500648767791-00dcc994a43e',
  'photo-1438761681033-6461ffad8d80',
  'photo-1472099645785-5658abf4ff4e',
];

function hashPick(pool: string[], key: string): string {
  let h = 0;
  for (let i = 0; i < key.length; i++) h = (h * 31 + key.charCodeAt(i)) >>> 0;
  return pool[h % pool.length];
}

function aiHardwareProductImageUrl(productKey: string, variant = 0): string {
  let h = 0;
  const key = `hw:${productKey}:${variant}`;
  for (let i = 0; i < key.length; i++) h = (h * 31 + key.charCodeAt(i)) >>> 0;
  const seed = h % 999999;
  const label = productKey.replace(/[-_]/g, ' ').slice(0, 80);
  const prompt = encodeURIComponent(
    `Professional product photo of ${label}, building hardware materials, white background, studio lighting, catalog`,
  );
  return `https://image.pollinations.ai/prompt/${prompt}?width=512&height=512&seed=${seed}&nologo=true`;
}

export function demoProductImageUrl(
  businessType: BusinessType | undefined,
  productKey: string,
  variant = 0,
): string {
  if (businessType === 'hardware') {
    return aiHardwareProductImageUrl(productKey, variant);
  }
  const pool = (businessType && PRODUCT_POOL[businessType]) || DEFAULT_PRODUCT;
  return unsplash(hashPick(pool, `${businessType}:${productKey}:${variant}`));
}

export function demoStaffAvatarUrl(staffKey: string): string {
  return unsplash(hashPick(STAFF_PORTRAITS, `staff:${staffKey}`));
}

export function isSampleDemoEmail(email?: string | null): boolean {
  return Boolean(email && email.toLowerCase().endsWith('@sample.dukaplus.co.tz'));
}
