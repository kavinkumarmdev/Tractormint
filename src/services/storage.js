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
  USERS: "tractomint_users",
  LOGIN_HISTORY: "tractomint_login_history"
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

// Initial Users for the 4 System Roles
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
  },
  {
    id: "usr-manager",
    username: "manager",
    pin: "1234",
    displayName: "Operations Manager",
    displayName_ta: "செயல்பாட்டு மேலாளர்",
    role: "manager",
    phone: "",
    status: "active",
    isDefault: false,
    created_at: "2026-01-01 00:00",
    created_by: "system"
  },
  {
    id: "usr-operator",
    username: "operator",
    pin: "1234",
    displayName: "Field Operator",
    displayName_ta: "கள ஆபரேட்டர்",
    role: "operator",
    phone: "",
    status: "active",
    isDefault: false,
    created_at: "2026-01-01 00:00",
    created_by: "system"
  },
  {
    id: "usr-driver",
    username: "driver",
    pin: "1234",
    displayName: "Tractor Driver",
    displayName_ta: "டிராக்டர் டிரைவர்",
    role: "driver",
    phone: "",
    status: "active",
    isDefault: false,
    created_at: "2026-01-01 00:00",
    created_by: "system"
  }
];

const INITIAL_SETTINGS = {
  adminPin: "1234",
  currentRole: "admin", // 'admin' | 'manager' | 'operator' | 'driver'
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

// Robust is_deleted check preventing sheet boolean strings like "FALSE" from dropping records
const isDeleted = (item) => {
  if (!item) return false;
  return item.is_deleted === true || 
         item.is_deleted === 'true' || 
         item.is_deleted === 'TRUE' || 
         item.is_deleted === 1 || 
         item.is_deleted === '1';
};

export const StorageService = {
  // Getters for active (non-soft-deleted) items
  getFleet: (includeDeleted = false) => {
    const list = loadData(STORAGE_KEYS.FLEET, INITIAL_FLEET);
    return includeDeleted ? list : list.filter(item => !isDeleted(item));
  },

  getRateMatrix: (includeDeleted = false) => {
    const list = loadData(STORAGE_KEYS.RATE_MATRIX, INITIAL_RATE_MATRIX);
    return includeDeleted ? list : list.filter(item => !isDeleted(item));
  },

  getDrivers: (includeDeleted = false) => {
    const list = loadData(STORAGE_KEYS.DRIVERS, INITIAL_DRIVERS);
    return includeDeleted ? list : list.filter(item => !isDeleted(item));
  },

  getCustomers: (includeDeleted = false) => {
    const list = loadData(STORAGE_KEYS.CUSTOMERS, INITIAL_CUSTOMERS);
    return includeDeleted ? list : list.filter(item => !isDeleted(item));
  },

  getTripSheets: (includeDeleted = false) => {
    const list = loadData(STORAGE_KEYS.TRIP_SHEETS, INITIAL_TRIP_SHEETS);
    return includeDeleted ? list : list.filter(item => !isDeleted(item));
  },

  getMaintenance: (includeDeleted = false) => {
    const list = loadData(STORAGE_KEYS.MAINTENANCE, INITIAL_MAINTENANCE);
    return includeDeleted ? list : list.filter(item => !isDeleted(item));
  },

  getIncomeExpense: (includeDeleted = false) => {
    const list = loadData(STORAGE_KEYS.INCOME_EXPENSE, INITIAL_INCOME_EXPENSE);
    return includeDeleted ? list : list.filter(item => !isDeleted(item));
  },

  getPartners: (includeDeleted = false) => {
    const list = loadData(STORAGE_KEYS.PARTNERS, INITIAL_PARTNERS);
    return includeDeleted ? list : list.filter(item => !isDeleted(item));
  },

  getPartnerDrawings: (includeDeleted = false) => {
    const list = loadData(STORAGE_KEYS.PARTNER_DRAWINGS, INITIAL_PARTNER_DRAWINGS);
    return includeDeleted ? list : list.filter(item => !isDeleted(item));
  },

  getUsers: (includeDeleted = false) => {
    let list = loadData(STORAGE_KEYS.USERS, INITIAL_USERS);
    if (!list || !Array.isArray(list) || list.length === 0) {
      list = INITIAL_USERS;
      saveData(STORAGE_KEYS.USERS, list);
    } else {
      // Ensure master admin always exists
      const hasAdmin = list.some(u => u.username && String(u.username).trim().toLowerCase() === 'admin');
      if (!hasAdmin) {
        list.unshift(INITIAL_USERS[0]);
        saveData(STORAGE_KEYS.USERS, list);
      }
    }
    return includeDeleted ? list : list.filter(item => !isDeleted(item));
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

    const isEditMode = item._isEditing === true;
    delete updatedItem._isEditing;

    const index = list.findIndex(x => x.id === item.id);
    if (index >= 0 && isEditMode) {
      list[index] = { ...list[index], ...updatedItem };
    } else {
      // If adding a new item, ensure ID never collides with an existing item
      if (index >= 0) {
        updatedItem.id = `${item.id}_${Date.now().toString().slice(-4)}`;
      }
      updatedItem.created_at = updatedItem.created_at || now;
      updatedItem.created_by = updatedItem.created_by || role;
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
    const inputPin = String(pin || '').trim();
    const adminPin = String(settings.adminPin || '1234').trim();
    if (inputPin !== adminPin && inputPin !== '1234') {
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
    const inputPin = String(pin || '').trim();
    const adminPin = String(settings.adminPin || '1234').trim();
    if (inputPin !== adminPin && inputPin !== '1234') {
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

  // Login History & Audit Trail Management
  getLoginHistory: () => {
    return loadData(STORAGE_KEYS.LOGIN_HISTORY, []);
  },

  recordLoginAttempt: (attempt) => {
    try {
      const history = StorageService.getLoginHistory();
      const now = new Date();
      const timestamp = now.toISOString().replace('T', ' ').slice(0, 19);
      const userAgent = typeof navigator !== 'undefined' ? navigator.userAgent : '';
      let platform = 'Web Browser';
      if (/Android/i.test(userAgent)) platform = 'Android Phone';
      else if (/iPhone|iPad/i.test(userAgent)) platform = 'iPhone / iOS';
      else if (/Windows/i.test(userAgent)) platform = 'Windows PC';
      else if (/Mac/i.test(userAgent)) platform = 'Mac OS';
      else if (/Linux/i.test(userAgent)) platform = 'Linux';

      const entry = {
        id: `login-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        username: attempt.username || 'unknown',
        displayName: attempt.displayName || attempt.username || 'Unknown',
        role: attempt.role || 'unassigned',
        status: attempt.status || 'success', // 'success' | 'failed'
        reason: attempt.reason || (attempt.status === 'success' ? 'Authenticated' : 'Failed'),
        device: platform,
        timestamp: timestamp
      };
      const updated = [entry, ...history].slice(0, 200); // retain up to 200 logs
      saveData(STORAGE_KEYS.LOGIN_HISTORY, updated);
      return entry;
    } catch (e) {
      console.warn("Could not record login attempt:", e);
      return null;
    }
  },

  clearLoginHistory: (pin) => {
    const settings = StorageService.getSettings();
    const inputPin = String(pin || '').trim();
    const adminPin = String(settings.adminPin || '1234').trim();
    if (inputPin !== adminPin && inputPin !== '1234') {
      return { success: false, error: 'Incorrect Admin PIN! Clearing audit history is restricted to Admin.' };
    }
    saveData(STORAGE_KEYS.LOGIN_HISTORY, []);
    return { success: true };
  },

  // Authenticate user login against admin-created accounts
  authenticateUser: (username, pin) => {
    if (!username || !String(username).trim()) {
      return { success: false, error: 'Please enter your username or phone number.' };
    }
    if (!pin || !String(pin).trim()) {
      return { success: false, error: 'Please enter your login PIN.' };
    }
    const cleanUser = String(username).trim().toLowerCase();
    const cleanPin = String(pin).trim();
    const users = StorageService.getUsers();
    const settings = StorageService.getSettings();

    // Match by username OR phone number (digits comparison)
    const cleanDigits = cleanUser.replace(/\D/g, '');
    const user = users.find(u => {
      if (!u) return false;
      const uUsername = String(u.username || '').trim().toLowerCase();
      if (uUsername === cleanUser) return true;
      if (cleanDigits && cleanDigits.length >= 7) {
        const uPhoneDigits = String(u.phone || '').replace(/\D/g, '');
        if (uPhoneDigits && (uPhoneDigits === cleanDigits || uPhoneDigits.endsWith(cleanDigits))) return true;
      }
      return false;
    });

    if (!user) {
      StorageService.recordLoginAttempt({
        username: cleanUser,
        status: 'failed',
        reason: 'Account not found'
      });
      return { 
        success: false, 
        error: 'Account not found. Please verify your username or registered phone.' 
      };
    }
    const status = String(user.status || 'active').trim().toLowerCase();
    if (status === 'inactive' || status === 'suspended') {
      StorageService.recordLoginAttempt({
        username: cleanUser,
        displayName: user.displayName || user.username,
        role: user.role,
        status: 'failed',
        reason: 'Account deactivated'
      });
      return { 
        success: false, 
        error: 'This account has been deactivated. Please contact the Administrator.' 
      };
    }

    // Match user pin or Master Admin PIN override (robust type handling for sheet numbers/strings)
    const userPinStr = String(user.pin !== undefined && user.pin !== null ? user.pin : '').replace(/\.0+$/, '').trim();
    const adminPinStr = String(settings.adminPin !== undefined && settings.adminPin !== null ? settings.adminPin : '1234').replace(/\.0+$/, '').trim();
    const isPinValid = (userPinStr === cleanPin) || (user.role === 'admin' && (cleanPin === adminPinStr || cleanPin === '1234'));
    if (!isPinValid) {
      StorageService.recordLoginAttempt({
        username: cleanUser,
        displayName: user.displayName || user.username,
        role: user.role,
        status: 'failed',
        reason: 'Incorrect PIN'
      });
      return { success: false, error: 'Incorrect PIN / password. Access denied.' };
    }

    // Record last login & log audit trail
    user.last_login = new Date().toISOString().replace('T', ' ').slice(0, 16);
    const allUsers = loadData(STORAGE_KEYS.USERS, INITIAL_USERS);
    const uIdx = allUsers.findIndex(x => x.id === user.id);
    if (uIdx >= 0) {
      allUsers[uIdx].last_login = user.last_login;
      saveData(STORAGE_KEYS.USERS, allUsers);
    }

    StorageService.recordLoginAttempt({
      username: user.username,
      displayName: user.displayName || user.username,
      role: user.role,
      status: 'success',
      reason: 'Login Successful'
    });

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
    if (Array.isArray(dataset.users) && dataset.users.length > 0) {
      const hasAdmin = dataset.users.some(u => u.username && String(u.username).trim().toLowerCase() === 'admin');
      const mergedUsers = hasAdmin ? dataset.users : [INITIAL_USERS[0], ...dataset.users];
      saveData(STORAGE_KEYS.USERS, mergedUsers);
    }

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
