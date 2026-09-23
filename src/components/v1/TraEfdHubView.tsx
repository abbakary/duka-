import React, { useEffect } from 'react';
import type { AuthUser, Language } from '@/types/v1';
import { DUKA_REPORTS_HUB_KEY } from '@/components/v1/tra/TraEfdSetupView';

interface TraEfdHubViewProps {
  language: Language;
  businessName?: string;
  tinNumber?: string;
  currentUser?: AuthUser | null;
  onGoReports?: () => void;
}

/** @deprecated TRA hub moved to Finance → Reports. Redirects when mounted. */
export const TraEfdHubView: React.FC<TraEfdHubViewProps> = ({ onGoReports }) => {
  useEffect(() => {
    sessionStorage.setItem(DUKA_REPORTS_HUB_KEY, 'tra');
    onGoReports?.();
  }, [onGoReports]);

  return null;
};
