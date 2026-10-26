import React, { useState } from 'react';
import { 
  Languages, 
  ShieldAlert, 
  ShieldCheck, 
  Shield,
  UserCheck,
  Tractor,
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

  const getRoleBadgeInfo = () => {
    switch (role) {
      case 'admin':
        return { 
          label: lang === 'ta' ? 'நிர்வாகி' : 'Admin', 
          icon: <ShieldCheck size={15} />, 
          className: 'btn-primary',
          title: lang === 'ta' ? 'முதன்மை நிர்வாகி (முழு அணுகல்)' : 'Master Administrator (Full Access)'
        };
      case 'manager':
        return { 
          label: lang === 'ta' ? 'மேலாளர்' : 'Manager', 
          icon: <Shield size={15} />, 
          className: 'btn-outline',
          title: lang === 'ta' ? 'கள மேலாளர் / மேற்பார்வையாளர்' : 'Operations Manager / Supervisor'
        };
      case 'operator':
        return { 
          label: lang === 'ta' ? 'ஆபரேட்டர்' : 'Operator', 
          icon: <UserCheck size={15} />, 
          className: 'btn-outline',
          title: lang === 'ta' ? 'கள ஆபரேட்டர்' : 'Field Operator'
        };
      case 'driver':
        return { 
          label: lang === 'ta' ? 'டிரைவர்' : 'Driver', 
          icon: <Tractor size={15} />, 
          className: 'btn-outline',
          title: lang === 'ta' ? 'டிராக்டர் டிரைவர்' : 'Tractor Driver'
        };
      default:
        return { 
          label: role, 
          icon: <ShieldAlert size={15} />, 
          className: 'btn-outline',
          title: role
        };
    }
  };

  const handleRoleToggle = () => {
    if (role === 'admin') {
      // Admin can drop back to Operator freely to preview field view
      setRole('operator');
    } else {
      // Non-admin roles (operator, driver, manager) require Admin PIN to elevate
      setShowPinModal(true);
      setEnteredPin('');
      setPinError('');
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
        {/* Google Sheets Save & Sync Button - ONLY visible to Admin / Developer */}
        {role === 'admin' && (
          <button 
            type="button"
            className="btn btn-sm"
            onClick={onSyncNow}
            disabled={syncStatus === 'syncing'}
            title={lang === 'ta' ? 'உள்ளூர் பதிவுகள் & தற்காலிக நீக்கங்களை கூகுள் ஷீட்டில் நிரந்தரமாகச் சேமி' : 'Commit & Save all records and temporary deletes to Google Sheet'}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.45rem',
              background: syncStatus === 'syncing' ? '#f59e0b' : '#059669',
              color: '#ffffff',
              border: 'none',
              borderRadius: '8px',
              padding: '0.4rem 0.8rem',
              fontWeight: 800,
              fontSize: '0.8rem',
              cursor: syncStatus === 'syncing' ? 'not-allowed' : 'pointer',
              boxShadow: '0 2px 8px rgba(5, 150, 105, 0.3)',
              transition: 'all 0.15s ease'
            }}
          >
            {syncStatus === 'syncing' ? (
              <RefreshCw size={14} className="spin-animation" />
            ) : (
              <CheckCircle2 size={14} />
            )}
            <span>
              {syncStatus === 'syncing' 
                ? (lang === 'ta' ? 'சேமிக்கப்படுகிறது...' : 'Saving...') 
                : (lang === 'ta' ? 'ஷீட்டில் சேமி' : 'Save to Sheet')}
            </span>
          </button>
        )}

        {/* Language Toggle (English / தமிழ்) */}
        <button 
          className="btn btn-outline btn-sm lang-toggle-btn"
          onClick={() => setLang(lang === 'en' ? 'ta' : 'en')}
          title={lang === 'ta' ? 'ஆங்கிலத்திற்கு மாற்ற கிளிக் செய்க' : 'Switch to Tamil'}
          style={{ fontWeight: 700 }}
        >
          <Languages size={15} />
          <span className="lang-full-text">{lang === 'ta' ? 'தமிழ்' : 'English'}</span>
          <span className="lang-short-text">{lang === 'ta' ? 'த' : 'EN'}</span>
        </button>

        {/* Role Indicator Badge (Displays current role) */}
        {(() => {
          const badge = getRoleBadgeInfo();
          return (
            <button 
              type="button"
              className={`btn btn-sm ${badge.className} role-badge-btn`}
              onClick={handleRoleToggle}
              title={badge.title}
            >
              {badge.icon}
              <span className="role-btn-text">{badge.label}</span>
            </button>
          );
        })()}

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
