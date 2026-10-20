import React, { useState } from 'react';
import { Users2, Plus, Edit3, Trash2, Phone, MapPin, Search, MessageSquareShare, X, AlertCircle } from 'lucide-react';
import { translations, resolveBilingual } from '../translations/dictionary';
import AdminDeleteModal from './AdminDeleteModal';
import BilingualVoiceGroup from './common/BilingualVoiceGroup';
import VoiceInput from './common/VoiceInput';
import { normalizePhone, validatePhone10 } from '../services/storage';

export default function CustomerManager({ 
  customers, 
  tripSheets, 
  onSaveCustomer, 
  onDeleteCustomer, 
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
    village: '',
    village_ta: '',
    address: ''
  });

  const generateUniqueCustomerId = () => {
    let maxNum = 0;
    customers.forEach(c => {
      if (c.id && typeof c.id === 'string') {
        const match = c.id.match(/^CUST-(\d+)/i);
        if (match) {
          const num = parseInt(match[1], 10);
          if (num > maxNum) maxNum = num;
        }
      }
    });
    let nextNum = maxNum + 1;
    while (customers.some(c => c.id === `CUST-${String(nextNum).padStart(2, '0')}`)) {
      nextNum++;
    }
    return `CUST-${String(nextNum).padStart(2, '0')}`;
  };

  const handleOpenAdd = () => {
    setEditingItem(null);
    setFormError('');
    setFormData({
      id: generateUniqueCustomerId(),
      name: '',
      name_ta: '',
      phone: '',
      village: '',
      village_ta: '',
      address: ''
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

    // 10-digit Indian Mobile Validation
    const phoneVal = validatePhone10(formData.phone, lang === 'ta' ? 'விவசாயி' : 'Farmer');
    if (!phoneVal.valid) {
      setFormError(
        lang === 'ta'
          ? 'மொபைல் எண் சரியாக 10 இலக்கங்களாக இருக்க வேண்டும் (எ.கா. 9843312345) மற்றும் 6, 7, 8, அல்லது 9-ல் தொடங்க வேண்டும்.'
          : phoneVal.error
      );
      return;
    }

    const cleanPhone = phoneVal.phone;

    // Strict Uniqueness Check across all registered Farmers
    const duplicate = customers.find(c => {
      if (editingItem && c.id === editingItem.id) return false;
      return normalizePhone(c.phone) === cleanPhone;
    });

    if (duplicate) {
      const dupName = (lang === 'ta' && duplicate.name_ta) ? duplicate.name_ta : (duplicate.name || duplicate.id);
      setFormError(
        lang === 'ta'
          ? `அலைபேசி எண் "${cleanPhone}" ஏற்கனவே விவசாயி "${dupName}" (${duplicate.id}) பெயரில் பதிவாகியுள்ளது!`
          : `Mobile number "${cleanPhone}" is already registered for farmer "${dupName}" (${duplicate.id})!`
      );
      return;
    }

    let finalId = formData.id;
    if (!editingItem && (!finalId || customers.some(c => c.id === finalId))) {
      finalId = generateUniqueCustomerId();
    }

    const res = onSaveCustomer({
      ...formData,
      phone: cleanPhone,
      id: finalId,
      _isEditing: Boolean(editingItem)
    });

    if (res && res.success === false) {
      setFormError(res.error || 'Failed to save customer.');
      return;
    }

    setIsModalOpen(false);
  };

  // Calculate Customer Ledger Financials
  const getCustomerLedger = (customerId) => {
    const custTrips = tripSheets.filter(t => t.customerId === customerId);
    const totalBilled = custTrips.reduce((acc, curr) => acc + (Number(curr.totalAmount) || 0), 0);
    const totalPaid = custTrips.reduce((acc, curr) => acc + (Number(curr.paidAmount) || 0), 0);
    const balance = totalBilled - totalPaid;
    const tripsCount = custTrips.length;
    return { totalBilled, totalPaid, balance, tripsCount };
  };

  const handleSendWhatsAppReminder = (customer, balance) => {
    const text = `வணக்கம் ${customer.name_ta || customer.name} அய்யா,
தங்களின் டிராக்டர் உழவு வேலைக்கான கணக்கு நிலவரம்:
நிலுவைத் தொகை: ₹${balance.toLocaleString()}
நேரம் கிடைக்கும்போது செலுத்தவும். நன்றி! 🙏`;
    window.open(`https://api.whatsapp.com/send?phone=${customer.phone.replace(/[^0-9]/g, '')}&text=${encodeURIComponent(text)}`, '_blank');
  };

  const filteredCustomers = customers.filter(c => {
    return (c.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
           (c.name_ta || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
           (c.village || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
           (c.village_ta || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
           (c.phone || '').includes(searchTerm);
  });

  return (
    <div>
      {/* Header bar */}
      <div className="card-header-bar">
        <div className="card-title-group">
          <h2><Users2 size={22} /> {t.customers}</h2>
          <p>{lang === 'ta' ? 'விவசாயிகள் மற்றும் வாடிக்கையாளர்கள் கணக்கு புத்தகம் மற்றும் நிலுவைத் தொகை' : 'Customer records, village locations and outstanding ledger balances'}</p>
        </div>
        <button className="btn btn-primary" onClick={handleOpenAdd}>
          <Plus size={16} />
          <span>{lang === 'ta' ? 'புதிய விவசாயி சேர்' : 'Add Customer'}</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="filter-bar">
        <div className="search-input-wrapper">
          <Search size={16} className="search-icon-inside" />
          <input
            type="text"
            placeholder={t.search + ' (Name, Village, Phone...)'}
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
                <th>Farmer Name / பெயர்</th>
                <th>Village / ஊர்</th>
                <th>Phone Number</th>
                <th>Total Work Done</th>
                <th>Total Paid</th>
                <th>Outstanding Balance (நிலுவை)</th>
                <th style={{ textAlign: 'right' }}>{t.actions}</th>
              </tr>
            </thead>
            <tbody>
              {filteredCustomers.map(item => {
                const ledger = getCustomerLedger(item.id);
                return (
                  <tr key={item.id}>
                    <td style={{ fontWeight: 700, color: 'var(--primary-700)' }}>{item.id}</td>
                    <td>
                      <div style={{ fontWeight: 600 }}>{lang === 'ta' ? (item.name_ta || item.name) : item.name}</div>
                      {item.address && <div style={{ fontSize: '0.75rem', color: 'var(--text-light)' }}>{item.address}</div>}
                    </td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                        <MapPin size={13} color="var(--amber-600)" />
                        <span>{lang === 'ta' ? (item.village_ta || item.village) : item.village}</span>
                      </div>
                    </td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.85rem' }}>
                        <Phone size={13} color="var(--primary-600)" />
                        {item.phone || '--'}
                      </div>
                    </td>
                    <td style={{ fontWeight: 600 }}>₹{ledger.totalBilled.toLocaleString()} ({ledger.tripsCount} trips)</td>
                    <td style={{ fontWeight: 700, color: '#16a34a' }}>₹{ledger.totalPaid.toLocaleString()}</td>
                    <td>
                      <span style={{ 
                        fontWeight: 800, 
                        fontSize: '0.95rem',
                        color: ledger.balance > 0 ? '#dc2626' : '#16a34a' 
                      }}>
                        ₹{ledger.balance.toLocaleString()}
                      </span>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <div style={{ display: 'inline-flex', gap: '0.35rem' }}>
                        {ledger.balance > 0 && (
                          <button
                            className="btn btn-whatsapp btn-sm"
                            onClick={() => handleSendWhatsAppReminder(item, ledger.balance)}
                            title="Send WhatsApp Balance Reminder"
                          >
                            <MessageSquareShare size={14} />
                          </button>
                        )}
                        <button 
                          className="btn btn-outline btn-sm"
                          onClick={() => handleOpenEdit(item)}
                          title="Edit Customer"
                        >
                          <Edit3 size={14} />
                        </button>
                        <button 
                          className="btn btn-outline btn-sm"
                          style={{ color: '#ef4444' }}
                          onClick={() => setDeleteModalState({ isOpen: true, item })}
                          title={role === 'admin' ? "Delete Customer" : "Admin Only"}
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {filteredCustomers.length === 0 && (
                <tr>
                  <td colSpan="8" style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-light)' }}>
                    No customers found.
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
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '560px' }}>
            <div className="modal-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ margin: 0 }}>{editingItem ? `${t.edit}: ${editingItem.name}` : (lang === 'ta' ? 'புதிய விவசாயி சேர்' : 'Add Customer / Farmer')}</h3>
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
                
                {/* Name English & Tamil with Mic & Auto-Fill */}
                <BilingualVoiceGroup
                  englishLabel="Customer Name (English)"
                  tamilLabel="விவசாயி பெயர் (தமிழ்)"
                  englishValue={formData.name}
                  tamilValue={formData.name_ta}
                  onEnglishChange={(val) => setFormData(prev => ({ ...prev, name: val }))}
                  onTamilChange={(val) => setFormData(prev => ({ ...prev, name_ta: val }))}
                  englishPlaceholder="e.g. A. Arumugam Gounder"
                  tamilPlaceholder="எ.கா. ஏ. ஆறுமுகம் கவுண்டர்"
                  required
                />

                {/* Village English & Tamil with Mic & Auto-Fill */}
                <BilingualVoiceGroup
                  englishLabel="Village / Town (English)"
                  tamilLabel="கிராமம் / ஊர் (தமிழ்)"
                  englishValue={formData.village}
                  tamilValue={formData.village_ta}
                  onEnglishChange={(val) => setFormData(prev => ({ ...prev, village: val }))}
                  onTamilChange={(val) => setFormData(prev => ({ ...prev, village_ta: val }))}
                  englishPlaceholder="e.g. Perur / Alandurai"
                  tamilPlaceholder="எ.கா. பேரூர் / ஆலாந்துறை"
                  required
                />

                {/* Phone - Strictly 10 digits & Unique */}
                <div className="form-group">
                  <VoiceInput
                    label={lang === 'ta' ? 'அலைபேசி எண் (10 இலக்கங்கள்) *' : 'Mobile Number (10 digits) *'}
                    type="tel"
                    placeholder="9843312345"
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
                    {lang === 'ta' ? '10 இலக்க தனித்துவமான அலைபேசி எண் (எ.கா: 9843312345)' : '10-digit unique Indian mobile number (e.g. 9843312345)'}
                  </span>
                </div>

                {/* Farm Land Address / Notes */}
                <div className="form-group col-full">
                  <VoiceInput
                    label="Farm Location / Land Details (நில விபரம்)"
                    placeholder="e.g. Canal Road, North Thottam, 4.5 Acres Sugarcane"
                    value={formData.address}
                    onChange={(val) => setFormData(prev => ({ ...prev, address: val }))}
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
        onConfirm={(pin) => onDeleteCustomer(deleteModalState.item.id, pin)}
        itemTitle={deleteModalState.item ? deleteModalState.item.name : ''}
        role={role}
        lang={lang}
      />
    </div>
  );
}
