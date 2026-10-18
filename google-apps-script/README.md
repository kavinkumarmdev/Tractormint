# 🚜 TractoMint Google Sheet Database Setup Guide

Use any Google Sheet as your personal, zero-cost, private cloud database for TractoMint.

---

## ⚡ 3-Minute Quick Setup

### Step 1: Create a Google Sheet
1. Open [Google Sheets](https://sheets.new) in your browser.
2. Name the sheet **`TractoMint Database`**.

### Step 2: Open Apps Script Editor
1. In the top menu of your Google Sheet, click **Extensions** > **Apps Script**.
2. Delete any boilerplate code inside the editor.
3. Copy the entire contents of [`Code.gs`](./Code.gs) and paste it into the editor.
4. Click the **Save** disk icon (or press `Ctrl+S` / `Cmd+S`).

### Step 3: Deploy as a Web App
1. In the top-right corner of the Apps Script editor, click **Deploy** > **New deployment**.
2. Click the gear icon ⚙️ next to "Select type" and choose **Web app**.
3. Configure the deployment settings:
   - **Description**: `TractoMint Production API`
   - **Execute as**: `Me (<your-email@gmail.com>)`
   - **Who has access**: `Anyone` *(Crucial: allows TractoMint to communicate with your sheet securely)*
4. Click **Deploy**.
5. Grant permissions if prompted (Click *Advanced* -> *Go to TractoMint (unsafe)* -> *Allow*).

### Step 4: Connect in TractoMint
1. Copy the **Web app URL** (starts with `https://script.google.com/macros/s/.../exec`).
2. Open **TractoMint** in your browser.
3. Click **Settings** > **Google Sheets Cloud Integration**.
4. Paste the URL into **Google Apps Script Web App URL** and click **Test & Connect**.
5. Click **Sync to Google Sheet** to initialize all your Fleet, Rates, Drivers, Customers, Trip Sheets, Maintenance, Partners, and System Settings!

---

## 🏛️ Unified 11-Table Architecture

The database is organized into **11 unified tables** powering the entire TractoMint agricultural machinery operations:

1. **`Fleet`**: Tractors, Harvesters, Implements (Rotavator, 5-Tyne, Trailer, Cultivator), HP ratings, EMI monthly details, registration numbers, and live hour meter readings (`id, name, name_ta, type, implementCategory, regNumber, acquisition, purchasePrice, purchaseDate, hp, emiMonthly, emiBank, currentHours, status, notes, is_deleted, created_at, updated_at`)
2. **`RateMatrix`**: Dynamic combination rate matrix for Tractor + Implement pairings per unit (Hour, Acre, Km, Trip) with effective dates (`id, tractorName, implementName, unit, rate, effectiveDate, description, is_deleted, created_at, updated_at`)
3. **`Drivers`**: Tractor drivers, operators, wage models (Daily, Hourly, Monthly, Per Trip), default wage rates, and contact info (`id, name, name_ta, phone, licenseNo, wageType, defaultWage, status, joinedDate, is_deleted, created_at, updated_at`)
4. **`Customers`**: Farmers and business customer directory, village names in English & Tamil, contact numbers, and address (`id, name, name_ta, phone, village, village_ta, address, is_deleted, created_at, updated_at`)
5. **`TripSheets`**: Primary trip billing ledger, start/end meter readings, bill calculation, customer payment tracking, driver bata, and mode of collection (`id, date, startTime, endTime, customerName, driverName, tractorName, implementName, workType, workDescription, billingUnit, startMeter, endMeter, quantity, rate, grossAmount, discount, totalAmount, paidAmount, balanceAmount, paymentStatus, collectedBy, collectedWhen, paymentMode, driverBata, notes, is_deleted, created_at, updated_at`)
6. **`Maintenance`**: Maintenance, diesel consumption logs, rotavator blades, oil changes, battery, nuts & bolts, workshop repairs, and vendor bills (`id, date, assetName, category, category_ta, quantity, unit, unitCost, totalAmount, hourMeter, vendorName, billNumber, paymentMode, notes, is_deleted, created_at, updated_at`)
7. **`IncomeExpense`**: General business operational expenses and miscellaneous revenue tracking (`id, date, type, category, category_ta, description, amount, paymentMode, status, is_deleted, created_at, updated_at`)
8. **`Partners`**: Partner capital contribution, percentage equity ownership, and contact profiles (`id, name, name_ta, sharePercent, phone, investedCapital, is_deleted, created_at, updated_at`)
9. **`PartnerDrawings`**: Partner profit drawings and cash withdrawal ledger (`id, date, partnerName, amount, purpose, paymentMode, is_deleted, created_at, updated_at`)
10. **`Settings`**: Persistent business profile settings, language preference, theme, and sync metadata (`key, value, updatedAt`)
11. **`Users`**: System authentication, Admin and Operator role management, and 4-digit PIN access control (`id, username, pin, role, displayName, displayName_ta, phone, status, isDefault, last_login, is_deleted, created_at, updated_at`)

👉 For the full column-by-column schema and definitions, see **[`table structure`](./table%20structure)**.
