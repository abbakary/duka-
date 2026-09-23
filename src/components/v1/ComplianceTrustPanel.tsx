import React from 'react';
import type { AuthUser, Language } from '@/types/v1';
import { TraEfdSetupView } from '@/components/v1/tra/TraEfdSetupView';

interface ComplianceTrustPanelProps {
  language: Language;
  businessName?: string;
  tinNumber?: string;
  currentUser?: AuthUser | null;
  onNavigate?: (tab: string) => void;
  /** @deprecated */
  onOpenTraHub?: () => void;
}

/** Settings → TRA configuration only (reports live under Finance → Reports). */
export const ComplianceTrustPanel: React.FC<ComplianceTrustPanelProps> = ({
  language,
  businessName,
  tinNumber,
  onNavigate,
}) => (
  <TraEfdSetupView
    language={language}
    businessName={businessName}
    tinNumber={tinNumber}
    onOpenTraReports={() => onNavigate?.('reports')}
  />
);
