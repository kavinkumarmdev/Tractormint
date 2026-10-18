import React from 'react';
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
  X 
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
  setMobileNavOpen = () => {}
}) {
  const t = translations[lang];

  const tabs = [
    { id: 'dashboard', label: t.dashboard, icon: LayoutDashboard },
    { id: 'tripSheets', label: t.tripSheets, icon: FileSpreadsheet },
    { id: 'fleet', label: t.fleet, icon: Tractor },
    { id: 'rateMatrix', label: t.rateMatrix, icon: Tag },
    { id: 'drivers', label: t.drivers, icon: UserCheck },
    { id: 'customers', label: t.customers, icon: Users2 },
    { id: 'maintenance', label: t.maintenance, icon: Wrench },
    { id: 'incomeExpense', label: t.incomeExpense, icon: Receipt },
    { id: 'partnerSplit', label: t.partnerSplit, icon: Scale },
    ...(role === 'admin' ? [{ 
      id: 'userManagement', 
      label: lang === 'ta' ? 'பயனர்கள் (Users)' : 'Staff Logins', 
      icon: UserCog 
    }] : []),
    { id: 'auditTrash', label: t.auditTrash, icon: Trash2, badge: deletedCount > 0 ? deletedCount : null },
    { id: 'googleSheets', label: t.googleSheets, icon: CloudSun }
  ];

  const handleTabClick = (tabId) => {
    setActiveTab(tabId);
    setMobileNavOpen(false);
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

      {/* Navigation Bar (Desktop horizontal scroll & Mobile Drawer) */}
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

        <div className="nav-tabs-wrapper">
          {tabs.map((tab) => {
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
          className={`bottom-nav-item ${['rateMatrix', 'drivers', 'customers', 'incomeExpense', 'partnerSplit', 'userManagement', 'auditTrash', 'googleSheets'].includes(activeTab) || mobileNavOpen ? 'active' : ''}`}
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
