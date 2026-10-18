import React, { useState } from 'react';
import { Users2, Plus, Edit3, Trash2, Phone, MapPin, Search, MessageSquareShare } from 'lucide-react';
import { translations, resolveBilingual } from '../translations/dictionary';
import AdminDeleteModal from './AdminDeleteModal';

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

  const [formData, setFormData] = useState({
    id: '',
    name: '',
    name_ta: '',
    phone: '',
    village: '',
    village_ta: '',
    address: ''
  });

  const handleOpenAdd = () => {
    setEditingItem(null);
    setFormData({
      id: `CUST-${String(customers.length + 1).padStart(2, '0')}`,
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
    setFormData({ ...item });
    setIsModalOpen(true);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSaveCustomer(formData);
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
          {lang === 'ta' ? '+ புதிய விவசாயி சேர்' : '+ Add Customer'}
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
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '560px' }}>
            <div className="modal-header">
              <h3>{editingItem ? `${t.edit}: ${editingItem.name}` : '+ Add Customer / Farmer'}</h3>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="modal-body form-grid">
                
                {/* Name English */}
                <div className="form-group">
                  <label>Customer Name (English)</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="e.g. A. Arumugam Gounder"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                  />
                </div>

                {/* Name Tamil */}
                <div className="form-group">
                  <label>பெயர் (தமிழ்)</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="எ.கா. ஏ. ஆறுமுகம் கவுண்டர்"
                    value={formData.name_ta}
                    onChange={(e) => setFormData({ ...formData, name_ta: e.target.value })}
                  />
                </div>

                {/* Village English */}
                <div className="form-group">
                  <label>Village / Town (English)</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="e.g. Perur / Alandurai"
                    value={formData.village}
                    onChange={(e) => setFormData({ ...formData, village: e.target.value })}
                    required
                  />
                </div>

                {/* Village Tamil */}
                <div className="form-group">
                  <label>கிராமம் / ஊர் (தமிழ்)</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="எ.கா. பேரூர் / ஆலாந்துறை"
                    value={formData.village_ta}
                    onChange={(e) => setFormData({ ...formData, village_ta: e.target.value })}
                  />
                </div>

                {/* Phone */}
                <div className="form-group">
                  <label>{t.phone}</label>
                  <input
                    type="tel"
                    className="form-control"
                    placeholder="e.g. 98433 12345"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    required
                  />
                </div>

                {/* Farm Land Address / Notes */}
                <div className="form-group col-full">
                  <label>Farm Location / Land Details</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="e.g. Canal Road, North Thottam, 4.5 Acres Sugarcane"
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
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
