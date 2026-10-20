import React, { useState } from 'react';
import { 
  KeyRound, 
  LogIn, 
  Languages, 
  Eye, 
  EyeOff, 
  AlertCircle,
  Loader2
} from 'lucide-react';
import Logo from './Logo';
import { translations } from '../translations/dictionary';
import { StorageService } from '../services/storage';
import { fetchDataFromGoogleSheet } from '../services/googleSheets';
import { getEffectiveGoogleSheetUrl } from '../config/env';
import VoiceInput from './common/VoiceInput';

export default function AuthScreen({ onLogin, lang, setLang }) {
  const t = translations[lang];
  const [username, setUsername] = useState('');
  const [pin, setPin] = useState('');
  const [showPin, setShowPin] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    const cleanUser = username.trim().toLowerCase();
    const cleanPin = pin.trim();

    if (!cleanUser) {
      setError(lang === 'ta' ? 'பயனர் பெயரை உள்ளிடவும்.' : 'Please enter your username.');
      return;
    }

    if (!cleanPin) {
      setError(lang === 'ta' ? 'கடவுச்சொல் / PIN ஐ உள்ளிடவும்.' : 'Please enter your login PIN.');
      return;
    }

    setLoading(true);

    try {
      // 1. Try local authentication first
      let authResult = StorageService.authenticateUser(cleanUser, cleanPin);

      // 2. If not found locally, fetch latest users from Google Sheets Cloud Database
      if (!authResult.success) {
        const settings = StorageService.getSettings();
        const effectiveUrl = getEffectiveGoogleSheetUrl(settings.webAppUrl);
        if (effectiveUrl) {
          try {
            const pullResult = await fetchDataFromGoogleSheet(effectiveUrl);
            if (pullResult.success && pullResult.data) {
              StorageService.importFullDataset(pullResult.data);
              authResult = StorageService.authenticateUser(cleanUser, cleanPin);
            }
          } catch (syncErr) {
            console.warn("Background sheet fetch during login failed:", syncErr);
          }
        }
      }

      if (authResult.success && authResult.user) {
        const u = authResult.user;
        onLogin({
          role: u.role || 'operator',
          username: u.username,
          displayName: lang === 'ta' ? (u.displayName_ta || u.displayName) : u.displayName,
          phone: u.phone || '',
          loginTime: new Date().toISOString()
        }, rememberMe);
      } else {
        setError(
          authResult.error || 
          (lang === 'ta' 
            ? 'பயனர் பெயர் அல்லது PIN தவறானது. தயவுசெய்து சரிபார்க்கவும்.' 
            : 'Invalid username or PIN. Please check your credentials.')
        );
      }
    } catch (err) {
      setError(lang === 'ta' ? 'உள்நுழைவு பிழை ஏற்பட்டது. மீண்டும் முயற்சிக்கவும்.' : 'Authentication error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page-container">
      {/* Background Ambient Glows */}
      <div className="login-bg-glow glow-1"></div>
      <div className="login-bg-glow glow-2"></div>

      {/* Top Bar with Language Toggle */}
      <div className="login-top-bar">
        <button 
          type="button"
          className="btn btn-outline btn-sm"
          onClick={() => setLang(lang === 'en' ? 'ta' : 'en')}
          style={{ background: 'var(--bg-card)', fontWeight: 700 }}
        >
          <Languages size={15} />
          <span>{lang === 'en' ? 'தமிழ்' : 'English'}</span>
        </button>
      </div>

      {/* Main Login Card */}
      <div className="login-card">
        {/* Brand Header */}
        <div style={{ textAlign: 'center', marginBottom: '1.75rem' }}>
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '0.85rem' }}>
            <Logo size="lg" lang={lang} />
          </div>
          <h2 style={{ fontSize: '1.45rem', fontWeight: 800, color: 'var(--text-main)', letterSpacing: '-0.02em', margin: '0 0 0.35rem 0' }}>
            {lang === 'ta' ? 'உள்நுழையவும்' : 'Sign in to TractoMint'}
          </h2>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', margin: 0 }}>
            {lang === 'ta' 
              ? 'டிராக்டர் மற்றும் விவசாய இயந்திரங்கள் லெட்ஜர் போர்ட்டல்' 
              : 'Enterprise Agricultural Fleet Ledger & Operations System'}
          </p>
        </div>

        {/* Login Form */}
        <form onSubmit={handleSubmit}>
          {/* Username with Voice Input */}
          <div className="form-group" style={{ marginBottom: '1.15rem' }}>
            <VoiceInput
              label={lang === 'ta' ? 'பயனர் பெயர் / அலைபேசி எண்' : 'Username or Mobile Number'}
              value={username}
              onChange={(val) => setUsername(val.toLowerCase().trim())}
              placeholder={lang === 'ta' ? 'பயனர் பெயர் அல்லது போன் எண் (எ.கா. admin)' : 'Enter username or phone (e.g. admin)'}
              speechLang="en-IN"
              showMagicTranslate={false}
              required
            />
          </div>

          {/* Password / PIN */}
          <div className="form-group" style={{ marginBottom: '1.15rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', margin: 0, fontWeight: 600, fontSize: '0.85rem' }}>
                <KeyRound size={14} />
                {lang === 'ta' ? 'கடவுச்சொல் / PIN' : 'Login PIN / Password'}
              </label>
              <button 
                type="button" 
                onClick={() => setShowPin(!showPin)} 
                style={{ 
                  background: 'none', 
                  border: 'none', 
                  cursor: 'pointer', 
                  fontSize: '0.75rem', 
                  color: 'var(--primary-700)', 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '0.25rem',
                  padding: '2px 4px'
                }}
              >
                {showPin ? <EyeOff size={13} /> : <Eye size={13} />}
                <span>{showPin ? (lang === 'ta' ? 'மறை' : 'Hide') : (lang === 'ta' ? 'காட்டு' : 'Show')}</span>
              </button>
            </div>
            <input
              type={showPin ? "text" : "password"}
              className="form-control"
              value={pin}
              onChange={(e) => setPin(e.target.value)}
              placeholder={lang === 'ta' ? 'உங்கள் PIN ஐ உள்ளிடவும்' : 'Enter your PIN or password'}
              maxLength={16}
              required
            />
          </div>

          {/* Error Notice */}
          {error && (
            <div style={{ 
              background: '#fee2e2', 
              color: '#991b1b', 
              padding: '0.65rem 0.85rem', 
              borderRadius: 'var(--radius-sm)', 
              fontSize: '0.8rem', 
              marginBottom: '1rem', 
              border: '1px solid #fca5a5',
              display: 'flex',
              alignItems: 'center',
              gap: '0.45rem'
            }}>
              <AlertCircle size={15} style={{ flexShrink: 0 }} />
              <span>{error}</span>
            </div>
          )}

          {/* Remember Me */}
          <div style={{ display: 'flex', alignItems: 'center', marginBottom: '1.25rem' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', fontSize: '0.825rem', cursor: 'pointer', userSelect: 'none' }}>
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                style={{ accentColor: 'var(--primary-600)', width: '16px', height: '16px' }}
              />
              <span>{lang === 'ta' ? 'என்னை நினைவில் கொள்' : 'Keep me signed in'}</span>
            </label>
          </div>

          {/* Submit Button */}
          <button 
            type="submit" 
            className="btn btn-primary"
            disabled={loading}
            style={{ width: '100%', padding: '0.75rem', fontSize: '0.95rem', fontWeight: 700 }}
          >
            {loading ? (
              <>
                <Loader2 size={18} className="spin" />
                <span>{lang === 'ta' ? 'சரிபார்க்கிறது...' : 'Signing In...'}</span>
              </>
            ) : (
              <>
                <LogIn size={18} />
                <span>{lang === 'ta' ? 'உள்நுழையவும்' : 'Sign In'}</span>
              </>
            )}
          </button>
        </form>

        {/* 4 Roles Quick Fill Helper */}
        <div style={{ marginTop: '1.25rem', paddingTop: '1rem', borderTop: '1px dashed var(--border-color)' }}>
          <p style={{ 
            fontSize: '0.75rem', 
            fontWeight: 700, 
            color: 'var(--text-muted)', 
            marginBottom: '0.5rem', 
            textAlign: 'center',
            textTransform: 'uppercase',
            letterSpacing: '0.04em'
          }}>
            {lang === 'ta' ? '4 பயனர் நிலைகள் (சோதனை செய்ய தேர்வு செய்யவும்):' : '4 System Roles (Click to test staff login):'}
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.4rem' }}>
            <button
              type="button"
              className="btn btn-outline btn-sm"
              style={{ fontSize: '0.74rem', padding: '0.4rem 0.5rem', justifyContent: 'center' }}
              onClick={() => { setUsername('admin'); setPin('1234'); setError(''); }}
            >
              👑 {lang === 'ta' ? 'நிர்வாகி (Admin)' : 'Admin'}
            </button>
            <button
              type="button"
              className="btn btn-outline btn-sm"
              style={{ fontSize: '0.74rem', padding: '0.4rem 0.5rem', justifyContent: 'center' }}
              onClick={() => { setUsername('manager'); setPin('1234'); setError(''); }}
            >
              👔 {lang === 'ta' ? 'மேலாளர் (Manager)' : 'Manager'}
            </button>
            <button
              type="button"
              className="btn btn-outline btn-sm"
              style={{ fontSize: '0.74rem', padding: '0.4rem 0.5rem', justifyContent: 'center' }}
              onClick={() => { setUsername('operator'); setPin('1234'); setError(''); }}
            >
              ⚡ {lang === 'ta' ? 'ஆபரேட்டர் (Operator)' : 'Operator'}
            </button>
            <button
              type="button"
              className="btn btn-outline btn-sm"
              style={{ fontSize: '0.74rem', padding: '0.4rem 0.5rem', justifyContent: 'center' }}
              onClick={() => { setUsername('driver'); setPin('1234'); setError(''); }}
            >
              🚜 {lang === 'ta' ? 'டிரைவர் (Driver)' : 'Driver'}
            </button>
          </div>
          <p style={{ fontSize: '0.7rem', color: 'var(--text-light)', textAlign: 'center', marginTop: '0.4rem', margin: '0.4rem 0 0 0' }}>
            {lang === 'ta' ? 'இயல்பு கடவுச்சொல் / PIN: 1234' : 'Default PIN for roles: 1234'}
          </p>
        </div>

        {/* Footer info */}
        <div style={{ marginTop: '1.25rem', textAlign: 'center', fontSize: '0.72rem', color: 'var(--text-muted)' }}>
          🔒 TractoMint • Secured Enterprise Fleet Ledger
        </div>
      </div>
    </div>
  );
}
