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

      {/* Helper Bar */}
      <div 
        style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center', 
          fontSize: '0.73rem', 
          color: 'var(--text-light)',
          background: 'var(--bg-subtle)',
          padding: '0.35rem 0.65rem',
          borderRadius: 'var(--radius-sm)',
          border: '1px dashed var(--border-color)'
        }}
      >
        <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
          <Sparkles size={12} color="var(--primary-600)" />
          <span>Mic & Auto-Fill: Speak or type in English or தமிழ் — both fields auto-fill!</span>
        </span>
        <button
          type="button"
          onClick={handleManualSync}
          style={{
            background: 'none',
            border: 'none',
            color: 'var(--primary-700)',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '0.25rem',
            fontWeight: 700,
            fontSize: '0.72rem'
          }}
          title="Manually re-sync translations"
        >
          <RefreshCw size={11} className={isSyncing ? 'spin-animation' : ''} />
          <span>{isSyncing ? 'Translating...' : 'Re-Sync (ஒத்திசை)'}</span>
        </button>
      </div>
    </div>
  );
}
