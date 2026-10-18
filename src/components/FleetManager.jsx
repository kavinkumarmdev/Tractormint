import React, { useState } from 'react';
import { 
  Tractor, 
  Wrench, 
  Plus, 
  Search, 
  Edit3, 
  Trash2, 
  Filter, 
  Info,
  DollarSign
} from 'lucide-react';
import { translations, resolveBilingual } from '../translations/dictionary';
import AdminDeleteModal from './AdminDeleteModal';
import DatePicker from './common/DatePicker';
import SearchableSelect from './common/SearchableSelect';

export default function FleetManager({ 
  fleet, 
  onSaveFleet, 
  onDeleteFleet, 
  lang, 
  role 
}) {
  const t = translations[lang];
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState('all'); // all | tractor | implement
  const [acquisitionFilter, setAcquisitionFilter] = useState('all');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [deleteModalState, setDeleteModalState] = useState({ isOpen: false, item: null });

  // Form State
  const [formData, setFormData] = useState({
    id: '',
    name: '',
    name_ta: '',
    type: 'tractor',
    implementCategory: 'none',
    regNumber: '',
    acquisition: 'buy_cash',
    purchasePrice: '',
    purchaseDate: new Date().toISOString().slice(0, 10),
    modelYear: new Date().getFullYear().toString(),
    hp: '',
    emiMonthly: '',
    emiBank: '',
    currentHours: '',
    status: 'available',
    notes: ''
  });

  const handleOpenAdd = (defaultType = 'tractor') => {
    const newId = defaultType === 'tractor' 
      ? `TRAC-${String(fleet.filter(f => f.type === 'tractor').length + 1).padStart(2, '0')}`
      : `IMP-${String(fleet.filter(f => f.type === 'implement').length + 1).padStart(2, '0')}`;
    
    setEditingItem(null);
    setFormData({
      id: newId,
      name: '',
      name_ta: '',
      type: defaultType,
      implementCategory: defaultType === 'implement' ? 'rotavator' : 'none',
      regNumber: '',
      acquisition: 'buy_cash',
      purchasePrice: '',
      purchaseDate: new Date().toISOString().slice(0, 10),
      modelYear: new Date().getFullYear().toString(),
      hp: defaultType === 'tractor' ? '45' : '',
      emiMonthly: '',
      emiBank: '',
      currentHours: defaultType === 'tractor' ? '0' : '',
      status: 'available',
      notes: ''
    });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (item) => {
    setEditingItem(item);
    setFormData({ ...item });
    setIsModalOpen(true);
  };

  const handleFormChange = (field, value) => {
    setFormData(prev => {
      const updated = { ...prev, [field]: value };
      
      // Auto-translate / auto-suggest name_ta if name changes
      if (field === 'name') {
        const autoTa = resolveBilingual(value, 'ta');
        if (autoTa && autoTa !== value && !prev.name_ta) {
          updated.name_ta = autoTa;
        }
      }
      
      // If implementCategory changes, suggest Tamil and English names
      if (field === 'implementCategory') {
        if (value === 'rotavator') {
          updated.name = prev.name || 'Rotavator (ரோட்டாவேட்டர்)';
          updated.name_ta = 'ரோட்டாவேட்டர்';
        } else if (value === 'cultivator_5tyne') {
          updated.name = prev.name || '5-Tyne Cultivator (5 கொழு)';
          updated.name_ta = '5 கொழு கலப்பை';
        } else if (value === 'disc_plough') {
          updated.name = prev.name || 'Disc Plough (தட்டு கலப்பை)';
          updated.name_ta = 'தட்டு கலப்பை';
        } else if (value === 'trailer') {
          updated.name = prev.name || 'Hydraulic Trailer (டிரெய்லர்)';
          updated.name_ta = 'ஹைட்ராலிக் டிரெய்லர் / வண்டி';
        }
      }

      return updated;
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSaveFleet(formData);
    setIsModalOpen(false);
  };

  // Filtered Items
  const filteredFleet = fleet.filter(item => {
    const matchesSearch = (item.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                          (item.name_ta || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                          (item.regNumber || '').toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = typeFilter === 'all' || item.type === typeFilter;
    const matchesAcquisition = acquisitionFilter === 'all' || item.acquisition === acquisitionFilter;
    return matchesSearch && matchesType && matchesAcquisition;
  });

  return (
    <div>
      {/* Header bar */}
      <div className="card-header-bar" style={{ marginBottom: '1.25rem' }}>
        <div className="card-title-group">
          <h2><Tractor size={22} /> {t.fleet}</h2>
          <p>{lang === 'ta' ? 'டிராக்டர் மற்றும் கருவிகள் (ரோட்டாவேட்டர், 5 கொழு கலப்பை போன்றவை) பதிவு' : 'Manage Tractors, Implements, Acquisition & EMI details'}</p>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button className="btn btn-primary" onClick={() => handleOpenAdd('tractor')}>
            <Plus size={16} />
            {lang === 'ta' ? '+ புதிய டிராக்டர்' : '+ Add Tractor'}
          </button>
          <button className="btn btn-outline" onClick={() => handleOpenAdd('implement')}>
            <Wrench size={16} />
            {lang === 'ta' ? '+ புதிய கருவி (5 கொழு/ரோட்டாவேட்டர்)' : '+ Add Implement'}
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="filter-bar">
        <div className="search-input-wrapper">
          <Search size={16} className="search-icon-inside" />
          <input
            type="text"
            placeholder={t.search + ' (e.g. Mahindra, 5 கொழு, Rotavator)'}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <select 
          className="filter-select"
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
        >
          <option value="all">All Fleet Types</option>
          <option value="tractor">{t.tractor}</option>
          <option value="implement">{t.machine}</option>
        </select>

        <select 
          className="filter-select"
          value={acquisitionFilter}
          onChange={(e) => setAcquisitionFilter(e.target.value)}
        >
          <option value="all">All Acquisition Methods</option>
          <option value="buy_cash">{t.buyCash}</option>
          <option value="rent">{t.rent}</option>
          <option value="lease">{t.lease}</option>
          <option value="loan_emi">{t.loanEmi}</option>
          <option value="demo">{t.demo}</option>
        </select>
      </div>

      {/* Fleet Table */}
      <div className="content-card" style={{ padding: '0' }}>
        <div className="table-responsive">
          <table className="data-table">
            <thead>
              <tr>
                <th>ID / Reg No</th>
                <th>Name / விவரம்</th>
                <th>Type</th>
                <th>Acquisition (முறை)</th>
                <th>HP / Model</th>
                <th>Hour Meter</th>
                <th>Status</th>
                <th style={{ textAlign: 'right' }}>{t.actions}</th>
              </tr>
            </thead>
            <tbody>
              {filteredFleet.map(item => (
                <tr key={item.id}>
                  <td>
                    <div style={{ fontWeight: 700, color: 'var(--primary-700)' }}>{item.id}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-light)' }}>{item.regNumber || '--'}</div>
                  </td>
                  <td>
                    <div style={{ fontWeight: 600 }}>{lang === 'ta' ? (item.name_ta || item.name) : item.name}</div>
                    {item.notes && <div style={{ fontSize: '0.75rem', color: 'var(--text-light)' }}>{item.notes}</div>}
                  </td>
                  <td>
                    <span className={`badge ${item.type === 'tractor' ? 'badge-info' : 'badge-purple'}`}>
                      {item.type === 'tractor' ? t.tractor : t.machine}
                    </span>
                  </td>
                  <td>
                    <span style={{ fontWeight: 600, fontSize: '0.825rem' }}>
                      {item.acquisition === 'buy_cash' ? t.buyCash :
                       item.acquisition === 'rent' ? t.rent :
                       item.acquisition === 'lease' ? t.lease :
                       item.acquisition === 'loan_emi' ? `${t.loanEmi} (₹${item.emiMonthly}/mo)` : t.demo}
                    </span>
                  </td>
                  <td>
                    <div style={{ fontSize: '0.85rem' }}>{item.hp ? `${item.hp} HP` : '--'}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-light)' }}>{item.modelYear || ''}</div>
                  </td>
                  <td style={{ fontWeight: 600 }}>
                    {item.currentHours ? `${item.currentHours} hrs` : '--'}
                  </td>
                  <td>
                    <span className={`badge ${
                      item.status === 'available' ? 'badge-paid' :
                      item.status === 'on_field' ? 'badge-partial' : 'badge-unpaid'
                    }`}>
                      {item.status === 'available' ? t.available :
                       item.status === 'on_field' ? t.onField :
                       item.status === 'in_service' ? t.inService : t.inactive}
                    </span>
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <div style={{ display: 'inline-flex', gap: '0.35rem' }}>
                      <button 
                        className="btn btn-outline btn-sm"
                        onClick={() => handleOpenEdit(item)}
                        title="Edit Record"
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
              {filteredFleet.length === 0 && (
                <tr>
                  <td colSpan="8" style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-light)' }}>
                    No machines or tractors found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add / Edit Fleet Modal */}
      {isModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3>{editingItem ? `${t.edit}: ${editingItem.name}` : t.create}</h3>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="modal-body form-grid">
                
                {/* Type Selection */}
                <div className="form-group">
                  <SearchableSelect
                    label={`${t.tractor} / ${t.machine}`}
                    value={formData.type}
                    onChange={(val) => handleFormChange('type', val)}
                    options={[
                      { value: 'tractor', label: t.tractor },
                      { value: 'implement', label: t.machine }
                    ]}
                    lang={lang}
                  />
                </div>

                {/* Implement Category if implement */}
                {formData.type === 'implement' && (
                  <div className="form-group">
                    <SearchableSelect
                      label={t.machineCategory}
                      value={formData.implementCategory}
                      onChange={(val) => handleFormChange('implementCategory', val)}
                      options={[
                        { value: 'rotavator', label: 'Rotavator (ரோட்டாவேட்டர்)' },
                        { value: 'cultivator_5tyne', label: '5-Tyne Cultivator (5 கொழு கலப்பை)' },
                        { value: 'disc_plough', label: 'Disc Plough (தட்டு கலப்பை)' },
                        { value: 'trailer', label: 'Trailer / Tipper (டிரெய்லர்)' },
                        { value: 'harvester', label: 'Harvester (அறுவடை இயந்திரம்)' },
                        { value: 'baler', label: 'Straw Baler (வைக்கோல் கட்டும் கருவி)' },
                        { value: 'leveler', label: 'Land Leveler (சமன் பலகை)' },
                        { value: 'other', label: 'Other Machinery' }
                      ]}
                      lang={lang}
                    />
                  </div>
                )}

                {/* Name English */}
                <div className="form-group">
                  <label>Machine / Tractor Name (English)</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="e.g. Mahindra 575 DI / 5-Tyne Cultivator"
                    value={formData.name}
                    onChange={(e) => handleFormChange('name', e.target.value)}
                    required
                  />
                </div>

                {/* Name Tamil */}
                <div className="form-group">
                  <label>பெயர் (தமிழ் - Auto-assisted)</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="எ.கா. மகிந்திரா 575 DI / 5 கொழு கலப்பை"
                    value={formData.name_ta}
                    onChange={(e) => handleFormChange('name_ta', e.target.value)}
                  />
                </div>

                {/* Reg / ID Number */}
                <div className="form-group">
                  <label>{t.regNumber}</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="e.g. TN 45 AB 1234 or IMP-01"
                    value={formData.regNumber}
                    onChange={(e) => handleFormChange('regNumber', e.target.value)}
                  />
                </div>

                {/* Acquisition Type */}
                <div className="form-group">
                  <SearchableSelect
                    label={`${t.acquisitionType} (Buy / Rent / Lease / Loan / Demo)`}
                    value={formData.acquisition}
                    onChange={(val) => handleFormChange('acquisition', val)}
                    options={[
                      { value: 'buy_cash', label: t.buyCash },
                      { value: 'rent', label: t.rent },
                      { value: 'lease', label: t.lease },
                      { value: 'loan_emi', label: t.loanEmi },
                      { value: 'demo', label: t.demo }
                    ]}
                    lang={lang}
                  />
                </div>

                {/* Loan / EMI specific fields */}
                {formData.acquisition === 'loan_emi' && (
                  <>
                    <div className="form-group">
                      <label>{t.emiMonthly}</label>
                      <input
                        type="number"
                        className="form-control"
                        placeholder="e.g. 18500"
                        value={formData.emiMonthly}
                        onChange={(e) => handleFormChange('emiMonthly', e.target.value)}
                      />
                    </div>
                    <div className="form-group">
                      <label>{t.emiBank}</label>
                      <input
                        type="text"
                        className="form-control"
                        placeholder="e.g. SBI Agri Loan / Mahindra Finance"
                        value={formData.emiBank}
                        onChange={(e) => handleFormChange('emiBank', e.target.value)}
                      />
                    </div>
                  </>
                )}

                {/* Purchase Cost & Date */}
                <div className="form-group">
                  <label>{t.purchasePrice}</label>
                  <input
                    type="number"
                    className="form-control"
                    placeholder="e.g. 750000"
                    value={formData.purchasePrice}
                    onChange={(e) => handleFormChange('purchasePrice', e.target.value)}
                  />
                </div>

                <div className="form-group">
                  <DatePicker
                    label={t.purchaseDate}
                    value={formData.purchaseDate}
                    onChange={(val) => handleFormChange('purchaseDate', val)}
                    lang={lang}
                  />
                </div>

                {/* HP & Hour Meter */}
                <div className="form-group">
                  <label>{t.hp}</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="e.g. 45 or 50"
                    value={formData.hp}
                    onChange={(e) => handleFormChange('hp', e.target.value)}
                  />
                </div>

                <div className="form-group">
                  <label>{t.currentHours}</label>
                  <input
                    type="number"
                    step="0.1"
                    className="form-control"
                    placeholder="e.g. 1250"
                    value={formData.currentHours}
                    onChange={(e) => handleFormChange('currentHours', e.target.value)}
                  />
                </div>

                {/* Status */}
                <div className="form-group">
                  <SearchableSelect
                    label="Operational Status"
                    value={formData.status}
                    onChange={(val) => handleFormChange('status', val)}
                    options={[
                      { value: 'available', label: t.available },
                      { value: 'on_field', label: t.onField },
                      { value: 'in_service', label: t.inService },
                      { value: 'inactive', label: t.inactive }
                    ]}
                    lang={lang}
                  />
                </div>

                {/* Notes */}
                <div className="form-group col-full">
                  <label>Notes / Specification Details</label>
                  <textarea
                    rows={2}
                    className="form-control"
                    placeholder="Special features, implement compatibility, insurance policy..."
                    value={formData.notes}
                    onChange={(e) => handleFormChange('notes', e.target.value)}
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
        onConfirm={(pin) => onDeleteFleet(deleteModalState.item.id, pin)}
        itemTitle={deleteModalState.item ? deleteModalState.item.name : ''}
        role={role}
        lang={lang}
      />
    </div>
  );
}
