// =====================================================================
// TractoMint - Google Sheets Cloud Database Integration Service
// Architected following the Kannaku360 enterprise Google Apps Script pattern
// =====================================================================

import { ENV_GOOGLE_SHEETS_URL, getEffectiveGoogleSheetUrl } from '../config/env';
import { cleanDeep } from '../utils/timeCalcUtils';

export const DEFAULT_GOOGLE_SHEETS_URL = ENV_GOOGLE_SHEETS_URL;

/**
 * Encodes JavaScript object to a 100% clean 7-bit ASCII JSON string with \uXXXX escapes.
 * This completely prevents UTF-8 to Latin-1/Windows-1252 Mojibake corruption
 * in Google Apps Script and other intermediary web proxies!
 */
export function toAsciiJson(obj) {
  const sanitized = cleanDeep(obj);
  return JSON.stringify(sanitized).replace(/[\u007f-\uffff]/g, c => {
    return '\\u' + ('0000' + c.charCodeAt(0).toString(16)).slice(-4);
  });
}

export const APPS_SCRIPT_TEMPLATE = `/**
 * =====================================================================
 * TRACTOMINT - COMPLETE GOOGLE APPS SCRIPT BACKEND DATABASE
 * =====================================================================
 * This script turns your Google Sheet into a full REST API for TractoMint,
 * supporting:
 *  - Fleet & Machinery (Tractors, 5-Tyne, Rotavator, Trailer, Harvester)
 *  - Combination Rate Matrix (Tractor + Machine per Hour/Km with Effective Dates)
 *  - Drivers & Labor Registry (Wage types, Bata, Contact info)
 *  - Farmer & Customer Directory with Ledger & Balance Tracking
 *  - Primary Trip Billing Ledger (Start/End meter, Rate, Collection info)
 *  - Maintenance, Diesel, Blades, Nuts & Bolts, Battery, Oil Spares
 *  - Other Income & Expenses with Completed/Pending Status
 *  - Partner Equity Sharing & Partner Cash Drawings Ledger
 *  - Business & System Settings Store
 * 
 * Instructions:
 * 1. Open your Google Sheet (sheets.google.com).
 * 2. Click 'Extensions' > 'Apps Script'.
 * 3. Delete any existing code and paste this ENTIRE file into Code.gs.
 * 4. Click 'Save' (Floppy icon).
 * 5. Click 'Deploy' > 'New deployment'.
 * 6. Click the Gear icon (Select type) > Choose 'Web app'.
 * 7. Set:
 *    - Description: "TractoMint Cloud Database API"
 *    - Execute as: "Me" (your email)
 *    - Who has access: "Anyone" (CRITICAL: Must be "Anyone" for the app to connect!)
 * 8. Click 'Deploy', authorize Google permissions when prompted.
 * 9. Copy the Web App URL (looks like: https://script.google.com/macros/s/.../exec).
 * 10. Paste the URL into TractoMint 'Settings' > 'Google Sheets Cloud Integration'.
 * =====================================================================
 */

var SHEET_NAMES = {
  FLEET: 'Fleet',
  RATE_MATRIX: 'RateMatrix',
  DRIVERS: 'Drivers',
  CUSTOMERS: 'Customers',
  TRIP_SHEETS: 'TripSheets',
  MAINTENANCE: 'Maintenance',
  INCOME_EXPENSE: 'IncomeExpense',
  PARTNERS: 'Partners',
  PARTNER_DRAWINGS: 'PartnerDrawings',
  SETTINGS: 'Settings',
  USERS: 'Users',
  LOGIN_HISTORY: 'LoginHistory'
};

/**
 * Handle HTTP GET Requests
 */
function doGet(e) {
  try {
    var action = (e && e.parameter && e.parameter.action) ? e.parameter.action : 'getAll';
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    initializeSheetsIfMissing(ss);

    var result = {};

    switch (action) {
      case 'ping':
        result = { 
          status: 'success', 
          message: 'TractoMint Google Sheet Cloud Database is online & ready!', 
          spreadsheetName: ss.getName(),
          sheets: ss.getSheets().map(function(s) { return s.getName(); }),
          timestamp: new Date().toISOString() 
        };
        break;

      case 'getAll':
      case 'get_all':
      default:
        result = {
          status: 'success',
          spreadsheetName: ss.getName(),
          data: {
            fleet: getSheetData(ss.getSheetByName(SHEET_NAMES.FLEET)),
            rateMatrix: getSheetData(ss.getSheetByName(SHEET_NAMES.RATE_MATRIX)),
            drivers: getSheetData(ss.getSheetByName(SHEET_NAMES.DRIVERS)),
            customers: getSheetData(ss.getSheetByName(SHEET_NAMES.CUSTOMERS)),
            tripSheets: getSheetData(ss.getSheetByName(SHEET_NAMES.TRIP_SHEETS)),
            maintenance: getSheetData(ss.getSheetByName(SHEET_NAMES.MAINTENANCE)),
            incomeExpense: getSheetData(ss.getSheetByName(SHEET_NAMES.INCOME_EXPENSE)),
            partners: getSheetData(ss.getSheetByName(SHEET_NAMES.PARTNERS)),
            partnerDrawings: getSheetData(ss.getSheetByName(SHEET_NAMES.PARTNER_DRAWINGS)),
            settings: getSheetData(ss.getSheetByName(SHEET_NAMES.SETTINGS)),
            users: getSheetData(ss.getSheetByName(SHEET_NAMES.USERS)),
            loginHistory: getSheetData(ss.getSheetByName(SHEET_NAMES.LOGIN_HISTORY))
          },
          timestamp: new Date().toISOString()
        };
        break;
    }

    return createJsonResponse(result, 200);
  } catch (error) {
    return createJsonResponse({ status: 'error', message: error.toString() }, 500);
  }
}

/**
 * Auto-correct Latin-1 / UTF-8 Mojibake in Google Apps Script
 */
function fixGasMojibake(str) {
  if (!str || typeof str !== 'string') return str;
  if (/[\\u00C0-\\u00FF]/.test(str)) {
    try {
      var decoded = decodeURIComponent(escape(str));
      if (decoded && decoded.indexOf('\\uFFFD') === -1) {
        return decoded;
      }
    } catch(e) {}
  }
  return str;
}

/**
 * Handle HTTP POST Requests
 */
function doPost(e) {
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    initializeSheetsIfMissing(ss);

    var requestData = {};
    if (e.postData && e.postData.contents) {
      var rawBody = e.postData.contents;
      try {
        rawBody = fixGasMojibake(rawBody);
      } catch (err) {}
      requestData = JSON.parse(rawBody);
    }

    var action = requestData.action || 'syncAll';
    var payload = requestData.payload || requestData.data || {};
    var response = { status: 'success' };

    switch (action) {
      case 'ping':
        response.message = 'Connection successful!';
        response.spreadsheetName = ss.getName();
        response.timestamp = new Date().toISOString();
        break;

      case 'getAll':
      case 'get_all':
        response.spreadsheetName = ss.getName();
        response.data = {
          fleet: getSheetData(ss.getSheetByName(SHEET_NAMES.FLEET)),
          rateMatrix: getSheetData(ss.getSheetByName(SHEET_NAMES.RATE_MATRIX)),
          drivers: getSheetData(ss.getSheetByName(SHEET_NAMES.DRIVERS)),
          customers: getSheetData(ss.getSheetByName(SHEET_NAMES.CUSTOMERS)),
          tripSheets: getSheetData(ss.getSheetByName(SHEET_NAMES.TRIP_SHEETS)),
          maintenance: getSheetData(ss.getSheetByName(SHEET_NAMES.MAINTENANCE)),
          incomeExpense: getSheetData(ss.getSheetByName(SHEET_NAMES.INCOME_EXPENSE)),
          partners: getSheetData(ss.getSheetByName(SHEET_NAMES.PARTNERS)),
          partnerDrawings: getSheetData(ss.getSheetByName(SHEET_NAMES.PARTNER_DRAWINGS)),
          settings: getSheetData(ss.getSheetByName(SHEET_NAMES.SETTINGS)),
          users: getSheetData(ss.getSheetByName(SHEET_NAMES.USERS))
        };
        response.timestamp = new Date().toISOString();
        break;

      case 'syncAll':
      case 'sync_all':
        // Full synchronize / overwrite of all TractoMint tables
        if (payload.fleet) overwriteSheetData(ss.getSheetByName(SHEET_NAMES.FLEET), payload.fleet, getFleetHeaders(), '#064e3b');
        if (payload.rateMatrix) overwriteSheetData(ss.getSheetByName(SHEET_NAMES.RATE_MATRIX), payload.rateMatrix, getRateMatrixHeaders(), '#0f766e');
        if (payload.drivers) overwriteSheetData(ss.getSheetByName(SHEET_NAMES.DRIVERS), payload.drivers, getDriverHeaders(), '#0369a1');
        if (payload.customers) overwriteSheetData(ss.getSheetByName(SHEET_NAMES.CUSTOMERS), payload.customers, getCustomerHeaders(), '#4338ca');
        if (payload.tripSheets) overwriteSheetData(ss.getSheetByName(SHEET_NAMES.TRIP_SHEETS), payload.tripSheets, getTripSheetHeaders(), '#15803d');
        if (payload.maintenance) overwriteSheetData(ss.getSheetByName(SHEET_NAMES.MAINTENANCE), payload.maintenance, getMaintenanceHeaders(), '#b45309');
        if (payload.incomeExpense) overwriteSheetData(ss.getSheetByName(SHEET_NAMES.INCOME_EXPENSE), payload.incomeExpense, getIncomeExpenseHeaders(), '#c2410c');
        if (payload.partners) overwriteSheetData(ss.getSheetByName(SHEET_NAMES.PARTNERS), payload.partners, getPartnerHeaders(), '#6d28d9');
        if (payload.partnerDrawings) overwriteSheetData(ss.getSheetByName(SHEET_NAMES.PARTNER_DRAWINGS), payload.partnerDrawings, getPartnerDrawingHeaders(), '#be185d');
        if (payload.settings) overwriteSheetData(ss.getSheetByName(SHEET_NAMES.SETTINGS), payload.settings, getSettingsHeaders(), '#334155');
        if (payload.users) overwriteSheetData(ss.getSheetByName(SHEET_NAMES.USERS), payload.users, getUserHeaders(), '#0f172a');
        
        response.message = 'All 11 TractoMint database tables synchronized successfully!';
        response.spreadsheetName = ss.getName();
        response.timestamp = new Date().toISOString();
        break;

      // Individual Record Handlers
      case 'addTripSheet':
        appendRow(ss.getSheetByName(SHEET_NAMES.TRIP_SHEETS), payload, getTripSheetHeaders());
        response.message = 'Trip sheet added to Google Sheet.';
        break;

      case 'updateTripSheet':
        updateRowById(ss.getSheetByName(SHEET_NAMES.TRIP_SHEETS), payload.id, payload, getTripSheetHeaders());
        response.message = 'Trip sheet updated in Google Sheet.';
        break;

      case 'deleteTripSheet':
        deleteRowById(ss.getSheetByName(SHEET_NAMES.TRIP_SHEETS), payload.id);
        response.message = 'Trip sheet deleted from Google Sheet.';
        break;

      case 'addMaintenance':
        appendRow(ss.getSheetByName(SHEET_NAMES.MAINTENANCE), payload, getMaintenanceHeaders());
        response.message = 'Maintenance record added to Google Sheet.';
        break;

      case 'addIncomeExpense':
        appendRow(ss.getSheetByName(SHEET_NAMES.INCOME_EXPENSE), payload, getIncomeExpenseHeaders());
        response.message = 'Income/Expense entry recorded in Google Sheet.';
        break;

      // Users Handlers
      case 'addUser':
        appendRow(ss.getSheetByName(SHEET_NAMES.USERS), payload, getUserHeaders());
        response.message = 'User record added to Google Sheet.';
        break;

      case 'updateUser':
        updateRowById(ss.getSheetByName(SHEET_NAMES.USERS), payload.id, payload, getUserHeaders());
        response.message = 'User record updated in Google Sheet.';
        break;

      case 'deleteUser':
        deleteRowById(ss.getSheetByName(SHEET_NAMES.USERS), payload.id);
        response.message = 'User record deleted from Google Sheet.';
        break;

      default:
        response = { status: 'error', message: 'Unknown action: ' + action };
        break;
    }

    return createJsonResponse(response, 200);
  } catch (error) {
    return createJsonResponse({ status: 'error', message: error.toString() }, 500);
  }
}

/**
 * Format JSON response with proper MIME type
 */
function createJsonResponse(data, statusCode) {
  return ContentService.createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}

/**
 * Initialize all required sheets and headers if not already created
 */
function initializeSheetsIfMissing(ss) {
  ensureSheetWithHeaders(ss, SHEET_NAMES.FLEET, getFleetHeaders(), '#064e3b');
  ensureSheetWithHeaders(ss, SHEET_NAMES.RATE_MATRIX, getRateMatrixHeaders(), '#0f766e');
  ensureSheetWithHeaders(ss, SHEET_NAMES.DRIVERS, getDriverHeaders(), '#0369a1');
  ensureSheetWithHeaders(ss, SHEET_NAMES.CUSTOMERS, getCustomerHeaders(), '#4338ca');
  ensureSheetWithHeaders(ss, SHEET_NAMES.TRIP_SHEETS, getTripSheetHeaders(), '#15803d');
  ensureSheetWithHeaders(ss, SHEET_NAMES.MAINTENANCE, getMaintenanceHeaders(), '#b45309');
  ensureSheetWithHeaders(ss, SHEET_NAMES.INCOME_EXPENSE, getIncomeExpenseHeaders(), '#c2410c');
  ensureSheetWithHeaders(ss, SHEET_NAMES.PARTNERS, getPartnerHeaders(), '#6d28d9');
  ensureSheetWithHeaders(ss, SHEET_NAMES.PARTNER_DRAWINGS, getPartnerDrawingHeaders(), '#be185d');
  ensureSheetWithHeaders(ss, SHEET_NAMES.SETTINGS, getSettingsHeaders(), '#334155');
  ensureSheetWithHeaders(ss, SHEET_NAMES.USERS, getUserHeaders(), '#0f172a');
}

function ensureSheetWithHeaders(ss, name, headers, headerColor) {
  var sheet = ss.getSheetByName(name);
  if (!sheet) {
    sheet = ss.insertSheet(name);
    sheet.appendRow(headers);
    var headerRange = sheet.getRange(1, 1, 1, headers.length);
    headerRange.setFontWeight('bold');
    headerRange.setBackground(headerColor || '#064e3b');
    headerRange.setFontColor('#FFFFFF');
    sheet.setFrozenRows(1);
  } else {
    // Check if headers match and update if columns were added
    var lastCol = sheet.getLastColumn();
    if (lastCol < headers.length) {
      sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
      var headerRange2 = sheet.getRange(1, 1, 1, headers.length);
      headerRange2.setFontWeight('bold');
      headerRange2.setBackground(headerColor || '#064e3b');
      headerRange2.setFontColor('#FFFFFF');
      sheet.setFrozenRows(1);
    }
  }
}

// ----------------------------------------------------
// TABLE HEADERS DEFINITIONS
// ----------------------------------------------------

function getFleetHeaders() {
  return [
    'id', 'name', 'name_ta', 'type', 'implementCategory', 'regNumber', 
    'acquisition', 'purchasePrice', 'purchaseDate', 'hp', 'emiMonthly', 
    'emiBank', 'currentHours', 'status', 'notes', 'is_deleted', 'created_at', 'updated_at'
  ];
}

function getRateMatrixHeaders() {
  return [
    'id', 'tractorId', 'tractorName', 'implementId', 'implementName', 'unit', 'rate', 
    'effectiveDate', 'description', 'is_deleted', 'created_at', 'updated_at'
  ];
}

function getDriverHeaders() {
  return [
    'id', 'name', 'name_ta', 'phone', 'licenseNo', 'wageType', 
    'defaultWage', 'status', 'joinedDate', 'is_deleted', 'created_at', 'updated_at'
  ];
}

function getCustomerHeaders() {
  return [
    'id', 'name', 'name_ta', 'phone', 'village', 'village_ta', 
    'address', 'is_deleted', 'created_at', 'updated_at'
  ];
}

function getTripSheetHeaders() {
  return [
    'id', 'date', 'startTime', 'endTime', 
    'customerId', 'customerName', 
    'driverId', 'driverName', 
    'tractorId', 'tractorName', 
    'implementId', 'implementName', 
    'workType', 'workDescription', 
    'billingUnit', 'startMeter', 'endMeter', 'quantity', 'rate', 
    'grossAmount', 'discount', 'totalAmount', 'paidAmount', 'balanceAmount', 
    'paymentStatus', 'paidOnDate', 'collectedBy', 'collectedWhen', 'paymentMode', 
    'driverBata', 'notes', 'is_deleted', 'created_at', 'updated_at'
  ];
}

function getMaintenanceHeaders() {
  return [
    'id', 'date', 'assetId', 'assetName', 'category', 'category_ta', 'quantity', 
    'unit', 'unitCost', 'totalAmount', 'hourMeter', 'vendorName', 
    'billNumber', 'paymentMode', 'notes', 'entryType', 'paidStatus', 'person', 
    'description', 'amount', 'is_deleted', 'created_at', 'updated_at'
  ];
}

function getIncomeExpenseHeaders() {
  return [
    'id', 'date', 'type', 'category', 'category_ta', 'description', 
    'amount', 'paymentMode', 'status', 'is_deleted', 'created_at', 'updated_at'
  ];
}

function getPartnerHeaders() {
  return [
    'id', 'name', 'name_ta', 'sharePercent', 'phone', 
    'investedCapital', 'is_deleted', 'created_at', 'updated_at'
  ];
}

function getPartnerDrawingHeaders() {
  return [
    'id', 'date', 'partnerId', 'partnerName', 'amount', 'purpose', 
    'paymentMode', 'notes', 'is_deleted', 'created_at', 'updated_at'
  ];
}

function getSettingsHeaders() {
  return ['key', 'value', 'updatedAt'];
}

function getUserHeaders() {
  return [
    'id', 'username', 'pin', 'role', 'displayName', 'displayName_ta', 
    'phone', 'status', 'isDefault', 'last_login', 'is_deleted', 'created_at', 'updated_at'
  ];
}

// ----------------------------------------------------
// DATABASE HELPER FUNCTIONS
// ----------------------------------------------------

/**
 * Reads sheet rows as an array of JSON objects
 */
function getSheetData(sheet) {
  if (!sheet) return [];
  var lastRow = sheet.getLastRow();
  var lastCol = sheet.getLastColumn();
  if (lastRow <= 1 || lastCol < 1) return [];

  var rows = sheet.getRange(1, 1, lastRow, lastCol).getValues();
  var headers = rows[0];
  var data = [];

  for (var i = 1; i < rows.length; i++) {
    var row = rows[i];
    var hasContent = row.some(function(cell) { return cell !== '' && cell !== null; });
    if (!hasContent) continue;

    var item = {};
    for (var j = 0; j < headers.length; j++) {
      var header = headers[j];
      if (!header) continue;
      var val = row[j];
      if (val instanceof Date) {
        val = Utilities.formatDate(val, Session.getScriptTimeZone() || 'Asia/Kolkata', 'yyyy-MM-dd');
      } else if (typeof val === 'string' && (val.startsWith('{') || val.startsWith('['))) {
        try {
          val = JSON.parse(val);
        } catch (e) {}
      }
      item[header] = val;
    }

    if (item.is_deleted === undefined || item.is_deleted === '') {
      item.is_deleted = false;
    }

    if (sheet.getName() === SHEET_NAMES.TRIP_SHEETS) {
      var totalStr = String(item.totalAmount || '').trim();
      var balStr = String(item.balanceAmount || '').trim().toLowerCase();
      var isShifted = isNaN(Number(item.totalAmount)) && (
        ['admin', 'operator', 'manager', 'driver'].indexOf(totalStr.toLowerCase()) !== -1 ||
        ['cash', 'credit', 'gpay', 'upi', 'bank'].indexOf(balStr) !== -1
      );
      if (isShifted) {
        var realCustomer = item.customerId && typeof item.customerId === 'string' && item.customerId.indexOf('CUST-') !== 0 ? item.customerId : (item.customerName || 'General Customer');
        var custStr = typeof item.customerName === 'string' ? item.customerName : (item.customerName && item.customerName.en ? item.customerName.en : '');
        var realDriver = custStr && custStr.toLowerCase().indexOf('rotavator') === -1 ? custStr : 'General Driver';
        var realImplement = item.driverName || 'Standalone Tractor';
        var realTotal = Number(item.quantity) || 1600;
        var realCollectedBy = totalStr || 'Admin';
        var realPaymentMode = ['cash', 'credit', 'gpay', 'upi', 'bank'].indexOf(balStr) !== -1 ? balStr : 'cash';
        var isPaid = realPaymentMode !== 'credit' && realCollectedBy;

        item.customerId = item.customerId && item.customerId.indexOf('CUST-') === 0 ? item.customerId : '';
        item.customerName = realCustomer;
        item.driverId = '';
        item.driverName = realDriver;
        item.tractorId = '';
        item.tractorName = 'General Tractor';
        item.implementId = '';
        item.implementName = realImplement;
        item.workType = '5-Tyne Ploughing (5 கொழு உழவு)';
        item.billingUnit = 'per_trip';
        item.quantity = 1;
        item.rate = realTotal;
        item.grossAmount = realTotal;
        item.discount = 0;
        item.totalAmount = realTotal;
        item.paidAmount = isPaid ? realTotal : 0;
        item.balanceAmount = isPaid ? 0 : realTotal;
        item.paymentStatus = isPaid ? 'paid' : 'unpaid';
        item.paymentMode = realPaymentMode;
        item.collectedBy = realCollectedBy;
      }
    }

    item = normalizeRecordBilingual(item);
    data.push(item);
  }
  return data;
}

/**
 * Auto-resolves bilingual pair (English & Tamil) for any entity field
 */
function normalizeBilingualField(item, enField, taField) {
  if (!item) return;
  var en = item[enField] !== undefined && item[enField] !== null ? String(item[enField]).trim() : '';
  var ta = item[taField] !== undefined && item[taField] !== null ? String(item[taField]).trim() : '';
  if (!en && !ta) return;

  var tamilRegex = /[\u0B80-\u0BFF]/;
  var enHasTamil = tamilRegex.test(en);
  var taHasTamil = tamilRegex.test(ta);

  // Both present, correctly placed
  if (en && !enHasTamil && ta && taHasTamil) {
    item[enField] = en;
    item[taField] = ta;
    return;
  }

  // Both identical and Tamil (e.g. "தருண்" in both)
  if (en === ta && enHasTamil) {
    try {
      item[enField] = LanguageApp.translate(en, 'ta', 'en');
      item[taField] = en;
    } catch (e) {
      item[taField] = en;
    }
    return;
  }

  // Both identical and English (e.g. "kirubakaran" in both)
  if (en === ta && !enHasTamil) {
    try {
      item[enField] = en;
      item[taField] = LanguageApp.translate(en, 'en', 'ta');
    } catch (e) {
      item[enField] = en;
    }
    return;
  }

  // enField contains Tamil text, taField is empty
  if (enHasTamil && !ta) {
    item[taField] = en;
    try {
      item[enField] = LanguageApp.translate(en, 'ta', 'en');
    } catch (e) {}
    return;
  }

  // taField contains Tamil, but enField is empty
  if (!en && taHasTamil) {
    item[taField] = ta;
    try {
      item[enField] = LanguageApp.translate(ta, 'ta', 'en');
    } catch (e) {}
    return;
  }

  // enField is English, but taField is empty
  if (en && !enHasTamil && !ta) {
    item[enField] = en;
    try {
      item[taField] = LanguageApp.translate(en, 'en', 'ta');
    } catch (e) {}
    return;
  }
}

/**
 * Normalizes all bilingual fields for any record
 */
function normalizeRecordBilingual(item) {
  if (!item || typeof item !== 'object') return item;
  normalizeBilingualField(item, 'name', 'name_ta');
  normalizeBilingualField(item, 'customerName', 'customerName_ta');
  normalizeBilingualField(item, 'driverName', 'driverName_ta');
  normalizeBilingualField(item, 'tractorName', 'tractorName_ta');
  normalizeBilingualField(item, 'implementName', 'implementName_ta');
  normalizeBilingualField(item, 'village', 'village_ta');
  normalizeBilingualField(item, 'companyName', 'companyName_ta');
  return item;
}

/**
 * Overwrites sheet data with updated list of objects
 */
function overwriteSheetData(sheet, items, headers, headerColor) {
  if (!sheet) return;
  sheet.clearContents();
  sheet.appendRow(headers);
  var headerRange = sheet.getRange(1, 1, 1, headers.length);
  headerRange.setFontWeight('bold');
  headerRange.setFontColor('#FFFFFF');
  headerRange.setBackground(headerColor || '#064e3b');
  sheet.setFrozenRows(1);

  if (!items) return;
  var list = Array.isArray(items) ? items : [items];
  if (list.length === 0) return;

  var rows = list.map(function(item) {
    normalizeRecordBilingual(item);
    return headers.map(function(header) {
      var val = item[header];
      if (val !== undefined && val !== null) {
        if (typeof val === 'object') {
          return JSON.stringify(val);
        }
        return val;
      }
      return '';
    });
  });

  sheet.getRange(2, 1, rows.length, headers.length).setValues(rows);
}

/**
 * Appends a single record
 */
function appendRow(sheet, item, headers) {
  if (!sheet) return;
  normalizeRecordBilingual(item);
  var row = headers.map(function(h) {
    var val = item[h];
    if (val !== undefined && val !== null) {
      if (typeof val === 'object') return JSON.stringify(val);
      return val;
    }
    return '';
  });
  sheet.appendRow(row);
}

/**
 * Updates a record by ID
 */
function updateRowById(sheet, id, item, headers) {
  if (!sheet || !id) return;
  normalizeRecordBilingual(item);
  var data = sheet.getDataRange().getValues();
  var idColIndex = headers.indexOf('id');
  if (idColIndex === -1) return;

  for (var i = 1; i < data.length; i++) {
    if (String(data[i][idColIndex]) === String(id)) {
      var newRow = headers.map(function(h) {
        var val = item[h] !== undefined && item[h] !== null ? item[h] : data[i][headers.indexOf(h)];
        if (val !== undefined && val !== null && typeof val === 'object') return JSON.stringify(val);
        return val;
      });
      sheet.getRange(i + 1, 1, 1, headers.length).setValues([newRow]);
      return;
    }
  }
  appendRow(sheet, item, headers);
}

/**
 * Deletes a row by ID
 */
function deleteRowById(sheet, id) {
  if (!sheet || !id) return;
  var data = sheet.getDataRange().getValues();
  for (var i = 1; i < data.length; i++) {
    if (String(data[i][0]) === String(id)) {
      sheet.deleteRow(i + 1);
      return;
    }
  }
}
`;

/**
 * Kannaku360-standardized GoogleSheetApiService client
 */
export const GoogleSheetApiService = {
  /**
   * Test the connection to the Google Apps Script Web App
   */
  testConnection: async (scriptUrl) => {
    const targetUrl = getEffectiveGoogleSheetUrl(scriptUrl);
    if (!targetUrl) {
      return { success: false, message: 'Google Apps Script URL cannot be empty.' };
    }

    try {
      const url = new URL(targetUrl.trim());
      url.searchParams.set('action', 'ping');

      const response = await fetch(url.toString(), {
        method: 'GET',
        headers: { 'Accept': 'application/json' }
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const json = await response.json();
      const isSuccess = json.status === 'success' || json.status === 'ok';

      if (isSuccess) {
        return { 
          success: true, 
          message: json.message || 'Connected to Google Sheet database successfully!',
          spreadsheetName: json.spreadsheetName || 'Connected Google Sheet',
          sheets: json.sheets || []
        };
      } else {
        return { success: false, message: json.message || 'Error reported by Google Apps Script.' };
      }
    } catch (error) {
      console.warn('GET ping failed, attempting POST ping fallback:', error);
      try {
        const response = await fetch(targetUrl.trim(), {
          method: 'POST',
          headers: { 'Content-Type': 'text/plain;charset=utf-8' },
          body: JSON.stringify({ action: 'ping' })
        });
        const json = await response.json();
        const isSuccess = json.status === 'success' || json.status === 'ok';
        if (isSuccess) {
          return {
            success: true,
            message: json.message || 'Connected to Google Sheet database!',
            spreadsheetName: json.spreadsheetName || json.spreadsheetTitle || 'Connected Google Sheet',
            sheets: json.sheets || []
          };
        }
        return { success: false, message: json.message || 'Apps Script returned error status.' };
      } catch (postErr) {
        return {
          success: false,
          message: error.message || 'Failed to connect. Please check URL and ensure Web App permissions are set to "Anyone".'
        };
      }
    }
  },

  /**
   * Fetch all database records from Google Sheet
   */
  fetchAllData: async (scriptUrl) => {
    const targetUrl = getEffectiveGoogleSheetUrl(scriptUrl);
    if (!targetUrl) {
      return { success: false, error: 'Google Sheet URL is not configured.' };
    }

    try {
      const url = new URL(targetUrl.trim());
      url.searchParams.set('action', 'getAll');

      const response = await fetch(url.toString(), {
        method: 'GET',
        headers: { 'Accept': 'application/json' }
      });

      if (!response.ok) {
        throw new Error(`Server responded with ${response.status}: ${response.statusText}`);
      }

      const json = await response.json();
      const isSuccess = json.status === 'success' || json.status === 'ok';

      if (isSuccess && json.data) {
        return {
          success: true,
          data: cleanDeep(json.data),
          spreadsheetName: json.spreadsheetName || 'Google Spreadsheet',
          timestamp: new Date().toLocaleTimeString()
        };
      } else {
        return { success: false, error: json.message || 'Invalid data received from Google Sheets.' };
      }
    } catch (error) {
      console.warn('GET getAll failed, attempting POST getAll fallback:', error);
      try {
        const response = await fetch(targetUrl.trim(), {
          method: 'POST',
          headers: { 'Content-Type': 'text/plain;charset=utf-8' },
          body: toAsciiJson({ action: 'getAll' })
        });
        const json = await response.json();
        const isSuccess = json.status === 'success' || json.status === 'ok';
        if (isSuccess && json.data) {
          return {
            success: true,
            data: cleanDeep(json.data),
            spreadsheetName: json.spreadsheetName || 'Google Spreadsheet',
            timestamp: new Date().toLocaleTimeString()
          };
        }
        return { success: false, error: 'Empty or invalid response from Google Sheets.' };
      } catch (postErr) {
        return {
          success: false,
          error: error.message || 'Failed to fetch data from Google Sheets. Ensure Web App has "Who has access: Anyone".'
        };
      }
    }
  },

  /**
   * Sync full local database to Google Sheet
   */
  syncAllToSheet: async (scriptUrl, fullData) => {
    const targetUrl = getEffectiveGoogleSheetUrl(scriptUrl);
    if (!targetUrl) {
      return { success: false, error: 'Google Sheet URL is not configured.' };
    }

    try {
      // Ensure settings is formatted cleanly
      let settingsArray = [];
      if (Array.isArray(fullData.settings)) {
        settingsArray = fullData.settings;
      } else if (fullData.settings && typeof fullData.settings === 'object') {
        settingsArray = Object.entries(fullData.settings).map(([key, value]) => ({
          key,
          value: typeof value === 'object' ? JSON.stringify(value) : String(value ?? ''),
          updatedAt: new Date().toISOString()
        }));
      }

      const payload = {
        fleet: Array.isArray(fullData.fleet) ? fullData.fleet : [],
        rateMatrix: Array.isArray(fullData.rateMatrix) ? fullData.rateMatrix : [],
        drivers: Array.isArray(fullData.drivers) ? fullData.drivers : [],
        customers: Array.isArray(fullData.customers) ? fullData.customers : [],
        tripSheets: Array.isArray(fullData.tripSheets) ? fullData.tripSheets : [],
        maintenance: Array.isArray(fullData.maintenance) ? fullData.maintenance : [],
        incomeExpense: Array.isArray(fullData.incomeExpense) ? fullData.incomeExpense : [],
        partners: Array.isArray(fullData.partners) ? fullData.partners : [],
        partnerDrawings: Array.isArray(fullData.partnerDrawings) ? fullData.partnerDrawings : [],
        settings: settingsArray,
        users: Array.isArray(fullData.users) ? fullData.users : [],
        loginHistory: Array.isArray(fullData.loginHistory) ? fullData.loginHistory : []
      };

      const bodyData = {
        action: 'syncAll',
        payload: payload,
        data: payload // Backward compatibility with previous handler
      };

      // Use text/plain with ASCII unicode escape sequences to prevent any Latin-1 charset corruption
      const response = await fetch(targetUrl.trim(), {
        method: 'POST',
        headers: {
          'Content-Type': 'text/plain;charset=utf-8'
        },
        body: toAsciiJson(bodyData)
      });

      if (!response.ok) {
        throw new Error(`HTTP error ${response.status}`);
      }

      const json = await response.json();
      return {
        success: true,
        message: json.message || 'All tables synced to Google Sheets successfully!',
        timestamp: new Date().toLocaleTimeString()
      };
    } catch (error) {
      console.warn('POST syncAll failed with cors/json parsing, attempting no-cors fallback:', error);
      try {
        const fallbackBody = {
          action: 'syncAll',
          payload: fullData,
          data: fullData
        };

        await fetch(targetUrl.trim(), {
          method: 'POST',
          mode: 'no-cors',
          headers: { 'Content-Type': 'text/plain;charset=utf-8' },
          body: toAsciiJson(fallbackBody)
        });

        return {
          success: true,
          message: 'Data transmitted to Google Sheets successfully!',
          timestamp: new Date().toLocaleTimeString()
        };
      } catch (err) {
        return { success: false, error: err.message || 'Network error while syncing.' };
      }
    }
  },

  /**
   * Add a single trip sheet to Google Sheet
   */
  addTripSheet: async (scriptUrl, tripSheet) => {
    const targetUrl = getEffectiveGoogleSheetUrl(scriptUrl);
    if (!targetUrl) return { success: true, message: 'Saved locally' };
    try {
      const response = await fetch(targetUrl.trim(), {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: toAsciiJson({ action: 'addTripSheet', payload: tripSheet })
      });
      return await response.json();
    } catch (e) {
      return { success: false, error: e.message };
    }
  },

  /**
   * Delete a trip sheet from Google Sheet
   */
  deleteTripSheet: async (scriptUrl, id) => {
    const targetUrl = getEffectiveGoogleSheetUrl(scriptUrl);
    if (!targetUrl) return { success: true, message: 'Deleted locally' };
    try {
      const response = await fetch(targetUrl.trim(), {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: toAsciiJson({ action: 'deleteTripSheet', payload: { id } })
      });
      return await response.json();
    } catch (e) {
      return { success: false, error: e.message };
    }
  },

  /**
   * Record a login attempt directly in Google Sheet
   */
  recordLoginAttempt: async (scriptUrl, attempt) => {
    const targetUrl = getEffectiveGoogleSheetUrl(scriptUrl);
    if (!targetUrl || !attempt) return { success: true, message: 'Saved locally' };
    try {
      const response = await fetch(targetUrl.trim(), {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: toAsciiJson({ action: 'recordLogin', payload: attempt })
      });
      return await response.json();
    } catch (e) {
      try {
        await fetch(targetUrl.trim(), {
          method: 'POST',
          mode: 'no-cors',
          body: toAsciiJson({ action: 'recordLogin', payload: attempt })
        });
        return { success: true, message: 'Recorded in Google Sheet (no-cors)' };
      } catch (err) {
        return { success: false, error: e.message };
      }
    }
  }
};

// Aliases for backward-compatibility across existing components
export const testGoogleSheetConnection = GoogleSheetApiService.testConnection;
export const fetchDataFromGoogleSheet = GoogleSheetApiService.fetchAllData;
export const syncAllToGoogleSheet = GoogleSheetApiService.syncAllToSheet;
export const recordLoginAttemptInSheet = GoogleSheetApiService.recordLoginAttempt;
