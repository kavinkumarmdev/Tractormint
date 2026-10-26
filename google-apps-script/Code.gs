/**
 * =====================================================================
 * TRACTOMINT - COMPLETE GOOGLE APPS SCRIPT BACKEND DATABASE
 * =====================================================================
 * This script turns your Google Sheet into a full REST API for TractoMint,
 * supporting:
 *  - Fleet & Machinery (Tractors, 5-Tyne, Rotavator, Trailer, Harvester)
 *  - Combination Rate Matrix (Tractor + Machine per Hour/Acre/Km)
 *  - Drivers & Labor Registry (Wage types, Bata, Contact info)
 *  - Farmer & Customer Directory with Ledger & Balance Tracking
 *  - Primary Trip Billing Ledger (Start/End meter, Rate, Collection info)
 *  - Maintenance, Diesel, Blades, Nuts & Bolts, Battery, Oil Spares
 *  - Other Income & Expenses with Completed/Pending Status
 *  - Partner Equity Sharing & Partner Cash Drawings Ledger
 *  - Business & System Settings Store
 *  - User Accounts, Roles (Admin / Operator) & PIN Security
 * 
 * Instructions:
 * 1. Open your Google Sheet (sheets.google.com).
 * 2. Name the spreadsheet: "TractoMint Database"
 * 3. Click 'Extensions' > 'Apps Script'.
 * 4. Delete any existing code and paste this ENTIRE file into Code.gs.
 * 5. Click 'Save' (Floppy icon or Ctrl+S).
 * 6. Click 'Deploy' > 'New deployment'.
 * 7. Click the Gear icon (Select type) > Choose 'Web app'.
 * 8. Set:
 *    - Description: "TractoMint Production Cloud Database API"
 *    - Execute as: "Me" (your email)
 *    - Who has access: "Anyone" (CRITICAL: Must be "Anyone" for TractoMint to connect!)
 * 9. Click 'Deploy', authorize Google permissions when prompted.
 * 10. Copy the Web App URL (starts with https://script.google.com/macros/s/.../exec).
 * 11. Paste the URL into TractoMint 'Settings' > 'Google Sheets Cloud Integration'.
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
  if (/[\u00C0-\u00FF]/.test(str)) {
    try {
      var decoded = decodeURIComponent(escape(str));
      if (decoded && decoded.indexOf('\uFFFD') === -1) {
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
          users: getSheetData(ss.getSheetByName(SHEET_NAMES.USERS)),
          loginHistory: getSheetData(ss.getSheetByName(SHEET_NAMES.LOGIN_HISTORY))
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
        if (payload.loginHistory) overwriteSheetData(ss.getSheetByName(SHEET_NAMES.LOGIN_HISTORY), payload.loginHistory, getLoginHistoryHeaders(), '#475569');
        
        response.message = 'All 12 TractoMint database tables synchronized successfully!';
        response.spreadsheetName = ss.getName();
        response.timestamp = new Date().toISOString();
        break;

      // Individual Record Handlers: Trip Sheets
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

      // Maintenance Handlers
      case 'addMaintenance':
        appendRow(ss.getSheetByName(SHEET_NAMES.MAINTENANCE), payload, getMaintenanceHeaders());
        response.message = 'Maintenance record added to Google Sheet.';
        break;
      case 'updateMaintenance':
        updateRowById(ss.getSheetByName(SHEET_NAMES.MAINTENANCE), payload.id, payload, getMaintenanceHeaders());
        response.message = 'Maintenance record updated in Google Sheet.';
        break;
      case 'deleteMaintenance':
        deleteRowById(ss.getSheetByName(SHEET_NAMES.MAINTENANCE), payload.id);
        response.message = 'Maintenance record deleted from Google Sheet.';
        break;

      // Income & Expense Handlers
      case 'addIncomeExpense':
        appendRow(ss.getSheetByName(SHEET_NAMES.INCOME_EXPENSE), payload, getIncomeExpenseHeaders());
        response.message = 'Income/Expense entry recorded in Google Sheet.';
        break;
      case 'updateIncomeExpense':
        updateRowById(ss.getSheetByName(SHEET_NAMES.INCOME_EXPENSE), payload.id, payload, getIncomeExpenseHeaders());
        response.message = 'Income/Expense entry updated in Google Sheet.';
        break;
      case 'deleteIncomeExpense':
        deleteRowById(ss.getSheetByName(SHEET_NAMES.INCOME_EXPENSE), payload.id);
        response.message = 'Income/Expense entry deleted from Google Sheet.';
        break;

      // Fleet Handlers
      case 'addFleet':
        appendRow(ss.getSheetByName(SHEET_NAMES.FLEET), payload, getFleetHeaders());
        response.message = 'Fleet item added to Google Sheet.';
        break;
      case 'updateFleet':
        updateRowById(ss.getSheetByName(SHEET_NAMES.FLEET), payload.id, payload, getFleetHeaders());
        response.message = 'Fleet item updated in Google Sheet.';
        break;
      case 'deleteFleet':
        deleteRowById(ss.getSheetByName(SHEET_NAMES.FLEET), payload.id);
        response.message = 'Fleet item deleted from Google Sheet.';
        break;

      // Driver Handlers
      case 'addDriver':
        appendRow(ss.getSheetByName(SHEET_NAMES.DRIVERS), payload, getDriverHeaders());
        response.message = 'Driver added to Google Sheet.';
        break;
      case 'updateDriver':
        updateRowById(ss.getSheetByName(SHEET_NAMES.DRIVERS), payload.id, payload, getDriverHeaders());
        response.message = 'Driver updated in Google Sheet.';
        break;
      case 'deleteDriver':
        deleteRowById(ss.getSheetByName(SHEET_NAMES.DRIVERS), payload.id);
        response.message = 'Driver deleted from Google Sheet.';
        break;

      // Customer Handlers
      case 'addCustomer':
        appendRow(ss.getSheetByName(SHEET_NAMES.CUSTOMERS), payload, getCustomerHeaders());
        response.message = 'Customer added to Google Sheet.';
        break;
      case 'updateCustomer':
        updateRowById(ss.getSheetByName(SHEET_NAMES.CUSTOMERS), payload.id, payload, getCustomerHeaders());
        response.message = 'Customer updated in Google Sheet.';
        break;
      case 'deleteCustomer':
        deleteRowById(ss.getSheetByName(SHEET_NAMES.CUSTOMERS), payload.id);
        response.message = 'Customer deleted from Google Sheet.';
        break;

      // Rate Matrix Handlers
      case 'addRateMatrix':
        appendRow(ss.getSheetByName(SHEET_NAMES.RATE_MATRIX), payload, getRateMatrixHeaders());
        response.message = 'Rate matrix added to Google Sheet.';
        break;
      case 'updateRateMatrix':
        updateRowById(ss.getSheetByName(SHEET_NAMES.RATE_MATRIX), payload.id, payload, getRateMatrixHeaders());
        response.message = 'Rate matrix updated in Google Sheet.';
        break;
      case 'deleteRateMatrix':
        deleteRowById(ss.getSheetByName(SHEET_NAMES.RATE_MATRIX), payload.id);
        response.message = 'Rate matrix deleted from Google Sheet.';
        break;

      // Partner Handlers
      case 'addPartner':
        appendRow(ss.getSheetByName(SHEET_NAMES.PARTNERS), payload, getPartnerHeaders());
        response.message = 'Partner record added to Google Sheet.';
        break;
      case 'updatePartner':
        updateRowById(ss.getSheetByName(SHEET_NAMES.PARTNERS), payload.id, payload, getPartnerHeaders());
        response.message = 'Partner record updated in Google Sheet.';
        break;
      case 'deletePartner':
        deleteRowById(ss.getSheetByName(SHEET_NAMES.PARTNERS), payload.id);
        response.message = 'Partner record deleted from Google Sheet.';
        break;

      // Partner Drawings Handlers
      case 'addPartnerDrawing':
        appendRow(ss.getSheetByName(SHEET_NAMES.PARTNER_DRAWINGS), payload, getPartnerDrawingHeaders());
        response.message = 'Partner drawing recorded in Google Sheet.';
        break;
      case 'updatePartnerDrawing':
        updateRowById(ss.getSheetByName(SHEET_NAMES.PARTNER_DRAWINGS), payload.id, payload, getPartnerDrawingHeaders());
        response.message = 'Partner drawing updated in Google Sheet.';
        break;
      case 'deletePartnerDrawing':
        deleteRowById(ss.getSheetByName(SHEET_NAMES.PARTNER_DRAWINGS), payload.id);
        response.message = 'Partner drawing deleted from Google Sheet.';
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

      // Login History Handler
      case 'recordLogin':
        appendRow(ss.getSheetByName(SHEET_NAMES.LOGIN_HISTORY), payload, getLoginHistoryHeaders());
        response.message = 'Login attempt recorded in Google Sheet.';
        break;

      // Settings Handlers
      case 'updateSettings':
        if (payload) {
          overwriteSheetData(ss.getSheetByName(SHEET_NAMES.SETTINGS), payload, getSettingsHeaders(), '#334155');
          response.message = 'Settings updated in Google Sheet.';
        }
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
  ensureSheetWithHeaders(ss, SHEET_NAMES.LOGIN_HISTORY, getLoginHistoryHeaders(), '#475569');
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

function getLoginHistoryHeaders() {
  return [
    'id', 'timestamp', 'username', 'displayName', 'role', 'status', 'reason', 'device'
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
