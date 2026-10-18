import React, { useState } from 'react';
import { Tag, Plus, Edit3, Trash2, Calendar, Search } from 'lucide-react';
import { translations } from '../translations/dictionary';
import AdminDeleteModal from './AdminDeleteModal';
import DatePicker from './common/DatePicker';
import SearchableSelect from './common/SearchableSelect';

export default function RateMatrixManager({ 
  rateMatrix, 
  fleet, 
  onSaveRate, 
  onDeleteRate, 
  lang, 
  role 
}) {
  const t = translations[lang];
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [deleteModalState, setDeleteModalState] = useState({ isOpen: false, item: null });

  const tractors = fleet.filter(f => f.type === 'tractor');
  const implementsList = fleet.filter(f => f.type === 'implement');

  const [formData, setFormData] = useState({
    id: '',
    tractorId: '',
    tractorName: '',
    implementId: '',
    implementName: '',
    unit: 'per_hour',
    rate: '',
    effectiveDate: new Date().toISOString().slice(0, 10),
    description: ''
  });

  const handleOpenAdd = () => {
    const defaultTractor = tractors[0] || { id: 'TRAC-01', name: 'General Tractor' };
    const defaultImplement = implementsList[0] || { id: 'IMP-01', name: 'Standard Implement' };
    
    setEditingItem(null);
    setFormData({
      id: `RATE-${String(rateMatrix.length + 1).padStart(2, '0')}`,
      tractorId: defaultTractor.id,
      tractorName: defaultTractor.name,
      implementId: defaultImplement.id,
      implementName: defaultImplement.name,
      unit: 'per_hour',
      rate: '',
      effectiveDate: new Date().toISOString().slice(0, 10),
      description: ''
    });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (item) => {
    setEditingItem(item);
    setFormData({ ...item });
    setIsModalOpen(true);
  };

  const handleTractorChange = (val) => {
    const id = typeof val === 'object' && val?.target ? val.target.value : val;
    const selected = tractors.find(t => t.id === id);
    setFormData(prev => ({
      ...prev,
      tractorId: id,
      tractorName: selected ? selected.name : ''
    }));
  };

  const handleImplementChange = (val) => {
    const id = typeof val === 'object' && val?.target ? val.target.value : val;
    const selected = implementsList.find(m => m.id === id);
    setFormData(prev => ({
      ...prev,
      implementId: id,
      implementName: selected ? selected.name : (id === 'none' ? 'None (Tractor Standalone)' : '')
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSaveRate(formData);
    setIsModalOpen(false);
  };

  const filteredRates = rateMatrix.filter(r => {
    return (r.tractorName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
           (r.implementName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
           (r.description || '').toLowerCase().includes(searchTerm.toLowerCase());
  });

  return (
    <div>
      {/* Header bar */}
      <div className="card-header-bar">
        <div className="card-title-group">
          <h2><Tag size={22} /> {t.rateMatrix}</h2>
          <p>{lang === 'ta' ? 'டிராக்டர் + கருவி சேர்க்கைக்கான மணி நேரம்/ஏக்கர்/கி.மீ கட்டணம் மற்றும் நடைமுறை தேதி' : 'Combination rate cards with effective revision dates'}</p>
        </div>
        <button className="btn btn-primary" onClick={handleOpenAdd}>
          <Plus size={16} />
          {lang === 'ta' ? '+ புதிய கட்டணம் சேர்' : '+ Add Combo Rate'}
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="filter-bar">
        <div className="search-input-wrapper">
          <Search size={16} className="search-icon-inside" />
          <input
            type="text"
            placeholder={t.search + ' (e.g. Rotavator, 5-Tyne, Per Hour)'}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {/* Table */}
      <div className="content-card" style={{ padding: '0' }}>
        <div className="table-responsive">
          <table className="data-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Tractor (டிராக்டர்)</th>
                <th>Implement / Machine (கருவி)</th>
                <th>Unit (அலகு)</th>
                <th>Rate (கட்டணம்)</th>
                <th>Effective Date (நடைமுறை தேதி)</th>
                <th>Remarks</th>
                <th style={{ textAlign: 'right' }}>{t.actions}</th>
              </tr>
            </thead>
            <tbody>
              {filteredRates.map(item => (
                <tr key={item.id}>
                  <td style={{ fontWeight: 700, color: 'var(--primary-700)' }}>{item.id}</td>
                  <td style={{ fontWeight: 600 }}>{item.tractorName}</td>
                  <td>
                    <span className="badge badge-purple">{item.implementName}</span>
                  </td>
                  <td>
                    <span style={{ fontWeight: 600 }}>
                      {item.unit === 'per_hour' ? t.perHour :
                       item.unit === 'per_acre' ? t.perAcre :
                       item.unit === 'per_km' ? t.perKm : t.perTrip}
                    </span>
                  </td>
                  <td style={{ fontWeight: 800, fontSize: '1rem', color: '#16a34a' }}>
                    ₹{item.rate}
                  </td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.85rem' }}>
                      <Calendar size={13} color="var(--text-light)" />
                      {item.effectiveDate}
                    </div>
                  </td>
                  <td style={{ fontSize: '0.8rem', color: 'var(--text-light)' }}>
                    {item.description || '--'}
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <div style={{ display: 'inline-flex', gap: '0.35rem' }}>
                      <button 
                        className="btn btn-outline btn-sm"
                        onClick={() => handleOpenEdit(item)}
                        title="Edit Rate"
                      >
                        <Edit3 size={14} />
                      </button>
                      <button 
                        className="btn btn-outline btn-sm"
                        style={{ color: '#ef4444' }}
                        onClick={() => setDeleteModalState({ isOpen: true, item })}
                        title={role === 'admin' ? "Delete Rate" : "Admin Only"}
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {filteredRates.length === 0 && (
                <tr>
                  <td colSpan="8" style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-light)' }}>
                    No rate entries found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add / Edit Modal */}
      {isModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '580px' }}>
            <div className="modal-header">
              <h3>{editingItem ? `${t.edit} Rate: ${editingItem.id}` : '+ Add Combination Rate Card'}</h3>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="modal-body form-grid">
                
                {/* Select Tractor */}
                <div className="form-group">
                  <SearchableSelect
                    label={t.tractor}
                    value={formData.tractorId}
                    onChange={handleTractorChange}
                    options={tractors.map(tr => ({
                      value: tr.id,
                      label: tr.name,
                      subLabel: tr.regNumber || ''
                    }))}
                    placeholder="-- Select Tractor --"
                    required
                    lang={lang}
                  />
                </div>

                {/* Select Implement */}
                <div className="form-group">
                  <SearchableSelect
                    label={t.machine}
                    value={formData.implementId}
                    onChange={handleImplementChange}
                    options={[
                      { value: 'none', label: 'None (Standalone Tractor / Haulage)' },
                      ...implementsList.map(imp => ({
                        value: imp.id,
                        label: imp.name,
                        subLabel: imp.category || ''
                      }))
                    ]}
                    placeholder="-- Select Implement --"
                    required
                    lang={lang}
                  />
                </div>

                {/* Billing Unit */}
                <div className="form-group">
                  <SearchableSelect
                    label={t.unit}
                    value={formData.unit}
                    onChange={(val) => setFormData({ ...formData, unit: val })}
                    options={[
                      { value: 'per_hour', label: t.perHour },
                      { value: 'per_acre', label: t.perAcre },
                      { value: 'per_km', label: t.perKm },
                      { value: 'per_trip', label: t.perTrip }
                    ]}
                    lang={lang}
                  />
                </div>

                {/* Rate (₹) */}
                <div className="form-group">
                  <label>{t.rateAmount} (₹)</label>
                  <input
                    type="number"
                    className="form-control"
                    placeholder="e.g. 900 or 1300"
                    value={formData.rate}
                    onChange={(e) => setFormData({ ...formData, rate: e.target.value })}
                    required
                  />
                </div>

                {/* Effective Date */}
                <div className="form-group">
                  <DatePicker
                    label={`${t.effectiveDate} (நடைமுறை தேதி)`}
                    value={formData.effectiveDate}
                    onChange={(val) => setFormData({ ...formData, effectiveDate: val })}
                    required
                    lang={lang}
                  />
                </div>

                {/* Description */}
                <div className="form-group col-full">
                  <label>Pricing Description / Soil Condition Note</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="e.g. Fine dry soil tilling rate or wet paddy puddle"
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
        onConfirm={(pin) => onDeleteRate(deleteModalState.item.id, pin)}
        itemTitle={deleteModalState.item ? `${deleteModalState.item.tractorName} + ${deleteModalState.item.implementName}` : ''}
        role={role}
        lang={lang}
      />
    </div>
  );
}
