import brandLogo from '@/assets/duka+logo.png';
import brandDemoVideo from '@/assets/Duka+.mp4';
import traShowcaseImage from '@/assets/tralogo.png';

/** Single source for Duka+ logo (UI, PWA, favicon copy in `/public/brand_logo.png`). */
export const BRAND_LOGO_URL = brandLogo;

/** TRA card on landing showcase (local asset — no hotlink). */
export const TRA_SHOWCASE_IMAGE_URL = traShowcaseImage;

/** Landing page / showcase demo video (bundled + public fallback). */
export const BRAND_DEMO_VIDEO_URL = brandDemoVideo;
export const BRAND_DEMO_VIDEO_FALLBACK = '/duka-plus-demo.mp4';

export const BRAND_NAME = 'Duka+';
export const BRAND_ALT = 'Duka+ — Smart Shop, Better Business';
