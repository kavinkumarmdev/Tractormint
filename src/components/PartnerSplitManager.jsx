import React, { useState } from 'react';
import { Scale, Plus, Search, Edit3, Trash2, IndianRupee, PieChart, ArrowDownRight, User } from 'lucide-react';
import { translations } from '../translations/dictionary';
import AdminDeleteModal from './AdminDeleteModal';
import DatePicker from './common/DatePicker';
import SearchableSelect from './common/SearchableSelect';

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

  // Handlers
  const handleOpenAddDrawing = () => {
    const defaultPartner = partners[0] || { id: '', name: 'Partner' };
    setEditingDrawing(null);
    setDrawingForm({
      id: `DRW-${String(partnerDrawings.length + 1).padStart(2, '0')}`,
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
    setDrawingForm({ ...item });
    setIsDrawingModalOpen(true);
  };

  const handleOpenAddPartner = () => {
    setEditingPartner(null);
    setPartnerForm({
      id: `PART-${String(partners.length + 1).padStart(2, '0')}`,
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
    setPartnerForm({ ...p });
    setIsPartnerModalOpen(true);
  };

  const handleDrawingSubmit = (e) => {
    e.preventDefault();
    onSaveDrawing(drawingForm);
    setIsDrawingModalOpen(false);
  };

  const handlePartnerSubmit = (e) => {
    e.preventDefault();
    onSavePartner(partnerForm);
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
          <h2><Scale size={22} /> {t.partnerSplit}</h2>
          <p>{lang === 'ta' ? 'பங்குதாரர்கள் யார் யார் எவ்வளவு பணம் எடுத்தார்கள் (Drawings) மற்றும் நிகர லாபப் பங்கீட்டு விவரம்' : 'Partner profit sharing reconciliation and individual drawings ledger'}</p>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button className="btn btn-primary" onClick={handleOpenAddDrawing}>
            <Plus size={16} />
            {lang === 'ta' ? '+ பணம் எடுத்த பதிவு (Drawing)' : '+ Record Amount Taken'}
          </button>
          <button className="btn btn-outline" onClick={handleOpenAddPartner}>
            <User size={16} />
            {lang === 'ta' ? '+ புதிய பங்குதாரர்' : '+ Add Partner'}
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
                {filteredDrawings.map(d => (
                  <tr key={d.id}>
                    <td style={{ fontWeight: 700, color: 'var(--primary-700)' }}>{d.id}</td>
                    <td>{d.date}</td>
                    <td style={{ fontWeight: 600 }}>{d.partnerName}</td>
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
                ))}
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
                  <th>ID</th>
                  <th>Partner Name</th>
                  <th>Share Ratio (%)</th>
                  <th>Phone Number</th>
                  <th>Invested Capital (₹)</th>
                  <th style={{ textAlign: 'right' }}>{t.actions}</th>
                </tr>
              </thead>
              <tbody>
                {partners.map(p => (
                  <tr key={p.id}>
                    <td style={{ fontWeight: 700, color: 'var(--primary-700)' }}>{p.id}</td>
                    <td>
                      <div style={{ fontWeight: 600 }}>{lang === 'ta' ? (p.name_ta || p.name) : p.name}</div>
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
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '540px' }}>
            <div className="modal-header">
              <h3>{editingDrawing ? `${t.edit}: ${editingDrawing.id}` : '+ Record Partner Amount Taken (Drawing)'}</h3>
            </div>
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
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '520px' }}>
            <div className="modal-header">
              <h3>{editingPartner ? `${t.edit}: ${editingPartner.name}` : '+ Add Partner / Shareholder'}</h3>
            </div>
            <form onSubmit={handlePartnerSubmit}>
              <div className="modal-body form-grid">
                
                {/* Name English */}
                <div className="form-group">
                  <label>Partner Name (English)</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="e.g. Kuppusamy"
                    value={partnerForm.name}
                    onChange={(e) => setPartnerForm({ ...partnerForm, name: e.target.value })}
                    required
                  />
                </div>

                {/* Name Tamil */}
                <div className="form-group">
                  <label>பெயர் (தமிழ்)</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="எ.கா. குப்புசாமி"
                    value={partnerForm.name_ta}
                    onChange={(e) => setPartnerForm({ ...partnerForm, name_ta: e.target.value })}
                  />
                </div>

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
                  <label>{t.phone}</label>
                  <input
                    type="tel"
                    className="form-control"
                    placeholder="e.g. 98422 99881"
                    value={partnerForm.phone}
                    onChange={(e) => setPartnerForm({ ...partnerForm, phone: e.target.value })}
                  />
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
