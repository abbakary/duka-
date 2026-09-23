import { isNetworkFailure } from '@/lib/authBridge';

export function formatApiError(error: unknown, isSw = false): string {
  if (isNetworkFailure(error)) {
    return isSw
      ? 'Hakuna mtandao au seva haipatikani. Angalia muunganisho wako wa intaneti.'
      : 'Network error — check your internet connection and try again.';
  }

  const msg = error instanceof Error ? error.message : String(error);
  const lower = msg.toLowerCase();

  if (lower.includes('invalid email or password')) {
    return isSw
      ? 'Barua pepe au nenosiri si sahihi. Jaribu tena.'
      : 'Invalid email or password.';
  }

  if (lower.includes('password must be at least 6') || lower.includes('string_too_short')) {
    return isSw
      ? 'Nenosiri lazima liwe na angalau herufi 6.'
      : 'Password must be at least 6 characters.';
  }

  if (lower.includes('invalid input value for enum') || lower.includes('saasplantier')) {
    return isSw
      ? 'Hitilafu ya mpango wa usajili kwenye seva. Jaribu tena baada ya dakika chache au wasiliana na msaada.'
      : 'Server plan configuration error during signup. Please retry shortly or contact support.';
  }

  if (
    lower.includes('email already registered') ||
    lower.includes('already registered') ||
    lower.includes('email_taken')
  ) {
    return isSw
      ? 'Barua pepe hii tayari inatumika (mf. hr@gmail.com). Tumia barua pepe nyingine au ingia kwa akaunti hiyo.'
      : 'This email is already in use. Choose a different address or sign in with that account.';
  }

  if (
    lower.includes('hr_role_db_migration') ||
    lower.includes('invalid role:') ||
    (lower.includes('invalid input value for enum') && lower.includes('staff'))
  ) {
    return isSw
      ? 'Jukumu la HR halijawekwa kwenye database ya Railway. Deploy/restart backend ya karibuni (migration inaendesha startup), kisha jaribu tena.'
      : 'The HR role is not in the Railway database yet. Deploy/restart the latest backend (migration runs on startup), then retry.';
  }

  if (lower.includes('canmanagestaff') || lower.includes('missing permission')) {
    return isSw
      ? 'Huna ruhusa ya kusajili wafanyakazi. Ingia kama Boss, Manager, au HR.'
      : 'You do not have permission to register staff. Sign in as Owner, Manager, or HR.';
  }

  if (lower.includes('cors') || lower.includes('failed to fetch')) {
    return isSw
      ? 'Imeshindikana kuunganisha na seva. Wasiliana na msimamizi wa mfumo.'
      : 'Could not reach the server. The app URL may need to be added to backend CORS settings.';
  }

  return msg || (isSw ? 'Ombi limeshindikana.' : 'Request failed.');
}

