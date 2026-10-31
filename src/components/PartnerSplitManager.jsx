import React, { useState } from 'react';
import { Scale, Plus, Search, Edit3, Trash2, IndianRupee, PieChart, ArrowDownRight, User, X, AlertCircle } from 'lucide-react';
import { translations } from '../translations/dictionary';
import AdminDeleteModal from './AdminDeleteModal';
import DatePicker from './common/DatePicker';
import SearchableSelect from './common/SearchableSelect';
import BilingualVoiceGroup from './common/BilingualVoiceGroup';
import { normalizePhone, validatePhone10, validatePositiveNumber } from '../services/storage';
import { formatDateDDMMYYYY } from '../utils/dateUtils';
import { getBilingualText } from '../utils/langUtils';

export default function PartnerSplitManager({ 
  partners, 
  partnerDrawings, 
  tripSheets, 
  maintenance, 
  incomeExpense, 
  onSavePartner, 
  onDeletePartner, 
  onSaveDrawing, 
  onDeleteDrawing, 
  lang, 
  role 
}) {
  const t = translations[lang];
  const [activeSubTab, setActiveSubTab] = useState('drawings'); // 'drawings' | 'partners'
  const [searchTerm, setSearchTerm] = useState('');

  // Modals
  const [isDrawingModalOpen, setIsDrawingModalOpen] = useState(false);
  const [isPartnerModalOpen, setIsPartnerModalOpen] = useState(false);
  const [editingDrawing, setEditingDrawing] = useState(null);
  const [editingPartner, setEditingPartner] = useState(null);
  const [deleteModalState, setDeleteModalState] = useState({ isOpen: false, item: null, type: 'drawing' });
  const [drawingFormError, setDrawingFormError] = useState('');
  const [partnerFormError, setPartnerFormError] = useState('');

  // Partner Form State
  const [partnerForm, setPartnerForm] = useState({
    id: '',
    name: '',
    name_ta: '',
    sharePercent: '50',
    phone: '',
    investedCapital: ''
  });

  // Drawing Form State
  const [drawingForm, setDrawingForm] = useState({
    id: '',
    date: new Date().toISOString().slice(0, 10),
    partnerId: '',
    partnerName: '',
    amount: '',
    purpose: '',
    paymentMode: 'bank_transfer'
  });

  // Financial Calculations for Dynamic Profit Split
  const totalTripRevenue = tripSheets.reduce((sum, curr) => sum + (Number(curr.paidAmount) || 0), 0);
  const totalOtherIncome = incomeExpense.filter(x => x.type === 'income').reduce((sum, curr) => sum + (Number(curr.amount) || 0), 0);
  
  const totalMaintenance = maintenance.reduce((sum, curr) => sum + (Number(curr.totalAmount) || 0), 0);
  const totalDriverBata = tripSheets.reduce((sum, curr) => sum + (Number(curr.driverBata) || 0), 0);
  const totalOtherExpense = incomeExpense.filter(x => x.type === 'expense').reduce((sum, curr) => sum + (Number(curr.amount) || 0), 0);

  const totalBusinessIncome = totalTripRevenue + totalOtherIncome;
  const totalBusinessExpenses = totalMaintenance + totalDriverBata + totalOtherExpense;
  const netBusinessProfit = Math.max(0, totalBusinessIncome - totalBusinessExpenses);

  // Partner Summaries
  const partnerSummaries = partners.map(p => {
    const pDrawings = partnerDrawings.filter(d => d.partnerId === p.id);
    const totalWithdrawn = pDrawings.reduce((sum, curr) => sum + (Number(curr.amount) || 0), 0);
    const eligibleProfitShare = Math.round(netBusinessProfit * ((Number(p.sharePercent) || 0) / 100));
    const balanceRemaining = eligibleProfitShare - totalWithdrawn;

    return {
      ...p,
      totalWithdrawn,
      eligibleProfitShare,
      balanceRemaining
    };
  });

  const generateUniqueDrawingId = () => {
    let maxNum = 0;
    partnerDrawings.forEach(d => {
      if (d.id && typeof d.id === 'string') {
        const match = d.id.match(/^DRW-(\d+)/i);
        if (match) {
          const num = parseInt(match[1], 10);
          if (num > maxNum) maxNum = num;
        }
      }
    });
    let nextNum = maxNum + 1;
    while (partnerDrawings.some(d => d.id === `DRW-${String(nextNum).padStart(2, '0')}`)) {
      nextNum++;
    }
    return `DRW-${String(nextNum).padStart(2, '0')}`;
  };

  const generateUniquePartnerId = () => {
    let maxNum = 0;
    partners.forEach(p => {
      if (p.id && typeof p.id === 'string') {
        const match = p.id.match(/^PART-(\d+)/i);
        if (match) {
          const num = parseInt(match[1], 10);
          if (num > maxNum) maxNum = num;
        }
      }
    });
    let nextNum = maxNum + 1;
    while (partners.some(p => p.id === `PART-${String(nextNum).padStart(2, '0')}`)) {
      nextNum++;
    }
    return `PART-${String(nextNum).padStart(2, '0')}`;
  };

  // Handlers
  const handleOpenAddDrawing = () => {
    const defaultPartner = partners[0] || { id: '', name: 'Partner' };
    setEditingDrawing(null);
    setDrawingFormError('');
    setDrawingForm({
      id: generateUniqueDrawingId(),
      date: new Date().toISOString().slice(0, 10),
      partnerId: defaultPartner.id,
      partnerName: defaultPartner.name,
      amount: '',
      purpose: '',
      paymentMode: 'bank_transfer'
    });
    setIsDrawingModalOpen(true);
  };

  const handleOpenEditDrawing = (item) => {
    setEditingDrawing(item);
    setDrawingFormError('');
    setDrawingForm({
      id: item.id || '',
      date: item.date || new Date().toISOString().slice(0, 10),
      partnerId: item.partnerId || '',
      partnerName: item.partnerName || '',
      amount: item.amount !== undefined && item.amount !== null ? String(item.amount) : '',
      purpose: item.purpose || '',
      paymentMode: item.paymentMode || 'bank_transfer'
    });
    setIsDrawingModalOpen(true);
  };

  const handleOpenAddPartner = () => {
    setEditingPartner(null);
    setPartnerFormError('');
    setPartnerForm({
      id: generateUniquePartnerId(),
      name: '',
      name_ta: '',
      sharePercent: '50',
      phone: '',
      investedCapital: ''
    });
    setIsPartnerModalOpen(true);
  };

  const handleOpenEditPartner = (p) => {
    setEditingPartner(p);
    setPartnerFormError('');
    setPartnerForm({
      id: p.id || '',
      name: p.name || '',
      name_ta: p.name_ta || p.name || '',
      sharePercent: p.sharePercent !== undefined && p.sharePercent !== null ? String(p.sharePercent) : '50',
      phone: p.phone ? String(p.phone) : '',
      investedCapital: p.investedCapital !== undefined && p.investedCapital !== null ? String(p.investedCapital) : ''
    });
    setIsPartnerModalOpen(true);
  };

  const handleDrawingSubmit = (e) => {
    e.preventDefault();
    setDrawingFormError('');

    if (!drawingForm.partnerId) {
      setDrawingFormError(lang === 'ta' ? 'பங்குதாரரை தேர்வு செய்யவும்!' : 'Please select a Partner!');
      return;
    }
    if (!drawingForm.date) {
      setDrawingFormError(lang === 'ta' ? 'தேதி அவசியம்!' : 'Date is required!');
      return;
    }

    const amtVal = validatePositiveNumber(drawingForm.amount, lang === 'ta' ? 'பணம் எடுத்த தொகை' : 'Withdrawal Amount', false);
    if (!amtVal.valid) {
      setDrawingFormError(amtVal.error);
      return;
    }

    let finalId = drawingForm.id;
    if (!editingDrawing && (!finalId || partnerDrawings.some(d => d.id === finalId))) {
      finalId = generateUniqueDrawingId();
    }

    const res = onSaveDrawing({ ...drawingForm, id: finalId, _isEditing: Boolean(editingDrawing) });
    if (res && res.success === false) {
      setDrawingFormError(res.error || 'Failed to save drawing.');
      return;
    }

    setIsDrawingModalOpen(false);
  };

  const handlePartnerSubmit = (e) => {
    e.preventDefault();
    setPartnerFormError('');

    if (!partnerForm.name || !partnerForm.name.trim()) {
      setPartnerFormError(lang === 'ta' ? 'பங்குதாரர் பெயர் அவசியம்!' : 'Partner name is required!');
      return;
    }

    const shareVal = validatePositiveNumber(partnerForm.sharePercent, lang === 'ta' ? 'பங்கு சதவீதம்' : 'Share Percentage', false);
    if (!shareVal.valid) {
      setPartnerFormError(shareVal.error);
      return;
    }
    if (shareVal.value > 100) {
      setPartnerFormError(lang === 'ta' ? 'பங்கு சதவீதம் 100%க்கு மேல் இருக்க முடியாது!' : 'Share percentage cannot exceed 100%!');
      return;
    }

    // Verify sum of active partners' shares <= 100%
    const otherPartners = partners.filter(p => editingPartner ? p.id !== editingPartner.id : true);
    const existingTotal = otherPartners.reduce((acc, p) => acc + (Number(p.sharePercent) || 0), 0);
    const newTotal = existingTotal + shareVal.value;
    if (newTotal > 100) {
      const maxAvailable = Math.max(0, 100 - existingTotal);
      setPartnerFormError(
        lang === 'ta'
          ? `பங்குதாரர்களின் மொத்த பங்கு 100%க்கு மேல் இருக்க முடியாது! ஏற்கனவே உள்ள பங்குதாரர்கள் ${existingTotal}% வைத்துள்ளனர். அதிகபட்சம் ${maxAvailable}% மட்டுமே ஒதுக்க முடியும்.`
          : `Total partner shares cannot exceed 100%! Active partners hold ${existingTotal}%. Maximum available share is ${maxAvailable}%.`
      );
      return;
    }

    // 10-digit mobile number and uniqueness if provided
    let cleanPhone = '';
    if (partnerForm.phone && partnerForm.phone.trim()) {
      const pVal = validatePhone10(partnerForm.phone, lang === 'ta' ? 'பங்குதாரர்' : 'Partner');
      if (!pVal.valid) {
        setPartnerFormError(pVal.error);
        return;
      }
      cleanPhone = pVal.phone;

      const duplicate = otherPartners.find(p => p.phone && normalizePhone(p.phone) === cleanPhone);
      if (duplicate) {
        setPartnerFormError(
          lang === 'ta'
            ? `அலைபேசி எண் "${cleanPhone}" ஏற்கனவே பங்குதாரர் "${duplicate.name}" பெயரில் உள்ளது!`
            : `Mobile number "${cleanPhone}" is already assigned to partner "${duplicate.name}"!`
        );
        return;
      }
    }

    let finalId = partnerForm.id;
    if (!editingPartner && (!finalId || partners.some(p => p.id === finalId))) {
      finalId = generateUniquePartnerId();
    }

    const res = onSavePartner({ 
      ...partnerForm, 
      phone: cleanPhone, 
      sharePercent: shareVal.value, 
      id: finalId, 
      _isEditing: Boolean(editingPartner) 
    });

    if (res && res.success === false) {
      setPartnerFormError(res.error || 'Failed to save partner.');
      return;
    }

    setIsPartnerModalOpen(false);
  };

  const filteredDrawings = partnerDrawings.filter(d => {
    return (d.partnerName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
           (d.purpose || '').toLowerCase().includes(searchTerm.toLowerCase());
  });

  return (
    <div>
      {/* Header bar */}
      <div className="card-header-bar">
        <div className="card-title-group">
          <h2 style={{ margin: 0 }}><Scale size={22} /> {t.partnerSplit}</h2>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button className="btn btn-primary" onClick={handleOpenAddDrawing}>
            <Plus size={16} />
            <span>{lang === 'ta' ? 'பணம் எடுத்த பதிவு (Drawing)' : 'Record Amount Taken'}</span>
          </button>
          <button className="btn btn-outline" onClick={handleOpenAddPartner}>
            <User size={16} />
            <span>{lang === 'ta' ? 'புதிய பங்குதாரர்' : 'Add Partner'}</span>
          </button>
        </div>
      </div>

      {/* Financial Split KPI Cards */}
      <div className="kpi-grid">
        <div className="kpi-card">
          <div>
            <div className="kpi-label">Total Business Inflow</div>
            <div className="kpi-value" style={{ color: '#16a34a' }}>₹{totalBusinessIncome.toLocaleString()}</div>
            <div className="kpi-subtext">Trips + Other Income</div>
          </div>
          <div className="kpi-icon-bubble green">
            <IndianRupee size={26} />
          </div>
        </div>

        <div className="kpi-card">
          <div>
            <div className="kpi-label">Total Business Outflow</div>
            <div className="kpi-value" style={{ color: '#dc2626' }}>₹{totalBusinessExpenses.toLocaleString()}</div>
            <div className="kpi-subtext">Fuel, Repairs, Bata & Expenses</div>
          </div>
          <div className="kpi-icon-bubble amber">
            <ArrowDownRight size={26} />
          </div>
        </div>

        <div className="kpi-card">
          <div>
            <div className="kpi-label">{t.netBusinessProfit}</div>
            <div className="kpi-value" style={{ color: '#059669', fontSize: '1.8rem' }}>
              ₹{netBusinessProfit.toLocaleString()}
            </div>
            <div className="kpi-subtext">Available to Split among Partners</div>
          </div>
          <div className="kpi-icon-bubble blue">
            <PieChart size={26} />
          </div>
        </div>
      </div>

      {/* Partner Shares Breakdown Cards */}
      <div style={{ marginBottom: '1.75rem' }}>
        <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <User size={18} /> Partner Equity & Profit Share Breakdown
        </h3>
        
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1rem' }}>
          {partnerSummaries.map(p => (
            <div key={p.id} className="content-card" style={{ marginBottom: 0, padding: '1.25rem', borderLeft: '4px solid var(--primary-600)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
                <div>
                  <h4 style={{ fontSize: '1.05rem', fontWeight: 700 }}>
                    {lang === 'ta' ? (p.name_ta || p.name) : p.name}
                  </h4>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-light)' }}>
                    Phone: {p.phone || '--'} • Invested: ₹{Number(p.investedCapital || 0).toLocaleString()}
                  </div>
                </div>
                <span className="badge badge-purple" style={{ fontSize: '0.85rem' }}>
                  {p.sharePercent}% Share
                </span>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.5rem', background: 'var(--bg-subtle)', padding: '0.75rem', borderRadius: 'var(--radius-sm)', textAlign: 'center' }}>
                <div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Eligible Share</div>
                  <div style={{ fontWeight: 800, color: '#16a34a' }}>₹{p.eligibleProfitShare.toLocaleString()}</div>
                </div>
                <div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Total Taken</div>
                  <div style={{ fontWeight: 800, color: '#d97706' }}>₹{p.totalWithdrawn.toLocaleString()}</div>
                </div>
                <div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Net Balance</div>
                  <div style={{ fontWeight: 800, color: p.balanceRemaining >= 0 ? '#059669' : '#dc2626' }}>
                    ₹{p.balanceRemaining.toLocaleString()}
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '0.75rem' }}>
                <button className="btn btn-outline btn-sm" onClick={() => handleOpenEditPartner(p)}>
                  <Edit3 size={13} /> {t.edit}
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Sub Tabs: Drawings List vs Partners List */}
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem' }}>
        <button 
          className={`btn btn-sm ${activeSubTab === 'drawings' ? 'btn-primary' : 'btn-outline'}`}
          onClick={() => setActiveSubTab('drawings')}
        >
          {t.partnerDrawings} ({partnerDrawings.length})
        </button>
        <button 
          className={`btn btn-sm ${activeSubTab === 'partners' ? 'btn-primary' : 'btn-outline'}`}
          onClick={() => setActiveSubTab('partners')}
        >
          {t.partners} ({partners.length})
        </button>
      </div>

      {activeSubTab === 'drawings' ? (
        /* Drawings Table */
        <div className="content-card" style={{ padding: '0' }}>
          <div className="table-responsive">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Drawing ID</th>
                  <th>Date</th>
                  <th>Partner (பணம் எடுத்தவர்)</th>
                  <th>Amount Taken (எடுத்த தொகை)</th>
                  <th>Purpose / Remarks (காரணம்)</th>
                  <th>Payment Mode</th>
                  <th style={{ textAlign: 'right' }}>{t.actions}</th>
                </tr>
              </thead>
              <tbody>
                {filteredDrawings.map(d => {
                  const matchedP = partners.find(p => p.id === d.partnerId || p.name === d.partnerName);
                  return (
                    <tr key={d.id}>
                      <td style={{ fontWeight: 700, color: 'var(--primary-700)' }}>{d.id}</td>
                      <td>{formatDateDDMMYYYY(d.date)}</td>
                      <td style={{ fontWeight: 600 }}>{matchedP ? getBilingualText(matchedP.name, matchedP.name_ta, lang) : getBilingualText(d.partnerName, '', lang)}</td>
                      <td style={{ fontWeight: 800, color: '#d97706', fontSize: '1rem' }}>
                        ₹{Number(d.amount).toLocaleString()}
                      </td>
                      <td>{d.purpose || '--'}</td>
                      <td>
                        <span className="badge badge-info">{d.paymentMode?.toUpperCase()}</span>
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <div style={{ display: 'inline-flex', gap: '0.35rem' }}>
                          <button 
                            className="btn btn-outline btn-sm"
                            onClick={() => handleOpenEditDrawing(d)}
                            title="Edit Drawing"
                          >
                            <Edit3 size={14} />
                          </button>
                          <button 
                            className="btn btn-outline btn-sm"
                            style={{ color: '#ef4444' }}
                            onClick={() => setDeleteModalState({ isOpen: true, item: d, type: 'drawing' })}
                            title={role === 'admin' ? "Delete Record" : "Admin Only"}
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {filteredDrawings.length === 0 && (
                  <tr>
                    <td colSpan="7" style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-light)' }}>
                      No partner withdrawals logged yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* Partners Directory Table */
        <div className="content-card" style={{ padding: '0' }}>
          <div className="table-responsive">
            <table className="data-table">
              <thead>
                <tr>
                  <th>{lang === 'ta' ? 'குறியீடு' : 'ID'}</th>
                  <th>{lang === 'ta' ? 'பங்குதாரர் பெயர்' : 'Partner Name'}</th>
                  <th>{lang === 'ta' ? 'பங்கு விகிதம் (%)' : 'Share Ratio (%)'}</th>
                  <th>{lang === 'ta' ? 'அலைபேசி எண்' : 'Phone Number'}</th>
                  <th>{lang === 'ta' ? 'முதலீடு (₹)' : 'Invested Capital (₹)'}</th>
                  <th style={{ textAlign: 'right' }}>{t.actions}</th>
                </tr>
              </thead>
              <tbody>
                {partners.map(p => (
                  <tr key={p.id}>
                    <td style={{ fontWeight: 700, color: 'var(--primary-700)' }}>{p.id}</td>
                    <td>
                      <div style={{ fontWeight: 600 }}>{getBilingualText(p.name, p.name_ta, lang)}</div>
                    </td>
                    <td>
                      <span className="badge badge-purple">{p.sharePercent}%</span>
                    </td>
                    <td>{p.phone || '--'}</td>
                    <td style={{ fontWeight: 700 }}>₹{Number(p.investedCapital || 0).toLocaleString()}</td>
                    <td style={{ textAlign: 'right' }}>
                      <div style={{ display: 'inline-flex', gap: '0.35rem' }}>
                        <button 
                          className="btn btn-outline btn-sm"
                          onClick={() => handleOpenEditPartner(p)}
                          title="Edit Partner"
                        >
                          <Edit3 size={14} />
                        </button>
                        <button 
                          className="btn btn-outline btn-sm"
                          style={{ color: '#ef4444' }}
                          onClick={() => setDeleteModalState({ isOpen: true, item: p, type: 'partner' })}
                          title={role === 'admin' ? "Delete Record" : "Admin Only"}
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Add / Edit Drawing Modal */}
      {isDrawingModalOpen && (
        <div className="modal-overlay" onClick={() => setIsDrawingModalOpen(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '540px' }}>
            <div className="modal-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ margin: 0 }}>{editingDrawing ? `${t.edit}: ${editingDrawing.id}` : (lang === 'ta' ? 'பணம் எடுத்த பதிவு (Drawing)' : 'Record Partner Amount Taken (Drawing)')}</h3>
              <button 
                type="button" 
                className="btn btn-outline btn-sm" 
                onClick={() => setIsDrawingModalOpen(false)}
                style={{ padding: '0.35rem 0.75rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}
              >
                <X size={16} />
                <span>{t.cancel || 'Cancel'}</span>
              </button>
            </div>
            {drawingFormError && (
              <div style={{
                margin: '1rem 1.25rem 0',
                padding: '0.75rem 1rem',
                borderRadius: 'var(--radius-sm)',
                background: '#fee2e2',
                color: '#991b1b',
                fontSize: '0.85rem',
                fontWeight: 600,
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                border: '1px solid #fca5a5'
              }}>
                <AlertCircle size={18} style={{ flexShrink: 0 }} />
                <span>{drawingFormError}</span>
              </div>
            )}
            <form onSubmit={handleDrawingSubmit}>
              <div className="modal-body form-grid">
                
                {/* Select Partner */}
                <div className="form-group col-full">
                  <SearchableSelect
                    label={t.whoTook}
                    value={drawingForm.partnerId}
                    onChange={(val) => {
                      const id = typeof val === 'object' && val?.target ? val.target.value : val;
                      const found = partners.find(p => p.id === id);
                      setDrawingForm({
                        ...drawingForm,
                        partnerId: id,
                        partnerName: found ? found.name : ''
                      });
                    }}
                    options={partners.map(p => ({
                      value: p.id,
                      label: p.name,
                      badge: `${p.sharePercent}%`
                    }))}
                    placeholder="-- Select Partner --"
                    required
                    lang={lang}
                  />
                </div>

                {/* Amount */}
                <div className="form-group">
                  <label>{t.withdrawalAmount} (₹)</label>
                  <input
                    type="number"
                    className="form-control"
                    placeholder="e.g. 10000"
                    value={drawingForm.amount}
                    onChange={(e) => setDrawingForm({ ...drawingForm, amount: e.target.value })}
                    required
                  />
                </div>

                {/* Date */}
                <div className="form-group">
                  <DatePicker
                    label={t.withdrawalDate}
                    value={drawingForm.date}
                    onChange={(val) => setDrawingForm({ ...drawingForm, date: val })}
                    required
                    lang={lang}
                  />
                </div>

                {/* Payment Mode */}
                <div className="form-group">
                  <SearchableSelect
                    label={t.paymentMode}
                    value={drawingForm.paymentMode}
                    onChange={(val) => setDrawingForm({ ...drawingForm, paymentMode: val })}
                    options={[
                      { value: 'bank_transfer', label: t.bankTransfer },
                      { value: 'cash', label: t.cash },
                      { value: 'gpay_upi', label: t.gpayUpi },
                      { value: 'cheque', label: t.cheque }
                    ]}
                    lang={lang}
                  />
                </div>

                {/* Purpose */}
                <div className="form-group col-full">
                  <label>{t.purpose} / Remarks</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="e.g. Household withdrawal, festival expense, personal drawing..."
                    value={drawingForm.purpose}
                    onChange={(e) => setDrawingForm({ ...drawingForm, purpose: e.target.value })}
                  />
                </div>

              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-outline" onClick={() => setIsDrawingModalOpen(false)}>
                  {t.cancel}
                </button>
                <button type="submit" className="btn btn-primary">
                  {t.save}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add / Edit Partner Modal */}
      {isPartnerModalOpen && (
        <div className="modal-overlay" onClick={() => setIsPartnerModalOpen(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '520px' }}>
            <div className="modal-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ margin: 0 }}>{editingPartner ? `${t.edit}: ${editingPartner.name}` : (lang === 'ta' ? 'புதிய பங்குதாரர்' : 'Add Partner / Shareholder')}</h3>
              <button 
                type="button" 
                className="btn btn-outline btn-sm" 
                onClick={() => setIsPartnerModalOpen(false)}
                style={{ padding: '0.35rem 0.75rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}
              >
                <X size={16} />
                <span>{t.cancel || 'Cancel'}</span>
              </button>
            </div>
            {partnerFormError && (
              <div style={{
                margin: '1rem 1.25rem 0',
                padding: '0.75rem 1rem',
                borderRadius: 'var(--radius-sm)',
                background: '#fee2e2',
                color: '#991b1b',
                fontSize: '0.85rem',
                fontWeight: 600,
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                border: '1px solid #fca5a5'
              }}>
                <AlertCircle size={18} style={{ flexShrink: 0 }} />
                <span>{partnerFormError}</span>
              </div>
            )}
            <form onSubmit={handlePartnerSubmit}>
              <div className="modal-body form-grid">
                
                {/* Partner Name Bilingual with Voice */}
                <BilingualVoiceGroup
                  englishLabel="Partner Name"
                  tamilLabel="பங்குதாரர் பெயர்"
                  englishValue={partnerForm.name}
                  tamilValue={partnerForm.name_ta}
                  onEnglishChange={(val) => setPartnerForm(prev => ({ ...prev, name: val }))}
                  onTamilChange={(val) => setPartnerForm(prev => ({ ...prev, name_ta: val }))}
                  englishPlaceholder="e.g. R. Selvam"
                  tamilPlaceholder="எ.கா. ஆர். செல்வம்"
                  lang={lang}
                  required
                />

                {/* Share Percentage */}
                <div className="form-group">
                  <label>{t.sharePercent} (%)</label>
                  <input
                    type="number"
                    min="1"
                    max="100"
                    className="form-control"
                    placeholder="e.g. 50 or 60"
                    value={partnerForm.sharePercent}
                    onChange={(e) => setPartnerForm({ ...partnerForm, sharePercent: e.target.value })}
                    required
                  />
                </div>

                {/* Phone */}
                <div className="form-group">
                  <label>{lang === 'ta' ? 'அலைபேசி எண் (10 இலக்கங்கள்)' : 'Phone Number (10 digits)'}</label>
                  <input
                    type="tel"
                    className="form-control"
                    placeholder="9842299881"
                    value={partnerForm.phone}
                    onChange={(e) => {
                      const digits = e.target.value.replace(/\D/g, '').slice(0, 10);
                      setPartnerForm({ ...partnerForm, phone: digits });
                      if (partnerFormError) setPartnerFormError('');
                    }}
                  />
                  <span style={{ fontSize: '0.72rem', color: 'var(--text-light)', marginTop: '0.2rem', display: 'block' }}>
                    {lang === 'ta' ? '10 இலக்க தனித்துவமான எண்' : '10-digit unique mobile number'}
                  </span>
                </div>

                {/* Invested Capital */}
                <div className="form-group col-full">
                  <label>{t.investedCapital} (₹)</label>
                  <input
                    type="number"
                    className="form-control"
                    placeholder="e.g. 500000"
                    value={partnerForm.investedCapital}
                    onChange={(e) => setPartnerForm({ ...partnerForm, investedCapital: e.target.value })}
                  />
                </div>

              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-outline" onClick={() => setIsPartnerModalOpen(false)}>
                  {t.cancel}
                </button>
                <button type="submit" className="btn btn-primary">
                  {t.save}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      <AdminDeleteModal
        isOpen={deleteModalState.isOpen}
        onClose={() => setDeleteModalState({ isOpen: false, item: null, type: 'drawing' })}
        onConfirm={(pin) => {
          if (deleteModalState.type === 'drawing') {
            return onDeleteDrawing(deleteModalState.item.id, pin);
          } else {
            return onDeletePartner(deleteModalState.item.id, pin);
          }
        }}
        itemTitle={deleteModalState.item ? (deleteModalState.item.partnerName || deleteModalState.item.name) : ''}
        role={role}
        lang={lang}
      />
    </div>
  );
}
