// =====================================================================
// TractoMint - Environment Configuration
// Reads from .env (VITE_GOOGLE_SHEETS_URL / VITE_GOOGLE_APPS_SCRIPT_URL)
// =====================================================================

export const ENV_GOOGLE_SHEETS_URL = 
  import.meta.env.VITE_GOOGLE_SHEETS_URL || 
  import.meta.env.VITE_GOOGLE_APPS_SCRIPT_URL || 
  "https://script.google.com/macros/s/AKfycbw69Ez7kajVPrdnKYUpEWE4hzxaFpqhMf0_UGKcgYD50lP_HHF2M0dbxP-pcFPXAdn_/exec";

export const getEffectiveGoogleSheetUrl = (customUrl) => {
  if (customUrl && typeof customUrl === 'string' && customUrl.trim().startsWith('http')) {
    // If user has old default URL in localStorage, upgrade to new URL
    if (customUrl.includes('AKfycbz4hWjo7LSMiTHho3YRiDQQoeqWxqA9WYzMivfSknwSLLqbbWi5oo2iUzV6MpsAekIabg')) {
      return ENV_GOOGLE_SHEETS_URL;
    }
    return customUrl.trim();
  }
  return ENV_GOOGLE_SHEETS_URL;
};
