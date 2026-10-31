import React, { useState, useEffect } from 'react';
import Header from './components/Header';
import Navigation from './components/Navigation';
import Dashboard from './components/Dashboard';
import TripSheetManager from './components/TripSheetManager';
import FleetManager from './components/FleetManager';
import RateMatrixManager from './components/RateMatrixManager';
import DriverList from './components/DriverList';
import CustomerManager from './components/CustomerManager';
import MaintenanceManager from './components/MaintenanceManager';
import IncomeExpenseManager from './components/IncomeExpenseManager';
import PartnerSplitManager from './components/PartnerSplitManager';
import GoogleSheetsSettings from './components/GoogleSheetsSettings';
import AuditTrashManager from './components/AuditTrashManager';
import TripSlipModal from './components/TripSlipModal';
import AuthScreen from './components/AuthScreen';
import UserManager from './components/UserManager';
import ErrorBoundary from './components/common/ErrorBoundary';
import { ShieldAlert } from 'lucide-react';
import { StorageService } from './services/storage';
import { syncAllToGoogleSheet, fetchDataFromGoogleSheet } from './services/googleSheets';
import { getEffectiveGoogleSheetUrl } from './config/env';

// Friendly access restricted card when an unauthorized role visits a protected tab
function AccessRestrictedView({ requiredRole = 'Admin', lang = 'ta', onGoHome, onElevate }) {
  const isTa = lang === 'ta';
  return (
    <div style={{
      maxWidth: '560px',
      margin: '3rem auto',
      padding: '2.5rem 1.75rem',
      background: 'var(--bg-card)',
      border: '1px solid var(--border-color)',
      borderRadius: '20px',
      textAlign: 'center',
      boxShadow: 'var(--shadow-md)'
    }}>
      <div style={{
        width: '64px',
        height: '64px',
        borderRadius: '20px',
        background: 'rgba(239, 68, 68, 0.1)',
        color: '#dc2626',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        margin: '0 auto 1.25rem'
      }}>
        <ShieldAlert size={32} />
      </div>

      <h2 style={{ fontSize: '1.3rem', fontWeight: 800, color: 'var(--text-main)', marginBottom: '0.5rem' }}>
        {isTa ? 'அணுகல் அனுமதி தேவை' : `${requiredRole} Access Required`}
      </h2>

      <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', lineHeight: 1.5, marginBottom: '1.5rem' }}>
        {isTa 
          ? `இந்த பக்கத்தை அணுக ${requiredRole} அனுமதி தேவை. தயவுசெய்து அட்மின் பதவிக்கு மாறவும் அல்லது முகப்பு பலகைக்குச் செல்லவும்.`
          : `This section is restricted to ${requiredRole} credentials. Please elevate to an Admin role or return to the dashboard.`}
      </p>

      <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center', flexWrap: 'wrap' }}>
        <button className="btn btn-primary" onClick={onGoHome} style={{ fontWeight: 700 }}>
          {isTa ? 'முகப்பு பலகைக்குச் செல்' : 'Back to Dashboard'}
        </button>
        {onElevate && (
          <button className="btn btn-outline" onClick={onElevate} style={{ fontWeight: 600 }}>
            {isTa ? 'அட்மினாக மாறு' : 'Elevate to Admin'}
          </button>
        )}
      </div>
    </div>
  );
}

const SESSION_KEY = 'tractomint_user_session';

export default function App() {
  // Load Initial Settings
  const [settings, setSettings] = useState(() => StorageService.getSettings());
  const [lang, setLang] = useState(settings.language || 'en');
  const [darkMode, setDarkMode] = useState(settings.darkMode || false);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  // Authentication State
  const [currentUser, setCurrentUser] = useState(() => {
    try {
      const savedSession = localStorage.getItem(SESSION_KEY);
      if (savedSession) {
        return JSON.parse(savedSession);
      }
    } catch (e) {
      console.error("Error reading session:", e);
    }
    // Default to null so initial opening displays the login page
    return null;
  });

  const [role, setRole] = useState(() => {
    try {
      const savedSession = localStorage.getItem(SESSION_KEY);
      if (savedSession) {
        const parsed = JSON.parse(savedSession);
        if (parsed && parsed.role) return parsed.role;
      }
    } catch (e) {}
    return settings.currentRole || 'admin';
  });

  // Load Entities from Storage
  const [fleet, setFleet] = useState(() => StorageService.getFleet());
  const [rateMatrix, setRateMatrix] = useState(() => StorageService.getRateMatrix());
  const [drivers, setDrivers] = useState(() => StorageService.getDrivers());
  const [customers, setCustomers] = useState(() => StorageService.getCustomers());
  const [tripSheets, setTripSheets] = useState(() => StorageService.getTripSheets());
  const [maintenance, setMaintenance] = useState(() => StorageService.getMaintenance());
  const [incomeExpense, setIncomeExpense] = useState(() => StorageService.getIncomeExpense());
  const [partners, setPartners] = useState(() => StorageService.getPartners());
  const [partnerDrawings, setPartnerDrawings] = useState(() => StorageService.getPartnerDrawings());
  const [deletedRecords, setDeletedRecords] = useState(() => StorageService.getAllDeletedRecords());
  const [users, setUsers] = useState(() => StorageService.getUsers());

  // UI Modals & Sync State
  const [selectedTripForSlip, setSelectedTripForSlip] = useState(null);
  const [syncStatus, setSyncStatus] = useState(getEffectiveGoogleSheetUrl(settings.webAppUrl) ? 'connected' : 'idle');

  // Sync Dark Mode to Body
  useEffect(() => {
    if (darkMode) {
      document.body.classList.add('dark-mode');
    } else {
      document.body.classList.remove('dark-mode');
    }
  }, [darkMode]);

  // Dynamic Browser Tab Title with TractoMint Branding
  useEffect(() => {
    const comp = lang === 'ta' ? (settings?.companyName_ta || settings?.companyName) : settings?.companyName;
    document.title = comp 
      ? `${comp} - TractoMint | உழவு லெட்ஜர்` 
      : 'TractoMint - Tractor & Farm Machinery Ledger | உழவு மேலாண்மை';
  }, [settings?.companyName, settings?.companyName_ta, lang]);

  // Handle Login
  const handleLogin = (userObj, rememberMe) => {
    setCurrentUser(userObj);
    setRole(userObj.role || 'operator');
    setActiveTab('dashboard');
    if (rememberMe) {
      localStorage.setItem(SESSION_KEY, JSON.stringify(userObj));
    }
  };

  // Handle Logout
  const handleLogout = () => {
    localStorage.removeItem(SESSION_KEY);
    setCurrentUser(null);
    setRole('operator');
    setActiveTab('dashboard');
  };

  // Ensure activeTab is strictly allowed for the current role
  useEffect(() => {
    if (role === 'driver') {
      const allowedDriverTabs = ['dashboard', 'tripSheets', 'fleet', 'maintenance'];
      if (!allowedDriverTabs.includes(activeTab)) {
        setActiveTab('dashboard');
      }
    } else if (role === 'operator') {
      const forbiddenOperatorTabs = ['rateMatrix', 'partnerSplit', 'userManagement', 'auditTrash', 'googleSheets'];
      if (forbiddenOperatorTabs.includes(activeTab)) {
        setActiveTab('dashboard');
      }
    } else if (role === 'manager') {
      const forbiddenManagerTabs = ['auditTrash', 'googleSheets'];
      if (forbiddenManagerTabs.includes(activeTab)) {
        setActiveTab('dashboard');
      }
    }
  }, [role, activeTab]);

  // Persist Settings
  const handleSaveSettings = (newSettings) => {
    const res = StorageService.saveSettings(newSettings);
    if (res && res.success) {
      setSettings(newSettings);
      setLang(newSettings.language || lang);
      if (getEffectiveGoogleSheetUrl(newSettings.webAppUrl)) {
        setSyncStatus('connected');
      }
    }
    return res;
  };

  // Cloud Auto-Save to Google Sheets
  const triggerCloudAutoSave = () => {
    const url = getEffectiveGoogleSheetUrl(settings.webAppUrl);
    if (url && settings.autoSync !== false) {
      setSyncStatus('syncing');
      const fullData = StorageService.getFullDataset();
      syncAllToGoogleSheet(url, fullData)
        .then(res => setSyncStatus(res.success ? 'connected' : 'error'))
        .catch(() => setSyncStatus('error'));
    }
  };

  // Re-fetch all data from storage and optionally auto-sync to Google Sheets
  const refreshAllData = (autoSync = true) => {
    setFleet(StorageService.getFleet());
    setRateMatrix(StorageService.getRateMatrix());
    setDrivers(StorageService.getDrivers());
    setCustomers(StorageService.getCustomers());
    setTripSheets(StorageService.getTripSheets());
    setMaintenance(StorageService.getMaintenance());
    setIncomeExpense(StorageService.getIncomeExpense());
    setPartners(StorageService.getPartners());
    setPartnerDrawings(StorageService.getPartnerDrawings());
    setDeletedRecords(StorageService.getAllDeletedRecords());
    setUsers(StorageService.getUsers());
    if (autoSync) {
      triggerCloudAutoSave();
    }
  };

  // Run auto-bilingual healing and auto-fetch data from Google Sheets on initial load
  useEffect(() => {
    StorageService.healAllBilingualData();
    const url = getEffectiveGoogleSheetUrl(settings.webAppUrl);
    if (url) {
      handlePullFromSheets(url);
    }
  }, []);

  // Save Handlers with Backend Validation
  const handleSaveFleet = (item) => {
    const res = StorageService.saveFleet(item, role);
    if (res.success) refreshAllData();
    return res;
  };

  const handleDeleteFleet = (id, pin) => {
    const res = StorageService.softDeleteItem(StorageService.TABLE_KEYS.FLEET, id, pin);
    if (res.success) refreshAllData();
    return res;
  };

  const handleSaveRate = (item) => {
    const res = StorageService.saveRate(item, role);
    if (res.success) refreshAllData();
    return res;
  };

  const handleDeleteRate = (id, pin) => {
    const res = StorageService.softDeleteItem(StorageService.TABLE_KEYS.RATE_MATRIX, id, pin);
    if (res.success) refreshAllData();
    return res;
  };

  const handleSaveDriver = (item) => {
    const res = StorageService.saveDriver(item, role);
    if (res.success) refreshAllData();
    return res;
  };

  const handleDeleteDriver = (id, pin) => {
    const res = StorageService.softDeleteItem(StorageService.TABLE_KEYS.DRIVERS, id, pin);
    if (res.success) refreshAllData();
    return res;
  };

  const handleSaveCustomer = (item) => {
    const res = StorageService.saveCustomer(item, role);
    if (res.success) refreshAllData();
    return res;
  };

  const handleDeleteCustomer = (id, pin) => {
    const res = StorageService.softDeleteItem(StorageService.TABLE_KEYS.CUSTOMERS, id, pin);
    if (res.success) refreshAllData();
    return res;
  };

  const handleSaveTrip = (item) => {
    const res = StorageService.saveTripSheet(item, role);
    if (res.success) refreshAllData();
    return res;
  };

  const handleDeleteTrip = (id, pin) => {
    const res = StorageService.softDeleteItem(StorageService.TABLE_KEYS.TRIP_SHEETS, id, pin);
    if (res.success) refreshAllData();
    return res;
  };

  const handleSaveMaintenance = (item) => {
    const res = StorageService.saveMaintenance(item, role);
    if (res.success) refreshAllData();
    return res;
  };

  const handleDeleteMaintenance = (id, pin) => {
    const res = StorageService.softDeleteItem(StorageService.TABLE_KEYS.MAINTENANCE, id, pin);
    if (res.success) refreshAllData();
    return res;
  };

  const handleSaveIncomeExpense = (item) => {
    const res = StorageService.saveIncomeExpense(item, role);
    if (res.success) refreshAllData();
    return res;
  };

  const handleDeleteIncomeExpense = (id, pin) => {
    const res = StorageService.softDeleteItem(StorageService.TABLE_KEYS.INCOME_EXPENSE, id, pin);
    if (res.success) refreshAllData();
    return res;
  };

  const handleSavePartner = (item) => {
    const res = StorageService.savePartner(item, role);
    if (res.success) refreshAllData();
    return res;
  };

  const handleDeletePartner = (id, pin) => {
    const res = StorageService.softDeleteItem(StorageService.TABLE_KEYS.PARTNERS, id, pin);
    if (res.success) refreshAllData();
    return res;
  };

  const handleSaveDrawing = (item) => {
    const res = StorageService.savePartnerDrawing(item, role);
    if (res.success) refreshAllData();
    return res;
  };

  const handleDeleteDrawing = (id, pin) => {
    const res = StorageService.softDeleteItem(StorageService.TABLE_KEYS.PARTNER_DRAWINGS, id, pin);
    if (res.success) refreshAllData();
    return res;
  };

  // User Management Handlers (Admin Only)
  const handleSaveUser = (userObj) => {
    const res = StorageService.saveUser(userObj, role);
    if (res.success) refreshAllData();
    return res;
  };

  const handleDeleteUser = (id, pin) => {
    const res = StorageService.deleteUser(id, pin);
    if (res.success) refreshAllData();
    return res;
  };

  const handleRestoreRecord = (tableKey, id) => {
    const res = StorageService.restoreItem(tableKey, id);
    if (res.success) refreshAllData();
    return res;
  };

  const handleResetDemoData = () => {
    StorageService.resetDemoData();
    refreshAllData();
  };

  // Google Sheets Push Action
  const handleSyncAll = async (targetUrl) => {
    const url = getEffectiveGoogleSheetUrl(targetUrl || settings.webAppUrl);
    if (!url) {
      return { success: false, error: "Please enter your Google Apps Script URL in Settings first or configure .env." };
    }
    setSyncStatus('syncing');
    const fullData = StorageService.getFullDataset();
    const result = await syncAllToGoogleSheet(url, fullData);
    setSyncStatus(result.success ? 'connected' : 'error');
    return result;
  };

  // Google Sheets Pull Action (Get all data from spreadsheet)
  const handlePullFromSheets = async (targetUrl) => {
    const url = getEffectiveGoogleSheetUrl(targetUrl || settings.webAppUrl);
    if (!url) {
      return { success: false, error: "Please enter your Google Apps Script URL in Settings first or configure .env." };
    }
    setSyncStatus('syncing');
    const result = await fetchDataFromGoogleSheet(url);
    if (result.success && result.data) {
      StorageService.importFullDataset(result.data);
      StorageService.healAllBilingualData();
      refreshAllData(false);
      setSyncStatus('connected');
    } else {
      setSyncStatus('error');
    }
    return result;
  };

  // Clear All Local Data (Clean Fresh Slate)
  const handleClearAllData = () => {
    StorageService.clearAllData();
    refreshAllData();
  };

  // If Not Authenticated, show Login Screen
  if (!currentUser) {
    return (
      <AuthScreen
        onLogin={handleLogin}
        lang={lang}
        setLang={(newLang) => {
          setLang(newLang);
          handleSaveSettings({ ...settings, language: newLang });
        }}
        adminPin={settings.adminPin}
      />
    );
  }

  return (
    <div className="app-container">
      {/* Top Header */}
      <Header
        lang={lang}
        setLang={(newLang) => {
          setLang(newLang);
          handleSaveSettings({ ...settings, language: newLang });
        }}
        role={role}
        setRole={(newRole) => {
          setRole(newRole);
          handleSaveSettings({ ...settings, currentRole: newRole });
        }}
        darkMode={darkMode}
        setDarkMode={(val) => {
          setDarkMode(val);
          handleSaveSettings({ ...settings, darkMode: val });
        }}
        syncStatus={syncStatus}
        onSyncNow={() => handleSyncAll()}
        adminPin={settings.adminPin}
        currentUser={currentUser}
        onLogout={handleLogout}
        mobileNavOpen={mobileNavOpen}
        setMobileNavOpen={setMobileNavOpen}
      />

      {/* Main Tab Navigation */}
      <Navigation
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        lang={lang}
        role={role}
        deletedCount={deletedRecords.length}
        mobileNavOpen={mobileNavOpen}
        setMobileNavOpen={setMobileNavOpen}
        currentUser={currentUser}
        onLogout={handleLogout}
        syncStatus={syncStatus}
        onSyncNow={() => handleSyncAll()}
        onRoleToggle={() => {
          if (role === 'operator') {
            setRole('admin');
          } else {
            setRole('operator');
          }
        }}
      />

      {/* Main Content Area */}
      <main className="main-view-wrapper">
        <ErrorBoundary key={activeTab} lang={lang} onReset={() => setActiveTab('dashboard')}>
          {activeTab === 'dashboard' && (
            <Dashboard
              lang={lang}
              tripSheets={tripSheets || []}
              fleet={fleet || []}
              maintenance={maintenance || []}
              incomeExpense={incomeExpense || []}
              drivers={drivers || []}
              customers={customers || []}
              onNavigate={(tab) => setActiveTab(tab)}
              onViewSlip={(trip) => setSelectedTripForSlip(trip)}
            />
          )}

          {activeTab === 'tripSheets' && (
            <TripSheetManager
              tripSheets={tripSheets || []}
              fleet={fleet || []}
              drivers={drivers || []}
              customers={customers || []}
              rateMatrix={rateMatrix || []}
              onSaveTrip={handleSaveTrip}
              onDeleteTrip={handleDeleteTrip}
              onViewSlip={(trip) => setSelectedTripForSlip(trip)}
              lang={lang}
              role={role}
              currentUser={currentUser}
            />
          )}

          {activeTab === 'fleet' && (
            <FleetManager
              fleet={fleet || []}
              onSaveFleet={handleSaveFleet}
              onDeleteFleet={handleDeleteFleet}
              lang={lang}
              role={role}
            />
          )}

          {activeTab === 'rateMatrix' && (
            (role === 'admin' || role === 'manager' || role === 'operator') ? (
              <RateMatrixManager
                rateMatrix={rateMatrix || []}
                fleet={fleet || []}
                onSaveRate={handleSaveRate}
                onDeleteRate={handleDeleteRate}
                lang={lang}
                role={role}
              />
            ) : (
              <AccessRestrictedView
                requiredRole="Admin or Manager"
                lang={lang}
                onGoHome={() => setActiveTab('dashboard')}
                onElevate={() => setRole('admin')}
              />
            )
          )}

          {activeTab === 'drivers' && (
            role !== 'driver' ? (
              <DriverList
                drivers={drivers || []}
                tripSheets={tripSheets || []}
                onSaveDriver={handleSaveDriver}
                onDeleteDriver={handleDeleteDriver}
                lang={lang}
                role={role}
                currentUser={currentUser}
                users={users || []}
                settings={settings || {}}
              />
            ) : (
              <AccessRestrictedView
                requiredRole="Admin / Operator"
                lang={lang}
                onGoHome={() => setActiveTab('dashboard')}
                onElevate={() => setRole('admin')}
              />
            )
          )}

          {activeTab === 'customers' && (
            role !== 'driver' ? (
              <CustomerManager
                customers={customers || []}
                tripSheets={tripSheets || []}
                onSaveCustomer={handleSaveCustomer}
                onDeleteCustomer={handleDeleteCustomer}
                lang={lang}
                role={role}
              />
            ) : (
              <AccessRestrictedView
                requiredRole="Admin / Operator"
                lang={lang}
                onGoHome={() => setActiveTab('dashboard')}
                onElevate={() => setRole('admin')}
              />
            )
          )}

          {activeTab === 'maintenance' && (
            <MaintenanceManager
              maintenance={maintenance || []}
              fleet={fleet || []}
              onSaveMaintenance={handleSaveMaintenance}
              onDeleteMaintenance={handleDeleteMaintenance}
              lang={lang}
              role={role}
              currentUser={currentUser}
              users={users || []}
              drivers={drivers || []}
            />
          )}

          {activeTab === 'incomeExpense' && (
            role !== 'driver' ? (
              <IncomeExpenseManager
                incomeExpense={incomeExpense || []}
                onSaveIncomeExpense={handleSaveIncomeExpense}
                onDeleteIncomeExpense={handleDeleteIncomeExpense}
                lang={lang}
                role={role}
              />
            ) : (
              <AccessRestrictedView
                requiredRole="Admin / Operator"
                lang={lang}
                onGoHome={() => setActiveTab('dashboard')}
                onElevate={() => setRole('admin')}
              />
            )
          )}

          {activeTab === 'partnerSplit' && (
            (role === 'admin' || role === 'manager') ? (
              <PartnerSplitManager
                partners={partners || []}
                partnerDrawings={partnerDrawings || []}
                tripSheets={tripSheets || []}
                maintenance={maintenance || []}
                incomeExpense={incomeExpense || []}
                onSavePartner={handleSavePartner}
                onDeletePartner={handleDeletePartner}
                onSaveDrawing={handleSaveDrawing}
                onDeleteDrawing={handleDeleteDrawing}
                lang={lang}
                role={role}
              />
            ) : (
              <AccessRestrictedView
                requiredRole="Admin"
                lang={lang}
                onGoHome={() => setActiveTab('dashboard')}
                onElevate={() => setRole('admin')}
              />
            )
          )}

          {activeTab === 'userManagement' && (
            (role === 'admin' || role === 'manager') ? (
              <UserManager
                users={users || []}
                onSaveUser={handleSaveUser}
                onDeleteUser={handleDeleteUser}
                currentUser={currentUser}
                adminPin={settings?.adminPin}
                lang={lang}
                role={role}
              />
            ) : (
              <AccessRestrictedView
                requiredRole="Admin"
                lang={lang}
                onGoHome={() => setActiveTab('dashboard')}
                onElevate={() => setRole('admin')}
              />
            )
          )}

          {activeTab === 'auditTrash' && (
            <AuditTrashManager
              deletedRecords={deletedRecords || []}
              onRestoreRecord={handleRestoreRecord}
              lang={lang}
              role={role}
            />
          )}

          {activeTab === 'googleSheets' && (
            role === 'admin' ? (
              <GoogleSheetsSettings
                settings={settings || {}}
                onSaveSettings={handleSaveSettings}
                onSyncAll={handleSyncAll}
                onPullFromSheets={handlePullFromSheets}
                onClearAllData={handleClearAllData}
                allData={{
                  fleet: fleet || [],
                  rateMatrix: rateMatrix || [],
                  drivers: drivers || [],
                  customers: customers || [],
                  tripSheets: tripSheets || [],
                  maintenance: maintenance || [],
                  incomeExpense: incomeExpense || [],
                  partners: partners || [],
                  partnerDrawings: partnerDrawings || [],
                  users: users || []
                }}
                lang={lang}
                role={role}
              />
            ) : (
              <AccessRestrictedView
                requiredRole="Admin"
                lang={lang}
                onGoHome={() => setActiveTab('dashboard')}
                onElevate={() => setRole('admin')}
              />
            )
          )}

          {/* Safety Fallback for any unexpected/unmatched tab */}
          {![
            'dashboard', 'tripSheets', 'fleet', 'rateMatrix', 
            'drivers', 'customers', 'maintenance', 'incomeExpense', 
            'partnerSplit', 'userManagement', 'auditTrash', 'googleSheets'
          ].includes(activeTab) && (
            <Dashboard
              lang={lang}
              tripSheets={tripSheets || []}
              fleet={fleet || []}
              maintenance={maintenance || []}
              incomeExpense={incomeExpense || []}
              drivers={drivers || []}
              customers={customers || []}
              onNavigate={(tab) => setActiveTab(tab)}
              onViewSlip={(trip) => setSelectedTripForSlip(trip)}
            />
          )}
        </ErrorBoundary>
      </main>

      {/* Printable Trip Slip Modal */}
      <TripSlipModal
        isOpen={!!selectedTripForSlip}
        onClose={() => setSelectedTripForSlip(null)}
        trip={selectedTripForSlip}
        lang={lang}
        settings={settings}
      />
    </div>
  );
}
