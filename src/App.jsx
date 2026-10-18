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
import { StorageService } from './services/storage';
import { syncAllToGoogleSheet, fetchDataFromGoogleSheet } from './services/googleSheets';
import { getEffectiveGoogleSheetUrl } from './config/env';

const SESSION_KEY = 'tractomint_user_session';

export default function App() {
  // Load Initial Settings
  const [settings, setSettings] = useState(() => StorageService.getSettings());
  const [lang, setLang] = useState(settings.language || 'en');
  const [role, setRole] = useState(settings.currentRole || 'admin');
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
    setRole(userObj.role);
    if (rememberMe) {
      localStorage.setItem(SESSION_KEY, JSON.stringify(userObj));
    }
  };

  // Handle Logout
  const handleLogout = () => {
    localStorage.removeItem(SESSION_KEY);
    setCurrentUser(null);
  };

  // Persist Settings
  const handleSaveSettings = (newSettings) => {
    setSettings(newSettings);
    setLang(newSettings.language || lang);
    StorageService.saveSettings(newSettings);
    if (getEffectiveGoogleSheetUrl(newSettings.webAppUrl)) {
      setSyncStatus('connected');
    }
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

  // Auto-fetch data from Google Sheets on initial load to get latest list
  useEffect(() => {
    const url = getEffectiveGoogleSheetUrl(settings.webAppUrl);
    if (url) {
      handlePullFromSheets(url);
    }
  }, []);

  // Save Handlers
  const handleSaveFleet = (item) => {
    StorageService.saveItem(StorageService.TABLE_KEYS.FLEET, item, role);
    refreshAllData();
  };

  const handleDeleteFleet = (id, pin) => {
    const res = StorageService.softDeleteItem(StorageService.TABLE_KEYS.FLEET, id, pin);
    if (res.success) refreshAllData();
    return res;
  };

  const handleSaveRate = (item) => {
    StorageService.saveItem(StorageService.TABLE_KEYS.RATE_MATRIX, item, role);
    refreshAllData();
  };

  const handleDeleteRate = (id, pin) => {
    const res = StorageService.softDeleteItem(StorageService.TABLE_KEYS.RATE_MATRIX, id, pin);
    if (res.success) refreshAllData();
    return res;
  };

  const handleSaveDriver = (item) => {
    StorageService.saveItem(StorageService.TABLE_KEYS.DRIVERS, item, role);
    refreshAllData();
  };

  const handleDeleteDriver = (id, pin) => {
    const res = StorageService.softDeleteItem(StorageService.TABLE_KEYS.DRIVERS, id, pin);
    if (res.success) refreshAllData();
    return res;
  };

  const handleSaveCustomer = (item) => {
    StorageService.saveItem(StorageService.TABLE_KEYS.CUSTOMERS, item, role);
    refreshAllData();
  };

  const handleDeleteCustomer = (id, pin) => {
    const res = StorageService.softDeleteItem(StorageService.TABLE_KEYS.CUSTOMERS, id, pin);
    if (res.success) refreshAllData();
    return res;
  };

  const handleSaveTrip = (item) => {
    StorageService.saveItem(StorageService.TABLE_KEYS.TRIP_SHEETS, item, role);
    refreshAllData();
  };

  const handleDeleteTrip = (id, pin) => {
    const res = StorageService.softDeleteItem(StorageService.TABLE_KEYS.TRIP_SHEETS, id, pin);
    if (res.success) refreshAllData();
    return res;
  };

  const handleSaveMaintenance = (item) => {
    StorageService.saveItem(StorageService.TABLE_KEYS.MAINTENANCE, item, role);
    refreshAllData();
  };

  const handleDeleteMaintenance = (id, pin) => {
    const res = StorageService.softDeleteItem(StorageService.TABLE_KEYS.MAINTENANCE, id, pin);
    if (res.success) refreshAllData();
    return res;
  };

  const handleSaveIncomeExpense = (item) => {
    StorageService.saveItem(StorageService.TABLE_KEYS.INCOME_EXPENSE, item, role);
    refreshAllData();
  };

  const handleDeleteIncomeExpense = (id, pin) => {
    const res = StorageService.softDeleteItem(StorageService.TABLE_KEYS.INCOME_EXPENSE, id, pin);
    if (res.success) refreshAllData();
    return res;
  };

  const handleSavePartner = (item) => {
    StorageService.saveItem(StorageService.TABLE_KEYS.PARTNERS, item, role);
    refreshAllData();
  };

  const handleDeletePartner = (id, pin) => {
    const res = StorageService.softDeleteItem(StorageService.TABLE_KEYS.PARTNERS, id, pin);
    if (res.success) refreshAllData();
    return res;
  };

  const handleSaveDrawing = (item) => {
    StorageService.saveItem(StorageService.TABLE_KEYS.PARTNER_DRAWINGS, item, role);
    refreshAllData();
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
        {activeTab === 'dashboard' && (
          <Dashboard
            lang={lang}
            tripSheets={tripSheets}
            fleet={fleet}
            maintenance={maintenance}
            incomeExpense={incomeExpense}
            drivers={drivers}
            customers={customers}
            onNavigate={(tab) => setActiveTab(tab)}
            onViewSlip={(trip) => setSelectedTripForSlip(trip)}
          />
        )}

        {activeTab === 'tripSheets' && (
          <TripSheetManager
            tripSheets={tripSheets}
            fleet={fleet}
            drivers={drivers}
            customers={customers}
            rateMatrix={rateMatrix}
            onSaveTrip={handleSaveTrip}
            onDeleteTrip={handleDeleteTrip}
            onViewSlip={(trip) => setSelectedTripForSlip(trip)}
            lang={lang}
            role={role}
          />
        )}

        {activeTab === 'fleet' && (
          <FleetManager
            fleet={fleet}
            onSaveFleet={handleSaveFleet}
            onDeleteFleet={handleDeleteFleet}
            lang={lang}
            role={role}
          />
        )}

        {activeTab === 'rateMatrix' && (
          <RateMatrixManager
            rateMatrix={rateMatrix}
            fleet={fleet}
            onSaveRate={handleSaveRate}
            onDeleteRate={handleDeleteRate}
            lang={lang}
            role={role}
          />
        )}

        {activeTab === 'drivers' && (
          <DriverList
            drivers={drivers}
            tripSheets={tripSheets}
            onSaveDriver={handleSaveDriver}
            onDeleteDriver={handleDeleteDriver}
            lang={lang}
            role={role}
          />
        )}

        {activeTab === 'customers' && (
          <CustomerManager
            customers={customers}
            tripSheets={tripSheets}
            onSaveCustomer={handleSaveCustomer}
            onDeleteCustomer={handleDeleteCustomer}
            lang={lang}
            role={role}
          />
        )}

        {activeTab === 'maintenance' && (
          <MaintenanceManager
            maintenance={maintenance}
            fleet={fleet}
            onSaveMaintenance={handleSaveMaintenance}
            onDeleteMaintenance={handleDeleteMaintenance}
            lang={lang}
            role={role}
          />
        )}

        {activeTab === 'incomeExpense' && (
          <IncomeExpenseManager
            incomeExpense={incomeExpense}
            onSaveIncomeExpense={handleSaveIncomeExpense}
            onDeleteIncomeExpense={handleDeleteIncomeExpense}
            lang={lang}
            role={role}
          />
        )}

        {activeTab === 'partnerSplit' && (
          <PartnerSplitManager
            partners={partners}
            partnerDrawings={partnerDrawings}
            tripSheets={tripSheets}
            maintenance={maintenance}
            incomeExpense={incomeExpense}
            onSavePartner={handleSavePartner}
            onDeletePartner={handleDeletePartner}
            onSaveDrawing={handleSaveDrawing}
            onDeleteDrawing={handleDeleteDrawing}
            lang={lang}
            role={role}
          />
        )}

        {activeTab === 'userManagement' && role === 'admin' && (
          <UserManager
            users={users}
            onSaveUser={handleSaveUser}
            onDeleteUser={handleDeleteUser}
            currentUser={currentUser}
            adminPin={settings.adminPin}
            lang={lang}
            role={role}
          />
        )}

        {activeTab === 'auditTrash' && (
          <AuditTrashManager
            deletedRecords={deletedRecords}
            onRestoreRecord={handleRestoreRecord}
            lang={lang}
            role={role}
          />
        )}

        {activeTab === 'googleSheets' && (
          <GoogleSheetsSettings
            settings={settings}
            onSaveSettings={handleSaveSettings}
            onSyncAll={handleSyncAll}
            onPullFromSheets={handlePullFromSheets}
            onClearAllData={handleClearAllData}
            allData={{
              fleet,
              rateMatrix,
              drivers,
              customers,
              tripSheets,
              maintenance,
              incomeExpense,
              partners,
              partnerDrawings,
              users
            }}
            lang={lang}
            role={role}
          />
        )}
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
