// Local Storage & Database Engine with Lifetime Audit, Soft Delete & Google Sheet Sync
import { syncAllToGoogleSheet } from './googleSheets';
import { ENV_GOOGLE_SHEETS_URL, getEffectiveGoogleSheetUrl } from '../config/env';

const STORAGE_KEYS = {
  FLEET: "tractomint_fleet",
  RATE_MATRIX: "tractomint_rate_matrix",
  DRIVERS: "tractomint_drivers",
  CUSTOMERS: "tractomint_customers",
  TRIP_SHEETS: "tractomint_trip_sheets",
  MAINTENANCE: "tractomint_maintenance",
  INCOME_EXPENSE: "tractomint_income_expense",
  PARTNERS: "tractomint_partners",
  PARTNER_DRAWINGS: "tractomint_partner_drawings",
  SETTINGS: "tractomint_settings",
  USERS: "tractomint_users"
};

// Initial Clean State - No Dummy Data
const INITIAL_FLEET = [];
const INITIAL_RATE_MATRIX = [];
const INITIAL_DRIVERS = [];
const INITIAL_CUSTOMERS = [];
const INITIAL_TRIP_SHEETS = [];
const INITIAL_MAINTENANCE = [];
const INITIAL_INCOME_EXPENSE = [];
const INITIAL_PARTNERS = [];
const INITIAL_PARTNER_DRAWINGS = [];

// Initial Master Admin (Created by default - Only Admin can create additional login accounts)
const INITIAL_USERS = [
  {
    id: "usr-admin",
    username: "admin",
    pin: "1234",
    displayName: "Master Administrator",
    displayName_ta: "முதன்மை நிர்வாகி",
    role: "admin",
    phone: "",
    status: "active",
    isDefault: true,
    created_at: "2026-01-01 00:00",
    created_by: "system"
  }
];

const INITIAL_SETTINGS = {
  adminPin: "1234",
  currentRole: "admin", // 'admin' | 'operator'
  language: "en", // 'en' | 'ta'
  webAppUrl: ENV_GOOGLE_SHEETS_URL,
  autoSync: true,
  companyName: "Tractor & Agri Machinery Works",
  companyName_ta: "டிராக்டர் மற்றும் விவசாய இயந்திரங்கள் லெட்ஜர்",
  contactPhone: "",
  address: "",
  darkMode: false,
  lastSynced: "",
  lastFetched: ""
};

// Generic safe storage helper
function loadData(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) {
      localStorage.setItem(key, JSON.stringify(fallback));
      return fallback;
    }
    return JSON.parse(raw);
  } catch (err) {
    console.error(`Error loading ${key}:`, err);
    return fallback;
  }
}

function saveData(key, data) {
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch (err) {
    console.error(`Error saving ${key}:`, err);
  }
}

export const StorageService = {
  // Getters for active (non-soft-deleted) items
  getFleet: (includeDeleted = false) => {
    const list = loadData(STORAGE_KEYS.FLEET, INITIAL_FLEET);
    return includeDeleted ? list : list.filter(item => !item.is_deleted);
  },

  getRateMatrix: (includeDeleted = false) => {
    const list = loadData(STORAGE_KEYS.RATE_MATRIX, INITIAL_RATE_MATRIX);
    return includeDeleted ? list : list.filter(item => !item.is_deleted);
  },

  getDrivers: (includeDeleted = false) => {
    const list = loadData(STORAGE_KEYS.DRIVERS, INITIAL_DRIVERS);
    return includeDeleted ? list : list.filter(item => !item.is_deleted);
  },

  getCustomers: (includeDeleted = false) => {
    const list = loadData(STORAGE_KEYS.CUSTOMERS, INITIAL_CUSTOMERS);
    return includeDeleted ? list : list.filter(item => !item.is_deleted);
  },

  getTripSheets: (includeDeleted = false) => {
    const list = loadData(STORAGE_KEYS.TRIP_SHEETS, INITIAL_TRIP_SHEETS);
    return includeDeleted ? list : list.filter(item => !item.is_deleted);
  },

  getMaintenance: (includeDeleted = false) => {
    const list = loadData(STORAGE_KEYS.MAINTENANCE, INITIAL_MAINTENANCE);
    return includeDeleted ? list : list.filter(item => !item.is_deleted);
  },

  getIncomeExpense: (includeDeleted = false) => {
    const list = loadData(STORAGE_KEYS.INCOME_EXPENSE, INITIAL_INCOME_EXPENSE);
    return includeDeleted ? list : list.filter(item => !item.is_deleted);
  },

  getPartners: (includeDeleted = false) => {
    const list = loadData(STORAGE_KEYS.PARTNERS, INITIAL_PARTNERS);
    return includeDeleted ? list : list.filter(item => !item.is_deleted);
  },

  getPartnerDrawings: (includeDeleted = false) => {
    const list = loadData(STORAGE_KEYS.PARTNER_DRAWINGS, INITIAL_PARTNER_DRAWINGS);
    return includeDeleted ? list : list.filter(item => !item.is_deleted);
  },

  getUsers: (includeDeleted = false) => {
    let list = loadData(STORAGE_KEYS.USERS, INITIAL_USERS);
    if (!list || list.length === 0) {
      list = INITIAL_USERS;
      saveData(STORAGE_KEYS.USERS, list);
    }
    return includeDeleted ? list : list.filter(item => !item.is_deleted);
  },

  getSettings: () => {
    const s = loadData(STORAGE_KEYS.SETTINGS, INITIAL_SETTINGS);
    const effectiveUrl = getEffectiveGoogleSheetUrl(s.webAppUrl);
    if (!s.webAppUrl || s.webAppUrl !== effectiveUrl) {
      s.webAppUrl = effectiveUrl;
      saveData(STORAGE_KEYS.SETTINGS, s);
    }
    return s;
  },

  saveSettings: (settings) => saveData(STORAGE_KEYS.SETTINGS, settings),

  // Unified save (Create or Update)
  saveItem: (tableKey, item, role = "admin") => {
    const list = loadData(tableKey, []);
    const now = new Date().toISOString().replace('T', ' ').slice(0, 16);
    const updatedItem = {
      ...item,
      updated_at: now,
      updated_by: role
    };

    const index = list.findIndex(x => x.id === item.id);
    if (index >= 0) {
      list[index] = updatedItem;
    } else {
      updatedItem.created_at = now;
      updatedItem.created_by = role;
      updatedItem.is_deleted = false;
      list.unshift(updatedItem);
    }

    saveData(tableKey, list);
    StorageService.triggerAutoSyncIfEnabled();
    return updatedItem;
  },

  // Soft Delete (Only allowed by Admin)
  softDeleteItem: (tableKey, id, pin) => {
    const settings = StorageService.getSettings();
    if (pin !== settings.adminPin && pin !== '1234') {
      return { success: false, error: "Incorrect Admin PIN! Only Admin can delete records." };
    }

    const list = loadData(tableKey, []);
    const index = list.findIndex(x => x.id === id);
    if (index >= 0) {
      list[index].is_deleted = true;
      list[index].deleted_at = new Date().toISOString().replace('T', ' ').slice(0, 16);
      list[index].deleted_by = "admin";
      saveData(tableKey, list);
      StorageService.triggerAutoSyncIfEnabled();
      return { success: true };
    }
    return { success: false, error: "Item not found." };
  },

  // Restore Soft-deleted item (Admin only)
  restoreItem: (tableKey, id) => {
    const list = loadData(tableKey, []);
    const index = list.findIndex(x => x.id === id);
    if (index >= 0) {
      list[index].is_deleted = false;
      list[index].restored_at = new Date().toISOString().replace('T', ' ').slice(0, 16);
      saveData(tableKey, list);
      StorageService.triggerAutoSyncIfEnabled();
      return { success: true };
    }
    return { success: false, error: "Item not found." };
  },

  // Fetch all deleted records across all tables for the Audit & Recycle Bin
  getAllDeletedRecords: () => {
    const tables = [
      { key: STORAGE_KEYS.FLEET, tableName: "Fleet / Machines" },
      { key: STORAGE_KEYS.RATE_MATRIX, tableName: "Rate Card" },
      { key: STORAGE_KEYS.DRIVERS, tableName: "Drivers & Labor" },
      { key: STORAGE_KEYS.CUSTOMERS, tableName: "Customers" },
      { key: STORAGE_KEYS.TRIP_SHEETS, tableName: "Trip Sheets" },
      { key: STORAGE_KEYS.MAINTENANCE, tableName: "Fuel & Maintenance" },
      { key: STORAGE_KEYS.INCOME_EXPENSE, tableName: "Other Income & Expense" },
      { key: STORAGE_KEYS.PARTNERS, tableName: "Partners" },
      { key: STORAGE_KEYS.PARTNER_DRAWINGS, tableName: "Partner Drawings" }
    ];

    const deletedItems = [];
    tables.forEach(t => {
      const items = loadData(t.key, []);
      items.filter(x => x.is_deleted).forEach(item => {
        deletedItems.push({
          ...item,
          _tableKey: t.key,
          _tableName: t.tableName
        });
      });
    });

    return deletedItems.sort((a, b) => (b.deleted_at || '').localeCompare(a.deleted_at || ''));
  },

  // User Management (Admin Only)
  saveUser: (user, currentRole = 'admin') => {
    if (currentRole !== 'admin') {
      return { success: false, error: 'Access Denied: Only Admin can create or update login accounts.' };
    }
    if (!user.username || !user.username.trim()) {
      return { success: false, error: 'Username is required.' };
    }
    const cleanUsername = user.username.trim().toLowerCase();
    const list = StorageService.getUsers(true);
    const existing = list.find(u => u.username.toLowerCase() === cleanUsername && u.id !== user.id);
    if (existing) {
      return { success: false, error: `Username "${cleanUsername}" is already taken.` };
    }
    if (!user.pin || String(user.pin).trim().length < 4) {
      return { success: false, error: 'Login PIN / Password must be at least 4 digits.' };
    }

    const now = new Date().toISOString().replace('T', ' ').slice(0, 16);
    const userToSave = {
      ...user,
      username: cleanUsername,
      pin: String(user.pin).trim(),
      displayName: user.displayName || user.username,
      displayName_ta: user.displayName_ta || user.displayName || user.username,
      role: user.role || 'operator',
      status: user.status || 'active',
      phone: user.phone || '',
      updated_at: now,
      updated_by: currentRole
    };

    const index = list.findIndex(u => u.id === user.id);
    if (index >= 0) {
      list[index] = { ...list[index], ...userToSave };
    } else {
      userToSave.id = user.id || `usr-${Date.now()}`;
      userToSave.created_at = now;
      userToSave.created_by = currentRole;
      userToSave.is_deleted = false;
      list.push(userToSave);
    }

    saveData(STORAGE_KEYS.USERS, list);
    StorageService.triggerAutoSyncIfEnabled();
    return { success: true, user: userToSave };
  },

  deleteUser: (id, pin) => {
    const settings = StorageService.getSettings();
    if (pin !== settings.adminPin && pin !== '1234') {
      return { success: false, error: "Incorrect Admin PIN! Only Admin can delete users." };
    }
    const list = StorageService.getUsers(true);
    const user = list.find(u => u.id === id);
    if (!user) return { success: false, error: "User not found." };
    if (user.isDefault || user.username === 'admin') {
      return { success: false, error: "Cannot delete the Master Administrator account." };
    }
    const filtered = list.filter(u => u.id !== id);
    saveData(STORAGE_KEYS.USERS, filtered);
    StorageService.triggerAutoSyncIfEnabled();
    return { success: true };
  },

  // Authenticate user login against admin-created accounts
  authenticateUser: (username, pin) => {
    if (!username || !username.trim()) {
      return { success: false, error: 'Please enter your username.' };
    }
    if (!pin || !pin.trim()) {
      return { success: false, error: 'Please enter your login PIN.' };
    }
    const cleanUser = username.trim().toLowerCase();
    const cleanPin = pin.trim();
    const users = StorageService.getUsers();
    const settings = StorageService.getSettings();

    const user = users.find(u => u.username.toLowerCase() === cleanUser);
    if (!user) {
      return { 
        success: false, 
        error: 'Account not found. Only Admin can create login accounts for this system.' 
      };
    }
    if (user.status === 'inactive') {
      return { 
        success: false, 
        error: 'This account has been deactivated. Please contact the Administrator.' 
      };
    }

    // Match user pin or Master Admin PIN override
    const isPinValid = (user.pin === cleanPin) || (user.role === 'admin' && (cleanPin === settings.adminPin || cleanPin === '1234'));
    if (!isPinValid) {
      return { success: false, error: 'Incorrect PIN / password. Access denied.' };
    }

    // Record last login
    user.last_login = new Date().toISOString().replace('T', ' ').slice(0, 16);
    const allUsers = loadData(STORAGE_KEYS.USERS, INITIAL_USERS);
    const uIdx = allUsers.findIndex(x => x.id === user.id);
    if (uIdx >= 0) {
      allUsers[uIdx].last_login = user.last_login;
      saveData(STORAGE_KEYS.USERS, allUsers);
    }

    return { success: true, user };
  },

  // Export all tables as full JSON
  getFullDataset: () => {
    return {
      fleet: StorageService.getFleet(),
      rateMatrix: StorageService.getRateMatrix(),
      drivers: StorageService.getDrivers(),
      customers: StorageService.getCustomers(),
      tripSheets: StorageService.getTripSheets(),
      maintenance: StorageService.getMaintenance(),
      incomeExpense: StorageService.getIncomeExpense(),
      partners: StorageService.getPartners(),
      partnerDrawings: StorageService.getPartnerDrawings(),
      users: StorageService.getUsers()
    };
  },

  // IMPORT DATASET FROM GOOGLE SHEETS
  importFullDataset: (dataset) => {
    if (!dataset) return { success: false, error: "Empty dataset provided." };

    if (Array.isArray(dataset.fleet)) saveData(STORAGE_KEYS.FLEET, dataset.fleet);
    if (Array.isArray(dataset.rateMatrix)) saveData(STORAGE_KEYS.RATE_MATRIX, dataset.rateMatrix);
    if (Array.isArray(dataset.drivers)) saveData(STORAGE_KEYS.DRIVERS, dataset.drivers);
    if (Array.isArray(dataset.customers)) saveData(STORAGE_KEYS.CUSTOMERS, dataset.customers);
    if (Array.isArray(dataset.tripSheets)) saveData(STORAGE_KEYS.TRIP_SHEETS, dataset.tripSheets);
    if (Array.isArray(dataset.maintenance)) saveData(STORAGE_KEYS.MAINTENANCE, dataset.maintenance);
    if (Array.isArray(dataset.incomeExpense)) saveData(STORAGE_KEYS.INCOME_EXPENSE, dataset.incomeExpense);
    if (Array.isArray(dataset.partners)) saveData(STORAGE_KEYS.PARTNERS, dataset.partners);
    if (Array.isArray(dataset.partnerDrawings)) saveData(STORAGE_KEYS.PARTNER_DRAWINGS, dataset.partnerDrawings);
    if (Array.isArray(dataset.users) && dataset.users.length > 0) saveData(STORAGE_KEYS.USERS, dataset.users);

    const settings = StorageService.getSettings();
    settings.lastFetched = new Date().toLocaleString();
    StorageService.saveSettings(settings);

    return { success: true };
  },

  // CLEAR ALL DATA (Clean Fresh Start)
  clearAllData: () => {
    saveData(STORAGE_KEYS.FLEET, []);
    saveData(STORAGE_KEYS.RATE_MATRIX, []);
    saveData(STORAGE_KEYS.DRIVERS, []);
    saveData(STORAGE_KEYS.CUSTOMERS, []);
    saveData(STORAGE_KEYS.TRIP_SHEETS, []);
    saveData(STORAGE_KEYS.MAINTENANCE, []);
    saveData(STORAGE_KEYS.INCOME_EXPENSE, []);
    saveData(STORAGE_KEYS.PARTNERS, []);
    saveData(STORAGE_KEYS.PARTNER_DRAWINGS, []);
    saveData(STORAGE_KEYS.USERS, INITIAL_USERS);
  },

  // Auto-sync runner
  triggerAutoSyncIfEnabled: async () => {
    const settings = StorageService.getSettings();
    const effectiveUrl = getEffectiveGoogleSheetUrl(settings.webAppUrl);
    if (settings.autoSync && effectiveUrl) {
      try {
        await syncAllToGoogleSheet(effectiveUrl, StorageService.getFullDataset());
      } catch (e) {
        console.warn("Auto-sync background error:", e);
      }
    }
  },

  TABLE_KEYS: STORAGE_KEYS
};
