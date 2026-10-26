import React, { useState, useEffect, useRef } from 'react';
import { Mic, MicOff, Loader2, Sparkles, Volume2 } from 'lucide-react';
import { autoFillCounterpart, isTamilScript, parseSpokenPhoneDigits } from '../../services/bilingualTranslate';

// Helper to check Speech Recognition support
export const isSpeechRecognitionSupported = () => {
  return typeof window !== 'undefined' && 
    (Boolean(window.SpeechRecognition) || Boolean(window.webkitSpeechRecognition));
};

export default function VoiceInput({
  label,
  value = '',
  onChange = () => {},
  placeholder = '',
  speechLang = 'auto', // 'ta-IN', 'en-IN', or 'auto'
  onCounterpartChange,  // If provided, auto-fills counterpart language field!
  counterpartLang = 'ta', // 'ta' or 'en'
  required = false,
  className = '',
  type = 'text',
  id,
  name,
  disabled = false,
  showMagicTranslate = true
}) {
  const [isListening, setIsListening] = useState(false);
  const [speechError, setSpeechError] = useState('');
  const [isTranslating, setIsTranslating] = useState(false);
  const recognitionRef = useRef(null);

  // Helper to resolve active language
  const getResolvedLang = () => {
    if (speechLang === 'en-IN' || speechLang === 'en') return 'en-IN';
    if (speechLang === 'ta-IN' || speechLang === 'ta') return 'ta-IN';
    if (typeof document !== 'undefined' && document.documentElement.lang === 'ta') return 'ta-IN';
    if (isTamilScript(label || placeholder)) return 'ta-IN';
    return 'en-IN';
  };

  // Initialize Speech Recognition
  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.lang = getResolvedLang();

      recognition.onstart = () => {
        setIsListening(true);
        setSpeechError('');
      };

      recognition.onresult = async (event) => {
        const transcript = event.results[0][0].transcript;
        if (transcript) {
          if (type === 'tel') {
            // Intelligent parser for spoken mobile numbers (Tamil & English words / digits)
            const parsedDigits = parseSpokenPhoneDigits(transcript);
            let finalDigits = parsedDigits;
            if (parsedDigits) {
              if (parsedDigits.length === 10) {
                finalDigits = parsedDigits;
              } else if (value && value.length + parsedDigits.length <= 10) {
                finalDigits = (value + parsedDigits);
              } else {
                finalDigits = parsedDigits.slice(0, 10);
              }
              onChange(finalDigits);
            } else {
              // Fallback to extracting any numbers from transcript
              const fallback = transcript.replace(/\D/g, '').slice(0, 10);
              if (fallback) onChange(fallback);
            }
          } else {
            const newVal = value ? `${value} ${transcript}` : transcript;
            onChange(newVal);

            // Trigger bilingual counterpart auto-fill if handler provided
            if (onCounterpartChange) {
              triggerAutoTranslate(newVal);
            }
          }
        }
        setIsListening(false);
      };

      recognition.onerror = (event) => {
        console.warn('Speech recognition error:', event.error);
        if (event.error === 'not-allowed') {
          setSpeechError('Mic permission denied. Please allow microphone access.');
        } else if (event.error !== 'no-speech') {
          setSpeechError('Could not recognize voice.');
        }
        setIsListening(false);
        setTimeout(() => setSpeechError(''), 4000);
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = recognition;
    }

    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch {
          // ignore
        }
      }
    };
  }, [speechLang, value, label, placeholder, type]);

  // Toggle Listening
  const toggleListening = () => {
    if (!isSpeechRecognitionSupported()) {
      alert('Speech Recognition is supported in Chrome, Edge, Safari, and Android browsers. Please ensure your browser supports speech-to-text.');
      return;
    }

    if (isListening) {
      try {
        recognitionRef.current?.stop();
      } catch {
        // ignore
      }
      setIsListening(false);
    } else {
      try {
        const targetLang = getResolvedLang();
        if (recognitionRef.current) {
          recognitionRef.current.lang = targetLang;
          recognitionRef.current.start();
        }
      } catch (err) {
        console.warn('Failed to start speech recognition:', err);
        setIsListening(false);
      }
    }
  };

  // Trigger Counterpart Auto Translate
  const triggerAutoTranslate = async (sourceText) => {
    if (!sourceText || !sourceText.trim() || !onCounterpartChange) return;
    setIsTranslating(true);
    try {
      const result = await autoFillCounterpart({
        text: sourceText,
        sourceLang: isTamilScript(sourceText) ? 'ta' : 'en'
      });
      if (counterpartLang === 'ta') {
        onCounterpartChange(result.tamil);
      } else {
        onCounterpartChange(result.english);
      }
    } catch (err) {
      console.warn('Auto translation error:', err);
    } finally {
      setIsTranslating(false);
    }
  };

  const handleInputChange = (e) => {
    const val = e.target.value;
    onChange(val);
    if (onCounterpartChange && val.trim().length > 1) {
      // Debounce trigger
      if (window._autoFillTimeout) clearTimeout(window._autoFillTimeout);
      window._autoFillTimeout = setTimeout(() => {
        triggerAutoTranslate(val);
      }, 400);
    }
  };

  return (
    <div className="voice-input-container" style={{ position: 'relative', width: '100%' }}>
      {label && (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem' }}>
          <label style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-main)', margin: 0 }}>
            {label} {required && <span style={{ color: '#ef4444' }}>*</span>}
          </label>
        </div>
      )}

      <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
        <input
          id={id}
          name={name}
          type={type}
          className={`form-control ${className}`}
          placeholder={placeholder}
          value={value}
          onChange={handleInputChange}
          required={required}
          disabled={disabled}
          style={{
            paddingRight: '3.2rem',
            borderColor: isListening ? '#ef4444' : undefined,
            boxShadow: isListening ? '0 0 0 3px rgba(239, 68, 68, 0.2)' : undefined
          }}
        />

        {/* Mic & Action Controls */}
        <div 
          style={{ 
            position: 'absolute', 
            right: '0.4rem', 
            display: 'flex', 
            alignItems: 'center', 
            gap: '0.25rem' 
          }}
        >
          {/* Translating Indicator */}
          {isTranslating && (
            <Loader2 
              size={14} 
              className="spin-animation" 
              style={{ color: 'var(--primary-600)' }} 
              title="Auto-translating to counterpart language..."
            />
          )}

          {/* Microphone Button */}
          <button
            type="button"
            onClick={toggleListening}
            className={`voice-mic-btn ${isListening ? 'listening' : ''}`}
            title={
              isListening 
                ? 'Listening... Click to stop (பேசவும்... நிறுத்த கிளிக் செய்யவும்)' 
                : `Voice Dictation (பேசி எழுத கிளிக் செய்யவும்: ${speechLang === 'ta-IN' || speechLang === 'ta' ? 'தமிழ்' : 'English'})`
            }
            style={{
              background: isListening 
                ? 'linear-gradient(135deg, #ef4444, #dc2626)' 
                : 'var(--bg-subtle)',
              border: isListening 
                ? '1px solid #ef4444' 
                : '1px solid var(--border-color)',
              color: isListening ? '#ffffff' : 'var(--primary-700)',
              width: '30px',
              height: '30px',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              padding: 0,
              transition: 'all 0.2s ease',
              boxShadow: isListening ? '0 0 10px rgba(239, 68, 68, 0.6)' : 'none'
            }}
          >
            {isListening ? (
              <Mic size={15} className="pulse-mic-icon" />
            ) : (
              <Mic size={15} />
            )}
          </button>
        </div>
      </div>

      {/* Listening Status Popup Badge */}
      {isListening && (
        <div 
          style={{
            position: 'absolute',
            top: 'calc(100% + 4px)',
            left: 0,
            zIndex: 1000,
            background: '#1e293b',
            color: '#f8fafc',
            padding: '0.35rem 0.65rem',
            borderRadius: '6px',
            fontSize: '0.78rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.4rem',
            boxShadow: '0 4px 12px rgba(0,0,0,0.25)',
            animation: 'fadeIn 0.15s ease'
          }}
        >
          <span 
            style={{ 
              width: 8, 
              height: 8, 
              borderRadius: '50%', 
              background: '#ef4444', 
              animation: 'pulse 1s infinite' 
            }} 
          />
          <span>
            {type === 'tel' 
              ? (getResolvedLang() === 'ta-IN' ? 'மொபைல் எண்ணைப் பேசவும் (எ.கா: 9 8 4 3...)' : 'Speak mobile number (e.g. 9 8 4 3...)')
              : (getResolvedLang() === 'ta-IN' ? 'தமிழில் பேசவும்...' : 'Listening in English... Speak now!')}
          </span>
        </div>
      )}

      {/* Error Notice */}
      {speechError && (
        <div style={{ color: '#ef4444', fontSize: '0.72rem', marginTop: '0.2rem' }}>
          {speechError}
        </div>
      )}
    </div>
  );
}
