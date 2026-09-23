import { cn } from '@/lib/utils';
import { BRAND_ALT, BRAND_LOGO_URL } from '@/lib/brandAssets';

interface BrandLogoProps {
  className?: string;
  /** Display height in px; width scales automatically. */
  height?: number;
  alt?: string;
}

/** Duka+ brand mark (`src/assets/duka+logo.png`). */
export function BrandLogo({ className, height = 40, alt = BRAND_ALT }: BrandLogoProps) {
  return (
    <img
      src={BRAND_LOGO_URL}
      alt={alt}
      className={cn('object-contain object-left', className)}
      style={{ height, width: 'auto', maxWidth: height * 5.5 }}
      draggable={false}
    />
  );
}

interface BrandMarkProps {
  className?: string;
  size?: number;
  alt?: string;
}

/** Square app-icon style mark for headers and tight spaces. */
export function BrandMark({ className, size = 40, alt = BRAND_ALT }: BrandMarkProps) {
  return (
    <img
      src={BRAND_LOGO_URL}
      alt={alt}
      className={cn('object-contain rounded-xl', className)}
      style={{ width: size, height: size }}
      draggable={false}
    />
  );
}
