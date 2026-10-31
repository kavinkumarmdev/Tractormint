import React, { useState, useMemo } from 'react';
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
  Coins,
  ShieldCheck,
  Calendar,
  Eye,
  Receipt,
  Wrench,
  Activity,
  Layers,
  ArrowRight,
  Gauge
} from 'lucide-react';
import { translations } from '../translations/dictionary';
import { formatDateDDMMYYYY } from '../utils/dateUtils';
import { formatDurationLabel } from '../utils/timeCalcUtils';
import { isNameMatch } from '../utils/langUtils';

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
  const [timeRange, setTimeRange] = useState('all'); // 'all' | 'month' | 'today'

  // Time Range Filter Slicing
  const filteredTripSheets = useMemo(() => {
    if (timeRange === 'all') return tripSheets;
    const now = new Date();
    const todayStr = now.toISOString().slice(0, 10);
    const monthStr = now.toISOString().slice(0, 7);

    return tripSheets.filter(tp => {
      if (!tp.date) return false;
      const d = tp.date.slice(0, 10);
      if (timeRange === 'today') return d === todayStr;
      if (timeRange === 'month') return d.startsWith(monthStr);
      return true;
    });
  }, [tripSheets, timeRange]);

  const filteredMaintenance = useMemo(() => {
    if (timeRange === 'all') return maintenance;
    const now = new Date();
    const todayStr = now.toISOString().slice(0, 10);
    const monthStr = now.toISOString().slice(0, 7);

    return maintenance.filter(m => {
      if (!m.date) return false;
      const d = m.date.slice(0, 10);
      if (timeRange === 'today') return d === todayStr;
      if (timeRange === 'month') return d.startsWith(monthStr);
      return true;
    });
  }, [maintenance, timeRange]);

  const filteredIncomeExpense = useMemo(() => {
    if (timeRange === 'all') return incomeExpense;
    const now = new Date();
    const todayStr = now.toISOString().slice(0, 10);
    const monthStr = now.toISOString().slice(0, 7);

    return incomeExpense.filter(ie => {
      if (!ie.date) return false;
      const d = ie.date.slice(0, 10);
      if (timeRange === 'today') return d === todayStr;
      if (timeRange === 'month') return d.startsWith(monthStr);
      return true;
    });
  }, [incomeExpense, timeRange]);

  // Financial Calculations
  const totalTripRevenue = filteredTripSheets.reduce((acc, curr) => acc + (Number(curr.totalAmount) || 0), 0);
  const totalTripCollected = filteredTripSheets.reduce((acc, curr) => acc + (Number(curr.paidAmount) || 0), 0);
  const totalTripBalance = filteredTripSheets.reduce((acc, curr) => acc + (Number(curr.balanceAmount) || 0), 0);
  const totalMaintenanceCost = filteredMaintenance.reduce((acc, curr) => acc + (Number(curr.totalAmount) || 0), 0);
  
  const otherIncome = filteredIncomeExpense
    .filter(x => x.type === 'income')
    .reduce((acc, curr) => acc + (Number(curr.amount) || 0), 0);
    
  const otherExpense = filteredIncomeExpense
    .filter(x => x.type === 'expense')
    .reduce((acc, curr) => acc + (Number(curr.amount) || 0), 0);

  const totalDriverBata = filteredTripSheets.reduce((acc, curr) => acc + (Number(curr.driverBata) || 0), 0);
  const netProfit = (totalTripRevenue + otherIncome) - (totalMaintenanceCost + otherExpense + totalDriverBata);

  const activeTractors = fleet.filter(f => f.type === 'tractor' && f.status !== 'inactive');
  const activeImplements = fleet.filter(f => f.type === 'implement' && f.status !== 'inactive');

  // Working hours
  const totalWorkingHours = filteredTripSheets.reduce((acc, curr) => acc + (Number(curr.quantity) || 0), 0);

  // Collection percentages for Donut Chart
  const collectionPercent = totalTripRevenue > 0 
    ? Math.round((totalTripCollected / totalTripRevenue) * 100) 
    : (totalTripBalance === 0 ? 100 : 0);
  const pendingPercent = Math.max(0, 100 - collectionPercent);
  const profitMargin = totalTripRevenue > 0 
    ? Math.round((netProfit / totalTripRevenue) * 100) 
    : (netProfit >= 0 ? 100 : 0);

  // Group tractor metrics
  const tractorStats = activeTractors.map(trac => {
    const tracTrips = filteredTripSheets.filter(tp => 
      tp.tractorId === trac.id || 
      isNameMatch(tp.tractorName, trac.name)
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
  filteredTripSheets.forEach(tp => {
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

  // Deterministic Avatar Colors
  const getAvatarColor = (name = '') => {
    const palette = [
      { bg: 'rgba(16, 185, 129, 0.15)', text: '#059669', border: 'rgba(16, 185, 129, 0.3)' },
      { bg: 'rgba(59, 130, 246, 0.15)', text: '#2563eb', border: 'rgba(59, 130, 246, 0.3)' },
      { bg: 'rgba(139, 92, 246, 0.15)', text: '#7c3aed', border: 'rgba(139, 92, 246, 0.3)' },
      { bg: 'rgba(245, 158, 11, 0.15)', text: '#d97706', border: 'rgba(245, 158, 11, 0.3)' },
      { bg: 'rgba(236, 72, 153, 0.15)', text: '#db2777', border: 'rgba(236, 72, 153, 0.3)' },
    ];
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
      hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    return palette[Math.abs(hash) % palette.length];
  };

  return (
    <div style={{ maxWidth: '100%', overflowX: 'hidden', paddingBottom: '2.5rem' }}>
      
      {/* Top Hero Banner & Quick Actions */}
      <div className="dashboard-hero-banner">
        {/* Brand & Live Status */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', minWidth: '280px' }}>
          <div style={{
            width: '52px',
            height: '52px',
            borderRadius: '16px',
            background: 'linear-gradient(135deg, #059669 0%, #10b981 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#ffffff',
            boxShadow: '0 8px 20px -4px rgba(16, 185, 129, 0.45)',
            flexShrink: 0
          }}>
            <Tractor size={28} />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
              <h2 style={{ fontSize: '1.4rem', fontWeight: 800, margin: 0, color: 'var(--text-main)', letterSpacing: '-0.02em' }}>
                {lang === 'ta' ? 'டிராக்டோமின்ட் மேலாண்மை பலகை' : 'TractoMint Fleet Dashboard'}
              </h2>
              <span style={{
                background: 'rgba(16, 185, 129, 0.12)',
                color: '#059669',
                fontSize: '0.72rem',
                fontWeight: 700,
                padding: '0.2rem 0.55rem',
                borderRadius: '9999px',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px',
                border: '1px solid rgba(16, 185, 129, 0.25)'
              }}>
                <span className="pulse-indicator" />
                {lang === 'ta' ? 'நேரடி இயக்கம்' : 'Live Fleet'}
              </span>
            </div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-light)', marginTop: '2px' }}>
              {lang === 'ta' 
                ? 'டிராக்டர் வாடகை, உழவு டிரிப் மற்றும் ரொக்க வசூல் நேரடி விபரம்' 
                : 'Live tractor rental billings, collections & operational insights'}
            </div>
          </div>
        </div>

        {/* Center Time Range Filters */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
          <div className="time-filter-container">
            <button 
              type="button" 
              className={`time-filter-btn ${timeRange === 'all' ? 'active' : ''}`}
              onClick={() => setTimeRange('all')}
            >
              {lang === 'ta' ? 'முழு காலம்' : 'All Time'}
            </button>
            <button 
              type="button" 
              className={`time-filter-btn ${timeRange === 'month' ? 'active' : ''}`}
              onClick={() => setTimeRange('month')}
            >
              {lang === 'ta' ? 'இந்த மாதம்' : 'This Month'}
            </button>
            <button 
              type="button" 
              className={`time-filter-btn ${timeRange === 'today' ? 'active' : ''}`}
              onClick={() => setTimeRange('today')}
            >
              {lang === 'ta' ? 'இன்று' : 'Today'}
            </button>
          </div>

          {/* Quick Action Buttons */}
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            <button 
              className="btn btn-primary" 
              onClick={() => onNavigate('tripSheets')}
              style={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: '0.45rem', 
                fontWeight: 700,
                padding: '0.55rem 1.15rem',
                boxShadow: '0 4px 12px rgba(16, 185, 129, 0.35)'
              }}
            >
              <Plus size={16} />
              <span>{lang === 'ta' ? '+ புதிய உழவு டிரிப்' : '+ New Trip Sheet'}</span>
            </button>
            <button 
              className="btn btn-outline" 
              onClick={() => onNavigate('maintenance')}
              style={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: '0.45rem', 
                fontWeight: 600,
                padding: '0.55rem 1rem' 
              }}
            >
              <Fuel size={16} />
              <span>{lang === 'ta' ? 'டீசல் / பராமரிப்பு' : 'Fuel / Spares'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Operational Pulse Quick Bar */}
      <div className="dashboard-pulse-strip">
        <div className="pulse-stat-chip">
          <div style={{ color: '#059669', display: 'flex', alignItems: 'center' }}><Tractor size={18} /></div>
          <div>
            <div style={{ fontSize: '0.7rem', color: 'var(--text-light)', fontWeight: 600, textTransform: 'uppercase' }}>
              {lang === 'ta' ? 'இயங்கும் டிராக்டர்கள்' : 'Active Fleet'}
            </div>
            <div style={{ fontWeight: 800, color: 'var(--text-main)', fontSize: '0.9rem' }}>
              {activeTractors.length} {lang === 'ta' ? 'டிராக்டர்கள் தயார்' : 'Tractors Ready'}
            </div>
          </div>
        </div>

        <div className="pulse-stat-chip">
          <div style={{ color: '#7c3aed', display: 'flex', alignItems: 'center' }}><Layers size={18} /></div>
          <div>
            <div style={{ fontSize: '0.7rem', color: 'var(--text-light)', fontWeight: 600, textTransform: 'uppercase' }}>
              {lang === 'ta' ? 'இணைக்கப்பட்ட கருவிகள்' : 'Attachments'}
            </div>
            <div style={{ fontWeight: 800, color: 'var(--text-main)', fontSize: '0.9rem' }}>
              {activeImplements.length} {lang === 'ta' ? 'கருவிகள் (ரோட்டாவேட்டர்..)' : 'Implements Attached'}
            </div>
          </div>
        </div>

        <div className="pulse-stat-chip">
          <div style={{ color: '#0284c7', display: 'flex', alignItems: 'center' }}><Activity size={18} /></div>
          <div>
            <div style={{ fontSize: '0.7rem', color: 'var(--text-light)', fontWeight: 600, textTransform: 'uppercase' }}>
              {lang === 'ta' ? 'உழவு நேரம்' : 'Billed Hours'}
            </div>
            <div style={{ fontWeight: 800, color: 'var(--text-main)', fontSize: '0.9rem' }}>
              {Math.round(totalWorkingHours * 10) / 10} {lang === 'ta' ? 'மணி நேரம்' : 'hrs logged'}
            </div>
          </div>
        </div>

        <div className="pulse-stat-chip">
          <div style={{ color: totalTripBalance === 0 ? '#059669' : '#dc2626', display: 'flex', alignItems: 'center' }}>
            <ShieldCheck size={18} />
          </div>
          <div>
            <div style={{ fontSize: '0.7rem', color: 'var(--text-light)', fontWeight: 600, textTransform: 'uppercase' }}>
              {lang === 'ta' ? 'வசூல் திறன்' : 'Collection Health'}
            </div>
            <div style={{ fontWeight: 800, color: totalTripBalance === 0 ? '#059669' : '#dc2626', fontSize: '0.9rem' }}>
              {collectionPercent}% {lang === 'ta' ? 'வசூலானது' : 'Collected'}
            </div>
          </div>
        </div>
      </div>

      {/* Modern Symmetrical KPI Cards Grid (3 Columns Desktop, 2 Tablet, 1 Mobile) */}
      <div className="kpi-grid">
        
        {/* 1. Total Billings */}
        <div className="kpi-card-v2" style={{ '--card-accent': '#10b981' }}>
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <div className="kpi-icon-bubble green">
                  <TrendingUp size={22} />
                </div>
                <div>
                  <div className="kpi-label">{t.totalRevenue}</div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-light)' }}>
                    {timeRange === 'all' ? (lang === 'ta' ? 'முழு உழவுக் கட்டணம்' : 'Gross billed rentals') : 
                     timeRange === 'month' ? (lang === 'ta' ? 'இம்மாத உழவு கட்டணம்' : 'This month billed') : 
                     (lang === 'ta' ? 'இன்றைய உழவு கட்டணம்' : 'Today billed')}
                  </div>
                </div>
              </div>
              <span className="kpi-micro-pill" style={{ background: 'rgba(16, 185, 129, 0.12)', color: '#047857' }}>
                <ArrowUpRight size={12} /> {filteredTripSheets.length} {lang === 'ta' ? 'டிரிப்புகள்' : 'Trips'}
              </span>
            </div>

            <div className="kpi-value" style={{ color: '#047857' }}>
              ₹{totalTripRevenue.toLocaleString()}
            </div>
          </div>

          <div>
            <div className="kpi-meter-track">
              <div className="kpi-meter-fill" style={{ width: '100%', background: 'linear-gradient(90deg, #10b981, #059669)' }} />
            </div>
            <div className="kpi-subtext" style={{ color: '#059669' }}>
              <ArrowUpRight size={13} /> {filteredTripSheets.length} {lang === 'ta' ? 'முடிக்கப்பட்ட உழவுப் பதிவுகள்' : 'Trips invoiced'}
            </div>
          </div>
        </div>

        {/* 2. Total Collected */}
        <div className="kpi-card-v2" style={{ '--card-accent': '#059669' }}>
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <div className="kpi-icon-bubble emerald">
                  <CheckCircle2 size={22} />
                </div>
                <div>
                  <div className="kpi-label">{t.totalCollected}</div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-light)' }}>
                    {lang === 'ta' ? 'ரொக்கம் & வங்கி வரவு' : 'Realized cash & UPI'}
                  </div>
                </div>
              </div>
              <span className="kpi-micro-pill" style={{ background: 'rgba(5, 150, 105, 0.12)', color: '#047857' }}>
                ✓ {collectionPercent}%
              </span>
            </div>

            <div className="kpi-value" style={{ color: '#059669' }}>
              ₹{totalTripCollected.toLocaleString()}
            </div>
          </div>

          <div>
            <div className="kpi-meter-track">
              <div className="kpi-meter-fill" style={{ width: `${Math.min(100, collectionPercent)}%`, background: '#059669' }} />
            </div>
            <div className="kpi-subtext" style={{ color: '#059669', fontWeight: 600 }}>
              ✓ {collectionPercent}% {lang === 'ta' ? 'வசூல் செய்யப்பட்டது' : 'Collection efficiency'}
            </div>
          </div>
        </div>

        {/* 3. Outstanding Dues */}
        <div className="kpi-card-v2" style={{ '--card-accent': totalTripBalance > 0 ? '#ef4444' : '#10b981' }}>
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <div className={`kpi-icon-bubble ${totalTripBalance > 0 ? 'red' : 'green'}`}>
                  {totalTripBalance > 0 ? <Clock size={22} /> : <CheckCircle size={22} />}
                </div>
                <div>
                  <div className="kpi-label">{t.pendingBalance}</div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-light)' }}>
                    {lang === 'ta' ? 'விவசாயிகள் தரவேண்டியது' : 'Unpaid farmer dues'}
                  </div>
                </div>
              </div>
              <span className="kpi-micro-pill" style={{ 
                background: totalTripBalance > 0 ? 'rgba(239, 68, 68, 0.12)' : 'rgba(16, 185, 129, 0.12)', 
                color: totalTripBalance > 0 ? '#dc2626' : '#047857' 
              }}>
                {totalTripBalance === 0 ? (lang === 'ta' ? '✓ பாக்கி இல்லை' : '✓ Zero Due') : `${pendingPercent}% Due`}
              </span>
            </div>

            <div className="kpi-value" style={{ color: totalTripBalance > 0 ? '#dc2626' : '#059669' }}>
              ₹{totalTripBalance.toLocaleString()}
            </div>
          </div>

          <div>
            <div className="kpi-meter-track">
              <div className="kpi-meter-fill" style={{ 
                width: `${Math.min(100, pendingPercent)}%`, 
                background: totalTripBalance > 0 ? '#ef4444' : '#10b981' 
              }} />
            </div>
            <div className="kpi-subtext" style={{ color: totalTripBalance > 0 ? '#dc2626' : '#059669', fontWeight: 600 }}>
              {totalTripBalance === 0 
                ? (lang === 'ta' ? '✓ அனைத்து பாக்கிகளும் பெறப்பட்டன' : '✓ All farmer dues cleared')
                : (lang === 'ta' ? `⚠ ${pendingPercent}% வசூலாகாத நிலுவைத் தொகை` : `⚠ ${pendingPercent}% farmer dues pending`)}
            </div>
          </div>
        </div>

        {/* 4. Maintenance & Fuel Cost */}
        <div className="kpi-card-v2" style={{ '--card-accent': '#f59e0b' }}>
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <div className="kpi-icon-bubble amber">
                  <Fuel size={22} />
                </div>
                <div>
                  <div className="kpi-label">{t.totalFuelSpares}</div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-light)' }}>
                    {lang === 'ta' ? 'டீசல் & உதிரிபாகங்கள்' : 'Operating overhead'}
                  </div>
                </div>
              </div>
              <span className="kpi-micro-pill" style={{ background: 'rgba(245, 158, 11, 0.15)', color: '#b45309' }}>
                {filteredMaintenance.length} {lang === 'ta' ? 'பதிவுகள்' : 'Logs'}
              </span>
            </div>

            <div className="kpi-value" style={{ color: '#d97706' }}>
              ₹{totalMaintenanceCost.toLocaleString()}
            </div>
          </div>

          <div>
            <div className="kpi-meter-track">
              <div className="kpi-meter-fill" style={{ 
                width: `${totalTripRevenue > 0 ? Math.min(100, Math.round((totalMaintenanceCost / totalTripRevenue) * 100)) : 0}%`, 
                background: '#f59e0b' 
              }} />
            </div>
            <div className="kpi-subtext" style={{ color: '#b45309' }}>
              {lang === 'ta' ? 'எரிபொருள், பிளேடுகள் & பழுதுகள்' : 'Diesel, blades, oil & servicing'}
            </div>
          </div>
        </div>

        {/* 5. Net Business Profit */}
        <div className="kpi-card-v2" style={{ '--card-accent': netProfit >= 0 ? '#0284c7' : '#dc2626' }}>
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <div className="kpi-icon-bubble blue">
                  <IndianRupee size={22} />
                </div>
                <div>
                  <div className="kpi-label">{t.netBusinessProfit}</div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-light)' }}>
                    {lang === 'ta' ? 'உண்மையான நிகர லாபம்' : 'After all deductions'}
                  </div>
                </div>
              </div>
              <span className="kpi-micro-pill" style={{ 
                background: netProfit >= 0 ? 'rgba(2, 132, 199, 0.12)' : 'rgba(239, 68, 68, 0.12)', 
                color: netProfit >= 0 ? '#0284c7' : '#dc2626' 
              }}>
                Margin: {profitMargin}%
              </span>
            </div>

            <div className="kpi-value" style={{ color: netProfit >= 0 ? '#0284c7' : '#dc2626' }}>
              ₹{netProfit.toLocaleString()}
            </div>
          </div>

          <div>
            <div className="kpi-meter-track">
              <div className="kpi-meter-fill" style={{ 
                width: `${Math.max(0, Math.min(100, profitMargin))}%`, 
                background: netProfit >= 0 ? 'linear-gradient(90deg, #38bdf8, #0284c7)' : '#dc2626' 
              }} />
            </div>
            <div className="kpi-subtext" style={{ color: netProfit >= 0 ? '#0284c7' : '#dc2626' }}>
              {lang === 'ta' ? 'டீசல், டிரைவர் பாட்டா கழித்து' : 'After diesel, driver bata & spares'}
            </div>
          </div>
        </div>

        {/* 6. Active Fleet Capacity */}
        <div className="kpi-card-v2" style={{ '--card-accent': '#8b5cf6' }}>
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <div className="kpi-icon-bubble purple">
                  <Tractor size={22} />
                </div>
                <div>
                  <div className="kpi-label">{t.activeFleetCount}</div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-light)' }}>
                    {lang === 'ta' ? 'இயந்திரங்களின் எண்ணிக்கை' : 'Fleet readiness'}
                  </div>
                </div>
              </div>
              <span className="kpi-micro-pill" style={{ background: 'rgba(139, 92, 246, 0.12)', color: '#7c3aed' }}>
                {activeTractors.length} 🚜 • {activeImplements.length} ⚙️
              </span>
            </div>

            <div className="kpi-value" style={{ color: '#6d28d9' }}>
              {activeTractors.length + activeImplements.length} <span style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-light)' }}>{lang === 'ta' ? 'இயந்திரங்கள்' : 'Units'}</span>
            </div>
          </div>

          <div>
            <div className="kpi-meter-track">
              <div className="kpi-meter-fill" style={{ width: '100%', background: 'linear-gradient(90deg, #a78bfa, #7c3aed)' }} />
            </div>
            <div className="kpi-subtext" style={{ color: '#7c3aed' }}>
              {activeTractors.length} {lang === 'ta' ? 'டிராக்டர்கள்' : 'Tractors'}, {activeImplements.length} {lang === 'ta' ? 'கருவிகள் தயார்' : 'Implements ready'}
            </div>
          </div>
        </div>

      </div>

      {/* Reassurance Banner: Zero Dues OR Top Debtors Banner */}
      {totalTripBalance === 0 ? (
        <div style={{
          background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.08) 0%, rgba(5, 150, 105, 0.04) 100%)',
          border: '1px solid rgba(16, 185, 129, 0.25)',
          borderRadius: '16px',
          padding: '1rem 1.25rem',
          marginBottom: '1.5rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '0.75rem'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div style={{
              width: '40px',
              height: '40px',
              borderRadius: '12px',
              background: 'rgba(16, 185, 129, 0.15)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#059669',
              flexShrink: 0
            }}>
              <ShieldCheck size={22} />
            </div>
            <div>
              <div style={{ fontWeight: 800, fontSize: '0.95rem', color: '#047857' }}>
                {lang === 'ta' ? '✨ அனைத்து விவசாய பாக்கிகளும் வசூலிக்கப்பட்டுவிட்டன!' : '✨ 100% Cash Flow Secured — Zero Outstanding Farmer Dues!'}
              </div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-light)' }}>
                {lang === 'ta' 
                  ? 'அனைத்து உழவுத் தொகைகளும் ரொக்கமாகவோ அல்லது வங்கிக் கணக்கிலோ முழுமையாகப் பெறப்பட்டுள்ளன.' 
                  : 'All rental bookings are fully paid with optimal collection turnover.'}
              </div>
            </div>
          </div>

          <button 
            className="btn btn-primary btn-sm"
            onClick={() => onNavigate('tripSheets')}
            style={{ fontWeight: 700 }}
          >
            <Plus size={14} />
            <span>{lang === 'ta' ? '+ புதிய உழவு பதிவு' : '+ Book Next Trip'}</span>
          </button>
        </div>
      ) : (
        /* Top Pending Farmers List */
        <div style={{
          background: 'var(--bg-card)',
          border: '1px solid #fecaca',
          borderRadius: '16px',
          padding: '1.25rem',
          marginBottom: '1.5rem',
          boxShadow: '0 4px 14px rgba(239, 68, 68, 0.06)'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.95rem', flexWrap: 'wrap', gap: '0.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#b91c1c', fontWeight: 800, fontSize: '0.95rem' }}>
              <AlertCircle size={20} />
              <span>{lang === 'ta' ? 'விவசாயிகள் நிலுவை பாக்கி முன்னுரிமைப் பட்டியல்' : 'Priority Farmer Receivables & Dues'}</span>
              <span style={{ background: '#fee2e2', color: '#b91c1c', padding: '0.15rem 0.5rem', borderRadius: '9999px', fontSize: '0.75rem', fontWeight: 700 }}>
                ₹{totalTripBalance.toLocaleString()} {lang === 'ta' ? 'மொத்த பாக்கி' : 'Total'}
              </span>
            </div>
            <button 
              className="btn btn-outline btn-sm" 
              onClick={() => onNavigate('tripSheets')}
              style={{ fontSize: '0.75rem', borderColor: '#fca5a5', color: '#b91c1c' }}
            >
              {lang === 'ta' ? 'டிரிப் சீட்டுக்குச் செல்' : 'Go to Trip Sheets'}
            </button>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '0.75rem' }}>
            {topDueCustomers.map((c, i) => {
              const avatarCol = getAvatarColor(c.name);
              return (
                <div 
                  key={c.id || i}
                  style={{
                    padding: '0.85rem',
                    borderRadius: '12px',
                    background: 'rgba(254, 226, 226, 0.35)',
                    border: '1px solid rgba(252, 165, 165, 0.45)',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    transition: 'transform 0.15s ease'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                    <div 
                      className="customer-avatar"
                      style={{ background: avatarCol.bg, color: avatarCol.text, border: `1px solid ${avatarCol.border}` }}
                    >
                      {c.name ? c.name.charAt(0) : 'C'}
                    </div>
                    <div>
                      <div style={{ fontWeight: 800, fontSize: '0.875rem', color: 'var(--text-main)' }}>
                        {c.name}
                      </div>
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-light)', marginTop: '1px' }}>
                        {c.trips} {lang === 'ta' ? 'டிரிப்புகள்' : 'Trips'}
                      </div>
                    </div>
                  </div>

                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontWeight: 900, fontSize: '1rem', color: '#dc2626' }}>
                      ₹{c.balance.toLocaleString()}
                    </div>
                    {c.phone ? (
                      <a 
                        href={`tel:${c.phone}`}
                        style={{ fontSize: '0.72rem', color: '#059669', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '3px', justifyContent: 'flex-end', marginTop: '2px', fontWeight: 600 }}
                      >
                        <Phone size={11} /> {c.phone}
                      </a>
                    ) : (
                      <span style={{ fontSize: '0.7rem', color: 'var(--text-light)' }}>
                        {lang === 'ta' ? 'நிலுவை' : 'Unpaid'}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Visual Analytics & Graphs Section */}
      <div style={{
        background: 'var(--bg-card)',
        border: '1px solid var(--border-color)',
        borderRadius: '18px',
        padding: '1.35rem',
        marginBottom: '1.75rem',
        boxShadow: '0 4px 20px rgba(0,0,0,0.04)'
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
          marginBottom: '1.35rem'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <div style={{
              width: '36px',
              height: '36px',
              borderRadius: '10px',
              background: 'rgba(16, 185, 129, 0.12)',
              color: '#059669',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <BarChart3 size={20} />
            </div>
            <div>
              <div style={{ fontWeight: 800, fontSize: '1.05rem', color: 'var(--text-main)', letterSpacing: '-0.01em' }}>
                {lang === 'ta' ? 'வரவு-செலவு & டிராக்டர் இயக்க வரைபடம்' : 'Financial & Tractor Performance Analytics'}
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-light)' }}>
                {lang === 'ta' ? 'வருவாய், செலவு மற்றும் டிராக்டர் உழைப்பு ஒப்பீடு' : 'Breakdown of cash flow, machinery hours & collection health'}
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '0.35rem', background: 'var(--bg-subtle)', padding: '4px', borderRadius: '10px', border: '1px solid var(--border-color)' }}>
            <button
              type="button"
              onClick={() => setActiveChartTab('overview')}
              className={`analytics-tab-btn ${activeChartTab === 'overview' ? 'active' : ''}`}
            >
              <span>📊</span>
              <span>{lang === 'ta' ? 'நிதி சுருக்கம்' : 'Cash Flow'}</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveChartTab('tractors')}
              className={`analytics-tab-btn ${activeChartTab === 'tractors' ? 'active' : ''}`}
            >
              <span>🚜</span>
              <span>{lang === 'ta' ? 'டிராக்டர் உழைப்பு' : 'Tractors'}</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveChartTab('collections')}
              className={`analytics-tab-btn ${activeChartTab === 'collections' ? 'active' : ''}`}
            >
              <span>🎯</span>
              <span>{lang === 'ta' ? 'வசூல் சதவிகிதம்' : 'Collections'}</span>
            </button>
          </div>
        </div>

        {/* Tab 1: Financial Overview Bars & Donut Gauge */}
        {activeChartTab === 'overview' && (
          <div>
            <div style={{ 
              display: 'grid', 
              gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 340px), 1fr))', 
              gap: '1.75rem',
              alignItems: 'center'
            }}>
              
              {/* Left Bar Graph Breakdown */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div style={{ fontSize: '0.85rem', fontWeight: 800, color: 'var(--text-main)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  {lang === 'ta' ? 'வருவாய் மற்றும் செலவின ஒப்பீடு' : 'Revenue vs Operating Breakdown'}
                </div>

                {/* Bar 1: Total Revenue */}
                <div style={{
                  padding: '0.85rem 1rem',
                  borderRadius: '12px',
                  background: 'var(--bg-subtle)',
                  border: '1px solid var(--border-color)'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.825rem', fontWeight: 700, marginBottom: '6px' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#10b981' }} />
                      {lang === 'ta' ? '1. மொத்த உழவு கட்டணம்' : '1. Total Invoiced Billings'}
                    </span>
                    <span style={{ fontWeight: 800, color: '#047857' }}>₹{totalTripRevenue.toLocaleString()}</span>
                  </div>
                  <div style={{ height: '8px', background: 'rgba(0,0,0,0.06)', borderRadius: '9999px', overflow: 'hidden' }}>
                    <div style={{ width: '100%', height: '100%', background: 'linear-gradient(90deg, #10b981 0%, #059669 100%)', borderRadius: '9999px' }} />
                  </div>
                </div>

                {/* Bar 2: Total Collected */}
                <div style={{
                  padding: '0.85rem 1rem',
                  borderRadius: '12px',
                  background: 'var(--bg-subtle)',
                  border: '1px solid var(--border-color)'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.825rem', fontWeight: 700, marginBottom: '6px' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#059669' }} />
                      {lang === 'ta' ? '2. கைக்கு வந்த பணம் (ரொக்கம்/UPI)' : '2. Realized Cash & Online Collections'}
                    </span>
                    <span style={{ fontWeight: 800, color: '#059669' }}>
                      ₹{totalTripCollected.toLocaleString()} <span style={{ fontSize: '0.75rem', fontWeight: 600 }}>({collectionPercent}%)</span>
                    </span>
                  </div>
                  <div style={{ height: '8px', background: 'rgba(0,0,0,0.06)', borderRadius: '9999px', overflow: 'hidden' }}>
                    <div style={{ width: `${Math.min(100, collectionPercent)}%`, height: '100%', background: 'linear-gradient(90deg, #34d399, #059669)', borderRadius: '9999px', transition: 'width 0.5s ease' }} />
                  </div>
                </div>

                {/* Bar 3: Outstanding Balance */}
                <div style={{
                  padding: '0.85rem 1rem',
                  borderRadius: '12px',
                  background: 'var(--bg-subtle)',
                  border: '1px solid var(--border-color)'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.825rem', fontWeight: 700, marginBottom: '6px' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#ef4444' }} />
                      {lang === 'ta' ? '3. வசூலாகாத நிலுவைத் தொகை' : '3. Uncollected Farmer Receivables'}
                    </span>
                    <span style={{ fontWeight: 800, color: '#dc2626' }}>
                      ₹{totalTripBalance.toLocaleString()} <span style={{ fontSize: '0.75rem', fontWeight: 600 }}>({pendingPercent}%)</span>
                    </span>
                  </div>
                  <div style={{ height: '8px', background: 'rgba(0,0,0,0.06)', borderRadius: '9999px', overflow: 'hidden' }}>
                    <div style={{ width: `${Math.min(100, pendingPercent)}%`, height: '100%', background: '#ef4444', borderRadius: '9999px', transition: 'width 0.5s ease' }} />
                  </div>
                </div>

                {/* Bar 4: Maintenance & Fuel */}
                <div style={{
                  padding: '0.85rem 1rem',
                  borderRadius: '12px',
                  background: 'var(--bg-subtle)',
                  border: '1px solid var(--border-color)'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.825rem', fontWeight: 700, marginBottom: '6px' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#f59e0b' }} />
                      {lang === 'ta' ? '4. டீசல் & உதிரிபாகங்கள் செலவு' : '4. Diesel, Blades & Spares Maintenance'}
                    </span>
                    <span style={{ fontWeight: 800, color: '#d97706' }}>₹{totalMaintenanceCost.toLocaleString()}</span>
                  </div>
                  <div style={{ height: '8px', background: 'rgba(0,0,0,0.06)', borderRadius: '9999px', overflow: 'hidden' }}>
                    <div style={{ 
                      width: `${totalTripRevenue > 0 ? Math.min(100, Math.round((totalMaintenanceCost / totalTripRevenue) * 100)) : 0}%`, 
                      height: '100%', 
                      background: 'linear-gradient(90deg, #fbbf24, #d97706)', 
                      borderRadius: '9999px',
                      transition: 'width 0.5s ease' 
                    }} />
                  </div>
                </div>

              </div>

              {/* Right Side: Circular Gauge Visualizer */}
              <div style={{ 
                display: 'flex', 
                flexDirection: 'column', 
                alignItems: 'center', 
                justifyContent: 'center', 
                padding: '1.5rem',
                background: 'var(--bg-subtle)',
                borderRadius: '16px',
                border: '1px solid var(--border-color)'
              }}>
                <div style={{ position: 'relative', width: '150px', height: '150px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <svg viewBox="0 0 36 36" style={{ width: '100%', height: '100%', transform: 'rotate(-90deg)' }}>
                    <circle
                      cx="18"
                      cy="18"
                      r="15.9155"
                      fill="transparent"
                      stroke="rgba(0,0,0,0.06)"
                      strokeWidth="3.4"
                    />
                    <circle
                      cx="18"
                      cy="18"
                      r="15.9155"
                      fill="transparent"
                      stroke="#10b981"
                      strokeWidth="3.6"
                      strokeDasharray={`${collectionPercent} ${100 - collectionPercent}`}
                      strokeDashoffset="0"
                      strokeLinecap="round"
                    />
                  </svg>
                  <div style={{ position: 'absolute', textAlign: 'center' }}>
                    <div style={{ fontSize: '1.75rem', fontWeight: 900, color: '#047857', letterSpacing: '-0.03em', lineHeight: 1 }}>
                      {collectionPercent}%
                    </div>
                    <div style={{ fontSize: '0.68rem', fontWeight: 800, color: 'var(--text-light)', textTransform: 'uppercase', letterSpacing: '0.06em', marginTop: '4px' }}>
                      {lang === 'ta' ? 'வசூல் திறன்' : 'COLLECTED'}
                    </div>
                    <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#059669', marginTop: '2px' }}>
                      ₹{totalTripCollected.toLocaleString()}
                    </div>
                  </div>
                </div>

                {/* 4 Summary Pill Cards */}
                <div style={{ 
                  display: 'grid', 
                  gridTemplateColumns: 'repeat(2, 1fr)', 
                  gap: '0.65rem', 
                  width: '100%', 
                  marginTop: '1.25rem' 
                }}>
                  <div style={{ padding: '0.6rem 0.75rem', borderRadius: '10px', background: 'var(--bg-card)', border: '1px solid var(--border-color)' }}>
                    <div style={{ fontSize: '0.68rem', color: 'var(--text-light)', fontWeight: 700 }}>
                      🟢 {lang === 'ta' ? 'வசூலானது' : 'Collected'}
                    </div>
                    <div style={{ fontWeight: 800, color: '#059669', fontSize: '0.9rem', marginTop: '2px' }}>
                      ₹{totalTripCollected.toLocaleString()}
                    </div>
                  </div>

                  <div style={{ padding: '0.6rem 0.75rem', borderRadius: '10px', background: 'var(--bg-card)', border: '1px solid var(--border-color)' }}>
                    <div style={{ fontSize: '0.68rem', color: 'var(--text-light)', fontWeight: 700 }}>
                      🔴 {lang === 'ta' ? 'நிலுவை' : 'Pending Due'}
                    </div>
                    <div style={{ fontWeight: 800, color: totalTripBalance > 0 ? '#dc2626' : '#059669', fontSize: '0.9rem', marginTop: '2px' }}>
                      ₹{totalTripBalance.toLocaleString()}
                    </div>
                  </div>

                  <div style={{ padding: '0.6rem 0.75rem', borderRadius: '10px', background: 'var(--bg-card)', border: '1px solid var(--border-color)' }}>
                    <div style={{ fontSize: '0.68rem', color: 'var(--text-light)', fontWeight: 700 }}>
                      🟡 {lang === 'ta' ? 'பராமரிப்பு' : 'Fuel & Spares'}
                    </div>
                    <div style={{ fontWeight: 800, color: '#d97706', fontSize: '0.9rem', marginTop: '2px' }}>
                      ₹{totalMaintenanceCost.toLocaleString()}
                    </div>
                  </div>

                  <div style={{ padding: '0.6rem 0.75rem', borderRadius: '10px', background: 'var(--bg-card)', border: '1px solid var(--border-color)' }}>
                    <div style={{ fontSize: '0.68rem', color: 'var(--text-light)', fontWeight: 700 }}>
                      🔵 {lang === 'ta' ? 'நிகர லாபம்' : 'Net Profit'}
                    </div>
                    <div style={{ fontWeight: 800, color: netProfit >= 0 ? '#0284c7' : '#dc2626', fontSize: '0.9rem', marginTop: '2px' }}>
                      ₹{netProfit.toLocaleString()}
                    </div>
                  </div>
                </div>
              </div>

            </div>
          </div>
        )}

        {/* Tab 2: Tractor Utilization Graph */}
        {activeChartTab === 'tractors' && (
          <div>
            <div style={{ fontSize: '0.85rem', fontWeight: 800, color: 'var(--text-main)', marginBottom: '1rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              {lang === 'ta' ? 'டிராக்டர்களின் உழவு நேரம் & ஈட்டிய வருமானம்' : 'Tractor Performance & Working Hours Leaderboard'}
            </div>

            {tractorStats.length === 0 ? (
              <div className="empty-state-container">
                <div className="empty-state-icon-box" style={{ background: 'rgba(16, 185, 129, 0.1)', color: '#059669' }}>
                  <Tractor size={28} />
                </div>
                <div style={{ fontWeight: 700, fontSize: '0.95rem' }}>
                  {lang === 'ta' ? 'டிராக்டர்கள் பதிவு செய்யப்படவில்லை' : 'No tractors recorded in fleet'}
                </div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-light)', marginTop: '4px' }}>
                  {lang === 'ta' ? 'இயந்திரங்கள் மெனுவில் சென்று டிராக்டர்களைச் சேர்க்கவும்' : 'Add your tractors in Fleet & Machines to monitor usage'}
                </div>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                {tractorStats.map((trac, idx) => {
                  const barWidth = Math.min(100, Math.max(6, Math.round((trac.revenue / maxTractorRevenue) * 100)));
                  const revenueShare = totalTripRevenue > 0 ? Math.round((trac.revenue / totalTripRevenue) * 100) : 0;
                  
                  return (
                    <div 
                      key={trac.id || idx}
                      style={{
                        padding: '1rem',
                        borderRadius: '12px',
                        background: 'var(--bg-subtle)',
                        border: '1px solid var(--border-color)',
                        transition: 'transform 0.15s ease'
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px', flexWrap: 'wrap', gap: '0.5rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                          <div style={{
                            width: '36px',
                            height: '36px',
                            borderRadius: '10px',
                            background: 'rgba(5, 150, 105, 0.15)',
                            color: '#059669',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontWeight: 800
                          }}>
                            🚜
                          </div>
                          <div>
                            <div style={{ fontWeight: 800, fontSize: '0.9rem', color: 'var(--text-main)' }}>
                              {trac.name}
                            </div>
                            {trac.regNumber && (
                              <div style={{ fontSize: '0.72rem', color: 'var(--text-light)', fontWeight: 600 }}>
                                {trac.regNumber}
                              </div>
                            )}
                          </div>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', flexWrap: 'wrap' }}>
                          <span style={{
                            background: 'var(--bg-card)',
                            border: '1px solid var(--border-color)',
                            padding: '0.2rem 0.55rem',
                            borderRadius: '6px',
                            fontSize: '0.75rem',
                            fontWeight: 600,
                            color: 'var(--text-muted)'
                          }}>
                            ⚡ {trac.hours} {lang === 'ta' ? 'மணி' : 'hrs'}
                          </span>

                          <span style={{
                            background: 'var(--bg-card)',
                            border: '1px solid var(--border-color)',
                            padding: '0.2rem 0.55rem',
                            borderRadius: '6px',
                            fontSize: '0.75rem',
                            fontWeight: 600,
                            color: 'var(--text-muted)'
                          }}>
                            🌾 {trac.tripsCount} {lang === 'ta' ? 'டிரிப்' : 'trips'}
                          </span>

                          <div style={{ textAlign: 'right', minWidth: '90px' }}>
                            <div style={{ fontWeight: 900, color: '#047857', fontSize: '1rem' }}>
                              ₹{trac.revenue.toLocaleString()}
                            </div>
                            <div style={{ fontSize: '0.7rem', color: 'var(--text-light)' }}>
                              {revenueShare}% {lang === 'ta' ? 'மொத்த வருவாயில்' : 'of total'}
                            </div>
                          </div>
                        </div>
                      </div>

                      <div style={{ height: '8px', background: 'rgba(0,0,0,0.06)', borderRadius: '9999px', overflow: 'hidden' }}>
                        <div style={{ 
                          width: `${barWidth}%`, 
                          height: '100%', 
                          background: 'linear-gradient(90deg, #3b82f6 0%, #10b981 100%)', 
                          borderRadius: '9999px',
                          transition: 'width 0.5s ease'
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
              gap: '1.25rem',
              textAlign: 'center',
              marginBottom: '1.25rem'
            }}>
              <div style={{ 
                padding: '1.25rem', 
                background: 'rgba(16, 185, 129, 0.08)', 
                borderRadius: '14px', 
                border: '1px solid rgba(16, 185, 129, 0.25)' 
              }}>
                <div style={{ fontSize: '0.75rem', fontWeight: 800, color: '#047857', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  {lang === 'ta' ? 'முழுவதும் வசூலானவை' : 'Fully Settled Trips'}
                </div>
                <div style={{ fontSize: '1.75rem', fontWeight: 900, color: '#047857', marginTop: '6px' }}>
                  {filteredTripSheets.filter(t => t.paymentStatus === 'paid').length}
                </div>
                <div style={{ fontSize: '0.8rem', color: '#059669', fontWeight: 700, marginTop: '2px' }}>
                  ₹{filteredTripSheets.filter(t => t.paymentStatus === 'paid').reduce((acc, t) => acc + (Number(t.totalAmount) || 0), 0).toLocaleString()}
                </div>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-light)', marginTop: '4px' }}>
                  {lang === 'ta' ? 'முழுத் தொகையும் பெறப்பட்டது' : '100% Payment Secured'}
                </div>
              </div>

              <div style={{ 
                padding: '1.25rem', 
                background: 'rgba(239, 68, 68, 0.08)', 
                borderRadius: '14px', 
                border: '1px solid rgba(239, 68, 68, 0.25)' 
              }}>
                <div style={{ fontSize: '0.75rem', fontWeight: 800, color: '#dc2626', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  {lang === 'ta' ? 'நிலுவை உள்ள டிரிப்புகள்' : 'Pending Due Trips'}
                </div>
                <div style={{ fontSize: '1.75rem', fontWeight: 900, color: '#dc2626', marginTop: '6px' }}>
                  {filteredTripSheets.filter(t => (Number(t.balanceAmount) || 0) > 0).length}
                </div>
                <div style={{ fontSize: '0.8rem', color: '#dc2626', fontWeight: 700, marginTop: '2px' }}>
                  ₹{totalTripBalance.toLocaleString()} {lang === 'ta' ? 'பாக்கி' : 'Due'}
                </div>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-light)', marginTop: '4px' }}>
                  {lang === 'ta' ? 'விவசாயிகளிடமிருந்து வரவேண்டியது' : 'Unsettled Farmer Credit'}
                </div>
              </div>

              <div style={{ 
                padding: '1.25rem', 
                background: 'rgba(2, 132, 199, 0.08)', 
                borderRadius: '14px', 
                border: '1px solid rgba(2, 132, 199, 0.25)' 
              }}>
                <div style={{ fontSize: '0.75rem', fontWeight: 800, color: '#0284c7', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  {lang === 'ta' ? 'வசூல் திறன் சதவிகிதம்' : 'Collection Efficiency'}
                </div>
                <div style={{ fontSize: '1.75rem', fontWeight: 900, color: '#0284c7', marginTop: '6px' }}>
                  {collectionPercent}%
                </div>
                <div style={{ fontSize: '0.8rem', color: '#0284c7', fontWeight: 700, marginTop: '2px' }}>
                  {collectionPercent >= 90 ? (lang === 'ta' ? 'சிறந்த நிலை' : 'Excellent Health') : (lang === 'ta' ? 'கவனம் தேவை' : 'Needs Follow-up')}
                </div>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-light)', marginTop: '4px' }}>
                  {lang === 'ta' ? 'மொத்த வருவாயில் வசூலானது' : 'of Total Billed Rentals'}
                </div>
              </div>
            </div>

            {/* Visual Progress Bar */}
            <div style={{
              padding: '1rem',
              borderRadius: '12px',
              background: 'var(--bg-subtle)',
              border: '1px solid var(--border-color)'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', fontWeight: 700, marginBottom: '6px' }}>
                <span>{lang === 'ta' ? 'வசூல் & கடன் விகிதம்' : 'Settlement Distribution Ratio'}</span>
                <span style={{ color: '#059669' }}>{collectionPercent}% {lang === 'ta' ? 'வசூல்' : 'Settled'}</span>
              </div>
              <div style={{ height: '10px', background: 'rgba(0,0,0,0.06)', borderRadius: '9999px', overflow: 'hidden', display: 'flex' }}>
                <div style={{ width: `${collectionPercent}%`, background: '#10b981', transition: 'width 0.5s ease' }} title="Collected" />
                <div style={{ width: `${pendingPercent}%`, background: '#ef4444', transition: 'width 0.5s ease' }} title="Pending" />
              </div>
            </div>
          </div>
        )}

      </div>

      {/* Dual Stream Split View: Recent Trip Sheets & Fuel Maintenance */}
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 340px), 1fr))', 
        gap: '1.35rem',
        maxWidth: '100%',
        overflowX: 'hidden'
      }}>
        
        {/* Recent Trip Sheets */}
        <div className="content-card" style={{ maxWidth: '100%', overflowX: 'hidden' }}>
          <div className="card-header-bar">
            <div className="card-title-group">
              <h2 style={{ fontSize: '1.15rem' }}>
                <FileText size={20} style={{ color: 'var(--primary-600)' }} /> 
                {lang === 'ta' ? 'சமீபத்திய உழவு பதிவுகள்' : 'Recent Trip Sheets'}
              </h2>
              <p>{lang === 'ta' ? 'கடைசியாக பதிவு செய்யப்பட்ட உழவு டிரிப்புகள்' : 'Latest rental work orders and bills'}</p>
            </div>
            <button className="btn btn-outline btn-sm" onClick={() => onNavigate('tripSheets')}>
              {lang === 'ta' ? 'அனைத்தும் காண்க' : 'View All'}
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
                  <th style={{ textAlign: 'center' }}>{lang === 'ta' ? 'ரசீது' : 'Slip'}</th>
                </tr>
              </thead>
              <tbody>
                {filteredTripSheets.slice(0, 5).map(trip => {
                  const custName = resolveCustomerName(trip);
                  const tracName = resolveTractorName(trip);
                  const isPaid = trip.paymentStatus === 'paid';
                  const isPartial = trip.paymentStatus === 'partial';
                  const avatarColor = getAvatarColor(custName);

                  return (
                    <tr key={trip.id}>
                      <td style={{ fontWeight: 800, color: 'var(--primary-700)', fontSize: '0.85rem' }}>
                        #{trip.id}
                      </td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <div 
                            className="customer-avatar" 
                            style={{ 
                              background: avatarColor.bg, 
                              color: avatarColor.text, 
                              border: `1px solid ${avatarColor.border}` 
                            }}
                          >
                            {custName ? custName.charAt(0) : 'C'}
                          </div>
                          <div>
                            <div style={{ fontWeight: 700, fontSize: '0.875rem' }}>{custName}</div>
                            <div style={{ fontSize: '0.72rem', color: 'var(--text-light)', display: 'flex', alignItems: 'center', gap: '3px' }}>
                              <Calendar size={10} /> {formatDateDDMMYYYY(trip.date)}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td>
                        <div style={{ fontSize: '0.825rem', fontWeight: 700 }}>{tracName}</div>
                        {trip.implementName && (
                          <div style={{ 
                            fontSize: '0.7rem', 
                            color: 'var(--text-light)', 
                            background: 'var(--bg-subtle)',
                            padding: '1px 5px',
                            borderRadius: '4px',
                            display: 'inline-block',
                            marginTop: '2px'
                          }}>
                            {trip.implementName}
                          </div>
                        )}
                      </td>
                      <td style={{ fontWeight: 900, color: 'var(--text-main)', fontSize: '0.9rem' }}>
                        ₹{Number(trip.totalAmount || 0).toLocaleString()}
                      </td>
                      <td>
                        <span className={`badge ${
                          isPaid ? 'badge-paid' : isPartial ? 'badge-partial' : 'badge-unpaid'
                        }`}>
                          <span style={{ 
                            width: '5px', 
                            height: '5px', 
                            borderRadius: '50%', 
                            background: isPaid ? '#166534' : isPartial ? '#92400e' : '#991b1b' 
                          }} />
                          {isPaid ? (lang === 'ta' ? 'வசூலானது' : 'Paid') :
                           isPartial ? (lang === 'ta' ? 'பகுதி வசூல்' : 'Partial') : 
                           (lang === 'ta' ? 'நிலுவை' : 'Unpaid')}
                        </span>
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <button 
                          className="btn btn-outline btn-sm" 
                          onClick={() => onViewSlip(trip)}
                          title="View & Print Slip"
                          style={{ padding: '0.25rem 0.6rem', fontSize: '0.75rem', display: 'inline-flex', alignItems: 'center', gap: '3px' }}
                        >
                          <Receipt size={12} />
                          <span>{lang === 'ta' ? 'ரசீது' : 'Slip'}</span>
                        </button>
                      </td>
                    </tr>
                  );
                })}
                {filteredTripSheets.length === 0 && (
                  <tr>
                    <td colSpan="6" style={{ textAlign: 'center', padding: '2rem 1rem', color: 'var(--text-light)' }}>
                      <div className="empty-state-container" style={{ border: 'none', background: 'transparent', padding: '1rem' }}>
                        <div className="empty-state-icon-box" style={{ background: 'rgba(16, 185, 129, 0.1)', color: '#059669' }}>
                          <FileText size={24} />
                        </div>
                        <div style={{ fontWeight: 700, fontSize: '0.9rem' }}>
                          {lang === 'ta' ? 'உழவுப் பதிவுகள் எதுவும் இல்லை' : 'No trip sheets recorded yet'}
                        </div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-light)', marginTop: '2px' }}>
                          {lang === 'ta' ? '+ புதிய உழவு டிரிப் பொத்தானை அழுத்தி பதிவிடவும்' : 'Click + New Trip Sheet above to create your first slip'}
                        </div>
                      </div>
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
              <h2 style={{ fontSize: '1.15rem' }}>
                <Fuel size={20} style={{ color: '#d97706' }} /> 
                {lang === 'ta' ? 'டீசல் & பராமரிப்பு செலவுகள்' : 'Fuel & Spares Maintenance'}
              </h2>
              <p>{lang === 'ta' ? 'டீசல் பயன்பாடு மற்றும் உதிரிபாகங்கள்' : 'Track diesel, rotor blades & repairs'}</p>
            </div>
            <div style={{ display: 'flex', gap: '0.4rem' }}>
              <button className="btn btn-outline btn-sm" onClick={() => onNavigate('maintenance')}>
                {lang === 'ta' ? 'அனைத்தும்' : 'View All'}
              </button>
            </div>
          </div>

          {filteredMaintenance.length === 0 ? (
            /* Modern Friendly Empty State */
            <div className="empty-state-container">
              <div className="empty-state-icon-box" style={{ background: 'rgba(245, 158, 11, 0.15)', color: '#d97706' }}>
                <Wrench size={26} />
              </div>
              <div style={{ fontWeight: 800, fontSize: '0.95rem', color: 'var(--text-main)' }}>
                {lang === 'ta' ? 'பராமரிப்பு செலவுகள் ஏதுமில்லை' : 'No Maintenance or Fuel Logged'}
              </div>
              <div style={{ fontSize: '0.78rem', color: 'var(--text-light)', marginTop: '4px', maxWidth: '320px', lineHeight: 1.4 }}>
                {lang === 'ta' 
                  ? 'டீசல், ரோட்டாவேட்டர் பிளேடுகள், என்ஜின் ஆயில் மற்றும் பழுதுகளை பதிவு செய்து உண்மையான நிகர லாபத்தைக் கணக்கிடுங்கள்.' 
                  : 'Log diesel litres, blades, engine oil changes and tractor services to accurately compute operating margins.'}
              </div>
              <button 
                className="btn btn-outline btn-sm"
                onClick={() => onNavigate('maintenance')}
                style={{ marginTop: '1rem', fontWeight: 700, borderColor: '#f59e0b', color: '#b45309', display: 'flex', alignItems: 'center', gap: '4px' }}
              >
                <Plus size={14} />
                <span>{lang === 'ta' ? '+ டீசல் / பழுது பதிவு செய்' : '+ Record Fuel or Spares'}</span>
              </button>
            </div>
          ) : (
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
                  {filteredMaintenance.slice(0, 5).map(m => (
                    <tr key={m.id}>
                      <td style={{ fontSize: '0.8rem', whiteSpace: 'nowrap' }}>
                        {formatDateDDMMYYYY(m.date)}
                      </td>
                      <td>
                        <div style={{ fontWeight: 700, fontSize: '0.85rem' }}>
                          {lang === 'ta' ? (m.category_ta || m.category) : m.category}
                        </div>
                        {m.vendorName && (
                          <div style={{ fontSize: '0.72rem', color: 'var(--text-light)' }}>
                            {m.vendorName}
                          </div>
                        )}
                      </td>
                      <td style={{ fontSize: '0.8rem', fontWeight: 600 }}>{m.assetName}</td>
                      <td style={{ fontSize: '0.8rem' }}>
                        {m.quantity} {m.unit}
                      </td>
                      <td style={{ fontWeight: 800, color: '#d97706', fontSize: '0.9rem' }}>
                        ₹{Number(m.totalAmount || 0).toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

      </div>

    </div>
  );
}
