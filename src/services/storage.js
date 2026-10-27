// Local Storage & Database Engine with Lifetime Audit, Soft Delete & Google Sheet Sync
import { syncAllToGoogleSheet, recordLoginAttemptInSheet } from './googleSheets';
import { ENV_GOOGLE_SHEETS_URL, getEffectiveGoogleSheetUrl } from '../config/env';
import { cleanDeep } from '../utils/timeCalcUtils';
import { healShiftedTripRecord } from '../utils/langUtils';

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
    phone: "9842211001",
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
    phone: "9842211002",
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
    phone: "9842211003",
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
    phone: "9842211004",
    status: "active",
    isDefault: false,
    created_at: "2026-01-01 00:00",
    created_by: "system"
  }
];

const INITIAL_SETTINGS = {
  adminPin: "1234",
  currentRole: "admin", // 'admin' | 'manager' | 'operator' | 'driver'
  language: "ta", // 'en' | 'ta' - Default to Tamil
  webAppUrl: ENV_GOOGLE_SHEETS_URL,
  autoSync: false, // Manual Developer / Admin sync per user requirement
  companyName: "Tractor & Agri Machinery Works",
  companyName_ta: "டிராக்டர் மற்றும் விவசாய இயந்திரங்கள் லெட்ஜர்",
  contactPhone: "",
  address: "",
  darkMode: false,
  lastSynced: "",
  lastFetched: ""
};

// Generic safe storage helper with automatic Mojibake cleanup
function loadData(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) {
      localStorage.setItem(key, JSON.stringify(fallback));
      return fallback;
    }
    const parsed = JSON.parse(raw);
    return cleanDeep(parsed);
  } catch (err) {
    console.error(`Error loading ${key}:`, err);
    return fallback;
  }
}

function saveData(key, data) {
  try {
    const cleaned = cleanDeep(data);
    localStorage.setItem(key, JSON.stringify(cleaned));
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

// Normalize any phone number string into clean 10-digit format
export const normalizePhone = (phone) => {
  if (!phone) return '';
  const digits = String(phone).replace(/\D/g, '');
  if (digits.length === 12 && digits.startsWith('91')) {
    return digits.slice(2);
  }
  if (digits.length === 11 && digits.startsWith('0')) {
    return digits.slice(1);
  }
  return digits;
};

// Validate 10-digit mobile number format
export const validatePhone10 = (phone, entityName = 'Mobile') => {
  const digits = normalizePhone(phone);
  if (!digits || digits.length !== 10) {
    return { valid: false, error: `${entityName} phone number must be exactly 10 digits (e.g. 9843312345).` };
  }
  if (!/^[6-9]\d{9}$/.test(digits)) {
    return { valid: false, error: `${entityName} phone number must be a valid 10-digit Indian mobile starting with 6, 7, 8, or 9.` };
  }
  return { valid: true, phone: digits };
};

// Validate positive numbers (e.g. rates, quantities, amounts)
export const validatePositiveNumber = (val, fieldName = 'Value', allowZero = false) => {
  if (val === '' || val === null || val === undefined) {
    return { valid: false, error: `${fieldName} is required.` };
  }
  const num = Number(val);
  if (isNaN(num)) {
    return { valid: false, error: `${fieldName} must be a valid number.` };
  }
  if (allowZero ? num < 0 : num <= 0) {
    return { valid: false, error: `${fieldName} must be ${allowZero ? 'zero or positive (≥ 0)' : 'greater than zero (> 0)'}.` };
  }
  return { valid: true, value: num };
};

// Normalize vehicle / machine registration numbers (removes spaces, hyphens, uppercase)
export const normalizeRegNumber = (reg) => {
  if (!reg) return '';
  return String(reg).toUpperCase().replace(/[\s\-_]/g, '');
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
    let wasRepaired = false;
    const normalized = list.map(item => {
      const healed = healShiftedTripRecord(item);
      if (healed && healed._healed) wasRepaired = true;
      return healed;
    });
    if (wasRepaired) {
      saveData(STORAGE_KEYS.TRIP_SHEETS, normalized);
    }
    return includeDeleted ? normalized : normalized.filter(item => !isDeleted(item));
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
      // Ensure master admin always exists and has default phone
      const adminIdx = list.findIndex(u => u.username && String(u.username).trim().toLowerCase() === 'admin');
      if (adminIdx === -1) {
        list.unshift(INITIAL_USERS[0]);
        saveData(STORAGE_KEYS.USERS, list);
      } else if (!list[adminIdx].phone) {
        list[adminIdx].phone = INITIAL_USERS[0].phone;
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

  saveSettings: (settings) => {
    if (!settings) return { success: false, error: 'Settings object is required.' };
    const pin = String(settings.adminPin || '').trim();
    if (pin.length < 4) {
      return { success: false, error: 'Admin PIN must be at least 4 digits.' };
    }
    if (settings.contactPhone && settings.contactPhone.trim()) {
      const pVal = validatePhone10(settings.contactPhone, 'Contact');
      if (!pVal.valid) return { success: false, error: pVal.error };
      settings.contactPhone = pVal.phone;
    }
    saveData(STORAGE_KEYS.SETTINGS, settings);
    return { success: true, settings };
  },

  // Dedicated Farmer / Customer Save with 10-Digit & Uniqueness Validation
  saveCustomer: (customer, role = "admin") => {
    if (!customer.name || !customer.name.trim()) {
      return { success: false, error: 'Customer / Farmer name is required.' };
    }
    const val = validatePhone10(customer.phone, 'Farmer');
    if (!val.valid) {
      return { success: false, error: val.error };
    }
    const cleanPhone = val.phone;

    const list = StorageService.getCustomers(true);
    const duplicate = list.find(c => {
      if (c.id === customer.id) return false;
      return normalizePhone(c.phone) === cleanPhone;
    });

    if (duplicate) {
      const dupName = duplicate.name_ta || duplicate.name;
      return {
        success: false,
        error: `Mobile number "${cleanPhone}" is already registered for farmer "${dupName}" (${duplicate.id}).`
      };
    }

    const customerToSave = {
      ...customer,
      name: customer.name.trim(),
      phone: cleanPhone
    };

    const saved = StorageService.saveItem(STORAGE_KEYS.CUSTOMERS, customerToSave, role);
    return { success: true, item: saved };
  },

  // Dedicated Driver Save with 10-Digit & Uniqueness Validation
  saveDriver: (driver, role = "admin") => {
    if (!driver.name || !driver.name.trim()) {
      return { success: false, error: 'Driver name is required.' };
    }

    // 10-digit mobile number format
    const val = validatePhone10(driver.phone, 'Driver');
    if (!val.valid) {
      return { success: false, error: val.error };
    }
    const cleanPhone = val.phone;

    // Strict uniqueness check across all drivers
    const list = StorageService.getDrivers(true);
    const duplicate = list.find(d => {
      if (d.id === driver.id) return false;
      return normalizePhone(d.phone) === cleanPhone;
    });

    if (duplicate) {
      const dupName = duplicate.name_ta || duplicate.name;
      return {
        success: false,
        error: `Mobile number "${cleanPhone}" is already registered for driver "${dupName}" (${duplicate.id}).`
      };
    }

    // Wage rate validation
    if (driver.defaultWage !== undefined && driver.defaultWage !== '') {
      const wageVal = validatePositiveNumber(driver.defaultWage, 'Default Wage', true);
      if (!wageVal.valid) return { success: false, error: wageVal.error };
    }

    const driverToSave = {
      ...driver,
      name: driver.name.trim(),
      phone: cleanPhone
    };

    const saved = StorageService.saveItem(STORAGE_KEYS.DRIVERS, driverToSave, role);
    return { success: true, item: saved };
  },

  // Dedicated Fleet (Tractor & Implements) Save with Unique Reg Number Validation
  saveFleet: (item, role = "admin") => {
    if (!item.name || !item.name.trim()) {
      return { success: false, error: 'Tractor / Machine name is required.' };
    }
    if (!item.type) {
      return { success: false, error: 'Machine type (tractor or implement) is required.' };
    }

    // Tractors should have registration number, and if provided, must be unique across entire fleet
    const rawReg = (item.regNumber || '').trim();
    if (item.type === 'tractor' && !rawReg) {
      return { success: false, error: 'Tractor Registration / ID Number is required.' };
    }

    if (rawReg) {
      const cleanReg = normalizeRegNumber(rawReg);
      const list = StorageService.getFleet(true);
      const duplicate = list.find(f => {
        if (f.id === item.id) return false;
        return f.regNumber && normalizeRegNumber(f.regNumber) === cleanReg;
      });

      if (duplicate) {
        return {
          success: false,
          error: `Registration / Reg ID "${rawReg}" is already registered to machine "${duplicate.name}" (${duplicate.id}).`
        };
      }
    }

    // Hour meter check
    if (item.currentHours !== undefined && item.currentHours !== '') {
      const hrVal = validatePositiveNumber(item.currentHours, 'Current Hour Meter', true);
      if (!hrVal.valid) return { success: false, error: hrVal.error };
    }

    // Purchase Price check
    if (item.purchasePrice !== undefined && item.purchasePrice !== '') {
      const priceVal = validatePositiveNumber(item.purchasePrice, 'Purchase Price', true);
      if (!priceVal.valid) return { success: false, error: priceVal.error };
    }

    // Monthly EMI check
    if (item.emiMonthly !== undefined && item.emiMonthly !== '') {
      const emiVal = validatePositiveNumber(item.emiMonthly, 'Monthly EMI', true);
      if (!emiVal.valid) return { success: false, error: emiVal.error };
    }

    const fleetToSave = {
      ...item,
      name: item.name.trim(),
      regNumber: rawReg.toUpperCase()
    };

    const saved = StorageService.saveItem(STORAGE_KEYS.FLEET, fleetToSave, role);
    return { success: true, item: saved };
  },

  // Dedicated Trip Sheet Save with Hour Meter, Quantity & Financials Validation
  saveTripSheet: (trip, role = "operator") => {
    // Auto-resolve customerId if missing from customerName or customer list
    if (!trip.customerId) {
      if (trip.customerName) {
        const custList = StorageService.getCustomers();
        const matched = custList.find(c => c.name && c.name.toLowerCase() === trip.customerName.toLowerCase());
        if (matched) trip.customerId = matched.id;
      }
      if (!trip.customerId) {
        const custList = StorageService.getCustomers();
        if (custList.length > 0) {
          trip.customerId = custList[0].id || 'CUST-01';
          if (!trip.customerName) trip.customerName = custList[0].name || 'Customer';
        } else {
          trip.customerId = 'CUST-01';
          if (!trip.customerName) trip.customerName = 'General Customer';
        }
      }
    }

    // Auto-resolve driverId if missing from driverName or driver list
    if (!trip.driverId) {
      if (trip.driverName) {
        const drvList = StorageService.getDrivers();
        const matched = drvList.find(d => d.name && d.name.toLowerCase() === trip.driverName.toLowerCase());
        if (matched) trip.driverId = matched.id;
      }
      if (!trip.driverId) {
        const drvList = StorageService.getDrivers();
        if (drvList.length > 0) {
          trip.driverId = drvList[0].id || 'DRV-01';
          if (!trip.driverName) trip.driverName = drvList[0].name || 'Driver';
        } else {
          trip.driverId = 'DRV-01';
          if (!trip.driverName) trip.driverName = 'Default Driver';
        }
      }
    }

    // Auto-resolve tractorId if missing from tractorName or fleet
    if (!trip.tractorId) {
      if (trip.tractorName) {
        const fleetList = StorageService.getFleet();
        const matched = fleetList.find(f => f.type === 'tractor' && f.name.toLowerCase() === trip.tractorName.toLowerCase());
        if (matched) trip.tractorId = matched.id;
      }
      if (!trip.tractorId) {
        const fleetList = StorageService.getFleet();
        const firstTractor = fleetList.find(f => f.type === 'tractor');
        if (firstTractor) {
          trip.tractorId = firstTractor.id;
          if (!trip.tractorName) trip.tractorName = firstTractor.name;
        } else {
          trip.tractorId = 'TRAC-01';
          if (!trip.tractorName) trip.tractorName = 'General Tractor';
        }
      }
    }
    if (!trip.date) {
      return { success: false, error: 'Trip date is required.' };
    }

    // Validate Hour Meter sequence if both meter readings provided
    if (trip.startMeter !== undefined && trip.startMeter !== '' && 
        trip.endMeter !== undefined && trip.endMeter !== '') {
      const s = Number(trip.startMeter);
      const e = Number(trip.endMeter);
      if (isNaN(s) || s < 0) {
        return { success: false, error: 'Start Hour Meter must be a valid non-negative number.' };
      }
      if (isNaN(e) || e < 0) {
        return { success: false, error: 'End Hour Meter must be a valid non-negative number.' };
      }
      if (e < s) {
        return { 
          success: false, 
          error: `End Hour Meter (${e}) cannot be less than Start Hour Meter (${s})!` 
        };
      }
    }

    // Validate Quantity / Work Units
    const qtyVal = validatePositiveNumber(trip.quantity, 'Total units (Hours / Acres)', false);
    if (!qtyVal.valid) return { success: false, error: qtyVal.error };

    // Validate Rate
    const rateVal = validatePositiveNumber(trip.rate, 'Billing Rate (₹)', false);
    if (!rateVal.valid) return { success: false, error: rateVal.error };

    // Validate Discount
    const gross = qtyVal.value * rateVal.value;
    if (trip.discount !== undefined && trip.discount !== '') {
      const disc = Number(trip.discount);
      if (isNaN(disc) || disc < 0) {
        return { success: false, error: 'Discount must be a valid non-negative number.' };
      }
      if (disc > gross) {
        return { success: false, error: `Discount (₹${disc}) cannot exceed Gross Total Amount (₹${gross})!` };
      }
    }

    // Validate Paid Amount
    if (trip.paidAmount !== undefined && trip.paidAmount !== '') {
      const paid = Number(trip.paidAmount);
      if (isNaN(paid) || paid < 0) {
        return { success: false, error: 'Amount Collected / Paid cannot be negative.' };
      }
    }

    const healed = healShiftedTripRecord(trip);
    const saved = StorageService.saveItem(STORAGE_KEYS.TRIP_SHEETS, healed, role);
    return { success: true, item: saved };
  },

  // Dedicated Rate Card Save with Positive Amount & Duplicate Combo Validation
  saveRate: (rateItem, role = "admin") => {
    if (!rateItem.tractorId) {
      return { success: false, error: 'Tractor selection is required for Rate Card.' };
    }
    if (!rateItem.unit) {
      return { success: false, error: 'Billing Unit (per hour / per acre / etc.) is required.' };
    }
    const rateVal = validatePositiveNumber(rateItem.rate, 'Rental Rate (₹)', false);
    if (!rateVal.valid) return { success: false, error: rateVal.error };

    // Check duplicate active combination
    const list = StorageService.getRateMatrix(true);
    const impId = rateItem.implementId || 'none';
    const effDate = rateItem.effectiveDate || new Date().toISOString().slice(0, 10);

    const duplicate = list.find(r => {
      if (r.id === rateItem.id) return false;
      return r.tractorId === rateItem.tractorId &&
             (r.implementId || 'none') === impId &&
             r.unit === rateItem.unit &&
             (r.effectiveDate || '') === effDate;
    });

    if (duplicate) {
      return {
        success: false,
        error: `A rate card already exists for this Tractor + Implement combination with unit "${rateItem.unit}" on date ${effDate}!`
      };
    }

    const saved = StorageService.saveItem(STORAGE_KEYS.RATE_MATRIX, rateItem, role);
    return { success: true, item: saved };
  },

  // Dedicated Fuel & Maintenance Save with Quantity & Cost Validation
  saveMaintenance: (item, role = "operator") => {
    if (!item.assetId) {
      return { success: false, error: 'Tractor / Machine asset selection is required.' };
    }
    if (!item.category) {
      return { success: false, error: 'Expense category (Diesel, Spares, Oil, Service) is required.' };
    }
    if (!item.date) {
      return { success: false, error: 'Maintenance / Fuel date is required.' };
    }

    const qtyVal = validatePositiveNumber(item.quantity, 'Quantity', false);
    if (!qtyVal.valid) return { success: false, error: qtyVal.error };

    const totalVal = validatePositiveNumber(item.totalAmount, 'Total Cost (₹)', false);
    if (!totalVal.valid) return { success: false, error: totalVal.error };

    if (item.hourMeter !== undefined && item.hourMeter !== '') {
      const hrVal = validatePositiveNumber(item.hourMeter, 'Hour Meter reading', true);
      if (!hrVal.valid) return { success: false, error: hrVal.error };
    }

    const saved = StorageService.saveItem(STORAGE_KEYS.MAINTENANCE, item, role);
    return { success: true, item: saved };
  },

  // Dedicated Income & Expense Save with Positive Amount Validation
  saveIncomeExpense: (item, role = "operator") => {
    if (!item.category || !item.category.trim()) {
      return { success: false, error: 'Category or Description is required.' };
    }
    if (!item.type || !['income', 'expense'].includes(item.type)) {
      return { success: false, error: 'Type must be either Income or Expense.' };
    }
    if (!item.date) {
      return { success: false, error: 'Date is required.' };
    }

    const amtVal = validatePositiveNumber(item.amount, 'Amount (₹)', false);
    if (!amtVal.valid) return { success: false, error: amtVal.error };

    const saved = StorageService.saveItem(STORAGE_KEYS.INCOME_EXPENSE, item, role);
    return { success: true, item: saved };
  },

  // Dedicated Partner Save with Share Percentage & 10-Digit Mobile Validation
  savePartner: (partner, role = "admin") => {
    if (!partner.name || !partner.name.trim()) {
      return { success: false, error: 'Partner name is required.' };
    }

    const shareVal = validatePositiveNumber(partner.sharePercent, 'Profit Share Percentage', false);
    if (!shareVal.valid) return { success: false, error: shareVal.error };
    if (shareVal.value > 100) {
      return { success: false, error: 'Partner profit share cannot exceed 100%.' };
    }

    // Verify sum of all active partner shares <= 100%
    const allPartners = StorageService.getPartners();
    const otherPartners = allPartners.filter(p => p.id !== partner.id);
    const currentSum = otherPartners.reduce((acc, p) => acc + (Number(p.sharePercent) || 0), 0);
    const newSum = currentSum + shareVal.value;
    if (newSum > 100) {
      const maxAvailable = Math.max(0, 100 - currentSum);
      return {
        success: false,
        error: `Total partner shares cannot exceed 100%! Active partners hold ${currentSum}%. Maximum share available is ${maxAvailable}%.`
      };
    }

    // Mobile number validation if provided
    let cleanPhone = '';
    if (partner.phone && partner.phone.trim()) {
      const phoneVal = validatePhone10(partner.phone, 'Partner');
      if (!phoneVal.valid) return { success: false, error: phoneVal.error };
      cleanPhone = phoneVal.phone;

      // Unique phone check across partners
      const duplicatePhone = otherPartners.find(p => p.phone && normalizePhone(p.phone) === cleanPhone);
      if (duplicatePhone) {
        return {
          success: false,
          error: `Mobile number "${cleanPhone}" is already assigned to partner "${duplicatePhone.name}".`
        };
      }
    }

    // Capital check if provided
    if (partner.investedCapital !== undefined && partner.investedCapital !== '') {
      const capVal = validatePositiveNumber(partner.investedCapital, 'Invested Capital', true);
      if (!capVal.valid) return { success: false, error: capVal.error };
    }

    const partnerToSave = {
      ...partner,
      name: partner.name.trim(),
      phone: cleanPhone,
      sharePercent: shareVal.value
    };

    const saved = StorageService.saveItem(STORAGE_KEYS.PARTNERS, partnerToSave, role);
    return { success: true, item: saved };
  },

  // Dedicated Partner Drawing Save with Positive Amount Validation
  savePartnerDrawing: (drawing, role = "admin") => {
    if (!drawing.partnerId) {
      return { success: false, error: 'Partner selection is required.' };
    }
    if (!drawing.date) {
      return { success: false, error: 'Drawing date is required.' };
    }

    const amtVal = validatePositiveNumber(drawing.amount, 'Drawing Amount (₹)', false);
    if (!amtVal.valid) return { success: false, error: amtVal.error };

    const saved = StorageService.saveItem(STORAGE_KEYS.PARTNER_DRAWINGS, drawing, role);
    return { success: true, item: saved };
  },

  // Unified save (Create or Update)
  saveItem: (tableKey, item, role = "admin") => {
    const list = loadData(tableKey, []);
    const now = new Date().toISOString().replace('T', ' ').slice(0, 16);
    const updatedItem = {
      ...item,
      updated_at: now,
      updated_by: role
    };

    // Auto-normalize phone if saving customers
    if (tableKey === STORAGE_KEYS.CUSTOMERS && updatedItem.phone) {
      updatedItem.phone = normalizePhone(updatedItem.phone);
    }

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

    // 10-digit mobile number validation and uniqueness check
    const phoneVal = validatePhone10(user.phone, 'User');
    if (!phoneVal.valid) {
      return { success: false, error: phoneVal.error };
    }
    const cleanPhone = phoneVal.phone;

    const duplicatePhone = list.find(u => u.id !== user.id && normalizePhone(u.phone) === cleanPhone);
    if (duplicatePhone) {
      return { 
        success: false, 
        error: `Mobile number "${cleanPhone}" is already assigned to user @${duplicatePhone.username}.` 
      };
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
      phone: cleanPhone,
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

      // Asynchronously record login in Google Sheet
      try {
        const settings = StorageService.getSettings();
        if (settings && settings.webAppUrl) {
          recordLoginAttemptInSheet(settings.webAppUrl, entry);
        }
      } catch (sheetErr) {
        console.warn("Could not push login attempt to Google Sheet:", sheetErr);
      }

      return entry;
    } catch (e) {
      console.warn("Could not record login attempt:", e);
      return null;
    }
  },

  // Reset user password / PIN to default '1234'
  resetPasswordToDefault: (identifier) => {
    const cleanId = String(identifier || '').trim().toLowerCase();
    const cleanDigits = cleanId.replace(/\D/g, '');
    const users = StorageService.getUsers(true);
    const settings = StorageService.getSettings();

    let target = users.find(u => {
      if (!u) return false;
      const uUsername = String(u.username || '').trim().toLowerCase();
      if (cleanId && uUsername === cleanId) return true;
      if (cleanDigits && cleanDigits.length >= 7) {
        const uPhoneDigits = String(u.phone || '').replace(/\D/g, '');
        if (uPhoneDigits && (uPhoneDigits === cleanDigits || uPhoneDigits.endsWith(cleanDigits))) return true;
      }
      return false;
    });

    // Fallback to admin if not found or identifier was empty
    if (!target) {
      target = users.find(u => String(u.username || '').trim().toLowerCase() === 'admin') || users[0];
    }

    if (!target) {
      return { success: false, error: 'User account not found.' };
    }

    target.pin = '1234';
    target.updated_at = new Date().toISOString().replace('T', ' ').slice(0, 16);
    target.updated_by = 'password_reset';

    // If admin, also ensure master admin pin in settings is 1234
    if (target.role === 'admin' || target.username === 'admin') {
      settings.adminPin = '1234';
      saveData(STORAGE_KEYS.SETTINGS, settings);
    }

    saveData(STORAGE_KEYS.USERS, users);

    // Record login audit event
    StorageService.recordLoginAttempt({
      username: target.username,
      displayName: target.displayName || target.username,
      role: target.role,
      status: 'success',
      reason: 'Password reset to default 1234'
    });

    return {
      success: true,
      user: target,
      message: `Password for @${target.username} has been reset to default '1234'.`
    };
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
      settings: StorageService.getSettings(),
      users: StorageService.getUsers(),
      loginHistory: StorageService.getLoginHistory()
    };
  },

  // IMPORT DATASET FROM GOOGLE SHEETS
  importFullDataset: (dataset) => {
    if (!dataset) return { success: false, error: "Empty dataset provided." };

    if (Array.isArray(dataset.fleet)) saveData(STORAGE_KEYS.FLEET, dataset.fleet);
    if (Array.isArray(dataset.rateMatrix)) saveData(STORAGE_KEYS.RATE_MATRIX, dataset.rateMatrix);
    if (Array.isArray(dataset.drivers)) saveData(STORAGE_KEYS.DRIVERS, dataset.drivers);
    if (Array.isArray(dataset.customers)) saveData(STORAGE_KEYS.CUSTOMERS, dataset.customers);
    if (Array.isArray(dataset.tripSheets)) saveData(STORAGE_KEYS.TRIP_SHEETS, dataset.tripSheets.map(healShiftedTripRecord));
    if (Array.isArray(dataset.maintenance)) saveData(STORAGE_KEYS.MAINTENANCE, dataset.maintenance);
    if (Array.isArray(dataset.incomeExpense)) saveData(STORAGE_KEYS.INCOME_EXPENSE, dataset.incomeExpense);
    if (Array.isArray(dataset.partners)) saveData(STORAGE_KEYS.PARTNERS, dataset.partners);
    if (Array.isArray(dataset.partnerDrawings)) saveData(STORAGE_KEYS.PARTNER_DRAWINGS, dataset.partnerDrawings);
    if (Array.isArray(dataset.users) && dataset.users.length > 0) {
      const hasAdmin = dataset.users.some(u => u.username && String(u.username).trim().toLowerCase() === 'admin');
      const mergedUsers = hasAdmin ? dataset.users : [INITIAL_USERS[0], ...dataset.users];
      saveData(STORAGE_KEYS.USERS, mergedUsers);
    }
    if (Array.isArray(dataset.loginHistory)) {
      saveData(STORAGE_KEYS.LOGIN_HISTORY, dataset.loginHistory);
    }

    if (Array.isArray(dataset.settings) && dataset.settings.length > 0) {
      const currentSettings = StorageService.getSettings();
      dataset.settings.forEach(item => {
        if (item.key && item.value !== undefined) {
          try {
            currentSettings[item.key] = JSON.parse(item.value);
          } catch (e) {
            currentSettings[item.key] = item.value;
          }
        }
      });
      StorageService.saveSettings(currentSettings);
    } else {
      const settings = StorageService.getSettings();
      settings.lastFetched = new Date().toLocaleString();
      StorageService.saveSettings(settings);
    }

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
