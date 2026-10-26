/**
 * Date & Time Formatting Utilities for TractoMint
 * Formats dates strictly as DD/MM/YYYY and sanitizes time strings
 */

export function formatDateDDMMYYYY(dateStr) {
  if (!dateStr) return '--';
  const str = String(dateStr).trim();
  
  // If string contains 1899 dummy dates, ignore
  if (str.includes('1899-12-30')) return '--';

  // If already DD/MM/YYYY
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(str)) {
    return str;
  }

  // If DD-MM-YYYY, convert to DD/MM/YYYY
  if (/^\d{2}-\d{2}-\d{4}$/.test(str)) {
    return str.replace(/-/g, '/');
  }

  // If YYYY-MM-DD or YYYY/MM/DD
  const ymdMatch = str.match(/^(\d{4})[-\/](\d{1,2})[-\/](\d{1,2})/);
  if (ymdMatch) {
    const yyyy = ymdMatch[1];
    const mm = ymdMatch[2].padStart(2, '0');
    const dd = ymdMatch[3].padStart(2, '0');
    if (parseInt(yyyy, 10) < 1970) return '--';
    return `${dd}/${mm}/${yyyy}`;
  }

  // Fallback try standard Date parsing
  const d = new Date(str);
  if (!isNaN(d.getTime())) {
    const yyyy = d.getFullYear();
    if (yyyy < 1970) return '--';
    const dd = String(d.getDate()).padStart(2, '0');
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    return `${dd}/${mm}/${yyyy}`;
  }

  return str;
}

export function formatTimeDisplay(timeStr) {
  if (!timeStr) return '';
  const str = String(timeStr).trim();
  
  // If time string has 1899-12-30 dummy date from Google Sheets
  if (str.includes('1899-12-30')) {
    const match = str.match(/(?:T|\s)(\d{1,2}:\d{2})/);
    if (match) return match[1];
    const anyTime = str.match(/(\d{1,2}:\d{2})/);
    if (anyTime) return anyTime[1];
    return '';
  }

  // If ISO datetime or space-separated timestamp
  if (str.includes('T') || str.includes(' ')) {
    const match = str.match(/(?:T|\s)(\d{1,2}:\d{2})/);
    if (match) return match[1];
  }

  // If plain time pattern like "12:30" or "09:15"
  const plainTimeMatch = str.match(/^(\d{1,2}:\d{2})/);
  if (plainTimeMatch) {
    return plainTimeMatch[1];
  }

  return str;
}
