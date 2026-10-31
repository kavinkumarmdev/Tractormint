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
  DollarSign, 
  X, 
  AlertCircle 
} from 'lucide-react';
import { translations, resolveBilingual } from '../translations/dictionary';
import AdminDeleteModal from './AdminDeleteModal';
import DatePicker from './common/DatePicker';
import SearchableSelect from './common/SearchableSelect';
import BilingualVoiceGroup from './common/BilingualVoiceGroup';
import VoiceInput from './common/VoiceInput';
import { normalizeRegNumber, validatePositiveNumber } from '../services/storage';
import { getBilingualText, toSafeLower } from '../utils/langUtils';

export default function FleetManager({ 
  fleet = [], 
  onSaveFleet, 
  onDeleteFleet, 
  lang = 'ta', 
  role = 'admin' 
}) {
  const t = translations[lang] || translations.en;
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState('all'); // all | tractor | implement
  const [acquisitionFilter, setAcquisitionFilter] = useState('all');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [deleteModalState, setDeleteModalState] = useState({ isOpen: false, item: null });
  const [formError, setFormError] = useState('');

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

  const generateUniqueFleetId = (type, currentFleet = fleet) => {
    const prefix = type === 'implement' ? 'IMP-' : 'TRAC-';
    let maxNum = 0;
    currentFleet.forEach(item => {
      if (item.id && typeof item.id === 'string') {
        const match = item.id.match(new RegExp(`^${prefix}(\\d+)`, 'i'));
        if (match) {
          const num = parseInt(match[1], 10);
          if (num > maxNum) maxNum = num;
        }
      }
    });
    let nextNum = maxNum + 1;
    while (currentFleet.some(item => item.id === `${prefix}${String(nextNum).padStart(2, '0')}`)) {
      nextNum++;
    }
    return `${prefix}${String(nextNum).padStart(2, '0')}`;
  };

  const handleOpenAdd = (defaultType = 'tractor') => {
    const newId = generateUniqueFleetId(defaultType);
    
    setEditingItem(null);
    setFormError('');
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
      hp: '',
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
    setFormError('');
    setFormData({
      id: item.id || '',
      name: item.name || '',
      name_ta: item.name_ta || item.name || '',
      type: item.type || 'tractor',
      implementCategory: item.implementCategory || (item.type === 'implement' ? 'rotavator' : 'none'),
      regNumber: item.regNumber || '',
      acquisition: item.acquisition || 'buy_cash',
      purchasePrice: item.purchasePrice !== undefined && item.purchasePrice !== null ? String(item.purchasePrice) : '',
      purchaseDate: item.purchaseDate || new Date().toISOString().slice(0, 10),
      modelYear: item.modelYear ? String(item.modelYear) : new Date().getFullYear().toString(),
      hp: item.hp !== undefined && item.hp !== null ? String(item.hp) : '',
      emiMonthly: item.emiMonthly !== undefined && item.emiMonthly !== null ? String(item.emiMonthly) : '',
      emiBank: item.emiBank || '',
      currentHours: item.currentHours !== undefined && item.currentHours !== null ? String(item.currentHours) : (item.type === 'tractor' ? '0' : ''),
      status: item.status || 'available',
      notes: item.notes || ''
    });
    setIsModalOpen(true);
  };

  const handleFormChange = (field, value) => {
    setFormData(prev => {
      const updated = { ...prev, [field]: value };
      
      // When switching type on a new item, auto-update ID to matching prefix
      if (field === 'type' && !editingItem) {
        updated.id = generateUniqueFleetId(value);
        if (value === 'implement') {
          updated.hp = '';
          if (updated.implementCategory === 'none') {
            updated.implementCategory = 'rotavator';
          }
        }
      }

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
    setFormError('');

    if (!formData.name.trim()) {
      setFormError(lang === 'ta' ? 'டிராக்டர் / கருவி பெயர் அவசியம்!' : 'Machine name is required!');
      return;
    }

    // Tractors require Registration Number
    const rawReg = (formData.regNumber || '').trim();
    if (formData.type === 'tractor' && !rawReg) {
      setFormError(lang === 'ta' ? 'டிராக்டர் பதிவு எண் (Reg No.) அவசியம்!' : 'Tractor Registration Number (e.g. TN 45 AB 1234) is required!');
      return;
    }

    // Strict Uniqueness Check for Registration Number across entire Fleet
    if (rawReg) {
      const cleanReg = normalizeRegNumber(rawReg);
      const duplicate = fleet.find(f => {
        if (editingItem && f.id === editingItem.id) return false;
        return f.regNumber && normalizeRegNumber(f.regNumber) === cleanReg;
      });

      if (duplicate) {
        setFormError(
          lang === 'ta'
            ? `வண்டி பதிவு எண் "${rawReg}" ஏற்கனவே "${duplicate.name}" (${duplicate.id}) வண்டியில் பதிவாகியுள்ளது!`
            : `Registration number "${rawReg}" is already registered to machine "${duplicate.name}" (${duplicate.id})!`
        );
        return;
      }
    }

    // Validate Non-negative Hour Meter
    if (formData.currentHours !== undefined && formData.currentHours !== '') {
      const hrVal = validatePositiveNumber(formData.currentHours, lang === 'ta' ? 'இயங்கிய மணி நேரம்' : 'Current Hour Meter', true);
      if (!hrVal.valid) {
        setFormError(hrVal.error);
        return;
      }
    }

    // Validate Purchase Cost
    if (formData.purchasePrice !== undefined && formData.purchasePrice !== '') {
      const pVal = validatePositiveNumber(formData.purchasePrice, lang === 'ta' ? 'வாங்கிய விலை' : 'Purchase Price', true);
      if (!pVal.valid) {
        setFormError(pVal.error);
        return;
      }
    }

    let finalId = formData.id;
    if (!editingItem) {
      if (!finalId || fleet.some(f => f.id === finalId)) {
        finalId = generateUniqueFleetId(formData.type);
      }
    }

    const res = onSaveFleet({ 
      ...formData, 
      id: finalId, 
      regNumber: rawReg.toUpperCase(),
      _isEditing: Boolean(editingItem) 
    });

    if (res && res.success === false) {
      setFormError(res.error || 'Failed to save fleet item.');
      return;
    }

    setIsModalOpen(false);
  };

  // Filtered Items
  const filteredFleet = fleet.filter(item => {
    const sLower = toSafeLower(searchTerm);
    const matchesSearch = !sLower || (
      toSafeLower(item.name).includes(sLower) ||
      toSafeLower(item.name_ta).includes(sLower) ||
      toSafeLower(item.regNumber).includes(sLower)
    );
    const matchesType = typeFilter === 'all' || item.type === typeFilter;
    const matchesAcquisition = acquisitionFilter === 'all' || item.acquisition === acquisitionFilter;
    return matchesSearch && matchesType && matchesAcquisition;
  });

  return (
    <div>
      {/* Header bar */}
      <div className="card-header-bar" style={{ marginBottom: '1.25rem' }}>
        <div className="card-title-group">
          <h2 style={{ margin: 0 }}><Tractor size={22} /> {t.fleet}</h2>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button className="btn btn-primary" onClick={() => handleOpenAdd('tractor')}>
            <Plus size={16} />
            <span>{lang === 'ta' ? 'புதிய டிராக்டர்' : 'Add Tractor'}</span>
          </button>
          <button className="btn btn-outline" onClick={() => handleOpenAdd('implement')}>
            <Wrench size={16} />
            <span>{lang === 'ta' ? 'புதிய கருவி (5 கொழு/ரோட்டாவேட்டர்)' : 'Add Implement'}</span>
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
          <option value="all">{lang === 'ta' ? 'அனைத்து வண்டி வகைகள்' : 'All Fleet Types'}</option>
          <option value="tractor">{t.tractor}</option>
          <option value="implement">{t.machine}</option>
        </select>

        <select 
          className="filter-select"
          value={acquisitionFilter}
          onChange={(e) => setAcquisitionFilter(e.target.value)}
        >
          <option value="all">{lang === 'ta' ? 'அனைத்து உரிமை முறைகள்' : 'All Acquisition Methods'}</option>
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
                <th>{lang === 'ta' ? 'அடையாளம் / பதிவு எண்' : 'ID / Reg No'}</th>
                <th>{lang === 'ta' ? 'பெயர் / விவரம்' : 'Name / Details'}</th>
                <th>{lang === 'ta' ? 'வகை' : 'Type'}</th>
                <th>{lang === 'ta' ? 'உரிமை முறை' : 'Acquisition'}</th>
                <th>{lang === 'ta' ? 'குதிரைத்திறன் / மாடல்' : 'HP / Model'}</th>
                <th>{lang === 'ta' ? 'மணி மீட்டர்' : 'Hour Meter'}</th>
                <th>{lang === 'ta' ? 'நிலை' : 'Status'}</th>
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
                    <div style={{ fontWeight: 600 }}>{getBilingualText(item.name, item.name_ta, lang)}</div>
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
                    <div style={{ fontSize: '0.85rem' }}>
                      {item.type === 'tractor'
                        ? (item.hp ? `${item.hp} HP` : '--')
                        : (item.hp && item.hp !== '45' ? `${item.hp} HP` : '--')}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-light)' }}>{item.modelYear || ''}</div>
                  </td>
                  <td style={{ fontWeight: 600 }}>
                    {item.currentHours ? `${item.currentHours} ${lang === 'ta' ? 'மணி' : 'hrs'}` : '--'}
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
                    {lang === 'ta' ? 'டிராக்டர்கள் அல்லது கருவிகள் எதுவும் காணப்படவில்லை.' : 'No machines or tractors found.'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add / Edit Fleet Modal */}
      {isModalOpen && (
        <div className="modal-overlay" onClick={() => setIsModalOpen(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ margin: 0 }}>
                {editingItem 
                  ? `${t.edit}: ${editingItem.name}` 
                  : (formData.type === 'implement' 
                      ? (lang === 'ta' ? 'புதிய இணைப்பு கருவி சேர்க்கை' : 'Add Implement / Machine') 
                      : (lang === 'ta' ? 'புதிய டிராக்டர் சேர்க்கை' : 'Add Tractor'))}
              </h3>
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

                {/* When Implement: Only Show Implement Preset Selector & Name & Status */}
                {formData.type === 'implement' ? (
                  <>
                    {/* Implement Name Preset Quick Dropdown */}
                    <div className="form-group">
                      <SearchableSelect
                        label={lang === 'ta' ? 'இணைப்பு கருவி தேர்வு (Quick Dropdown)' : 'Select Implement Preset'}
                        value={formData.implementCategory}
                        onChange={(val) => {
                          const presets = {
                            rotavator: { en: 'Rotavator', ta: 'ரோட்டாவேட்டர்' },
                            cultivator_5tyne: { en: '5-Tyne Cultivator', ta: '5 கொழு கலப்பை' },
                            cultivator_9tyne: { en: '9-Tyne Cultivator', ta: '9 கொழு கலப்பை' },
                            disc_plough: { en: 'Disc Plough', ta: 'தட்டு கலப்பை' },
                            mb_plough: { en: 'MB Plough', ta: 'எம்.பி கலப்பை' },
                            leveler: { en: 'Land Leveler', ta: 'சமன் பலகை' },
                            trailer: { en: 'Trailer / Tipper', ta: 'டிரெய்லர் (டிப்பர்)' },
                            baler: { en: 'Straw Baler', ta: 'வைக்கோல் கட்டும் கருவி' },
                            harvester: { en: 'Combine Harvester', ta: 'நெல் அறுவடை இயந்திரம்' },
                            bund_maker: { en: 'Bund Maker', ta: 'வரப்பு கட்டும் கருவி' },
                            dozer: { en: 'Front Dozer', ta: 'முன் டோசர்' },
                            digger: { en: 'Post Hole Digger', ta: 'குழி தோண்டும் கருவி' },
                            seed_drill: { en: 'Seed Drill', ta: 'விதை விதைக்கும் கருவி' },
                            other: { en: '', ta: '' }
                          };
                          const selected = presets[val];
                          handleFormChange('implementCategory', val);
                          if (selected && selected.en) {
                            handleFormChange('name', selected.en);
                            handleFormChange('name_ta', selected.ta);
                          }
                        }}
                        options={[
                          { value: 'rotavator', label: 'Rotavator (ரோட்டாவேட்டர்)' },
                          { value: 'cultivator_5tyne', label: '5-Tyne Cultivator (5 கொழு கலப்பை)' },
                          { value: 'cultivator_9tyne', label: '9-Tyne Cultivator (9 கொழு கலப்பை)' },
                          { value: 'disc_plough', label: 'Disc Plough (தட்டு கலப்பை)' },
                          { value: 'mb_plough', label: 'MB Plough (எம்.பி கலப்பை)' },
                          { value: 'leveler', label: 'Land Leveler (சமன் பலகை)' },
                          { value: 'trailer', label: 'Trailer / Tipper (டிரெய்லர்)' },
                          { value: 'baler', label: 'Straw Baler (வைக்கோல் கட்டும் கருவி)' },
                          { value: 'harvester', label: 'Combine Harvester (அறுவடை இயந்திரம்)' },
                          { value: 'bund_maker', label: 'Bund Maker (வரப்பு கட்டி)' },
                          { value: 'dozer', label: 'Front Dozer (மண் தள்ளும் டோசர்)' },
                          { value: 'digger', label: 'Post Hole Digger (குழி தோண்டி)' },
                          { value: 'seed_drill', label: 'Seed Drill (விதைப்பான்)' },
                          { value: 'other', label: 'Other / Custom Implement Name' }
                        ]}
                        lang={lang}
                      />
                    </div>

                    {/* Implement Name with Voice */}
                    <BilingualVoiceGroup
                      englishLabel="Implement Name"
                      tamilLabel="கருவி பெயர்"
                      englishValue={formData.name}
                      tamilValue={formData.name_ta}
                      onEnglishChange={(val) => handleFormChange('name', val)}
                      onTamilChange={(val) => handleFormChange('name_ta', val)}
                      englishPlaceholder="e.g. Rotavator / 5-Tyne Cultivator"
                      tamilPlaceholder="எ.கா. ரோட்டாவேட்டர் / 5 கொழு கலப்பை"
                      lang={lang}
                      required
                    />
                  </>
                ) : (
                  /* When Tractor: Show Full Tractor Specifications */
                  <>
                    {/* Tractor Name with Voice */}
                    <BilingualVoiceGroup
                      englishLabel="Tractor Name & Model"
                      tamilLabel="டிராக்டர் பெயர் & மாடல்"
                      englishValue={formData.name}
                      tamilValue={formData.name_ta}
                      onEnglishChange={(val) => handleFormChange('name', val)}
                      onTamilChange={(val) => handleFormChange('name_ta', val)}
                      englishPlaceholder="e.g. Mahindra 575 DI / Swaraj 744 FE"
                      tamilPlaceholder="எ.கா. மகிந்திரா 575 DI / ஸ்வராஜ் 744 FE"
                      lang={lang}
                      required
                    />

                    {/* Reg / ID Number */}
                    <div className="form-group">
                      <VoiceInput
                        label={t.regNumber}
                        placeholder="e.g. TN 45 AB 1234"
                        value={formData.regNumber}
                        onChange={(val) => handleFormChange('regNumber', val)}
                        speechLang="en-IN"
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
                  </>
                )}

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
