/**
 * Bilingual & Auto-Repair Utilities for TractoMint
 * Handles:
 * 1. Automatic language switching (Tamil <-> English) for all table content
 * 2. Self-healing / Un-shifting for corrupted Trip Sheet rows (e.g., totalAmount = "Admin", driverName = "Medium Rotavator")
 * 3. Smart transliteration for Tamil/English farmer & driver names
 */

import { 
  transliterateTamilToEnglish, 
  transliterateEnglishToTamil, 
  isTamilScript 
} from '../services/bilingualTranslate';

// Common Tamil Names Dictionary (Bilingual Lookup)
export const NAME_DICTIONARY = {
  // English -> Tamil
  "muthuswamy": "முத்துசாமி",
  "muthusamy": "முத்துசாமி",
  "muthu": "முத்து",
  "samy": "சாமி",
  "swamy": "சாமி",
  "kavin": "கவின்",
  "kavinkumar": "கவின்குமார்",
  "kavin kumar": "கவின் குமார்",
  "kumar": "குமார்",
  "tharun": "தருண்",
  "tarun": "தருண்",
  "dharun": "தருண்",
  "kirubakaran": "கிருபாகரன்",
  "krubakaran": "கிருபாகரன்",
  "kiruba": "கிருபா",
  "pandian": "பாண்டியன்",
  "pandiyan": "பாண்டியன்",
  "pandi": "பாண்டி",
  "murugan": "முருகன்",
  "selvam": "செல்வம்",
  "selvaraj": "செல்வராஜ்",
  "raja": "ராஜா",
  "velu": "வேலு",
  "velusamy": "வேலுசாமி",
  "veluswamy": "வேலுசாமி",
  "palani": "பழனி",
  "palanisamy": "பழனிசாமி",
  "palaniswamy": "பழனிசாமி",
  "mani": "மணி",
  "manickam": "மாணிக்கம்",
  "ramesh": "ரமேஷ்",
  "suresh": "சுரேஷ்",
  "ravi": "ரவி",
  "ravichandran": "ரவிச்சந்திரன்",
  "shankar": "சங்கர்",
  "sankar": "சங்கர்",
  "arun": "அருண்",
  "chinnasamy": "சின்னசாமி",
  "periyasamy": "பெரியசாமி",
  "periasamy": "பெரியசாமி",
  "perumal": "பெருமாள்",
  "marimuthu": "மாரிமுத்து",
  "ramu": "ராமு",
  "somu": "சோமு",
  "gopal": "கோபால்",
  "krishnan": "கிருஷ்ணன்",
  "radhakrishnan": "ராதாகிருஷ்ணன்",
  "ganesan": "கணேசன்",
  "subramani": "சுப்பிரமணி",
  "subramanian": "சுப்பிரமணியன்",
  "dhanapal": "தனபால்",
  "thangavel": "தங்கவேல்",
  "thangavelu": "தங்கவேலு",
  "kandasamy": "கந்தசாமி",
  "kandhasamy": "கந்தசாமி",
  "govindaraj": "கோவிந்தராஜ்",
  "govindasamy": "கோவிந்தசாமி",
  "nataraj": "நடராஜ்",
  "natarajan": "நடராஜன்",
  "natraj": "நடராஜ்",
  "saravanan": "சரவணன்",
  "karthik": "கார்த்திக்",
  "karthikeyan": "கார்த்திகேயன்",
  "senthil": "செந்தில்",
  "senthilkumar": "செந்தில்குமார்",
  "rajendran": "ராஜேந்திரன்",
  "venkat": "வெங்கடேஷ்",
  "venkatesh": "வெங்கடேஷ்",
  "venkatachalam": "வெங்கடாசலம்",
  "vijay": "விஜய்",
  "ajith": "அஜித்",
  "siva": "சிவா",
  "sivakumar": "சிவக்குமார்",
  "mohan": "மோகன்",
  "anbu": "அன்பு",
  "elango": "இளங்கோ",
  "nagaraj": "நாகராஜ்",
  "nagarajan": "நாகராஜன்",
  "sakthivel": "சக்திவேல்",
  "vadivel": "வடிவேல்",
  "vadivelu": "வடிவேலு",
  "vignesh": "விக்னேஷ்",
  "boopathy": "பூபதி",
  "prakash": "பிரகாஷ்",
  "easwaran": "ஈஸ்வரன்",
  "dhandapani": "தண்டபாணி",
  "gounder": "கவுண்டர்",
  "thevar": "தேவர்",
  "chettiar": "செட்டியார்",
  "naicker": "நாயக்கர்",
  "naidu": "நாயுடு",
  "reddy": "ரெட்டி",
  "reddiar": "ரெட்டியார்",
  "pillai": "பிள்ளை",
  "general customer": "பொது வாடிக்கையாளர்",
  "general driver": "பொது ஓட்டுநர்",
  "operator": "இயக்குனர்",
  "driver": "ஓட்டுநர்",
  "admin": "நிர்வாகி",
  "manager": "மேலாளர்",
  "you": "நீங்கள்"
};

// Reverse Dictionary (Tamil -> English)
export const REVERSE_NAME_DICTIONARY = {
  "தருண்": "Tharun",
  "கவின் குமார்": "Kavin Kumar",
  "கவின்குமார்": "Kavinkumar",
  "கவின்": "Kavin",
  "குமார்": "Kumar",
  "கிருபாகரன்": "Kirubakaran",
  "கிருபா": "Kiruba",
  "பாண்டியன்": "Pandian",
  "பாண்டி": "Pandi",
  "முத்துசாமி": "Muthusamy",
  "பழனிசாமி": "Palanisamy",
  "வேலுசாமி": "Velusamy",
  "செல்வம்": "Selvam",
  "செல்வராஜ்": "Selvaraj",
  "முருகன்": "Murugan",
  "ஆறுமுகம்": "Arumugam",
  "பெருமாள்": "Perumal",
  "கவுண்டர்": "Gounder",
  "சுரேஷ்": "Suresh",
  "ரமேஷ்": "Ramesh",
  "செந்தில்": "Senthil",
  "செந்தில்குமார்": "Senthilkumar",
  "தங்கவேல்": "Thangavel",
  "மணி": "Mani",
  "மாணிக்கம்": "Manickam",
  "சுப்பிரமணி": "Subramani",
  "ராஜேந்திரன்": "Rajendran",
  "கணேசன்": "Ganesan",
  "வெங்கடேஷ்": "Venkatesh",
  "சிவா": "Siva",
  "சிவக்குமார்": "Sivakumar",
  "அருண்": "Arun",
  "சங்கர்": "Shankar",
  "விஜய்": "Vijay",
  "சரவணன்": "Saravanan",
  "சக்திவேல்": "Sakthivel",
  "விக்னேஷ்": "Vignesh",
  "பூபதி": "Boopathy",
  "பிரகாஷ்": "Prakash",
  "தனபால்": "Dhanapal"
};

Object.entries(NAME_DICTIONARY).forEach(([en, ta]) => {
  if (!REVERSE_NAME_DICTIONARY[ta]) {
    REVERSE_NAME_DICTIONARY[ta] = en.charAt(0).toUpperCase() + en.slice(1);
  }
});

// Common Tractor Brands & Implement Terms
export const MACHINERY_TERMS = {
  // Tractors
  "john deere": { en: "John Deere", ta: "ஜான் டீர்" },
  "mahindra": { en: "Mahindra", ta: "மகிந்திரா" },
  "kubota": { en: "Kubota", ta: "குபோட்டா" },
  "swaraj": { en: "Swaraj", ta: "ஸ்வராஜ்" },
  "massey ferguson": { en: "Massey Ferguson", ta: "மேஸி பெர்குசன்" },
  "massey": { en: "Massey Ferguson", ta: "மேஸி பெர்குசன்" },
  "tafe": { en: "TAFE", ta: "டாஃபே" },
  "new holland": { en: "New Holland", ta: "நியூ ஹாலண்ட்" },
  "eicher": { en: "Eicher", ta: "ஐச்சர்" },
  "sonalika": { en: "Sonalika", ta: "சோனாலிகா" },
  "powertrac": { en: "PowerTrac", ta: "பவர்டிராக்" },
  "farmtrac": { en: "FarmTrac", ta: "ஃபார்ம்டிராக்" },
  "captain": { en: "Captain", ta: "கேப்டன்" },
  "standalone tractor": { en: "Standalone Tractor", ta: "தனி டிராக்டர்" },
  "standalone": { en: "Standalone Tractor", ta: "தனி டிராக்டர்" },
  "தனி டிராக்டர்": { en: "Standalone Tractor", ta: "தனி டிராக்டர்" },

  // Implements
  "medium rotavator": { en: "Medium Rotavator", ta: "நடுத்தர ரோட்டாவேட்டர்" },
  "rotavator": { en: "Rotavator", ta: "ரோட்டாவேட்டர்" },
  "ரோட்டாவேட்டர்": { en: "Rotavator", ta: "ரோட்டாவேட்டர்" },
  "5-tyne cultivator": { en: "5-Tyne Cultivator", ta: "5 கொழு கலப்பை" },
  "5-tyne ploughing": { en: "5-Tyne Ploughing", ta: "5 கொழு உழவு" },
  "5tyne": { en: "5-Tyne Cultivator", ta: "5 கொழு கலப்பை" },
  "5 கொழு": { en: "5-Tyne Cultivator", ta: "5 கொழு கலப்பை" },
  "9-tyne cultivator": { en: "9-Tyne Cultivator", ta: "9 கொழு கலப்பை" },
  "9tyne": { en: "9-Tyne Cultivator", ta: "9 கொழு கலப்பை" },
  "9 கொழு": { en: "9-Tyne Cultivator", ta: "9 கொழு கலப்பை" },
  "disc plough": { en: "Disc Plough", ta: "தட்டு கலப்பை" },
  "mb plough": { en: "MB Plough", ta: "மோல்ட்போர்டு ஏர்" },
  "cage wheel": { en: "Cage Wheel", ta: "கேஜ் வீல் (கூண்டு சக்கரம்)" },
  "trailer": { en: "Trailer / Tipper", ta: "டிரெய்லர் / வண்டி" },
  "tipper": { en: "Tipper Trailer", ta: "டிப்பர் டிரெய்லர்" },
  "harvester": { en: "Paddy Harvester", ta: "நெல் அறுவடை இயந்திரம்" },
  "post hole digger": { en: "Post Hole Digger", ta: "குழி தோண்டும் கருவி" },
  "dozer": { en: "Dozer Blade", ta: "டோசர் பிளேடு" },
  "leveler": { en: "Land Leveler", ta: "நிலம் சமன் பலகை" },
  "laser leveler": { en: "Laser Leveler", ta: "லேசர் சமன் கருவி" },
  "baler": { en: "Straw Baler", ta: "வைக்கோல் கட்டும் கருவி" },
  "bund former": { en: "Bund Former", ta: "வரப்பு கட்டும் கருவி" },
  "ridge former": { en: "Ridge Former", ta: "பாத்தி கட்டும் கருவி" },
  "seed drill": { en: "Seed Drill", ta: "விதை விதைப்பான்" },
  "subsoiler": { en: "Subsoiler", ta: "ஆழ உழவு கருவி" },
  "sprayer": { en: "Tractor Sprayer", ta: "டிராக்டர் தெளிப்பான்" }
};

/**
 * Checks if a string contains Tamil Unicode characters
 */
export function hasTamilCharacters(str) {
  if (!str || typeof str !== 'string') return false;
  return /[\u0B80-\u0BFF]/.test(str);
}

/**
 * Translates/transliterates an arbitrary customer/driver/partner name based on active language
 */
export function localizeName(name, lang = 'ta') {
  if (!name || typeof name !== 'string') return name || '';
  const trimmed = name.trim();
  if (!trimmed) return '';
  const lower = trimmed.toLowerCase();

  if (lang === 'ta') {
    // Already in Tamil? Keep it!
    if (hasTamilCharacters(trimmed)) return trimmed;
    // Check in name dictionary
    if (NAME_DICTIONARY[lower]) return NAME_DICTIONARY[lower];
    // Check partial words (e.g. "muthuswamy farmer")
    for (const [enKey, taVal] of Object.entries(NAME_DICTIONARY)) {
      if (lower.startsWith(enKey) || lower.includes(enKey)) {
        return taVal;
      }
    }
    // High-accuracy fallback: phonetic transliteration
    return transliterateEnglishToTamil(trimmed);
  } else {
    // English target: if already in English, keep it
    if (!hasTamilCharacters(trimmed)) {
      return trimmed.charAt(0).toUpperCase() + trimmed.slice(1);
    }
    // Check Tamil -> English dictionary
    if (REVERSE_NAME_DICTIONARY[trimmed]) return REVERSE_NAME_DICTIONARY[trimmed];
    for (const [taKey, enVal] of Object.entries(REVERSE_NAME_DICTIONARY)) {
      if (trimmed.includes(taKey)) {
        return enVal;
      }
    }
    // High-accuracy fallback: phonetic transliteration
    return transliterateTamilToEnglish(trimmed);
  }
}

/**
 * Resolves bilingual pair: ensures English field has English text and Tamil field has Tamil text.
 * Automatically translates/transliterates if one is missing, empty, or wrongly identical.
 */
export function resolveBilingualPair(enVal, taVal) {
  const en = String(enVal || '').trim();
  const ta = String(taVal || '').trim();

  const enHasTamil = hasTamilCharacters(en);
  const taHasTamil = hasTamilCharacters(ta);

  // Case 1: Both identical Tamil string (e.g., "தருண்" in both columns)
  if (enHasTamil && taHasTamil) {
    const cleanTa = ta || en;
    const cleanEn = localizeName(cleanTa, 'en');
    return { en: cleanEn, ta: cleanTa };
  }

  // Case 2: Both identical English string (e.g., "kirubakaran" in both columns)
  if (!enHasTamil && !taHasTamil && en && ta) {
    const cleanEn = en.charAt(0).toUpperCase() + en.slice(1);
    const cleanTa = localizeName(cleanEn, 'ta');
    return { en: cleanEn, ta: cleanTa };
  }

  // Case 3: Only Tamil provided (en is empty or has Tamil)
  if (taHasTamil && (!en || enHasTamil)) {
    const cleanEn = localizeName(ta, 'en');
    return { en: cleanEn, ta };
  }

  // Case 4: Only English provided (ta is empty or has English)
  if (!enHasTamil && en && (!ta || !taHasTamil)) {
    const cleanEn = en.charAt(0).toUpperCase() + en.slice(1);
    const cleanTa = localizeName(cleanEn, 'ta');
    return { en: cleanEn, ta: cleanTa };
  }

  // Case 5: en is actually Tamil, ta is actually English
  if (enHasTamil && !taHasTamil && ta) {
    return { en: ta.charAt(0).toUpperCase() + ta.slice(1), ta: en };
  }

  // Case 6: Already clean bilingual pair
  return {
    en: en ? (en.charAt(0).toUpperCase() + en.slice(1)) : (ta ? localizeName(ta, 'en') : ''),
    ta: ta || (en ? localizeName(en, 'ta') : '')
  };
}

/**
 * Displays text based on current active language.
 * Guarantees Tamil when lang === 'ta', and English when lang === 'en'.
 */
export function getBilingualText(enText, taText, lang = 'en') {
  let resolvedEn = enText;
  let resolvedTa = taText;
  if (enText && typeof enText === 'object') {
    if (typeof enText.en === 'string') resolvedEn = enText.en;
    if (typeof enText.ta === 'string' && !resolvedTa) resolvedTa = enText.ta;
    if (typeof enText.name === 'string' && !resolvedEn) resolvedEn = enText.name;
    if (typeof enText.label === 'string' && !resolvedEn) resolvedEn = enText.label;
  }
  if (taText && typeof taText === 'object') {
    if (typeof taText.ta === 'string') resolvedTa = taText.ta;
    if (typeof taText.en === 'string' && !resolvedEn) resolvedEn = taText.en;
    if (typeof taText.name === 'string' && !resolvedTa) resolvedTa = taText.name;
  }
  const en = String(resolvedEn ?? '').trim();
  const ta = String(resolvedTa ?? '').trim();

  if (lang === 'ta') {
    if (ta && hasTamilCharacters(ta)) return ta;
    if (en && hasTamilCharacters(en)) return en;
    return localizeName(ta || en, 'ta');
  } else {
    if (en && !hasTamilCharacters(en)) return en;
    if (ta && !hasTamilCharacters(ta)) return ta;
    return localizeName(en || ta, 'en');
  }
}

/**
 * Translates machinery / implement names based on active language
 */
export function localizeMachineryName(name, lang = 'ta') {
  if (!name || typeof name !== 'string') return name || '';
  const trimmed = name.trim();
  if (!trimmed || trimmed === '---') return lang === 'ta' ? 'தனி டிராக்டர்' : 'Standalone Tractor';
  const lower = trimmed.toLowerCase();

  // Handle multi-implement combination separated by '+'
  if (trimmed.includes('+')) {
    return trimmed
      .split('+')
      .map(part => localizeMachineryName(part.trim(), lang))
      .join(' + ');
  }

  // Exact match
  if (MACHINERY_TERMS[lower]) {
    return MACHINERY_TERMS[lower][lang] || trimmed;
  }

  // Substring match
  for (const [key, mapping] of Object.entries(MACHINERY_TERMS)) {
    if (lower.includes(key)) {
      return mapping[lang];
    }
  }

  if (lang === 'ta' && !hasTamilCharacters(trimmed)) {
    // Attempt friendly phonetic transliteration for rotavator, cultivator, etc.
    if (lower.includes('rotavator')) return 'ரோட்டாவேட்டர்';
    if (lower.includes('cultivator')) return 'கலப்பை';
    if (lower.includes('plough') || lower.includes('plow')) return 'ஏர் கலப்பை';
    if (lower.includes('trailer')) return 'டிரெய்லர்';
  }

  return trimmed;
}

/**
 * Localizes work type descriptions:
 * E.g. "5-Tyne Ploughing (5 கொழு உழவு)" ->
 * in 'ta': "5 கொழு உழவு"
 * in 'en': "5-Tyne Ploughing"
 */
export function localizeWorkType(workType, lang = 'ta') {
  if (!workType || typeof workType !== 'string') return '';
  const str = workType.trim();
  if (!str) return '';

  // Extract from bilingual parenthesis: "English (Tamil)"
  const match = str.match(/^(.*?)\s*\(([\u0B80-\u0BFF\s\d\-]+)\)$/);
  if (match) {
    const enPart = match[1].trim();
    const taPart = match[2].trim();
    return lang === 'ta' ? taPart : enPart;
  }

  // If pure English and target is Tamil
  const lower = str.toLowerCase();
  if (lang === 'ta') {
    if (lower.includes('5-tyne') || lower.includes('5tyne')) return '5 கொழு உழவு';
    if (lower.includes('9-tyne') || lower.includes('9tyne')) return '9 கொழு கலப்பை உழவு';
    if (lower.includes('rotavator')) return 'ரோட்டாவேட்டர் உழவு';
    if (lower.includes('puddling') || lower.includes('cage wheel')) return 'சேற்று உழவு';
    if (lower.includes('levelling') || lower.includes('leveler')) return 'நிலம் சமப்படுத்துதல்';
    if (lower.includes('haulage') || lower.includes('trailer')) return 'வண்டி வாடகை';
    if (lower.includes('harvester') || lower.includes('harvest')) return 'அறுவடை பணி';
    if (lower.includes('ploughing')) return 'உழவு பணி';
  } else {
    // Pure Tamil and target is English
    if (str.includes('5 கொழு')) return '5-Tyne Cultivator Ploughing';
    if (str.includes('9 கொழு')) return '9-Tyne Cultivator Ploughing';
    if (str.includes('ரோட்டாவேட்டர்')) return 'Rotavator Ploughing';
    if (str.includes('சேற்று') || str.includes('கேஜ்')) return 'Cage Wheel Wet Puddling';
    if (str.includes('சமன்')) return 'Field Levelling';
    if (str.includes('வண்டி') || str.includes('டிரெய்லர்')) return 'Trailer Haulage';
    if (str.includes('அறுவடை')) return 'Paddy Harvesting';
    if (str.includes('உழவு')) return 'Ploughing Work';
  }

  return str;
}

/**
 * Localizes billing unit and rate label:
 * E.g., per_hour -> "மணிக்கு ₹900" (ta) / "@ ₹900 / hr" (en)
 */
export function localizeBillingRate(billingUnit, rate, lang = 'ta') {
  const r = rate || 0;
  if (billingUnit === 'per_hour') {
    return lang === 'ta' ? `@ ₹${r} / மணி` : `@ ₹${r} / hr`;
  }
  if (billingUnit === 'per_acre') {
    return lang === 'ta' ? `@ ₹${r} / ஏக்கர்` : `@ ₹${r} / acre`;
  }
  if (billingUnit === 'per_trip') {
    return lang === 'ta' ? `@ ₹${r} / டிரிப்` : `@ ₹${r} / trip`;
  }
  if (billingUnit === 'per_km') {
    return lang === 'ta' ? `@ ₹${r} / கி.மீ` : `@ ₹${r} / km`;
  }
  return `@ ₹${r}`;
}

/**
 * Localizes payment modes (Cash, GPay, UPI, Bank, Credit)
 */
export function localizePaymentMode(mode, lang = 'ta') {
  if (!mode || typeof mode !== 'string') return '';
  const m = mode.trim().toLowerCase();
  if (lang === 'ta') {
    if (m === 'cash') return 'ரொக்கம் (Cash)';
    if (m === 'gpay') return 'கூகுள் பே (GPay)';
    if (m === 'upi') return 'யுபிஐ (UPI)';
    if (m === 'bank' || m === 'neft') return 'வங்கி பரிமாற்றம்';
    if (m === 'credit') return 'கடன் / நிலுவை';
    return mode;
  } else {
    if (m === 'cash') return 'Cash';
    if (m === 'gpay') return 'GPay';
    if (m === 'upi') return 'UPI';
    if (m === 'bank' || m === 'neft') return 'Bank Transfer';
    if (m === 'credit') return 'Credit';
    return mode.toUpperCase();
  }
}

/**
 * Localizes Collected By string (translating roles like Admin, Driver, etc.)
 */
export function localizeCollectedBy(collectedBy, lang = 'ta') {
  if (!collectedBy || typeof collectedBy !== 'string') return '--';
  const str = collectedBy.trim();
  if (!str) return '--';

  if (lang === 'ta') {
    return str
      .replace(/\bAdmin\b/gi, 'நிர்வாகி (Admin)')
      .replace(/\bManager\b/gi, 'மேலாளர் (Manager)')
      .replace(/\bOperator\b/gi, 'இயக்குனர் (Operator)')
      .replace(/\bDriver\b/gi, 'ஓட்டுநர் (Driver)')
      .replace(/\(Collector\)/gi, '(வசூலிப்பாளர்)')
      .replace(/\(You\)/gi, '(நீங்கள்)');
  } else {
    return str
      .replace(/நிர்வாகி\s*\(Admin\)/gi, 'Admin')
      .replace(/மேலாளர்\s*\(Manager\)/gi, 'Manager')
      .replace(/இயக்குனர்\s*\(Operator\)/gi, 'Operator')
      .replace(/ஓட்டுநர்\s*\(Driver\)/gi, 'Driver')
      .replace(/\(வசூலிப்பாளர்\)/gi, '(Collector)')
      .replace(/\(நீங்கள்\)/gi, '(You)');
  }
}

/**
 * CRITICAL SELF-HEALING FUNCTION:
 * Automatically detects and repairs shifted trip records.
 *
 * A shifted record occurs when an old 29-column row was read using a 34-column schema,
 * causing:
 * - totalAmount to receive "Admin" (from collectedBy)
 * - balanceAmount to receive "cash" (from paymentMode)
 * - driverName to receive "Medium Rotavator" (from implementName)
 * - quantity to receive 1600 (from old totalAmount)
 */
export function healShiftedTripRecord(trip) {
  if (!trip || typeof trip !== 'object') return trip;

  const totalStr = String(trip.totalAmount || '').trim();
  const balStr = String(trip.balanceAmount || '').trim().toLowerCase();
  const paidStr = String(trip.paidAmount || '').trim();

  // Signature of shifted columns
  const isShifted = 
    isNaN(Number(trip.totalAmount)) && (
      ['admin', 'operator', 'manager', 'driver'].includes(totalStr.toLowerCase()) ||
      ['cash', 'credit', 'gpay', 'upi', 'bank'].includes(balStr)
    );

  if (!isShifted) {
    // Ensure totalAmount and balanceAmount are always valid numbers
    const validTotal = !isNaN(Number(trip.totalAmount)) ? Number(trip.totalAmount) : 0;
    const validPaid = !isNaN(Number(trip.paidAmount)) ? Number(trip.paidAmount) : 0;
    const validBal = !isNaN(Number(trip.balanceAmount)) ? Number(trip.balanceAmount) : Math.max(0, validTotal - validPaid);
    return {
      ...trip,
      totalAmount: validTotal,
      paidAmount: validPaid,
      balanceAmount: validBal
    };
  }

  // Un-shift fields to their correct positions!
  // Old columns:
  // customerName was in trip.customerId (e.g. "muthuswamy")
  // implementName was in trip.driverName (e.g. "Medium Rotavator")
  // totalAmount was in trip.quantity (e.g. 1600)
  // collectedBy was in trip.totalAmount (e.g. "Admin")
  // paymentMode was in trip.balanceAmount (e.g. "cash")

  const realCustomerName = trip.customerId && typeof trip.customerId === 'string' && !trip.customerId.startsWith('CUST-') 
    ? trip.customerId 
    : (trip.customerName || 'General Customer');
  const realDriverName = trip.customerName && !toSafeLower(trip.customerName).includes('rotavator') 
    ? trip.customerName 
    : 'General Driver';
  const realImplementName = trip.driverName || 'Standalone Tractor';
  const realAmount = Number(trip.quantity) || 1600;
  const realCollectedBy = totalStr || 'Admin';
  const realPaymentMode = ['cash', 'credit', 'gpay', 'upi', 'bank'].includes(balStr) ? balStr : 'cash';

  const isPaid = realPaymentMode !== 'credit' && realCollectedBy;

  return {
    ...trip,
    customerId: trip.customerId && trip.customerId.startsWith('CUST-') ? trip.customerId : '',
    customerName: realCustomerName,
    driverId: '',
    driverName: realDriverName,
    tractorId: '',
    tractorName: 'General Tractor',
    implementId: '',
    implementName: realImplementName,
    workType: '5-Tyne Ploughing (5 கொழு உழவு)',
    workDescription: '',
    billingUnit: 'per_trip',
    quantity: 1,
    rate: realAmount,
    grossAmount: realAmount,
    discount: 0,
    totalAmount: realAmount,
    paidAmount: isPaid ? realAmount : 0,
    balanceAmount: isPaid ? 0 : realAmount,
    paymentStatus: isPaid ? 'paid' : 'unpaid',
    paymentMode: realPaymentMode,
    collectedBy: realCollectedBy,
    collectedWhen: trip.date ? `${trip.date} 12:00` : new Date().toISOString().slice(0, 16).replace('T', ' '),
    paidOnDate: trip.date || new Date().toISOString().slice(0, 10),
    cashInHandStatus: 'settled',
    _healed: true
  };
}

/**
 * Robust string extractor & case-insensitive matcher
 * Safely handles strings, numbers, objects ({ en, ta }), null and undefined
 * Prevents "TypeError: ...toLowerCase is not a function"
 */
export const toSafeStr = (val) => {
  if (val === null || val === undefined) return '';
  if (typeof val === 'string') return val;
  if (typeof val === 'number') return String(val);
  if (typeof val === 'object') {
    if (typeof val.en === 'string') return val.en;
    if (typeof val.name === 'string') return val.name;
    if (typeof val.ta === 'string') return val.ta;
    if (typeof val.label === 'string') return val.label;
  }
  return String(val || '');
};

export const toSafeLower = (val) => toSafeStr(val).trim().toLowerCase();

export const isNameMatch = (a, b) => {
  const sa = toSafeLower(a);
  const sb = toSafeLower(b);
  return sa !== '' && sb !== '' && sa === sb;
};

