import type { Language } from '@/types/v1';

export interface OnboardingShowcaseCard {
  id: string;
  /** Module opened after user confirms they read the steps */
  tab: string;
  /** Where the journey actually begins (may differ from tab) */
  startTab?: string;
  openModuleLabelEn?: string;
  openModuleLabelSw?: string;
  titleEn: string;
  titleSw: string;
  bodyEn: string;
  bodySw: string;
  stepsEn: string[];
  stepsSw: string[];
  imageUrl: string;
  accent: string;
}

export const ONBOARDING_SHOWCASE_CARDS: OnboardingShowcaseCard[] = [
  {
    id: 'inventory',
    tab: 'inventory',
    startTab: 'suppliers',
    openModuleLabelEn: 'Start at Suppliers',
    openModuleLabelSw: 'Anza kwa Wasambazaji',
    titleEn: 'Stock setup (full path)',
    titleSw: 'Kuweka stoo (njia kamili)',
    bodyEn: 'Do not start in Inventory — begin with suppliers, then receive goods, then manage Stoo.',
    bodySw: 'Usianze kwenye Stoo peke yake — anza Wasambazaji, pokea bidhaa, kisha simamia Stoo.',
    stepsEn: [
      'START HERE: open Stoo module → Wasambazaji (Suppliers) in the side menu.',
      'Add your supplier (name, phone, optional TIN) and save — data goes to the server.',
      'Create a Purchase Order (PO): pick or describe items, qty, unit cost, expected delivery.',
      'When the delivery arrives: Receive / confirm the PO — stock quantities increase automatically.',
      'Now open Stoo (Inventory): verify products appeared; set selling price, reorder level, and branch.',
      'Only if needed: “Add product” manually for items you did not buy via PO (opening stock).',
      'Use stock adjust for corrections (damage, count) — each change is logged.',
      'Last step: POS — you can only sell products that exist in Stoo; each sale reduces stock live.',
    ],
    stepsSw: [
      'ANZA HAPA: moduli ya Stoo → Wasambazaji kwenye menyu ya kushoto.',
      'Ongeza msambazaji (jina, simu, TIN ikiwepo) na hifadhi — data iko kwenye seva.',
      'Unda Purchase Order (PO): bidhaa, idadi, gharama ya kununua, tarehe ya uwasilishaji.',
      'Bidhaa zikifika: Pokea / thibitisha PO — idadi ya stoo huongezeka kiotomatiki.',
      'Sasa fungua Stoo (Inventory): hakikisha bidhaa zimeonekana; weka bei ya mauzo na kiwango cha chini.',
      'Ikiwa lazima tu: “Ongeza bidhaa” kwa bidhaa ambazo hukuweka kupitia PO (stoo ya mwanzo).',
      'Rekebisha stoo kwa makosa (uharibifu, hesabu) — kila mabadiliko yana rekodi.',
      'Hatua ya mwisho: POS — uza bidhaa zilizo kwenye Stoo tu; kila mauzo hupunguza stoo hai.',
    ],
    imageUrl: 'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?w=900&auto=format&fit=crop&q=80',
    accent: '#107C10',
  },
  {
    id: 'receive',
    tab: 'suppliers',
    startTab: 'suppliers',
    openModuleLabelEn: 'Open Suppliers',
    openModuleLabelSw: 'Fungua Wasambazaji',
    titleEn: 'Receive & create stock',
    titleSw: 'Pokea na ongeza stoo',
    bodyEn: 'Detail for steps 2–4 of the stock path (see “Kuweka stoo” card for the full order).',
    bodySw: 'Maelezo ya hatua 2–4 (soma kadi “Kuweka stoo” kwa mpangilio kamili).',
    stepsEn: [
      'In Wasambazaji, open an existing supplier or tap Add supplier.',
      'New PO: add line items (product name, qty, cost). Link to a product when possible.',
      'Send / save PO — status tracks until goods arrive.',
      'Receive: confirm quantities received; partial receive is OK if delivery is split.',
      'Open Stoo next to confirm on-hand qty and selling price before POS.',
    ],
    stepsSw: [
      'Kwenye Wasambazaji, chagua msambazaji au ongeza mpya.',
      'PO mpya: ongeza bidhaa, idadi, gharama. Unganisha na bidhaa ikiwezekana.',
      'Hifadhi PO — hali inafuatilia hadi bidhaa zifike.',
      'Pokea: thibitisha idadi; unaweza kupokea sehemu ikiwa uwasilishaji umegawanywa.',
      'Fungua Stoo baadaye kuthibitisha idadi na bei kabla ya POS.',
    ],
    imageUrl: 'https://images.unsplash.com/photo-1566576912321-d58ddd7a6088?w=900&auto=format&fit=crop&q=80',
    accent: '#0078D4',
  },
  {
    id: 'pos',
    tab: 'pos',
    titleEn: 'POS & payments',
    titleSw: 'POS na malipo',
    bodyEn: 'Ring up sales with Tanzania payment habits.',
    bodySw: 'Fanya mauzo kwa tabia za malipo za Tanzania.',
    stepsEn: [
      'Open POS — full screen selling mode.',
      'Search or scan products; adjust qty and optional discount.',
      'Choose payment: cash, M-Pesa, partial, or customer credit (select customer first).',
      'Toggle TRA fiscal receipt if you are VAT registered; otherwise use standard receipt.',
      'Complete sale — receipt prints/SMS; stock and reports update on the server.',
    ],
    stepsSw: [
      'Fungua POS — hali ya mauzo skrini nzima.',
      'Tafuta au chagua bidhaa; badilisha idadi na punguzo ikiwa linaruhusiwa.',
      'Chagua malipo: taslimu, M-Pesa, awamu, au mkopo (chagua mteja kwanza).',
      'Washa risiti ya TRA ikiwa umesajiliwa VAT; vinginevyo tumia risiti ya kawaida.',
      'Maliza mauzo — stoo na ripoti zinasasishwa kwenye seva.',
    ],
    imageUrl: 'https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=900&auto=format&fit=crop&q=80',
    accent: '#6264A7',
  },
  {
    id: 'hr',
    tab: 'staff',
    titleEn: 'HR & payroll',
    titleSw: 'HR na mishahara',
    bodyEn: 'People, contracts, and statutory pay in one place.',
    bodySw: 'Wafanyakazi, mikataba, na mishahara ya kisheria mahali pamoja.',
    stepsEn: [
      'Open Watu → staff directory (Owner/Manager/HR can add users).',
      'Register staff with role, salary, TIN/NSSF, bank — each gets a login email.',
      'Set allowances and contract details; payslip data saves to the server.',
      'Run payroll for the month; review payslips before sign-off.',
      'Accountant can post payroll journals to Fedha → Uhasibu when ready.',
    ],
    stepsSw: [
      'Fungua Watu → orodha ya wafanyakazi.',
      'Sajili mfanyakazi na jukumu, mshahara, TIN/NSSF, benki — atapata barua pepe ya kuingia.',
      'Weka posho na mkataba; data ya payslip huhifadhiwa kwenye seva.',
      'Endesha mishahara ya mwezi; kagua payslip kabla ya kusaini.',
      'Mhasibu anaweza kuchapisha uhasibu kwenye Fedha baada ya malipo.',
    ],
    imageUrl: 'https://images.unsplash.com/photo-1521737711867-e3b97375f902?w=900&auto=format&fit=crop&q=80',
    accent: '#714b67',
  },
  {
    id: 'accounting',
    tab: 'accounting',
    titleEn: 'Accounting & TRA',
    titleSw: 'Uhasibu na TRA',
    bodyEn: 'See money in/out without a separate spreadsheet.',
    bodySw: 'Angalia fedha ndani/nje bila Excel tofauti.',
    stepsEn: [
      'Open Fedha → Uhasibu (Accounting hub).',
      'Press Refresh — reports pull live sales, stock, expenses, and trial balance.',
      'Use Ripoti for income statement, aged customer debt, and TRA/VAT books.',
      'Vitabu tab: chart of accounts and manual journal entries if needed.',
      'TRA module under compliance for EFD receipts links to fiscal sales.',
    ],
    stepsSw: [
      'Fungua Fedha → Uhasibu.',
      'Bonyeza Onyesha upya — ripoti zinatoka mauzo, stoo, matumizi, na mizani ya majaribio.',
      'Ripoti: mapato, madeni ya wateja, na vitabu vya TRA/VAT.',
      'Vitabu: chati ya akaunti na ingizo la journal ikiwa unahitaji.',
      'Moduli ya TRA inahusiana na mauzo ya fiscal kutoka POS.',
    ],
    imageUrl: 'https://images.unsplash.com/photo-1554224155-6726b3ff858f?w=900&auto=format&fit=crop&q=80',
    accent: '#0d9488',
  },
  {
    id: 'calendar',
    tab: 'calendar',
    titleEn: 'Operations calendar',
    titleSw: 'Kalenda ya shughuli',
    bodyEn: 'Plan deliveries, TRA, and collections in one timeline.',
    bodySw: 'Panga usafirishaji, TRA, na ukusanyaji kwa kalenda moja.',
    stepsEn: [
      'Open Shughuli → Kalenda.',
      'Tap Sync to load events from the server (demo events included for new shops).',
      'Colored days show mixed tasks: blue delivery, green TRA, red dunning, etc.',
      'Add events with category and assignee; mark done when complete.',
      'Use AI schedule for suggested tasks from low stock and overdue credit.',
    ],
    stepsSw: [
      'Fungua Shughuli → Kalenda.',
      'Bonyeza Sawazisha kupakia matukio kutoka seva.',
      'Siku zenye rangi mchanganyiko: bluu usafirishaji, kijani TRA, nyekundu madeni, n.k.',
      'Ongeza tukio na kategoria; weka alama “imekamilika” ukimaliza.',
      'Tumia ratiba ya AI kwa mapendekezo kutoka stoo chini na mikopo iliyochelewa.',
    ],
    imageUrl: 'https://images.unsplash.com/photo-1506784365847-bbad939e9335?w=900&auto=format&fit=crop&q=80',
    accent: '#1e3a8a',
  },
];

export function onboardingStorageKey(tenantId: string): string {
  return `duka_onboarding_showcase_${tenantId}`;
}

export function shouldShowOnboarding(tenantId: string): boolean {
  try {
    return localStorage.getItem(onboardingStorageKey(tenantId)) === 'pending';
  } catch {
    return false;
  }
}

export function markOnboardingPending(tenantId: string): void {
  try {
    localStorage.setItem(onboardingStorageKey(tenantId), 'pending');
  } catch {
    /* ignore */
  }
}

export function markOnboardingComplete(tenantId: string): void {
  try {
    localStorage.setItem(onboardingStorageKey(tenantId), 'done');
  } catch {
    /* ignore */
  }
}

export function cardTitle(card: OnboardingShowcaseCard, language: Language): string {
  return language === 'sw' ? card.titleSw : card.titleEn;
}

export function cardBody(card: OnboardingShowcaseCard, language: Language): string {
  return language === 'sw' ? card.bodySw : card.bodyEn;
}

export function cardSteps(card: OnboardingShowcaseCard, language: Language): string[] {
  return language === 'sw' ? card.stepsSw : card.stepsEn;
}

export function cardOpenTab(card: OnboardingShowcaseCard): string {
  return card.startTab ?? card.tab;
}

export function cardOpenModuleLabel(card: OnboardingShowcaseCard, language: Language): string {
  if (language === 'sw' && card.openModuleLabelSw) return card.openModuleLabelSw;
  if (card.openModuleLabelEn) return card.openModuleLabelEn;
  return language === 'sw' ? 'Nimeelewa — fungua moduli' : 'Got it — open module';
}
