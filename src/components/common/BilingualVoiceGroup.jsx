import React from 'react';
import VoiceInput from './VoiceInput';

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
  // If user selected Tamil (or Tamil is current app language):
  // Display Tamil ONLY! English input is NOT displayed, and falls back to englishValue if tamilValue is blank.
  if (lang === 'ta') {
    const cleanTamilLabel = (tamilLabel || '')
      .replace(/\s*\([^\)]*தமி[^\)]*\)/g, '')
      .replace(/\s*\([^\)]*Tamil[^\)]*\)/g, '')
      .trim();

    const displayValue = (tamilValue !== undefined && tamilValue !== null && tamilValue !== '') 
      ? tamilValue 
      : (englishValue || '');

    return (
      <div className="form-group col-full" style={{ marginBottom: '0.85rem' }}>
        <VoiceInput
          label={cleanTamilLabel}
          value={displayValue}
          onChange={(val) => {
            onTamilChange(val);
            onEnglishChange(val);
          }}
          placeholder={tamilPlaceholder || 'தமிழில் தட்டச்சு செய்யவும் அல்லது பேசவும்...'}
          speechLang="ta-IN"
          required={required}
          showMagicTranslate={false}
        />
      </div>
    );
  }

  // English ONLY display with fallback to tamilValue if englishValue is blank
  const cleanEnglishLabel = (englishLabel || '')
    .replace(/\s*\([^\)]*English[^\)]*\)/g, '')
    .trim();

  const displayValue = (englishValue !== undefined && englishValue !== null && englishValue !== '') 
    ? englishValue 
    : (tamilValue || '');

  return (
    <div className="form-group col-full" style={{ marginBottom: '0.85rem' }}>
      <VoiceInput
        label={cleanEnglishLabel}
        value={displayValue}
        onChange={(val) => {
          onEnglishChange(val);
          onTamilChange(val);
        }}
        placeholder={englishPlaceholder || 'Type or speak in English...'}
        speechLang="en-IN"
        required={required}
        showMagicTranslate={false}
      />
    </div>
  );
}
