// =====================================================================
// TractoMint - Google Sheets Cloud Database Integration Service
// Architected following the Kannaku360 enterprise Google Apps Script pattern
// =====================================================================

import { ENV_GOOGLE_SHEETS_URL, getEffectiveGoogleSheetUrl } from '../config/env';

export const DEFAULT_GOOGLE_SHEETS_URL = ENV_GOOGLE_SHEETS_URL;

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
  USERS: 'Users'
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
            users: getSheetData(ss.getSheetByName(SHEET_NAMES.USERS))
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
 * Handle HTTP POST Requests
 */
function doPost(e) {
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    initializeSheetsIfMissing(ss);

    var requestData = {};
    if (e.postData && e.postData.contents) {
      requestData = JSON.parse(e.postData.contents);
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
    'id', 'tractorName', 'implementName', 'unit', 'rate', 
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
    'id', 'date', 'startTime', 'endTime', 'customerName', 'driverName', 
    'tractorName', 'implementName', 'workType', 'workDescription', 
    'billingUnit', 'startMeter', 'endMeter', 'quantity', 'rate', 
    'grossAmount', 'discount', 'totalAmount', 'paidAmount', 'balanceAmount', 
    'paymentStatus', 'collectedBy', 'collectedWhen', 'paymentMode', 
    'driverBata', 'notes', 'is_deleted', 'created_at', 'updated_at'
  ];
}

function getMaintenanceHeaders() {
  return [
    'id', 'date', 'assetName', 'category', 'category_ta', 'quantity', 
    'unit', 'unitCost', 'totalAmount', 'hourMeter', 'vendorName', 
    'billNumber', 'paymentMode', 'notes', 'is_deleted', 'created_at', 'updated_at'
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
    'id', 'date', 'partnerName', 'amount', 'purpose', 
    'paymentMode', 'is_deleted', 'created_at', 'updated_at'
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

    data.push(item);
  }
  return data;
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
          data: json.data,
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
          body: JSON.stringify({ action: 'getAll' })
        });
        const json = await response.json();
        const isSuccess = json.status === 'success' || json.status === 'ok';
        if (isSuccess && json.data) {
          return {
            success: true,
            data: json.data,
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
        users: Array.isArray(fullData.users) ? fullData.users : []
      };

      const bodyData = {
        action: 'syncAll',
        payload: payload,
        data: payload // Backward compatibility with previous handler
      };

      // Use text/plain to avoid CORS preflight OPTIONS rejection on Google Apps Script
      const response = await fetch(targetUrl.trim(), {
        method: 'POST',
        headers: {
          'Content-Type': 'text/plain;charset=utf-8'
        },
        body: JSON.stringify(bodyData)
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
          body: JSON.stringify(fallbackBody)
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
        body: JSON.stringify({ action: 'addTripSheet', payload: tripSheet })
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
        body: JSON.stringify({ action: 'deleteTripSheet', payload: { id } })
      });
      return await response.json();
    } catch (e) {
      return { success: false, error: e.message };
    }
  }
};

// Aliases for backward-compatibility across existing components
export const testGoogleSheetConnection = GoogleSheetApiService.testConnection;
export const fetchDataFromGoogleSheet = GoogleSheetApiService.fetchAllData;
export const syncAllToGoogleSheet = GoogleSheetApiService.syncAllToSheet;
