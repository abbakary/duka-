import { getApiBaseUrl } from '@/lib/apiConfig';
import {
  BRAND_DEMO_VIDEO_FALLBACK,
  BRAND_DEMO_VIDEO_URL,
  BRAND_LOGO_URL,
  TRA_SHOWCASE_IMAGE_URL,
} from '@/lib/brandAssets';

export interface PlatformShowcaseItem {
  id: string;
  title: string;
  subtitle?: string | null;
  mediaType: 'video' | 'image';
  mediaUrl: string;
  thumbnailUrl?: string | null;
  linkUrl?: string | null;
  sortOrder: number;
  isActive?: boolean;
  isFeatured: boolean;
  createdBy?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

const demoVideoUrl = () => BRAND_DEMO_VIDEO_URL || BRAND_DEMO_VIDEO_FALLBACK;

function isYoutubeUrl(url: string): boolean {
  return /youtube\.com|youtu\.be/i.test(url);
}

function isTraItem(item: PlatformShowcaseItem): boolean {
  const t = `${item.id} ${item.title} ${item.subtitle ?? ''}`.toLowerCase();
  return t.includes('tra') || t.includes('efd') || t.includes('vat compliance');
}

/** Force local demo video + TRA logo; strip YouTube from API/admin showcase. */
export function sanitizeShowcaseItem(item: PlatformShowcaseItem): PlatformShowcaseItem {
  if (item.mediaType === 'video' || isYoutubeUrl(item.mediaUrl)) {
    return {
      ...item,
      mediaType: 'video',
      mediaUrl: demoVideoUrl(),
      thumbnailUrl: null,
    };
  }
  if (item.mediaType === 'image' && isTraItem(item)) {
    return { ...item, mediaUrl: TRA_SHOWCASE_IMAGE_URL };
  }
  if (item.mediaType === 'image' && !item.mediaUrl.trim()) {
    return { ...item, mediaUrl: isTraItem(item) ? TRA_SHOWCASE_IMAGE_URL : BRAND_LOGO_URL };
  }
  return item;
}

export function sanitizeShowcaseList(items: PlatformShowcaseItem[]): PlatformShowcaseItem[] {
  return items.map(sanitizeShowcaseItem).filter(i => i.isActive !== false);
}

export const DEFAULT_SHOWCASE_ITEMS: PlatformShowcaseItem[] = [
  {
    id: 'default-demo-video',
    title: 'Duka+ POS in 60 seconds',
    subtitle: 'Sell faster, track stock, manage credit — on phone and desktop.',
    mediaType: 'video',
    mediaUrl: demoVideoUrl(),
    thumbnailUrl: null,
    sortOrder: 0,
    isFeatured: true,
    isActive: true,
  },
  {
    id: 'default-ad-1',
    title: 'TRA EFD & VAT Compliance',
    subtitle: 'Receipts, signatures, and tax reports built for Tanzania.',
    mediaType: 'image',
    mediaUrl: TRA_SHOWCASE_IMAGE_URL,
    sortOrder: 1,
    isFeatured: false,
    isActive: true,
  },
  {
    id: 'default-ad-2',
    title: 'Multi-branch Inventory',
    subtitle: 'Track stock across branches, transfers, and low-stock alerts.',
    mediaType: 'image',
    mediaUrl: BRAND_LOGO_URL,
    sortOrder: 2,
    isFeatured: false,
    isActive: true,
  },
];

export function mapShowcaseFromApi(row: Record<string, unknown>): PlatformShowcaseItem {
  return sanitizeShowcaseItem({
    id: String(row.id),
    title: String(row.title),
    subtitle: row.subtitle != null ? String(row.subtitle) : undefined,
    mediaType: (row.media_type === 'video' ? 'video' : 'image') as 'video' | 'image',
    mediaUrl: String(row.media_url ?? ''),
    thumbnailUrl: row.thumbnail_url != null ? String(row.thumbnail_url) : undefined,
    linkUrl: row.link_url != null ? String(row.link_url) : undefined,
    sortOrder: Number(row.sort_order ?? 0),
    isActive: row.is_active !== false,
    isFeatured: Boolean(row.is_featured),
    createdBy: row.created_by != null ? String(row.created_by) : undefined,
    createdAt: row.created_at != null ? String(row.created_at) : undefined,
    updatedAt: row.updated_at != null ? String(row.updated_at) : undefined,
  });
}

export function showcaseToApiPayload(item: Partial<PlatformShowcaseItem>): Record<string, unknown> {
  return {
    title: item.title,
    subtitle: item.subtitle ?? null,
    media_type: item.mediaType ?? 'image',
    media_url: item.mediaUrl,
    thumbnail_url: item.thumbnailUrl ?? null,
    link_url: item.linkUrl ?? null,
    sort_order: item.sortOrder ?? 0,
    is_active: item.isActive ?? true,
    is_featured: item.isFeatured ?? false,
  };
}

export async function fetchPublicShowcase(): Promise<PlatformShowcaseItem[]> {
  try {
    const res = await fetch(`${getApiBaseUrl()}/platform/showcase`);
    if (!res.ok) return DEFAULT_SHOWCASE_ITEMS;
    const data = (await res.json()) as Record<string, unknown>[];
    if (!data.length) return DEFAULT_SHOWCASE_ITEMS;
    return sanitizeShowcaseList(data.map(mapShowcaseFromApi));
  } catch {
    return DEFAULT_SHOWCASE_ITEMS;
  }
}

/** Primary landing demo — always local MP4, never YouTube. */
export function landingFeaturedDemo(isSw: boolean): PlatformShowcaseItem {
  const base = DEFAULT_SHOWCASE_ITEMS[0];
  return {
    ...base,
    title: isSw ? 'Duka+ kwa dakika chache' : base.title,
    subtitle: isSw
      ? 'Uza haraka, simamia stoo, na mkopo — simu au kompyuta.'
      : base.subtitle,
    mediaUrl: demoVideoUrl(),
    mediaType: 'video',
    isFeatured: true,
  };
}
