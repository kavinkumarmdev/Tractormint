import React, { useState } from 'react';
import { Wrench, Plus, Search, Edit3, Trash2, Fuel, Filter, X, AlertCircle } from 'lucide-react';
import { translations, resolveBilingual } from '../translations/dictionary';
import AdminDeleteModal from './AdminDeleteModal';
import DatePicker from './common/DatePicker';
import SearchableSelect from './common/SearchableSelect';
import VoiceInput from './common/VoiceInput';
import { validatePositiveNumber } from '../services/storage';

export default function MaintenanceManager({ 
  maintenance, 
  fleet, 
  onSaveMaintenance, 
  onDeleteMaintenance, 
  lang, 
  role 
}) {
  const t = translations[lang];
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [deleteModalState, setDeleteModalState] = useState({ isOpen: false, item: null });
  const [formError, setFormError] = useState('');

  const categories = [
    { id: 'diesel', name: 'Diesel / Fuel', name_ta: 'டீசல்', unit: 'liters' },
    { id: 'engine_oil', name: 'Engine Oil', name_ta: 'என்ஜின் ஆயில்', unit: 'liters' },
    { id: 'service_250h', name: 'Scheduled Service (250h / 500h)', name_ta: 'சர்வீஸ் (250/500 மணி)', unit: 'service' },
    { id: 'tractor_repair', name: 'Tractor Repair', name_ta: 'டிராக்டர் பழுதுபார்ப்பு', unit: 'job' },
    { id: 'rotavator_blade', name: 'Rotavator Blades', name_ta: 'ரோட்டாவேட்டர் பிளேடுகள்', unit: 'nos' },
    { id: '5tyne_blade', name: '5-Tyne Cultivator Blades', name_ta: '5 கொழு பிளேடுகள் / கொழுப்புகள்', unit: 'nos' },
    { id: 'nuts_bolts', name: 'Nuts & Bolts & Fasteners', name_ta: 'நட்டுகள் & போல்ட்டுகள்', unit: 'nos' },
    { id: 'battery', name: 'Battery & Electricals', name_ta: 'பேட்டரி & எலக்ட்ரிக்கல்', unit: 'nos' },
    { id: 'tires', name: 'Tires & Tubes', name_ta: 'டயர்கள் & டியூப்', unit: 'nos' },
    { id: 'grease', name: 'Greasing & Lubrication', name_ta: 'கிரீஸ் அடித்தல்', unit: 'kg' },
    { id: 'hydraulic_oil', name: 'Hydraulic Oil', name_ta: 'ஹைட்ராலிக் ஆயில்', unit: 'liters' },
    { id: 'workshop_labor', name: 'Workshop Labor Charges', name_ta: 'பட்டறை கூலி', unit: 'job' },
    { id: 'other', name: 'Other Spares / Maintainence', name_ta: 'இதர பராமரிப்பு', unit: 'item' }
  ];

  const [formData, setFormData] = useState({
    id: '',
    date: new Date().toISOString().slice(0, 10),
    assetId: '',
    assetName: '',
    category: 'diesel',
    category_ta: 'டீசல்',
    quantity: '50',
    unit: 'liters',
    unitCost: '92',
    totalAmount: '4600',
    hourMeter: '',
    vendorName: '',
    billNumber: '',
    paymentMode: 'cash',
    notes: ''
  });

  const generateUniqueMaintenanceId = () => {
    let maxNum = 100;
    maintenance.forEach(m => {
      if (m.id && typeof m.id === 'string') {
        const match = m.id.match(/^MNT-(\d+)/i);
        if (match) {
          const num = parseInt(match[1], 10);
          if (num > maxNum) maxNum = num;
        }
      }
    });
    let nextNum = maxNum + 1;
    while (maintenance.some(m => m.id === `MNT-${nextNum}`)) {
      nextNum++;
    }
    return `MNT-${nextNum}`;
  };

  const handleOpenAdd = () => {
    const defaultAsset = fleet[0] || { id: '', name: 'General Fleet' };
    setEditingItem(null);
    setFormError('');
    setFormData({
      id: generateUniqueMaintenanceId(),
      date: new Date().toISOString().slice(0, 10),
      assetId: defaultAsset.id,
      assetName: defaultAsset.name,
      category: 'diesel',
      category_ta: 'டீசல்',
      quantity: '50',
      unit: 'liters',
      unitCost: '92',
      totalAmount: '4600',
      hourMeter: defaultAsset.currentHours || '',
      vendorName: 'HP Auto Fuel Point',
      billNumber: '',
      paymentMode: 'cash',
      notes: ''
    });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (item) => {
    setEditingItem(item);
    setFormError('');
    setFormData({ ...item });
    setIsModalOpen(true);
  };

  const handleFormChange = (field, value) => {
    setFormData(prev => {
      const updated = { ...prev, [field]: value };

      if (field === 'assetId') {
        const found = fleet.find(f => f.id === value);
        if (found) {
          updated.assetName = found.name;
          if (found.currentHours) updated.hourMeter = found.currentHours;
        }
      }

      if (field === 'category') {
        const foundCat = categories.find(c => c.id === value);
        if (foundCat) {
          updated.category_ta = foundCat.name_ta;
          updated.unit = foundCat.unit;
        }
      }

      // Compute total
      const qty = parseFloat(field === 'quantity' ? value : updated.quantity) || 0;
      const cost = parseFloat(field === 'unitCost' ? value : updated.unitCost) || 0;
      updated.totalAmount = (qty * cost).toFixed(0);

      return updated;
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setFormError('');

    if (!formData.assetId) {
      setFormError(lang === 'ta' ? 'டிராக்டர் / இயந்திரத்தை தேர்வு செய்யவும்!' : 'Please select a Tractor / Machine!');
      return;
    }
    if (!formData.category) {
      setFormError(lang === 'ta' ? 'செலவு வகையை தேர்வு செய்யவும்!' : 'Please select an expense category!');
      return;
    }
    if (!formData.date) {
      setFormError(lang === 'ta' ? 'தேதி அவசியம்!' : 'Date is required!');
      return;
    }

    const qtyVal = validatePositiveNumber(formData.quantity, lang === 'ta' ? 'அளவு' : 'Quantity', false);
    if (!qtyVal.valid) {
      setFormError(qtyVal.error);
      return;
    }

    const totalVal = validatePositiveNumber(formData.totalAmount, lang === 'ta' ? 'மொத்த தொகை' : 'Total Amount', false);
    if (!totalVal.valid) {
      setFormError(totalVal.error);
      return;
    }

    if (formData.hourMeter !== undefined && formData.hourMeter !== '') {
      const hrVal = validatePositiveNumber(formData.hourMeter, lang === 'ta' ? 'மீட்டர் அளவு' : 'Hour Meter', true);
      if (!hrVal.valid) {
        setFormError(hrVal.error);
        return;
      }
    }

    let finalId = formData.id;
    if (!editingItem && (!finalId || maintenance.some(m => m.id === finalId))) {
      finalId = generateUniqueMaintenanceId();
    }

    const res = onSaveMaintenance({ ...formData, id: finalId, _isEditing: Boolean(editingItem) });
    if (res && res.success === false) {
      setFormError(res.error || 'Failed to save maintenance record.');
      return;
    }

    setIsModalOpen(false);
  };

  const filteredItems = maintenance.filter(m => {
    const matchesSearch = (m.assetName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                          (m.category || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                          (m.category_ta || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                          (m.vendorName || '').toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = categoryFilter === 'all' || m.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  return (
    <div>
      {/* Header bar */}
      <div className="card-header-bar">
        <div className="card-title-group">
          <h2><Wrench size={22} /> {t.maintenance}</h2>
          <p>{lang === 'ta' ? 'டீசல், என்ஜின் ஆயில், ரோட்டாவேட்டர்/5 கொழு பிளேடுகள், நட்டுகள்-போல்ட்டுகள் மற்றும் சர்வீஸ் செலவுகள்' : 'Fuel, Engine Oil, Rotavator & 5-Tyne Blades, Nuts & Bolts, Battery & Repairs'}</p>
        </div>
        <button className="btn btn-primary" onClick={handleOpenAdd}>
          <Plus size={16} />
          <span>{lang === 'ta' ? 'புதிய செலவு / உதிரிபாகம்' : 'Add Maintenance / Fuel'}</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="filter-bar">
        <div className="search-input-wrapper">
          <Search size={16} className="search-icon-inside" />
          <input
            type="text"
            placeholder={t.search + ' (Diesel, Rotavator Blades, Oil, Battery, Bunk...)'}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <select 
          className="filter-select"
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
        >
          <option value="all">All Maintenance Categories</option>
          {categories.map(c => (
            <option key={c.id} value={c.id}>
              {lang === 'ta' ? c.name_ta : c.name}
            </option>
          ))}
        </select>
      </div>

      {/* Table */}
      <div className="content-card" style={{ padding: '0' }}>
        <div className="table-responsive">
          <table className="data-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Category (பிரிவு)</th>
                <th>Target Asset (இயந்திரம்)</th>
                <th>Quantity</th>
                <th>Unit Cost</th>
                <th>Total Cost (₹)</th>
                <th>Meter Reading</th>
                <th>Vendor / Bill #</th>
                <th>Payment</th>
                <th style={{ textAlign: 'right' }}>{t.actions}</th>
              </tr>
            </thead>
            <tbody>
              {filteredItems.map(item => (
                <tr key={item.id}>
                  <td>{item.date}</td>
                  <td>
                    <div style={{ fontWeight: 700, color: 'var(--primary-700)' }}>
                      {lang === 'ta' ? (item.category_ta || item.category) : item.category}
                    </div>
                    {item.notes && <div style={{ fontSize: '0.75rem', color: 'var(--text-light)' }}>{item.notes}</div>}
                  </td>
                  <td>
                    <span className="badge badge-purple">{item.assetName}</span>
                  </td>
                  <td>{item.quantity} {item.unit}</td>
                  <td>₹{item.unitCost}</td>
                  <td style={{ fontWeight: 800, color: '#d97706', fontSize: '0.95rem' }}>
                    ₹{Number(item.totalAmount).toLocaleString()}
                  </td>
                  <td>{item.hourMeter ? `${item.hourMeter} hrs` : '--'}</td>
                  <td>
                    <div style={{ fontSize: '0.85rem' }}>{item.vendorName || '--'}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-light)' }}>{item.billNumber ? `Bill: ${item.billNumber}` : ''}</div>
                  </td>
                  <td>
                    <span className="badge badge-info">{item.paymentMode?.toUpperCase()}</span>
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <div style={{ display: 'inline-flex', gap: '0.35rem' }}>
                      <button 
                        className="btn btn-outline btn-sm"
                        onClick={() => handleOpenEdit(item)}
                        title="Edit Maintenance"
                      >
                        <Edit3 size={14} />
                      </button>
                      <button 
                        className="btn btn-outline btn-sm"
                        style={{ color: '#ef4444' }}
                        onClick={() => setDeleteModalState({ isOpen: true, item })}
                        title={role === 'admin' ? "Delete Record" : "Admin Only"}
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {filteredItems.length === 0 && (
                <tr>
                  <td colSpan="10" style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-light)' }}>
                    No maintenance records found.
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
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '640px' }}>
            <div className="modal-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ margin: 0 }}>{editingItem ? `${t.edit}: ${editingItem.category}` : (lang === 'ta' ? 'புதிய செலவு / பராமரிப்பு' : 'Add Fuel, Spare Parts or Maintenance')}</h3>
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
                
                {/* Date */}
                <div className="form-group">
                  <DatePicker
                    label={t.tripDate}
                    value={formData.date}
                    onChange={(val) => handleFormChange('date', val)}
                    required
                    lang={lang}
                  />
                </div>

                {/* Target Tractor / Implement */}
                <div className="form-group">
                  <SearchableSelect
                    label="Target Tractor or Machine"
                    value={formData.assetId}
                    onChange={(val) => handleFormChange('assetId', val)}
                    options={fleet.map(f => ({
                      value: f.id,
                      label: f.name,
                      subLabel: f.regNumber || '',
                      badge: f.type === 'tractor' ? 'Tractor' : 'Implement'
                    }))}
                    placeholder="-- Select Tractor / Implement --"
                    required
                    lang={lang}
                  />
                </div>

                {/* Category Selection */}
                <div className="form-group">
                  <SearchableSelect
                    label={`${t.partOrService} (Category)`}
                    value={formData.category}
                    onChange={(val) => handleFormChange('category', val)}
                    options={categories.map(c => ({
                      value: c.id,
                      label: lang === 'ta' ? c.name_ta : c.name
                    }))}
                    placeholder="-- Select Category --"
                    lang={lang}
                  />
                </div>

                {/* Hour Meter at Service */}
                <div className="form-group">
                  <label>{t.meterReading}</label>
                  <input
                    type="number"
                    step="0.1"
                    className="form-control"
                    placeholder="e.g. 1245.0"
                    value={formData.hourMeter}
                    onChange={(e) => handleFormChange('hourMeter', e.target.value)}
                  />
                </div>

                {/* Quantity */}
                <div className="form-group">
                  <label>{t.quantity} ({formData.unit})</label>
                  <input
                    type="number"
                    step="0.1"
                    className="form-control"
                    value={formData.quantity}
                    onChange={(e) => handleFormChange('quantity', e.target.value)}
                    required
                  />
                </div>

                {/* Unit Cost */}
                <div className="form-group">
                  <label>{t.unitCost} (₹)</label>
                  <input
                    type="number"
                    className="form-control"
                    value={formData.unitCost}
                    onChange={(e) => handleFormChange('unitCost', e.target.value)}
                    required
                  />
                </div>

                {/* Total Cost (Auto-calc) */}
                <div className="form-group">
                  <label style={{ color: '#d97706', fontWeight: 800 }}>{t.totalCost} (₹)</label>
                  <input
                    type="number"
                    className="form-control"
                    value={formData.totalAmount}
                    readOnly
                    style={{ background: 'var(--bg-subtle)', fontWeight: 800, fontSize: '1.1rem', color: '#d97706' }}
                  />
                </div>

                {/* Payment Mode */}
                <div className="form-group">
                  <SearchableSelect
                    label={t.paymentMode}
                    value={formData.paymentMode}
                    onChange={(val) => handleFormChange('paymentMode', val)}
                    options={[
                      { value: 'cash', label: t.cash },
                      { value: 'gpay_upi', label: t.gpayUpi },
                      { value: 'bank_transfer', label: t.bankTransfer },
                      { value: 'credit', label: 'Credit / Bunk Khata' }
                    ]}
                    lang={lang}
                  />
                </div>

                {/* Vendor / Bunk Name */}
                <div className="form-group">
                  <VoiceInput
                    label={t.vendorName}
                    placeholder="e.g. HP Auto Fuels / Sri Murugan Agri Spares"
                    value={formData.vendorName}
                    onChange={(val) => handleFormChange('vendorName', val)}
                    speechLang={lang === 'ta' ? 'ta-IN' : 'en-IN'}
                  />
                </div>

                {/* Bill / Invoice Number */}
                <div className="form-group">
                  <VoiceInput
                    label={t.billNumber}
                    placeholder="e.g. INV-89021"
                    value={formData.billNumber}
                    onChange={(val) => handleFormChange('billNumber', val)}
                    speechLang="en-IN"
                  />
                </div>

                {/* Notes */}
                <div className="form-group col-full">
                  <VoiceInput
                    label="Remarks / Part Brand / Warranty Details (குறிப்பு)"
                    placeholder="e.g. 14 right hand blades replaced, high tensile bolts"
                    value={formData.notes}
                    onChange={(val) => handleFormChange('notes', val)}
                    speechLang={lang === 'ta' ? 'ta-IN' : 'en-IN'}
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
        onConfirm={(pin) => onDeleteMaintenance(deleteModalState.item.id, pin)}
        itemTitle={deleteModalState.item ? `${deleteModalState.item.category} (${deleteModalState.item.assetName})` : ''}
        role={role}
        lang={lang}
      />
    </div>
  );
}
