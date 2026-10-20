import React, { useState } from 'react';
import { UserCheck, Plus, Edit3, Trash2, Phone, Search, X, AlertCircle } from 'lucide-react';
import { translations } from '../translations/dictionary';
import AdminDeleteModal from './AdminDeleteModal';
import DatePicker from './common/DatePicker';
import SearchableSelect from './common/SearchableSelect';
import BilingualVoiceGroup from './common/BilingualVoiceGroup';
import VoiceInput from './common/VoiceInput';
import { normalizePhone, validatePhone10, validatePositiveNumber } from '../services/storage';

export default function DriverList({ 
  drivers, 
  tripSheets, 
  onSaveDriver, 
  onDeleteDriver, 
  lang, 
  role 
}) {
  const t = translations[lang];
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [deleteModalState, setDeleteModalState] = useState({ isOpen: false, item: null });
  const [formError, setFormError] = useState('');

  const [formData, setFormData] = useState({
    id: '',
    name: '',
    name_ta: '',
    phone: '',
    licenseNo: '',
    wageType: 'daily_bata',
    defaultWage: '',
    status: 'active',
    joinedDate: new Date().toISOString().slice(0, 10)
  });

  const generateUniqueDriverId = () => {
    let maxNum = 0;
    drivers.forEach(d => {
      if (d.id && typeof d.id === 'string') {
        const match = d.id.match(/^DRV-(\d+)/i);
        if (match) {
          const num = parseInt(match[1], 10);
          if (num > maxNum) maxNum = num;
        }
      }
    });
    let nextNum = maxNum + 1;
    while (drivers.some(d => d.id === `DRV-${String(nextNum).padStart(2, '0')}`)) {
      nextNum++;
    }
    return `DRV-${String(nextNum).padStart(2, '0')}`;
  };

  const handleOpenAdd = () => {
    setEditingItem(null);
    setFormError('');
    setFormData({
      id: generateUniqueDriverId(),
      name: '',
      name_ta: '',
      phone: '',
      licenseNo: '',
      wageType: 'daily_bata',
      defaultWage: '600',
      status: 'active',
      joinedDate: new Date().toISOString().slice(0, 10)
    });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (item) => {
    setEditingItem(item);
    setFormError('');
    setFormData({ ...item });
    setIsModalOpen(true);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setFormError('');

    if (!formData.name.trim()) {
      setFormError(lang === 'ta' ? 'ஓட்டுநர் பெயர் அவசியம்!' : 'Driver name is required!');
      return;
    }

    // 10-digit Indian Mobile Validation
    const phoneVal = validatePhone10(formData.phone, lang === 'ta' ? 'ஓட்டுநர்' : 'Driver');
    if (!phoneVal.valid) {
      setFormError(
        lang === 'ta'
          ? 'மொபைல் எண் சரியாக 10 இலக்கங்களாக இருக்க வேண்டும் (எ.கா. 9842156780) மற்றும் 6, 7, 8, அல்லது 9-ல் தொடங்க வேண்டும்.'
          : phoneVal.error
      );
      return;
    }

    const cleanPhone = phoneVal.phone;

    // Strict Uniqueness Check across all registered Drivers
    const duplicate = drivers.find(d => {
      if (editingItem && d.id === editingItem.id) return false;
      return normalizePhone(d.phone) === cleanPhone;
    });

    if (duplicate) {
      const dupName = (lang === 'ta' && duplicate.name_ta) ? duplicate.name_ta : (duplicate.name || duplicate.id);
      setFormError(
        lang === 'ta'
          ? `அலைபேசி எண் "${cleanPhone}" ஏற்கனவே ஓட்டுநர் "${dupName}" (${duplicate.id}) பெயரில் பதிவாகியுள்ளது!`
          : `Mobile number "${cleanPhone}" is already registered for driver "${dupName}" (${duplicate.id})!`
      );
      return;
    }

    // Validate Wage Rate
    if (formData.defaultWage !== undefined && formData.defaultWage !== '') {
      const wageVal = validatePositiveNumber(formData.defaultWage, lang === 'ta' ? 'சம்பளம் / கூலி' : 'Default Wage', true);
      if (!wageVal.valid) {
        setFormError(wageVal.error);
        return;
      }
    }

    let finalId = formData.id;
    if (!editingItem && (!finalId || drivers.some(d => d.id === finalId))) {
      finalId = generateUniqueDriverId();
    }

    const res = onSaveDriver({ 
      ...formData, 
      phone: cleanPhone, 
      id: finalId, 
      _isEditing: Boolean(editingItem) 
    });

    if (res && res.success === false) {
      setFormError(res.error || 'Failed to save driver.');
      return;
    }

    setIsModalOpen(false);
  };

  const filteredDrivers = drivers.filter(d => {
    return (d.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
           (d.name_ta || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
           (d.phone || '').includes(searchTerm);
  });

  // Calculate Driver Metrics from Trip Sheets
  const getDriverStats = (driverId) => {
    const driverTrips = tripSheets.filter(t => t.driverId === driverId);
    const tripsCount = driverTrips.length;
    const hours = driverTrips.reduce((acc, curr) => acc + (Number(curr.quantity) || 0), 0);
    const totalBata = driverTrips.reduce((acc, curr) => acc + (Number(curr.driverBata) || 0), 0);
    return { tripsCount, hours, totalBata };
  };

  return (
    <div>
      {/* Header bar */}
      <div className="card-header-bar">
        <div className="card-title-group">
          <h2><UserCheck size={22} /> {t.drivers}</h2>
          <p>{lang === 'ta' ? 'டிராக்டர் டிரைவர்கள் மற்றும் தொழிலாளர்கள் விவரம், தினசரி படி (பாட்டா) மற்றும் சம்பள விவரங்கள்' : 'Manage Drivers, Bata rates, Salary logs and work statistics'}</p>
        </div>
        <button className="btn btn-primary" onClick={handleOpenAdd}>
          <Plus size={16} />
          <span>{lang === 'ta' ? 'புதிய டிரைவர் சேர்' : 'Add Driver / Labor'}</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="filter-bar">
        <div className="search-input-wrapper">
          <Search size={16} className="search-icon-inside" />
          <input
            type="text"
            placeholder={t.search + ' (Name, Phone...)'}
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
                <th>Driver Name / பெயர்</th>
                <th>Phone Number</th>
                <th>Pay / Wage Type</th>
                <th>Default Pay (₹)</th>
                <th>Trips Logged</th>
                <th>Hours Worked</th>
                <th>Total Bata Earned</th>
                <th>Status</th>
                <th style={{ textAlign: 'right' }}>{t.actions}</th>
              </tr>
            </thead>
            <tbody>
              {filteredDrivers.map(item => {
                const stats = getDriverStats(item.id);
                return (
                  <tr key={item.id}>
                    <td style={{ fontWeight: 700, color: 'var(--primary-700)' }}>{item.id}</td>
                    <td>
                      <div style={{ fontWeight: 600 }}>{lang === 'ta' ? (item.name_ta || item.name) : item.name}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-light)' }}>Lic: {item.licenseNo || '--'}</div>
                    </td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.85rem' }}>
                        <Phone size={13} color="var(--primary-600)" />
                        {item.phone || '--'}
                      </div>
                    </td>
                    <td>
                      <span className="badge badge-info">
                        {item.wageType === 'daily_bata' ? t.dailyBata :
                         item.wageType === 'per_hour' ? t.perHourWage :
                         item.wageType === 'monthly_salary' ? t.monthlySalary : t.perAcreWage}
                      </span>
                    </td>
                    <td style={{ fontWeight: 700 }}>₹{item.defaultWage}</td>
                    <td style={{ fontWeight: 600 }}>{stats.tripsCount}</td>
                    <td>{stats.hours.toFixed(1)} hrs</td>
                    <td style={{ fontWeight: 700, color: '#16a34a' }}>₹{stats.totalBata.toLocaleString()}</td>
                    <td>
                      <span className={`badge ${item.status === 'active' ? 'badge-paid' : 'badge-unpaid'}`}>
                        {item.status === 'active' ? t.active : t.inactive}
                      </span>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <div style={{ display: 'inline-flex', gap: '0.35rem' }}>
                        <button 
                          className="btn btn-outline btn-sm"
                          onClick={() => handleOpenEdit(item)}
                          title="Edit Driver"
                        >
                          <Edit3 size={14} />
                        </button>
                        <button 
                          className="btn btn-outline btn-sm"
                          style={{ color: '#ef4444' }}
                          onClick={() => setDeleteModalState({ isOpen: true, item })}
                          title={role === 'admin' ? "Delete Driver" : "Admin Only"}
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {filteredDrivers.length === 0 && (
                <tr>
                  <td colSpan="10" style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-light)' }}>
                    No drivers found.
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
              <h3 style={{ margin: 0 }}>{editingItem ? `${t.edit}: ${editingItem.name}` : (lang === 'ta' ? 'புதிய டிரைவர் சேர்' : 'Add Driver / Labor')}</h3>
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
                
                {/* Driver Name English & Tamil with Mic & Auto-Fill */}
                <BilingualVoiceGroup
                  englishLabel="Driver Name (English)"
                  tamilLabel="ஓட்டுநர் பெயர் (தமிழ்)"
                  englishValue={formData.name}
                  tamilValue={formData.name_ta}
                  onEnglishChange={(val) => setFormData(prev => ({ ...prev, name: val }))}
                  onTamilChange={(val) => setFormData(prev => ({ ...prev, name_ta: val }))}
                  englishPlaceholder="e.g. K. Murugan"
                  tamilPlaceholder="எ.கா. கே. முருகன்"
                  required
                />

                {/* Phone - Strictly 10 digits & Unique */}
                <div className="form-group">
                  <VoiceInput
                    label={lang === 'ta' ? 'அலைபேசி எண் (10 இலக்கங்கள்) *' : 'Mobile Number (10 digits) *'}
                    type="tel"
                    placeholder="9842156780"
                    value={formData.phone}
                    onChange={(val) => {
                      const digits = val.replace(/\D/g, '').slice(0, 10);
                      setFormData(prev => ({ ...prev, phone: digits }));
                      if (formError) setFormError('');
                    }}
                    speechLang="en-IN"
                    required
                  />
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-light)', marginTop: '0.25rem', display: 'block' }}>
                    {lang === 'ta' ? '10 இலக்க தனித்துவமான அலைபேசி எண் (எ.கா: 9842156780)' : '10-digit unique mobile number (e.g. 9842156780)'}
                  </span>
                </div>

                {/* License No */}
                <div className="form-group">
                  <VoiceInput
                    label={t.licenseNo}
                    placeholder="e.g. TN45 2018000456"
                    value={formData.licenseNo}
                    onChange={(val) => setFormData(prev => ({ ...prev, licenseNo: val }))}
                    speechLang="en-IN"
                  />
                </div>

                {/* Wage Type */}
                <div className="form-group">
                  <SearchableSelect
                    label={t.wageType}
                    value={formData.wageType}
                    onChange={(val) => setFormData({ ...formData, wageType: val })}
                    options={[
                      { value: 'daily_bata', label: t.dailyBata },
                      { value: 'per_hour', label: t.perHourWage },
                      { value: 'monthly_salary', label: t.monthlySalary },
                      { value: 'per_acre', label: t.perAcreWage }
                    ]}
                    lang={lang}
                  />
                </div>

                {/* Default Wage Rate */}
                <div className="form-group">
                  <label>{t.defaultWage}</label>
                  <input
                    type="number"
                    className="form-control"
                    placeholder="e.g. 600 or 150"
                    value={formData.defaultWage}
                    onChange={(e) => setFormData({ ...formData, defaultWage: e.target.value })}
                    required
                  />
                </div>

                {/* Status */}
                <div className="form-group">
                  <SearchableSelect
                    label="Status"
                    value={formData.status}
                    onChange={(val) => setFormData({ ...formData, status: val })}
                    options={[
                      { value: 'active', label: t.active },
                      { value: 'inactive', label: t.inactive }
                    ]}
                    lang={lang}
                  />
                </div>

                {/* Joined Date */}
                <div className="form-group">
                  <DatePicker
                    label="Joined Date"
                    value={formData.joinedDate}
                    onChange={(val) => setFormData({ ...formData, joinedDate: val })}
                    lang={lang}
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
        onConfirm={(pin) => onDeleteDriver(deleteModalState.item.id, pin)}
        itemTitle={deleteModalState.item ? deleteModalState.item.name : ''}
        role={role}
        lang={lang}
      />
    </div>
  );
}
