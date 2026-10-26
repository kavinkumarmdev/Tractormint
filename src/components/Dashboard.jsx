import React, { useState } from 'react';
import { 
  TrendingUp, 
  IndianRupee, 
  AlertCircle, 
  Fuel, 
  Tractor, 
  Users, 
  FileText, 
  CheckCircle2, 
  Clock, 
  Plus, 
  ArrowUpRight,
  ArrowDownRight,
  BarChart3,
  PieChart,
  Phone,
  Sparkles,
  CheckCircle,
  Coins
} from 'lucide-react';
import { translations } from '../translations/dictionary';
import { formatDateDDMMYYYY } from '../utils/dateUtils';
import { formatDurationLabel } from '../utils/timeCalcUtils';

export default function Dashboard({ 
  lang = 'ta', 
  tripSheets = [], 
  fleet = [], 
  maintenance = [], 
  incomeExpense = [], 
  drivers = [], 
  customers = [],
  onNavigate,
  onViewSlip
}) {
  const t = translations[lang] || translations.en;
  const [activeChartTab, setActiveChartTab] = useState('overview'); // 'overview' | 'tractors' | 'collections'

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
  const netProfit = (totalTripRevenue + otherIncome) - (totalMaintenanceCost + otherExpense + totalDriverBata);

  const activeTractors = fleet.filter(f => f.type === 'tractor' && f.status !== 'inactive');
  const activeImplements = fleet.filter(f => f.type === 'implement' && f.status !== 'inactive');

  // Collection percentages for Donut Chart
  const collectionPercent = totalTripRevenue > 0 
    ? Math.round((totalTripCollected / totalTripRevenue) * 100) 
    : 0;
  const pendingPercent = 100 - collectionPercent;

  // Group tractor metrics
  const tractorStats = activeTractors.map(trac => {
    const tracTrips = tripSheets.filter(tp => 
      tp.tractorId === trac.id || 
      (tp.tractorName && tp.tractorName.toLowerCase() === trac.name.toLowerCase())
    );
    const totalHours = tracTrips.reduce((acc, tp) => acc + (Number(tp.quantity) || 0), 0);
    const revenue = tracTrips.reduce((acc, tp) => acc + (Number(tp.totalAmount) || 0), 0);
    const displayName = (lang === 'ta' && trac.name_ta) ? trac.name_ta : trac.name;
    return {
      id: trac.id,
      name: displayName,
      regNumber: trac.regNumber || '',
      hours: Math.round(totalHours * 100) / 100,
      revenue,
      tripsCount: tracTrips.length
    };
  }).sort((a, b) => b.revenue - a.revenue);

  const maxTractorRevenue = Math.max(...tractorStats.map(t => t.revenue), 1000);

  // Group customers with highest pending balance
  const customerDueMap = {};
  tripSheets.forEach(tp => {
    const bal = Number(tp.balanceAmount) || 0;
    if (bal > 0) {
      const cid = tp.customerId || tp.customerName;
      if (!customerDueMap[cid]) {
        const found = customers.find(c => c.id === tp.customerId || c.name === tp.customerName);
        customerDueMap[cid] = {
          id: tp.customerId,
          name: (lang === 'ta' && (tp.customerName_ta || found?.name_ta)) ? (tp.customerName_ta || found?.name_ta) : (tp.customerName || found?.name || 'Customer'),
          phone: found?.phone || '',
          balance: 0,
          trips: 0
        };
      }
      customerDueMap[cid].balance += bal;
      customerDueMap[cid].trips += 1;
    }
  });

  const topDueCustomers = Object.values(customerDueMap)
    .sort((a, b) => b.balance - a.balance)
    .slice(0, 5);

  // Helper for bilingual customer name
  const resolveCustomerName = (trip) => {
    if (lang === 'ta') {
      if (trip.customerName_ta) return trip.customerName_ta;
      const found = customers.find(c => c.id === trip.customerId || c.name === trip.customerName);
      if (found && found.name_ta) return found.name_ta;
    }
    return trip.customerName || 'Customer';
  };

  // Helper for bilingual tractor name
  const resolveTractorName = (trip) => {
    if (lang === 'ta') {
      if (trip.tractorName_ta) return trip.tractorName_ta;
      const found = fleet.find(f => f.id === trip.tractorId || f.name === trip.tractorName);
      if (found && found.name_ta) return found.name_ta;
    }
    return trip.tractorName || 'Tractor';
  };

  return (
    <div style={{ maxWidth: '100%', overflowX: 'hidden', paddingBottom: '2.5rem' }}>
      
      {/* Top Welcome & Quick Actions */}
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        marginBottom: '1.25rem', 
        flexWrap: 'wrap', 
        gap: '0.85rem' 
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
          <div style={{
            width: '48px',
            height: '48px',
            borderRadius: '14px',
            background: 'linear-gradient(135deg, #059669 0%, #10b981 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#ffffff',
            boxShadow: '0 4px 12px rgba(16, 185, 129, 0.35)',
            flexShrink: 0
          }}>
            <Tractor size={26} />
          </div>
          <div>
            <h2 style={{ fontSize: '1.35rem', fontWeight: 800, margin: 0, color: 'var(--text-main)' }}>
              {lang === 'ta' ? 'டிராக்டோமின்ட் மேலாண்மை பலகை' : 'TractoMint Fleet Dashboard'}
            </h2>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-light)', marginTop: '2px' }}>
              {lang === 'ta' 
                ? 'டிராக்டர் வாடகை, உழவு டிரிப் மற்றும் ரொக்க வசூல் நேரடி விபரம்' 
                : 'Live tractor rental billings, collections & operational insights'}
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          <button 
            className="btn btn-primary" 
            onClick={() => onNavigate('tripSheets')}
            style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontWeight: 700 }}
          >
            <Plus size={16} />
            <span>{lang === 'ta' ? '+ புதிய உழவு டிரிப்' : '+ New Trip Sheet'}</span>
          </button>
          <button 
            className="btn btn-outline" 
            onClick={() => onNavigate('maintenance')}
            style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontWeight: 600 }}
          >
            <Fuel size={16} />
            <span>{lang === 'ta' ? 'டீசல் / பராமரிப்பு' : 'Fuel / Spares'}</span>
          </button>
        </div>
      </div>

      {/* KPI Cards Grid - Fully Responsive */}
      <div className="kpi-grid" style={{ marginBottom: '1.5rem' }}>
        
        {/* Total Billings */}
        <div className="kpi-card" style={{ borderLeft: '4px solid #10b981' }}>
          <div>
            <div className="kpi-label">{t.totalRevenue}</div>
            <div className="kpi-value" style={{ color: '#047857' }}>₹{totalTripRevenue.toLocaleString()}</div>
            <div className="kpi-subtext" style={{ color: '#10b981' }}>
              <ArrowUpRight size={13} style={{ display: 'inline' }} /> {tripSheets.length} {lang === 'ta' ? 'டிரிப்புகள்' : 'Trips'}
            </div>
          </div>
          <div className="kpi-icon-bubble green">
            <TrendingUp size={24} />
          </div>
        </div>

        {/* Total Collected */}
        <div className="kpi-card" style={{ borderLeft: '4px solid #059669' }}>
          <div>
            <div className="kpi-label">{t.totalCollected}</div>
            <div className="kpi-value" style={{ color: '#059669' }}>₹{totalTripCollected.toLocaleString()}</div>
            <div className="kpi-subtext" style={{ color: '#059669', fontWeight: 600 }}>
              ✓ {collectionPercent}% {lang === 'ta' ? 'வசூலிக்கப்பட்டது' : 'Collected'}
            </div>
          </div>
          <div className="kpi-icon-bubble green">
            <CheckCircle2 size={24} />
          </div>
        </div>

        {/* Outstanding Dues */}
        <div className="kpi-card" style={{ borderLeft: '4px solid #ef4444' }}>
          <div>
            <div className="kpi-label">{t.pendingBalance}</div>
            <div className="kpi-value" style={{ color: '#dc2626' }}>₹{totalTripBalance.toLocaleString()}</div>
            <div className="kpi-subtext" style={{ color: '#dc2626', fontWeight: 600 }}>
              <AlertCircle size={13} style={{ display: 'inline' }} /> {pendingPercent}% {lang === 'ta' ? 'நிலுவை பாக்கி' : 'Pending Due'}
            </div>
          </div>
          <div className="kpi-icon-bubble amber" style={{ background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444' }}>
            <Clock size={24} />
          </div>
        </div>

        {/* Maintenance & Fuel */}
        <div className="kpi-card" style={{ borderLeft: '4px solid #f59e0b' }}>
          <div>
            <div className="kpi-label">{t.totalFuelSpares}</div>
            <div className="kpi-value" style={{ color: '#d97706' }}>₹{totalMaintenanceCost.toLocaleString()}</div>
            <div className="kpi-subtext">
              {lang === 'ta' ? 'டீசல், உதிரிபாகங்கள்' : 'Diesel, Blades & Spares'}
            </div>
          </div>
          <div className="kpi-icon-bubble amber">
            <Fuel size={24} />
          </div>
        </div>

        {/* Net Business Profit */}
        <div className="kpi-card" style={{ borderLeft: `4px solid ${netProfit >= 0 ? '#0284c7' : '#dc2626'}` }}>
          <div>
            <div className="kpi-label">{t.netBusinessProfit}</div>
            <div className="kpi-value" style={{ color: netProfit >= 0 ? '#0284c7' : '#dc2626' }}>
              ₹{netProfit.toLocaleString()}
            </div>
            <div className="kpi-subtext">
              {lang === 'ta' ? 'டீசல், பாட்டா கழித்து' : 'After Diesel, Bata & Spares'}
            </div>
          </div>
          <div className="kpi-icon-bubble blue">
            <IndianRupee size={24} />
          </div>
        </div>

        {/* Fleet Count */}
        <div className="kpi-card" style={{ borderLeft: '4px solid #8b5cf6' }}>
          <div>
            <div className="kpi-label">{t.activeFleetCount}</div>
            <div className="kpi-value" style={{ color: '#6d28d9' }}>
              {activeTractors.length} + {activeImplements.length}
            </div>
            <div className="kpi-subtext">
              {activeTractors.length} {lang === 'ta' ? 'டிராக்டர்கள்' : 'Tractors'}, {activeImplements.length} {lang === 'ta' ? 'கருவிகள்' : 'Implements'}
            </div>
          </div>
          <div className="kpi-icon-bubble purple">
            <Tractor size={24} />
          </div>
        </div>

      </div>

      {/* Visual Analytics & Graphs Section */}
      <div style={{
        background: 'var(--bg-card)',
        border: '1px solid var(--border-color)',
        borderRadius: '16px',
        padding: '1.25rem',
        marginBottom: '1.5rem',
        boxShadow: '0 4px 16px rgba(0,0,0,0.04)'
      }}>
        {/* Analytics Tabs Header */}
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center', 
          flexWrap: 'wrap', 
          gap: '0.75rem',
          borderBottom: '1px solid var(--border-color)',
          paddingBottom: '0.85rem',
          marginBottom: '1.2rem'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <BarChart3 size={20} style={{ color: 'var(--primary-600)' }} />
            <span style={{ fontWeight: 800, fontSize: '1.05rem', color: 'var(--text-main)' }}>
              {lang === 'ta' ? 'வரவு-செலவு & டிராக்டர் இயக்க வரைபடம் (Charts & Graphs)' : 'Financial & Tractor Analytics'}
            </span>
          </div>

          <div style={{ display: 'flex', gap: '0.35rem', background: 'var(--bg-subtle)', padding: '3px', borderRadius: '8px' }}>
            <button
              type="button"
              onClick={() => setActiveChartTab('overview')}
              style={{
                border: 'none',
                padding: '0.4rem 0.85rem',
                borderRadius: '6px',
                fontSize: '0.8rem',
                fontWeight: 700,
                cursor: 'pointer',
                background: activeChartTab === 'overview' ? '#10b981' : 'transparent',
                color: activeChartTab === 'overview' ? '#ffffff' : 'var(--text-main)',
                transition: 'all 0.15s ease'
              }}
            >
              📊 {lang === 'ta' ? 'நிதி சுருக்கம்' : 'Cash Flow'}
            </button>

            <button
              type="button"
              onClick={() => setActiveChartTab('tractors')}
              style={{
                border: 'none',
                padding: '0.4rem 0.85rem',
                borderRadius: '6px',
                fontSize: '0.8rem',
                fontWeight: 700,
                cursor: 'pointer',
                background: activeChartTab === 'tractors' ? '#10b981' : 'transparent',
                color: activeChartTab === 'tractors' ? '#ffffff' : 'var(--text-main)',
                transition: 'all 0.15s ease'
              }}
            >
              🚜 {lang === 'ta' ? 'டிராக்டர் உழைப்பு' : 'Tractors'}
            </button>

            <button
              type="button"
              onClick={() => setActiveChartTab('collections')}
              style={{
                border: 'none',
                padding: '0.4rem 0.85rem',
                borderRadius: '6px',
                fontSize: '0.8rem',
                fontWeight: 700,
                cursor: 'pointer',
                background: activeChartTab === 'collections' ? '#10b981' : 'transparent',
                color: activeChartTab === 'collections' ? '#ffffff' : 'var(--text-main)',
                transition: 'all 0.15s ease'
              }}
            >
              🎯 {lang === 'ta' ? 'வசூல் சதவிகிதம்' : 'Collections'}
            </button>
          </div>
        </div>

        {/* Tab 1: Financial Overview Bars */}
        {activeChartTab === 'overview' && (
          <div>
            <div style={{ 
              display: 'grid', 
              gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', 
              gap: '1.25rem',
              alignItems: 'center'
            }}>
              
              {/* Left Bar Graph Breakdown */}
              <div>
                <div style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '0.85rem' }}>
                  {lang === 'ta' ? 'வருவாய் மற்றும் செலவின ஒப்பீடு:' : 'Revenue vs Operating Cost Comparison:'}
                </div>

                {/* Bar 1: Total Revenue */}
                <div style={{ marginBottom: '0.85rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', fontWeight: 600, marginBottom: '3px' }}>
                    <span>{lang === 'ta' ? '1. மொத்த உழவு கட்டணம்' : '1. Total Billings'}</span>
                    <span style={{ fontWeight: 800, color: '#047857' }}>₹{totalTripRevenue.toLocaleString()}</span>
                  </div>
                  <div style={{ height: '14px', background: 'var(--bg-subtle)', borderRadius: '9999px', overflow: 'hidden' }}>
                    <div style={{ width: '100%', height: '100%', background: 'linear-gradient(90deg, #10b981 0%, #059669 100%)', borderRadius: '9999px' }} />
                  </div>
                </div>

                {/* Bar 2: Total Collected */}
                <div style={{ marginBottom: '0.85rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', fontWeight: 600, marginBottom: '3px' }}>
                    <span>{lang === 'ta' ? '2. கைக்கு வந்த பணம் (ரொக்கம்/வங்கி)' : '2. Cash & UPI Collected'}</span>
                    <span style={{ fontWeight: 800, color: '#16a34a' }}>₹{totalTripCollected.toLocaleString()} ({collectionPercent}%)</span>
                  </div>
                  <div style={{ height: '14px', background: 'var(--bg-subtle)', borderRadius: '9999px', overflow: 'hidden' }}>
                    <div style={{ width: `${Math.min(100, collectionPercent)}%`, height: '100%', background: '#16a34a', borderRadius: '9999px', transition: 'width 0.5s ease' }} />
                  </div>
                </div>

                {/* Bar 3: Outstanding Balance */}
                <div style={{ marginBottom: '0.85rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', fontWeight: 600, marginBottom: '3px' }}>
                    <span>{lang === 'ta' ? '3. வசூலாகாத நிலுவைத் தொகை' : '3. Pending Farmer Dues'}</span>
                    <span style={{ fontWeight: 800, color: '#dc2626' }}>₹{totalTripBalance.toLocaleString()} ({pendingPercent}%)</span>
                  </div>
                  <div style={{ height: '14px', background: 'var(--bg-subtle)', borderRadius: '9999px', overflow: 'hidden' }}>
                    <div style={{ width: `${Math.min(100, pendingPercent)}%`, height: '100%', background: '#ef4444', borderRadius: '9999px', transition: 'width 0.5s ease' }} />
                  </div>
                </div>

                {/* Bar 4: Maintenance & Fuel */}
                <div style={{ marginBottom: '0.85rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', fontWeight: 600, marginBottom: '3px' }}>
                    <span>{lang === 'ta' ? '4. டீசல், சர்வீஸ் & உதிரிபாகங்கள்' : '4. Fuel & Spares Maintenance'}</span>
                    <span style={{ fontWeight: 800, color: '#d97706' }}>₹{totalMaintenanceCost.toLocaleString()}</span>
                  </div>
                  <div style={{ height: '14px', background: 'var(--bg-subtle)', borderRadius: '9999px', overflow: 'hidden' }}>
                    <div style={{ 
                      width: `${totalTripRevenue > 0 ? Math.min(100, Math.round((totalMaintenanceCost / totalTripRevenue) * 100)) : 0}%`, 
                      height: '100%', 
                      background: '#f59e0b', 
                      borderRadius: '9999px',
                      transition: 'width 0.5s ease' 
                    }} />
                  </div>
                </div>

              </div>

              {/* Right Side: Circular Ring Visualizer */}
              <div style={{ 
                display: 'flex', 
                flexDirection: 'column', 
                alignItems: 'center', 
                justifyContent: 'center', 
                padding: '1rem',
                background: 'var(--bg-subtle)',
                borderRadius: '12px'
              }}>
                <div style={{ position: 'relative', width: '130px', height: '130px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <svg viewBox="0 0 36 36" style={{ width: '100%', height: '100%', transform: 'rotate(-90deg)' }}>
                    <circle
                      cx="18"
                      cy="18"
                      r="15.9155"
                      fill="transparent"
                      stroke="#fee2e2"
                      strokeWidth="3.8"
                    />
                    <circle
                      cx="18"
                      cy="18"
                      r="15.9155"
                      fill="transparent"
                      stroke="#10b981"
                      strokeWidth="3.8"
                      strokeDasharray={`${collectionPercent} ${100 - collectionPercent}`}
                      strokeDashoffset="0"
                      strokeLinecap="round"
                    />
                  </svg>
                  <div style={{ position: 'absolute', textAlign: 'center' }}>
                    <div style={{ fontSize: '1.35rem', fontWeight: 900, color: '#047857' }}>
                      {collectionPercent}%
                    </div>
                    <div style={{ fontSize: '0.65rem', fontWeight: 700, color: 'var(--text-light)', textTransform: 'uppercase' }}>
                      {lang === 'ta' ? 'வசூல்' : 'Collected'}
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '1rem', marginTop: '0.85rem', fontSize: '0.75rem', fontWeight: 700 }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#047857' }}>
                    <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#10b981' }} />
                    {lang === 'ta' ? 'வசூலானது' : 'Collected'}: ₹{totalTripCollected.toLocaleString()}
                  </span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#dc2626' }}>
                    <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#ef4444' }} />
                    {lang === 'ta' ? 'நிலுவை' : 'Due'}: ₹{totalTripBalance.toLocaleString()}
                  </span>
                </div>
              </div>

            </div>
          </div>
        )}

        {/* Tab 2: Tractor Utilization Graph */}
        {activeChartTab === 'tractors' && (
          <div>
            <div style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '0.85rem' }}>
              {lang === 'ta' ? 'டிராக்டர்களின் உழவு நேரம் & ஈட்டிய வருமானம்:' : 'Tractor Working Hours & Revenue Generated:'}
            </div>

            {tractorStats.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '1.5rem', color: 'var(--text-light)', fontSize: '0.85rem' }}>
                {lang === 'ta' ? 'டிராக்டர்கள் பதிவு செய்யப்படவில்லை.' : 'No tractors logged yet.'}
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                {tractorStats.map((trac, idx) => {
                  const barWidth = Math.min(100, Math.max(8, Math.round((trac.revenue / maxTractorRevenue) * 100)));
                  return (
                    <div key={trac.id || idx}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.8rem', fontWeight: 700, marginBottom: '3px' }}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span style={{ color: 'var(--primary-600)' }}>🚜 {trac.name}</span>
                          {trac.regNumber && <span style={{ fontSize: '0.7rem', color: 'var(--text-light)', fontWeight: 500 }}>({trac.regNumber})</span>}
                        </span>
                        <span>
                          <span style={{ color: '#047857' }}>₹{trac.revenue.toLocaleString()}</span>
                          <span style={{ color: 'var(--text-light)', fontWeight: 500, marginLeft: '6px' }}>
                            ({trac.hours} {lang === 'ta' ? 'மணி' : 'hrs'} / {trac.tripsCount} {lang === 'ta' ? 'டிரிப்' : 'trips'})
                          </span>
                        </span>
                      </div>
                      <div style={{ height: '12px', background: 'var(--bg-subtle)', borderRadius: '9999px', overflow: 'hidden' }}>
                        <div style={{ 
                          width: `${barWidth}%`, 
                          height: '100%', 
                          background: 'linear-gradient(90deg, #3b82f6 0%, #10b981 100%)', 
                          borderRadius: '9999px',
                          transition: 'width 0.4s ease'
                        }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Tab 3: Collections Breakdown */}
        {activeChartTab === 'collections' && (
          <div>
            <div style={{ 
              display: 'grid', 
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', 
              gap: '1rem',
              textAlign: 'center'
            }}>
              <div style={{ padding: '1rem', background: 'rgba(16, 185, 129, 0.08)', borderRadius: '12px', border: '1px solid rgba(16, 185, 129, 0.2)' }}>
                <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#047857', textTransform: 'uppercase' }}>
                  {lang === 'ta' ? 'முழுவதும் வசூலானவை' : 'Fully Paid Trips'}
                </div>
                <div style={{ fontSize: '1.4rem', fontWeight: 900, color: '#047857', marginTop: '4px' }}>
                  {tripSheets.filter(t => t.paymentStatus === 'paid').length}
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-light)' }}>
                  ₹{tripSheets.filter(t => t.paymentStatus === 'paid').reduce((acc, t) => acc + (Number(t.totalAmount) || 0), 0).toLocaleString()}
                </div>
              </div>

              <div style={{ padding: '1rem', background: 'rgba(239, 68, 68, 0.08)', borderRadius: '12px', border: '1px solid rgba(239, 68, 68, 0.2)' }}>
                <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#dc2626', textTransform: 'uppercase' }}>
                  {lang === 'ta' ? 'நிலுவை டிரிப்புகள்' : 'Pending Due Trips'}
                </div>
                <div style={{ fontSize: '1.4rem', fontWeight: 900, color: '#dc2626', marginTop: '4px' }}>
                  {tripSheets.filter(t => (Number(t.balanceAmount) || 0) > 0).length}
                </div>
                <div style={{ fontSize: '0.75rem', color: '#dc2626', fontWeight: 600 }}>
                  ₹{totalTripBalance.toLocaleString()} {lang === 'ta' ? 'நிலுவை' : 'Due'}
                </div>
              </div>

              <div style={{ padding: '1rem', background: 'rgba(2, 132, 199, 0.08)', borderRadius: '12px', border: '1px solid rgba(2, 132, 199, 0.2)' }}>
                <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#0284c7', textTransform: 'uppercase' }}>
                  {lang === 'ta' ? 'வசூல் திறன்' : 'Collection Rate'}
                </div>
                <div style={{ fontSize: '1.4rem', fontWeight: 900, color: '#0284c7', marginTop: '4px' }}>
                  {collectionPercent}%
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-light)' }}>
                  {lang === 'ta' ? 'மொத்த வருவாயில்' : 'of Total Billed'}
                </div>
              </div>
            </div>
          </div>
        )}

      </div>

      {/* Top Pending Farmers List if any */}
      {topDueCustomers.length > 0 && (
        <div style={{
          background: 'var(--bg-card)',
          border: '1px solid #fecaca',
          borderRadius: '16px',
          padding: '1.1rem',
          marginBottom: '1.5rem',
          boxShadow: '0 2px 10px rgba(239, 68, 68, 0.05)'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.85rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', color: '#b91c1c', fontWeight: 800, fontSize: '0.95rem' }}>
              <AlertCircle size={18} />
              <span>{lang === 'ta' ? 'விவசாயிகள் நிலுவை பாக்கி முன்னுரிமைப் பட்டியல்' : 'Top Farmer Outstanding Dues'}</span>
            </div>
            <button 
              className="btn btn-outline btn-sm" 
              onClick={() => onNavigate('tripSheets')}
              style={{ fontSize: '0.75rem', borderColor: '#fca5a5', color: '#b91c1c' }}
            >
              {lang === 'ta' ? 'வசூல் செய்ய டிரிப் சீட்டுக்குச் செல்' : 'Go to Trip Sheet'}
            </button>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.75rem' }}>
            {topDueCustomers.map((c, i) => (
              <div 
                key={c.id || i}
                style={{
                  padding: '0.75rem',
                  borderRadius: '10px',
                  background: 'rgba(254, 226, 226, 0.35)',
                  border: '1px solid rgba(252, 165, 165, 0.4)',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}
              >
                <div>
                  <div style={{ fontWeight: 800, fontSize: '0.875rem', color: 'var(--text-main)' }}>
                    {c.name}
                  </div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-light)', marginTop: '2px' }}>
                    {c.trips} {lang === 'ta' ? 'டிரிப்புகள்' : 'Trips'}
                  </div>
                </div>

                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontWeight: 900, fontSize: '1rem', color: '#dc2626' }}>
                    ₹{c.balance.toLocaleString()}
                  </div>
                  {c.phone && (
                    <a 
                      href={`tel:${c.phone}`}
                      style={{ fontSize: '0.7rem', color: '#059669', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '2px', justifyContent: 'flex-end', marginTop: '2px' }}
                    >
                      <Phone size={10} /> {c.phone}
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Two Column Layout: Recent Trip Sheets & Fuel Maintenance */}
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 320px), 1fr))', 
        gap: '1.25rem',
        maxWidth: '100%',
        overflowX: 'hidden'
      }}>
        
        {/* Recent Trip Sheets */}
        <div className="content-card" style={{ maxWidth: '100%', overflowX: 'hidden' }}>
          <div className="card-header-bar">
            <div className="card-title-group">
              <h2><FileText size={18} /> {lang === 'ta' ? 'சமீபத்திய உழவு பதிவுகள்' : 'Recent Trip Sheets'}</h2>
            </div>
            <button className="btn btn-outline btn-sm" onClick={() => onNavigate('tripSheets')}>
              {lang === 'ta' ? 'அனைத்தும்' : 'View All'}
            </button>
          </div>

          <div className="table-responsive" style={{ maxWidth: '100%', overflowX: 'auto' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>{t.tripId}</th>
                  <th>{t.customerName}</th>
                  <th>{t.tractor}</th>
                  <th>{t.totalAmount}</th>
                  <th>{lang === 'ta' ? 'நிலை' : 'Status'}</th>
                  <th>{lang === 'ta' ? 'ரசீது' : 'Slip'}</th>
                </tr>
              </thead>
              <tbody>
                {tripSheets.slice(0, 5).map(trip => {
                  const custName = resolveCustomerName(trip);
                  const tracName = resolveTractorName(trip);
                  const isPaid = trip.paymentStatus === 'paid';
                  const isPartial = trip.paymentStatus === 'partial';

                  return (
                    <tr key={trip.id}>
                      <td style={{ fontWeight: 700, color: 'var(--primary-700)' }}>{trip.id}</td>
                      <td>
                        <div style={{ fontWeight: 700 }}>{custName}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-light)' }}>{formatDateDDMMYYYY(trip.date)}</div>
                      </td>
                      <td>
                        <div style={{ fontSize: '0.8rem', fontWeight: 600 }}>{tracName}</div>
                        <div style={{ fontSize: '0.7rem', color: 'var(--text-light)' }}>{trip.implementName}</div>
                      </td>
                      <td style={{ fontWeight: 800 }}>₹{trip.totalAmount}</td>
                      <td>
                        <span className={`badge ${
                          isPaid ? 'badge-paid' : isPartial ? 'badge-partial' : 'badge-unpaid'
                        }`}>
                          {isPaid ? (lang === 'ta' ? 'வசூலானது' : 'Paid') :
                           isPartial ? (lang === 'ta' ? 'பகுதி வசூல்' : 'Partial') : 
                           (lang === 'ta' ? 'நிலுவை' : 'Unpaid')}
                        </span>
                      </td>
                      <td>
                        <button 
                          className="btn btn-outline btn-sm" 
                          onClick={() => onViewSlip(trip)}
                          title="View & Print Slip"
                          style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem' }}
                        >
                          {lang === 'ta' ? 'ரசீது' : 'Slip'}
                        </button>
                      </td>
                    </tr>
                  );
                })}
                {tripSheets.length === 0 && (
                  <tr>
                    <td colSpan="6" style={{ textAlign: 'center', padding: '1.5rem', color: 'var(--text-light)' }}>
                      {lang === 'ta' ? 'உழவுப் பதிவுகள் எதுவும் இல்லை.' : 'No trip sheets recorded yet.'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Maintenance & Spare Parts Tracker */}
        <div className="content-card" style={{ maxWidth: '100%', overflowX: 'hidden' }}>
          <div className="card-header-bar">
            <div className="card-title-group">
              <h2><Fuel size={18} /> {lang === 'ta' ? 'டீசல் & உதிரிபாகங்கள்' : 'Fuel & Spares Maintenance'}</h2>
            </div>
            <button className="btn btn-outline btn-sm" onClick={() => onNavigate('maintenance')}>
              {lang === 'ta' ? 'அனைத்தும்' : 'View All'}
            </button>
          </div>

          <div className="table-responsive" style={{ maxWidth: '100%', overflowX: 'auto' }}>
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
                    <td>{formatDateDDMMYYYY(m.date)}</td>
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
                    <td colSpan="5" style={{ textAlign: 'center', padding: '1.5rem', color: 'var(--text-light)' }}>
                      {lang === 'ta' ? 'பராமரிப்பு செலவுகள் எதுவும் இல்லை.' : 'No maintenance logged yet.'}
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
