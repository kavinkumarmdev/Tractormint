import React, { useState, useRef, useEffect } from 'react';
import { 
  LayoutDashboard, 
  FileSpreadsheet, 
  Tractor, 
  Tag, 
  Users2, 
  UserCheck, 
  Wrench, 
  Receipt, 
  Scale, 
  Trash2, 
  CloudSun, 
  UserCog, 
  Menu, 
  X,
  ChevronDown,
  MoreHorizontal,
  LogOut
} from 'lucide-react';
import Logo from './Logo';
import { translations } from '../translations/dictionary';

export default function Navigation({ 
  activeTab, 
  setActiveTab, 
  lang, 
  role = 'admin', 
  deletedCount = 0, 
  mobileNavOpen = false, 
  setMobileNavOpen = () => {},
  currentUser,
  onLogout,
  syncStatus,
  onSyncNow,
  onRoleToggle
}) {
  const t = translations[lang];
  const [moreDropdownOpen, setMoreDropdownOpen] = useState(false);
  const moreDropdownRef = useRef(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (moreDropdownRef.current && !moreDropdownRef.current.contains(event.target)) {
        setMoreDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Operational tabs based on Role (Admin, Manager, Operator, Driver)
  const isDriver = role === 'driver';
  const isOperator = role === 'operator';
  const isManager = role === 'manager';
  const isAdmin = role === 'admin';

  // Primary operational tabs (Always visible on desktop navbar)
  const primaryTabs = isDriver ? [
    { id: 'dashboard', label: t.dashboard, icon: LayoutDashboard },
    { id: 'tripSheets', label: t.tripSheets, icon: FileSpreadsheet },
    { id: 'fleet', label: t.fleet, icon: Tractor },
    { id: 'maintenance', label: t.maintenance, icon: Wrench }
  ] : [
    { id: 'dashboard', label: t.dashboard, icon: LayoutDashboard },
    { id: 'tripSheets', label: t.tripSheets, icon: FileSpreadsheet },
    { id: 'fleet', label: t.fleet, icon: Tractor },
    { id: 'customers', label: t.customers, icon: Users2 },
    { id: 'drivers', label: t.drivers, icon: UserCheck },
    { id: 'maintenance', label: t.maintenance, icon: Wrench }
  ];

  // Secondary tools & settings tabs (Organized under "More" dropdown on desktop)
  const secondaryTabs = [
    ...((isAdmin || isManager) ? [{ id: 'rateMatrix', label: t.rateMatrix, icon: Tag }] : []),
    ...((isAdmin || isManager || isOperator) ? [{ id: 'incomeExpense', label: t.incomeExpense, icon: Receipt }] : []),
    ...((isAdmin || isManager) ? [{ id: 'partnerSplit', label: t.partnerSplit, icon: Scale }] : []),
    ...(isAdmin ? [{ 
      id: 'userManagement', 
      label: lang === 'ta' ? 'பயனர்கள் (Users)' : 'Staff Logins', 
      icon: UserCog 
    }] : []),
    ...(isAdmin ? [{ 
      id: 'auditTrash', 
      label: t.auditTrash, 
      icon: Trash2, 
      badge: deletedCount > 0 ? deletedCount : null 
    }] : []),
    ...(isAdmin ? [{ 
      id: 'googleSheets', 
      label: t.googleSheets, 
      icon: CloudSun 
    }] : [])
  ];

  const allTabs = [...primaryTabs, ...secondaryTabs];
  const isSecondaryActive = secondaryTabs.some(tab => tab.id === activeTab);
  const activeSecondaryTab = secondaryTabs.find(tab => tab.id === activeTab);

  const handleTabClick = (tabId) => {
    setActiveTab(tabId);
    setMobileNavOpen(false);
    setMoreDropdownOpen(false);
  };

  return (
    <>
      {/* Mobile Drawer Overlay */}
      {mobileNavOpen && (
        <div 
          className="mobile-nav-backdrop"
          onClick={() => setMobileNavOpen(false)}
        />
      )}

      {/* Navigation Bar */}
      <nav className={`main-nav-bar no-print ${mobileNavOpen ? 'mobile-open' : ''}`}>
        {/* Mobile Drawer Header with Branding & Close */}
        <div className="mobile-drawer-header">
          <Logo size="sm" lang={lang} />
          <button 
            className="mobile-drawer-close-btn"
            onClick={() => setMobileNavOpen(false)}
            title="Close menu"
          >
            <X size={20} />
          </button>
        </div>

        {/* Mobile Drawer User & Quick Actions Card */}
        {mobileNavOpen && (
          <div className="mobile-drawer-user-card" style={{
            margin: '0.75rem',
            padding: '0.75rem',
            background: 'var(--bg-subtle)',
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--border-color)',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.6rem'
          }}>
            {/* User row */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <div style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '50%',
                  background: 'var(--primary-600)',
                  color: '#fff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 800,
                  fontSize: '0.85rem'
                }}>
                  {currentUser ? (currentUser.name || currentUser.username || 'U')[0].toUpperCase() : 'A'}
                </div>
                <div>
                  <div style={{ fontWeight: 700, fontSize: '0.85rem', color: 'var(--text-main)', lineHeight: 1.2 }}>
                    {currentUser ? (currentUser.displayName || currentUser.name || currentUser.username) : 'Master Admin'}
                  </div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                    {role === 'admin' 
                      ? (lang === 'ta' ? '👑 முதன்மை நிர்வாகி' : '👑 Administrator') 
                      : role === 'manager' 
                      ? (lang === 'ta' ? '👔 மேலாளர்' : '👔 Manager') 
                      : role === 'operator' 
                      ? (lang === 'ta' ? '⚡ கள ஆபரேட்டர்' : '⚡ Operator') 
                      : (lang === 'ta' ? '🚜 டிரைவர்' : '🚜 Driver')}
                  </div>
                </div>
              </div>

              {onRoleToggle && role === 'admin' && (
                <button
                  type="button"
                  className="btn btn-sm btn-primary"
                  onClick={() => {
                    onRoleToggle();
                    setMobileNavOpen(false);
                  }}
                  style={{ fontSize: '0.72rem', padding: '0.2rem 0.5rem' }}
                >
                  Admin
                </button>
              )}
            </div>

            {/* Google Sheets Sync Quick Row - ONLY visible for Admin */}
            {role === 'admin' && (
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '0.4rem 0.6rem',
                background: 'var(--bg-card)',
                borderRadius: '6px',
                border: '1px solid var(--border-color)',
                fontSize: '0.75rem'
              }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontWeight: 600 }}>
                  <span style={{
                    width: '8px',
                    height: '8px',
                    borderRadius: '50%',
                    background: syncStatus === 'syncing' ? '#f59e0b' : syncStatus === 'connected' ? '#10b981' : '#94a3b8'
                  }} />
                  {syncStatus === 'syncing' ? 'Syncing...' : syncStatus === 'connected' ? 'Sheets Active' : 'Sheets Offline'}
                </span>
                {onSyncNow && (
                  <button
                    type="button"
                    onClick={onSyncNow}
                    className="btn btn-outline btn-sm"
                    style={{ fontSize: '0.7rem', padding: '0.15rem 0.45rem' }}
                  >
                    {lang === 'ta' ? 'இணை' : 'Sync'}
                  </button>
                )}
              </div>
            )}

            {/* Logout button if currentUser */}
            {currentUser && onLogout && (
              <button
                type="button"
                onClick={() => {
                  onLogout();
                  setMobileNavOpen(false);
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.4rem',
                  padding: '0.4rem',
                  background: 'rgba(239, 68, 68, 0.08)',
                  border: '1px solid rgba(239, 68, 68, 0.25)',
                  color: '#ef4444',
                  borderRadius: '6px',
                  fontSize: '0.78rem',
                  fontWeight: 700,
                  cursor: 'pointer'
                }}
              >
                <LogOut size={13} />
                {lang === 'ta' ? 'வெளியேறு (Logout)' : 'Sign Out'}
              </button>
            )}
          </div>
        )}

        {/* Desktop & Mobile Drawer Tabs Wrapper */}
        <div className="nav-tabs-wrapper">
          {/* On Mobile Drawer: Show All Tabs Categorized */}
          {mobileNavOpen ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', width: '100%' }}>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-light)', fontWeight: 700, padding: '0.5rem 0.75rem 0.2rem', textTransform: 'uppercase' }}>
                {lang === 'ta' ? 'முக்கிய செயல்பாடுகள் (Core Operations)' : 'Operations'}
              </div>
              {primaryTabs.map((tab) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    className={`nav-tab-btn ${isActive ? 'active' : ''}`}
                    onClick={() => handleTabClick(tab.id)}
                  >
                    <Icon size={18} className="nav-icon" />
                    <span className="nav-text">{tab.label}</span>
                  </button>
                );
              })}

              <div style={{ fontSize: '0.72rem', color: 'var(--text-light)', fontWeight: 700, padding: '0.75rem 0.75rem 0.2rem', textTransform: 'uppercase', borderTop: '1px solid var(--border-color)', marginTop: '0.4rem' }}>
                {lang === 'ta' ? 'கணக்கு & அமைப்புகள் (Finance & Settings)' : 'Finance & Settings'}
              </div>
              {secondaryTabs.map((tab) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    className={`nav-tab-btn ${isActive ? 'active' : ''}`}
                    onClick={() => handleTabClick(tab.id)}
                  >
                    <Icon size={18} className="nav-icon" />
                    <span className="nav-text">{tab.label}</span>
                    {tab.badge && (
                      <span className="nav-badge">
                        {tab.badge}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          ) : (
            /* Desktop Navbar: Compact Primary Tabs + Sleek "More" Dropdown */
            <>
              {primaryTabs.map((tab) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    className={`nav-tab-btn ${isActive ? 'active' : ''}`}
                    onClick={() => handleTabClick(tab.id)}
                  >
                    <Icon size={17} className="nav-icon" />
                    <span className="nav-text">{tab.label}</span>
                  </button>
                );
              })}

              {/* Compact "More" Dropdown Button */}
              <div ref={moreDropdownRef} style={{ position: 'relative', display: 'inline-block' }}>
                <button
                  type="button"
                  className={`nav-tab-btn ${isSecondaryActive ? 'active' : ''}`}
                  onClick={() => setMoreDropdownOpen(!moreDropdownOpen)}
                  style={{
                    gap: '0.4rem'
                  }}
                  title={lang === 'ta' ? 'மேலும் அமைப்புகள் & மேலாண்மை' : 'More tools, finance & settings'}
                >
                  {isSecondaryActive && activeSecondaryTab ? (
                    <>
                      {React.createElement(activeSecondaryTab.icon, { size: 17, className: 'nav-icon' })}
                      <span className="nav-text">{activeSecondaryTab.label}</span>
                    </>
                  ) : (
                    <>
                      <MoreHorizontal size={17} className="nav-icon" />
                      <span className="nav-text">{lang === 'ta' ? 'மேலும்' : 'More'}</span>
                    </>
                  )}
                  {deletedCount > 0 && !isSecondaryActive && (
                    <span className="nav-badge" style={{ margin: 0, padding: '0.1rem 0.35rem' }}>
                      {deletedCount}
                    </span>
                  )}
                  <ChevronDown size={14} style={{ transform: moreDropdownOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
                </button>

                {/* Dropdown Popover */}
                {moreDropdownOpen && (
                  <div 
                    className="nav-more-popover"
                    style={{
                      position: 'absolute',
                      top: 'calc(100% + 6px)',
                      right: 0,
                      zIndex: 1000,
                      background: 'var(--bg-card)',
                      border: '1px solid var(--border-color)',
                      borderRadius: 'var(--radius-md)',
                      boxShadow: 'var(--shadow-lg), 0 10px 25px rgba(0,0,0,0.15)',
                      minWidth: '220px',
                      padding: '0.4rem',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '0.2rem',
                      animation: 'fadeIn 0.15s ease'
                    }}
                  >
                    {secondaryTabs.map((tab) => {
                      const Icon = tab.icon;
                      const isActive = activeTab === tab.id;
                      return (
                        <button
                          key={tab.id}
                          className={`nav-dropdown-item ${isActive ? 'active' : ''}`}
                          onClick={() => handleTabClick(tab.id)}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            width: '100%',
                            padding: '0.6rem 0.85rem',
                            fontSize: '0.85rem',
                            fontWeight: isActive ? 700 : 500,
                            color: isActive ? 'var(--primary-600)' : 'var(--text-main)',
                            background: isActive ? 'var(--primary-50)' : 'transparent',
                            border: 'none',
                            borderRadius: 'var(--radius-sm)',
                            cursor: 'pointer',
                            textAlign: 'left',
                            transition: 'all 0.15s'
                          }}
                        >
                          <span style={{ display: 'flex', alignItems: 'center', gap: '0.55rem' }}>
                            <Icon size={16} />
                            <span>{tab.label}</span>
                          </span>
                          {tab.badge && (
                            <span className="nav-badge" style={{ margin: 0 }}>
                              {tab.badge}
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </nav>

      {/* App-Style Mobile Bottom Navigation Bar (Persistent on phones) */}
      <div className="mobile-bottom-nav no-print">
        <button 
          className={`bottom-nav-item ${activeTab === 'dashboard' ? 'active' : ''}`}
          onClick={() => handleTabClick('dashboard')}
        >
          <LayoutDashboard size={20} />
          <span>{lang === 'ta' ? 'முகப்பு' : 'Home'}</span>
        </button>

        <button 
          className={`bottom-nav-item ${activeTab === 'tripSheets' ? 'active' : ''}`}
          onClick={() => handleTabClick('tripSheets')}
        >
          <FileSpreadsheet size={20} />
          <span>{lang === 'ta' ? 'டிரிப்' : 'Trips'}</span>
        </button>

        <button 
          className={`bottom-nav-item ${activeTab === 'fleet' ? 'active' : ''}`}
          onClick={() => handleTabClick('fleet')}
        >
          <Tractor size={20} />
          <span>{lang === 'ta' ? 'வண்டி' : 'Fleet'}</span>
        </button>

        <button 
          className={`bottom-nav-item ${activeTab === 'maintenance' ? 'active' : ''}`}
          onClick={() => handleTabClick('maintenance')}
        >
          <Wrench size={20} />
          <span>{lang === 'ta' ? 'பராமரிப்பு' : 'Service'}</span>
        </button>

        <button 
          className={`bottom-nav-item ${isSecondaryActive || ['customers', 'drivers'].includes(activeTab) || mobileNavOpen ? 'active' : ''}`}
          onClick={() => setMobileNavOpen(!mobileNavOpen)}
        >
          <Menu size={20} />
          <span>{lang === 'ta' ? 'மெனு' : 'Menu'}</span>
          {deletedCount > 0 && <span className="bottom-nav-dot" />}
        </button>
      </div>
    </>
  );
}
