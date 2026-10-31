import React, { useState } from 'react';
import { 
  KeyRound, 
  LogIn, 
  Languages, 
  Eye, 
  EyeOff, 
  AlertCircle,
  Loader2,
  CheckCircle2,
  RotateCcw,
  X
} from 'lucide-react';
import Logo from './Logo';
import { translations } from '../translations/dictionary';
import { StorageService } from '../services/storage';
import { fetchDataFromGoogleSheet } from '../services/googleSheets';
import { getEffectiveGoogleSheetUrl } from '../config/env';
import VoiceInput from './common/VoiceInput';

export default function AuthScreen({ onLogin, lang, setLang }) {
  const t = translations[lang] || translations.en;
  const [username, setUsername] = useState('');
  const [pin, setPin] = useState('');
  const [showPin, setShowPin] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [loading, setLoading] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [showForgotModal, setShowForgotModal] = useState(false);
  const [forgotUser, setForgotUser] = useState('');

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

  const handleQuickForgotPassword = () => {
    setError('');
    setSuccessMsg('');
    const target = username.trim();
    if (!target) {
      setForgotUser('admin');
      setShowForgotModal(true);
      return;
    }

    const res = StorageService.resetPasswordToDefault(target);
    if (res.success && res.user) {
      setUsername(res.user.username);
      setPin('1234');
      setShowPin(true);
      setSuccessMsg(
        lang === 'ta'
          ? `✅ பயனர் '@${res.user.username}' கடவுச்சொல் '1234' என அமைக்கப்பட்டது! இப்போது 'உள்நுழையவும்' அழுத்தவும்.`
          : `✅ Password for @${res.user.username} reset to default '1234'! Click Sign In to continue.`
      );
    } else {
      setForgotUser(target);
      setShowForgotModal(true);
    }
  };

  const handleConfirmForgotModal = (selectedUser) => {
    setError('');
    setSuccessMsg('');
    const target = selectedUser || forgotUser || 'admin';
    const res = StorageService.resetPasswordToDefault(target);
    if (res.success && res.user) {
      setUsername(res.user.username);
      setPin('1234');
      setShowPin(true);
      setShowForgotModal(false);
      setSuccessMsg(
        lang === 'ta'
          ? `✅ பயனர் '@${res.user.username}' கடவுச்சொல் '1234' என மாற்றப்பட்டது! இப்போது 'உள்நுழையவும்' அழுத்தவும்.`
          : `✅ Password for @${res.user.username} reset to default '1234'! Click Sign In to continue.`
      );
    } else {
      setError(res.error || (lang === 'ta' ? 'பயனர் கணக்கு காணப்படவில்லை.' : 'User account not found.'));
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

        {/* Success Notice */}
        {successMsg && (
          <div style={{ 
            background: '#f0fdf4', 
            color: '#166534', 
            padding: '0.65rem 0.85rem', 
            borderRadius: 'var(--radius-sm)', 
            fontSize: '0.825rem', 
            marginBottom: '1rem', 
            border: '1px solid #86efac',
            display: 'flex',
            alignItems: 'center',
            gap: '0.45rem'
          }}>
            <CheckCircle2 size={16} color="#16a34a" style={{ flexShrink: 0 }} />
            <span>{successMsg}</span>
          </div>
        )}

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

          {/* Remember Me & Forgot Password (1234) */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '0.5rem' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', fontSize: '0.825rem', cursor: 'pointer', userSelect: 'none' }}>
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                style={{ accentColor: 'var(--primary-600)', width: '16px', height: '16px' }}
              />
              <span>{lang === 'ta' ? 'என்னை நினைவில் கொள்' : 'Keep me signed in'}</span>
            </label>

            <button
              type="button"
              onClick={handleQuickForgotPassword}
              style={{
                background: 'none',
                border: 'none',
                padding: '2px 0',
                color: 'var(--primary-700, #059669)',
                fontSize: '0.825rem',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.3rem',
                textDecoration: 'underline'
              }}
              title={lang === 'ta' ? 'கடவுச்சொல் மறந்துவிட்டதா? இயல்புநிலை 1234 ஆக மீட்டமைக்க கிளிக் செய்யவும்' : 'Forgot Password? Click to set to default 1234'}
            >
              <RotateCcw size={13} />
              <span>{lang === 'ta' ? 'கடவுச்சொல் மறந்துவிட்டதா? (1234)' : 'Forgot Password? (1234)'}</span>
            </button>
          </div>

          {/* Submit Button */}
          <button 
            type="submit" 
            className="btn btn-primary"
            disabled={loading}
            style={{ width: '100%', padding: '0.85rem', fontSize: '1rem', fontWeight: 700 }}
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

        {/* Footer info */}
        <div style={{ marginTop: '1.5rem', textAlign: 'center', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
          🔒 {lang === 'ta' ? 'டிராக்டோமின்ட் • பாதுகாப்பான உழவு & வாகன மேலாண்மை' : 'TractoMint • Secured Enterprise Fleet Ledger'}
        </div>
      </div>

      {/* Forgot Password Reset Modal */}
      {showForgotModal && (() => {
        const registeredUsers = StorageService.getUsers(true);
        return (
          <div className="modal-overlay" onClick={() => setShowForgotModal(false)}>
            <div 
              className="modal-content" 
              onClick={(e) => e.stopPropagation()} 
              style={{ maxWidth: '440px', width: '92%', borderRadius: '16px', overflow: 'hidden' }}
            >
              <div className="modal-header" style={{ background: 'linear-gradient(135deg, #065f46 0%, #047857 100%)', color: '#ffffff', padding: '1rem 1.25rem' }}>
                <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#ffffff' }}>
                  <RotateCcw size={18} color="#facc15" />
                  <span>{lang === 'ta' ? 'கடவுச்சொல் மீட்டமைப்பு (1234)' : 'Reset Password to 1234'}</span>
                </h3>
                <button
                  type="button"
                  className="modal-close"
                  onClick={() => setShowForgotModal(false)}
                  style={{ color: '#ffffff', background: 'rgba(255,255,255,0.15)', border: 'none', borderRadius: '50%', width: '28px', height: '28px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                >
                  <X size={18} />
                </button>
              </div>

              <div className="modal-body" style={{ padding: '1.25rem' }}>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-main)', marginTop: 0, marginBottom: '1rem', lineHeight: '1.45' }}>
                  {lang === 'ta'
                    ? 'உங்கள் பயனர் பெயரைத் தேர்ந்தெடுக்கவும். அந்தப் பயனரின் கடவுச்சொல் உடனடியாக "1234" என மீட்டமைக்கப்பட்டு, தணிக்கை வரலாறு கூகுள் ஷீட்டில் தானாகப் பதியப்படும்.'
                    : 'Select your account. The password will be immediately reset to default "1234" and logged to Google Sheets.'}
                </p>

                <div className="form-group" style={{ marginBottom: '1.25rem' }}>
                  <label style={{ fontSize: '0.85rem', fontWeight: 700, display: 'block', marginBottom: '0.35rem' }}>
                    {lang === 'ta' ? 'பதிவு செய்யப்பட்ட பயனர்:' : 'Registered Account:'}
                  </label>
                  <select 
                    className="form-control"
                    value={forgotUser}
                    onChange={(e) => setForgotUser(e.target.value)}
                    style={{ fontWeight: 700 }}
                  >
                    {registeredUsers.map(u => (
                      <option key={u.id} value={u.username}>
                        @{u.username} - {lang === 'ta' && u.displayName_ta ? u.displayName_ta : u.displayName} ({u.role.toUpperCase()})
                      </option>
                    ))}
                  </select>
                </div>

                <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end', marginTop: '1.25rem' }}>
                  <button 
                    type="button" 
                    className="btn btn-outline" 
                    onClick={() => setShowForgotModal(false)}
                  >
                    {t.cancel}
                  </button>
                  <button 
                    type="button" 
                    className="btn btn-primary"
                    onClick={() => handleConfirmForgotModal(forgotUser)}
                    style={{ background: '#059669', borderColor: '#059669', fontWeight: 800, display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}
                  >
                    <CheckCircle2 size={16} />
                    <span>{lang === 'ta' ? '1234 என மீட்டமை' : 'Reset to 1234'}</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
