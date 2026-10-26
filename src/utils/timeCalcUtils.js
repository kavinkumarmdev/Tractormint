/**
 * Time and Agri-Calculation Utilities for TractoMint
 * Handles conversions like:
 *   - '1:30' or '1.30' -> 1.5 hours
 *   - '.45' or '0:45' or '0.45' -> 0.75 hours
 *   - '.30' or '0:30' or '0.30' -> 0.5 hours
 *   - '.15' or '0:15' or '0.15' -> 0.25 hours
 *   - Prevents unrounded precision bugs (e.g. 10.589...)
 *   - Fixes UTF-8 Mojibake (e.g. à®•à®µà®¿à®©à¯ -> கவின்)
 */

/**
 * Fixes Latin-1/Windows-1252 Mojibake corruption of UTF-8 strings
 */
export function fixMojibake(str) {
  if (typeof str !== 'string' || !str) return str;
  // If string contains mojibake characters like à® (0xE0 0xAE)
  if (/[\u00C0-\u00FF]/.test(str)) {
    try {
      const decoded = decodeURIComponent(escape(str));
      if (decoded && !/[\uFFFD]/.test(decoded)) {
        return decoded;
      }
    } catch (e) {
      // ignore
    }
  }
  return str;
}

/**
 * Recursively cleans an entire object or array of Mojibake
 */
export function cleanDeep(data) {
  if (data === null || data === undefined) return data;
  if (typeof data === 'string') return fixMojibake(data);
  if (Array.isArray(data)) return data.map(cleanDeep);
  if (typeof data === 'object') {
    const res = {};
    for (const [k, v] of Object.entries(data)) {
      res[k] = cleanDeep(v);
    }
    return res;
  }
  return data;
}

/**
 * Parses agricultural time/duration input into clean decimal hours.
 * 
 * Supports:
 *   - '1:30' -> 1.5 hours
 *   - '.45' or '0.45' or '0:45' -> 0.75 hours
 *   - '.30' or '0.30' or '0:30' -> 0.5 hours
 *   - '.15' or '0.15' or '0:15' -> 0.25 hours
 *   - '1.30' (time-entry dot style) -> 1.5 hours
 *   - '1.5' -> 1.5 hours
 *   - '2.45' (2 hrs 45 mins) -> 2.75 hours
 */
export function parseAgriDuration(rawInput) {
  if (rawInput === undefined || rawInput === null || rawInput === '') {
    return { decimalHours: 0, hours: 0, minutes: 0, textTa: '', textEn: '', isTimeFormat: false };
  }

  const str = String(rawInput).trim();

  // Case 1: Contains colon 'HH:MM' or ':MM'
  if (str.includes(':')) {
    const parts = str.split(':');
    const h = parseInt(parts[0], 10) || 0;
    const m = parseInt(parts[1], 10) || 0;
    const validM = Math.min(59, Math.max(0, m));
    const dec = Math.round((h + validM / 60) * 100) / 100;
    return {
      decimalHours: dec,
      hours: h,
      minutes: validM,
      textTa: h > 0 ? `${h} மணி ${validM > 0 ? validM + ' நிமிடம்' : ''}`.trim() : `${validM} நிமிடம்`,
      textEn: h > 0 ? `${h} hr ${validM > 0 ? validM + ' min' : ''}`.trim() : `${validM} min`,
      isTimeFormat: true
    };
  }

  // Case 2: Starts with dot, e.g. '.45', '.30', '.15' (meaning minutes)
  if (str.startsWith('.')) {
    const m = parseInt(str.slice(1), 10) || 0;
    if (m > 0 && m < 60) {
      const dec = Math.round((m / 60) * 100) / 100;
      return {
        decimalHours: dec,
        hours: 0,
        minutes: m,
        textTa: `${m} நிமிடம்`,
        textEn: `${m} min`,
        isTimeFormat: true
      };
    }
  }

  // Case 3: Decimal number like '1.30', '1.45', '1.15', '0.45', '1.5'
  if (str.includes('.')) {
    const parts = str.split('.');
    const h = parseInt(parts[0], 10) || 0;
    const decPart = parts[1];

    // If decimal part is 2 digits and represents common tractor minute increments (15, 30, 45, 10, 20, 40, 50)
    // or if 0.45, 0.30, 0.15
    if (decPart.length === 2) {
      const m = parseInt(decPart, 10);
      if (m === 15 || m === 30 || m === 45 || m === 20 || m === 40 || m === 10 || m === 50) {
        const dec = Math.round((h + m / 60) * 100) / 100;
        return {
          decimalHours: dec,
          hours: h,
          minutes: m,
          textTa: h > 0 ? `${h} மணி ${m} நிமிடம்` : `${m} நிமிடம்`,
          textEn: h > 0 ? `${h} hr ${m} min` : `${m} min`,
          isTimeFormat: true
        };
      }
    }
  }

  // Standard float fallback
  const num = parseFloat(str);
  if (!isNaN(num) && num >= 0) {
    const cleanNum = Math.round(num * 100) / 100;
    const h = Math.floor(cleanNum);
    const m = Math.round((cleanNum - h) * 60);
    return {
      decimalHours: cleanNum,
      hours: h,
      minutes: m,
      textTa: h > 0 ? `${h} மணி ${m > 0 ? m + ' நிமிடம்' : ''}`.trim() : `${m} நிமிடம்`,
      textEn: h > 0 ? `${h} hr ${m > 0 ? m + ' min' : ''}`.trim() : `${m} min`,
      isTimeFormat: false
    };
  }

  return { decimalHours: 0, hours: 0, minutes: 0, textTa: '', textEn: '', isTimeFormat: false };
}

/**
 * Formats decimal hours into clear Tamil/English representation:
 * E.g., 1.5 -> "1 மணி 30 நிமிடம் (1.5 மணி)" or "1 hr 30 min (1.5 hrs)"
 */
export function formatDurationLabel(decimalHours, lang = 'ta') {
  const num = parseFloat(decimalHours);
  if (isNaN(num) || num <= 0) return '0';

  const cleanNum = Math.round(num * 100) / 100;
  const h = Math.floor(cleanNum);
  const m = Math.round((cleanNum - h) * 60);

  if (lang === 'ta') {
    if (h > 0 && m > 0) return `${h} மணி ${m} நிமிடம் (${cleanNum} மணி)`;
    if (h > 0) return `${h} மணி`;
    return `${m} நிமிடம் (${cleanNum} மணி)`;
  } else {
    if (h > 0 && m > 0) return `${h} hr ${m} min (${cleanNum} hrs)`;
    if (h > 0) return `${h} hrs`;
    return `${m} min (${cleanNum} hrs)`;
  }
}

/**
 * Calculates duration between two time strings ('HH:MM' and 'HH:MM')
 * Returns decimal hours rounded strictly to 2 decimal places.
 */
export function calculateTimeDifferenceHours(startTime, endTime) {
  if (!startTime || !endTime) return null;
  const sParts = startTime.split(':').map(Number);
  const eParts = endTime.split(':').map(Number);
  if (sParts.some(isNaN) || eParts.some(isNaN)) return null;

  const startMins = sParts[0] * 60 + sParts[1];
  const endMins = eParts[0] * 60 + eParts[1];
  const diffMins = endMins >= startMins ? (endMins - startMins) : (endMins + 1440 - startMins);

  const decHours = Math.round((diffMins / 60) * 100) / 100;
  return {
    diffMins,
    decimalHours: Math.max(0.1, decHours),
    hours: Math.floor(diffMins / 60),
    minutes: diffMins % 60
  };
}
