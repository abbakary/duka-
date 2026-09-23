/** Shared API URL + demo accounts (Railway production backend). */

export const RAILWAY_API_BASE =
  'https://dukaplusbackend-production.up.railway.app/api/v1';

export function getApiBaseUrl(): string {
  const fromEnv =
    import.meta.env.VITE_API_BASE_URL?.trim() ||
    import.meta.env.VITE_API_URL?.trim();

  // Explicit override (full Railway URL or /api/v1 for same-origin proxy).
  if (fromEnv) return fromEnv.replace(/\/$/, '');

  // Same-origin /api/v1 → Vite dev/preview proxy or Vercel rewrites (vercel.json). No browser CORS.
  if (import.meta.env.DEV && import.meta.env.VITE_API_FORCE_DIRECT === 'true') {
    return RAILWAY_API_BASE;
  }
  if (import.meta.env.DEV || import.meta.env.PROD) {
    return '/api/v1';
  }

  return RAILWAY_API_BASE;
}

export const DEMO_PASSWORD = 'demo123';

export interface DemoAccount {
  label: string;
  labelSw: string;
  email: string;
  role: string;
}

export const DEMO_ACCOUNTS: DemoAccount[] = [
  { label: 'Pharmacy', labelSw: 'Duka la Dawa', email: 'pharmacy@sample.dukaplus.co.tz', role: 'Owner' },
  { label: 'Retail', labelSw: 'Rejareja', email: 'retail@sample.dukaplus.co.tz', role: 'Owner' },
  { label: 'Restaurant', labelSw: 'Mgahawa', email: 'restaurant@sample.dukaplus.co.tz', role: 'Owner' },
  {
    label: 'Hardware (50+ demo data)',
    labelSw: 'Vifaa (data 50+)',
    email: 'hardware@sample.dukaplus.co.tz',
    role: 'Owner',
  },
  { label: 'Electronics', labelSw: 'Elektroniki', email: 'electronics@sample.dukaplus.co.tz', role: 'Owner' },
  { label: 'Supermarket', labelSw: 'Supermarket', email: 'supermarket@sample.dukaplus.co.tz', role: 'Owner' },
  { label: 'Manager', labelSw: 'Meneja', email: 'manager.kariakoo-pharmacy@sample.dukaplus.co.tz', role: 'Manager' },
  { label: 'Cashier', labelSw: 'Cashier', email: 'cashier.mbezi-retail@sample.dukaplus.co.tz', role: 'Cashier' },
  { label: 'Super Admin', labelSw: 'Msimamizi', email: 'admin@dukaplus.co.tz', role: 'Super Admin' },
];
