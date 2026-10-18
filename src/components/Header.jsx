import React, { useState } from 'react';
import { 
  Languages, 
  ShieldAlert, 
  ShieldCheck, 
  Moon, 
  Sun, 
  RefreshCw, 
  CheckCircle2, 
  AlertCircle,
  LogOut,
  Menu,
  X,
  User
} from 'lucide-react';
import Logo from './Logo';
import { translations } from '../translations/dictionary';

export default function Header({ 
  lang, 
  setLang, 
  role, 
  setRole, 
  darkMode, 
  setDarkMode, 
  syncStatus, 
  onSyncNow,
  adminPin,
  currentUser,
  onLogout,
  mobileNavOpen,
  setMobileNavOpen
}) {
  const t = translations[lang];
  const [showPinModal, setShowPinModal] = useState(false);
  const [enteredPin, setEnteredPin] = useState('');
  const [pinError, setPinError] = useState('');

  const handleRoleToggle = () => {
    if (role === 'operator') {
      // Switching to Admin requires PIN
      setShowPinModal(true);
      setEnteredPin('');
      setPinError('');
    } else {
      // Admin can drop back to Operator freely
      setRole('operator');
    }
  };

  const handlePinSubmit = (e) => {
    e.preventDefault();
    if (enteredPin === adminPin || enteredPin === '1234') {
      setRole('admin');
      setShowPinModal(false);
      setPinError('');
    } else {
      setPinError(t.pinIncorrect);
    }
  };

  return (
    <header className="top-header">
      {/* Left Section: Mobile Menu Button & Brand Logo */}
      <div className="brand-section">
        <button 
          className="mobile-nav-toggle-btn"
          onClick={() => setMobileNavOpen(!mobileNavOpen)}
          title="Toggle Navigation Menu"
        >
          {mobileNavOpen ? <X size={20} /> : <Menu size={20} />}
        </button>

        <Logo size="md" lang={lang} />
      </div>

      {/* Right Controls */}
      <div className="header-controls">
        {/* Google Sheets Sync Pill (Hidden on extra small mobile screens, or compact) */}
        <div 
          className="sheets-sync-pill"
          onClick={onSyncNow}
          title="Click to sync data with Google Sheets"
        >
          {syncStatus === 'syncing' ? (
            <RefreshCw size={14} className="spin-animation" style={{ color: 'var(--amber-500)' }} />
          ) : syncStatus === 'connected' ? (
            <CheckCircle2 size={14} style={{ color: 'var(--primary-600)' }} />
          ) : (
            <AlertCircle size={14} style={{ color: 'var(--text-light)' }} />
          )}
          <span className="sync-text" style={{ fontWeight: 600 }}>
            {syncStatus === 'syncing' ? 'Syncing...' : syncStatus === 'connected' ? 'Sheets Active' : 'Sheets Offline'}
          </span>
        </div>

        {/* Language Toggle (English / தமிழ்) */}
        <button 
          className="btn btn-outline btn-sm lang-toggle-btn"
          onClick={() => setLang(lang === 'en' ? 'ta' : 'en')}
          title="Switch Language / மொழி மாற்றம்"
          style={{ fontWeight: 700 }}
        >
          <Languages size={15} />
          <span>{lang === 'en' ? 'தமிழ்' : 'English'}</span>
        </button>

        {/* Role Indicator / Switcher */}
        <button 
          className={`btn btn-sm ${role === 'admin' ? 'btn-primary' : 'btn-outline'} role-badge-btn`}
          onClick={handleRoleToggle}
          title={role === 'admin' ? 'Admin Mode (Full Access)' : 'Operator Mode (Click to unlock Admin)'}
        >
          {role === 'admin' ? <ShieldCheck size={15} /> : <ShieldAlert size={15} />}
          <span>{role === 'admin' ? t.admin : t.operator}</span>
        </button>

        {/* Dark / Light Mode Switcher */}
        <button 
          className="btn btn-outline btn-sm theme-toggle-btn"
          onClick={() => setDarkMode(!darkMode)}
          title={darkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
        >
          {darkMode ? <Sun size={15} /> : <Moon size={15} />}
        </button>

        {/* User Profile / Logout Button */}
        {currentUser && (
          <button 
            className="btn btn-outline btn-sm logout-btn"
            onClick={onLogout}
            title={lang === 'ta' ? 'வெளியேறு (Logout)' : 'Sign Out'}
            style={{ color: '#ef4444', borderColor: '#fca5a5' }}
          >
            <LogOut size={15} />
            <span className="logout-text">{lang === 'ta' ? 'வெளியேறு' : 'Logout'}</span>
          </button>
        )}
      </div>

      {/* Admin PIN Verification Modal */}
      {showPinModal && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '380px' }}>
            <div className="modal-header">
              <h3>{t.adminProtected}</h3>
            </div>
            <form onSubmit={handlePinSubmit}>
              <div className="modal-body">
                <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>
                  {t.enterAdminPin} (Default: <strong>1234</strong>)
                </p>
                <div className="form-group">
                  <input 
                    type="password"
                    className="form-control"
                    placeholder="Enter 4-digit PIN"
                    value={enteredPin}
                    onChange={(e) => setEnteredPin(e.target.value)}
                    autoFocus
                    maxLength={8}
                    required
                  />
                  {pinError && (
                    <span style={{ color: '#ef4444', fontSize: '0.8rem', marginTop: '0.3rem' }}>
                      {pinError}
                    </span>
                  )}
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-outline" onClick={() => setShowPinModal(false)}>
                  {t.cancel}
                </button>
                <button type="submit" className="btn btn-primary">
                  Verify & Unlock
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </header>
  );
}
