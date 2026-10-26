# ==============================================================================
# TRACTOMINT - UNIFIED 11-TABLE RELATIONAL DATABASE SCHEMA ARCHITECTURE
# ==============================================================================
# This enterprise schema normalizes the entire TractoMint platform (Fleet & Implements,
# Combination Rate Matrix, Drivers & Bata, Farmers & Ledger, Trip Billing & Meter Readings,
# Spares & Diesel Maintenance, Income & Expense, Partner Capital & Drawings,
# Settings, and Multi-User Role Authentication) into 11 cohesive, robust tables.
# ==============================================================================

# ------------------------------------------------------------------------------
# 1) Fleet (Tractors, Implements & Heavy Machinery Registry)
# ------------------------------------------------------------------------------
# Master registry for all motorized assets (Tractors, Harvesters) and attachments
# (Rotavator, 5-Tyne Cultivator, Trailer, Disc Plough, Seed Drill).
Fleet
id,name,name_ta,type,implementCategory,regNumber,acquisition,purchasePrice,purchaseDate,hp,emiMonthly,emiBank,currentHours,status,notes,is_deleted,created_at,updated_at
# Fields Explanation:
# - id: Unique vehicle/machine identifier (e.g., flt_trc_01, flt_rot_01)
# - name: Asset title in English (e.g., "Mahindra 575 DI", "Shaktiman 7ft Rotavator")
# - name_ta: Asset title in Tamil (e.g., "மகிந்திரா 575 DI", "சக்திமான் ரோட்டவேட்டர்")
# - type: Asset classification ("tractor", "implement", "harvester", "vehicle")
# - implementCategory: Category for implements ("Rotavator", "5-Tyne", "Trailer", "Plough", "None")
# - regNumber: Government vehicle registration plate (e.g., "TN-48-AB-1234")
# - acquisition: Ownership model ("owned", "leased", "financed")
# - purchasePrice: Initial purchase price in INR (e.g., 750000)
# - purchaseDate: Date asset was acquired (YYYY-MM-DD)
# - hp: Engine Horsepower rating (e.g., 45, 50)
# - emiMonthly: Monthly loan installment in INR (0 if fully paid)
# - emiBank: Financing institution name (e.g., "SBI Agri Finance", "HDFC Bank")
# - currentHours: Cumulative lifetime hour meter reading (e.g., 1420.5)
# - status: Operational state ("active", "maintenance", "idle", "sold")
# - notes: Engine number, chassis details, or general notes
# - is_deleted: Soft delete flag (false / true)
# - created_at: Timestamp when record was created (ISO 8601 string)
# - updated_at: Timestamp of latest update (ISO 8601 string)


# ------------------------------------------------------------------------------
# 2) RateMatrix (Dynamic Machine Combination Pricing Matrix)
# ------------------------------------------------------------------------------
# Combinatorial pricing rules mapping specific Tractor + Implement combinations
# to billing rates per Hour, Acre, Kilometer, or Fixed Trip.
RateMatrix
id,tractorName,implementName,unit,rate,effectiveDate,description,is_deleted,created_at,updated_at
# Fields Explanation:
# - id: Unique matrix identifier (e.g., rm_001)
# - tractorName: Name of tractor (e.g., "Mahindra 575 DI", or "All")
# - implementName: Attached implement (e.g., "Rotavator 7ft", "5-Tyne Cultivator", "Trailer")
# - unit: Billing measurement unit ("hours", "acres", "km", "trips")
# - rate: Custom rate per unit in INR (e.g., 1100 per hour, 1400 per acre)
# - effectiveDate: Inception date for this rate rule (YYYY-MM-DD)
# - description: Seasonal or crop condition notes (e.g., "Wet land rotavating")
# - is_deleted: Soft delete flag (false / true)
# - created_at: Timestamp of creation (ISO 8601 string)
# - updated_at: Timestamp of latest modification (ISO 8601 string)


# ------------------------------------------------------------------------------
# 3) Drivers (Workforce, Operators & Labor Registry)
# ------------------------------------------------------------------------------
# Profiles and wage terms for tractor operators, coolies, and field mechanics.
Drivers
id,name,name_ta,phone,licenseNo,wageType,defaultWage,status,joinedDate,is_deleted,created_at,updated_at
# Fields Explanation:
# - id: Unique driver identifier (e.g., drv_001)
# - name: Driver name in English (e.g., "Murugan K.")
# - name_ta: Driver name in Tamil (e.g., "முருகன் கே.")
# - phone: 10-digit primary mobile contact (e.g., "9876543210")
# - licenseNo: Heavy vehicle / tractor transport driving license number
# - wageType: Wage model ("daily", "hourly", "monthly", "per_trip")
# - defaultWage: Standard daily salary or hourly bata in INR (e.g., 600)
# - status: Employment status ("active", "on_leave", "resigned")
# - joinedDate: Date driver started working (YYYY-MM-DD)
# - is_deleted: Soft delete flag (false / true)
# - created_at: Timestamp of creation (ISO 8601 string)
# - updated_at: Timestamp of update (ISO 8601 string)


# ------------------------------------------------------------------------------
# 4) Customers (Farmers & Client Directory with Ledger)
# ------------------------------------------------------------------------------
# Master directory for all farmers, landlords, and commercial haulage clients.
Customers
id,name,name_ta,phone,village,village_ta,address,is_deleted,created_at,updated_at
# Fields Explanation:
# - id: Unique customer identifier (e.g., cst_001)
# - name: Farmer name in English (e.g., "Perumal Gounder")
# - name_ta: Farmer name in Tamil (e.g., "பெருமாள் கவுண்டர்")
# - phone: 10-digit primary contact phone
# - village: Village / Panchayat town in English (e.g., "Kallakurichi", "Thalaivasal")
# - village_ta: Village in Tamil (e.g., "கள்ளக்குறிச்சி", "தலைவாசல்")
# - address: Farm landmark, survey number, or street address
# - is_deleted: Soft delete flag (false / true)
# - created_at: Timestamp of creation (ISO 8601 string)
# - updated_at: Timestamp of update (ISO 8601 string)


# ------------------------------------------------------------------------------
# 5) TripSheets (Primary Trip Billing Ledger & Meter Readings)
# ------------------------------------------------------------------------------
# The operational core of TractoMint: tracks each trip, starting/ending meter readings,
# customer billing, discounts, payments received, driver bata, and balances.
TripSheets
id,date,startTime,endTime,customerName,driverName,tractorName,implementName,workType,workDescription,billingUnit,startMeter,endMeter,quantity,rate,grossAmount,discount,totalAmount,paidAmount,balanceAmount,paymentStatus,collectedBy,collectedWhen,paymentMode,driverBata,notes,is_deleted,created_at,updated_at
# Fields Explanation:
# - id: Unique trip sheet identifier (e.g., trp_2026_001)
# - date: Date of work execution (YYYY-MM-DD)
# - startTime: Trip start time (HH:MM AM/PM)
# - endTime: Trip completion time (HH:MM AM/PM)
# - customerName: Farmer / customer billed (matches Customers.name)
# - driverName: Tractor driver assigned (matches Drivers.name)
# - tractorName: Tractor used (matches Fleet.name)
# - implementName: Implement attached (matches Fleet.name)
# - workType: Work category ("Plowing", "Rotavating", "Leveling", "Harvesting", "Hauling")
# - workDescription: Work narrative or plot location notes
# - billingUnit: Unit basis ("hours", "acres", "km", "trips")
# - startMeter: Starting hour meter reading on tractor dashboard (e.g., 1412.0)
# - endMeter: Ending hour meter reading on tractor dashboard (e.g., 1415.5)
# - quantity: Total units worked (e.g., 3.5 hours, 4 acres)
# - rate: Unit billing rate in INR (e.g., 1100)
# - grossAmount: Subtotal before discounts (quantity * rate)
# - discount: Concession or roundoff discount in INR
# - totalAmount: Final net bill payable (grossAmount - discount)
# - paidAmount: Cash or digital payment collected upfront (e.g., 3000)
# - balanceAmount: Outstanding customer due amount (totalAmount - paidAmount)
# - paymentStatus: Collection status ("paid", "partial", "pending")
# - collectedBy: Person who received payment ("Driver", "Admin", "Partner")
# - collectedWhen: Payment collection date or timestamp
# - paymentMode: Method ("Cash", "UPI / GPay", "Bank Transfer")
# - driverBata: Daily bata or trip allowance paid to driver in INR (e.g., 200)
# - notes: Operational remarks
# - is_deleted: Soft delete flag (false / true)
# - created_at: Creation timestamp (ISO 8601 string)
# - updated_at: Update timestamp (ISO 8601 string)


# ------------------------------------------------------------------------------
# 6) Maintenance (Diesel, Spares, Oil, Blades & Repair Ledger)
# ------------------------------------------------------------------------------
# Comprehensive maintenance log for tracking diesel refills, rotavator blades,
# engine oil changes, grease, battery, filters, tyres, and mechanic workshop bills.
Maintenance
id,date,assetName,category,category_ta,quantity,unit,unitCost,totalAmount,hourMeter,vendorName,billNumber,paymentMode,notes,is_deleted,created_at,updated_at
# Fields Explanation:
# - id: Unique maintenance record identifier (e.g., mnt_001)
# - date: Service / Purchase date (YYYY-MM-DD)
# - assetName: Machine serviced (e.g., "Mahindra 575 DI", "Rotavator 7ft")
# - category: Expense category ("Diesel", "Blades", "Engine Oil", "Hydraulic Oil", "Grease", "Tyre", "Battery", "Welding & Repair", "Spares")
# - category_ta: Category in Tamil ("டீசல்", "பிளேடுகள்", "என்ஜின் ஆயில்", "கிரீஸ்", "பழுதுபார்ப்பு")
# - quantity: Purchased quantity (e.g., 35 for diesel, 42 for blades)
# - unit: Unit of measurement ("liters", "pcs", "sets", "service")
# - unitCost: Price per single unit in INR (e.g., 94.50 per liter)
# - totalAmount: Total expense amount in INR (e.g., 3307.50)
# - hourMeter: Tractor hour meter at time of refill/repair (e.g., 1418.0)
# - vendorName: Petrol bunk, workshop, or spare parts store name
# - billNumber: Invoice number / Cash receipt bill
# - paymentMode: "Cash", "UPI / GPay", "Bunk Account / Credit"
# - notes: Brand name (e.g., Castrol CRB, Tata Blades, Exide) or repair notes
# - is_deleted: Soft delete flag (false / true)
# - created_at: Creation timestamp (ISO 8601 string)
# - updated_at: Update timestamp (ISO 8601 string)


# ------------------------------------------------------------------------------
# 7) IncomeExpense (General Operational Income & Overhead Expenses)
# ------------------------------------------------------------------------------
# Secondary financial ledger for general business income (subsidy, insurance claim,
# scrap metal sales) and overhead expenses (shed rent, electricity, phone, tax).
IncomeExpense
id,date,type,category,category_ta,description,amount,paymentMode,status,is_deleted,created_at,updated_at
# Fields Explanation:
# - id: Unique record identifier (e.g., ine_001)
# - date: Transaction date (YYYY-MM-DD)
# - type: Cash flow direction ("income" or "expense")
# - category: Ledger head ("Shed Rent", "Electricity", "Office Tea", "Tractor Insurance", "RTO Tax", "Scrap Sale", "Other")
# - category_ta: Category in Tamil ("வாடகை", "மின்சாரம்", "இன்சூரன்ஸ்", "வரி")
# - description: Narrative description of transaction
# - amount: Value in INR (e.g., 1500)
# - paymentMode: "Cash", "UPI", "Bank Transfer"
# - status: Settlement status ("completed", "pending")
# - is_deleted: Soft delete flag (false / true)
# - created_at: Creation timestamp (ISO 8601 string)
# - updated_at: Update timestamp (ISO 8601 string)


# ------------------------------------------------------------------------------
# 8) Partners (Co-Ownership Capital & Equity Sharing)
# ------------------------------------------------------------------------------
# Profiles for business partners with their equity ownership share percentage
# and cumulative invested capital.
Partners
id,name,name_ta,sharePercent,phone,investedCapital,is_deleted,created_at,updated_at
# Fields Explanation:
# - id: Unique partner identifier (e.g., prt_001)
# - name: Partner name in English (e.g., "Selvam R.")
# - name_ta: Partner name in Tamil (e.g., "செல்வம் ஆர்.")
# - sharePercent: Profit/Loss sharing percentage (e.g., 50)
# - phone: Contact telephone number
# - investedCapital: Total capital contributed in INR (e.g., 500000)
# - is_deleted: Soft delete flag (false / true)
# - created_at: Creation timestamp (ISO 8601 string)
# - updated_at: Update timestamp (ISO 8601 string)


# ------------------------------------------------------------------------------
# 9) PartnerDrawings (Partner Profit Drawings & Withdrawals Ledger)
# ------------------------------------------------------------------------------
# Dedicated chronological ledger tracking cash withdrawals taken by business partners
# against their profit share.
PartnerDrawings
id,date,partnerName,amount,purpose,paymentMode,is_deleted,created_at,updated_at
# Fields Explanation:
# - id: Unique drawing entry identifier (e.g., drw_001)
# - date: Withdrawal date (YYYY-MM-DD)
# - partnerName: Name of partner withdrawing cash (matches Partners.name)
# - amount: Amount withdrawn in INR (e.g., 15000)
# - purpose: Purpose or reason for withdrawal (e.g., "Personal family expense")
# - paymentMode: "Cash", "Bank Transfer", "UPI"
# - is_deleted: Soft delete flag (false / true)
# - created_at: Creation timestamp (ISO 8601 string)
# - updated_at: Update timestamp (ISO 8601 string)


# ------------------------------------------------------------------------------
# 10) Settings (System Configuration & Business Profile Store)
# ------------------------------------------------------------------------------
# Key-Value configuration store for business information, language, theme,
# and cloud synchronization metadata.
Settings
key,value,updatedAt
# Fields Explanation:
# - key: Configuration identifier key (e.g., "companyName", "companyName_ta", "contactPhone", "address", "language", "darkMode", "lastSynced")
# - value: Setting value (string or JSON serialized string)
# - updatedAt: Timestamp of latest update (ISO 8601 string)


# ------------------------------------------------------------------------------
# 11) Users (Authentication, Role Security & Login PINs)
# ------------------------------------------------------------------------------
# Multi-user accounts with role-based access control (Admin vs. Operator).
Users
id,username,pin,role,displayName,displayName_ta,phone,status,isDefault,last_login,is_deleted,created_at,updated_at
# Fields Explanation:
# - id: Unique user account identifier (e.g., "usr-admin", "usr-op-01")
# - username: Login username (e.g., "admin", "operator1")
# - pin: 4-digit security PIN for keypad authentication (e.g., "1234")
# - role: Access permission tier ("admin" for full access, "operator" for trip entry only)
# - displayName: Full name in English (e.g., "Master Administrator")
# - displayName_ta: Full name in Tamil (e.g., "முதன்மை நிர்வாகி")
# - phone: Contact number
# - status: Account status ("active", "suspended", "inactive")
# - isDefault: System default account flag (true for default root admin)
# - last_login: Timestamp of most recent user login
# - is_deleted: Soft delete flag (false / true)
# - created_at: Creation timestamp (ISO 8601 string)
# - updated_at: Update timestamp (ISO 8601 string)
