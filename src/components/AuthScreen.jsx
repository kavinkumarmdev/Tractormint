import React, { useState, useEffect } from 'react';
import { 
  ShieldCheck, 
  ShieldAlert, 
  Lock, 
  User, 
  LogIn, 
  Languages, 
  KeyRound, 
  CheckCircle2, 
  ArrowRight,
  Tractor,
  Shield,
  Eye,
  EyeOff,
  AlertCircle
} from 'lucide-react';
import Logo from './Logo';
import { translations } from '../translations/dictionary';
import { StorageService } from '../services/storage';
import VoiceInput from './common/VoiceInput';
import BilingualVoiceGroup from './common/BilingualVoiceGroup';

export default function AuthScreen({ onLogin, lang, setLang, adminPin = "1234" }) {
  const t = translations[lang];
  const [username, setUsername] = useState('admin');
  const [pin, setPin] = useState('');
  const [showPin, setShowPin] = useState(false);
  const [error, setError] = useState('');
  const [rememberMe, setRememberMe] = useState(true);
  const [registeredUsers, setRegisteredUsers] = useState([]);

  // Direct Registration State from Login Screen
  const [showRegisterModal, setShowRegisterModal] = useState(false);
  const [regForm, setRegForm] = useState({
    username: '',
    displayName: '',
    displayName_ta: '',
    pin: '',
    role: 'operator',
    adminApprovalPin: ''
  });
  const [regError, setRegError] = useState('');
  const [regSuccess, setRegSuccess] = useState('');

  useEffect(() => {
    try {
      const list = StorageService.getUsers();
      setRegisteredUsers(list);
    } catch (e) {
      console.warn("Error loading users for login screen:", e);
    }
  }, []);

  const handleRegisterSubmit = (e) => {
    e.preventDefault();
    setRegError('');
    setRegSuccess('');

    if (!regForm.username.trim()) {
      setRegError(lang === 'ta' ? 'பயனர் பெயர் அவசியம்!' : 'Username is required!');
      return;
    }
    if (!regForm.pin.trim() || regForm.pin.length < 4) {
      setRegError(lang === 'ta' ? 'குறைந்தது 4 இலக்க PIN அவசியம்!' : 'PIN must be at least 4 digits!');
      return;
    }
    // Verify Admin approval PIN (1234 or configured adminPin)
    if (regForm.adminApprovalPin !== adminPin && regForm.adminApprovalPin !== '1234') {
      setRegError(lang === 'ta' ? 'தவறான அட்மின் அனுமதி PIN! (Master PIN: 1234)' : 'Incorrect Admin Approval PIN! (Master PIN: 1234)');
      return;
    }

    const cleanUsername = regForm.username.toLowerCase().trim().replace(/[^a-z0-9_]/g, '');
    const usersList = StorageService.getUsers();
    if (usersList.some(u => u.username.toLowerCase() === cleanUsername)) {
      setRegError(lang === 'ta' ? 'இந்த பயனர் பெயர் ஏற்கனவே உள்ளது!' : 'Username already exists! Choose another.');
      return;
    }

    const newUser = {
      username: cleanUsername,
      displayName: regForm.displayName.trim() || cleanUsername,
      displayName_ta: regForm.displayName_ta.trim() || regForm.displayName.trim(),
      pin: regForm.pin.trim(),
      role: regForm.role,
      status: 'active'
    };

    const res = StorageService.saveUser(newUser, 'admin');
    if (res.success) {
      const updated = StorageService.getUsers();
      setRegisteredUsers(updated);
      setUsername(cleanUsername);
      setPin(regForm.pin.trim());
      setRegSuccess(lang === 'ta' ? 'பயனர் வெற்றிகரமாக உருவாக்கப்பட்டது! இப்போது உள்நுழையலாம்.' : 'Account created successfully! You can now log in.');
      setTimeout(() => {
        setShowRegisterModal(false);
        setRegSuccess('');
      }, 1500);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');

    if (!username.trim()) {
      setError(lang === 'ta' ? 'பயனர் பெயரை உள்ளிடவும்.' : 'Please enter your username.');
      return;
    }

    if (!pin.trim()) {
      setError(lang === 'ta' ? 'கடவுச்சொல் / PIN ஐ உள்ளிடவும்.' : 'Please enter your login PIN.');
      return;
    }

    // Authenticate strictly against Admin-created accounts
    const authResult = StorageService.authenticateUser(username, pin);

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
      setError(authResult.error || (lang === 'ta' ? 'உள்நுழைவு தோல்வியடைந்தது. அட்மின் அனுமதி தேவை.' : 'Login failed. Access restricted to Admin-created users.'));
    }
  };

  // Quick 1-click Fast Login as Master Admin
  const handleQuickMasterAdmin = () => {
    setUsername('admin');
    setPin('1234');
    setError('');
    const authResult = StorageService.authenticateUser('admin', '1234');
    if (authResult.success) {
      onLogin({
        role: 'admin',
        username: 'admin',
        displayName: lang === 'ta' ? 'முதன்மை நிர்வாகி (Admin)' : 'Master Administrator',
        loginTime: new Date().toISOString()
      }, true);
    }
  };

  const handleSelectQuickUser = (user) => {
    setUsername(user.username);
    setPin(user.pin || '');
    setError('');
  };

  return (
    <div className="login-page-container">
      {/* Background Ambient Glows */}
      <div className="login-bg-glow glow-1"></div>
      <div className="login-bg-glow glow-2"></div>

      {/* Top Bar with Language Toggle */}
      <div className="login-top-bar">
        <button 
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
        <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '0.85rem' }}>
            <Logo size="lg" lang={lang} />
          </div>
          <h2 style={{ fontSize: '1.45rem', fontWeight: 800, color: 'var(--text-main)', letterSpacing: '-0.02em' }}>
            {lang === 'ta' ? 'உள்நுழையவும்' : 'Sign in to TractoMint'}
          </h2>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
            {lang === 'ta' 
              ? 'டிராக்டர் மற்றும் விவசாய இயந்திரங்கள் லெட்ஜர் போர்ட்டல்' 
              : 'Enterprise Agricultural Fleet Ledger & Operations System'}
          </p>
        </div>

        {/* Admin Controlled Access Notice Banner */}
        <div style={{
          background: 'linear-gradient(135deg, rgba(6, 78, 59, 0.08), rgba(15, 118, 110, 0.08))',
          border: '1px solid rgba(6, 78, 59, 0.2)',
          borderRadius: 'var(--radius-sm)',
          padding: '0.75rem 0.9rem',
          marginBottom: '1.25rem',
          display: 'flex',
          alignItems: 'center',
          gap: '0.65rem'
        }}>
          <ShieldCheck size={20} color="var(--primary-700)" style={{ flexShrink: 0 }} />
          <div style={{ fontSize: '0.78rem', color: 'var(--primary-900)', lineHeight: '1.4' }}>
            <strong>{lang === 'ta' ? 'அட்மின் அனுமதி பெற்ற உள்நுழைவு:' : 'Admin-Controlled Access:'}</strong>{' '}
            {lang === 'ta' 
              ? 'நிர்வாகியால் உருவாக்கப்பட்ட பயனர்கள் மட்டுமே இந்த தளத்தில் உள்நுழைய முடியும்.' 
              : 'Only user accounts created by the Administrator can log in to this application.'}
          </div>
        </div>

        {/* Login Form */}
        <form onSubmit={handleSubmit}>
          {/* Username with Voice Input */}
          <div className="form-group" style={{ marginBottom: '1rem' }}>
            <VoiceInput
              label={lang === 'ta' ? 'பயனர் பெயர் (Username)' : 'Username'}
              value={username}
              onChange={(val) => setUsername(val.toLowerCase().trim())}
              placeholder="e.g. admin or staff_username"
              speechLang="en-IN"
              showMagicTranslate={false}
              required
            />
          </div>

          {/* Password / PIN */}
          <div className="form-group" style={{ marginBottom: '1rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                <KeyRound size={14} />
                {lang === 'ta' ? 'கடவுச்சொல் / PIN' : 'Login PIN / Password'}
              </label>
              <button 
                type="button" 
                onClick={() => setShowPin(!showPin)} 
                style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.75rem', color: 'var(--primary-700)', display: 'flex', alignItems: 'center', gap: '0.2rem' }}
              >
                {showPin ? <EyeOff size={13} /> : <Eye size={13} />}
                <span>{showPin ? 'Hide' : 'Show'}</span>
              </button>
            </div>
            <input
              type={showPin ? "text" : "password"}
              className="form-control"
              value={pin}
              onChange={(e) => setPin(e.target.value)}
              placeholder="Enter your assigned PIN"
              maxLength={12}
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
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', fontSize: '0.825rem', cursor: 'pointer', userSelect: 'none' }}>
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                style={{ accentColor: 'var(--primary-600)', width: '16px', height: '16px' }}
              />
              <span>{lang === 'ta' ? 'என்னை நினைவில் கொள்' : 'Keep me signed in'}</span>
            </label>
            <span style={{ fontSize: '0.72rem', color: 'var(--text-light)' }}>
              Master Admin PIN: <strong>1234</strong>
            </span>
          </div>

          {/* Submit Button */}
          <button 
            type="submit" 
            className="btn btn-primary"
            style={{ width: '100%', padding: '0.75rem', fontSize: '0.95rem', fontWeight: 700 }}
          >
            <LogIn size={18} />
            <span>{lang === 'ta' ? 'உள்நுழையவும்' : 'Sign In'}</span>
          </button>

          {/* Direct Add / Register User Button on Login Screen */}
          <div style={{ marginTop: '0.75rem', textAlign: 'center' }}>
            <button
              type="button"
              className="btn btn-outline btn-sm"
              onClick={() => {
                setRegError('');
                setRegSuccess('');
                setShowRegisterModal(true);
              }}
              style={{ width: '100%', fontSize: '0.8rem', padding: '0.45rem', borderStyle: 'dashed' }}
            >
              <span>{lang === 'ta' ? '+ புதிய பயனர் கணக்கு உருவாக்கவும் (Add User)' : '+ Register / Add New User Account'}</span>
            </button>
          </div>
        </form>

        {/* Active Accounts Created by Admin */}
        {registeredUsers.length > 0 && (
          <div style={{ marginTop: '1.25rem', paddingTop: '1rem', borderTop: '1px solid var(--border-color)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-light)', fontWeight: 600, textTransform: 'uppercase' }}>
                {lang === 'ta' ? 'பதிவு செய்யப்பட்ட பயனர்கள்' : 'Admin Registered Accounts'}
              </span>
              <span style={{ fontSize: '0.72rem', color: 'var(--primary-700)' }}>
                {registeredUsers.length} total
              </span>
            </div>
            <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
              {registeredUsers.map((u) => (
                <button
                  key={u.id}
                  type="button"
                  onClick={() => handleSelectQuickUser(u)}
                  className="btn btn-outline btn-sm"
                  style={{
                    fontSize: '0.75rem',
                    padding: '0.2rem 0.55rem',
                    background: username === u.username ? 'var(--primary-50)' : 'transparent',
                    borderColor: username === u.username ? 'var(--primary-500)' : 'var(--border-color)',
                    fontWeight: username === u.username ? 700 : 500
                  }}
                  title={`Role: ${u.role}`}
                >
                  <span>@{u.username}</span>
                  <span style={{ fontSize: '0.68rem', color: u.role === 'admin' ? '#059669' : '#d97706', marginLeft: '3px' }}>
                    ({u.role})
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* 1-Click Fast Master Admin Button */}
        <div style={{ marginTop: '1rem', textAlign: 'center' }}>
          <button
            type="button"
            className="btn btn-outline btn-sm"
            onClick={handleQuickMasterAdmin}
            style={{ width: '100%', fontSize: '0.8rem', padding: '0.45rem' }}
          >
            <ShieldCheck size={14} color="#059669" />
            <span>{lang === 'ta' ? 'முதன்மை அட்மினாக விரைவு உள்நுழைவு (PIN: 1234)' : '1-Click Fast Master Admin Login (PIN: 1234)'}</span>
          </button>
        </div>

        {/* Footer info */}
        <div style={{ marginTop: '1.25rem', textAlign: 'center', fontSize: '0.72rem', color: 'var(--text-muted)' }}>
          🔒 Strictly Admin Managed Access • Powered by TractoMint
        </div>
      </div>

      {/* Registration Modal directly accessible on Login Page */}
      {showRegisterModal && (
        <div className="modal-overlay" onClick={() => setShowRegisterModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '520px' }}>
            <div className="modal-header">
              <h3>{lang === 'ta' ? '+ புதிய பயனர் பதிவு' : '+ Register New User Account'}</h3>
            </div>
            <form onSubmit={handleRegisterSubmit}>
              <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {regError && (
                  <div style={{
                    background: '#fee2e2',
                    color: '#991b1b',
                    padding: '0.65rem 0.85rem',
                    borderRadius: 'var(--radius-sm)',
                    fontSize: '0.8rem',
                    border: '1px solid #fca5a5'
                  }}>
                    {regError}
                  </div>
                )}
                {regSuccess && (
                  <div style={{
                    background: '#d1fae5',
                    color: '#065f46',
                    padding: '0.65rem 0.85rem',
                    borderRadius: 'var(--radius-sm)',
                    fontSize: '0.8rem',
                    border: '1px solid #a7f3d0'
                  }}>
                    {regSuccess}
                  </div>
                )}

                {/* Full Name English & Tamil with Voice Mic & Auto-Fill */}
                <BilingualVoiceGroup
                  englishLabel="Full Name (English)"
                  tamilLabel="முழு பெயர் (தமிழ்)"
                  englishValue={regForm.displayName}
                  tamilValue={regForm.displayName_ta}
                  onEnglishChange={(val) => setRegForm(prev => ({ ...prev, displayName: val }))}
                  onTamilChange={(val) => setRegForm(prev => ({ ...prev, displayName_ta: val }))}
                  englishPlaceholder="e.g. Kavin Kumar"
                  tamilPlaceholder="எ.கா. கவின் குமார்"
                  required
                />

                {/* Username */}
                <div className="form-group">
                  <VoiceInput
                    label="Username (unique / பயனர் பெயர்)"
                    placeholder="e.g. kavin or operator1"
                    value={regForm.username}
                    onChange={(val) => setRegForm(prev => ({ ...prev, username: val.toLowerCase().replace(/[^a-z0-9_]/g, '') }))}
                    speechLang="en-IN"
                    showMagicTranslate={false}
                    required
                  />
                  <span style={{ fontSize: '0.72rem', color: 'var(--text-light)', marginTop: '0.2rem', display: 'block' }}>
                    Lowercase letters, numbers, and underscore only
                  </span>
                </div>

                {/* Login PIN & Role */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.85rem' }}>
                  <div className="form-group">
                    <label>Login PIN (கடவுச்சொல்) *</label>
                    <input
                      type="password"
                      className="form-control"
                      placeholder="e.g. 4567"
                      value={regForm.pin}
                      onChange={(e) => setRegForm(prev => ({ ...prev, pin: e.target.value }))}
                      maxLength={8}
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label>Role (பங்கு) *</label>
                    <select
                      className="form-control"
                      value={regForm.role}
                      onChange={(e) => setRegForm(prev => ({ ...prev, role: e.target.value }))}
                    >
                      <option value="operator">{lang === 'ta' ? 'ஆபரேட்டர் (Operator)' : 'Field Operator'}</option>
                      <option value="driver">{lang === 'ta' ? 'டிரைவர் (Driver)' : 'Tractor Driver'}</option>
                      <option value="admin">{lang === 'ta' ? 'நிர்வாகி (Admin)' : 'Administrator'}</option>
                    </select>
                  </div>
                </div>

                {/* Admin Approval Security PIN */}
                <div className="form-group" style={{ background: 'var(--bg-subtle)', padding: '0.75rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)' }}>
                  <label style={{ color: 'var(--primary-700)', fontWeight: 700 }}>
                    Master Admin Approval PIN * (Default: 1234)
                  </label>
                  <input
                    type="password"
                    className="form-control"
                    placeholder="Enter Master PIN 1234 to authorize"
                    value={regForm.adminApprovalPin}
                    onChange={(e) => setRegForm(prev => ({ ...prev, adminApprovalPin: e.target.value }))}
                    required
                  />
                  <span style={{ fontSize: '0.7rem', color: 'var(--text-light)', marginTop: '0.2rem', display: 'block' }}>
                    Required to protect system against unauthorized account creations.
                  </span>
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" className="btn btn-outline" onClick={() => setShowRegisterModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Create User Account
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
