import React, { useState } from 'react';
import { Tag, Plus, Edit3, Trash2, Calendar, Search, X, AlertCircle } from 'lucide-react';
import { translations } from '../translations/dictionary';
import AdminDeleteModal from './AdminDeleteModal';
import DatePicker from './common/DatePicker';
import SearchableSelect from './common/SearchableSelect';
import VoiceInput from './common/VoiceInput';
import { validatePositiveNumber } from '../services/storage';
import { getBilingualText, isNameMatch, toSafeLower, toSafeStr } from '../utils/langUtils';

export default function RateMatrixManager({ 
  rateMatrix = [], 
  fleet = [], 
  onSaveRate, 
  onDeleteRate, 
  lang = 'ta', 
  role = 'admin' 
}) {
  const t = translations[lang] || translations.en;
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [deleteModalState, setDeleteModalState] = useState({ isOpen: false, item: null });
  const [formError, setFormError] = useState('');

  const tractors = (fleet || []).filter(f => f && f.type === 'tractor');
  const implementsList = (fleet || []).filter(f => f && f.type === 'implement');

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

  const generateUniqueRateId = () => {
    let maxNum = 0;
    rateMatrix.forEach(r => {
      if (r.id && typeof r.id === 'string') {
        const match = r.id.match(/^RATE-(\d+)/i);
        if (match) {
          const num = parseInt(match[1], 10);
          if (num > maxNum) maxNum = num;
        }
      }
    });
    let nextNum = maxNum + 1;
    while (rateMatrix.some(r => r.id === `RATE-${String(nextNum).padStart(2, '0')}`)) {
      nextNum++;
    }
    return `RATE-${String(nextNum).padStart(2, '0')}`;
  };

  const handleOpenAdd = () => {
    const defaultTractor = tractors[0] || { id: 'TRAC-01', name: 'General Tractor' };
    const defaultImplement = implementsList[0] || { id: 'IMP-01', name: 'Standard Implement' };
    
    setEditingItem(null);
    setFormError('');
    setFormData({
      id: generateUniqueRateId(),
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
    setFormError('');
    let tracId = item.tractorId;
    if (!tracId && item.tractorName) {
      const matchT = tractors.find(t => isNameMatch(t.name, item.tractorName));
      if (matchT) tracId = matchT.id;
    }
    let impId = item.implementId;
    if (!impId && item.implementName) {
      if (toSafeLower(item.implementName).includes('standalone') || toSafeStr(item.implementName) === 'none') {
        impId = 'none';
      } else {
        const matchM = implementsList.find(m => isNameMatch(m.name, item.implementName));
        if (matchM) impId = matchM.id;
      }
    }
    setFormData({
      id: item.id || '',
      tractorId: tracId || (tractors[0] ? tractors[0].id : ''),
      tractorName: item.tractorName || (tractors[0] ? tractors[0].name : ''),
      implementId: impId || 'none',
      implementName: item.implementName || 'Standalone Tractor',
      unit: item.unit || 'per_hour',
      rate: item.rate !== undefined && item.rate !== null ? String(item.rate) : '',
      effectiveDate: item.effectiveDate || new Date().toISOString().slice(0, 10),
      description: item.description || ''
    });
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
    setFormError('');

    if (!formData.tractorId) {
      setFormError(lang === 'ta' ? 'டிராக்டரை தேர்வு செய்யவும்!' : 'Please select a Tractor!');
      return;
    }

    const rateVal = validatePositiveNumber(formData.rate, lang === 'ta' ? 'வாடகை கட்டணம்' : 'Rate Amount', false);
    if (!rateVal.valid) {
      setFormError(rateVal.error);
      return;
    }

    // Check duplicate active combination on same effective date
    const impId = formData.implementId || 'none';
    const effDate = formData.effectiveDate || '';
    const duplicate = rateMatrix.find(r => {
      if (editingItem && r.id === editingItem.id) return false;
      return r.tractorId === formData.tractorId &&
             (r.implementId || 'none') === impId &&
             r.unit === formData.unit &&
             (r.effectiveDate || '') === effDate;
    });

    if (duplicate) {
      setFormError(
        lang === 'ta'
          ? `இந்த டிராக்டர் + கருவி சேர்க்கைக்கு ஏற்கனவே அதே தேதியில் (${effDate}) கட்டணம் உள்ளது!`
          : `A rate card entry already exists for this Tractor + Implement combination on date ${effDate}!`
      );
      return;
    }

    let finalId = formData.id;
    if (!editingItem && (!finalId || rateMatrix.some(r => r.id === finalId))) {
      finalId = generateUniqueRateId();
    }

    const res = onSaveRate({ ...formData, id: finalId, _isEditing: Boolean(editingItem) });
    if (res && res.success === false) {
      setFormError(res.error || 'Failed to save rate card.');
      return;
    }

    setIsModalOpen(false);
  };

  const filteredRates = rateMatrix.filter(r => {
    const sLower = toSafeLower(searchTerm);
    if (!sLower) return true;
    return toSafeLower(r.tractorName).includes(sLower) ||
           toSafeLower(r.implementName).includes(sLower) ||
           toSafeLower(r.description).includes(sLower);
  });

  return (
    <div>
      {/* Header bar */}
      <div className="card-header-bar">
        <div className="card-title-group">
          <h2 style={{ margin: 0 }}><Tag size={22} /> {t.rateMatrix}</h2>
        </div>
        <button className="btn btn-primary" onClick={handleOpenAdd}>
          <Plus size={16} />
          <span>{lang === 'ta' ? 'புதிய கட்டணம் சேர்' : 'Add Combo Rate'}</span>
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
                  <td style={{ fontWeight: 600 }}>
                    {(() => {
                      const matched = tractors.find(t => t.id === item.tractorId || isNameMatch(t.name, item.tractorName));
                      return getBilingualText(item.tractorName || matched?.name, matched?.name_ta, lang);
                    })()}
                  </td>
                  <td>
                    <span className="badge badge-purple">
                      {(() => {
                        if (item.implementId === 'none' || toSafeLower(item.implementName).includes('standalone')) {
                          return lang === 'ta' ? 'தனி டிராக்டர்' : 'Standalone Tractor';
                        }
                        const matched = implementsList.find(m => m.id === item.implementId || isNameMatch(m.name, item.implementName));
                        return getBilingualText(item.implementName || matched?.name, matched?.name_ta, lang);
                      })()}
                    </span>
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
        <div className="modal-overlay" onClick={() => setIsModalOpen(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '580px' }}>
            <div className="modal-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ margin: 0 }}>{editingItem ? `${t.edit} Rate: ${editingItem.id}` : (lang === 'ta' ? 'புதிய சேர்க்கை கட்டணம்' : 'Add Combination Rate Card')}</h3>
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
                
                {/* Select Tractor */}
                <div className="form-group">
                  <SearchableSelect
                    label={t.tractor}
                    value={formData.tractorId}
                    onChange={handleTractorChange}
                    options={tractors.map(tr => ({
                      value: tr.id,
                      label: getBilingualText(tr.name, tr.name_ta, lang),
                      subLabel: tr.regNumber || ''
                    }))}
                    placeholder={lang === 'ta' ? '-- டிராக்டரைத் தேர்வு செய்க --' : '-- Select Tractor --'}
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
                      { value: 'none', label: lang === 'ta' ? 'கருவி ஏதுமில்லை (தனி டிராக்டர்)' : 'None (Standalone Tractor / Haulage)' },
                      ...implementsList.map(imp => ({
                        value: imp.id,
                        label: getBilingualText(imp.name, imp.name_ta, lang),
                        subLabel: imp.category || ''
                      }))
                    ]}
                    placeholder={lang === 'ta' ? '-- கருவியைத் தேர்வு செய்க --' : '-- Select Implement --'}
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
                  <VoiceInput
                    label="Pricing Description / Soil Condition Note (விளக்கம் / குறிப்பு)"
                    placeholder="e.g. Fine dry soil tilling rate or wet paddy puddle"
                    value={formData.description}
                    onChange={(val) => setFormData(prev => ({ ...prev, description: val }))}
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
        onConfirm={(pin) => onDeleteRate(deleteModalState.item.id, pin)}
        itemTitle={deleteModalState.item ? `${deleteModalState.item.tractorName} + ${deleteModalState.item.implementName}` : ''}
        role={role}
        lang={lang}
      />
    </div>
  );
}
