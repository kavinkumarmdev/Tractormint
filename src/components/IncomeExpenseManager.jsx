import React, { useState } from 'react';
import { Receipt, Plus, Search, Edit3, Trash2, ArrowUpRight, ArrowDownRight, CheckCircle2, Clock, X, AlertCircle } from 'lucide-react';
import { translations, resolveBilingual } from '../translations/dictionary';
import AdminDeleteModal from './AdminDeleteModal';
import DatePicker from './common/DatePicker';
import SearchableSelect from './common/SearchableSelect';
import { validatePositiveNumber } from '../services/storage';
import { formatDateDDMMYYYY } from '../utils/dateUtils';
import { getBilingualText, toSafeLower } from '../utils/langUtils';

export default function IncomeExpenseManager({ 
  incomeExpense = [], 
  onSaveIncomeExpense, 
  onDeleteIncomeExpense, 
  lang = 'ta', 
  role = 'admin' 
}) {
  const t = translations[lang] || translations.en;
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState('all'); // all | income | expense
  const [statusFilter, setStatusFilter] = useState('all'); // all | completed | pending
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [deleteModalState, setDeleteModalState] = useState({ isOpen: false, item: null });
  const [formError, setFormError] = useState('');

  const [formData, setFormData] = useState({
    id: '',
    date: new Date().toISOString().slice(0, 10),
    type: 'income',
    category: '',
    category_ta: '',
    description: '',
    amount: '',
    paymentMode: 'cash',
    status: 'completed'
  });

  const generateUniqueIncomeExpenseId = () => {
    let maxNum = 200;
    incomeExpense.forEach(i => {
      if (i.id && typeof i.id === 'string') {
        const match = i.id.match(/^IE-(\d+)/i);
        if (match) {
          const num = parseInt(match[1], 10);
          if (num > maxNum) maxNum = num;
        }
      }
    });
    let nextNum = maxNum + 1;
    while (incomeExpense.some(i => i.id === `IE-${nextNum}`)) {
      nextNum++;
    }
    return `IE-${nextNum}`;
  };

  const handleOpenAdd = (defaultType = 'income') => {
    setEditingItem(null);
    setFormError('');
    setFormData({
      id: generateUniqueIncomeExpenseId(),
      date: new Date().toISOString().slice(0, 10),
      type: defaultType,
      category: defaultType === 'income' ? 'Agri Subsidy / Govt Grant' : 'Driver Food / Tea',
      category_ta: defaultType === 'income' ? 'விவசாய மானியம் / அரசு உதவி' : 'டிரைவர் உணவு / டீ செலவு',
      description: '',
      amount: '',
      paymentMode: 'cash',
      status: 'completed'
    });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (item) => {
    setEditingItem(item);
    setFormError('');
    setFormData({
      id: item.id || '',
      date: item.date || new Date().toISOString().slice(0, 10),
      type: item.type || 'expense',
      category: item.category || '',
      category_ta: item.category_ta || item.category || '',
      description: item.description || '',
      amount: item.amount !== undefined && item.amount !== null ? String(item.amount) : '',
      paymentMode: item.paymentMode || 'cash',
      status: item.status || 'completed'
    });
    setIsModalOpen(true);
  };

  const handleCategoryChange = (val) => {
    // Automatic bilingual detection and conversion
    const autoTa = resolveBilingual(val, 'ta');
    const autoEn = resolveBilingual(val, 'en');

    setFormData(prev => ({
      ...prev,
      category: val,
      category_ta: autoTa !== val ? autoTa : (prev.category_ta || val)
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setFormError('');

    if (!formData.category || !formData.category.trim()) {
      setFormError(lang === 'ta' ? 'வகைப் பெயர் அல்லது விளக்கம் அவசியம்!' : 'Category or description is required!');
      return;
    }
    if (!formData.date) {
      setFormError(lang === 'ta' ? 'தேதி அவசியம்!' : 'Date is required!');
      return;
    }

    const amtVal = validatePositiveNumber(formData.amount, lang === 'ta' ? 'தொகை' : 'Amount', false);
    if (!amtVal.valid) {
      setFormError(amtVal.error);
      return;
    }

    let finalId = formData.id;
    if (!editingItem && (!finalId || incomeExpense.some(i => i.id === finalId))) {
      finalId = generateUniqueIncomeExpenseId();
    }

    const res = onSaveIncomeExpense({ ...formData, id: finalId, _isEditing: Boolean(editingItem) });
    if (res && res.success === false) {
      setFormError(res.error || 'Failed to save entry.');
      return;
    }

    setIsModalOpen(false);
  };

  const filteredList = incomeExpense.filter(item => {
    const sLower = toSafeLower(searchTerm);
    const matchesSearch = !sLower || (
      toSafeLower(item.category).includes(sLower) ||
      toSafeLower(item.category_ta).includes(sLower) ||
      toSafeLower(item.description).includes(sLower)
    );
    const matchesType = typeFilter === 'all' || item.type === typeFilter;
    const matchesStatus = statusFilter === 'all' || item.status === statusFilter;
    return matchesSearch && matchesType && matchesStatus;
  });

  const totalIncome = incomeExpense
    .filter(i => i.type === 'income')
    .reduce((sum, curr) => sum + (Number(curr.amount) || 0), 0);

  const totalExpense = incomeExpense
    .filter(i => i.type === 'expense')
    .reduce((sum, curr) => sum + (Number(curr.amount) || 0), 0);

  return (
    <div>
      {/* Header bar */}
      <div className="card-header-bar">
        <div className="card-title-group">
          <h2 style={{ margin: 0 }}><Receipt size={22} /> {t.incomeExpense}</h2>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button className="btn btn-primary" onClick={() => handleOpenAdd('income')}>
            <ArrowUpRight size={16} />
            <span>{lang === 'ta' ? 'புதிய வரவு' : 'Add Income'}</span>
          </button>
          <button className="btn btn-outline" onClick={() => handleOpenAdd('expense')} style={{ color: '#dc2626' }}>
            <ArrowDownRight size={16} />
            <span>{lang === 'ta' ? 'புதிய செலவு' : 'Add Expense'}</span>
          </button>
        </div>
      </div>

      {/* Mini Summary Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '1.25rem' }}>
        <div style={{ background: 'var(--bg-card)', padding: '1rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', borderLeft: '4px solid #16a34a' }}>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600 }}>Total Other Income</div>
          <div style={{ fontSize: '1.3rem', fontWeight: 800, color: '#16a34a' }}>₹{totalIncome.toLocaleString()}</div>
        </div>
        <div style={{ background: 'var(--bg-card)', padding: '1rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', borderLeft: '4px solid #dc2626' }}>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600 }}>Total Other Expenses</div>
          <div style={{ fontSize: '1.3rem', fontWeight: 800, color: '#dc2626' }}>₹{totalExpense.toLocaleString()}</div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="filter-bar">
        <div className="search-input-wrapper">
          <Search size={16} className="search-icon-inside" />
          <input
            type="text"
            placeholder={t.search + ' (Category, Subsidy, Food, EMI, Description...)'}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <select 
          className="filter-select"
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
        >
          <option value="all">{lang === 'ta' ? 'அனைத்து வகைகள்' : 'All Types'}</option>
          <option value="income">{t.income}</option>
          <option value="expense">{t.expense}</option>
        </select>

        <select 
          className="filter-select"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
        >
          <option value="all">{lang === 'ta' ? 'அனைத்து நிலைகள்' : 'All Statuses'}</option>
          <option value="completed">{t.completed}</option>
          <option value="pending">{t.pending}</option>
        </select>
      </div>

      {/* Table */}
      <div className="content-card" style={{ padding: '0' }}>
        <div className="table-responsive">
          <table className="data-table">
            <thead>
              <tr>
                <th>{lang === 'ta' ? 'தேதி' : 'Date'}</th>
                <th>{lang === 'ta' ? 'வகை' : 'Type'}</th>
                <th>{lang === 'ta' ? 'பிரிவு' : 'Category'}</th>
                <th>{lang === 'ta' ? 'விளக்கம்' : 'Description'}</th>
                <th>{lang === 'ta' ? 'தொகை (₹)' : 'Amount (₹)'}</th>
                <th>{lang === 'ta' ? 'கட்டண முறை' : 'Payment Mode'}</th>
                <th>{lang === 'ta' ? 'நிலை' : 'Status'}</th>
                <th style={{ textAlign: 'right' }}>{t.actions}</th>
              </tr>
            </thead>
            <tbody>
              {filteredList.map(item => (
                <tr key={item.id}>
                  <td>{formatDateDDMMYYYY(item.date)}</td>
                  <td>
                    <span className={`badge ${item.type === 'income' ? 'badge-paid' : 'badge-unpaid'}`}>
                      {item.type === 'income' ? (lang === 'ta' ? '+ வரவு' : '+ Income') : (lang === 'ta' ? '- செலவு' : '- Expense')}
                    </span>
                  </td>
                  <td>
                    <div style={{ fontWeight: 700 }}>
                      {getBilingualText(item.category, item.category_ta, lang)}
                    </div>
                  </td>
                  <td style={{ fontSize: '0.85rem' }}>{item.description || '--'}</td>
                  <td style={{ fontWeight: 800, fontSize: '0.95rem', color: item.type === 'income' ? '#16a34a' : '#dc2626' }}>
                    {item.type === 'income' ? '+' : '-'} ₹{Number(item.amount).toLocaleString()}
                  </td>
                  <td>
                    <span className="badge badge-info">{item.paymentMode?.toUpperCase()}</span>
                  </td>
                  <td>
                    <span className={`badge ${item.status === 'completed' ? 'badge-paid' : 'badge-partial'}`}>
                      {item.status === 'completed' ? (
                        <><CheckCircle2 size={12} /> {t.completed}</>
                      ) : (
                        <><Clock size={12} /> {t.pending}</>
                      )}
                    </span>
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <div style={{ display: 'inline-flex', gap: '0.35rem' }}>
                      <button 
                        className="btn btn-outline btn-sm"
                        onClick={() => handleOpenEdit(item)}
                        title="Edit Entry"
                      >
                        <Edit3 size={14} />
                      </button>
                      <button 
                        className="btn btn-outline btn-sm"
                        style={{ color: '#ef4444' }}
                        onClick={() => setDeleteModalState({ isOpen: true, item })}
                        title={role === 'admin' ? "Delete Entry" : "Admin Only"}
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {filteredList.length === 0 && (
                <tr>
                  <td colSpan="8" style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-light)' }}>
                    {lang === 'ta' ? 'வரவு அல்லது செலவுப் பதிவுகள் எதுவும் இல்லை.' : 'No income or expense records found.'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add / Edit Modal */}
      {isModalOpen && (
        <div className="modal-overlay" onClick={() => setIsModalOpen(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '580px' }}>
            <div className="modal-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ margin: 0 }}>{editingItem ? `${t.edit}: ${editingItem.category}` : (lang === 'ta' ? 'புதிய வரவு / செலவு பதிவு' : 'Add Other Income or Expense')}</h3>
              <button 
                type="button" 
                className="btn btn-outline btn-sm" 
                onClick={() => setIsModalOpen(false)}
                style={{ padding: '0.35rem 0.75rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}
              >
                <X size={16} />
                <span>{t.cancel || 'Cancel'}</span>
              </button>
            </div>
            {formError && (
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
                <span>{formError}</span>
              </div>
            )}
            <form onSubmit={handleSubmit}>
              <div className="modal-body form-grid">
                
                {/* Type Selection */}
                <div className="form-group">
                  <SearchableSelect
                    label={t.incomeOrExpense}
                    value={formData.type}
                    onChange={(val) => setFormData({ ...formData, type: val })}
                    options={[
                      { value: 'income', label: `${t.income} (Credit)`, badge: '+' },
                      { value: 'expense', label: `${t.expense} (Debit)`, badge: '-' }
                    ]}
                    lang={lang}
                  />
                </div>

                {/* Date */}
                <div className="form-group">
                  <DatePicker
                    label={t.tripDate}
                    value={formData.date}
                    onChange={(val) => setFormData({ ...formData, date: val })}
                    required
                    lang={lang}
                  />
                </div>

                {/* Category (English with auto-transliteration to Tamil) */}
                <div className="form-group">
                  <label>{t.category} (English)</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="e.g. Government Subsidy, Driver Food, Tractor Loan EMI..."
                    value={formData.category}
                    onChange={(e) => handleCategoryChange(e.target.value)}
                    required
                  />
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-light)' }}>
                    {t.typeInEitherLang}
                  </span>
                </div>

                {/* Category Tamil */}
                <div className="form-group">
                  <label>பிரிவு (தமிழ் - Auto Translated)</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="எ.கா. விவசாய மானியம் / டிரைவர் சாப்பாடு"
                    value={formData.category_ta}
                    onChange={(e) => setFormData({ ...formData, category_ta: e.target.value })}
                  />
                </div>

                {/* Amount */}
                <div className="form-group">
                  <label>{t.amount} (₹)</label>
                  <input
                    type="number"
                    className="form-control"
                    placeholder="e.g. 5000"
                    value={formData.amount}
                    onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                    required
                  />
                </div>

                {/* Status (Completed or Pending) */}
                <div className="form-group">
                  <SearchableSelect
                    label="Completion Status"
                    value={formData.status}
                    onChange={(val) => setFormData({ ...formData, status: val })}
                    options={[
                      { value: 'completed', label: `${t.completed} (Amount Paid/Received)` },
                      { value: 'pending', label: `${t.pending} (Scheduled / Pending)` }
                    ]}
                    lang={lang}
                  />
                </div>

                {/* Payment Mode */}
                <div className="form-group">
                  <SearchableSelect
                    label={t.paymentMode}
                    value={formData.paymentMode}
                    onChange={(val) => setFormData({ ...formData, paymentMode: val })}
                    options={[
                      { value: 'cash', label: t.cash },
                      { value: 'gpay_upi', label: t.gpayUpi },
                      { value: 'bank_transfer', label: t.bankTransfer },
                      { value: 'cheque', label: t.cheque }
                    ]}
                    lang={lang}
                  />
                </div>

                {/* Description */}
                <div className="form-group col-full">
                  <label>{t.description} / Remarks</label>
                  <textarea
                    rows={2}
                    className="form-control"
                    placeholder="Add transaction details, bank account number or voucher reference..."
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  />
                </div>

              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-outline" onClick={() => setIsModalOpen(false)}>
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
        onClose={() => setDeleteModalState({ isOpen: false, item: null })}
        onConfirm={(pin) => onDeleteIncomeExpense(deleteModalState.item.id, pin)}
        itemTitle={deleteModalState.item ? `${deleteModalState.item.category} (₹${deleteModalState.item.amount})` : ''}
        role={role}
        lang={lang}
      />
    </div>
  );
}
