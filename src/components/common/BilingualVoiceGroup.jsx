import React, { useRef } from 'react';
import VoiceInput from './VoiceInput';
import { 
  transliterateTamilToEnglish, 
  transliterateEnglishToTamil, 
  isTamilScript, 
  autoFillCounterpart 
} from '../../services/bilingualTranslate';
import { localizeName, hasTamilCharacters, getBilingualText } from '../../utils/langUtils';
import { Globe2 } from 'lucide-react';

export default function BilingualVoiceGroup({
  englishLabel = 'Name',
  tamilLabel = 'பெயர்',
  englishValue = '',
  tamilValue = '',
  onEnglishChange = () => {},
  onTamilChange = () => {},
  englishPlaceholder = 'Enter details...',
  tamilPlaceholder = 'விவரங்களை உள்ளிடவும்...',
  required = false,
  lang = 'en'
}) {
  const debounceRef = useRef(null);

  // Handle single input changes (speech dictation or typing)
  // Automatically calculates and saves both languages!
  const handleInputChange = (val) => {
    if (!val || !val.trim()) {
      onEnglishChange('');
      onTamilChange('');
      return;
    }

    const trimmed = val.trim();
    const hasTamil = isTamilScript(trimmed);

    if (hasTamil) {
      // User entered Tamil (e.g. "கவின் குமார்", "தருண்", "பாண்டியன்")
      onTamilChange(val);
      const immediateEn = localizeName(trimmed, 'en');
      onEnglishChange(immediateEn);

      // Debounced refined translation via API if online
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(async () => {
        try {
          const res = await autoFillCounterpart({ text: trimmed, sourceLang: 'ta' });
          if (res && res.english && !isTamilScript(res.english) && res.english !== trimmed) {
            onEnglishChange(res.english);
          }
        } catch {
          // ignore fallback
        }
      }, 500);
    } else {
      // User entered English (e.g. "Kavin Kumar", "Kirubakaran")
      onEnglishChange(val);
      const immediateTa = localizeName(trimmed, 'ta');
      onTamilChange(immediateTa);

      // Debounced refined translation via API if online
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(async () => {
        try {
          const res = await autoFillCounterpart({ text: trimmed, sourceLang: 'en' });
          if (res && res.tamil && isTamilScript(res.tamil)) {
            onTamilChange(res.tamil);
          }
        } catch {
          // ignore fallback
        }
      }, 500);
    }
  };

  // If user selected Tamil: display Tamil input only
  if (lang === 'ta') {
    const cleanTamilLabel = (tamilLabel || '')
      .replace(/\s*\([^\)]*தமி[^\)]*\)/g, '')
      .replace(/\s*\([^\)]*Tamil[^\)]*\)/g, '')
      .trim();

    // Determine current Tamil value for display (with smart fallback if previously saved in English)
    const displayValue = getBilingualText(englishValue, tamilValue, 'ta');
    const autoEnglishPreview = getBilingualText(englishValue, tamilValue, 'en');

    return (
      <div className="form-group col-full" style={{ marginBottom: '0.85rem' }}>
        <VoiceInput
          label={cleanTamilLabel}
          value={displayValue}
          onChange={handleInputChange}
          placeholder={tamilPlaceholder || 'தமிழில் தட்டச்சு செய்யவும் அல்லது பேசவும்...'}
          speechLang="ta-IN"
          required={required}
          showMagicTranslate={false}
        />
        {displayValue && autoEnglishPreview && autoEnglishPreview !== displayValue && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.35rem',
            fontSize: '0.75rem',
            color: 'var(--primary-700)',
            marginTop: '0.25rem',
            padding: '0.2rem 0.5rem',
            background: 'rgba(5, 150, 105, 0.08)',
            borderRadius: '4px',
            width: 'fit-content'
          }}>
            <Globe2 size={12} />
            <span>ஆங்கிலத்தில் தானாக சேமிக்கப்படுகிறது: <strong>{autoEnglishPreview}</strong></span>
          </div>
        )}
      </div>
    );
  }

  // If user selected English: display English input only
  const cleanEnglishLabel = (englishLabel || '')
    .replace(/\s*\([^\)]*English[^\)]*\)/g, '')
    .trim();

  // Determine current English value for display (with smart fallback if previously saved in Tamil)
  const displayValue = getBilingualText(englishValue, tamilValue, 'en');
  const autoTamilPreview = getBilingualText(englishValue, tamilValue, 'ta');

  return (
    <div className="form-group col-full" style={{ marginBottom: '0.85rem' }}>
      <VoiceInput
        label={cleanEnglishLabel}
        value={displayValue}
        onChange={handleInputChange}
        placeholder={englishPlaceholder || 'Type or speak in English...'}
        speechLang="en-IN"
        required={required}
        showMagicTranslate={false}
      />
      {displayValue && autoTamilPreview && autoTamilPreview !== displayValue && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.35rem',
          fontSize: '0.75rem',
          color: 'var(--primary-700)',
          marginTop: '0.25rem',
          padding: '0.2rem 0.5rem',
          background: 'rgba(5, 150, 105, 0.08)',
          borderRadius: '4px',
          width: 'fit-content'
        }}>
          <Globe2 size={12} />
          <span>Auto-saving in Tamil: <strong>{autoTamilPreview}</strong></span>
        </div>
      )}
    </div>
  );
}
