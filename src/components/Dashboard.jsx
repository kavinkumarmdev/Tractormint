import React from 'react';
import { 
  TrendingUp, 
  IndianRupee, 
  AlertCircle, 
  Fuel, 
  Tractor, 
  Users, 
  FileText, 
  CheckCircle, 
  Clock, 
  Plus, 
  ArrowUpRight,
  ArrowDownRight
} from 'lucide-react';
import { translations } from '../translations/dictionary';

export default function Dashboard({ 
  lang, 
  tripSheets, 
  fleet, 
  maintenance, 
  incomeExpense, 
  drivers, 
  customers,
  onNavigate,
  onViewSlip
}) {
  const t = translations[lang];

  // Financial Calculations
  const totalTripRevenue = tripSheets.reduce((acc, curr) => acc + (Number(curr.totalAmount) || 0), 0);
  const totalTripCollected = tripSheets.reduce((acc, curr) => acc + (Number(curr.paidAmount) || 0), 0);
  const totalTripBalance = tripSheets.reduce((acc, curr) => acc + (Number(curr.balanceAmount) || 0), 0);

  const totalMaintenanceCost = maintenance.reduce((acc, curr) => acc + (Number(curr.totalAmount) || 0), 0);
  
  const otherIncome = incomeExpense
    .filter(x => x.type === 'income')
    .reduce((acc, curr) => acc + (Number(curr.amount) || 0), 0);
    
  const otherExpense = incomeExpense
    .filter(x => x.type === 'expense')
    .reduce((acc, curr) => acc + (Number(curr.amount) || 0), 0);

  const totalDriverBata = tripSheets.reduce((acc, curr) => acc + (Number(curr.driverBata) || 0), 0);

  // Net Business Profit = (Total Trip Revenue + Other Income) - (Maintenance + Other Expense + Driver Bata)
  const netProfit = (totalTripRevenue + otherIncome) - (totalMaintenanceCost + otherExpense + totalDriverBata);

  const activeTractors = fleet.filter(f => f.type === 'tractor' && f.status !== 'inactive').length;
  const activeImplements = fleet.filter(f => f.type === 'implement' && f.status !== 'inactive').length;

  return (
    <div>
      {/* Top Welcome & Quick Actions */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <img 
            src="/logo.png" 
            alt="TractoMint" 
            style={{ 
              width: '56px', 
              height: '56px', 
              borderRadius: '16px', 
              boxShadow: '0 4px 14px rgba(5, 150, 105, 0.25)',
              border: '2px solid rgba(52, 211, 153, 0.4)',
              objectFit: 'cover'
            }} 
          />
          <div>
            <h2 style={{ fontSize: '1.5rem', fontWeight: 800 }}>
              {lang === 'ta' ? 'வணக்கம்! டிராக்டோமின்ட் மேலாண்மை பலகை' : 'Welcome to TractoMint Overview'}
            </h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>
              {lang === 'ta' 
                ? 'டிராக்டர் உழவு, வாடகை வருவாய், டீசல் மற்றும் பராமரிப்பு செலவுகளின் நேரடி நிலவரம்' 
                : 'Live tracking of tractor operations, customer dues, fuel & maintenance'}
            </p>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button className="btn btn-primary" onClick={() => onNavigate('tripSheets')}>
            <Plus size={16} />
            {lang === 'ta' ? '+ புதிய உழவு டிரிப்' : '+ New Trip Sheet'}
          </button>
          <button className="btn btn-outline" onClick={() => onNavigate('maintenance')}>
            <Fuel size={16} />
            {lang === 'ta' ? '+ டீசல் / சர்வீஸ்' : '+ Fuel / Spares'}
          </button>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="kpi-grid">
        {/* Total Billings */}
        <div className="kpi-card">
          <div>
            <div className="kpi-label">{t.totalRevenue}</div>
            <div className="kpi-value">₹{totalTripRevenue.toLocaleString()}</div>
            <div className="kpi-subtext" style={{ color: '#16a34a' }}>
              <ArrowUpRight size={13} style={{ display: 'inline' }} /> {tripSheets.length} {t.completedTrips}
            </div>
          </div>
          <div className="kpi-icon-bubble green">
            <TrendingUp size={26} />
          </div>
        </div>

        {/* Total Collected */}
        <div className="kpi-card">
          <div>
            <div className="kpi-label">{t.totalCollected}</div>
            <div className="kpi-value" style={{ color: '#16a34a' }}>₹{totalTripCollected.toLocaleString()}</div>
            <div className="kpi-subtext">
              Cash & UPI Payments
            </div>
          </div>
          <div className="kpi-icon-bubble green">
            <CheckCircle size={26} />
          </div>
        </div>

        {/* Outstanding Dues */}
        <div className="kpi-card">
          <div>
            <div className="kpi-label">{t.pendingBalance}</div>
            <div className="kpi-value" style={{ color: '#dc2626' }}>₹{totalTripBalance.toLocaleString()}</div>
            <div className="kpi-subtext" style={{ color: '#dc2626' }}>
              <AlertCircle size={13} style={{ display: 'inline' }} /> Farmers Balance Due
            </div>
          </div>
          <div className="kpi-icon-bubble amber">
            <Clock size={26} />
          </div>
        </div>

        {/* Maintenance & Fuel */}
        <div className="kpi-card">
          <div>
            <div className="kpi-label">{t.totalFuelSpares}</div>
            <div className="kpi-value" style={{ color: '#d97706' }}>₹{totalMaintenanceCost.toLocaleString()}</div>
            <div className="kpi-subtext">
              Diesel, Blades, Spares & Oil
            </div>
          </div>
          <div className="kpi-icon-bubble amber">
            <Fuel size={26} />
          </div>
        </div>

        {/* Net Business Profit */}
        <div className="kpi-card">
          <div>
            <div className="kpi-label">{t.netBusinessProfit}</div>
            <div className="kpi-value" style={{ color: netProfit >= 0 ? '#059669' : '#dc2626' }}>
              ₹{netProfit.toLocaleString()}
            </div>
            <div className="kpi-subtext">
              After Fuel, Spares & Bata
            </div>
          </div>
          <div className="kpi-icon-bubble blue">
            <IndianRupee size={26} />
          </div>
        </div>

        {/* Fleet Count */}
        <div className="kpi-card">
          <div>
            <div className="kpi-label">{t.activeFleetCount}</div>
            <div className="kpi-value">{activeTractors} + {activeImplements}</div>
            <div className="kpi-subtext">
              {activeTractors} Tractors, {activeImplements} Implements
            </div>
          </div>
          <div className="kpi-icon-bubble purple">
            <Tractor size={26} />
          </div>
        </div>
      </div>

      {/* Two Column Layout: Recent Trip Sheets & Maintenance Highlights */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(480px, 1fr))', gap: '1.5rem' }}>
        
        {/* Recent Trip Sheets */}
        <div className="content-card">
          <div className="card-header-bar">
            <div className="card-title-group">
              <h2><FileText size={18} /> {lang === 'ta' ? 'சமீபத்திய உழவு பதிவுகள்' : 'Recent Trip Sheets'}</h2>
              <p>{lang === 'ta' ? 'கடைசியாக பதிவு செய்யப்பட்ட 5 டிரிப்புகள்' : 'Latest work log entries'}</p>
            </div>
            <button className="btn btn-outline btn-sm" onClick={() => onNavigate('tripSheets')}>
              {lang === 'ta' ? 'அனைத்தையும் பார்க்க' : 'View All'}
            </button>
          </div>

          <div className="table-responsive">
            <table className="data-table">
              <thead>
                <tr>
                  <th>{t.tripId}</th>
                  <th>{t.customerName}</th>
                  <th>{t.tractor}</th>
                  <th>{t.totalAmount}</th>
                  <th>Status</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {tripSheets.slice(0, 5).map(trip => (
                  <tr key={trip.id}>
                    <td style={{ fontWeight: 700, color: 'var(--primary-700)' }}>{trip.id}</td>
                    <td>
                      <div style={{ fontWeight: 600 }}>{trip.customerName}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-light)' }}>{trip.date}</div>
                    </td>
                    <td>
                      <div style={{ fontSize: '0.8rem' }}>{trip.tractorName}</div>
                      <div style={{ fontSize: '0.7rem', color: 'var(--text-light)' }}>{trip.implementName}</div>
                    </td>
                    <td style={{ fontWeight: 700 }}>₹{trip.totalAmount}</td>
                    <td>
                      <span className={`badge ${
                        trip.paymentStatus === 'paid' ? 'badge-paid' :
                        trip.paymentStatus === 'partial' ? 'badge-partial' : 'badge-unpaid'
                      }`}>
                        {trip.paymentStatus === 'paid' ? t.paid :
                         trip.paymentStatus === 'partial' ? t.partial : t.unpaid}
                      </span>
                    </td>
                    <td>
                      <button 
                        className="btn btn-outline btn-sm" 
                        onClick={() => onViewSlip(trip)}
                        title="View & Print Slip"
                      >
                        {t.printSlip}
                      </button>
                    </td>
                  </tr>
                ))}
                {tripSheets.length === 0 && (
                  <tr>
                    <td colSpan="6" style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-light)' }}>
                      No trip sheets recorded yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Maintenance & Spare Parts Tracker */}
        <div className="content-card">
          <div className="card-header-bar">
            <div className="card-title-group">
              <h2><Fuel size={18} /> {lang === 'ta' ? 'டீசல் & உதிரிபாகங்கள் செலவு' : 'Fuel & Spares Maintenance'}</h2>
              <p>{lang === 'ta' ? 'சமீபத்திய பராமரிப்பு மற்றும் வாங்குதல்கள்' : 'Latest spares, blades and fuel expenses'}</p>
            </div>
            <button className="btn btn-outline btn-sm" onClick={() => onNavigate('maintenance')}>
              {lang === 'ta' ? 'அனைத்தையும் பார்க்க' : 'View All'}
            </button>
          </div>

          <div className="table-responsive">
            <table className="data-table">
              <thead>
                <tr>
                  <th>{t.tripDate}</th>
                  <th>{t.partOrService}</th>
                  <th>{t.tractor}</th>
                  <th>{t.quantity}</th>
                  <th>{t.totalCost}</th>
                </tr>
              </thead>
              <tbody>
                {maintenance.slice(0, 5).map(m => (
                  <tr key={m.id}>
                    <td>{m.date}</td>
                    <td>
                      <div style={{ fontWeight: 600 }}>{lang === 'ta' ? (m.category_ta || m.category) : m.category}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-light)' }}>{m.vendorName}</div>
                    </td>
                    <td style={{ fontSize: '0.8rem' }}>{m.assetName}</td>
                    <td>{m.quantity} {m.unit}</td>
                    <td style={{ fontWeight: 700, color: '#d97706' }}>₹{m.totalAmount}</td>
                  </tr>
                ))}
                {maintenance.length === 0 && (
                  <tr>
                    <td colSpan="5" style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-light)' }}>
                      No maintenance logged yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </div>
  );
}
