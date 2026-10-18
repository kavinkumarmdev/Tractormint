// =====================================================================
// TractoMint - Environment Configuration
// Reads from .env (VITE_GOOGLE_SHEETS_URL / VITE_GOOGLE_APPS_SCRIPT_URL)
// =====================================================================

export const ENV_GOOGLE_SHEETS_URL = 
  import.meta.env.VITE_GOOGLE_SHEETS_URL || 
  import.meta.env.VITE_GOOGLE_APPS_SCRIPT_URL || 
  "https://script.google.com/macros/s/AKfycbz4hWjo7LSMiTHho3YRiDQQoeqWxqA9WYzMivfSknwSLLqbbWi5oo2iUzV6MpsAekIabg/exec";

export const getEffectiveGoogleSheetUrl = (customUrl) => {
  if (customUrl && typeof customUrl === 'string' && customUrl.trim().startsWith('http')) {
    return customUrl.trim();
  }
  return ENV_GOOGLE_SHEETS_URL;
};
