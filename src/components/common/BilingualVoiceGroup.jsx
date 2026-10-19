import React, { useState } from 'react';
import { Sparkles, ArrowRightLeft, RefreshCw } from 'lucide-react';
import VoiceInput from './VoiceInput';
import { autoFillCounterpart } from '../../services/bilingualTranslate';

export default function BilingualVoiceGroup({
  englishLabel = 'Name (English)',
  tamilLabel = 'பெயர் (தமிழ்)',
  englishValue = '',
  tamilValue = '',
  onEnglishChange = () => {},
  onTamilChange = () => {},
  englishPlaceholder = 'Type or speak in English...',
  tamilPlaceholder = 'தமிழில் தட்டச்சு செய்யவும் அல்லது பேசவும்...',
  required = false
}) {
  const [isSyncing, setIsSyncing] = useState(false);

  // Manual one-click two-way translation sync button
  const handleManualSync = async () => {
    setIsSyncing(true);
    try {
      if (englishValue.trim()) {
        const res = await autoFillCounterpart({ text: englishValue, sourceLang: 'en' });
        if (res.tamil) onTamilChange(res.tamil);
      } else if (tamilValue.trim()) {
        const res = await autoFillCounterpart({ text: tamilValue, sourceLang: 'ta' });
        if (res.english) onEnglishChange(res.english);
      }
    } catch (e) {
      console.warn('Sync error:', e);
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <div className="bilingual-voice-group" style={{ gridColumn: 'span 2', display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }} className="bilingual-inputs-row">
        {/* English Voice Field */}
        <VoiceInput
          label={englishLabel}
          value={englishValue}
          onChange={onEnglishChange}
          placeholder={englishPlaceholder}
          speechLang="en-IN"
          onCounterpartChange={onTamilChange}
          counterpartLang="ta"
          required={required}
        />

        {/* Tamil Voice Field */}
        <VoiceInput
          label={tamilLabel}
          value={tamilValue}
          onChange={onTamilChange}
          placeholder={tamilPlaceholder}
          speechLang="ta-IN"
          onCounterpartChange={onEnglishChange}
          counterpartLang="en"
        />
      </div>
    </div>
  );
}
