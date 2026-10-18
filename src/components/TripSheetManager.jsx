import React, { useState, useEffect } from 'react';
import { 
  FileSpreadsheet, 
  Plus, 
  Search, 
  Edit3, 
  Trash2, 
  Printer, 
  Share2, 
  Clock, 
  Calendar, 
  Filter,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { translations, resolveBilingual } from '../translations/dictionary';
import AdminDeleteModal from './AdminDeleteModal';
import DatePicker from './common/DatePicker';
import SearchableSelect from './common/SearchableSelect';

export default function TripSheetManager({ 
  tripSheets, 
  fleet, 
  drivers, 
  customers, 
  rateMatrix, 
  onSaveTrip, 
  onDeleteTrip, 
  onViewSlip, 
  lang, 
  role 
}) {
  const t = translations[lang];
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all'); // all | paid | partial | unpaid
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [deleteModalState, setDeleteModalState] = useState({ isOpen: false, item: null });

  const tractors = fleet.filter(f => f.type === 'tractor');
  const implementsList = fleet.filter(f => f.type === 'implement');

  // Form State
  const [formData, setFormData] = useState({
    id: '',
    date: new Date().toISOString().slice(0, 10),
    startTime: '07:00',
    endTime: '11:00',
    customerId: '',
    customerName: '',
    driverId: '',
    driverName: '',
    tractorId: '',
    tractorName: '',
    implementId: '',
    implementName: '',
    workType: '5-Tyne Ploughing (5 கொழு உழவு)',
    workDescription: '',
    billingUnit: 'per_hour',
    startMeter: '',
    endMeter: '',
    quantity: '4',
    rate: '900',
    grossAmount: '3600',
    discount: '0',
    totalAmount: '3600',
    paidAmount: '3600',
    balanceAmount: '0',
    paymentStatus: 'paid',
    collectedBy: '',
    collectedWhen: new Date().toISOString().slice(0, 16).replace('T', ' '),
    paymentMode: 'cash',
    driverBata: '400',
    notes: ''
  });

  const handleOpenAdd = () => {
    const defaultCust = customers[0] || { id: '', name: 'Customer' };
    const defaultDrv = drivers[0] || { id: '', name: 'Driver' };
    const defaultTrac = tractors[0] || { id: '', name: 'Tractor' };
    const defaultImp = implementsList[0] || { id: '', name: 'Implement' };

    const newTripId = `TRP-${1000 + tripSheets.length + 1}`;
    setEditingItem(null);
    setFormData({
      id: newTripId,
      date: new Date().toISOString().slice(0, 10),
      startTime: '07:00',
      endTime: '11:00',
      customerId: defaultCust.id,
      customerName: defaultCust.name,
      driverId: defaultDrv.id,
      driverName: defaultDrv.name,
      tractorId: defaultTrac.id,
      tractorName: defaultTrac.name,
      implementId: defaultImp.id,
      implementName: defaultImp.name,
      workType: '5-Tyne Ploughing (5 கொழு உழவு)',
      workDescription: '',
      billingUnit: 'per_hour',
      startMeter: '',
      endMeter: '',
      quantity: '4',
      rate: '900',
      grossAmount: '3600',
      discount: '0',
      totalAmount: '3600',
      paidAmount: '3600',
      balanceAmount: '0',
      paymentStatus: 'paid',
      collectedBy: `${defaultDrv.name} (Driver)`,
      collectedWhen: new Date().toISOString().slice(0, 16).replace('T', ' '),
      paymentMode: 'cash',
      driverBata: '400',
      notes: ''
    });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (trip) => {
    setEditingItem(trip);
    setFormData({ ...trip });
    setIsModalOpen(true);
  };

  // Auto-lookup matching rate from Rate Card when Tractor, Implement or Date changes
  const lookupRate = (tractorId, implementId, date, unit) => {
    const matched = rateMatrix.filter(r => 
      r.tractorId === tractorId && 
      (r.implementId === implementId || implementId === 'none') &&
      r.unit === unit &&
      r.effectiveDate <= date
    ).sort((a, b) => b.effectiveDate.localeCompare(a.effectiveDate))[0];

    return matched ? matched.rate : null;
  };

  const handleFieldChange = (field, value) => {
    setFormData(prev => {
      const updated = { ...prev, [field]: value };

      // Customer selection
      if (field === 'customerId') {
        const found = customers.find(c => c.id === value);
        if (found) updated.customerName = found.name;
      }

      // Driver selection
      if (field === 'driverId') {
        const found = drivers.find(d => d.id === value);
        if (found) {
          updated.driverName = found.name;
          if (!prev.collectedBy || prev.collectedBy.includes('Driver')) {
            updated.collectedBy = `${found.name} (Driver)`;
          }
        }
      }

      // Tractor selection
      if (field === 'tractorId') {
        const found = tractors.find(t => t.id === value);
        if (found) updated.tractorName = found.name;
        const suggestedRate = lookupRate(value, updated.implementId, updated.date, updated.billingUnit);
        if (suggestedRate) updated.rate = suggestedRate;
      }

      // Implement selection
      if (field === 'implementId') {
        const found = implementsList.find(m => m.id === value);
        updated.implementName = found ? found.name : 'Standalone Tractor';
        const suggestedRate = lookupRate(updated.tractorId, value, updated.date, updated.billingUnit);
        if (suggestedRate) updated.rate = suggestedRate;
      }

      // Hour Meter start / end calculation
      if (field === 'startMeter' || field === 'endMeter') {
        const start = parseFloat(field === 'startMeter' ? value : updated.startMeter);
        const end = parseFloat(field === 'endMeter' ? value : updated.endMeter);
        if (!isNaN(start) && !isNaN(end) && end >= start) {
          updated.quantity = (end - start).toFixed(1);
        }
      }

      // Recalculate Financials
      const qty = parseFloat(field === 'quantity' ? value : updated.quantity) || 0;
      const rt = parseFloat(field === 'rate' ? value : updated.rate) || 0;
      const disc = parseFloat(field === 'discount' ? value : updated.discount) || 0;
      
      const gross = qty * rt;
      const net = Math.max(0, gross - disc);
      updated.grossAmount = gross;
      updated.totalAmount = net;

      // Paid / Balance logic
      if (field === 'paymentStatus') {
        if (value === 'paid') {
          updated.paidAmount = net;
          updated.balanceAmount = 0;
        } else if (value === 'unpaid') {
          updated.paidAmount = 0;
          updated.balanceAmount = net;
          updated.paymentMode = 'credit';
        }
      } else {
        const paid = parseFloat(field === 'paidAmount' ? value : updated.paidAmount) || 0;
        updated.balanceAmount = Math.max(0, net - paid);
        if (paid >= net && net > 0) {
          updated.paymentStatus = 'paid';
        } else if (paid > 0 && paid < net) {
          updated.paymentStatus = 'partial';
        } else if (paid === 0) {
          updated.paymentStatus = 'unpaid';
        }
      }

      return updated;
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSaveTrip(formData);
    setIsModalOpen(false);
  };

  // Filtered List
  const filteredTrips = tripSheets.filter(t => {
    const matchesSearch = (t.id || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                          (t.customerName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                          (t.driverName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                          (t.tractorName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                          (t.workDescription || '').toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || t.paymentStatus === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div>
      {/* Header bar */}
      <div className="card-header-bar">
        <div className="card-title-group">
          <h2><FileSpreadsheet size={22} /> {t.tripSheets}</h2>
          <p>{lang === 'ta' ? 'உழவு வேலை டிரிப் சீட்டுகள், கட்டணம் கணக்கீடு, வசூலித்தவர் மற்றும் நிலுவை பாக்கி' : 'Tractor work trip sheets, hourly/acre billing, collection and balance dues'}</p>
        </div>
        <button className="btn btn-primary" onClick={handleOpenAdd}>
          <Plus size={16} />
          {lang === 'ta' ? '+ புதிய டிரிப் சீட்டு' : '+ New Trip Sheet'}
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="filter-bar">
        <div className="search-input-wrapper">
          <Search size={16} className="search-icon-inside" />
          <input
            type="text"
            placeholder={t.search + ' (Trip #, Customer, Driver, Work...)'}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <select 
          className="filter-select"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
        >
          <option value="all">All Payment Statuses</option>
          <option value="paid">{t.paid}</option>
          <option value="partial">{t.partial}</option>
          <option value="unpaid">{t.unpaid}</option>
        </select>
      </div>

      {/* Table */}
      <div className="content-card" style={{ padding: '0' }}>
        <div className="table-responsive">
          <table className="data-table">
            <thead>
              <tr>
                <th>{t.tripId}</th>
                <th>{t.tripDate}</th>
                <th>{t.customerName}</th>
                <th>{t.driverName}</th>
                <th>Tractor + Implement</th>
                <th>Hours / Units</th>
                <th>Total (₹)</th>
                <th>Paid (₹)</th>
                <th>Balance (நிலுவை)</th>
                <th>Collection Detail</th>
                <th>Status</th>
                <th style={{ textAlign: 'right' }}>{t.actions}</th>
              </tr>
            </thead>
            <tbody>
              {filteredTrips.map(trip => (
                <tr key={trip.id}>
                  <td style={{ fontWeight: 700, color: 'var(--primary-700)' }}>{trip.id}</td>
                  <td>
                    <div style={{ fontWeight: 600 }}>{trip.date}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-light)' }}>
                      {trip.startTime || ''} - {trip.endTime || ''}
                    </div>
                  </td>
                  <td>
                    <div style={{ fontWeight: 600 }}>{trip.customerName}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-light)' }}>{trip.workType}</div>
                  </td>
                  <td style={{ fontSize: '0.85rem' }}>{trip.driverName}</td>
                  <td>
                    <div style={{ fontSize: '0.825rem', fontWeight: 600 }}>{trip.tractorName}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-light)' }}>{trip.implementName}</div>
                  </td>
                  <td>
                    <div style={{ fontWeight: 600 }}>{trip.quantity} {trip.billingUnit === 'per_hour' ? 'hrs' : trip.billingUnit === 'per_acre' ? 'acres' : trip.billingUnit}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-light)' }}>@ ₹{trip.rate}</div>
                  </td>
                  <td style={{ fontWeight: 700 }}>₹{trip.totalAmount}</td>
                  <td style={{ fontWeight: 700, color: '#16a34a' }}>₹{trip.paidAmount}</td>
                  <td>
                    <span style={{ 
                      fontWeight: 800, 
                      color: trip.balanceAmount > 0 ? '#dc2626' : '#16a34a' 
                    }}>
                      ₹{trip.balanceAmount}
                    </span>
                  </td>
                  <td>
                    <div style={{ fontSize: '0.8rem', fontWeight: 600 }}>
                      {trip.collectedBy ? trip.collectedBy : '--'}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-light)' }}>
                      {trip.paymentMode?.toUpperCase()} • {trip.collectedWhen ? trip.collectedWhen.slice(0, 10) : ''}
                    </div>
                  </td>
                  <td>
                    <span className={`badge ${
                      trip.paymentStatus === 'paid' ? 'badge-paid' :
                      trip.paymentStatus === 'partial' ? 'badge-partial' : 'badge-unpaid'
                    }`}>
                      {trip.paymentStatus === 'paid' ? t.paid :
                       trip.paymentStatus === 'partial' ? t.partial : t.unpaid}
                    </span>
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <div style={{ display: 'inline-flex', gap: '0.35rem' }}>
                      <button 
                        className="btn btn-outline btn-sm"
                        onClick={() => onViewSlip(trip)}
                        title="View / Print Slip"
                      >
                        <Printer size={14} />
                      </button>
                      <button 
                        className="btn btn-outline btn-sm"
                        onClick={() => handleOpenEdit(trip)}
                        title="Edit Record"
                      >
                        <Edit3 size={14} />
                      </button>
                      <button 
                        className="btn btn-outline btn-sm"
                        style={{ color: '#ef4444' }}
                        onClick={() => setDeleteModalState({ isOpen: true, item: trip })}
                        title={role === 'admin' ? "Delete Record" : "Admin Only"}
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {filteredTrips.length === 0 && (
                <tr>
                  <td colSpan="12" style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-light)' }}>
                    No trip sheets found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add / Edit Trip Modal */}
      {isModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '780px' }}>
            <div className="modal-header">
              <h3>{editingItem ? `${t.edit} Trip: ${editingItem.id}` : '+ New Tractor Trip Sheet'}</h3>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="modal-body form-grid">
                
                {/* Trip ID & Date */}
                <div className="form-group">
                  <label>{t.tripId}</label>
                  <input
                    type="text"
                    className="form-control"
                    value={formData.id}
                    readOnly
                    style={{ background: 'var(--bg-subtle)', fontWeight: 700 }}
                  />
                </div>

                <div className="form-group">
                  <DatePicker
                    label={t.tripDate}
                    value={formData.date}
                    onChange={(val) => handleFieldChange('date', val)}
                    required
                    lang={lang}
                  />
                </div>

                {/* Timing */}
                <div className="form-group">
                  <label>{t.startTime}</label>
                  <input
                    type="time"
                    className="form-control"
                    value={formData.startTime}
                    onChange={(e) => handleFieldChange('startTime', e.target.value)}
                  />
                </div>

                <div className="form-group">
                  <label>{t.endTime}</label>
                  <input
                    type="time"
                    className="form-control"
                    value={formData.endTime}
                    onChange={(e) => handleFieldChange('endTime', e.target.value)}
                  />
                </div>

                {/* Customer */}
                <div className="form-group">
                  <SearchableSelect
                    label={t.customerName}
                    value={formData.customerId}
                    onChange={(val) => handleFieldChange('customerId', val)}
                    options={customers.map(c => ({ value: c.id, label: `${c.name} (${c.village || ''})`, badge: c.phone || '' }))}
                    placeholder="-- Select Farmer / Customer --"
                    searchPlaceholder={lang === 'ta' ? 'விவசாயியைத் தேட...' : 'Search farmer...'}
                    required
                    lang={lang}
                  />
                </div>

                {/* Driver */}
                <div className="form-group">
                  <SearchableSelect
                    label={t.driverName}
                    value={formData.driverId}
                    onChange={(val) => handleFieldChange('driverId', val)}
                    options={drivers.map(d => ({ value: d.id, label: d.name, subLabel: d.phone || '', badge: d.wageType || '' }))}
                    placeholder="-- Select Driver --"
                    searchPlaceholder={lang === 'ta' ? 'ஓட்டுநரைத் தேட...' : 'Search driver...'}
                    required
                    lang={lang}
                  />
                </div>

                {/* Tractor */}
                <div className="form-group">
                  <SearchableSelect
                    label={t.tractor}
                    value={formData.tractorId}
                    onChange={(val) => handleFieldChange('tractorId', val)}
                    options={tractors.map(tr => ({ value: tr.id, label: tr.name, subLabel: tr.regNumber || '', badge: tr.hp ? `${tr.hp} HP` : '' }))}
                    placeholder="-- Select Tractor --"
                    searchPlaceholder={lang === 'ta' ? 'டிராக்டரைத் தேட...' : 'Search tractor...'}
                    required
                    lang={lang}
                  />
                </div>

                {/* Implement */}
                <div className="form-group">
                  <SearchableSelect
                    label={`${t.machine} (Implement)`}
                    value={formData.implementId}
                    onChange={(val) => handleFieldChange('implementId', val)}
                    options={[
                      { value: 'none', label: 'None (Standalone Tractor / Haulage)' },
                      ...implementsList.map(imp => ({ value: imp.id, label: imp.name, subLabel: imp.category || '' }))
                    ]}
                    placeholder="-- Select Implement --"
                    lang={lang}
                  />
                </div>

                {/* Billing Unit */}
                <div className="form-group">
                  <SearchableSelect
                    label={t.unit}
                    value={formData.billingUnit}
                    onChange={(val) => handleFieldChange('billingUnit', val)}
                    options={[
                      { value: 'per_hour', label: t.perHour },
                      { value: 'per_acre', label: t.perAcre },
                      { value: 'per_km', label: t.perKm },
                      { value: 'per_trip', label: t.perTrip }
                    ]}
                    lang={lang}
                  />
                </div>

                {/* Rate (Auto-filled from Rate Card) */}
                <div className="form-group">
                  <label>{t.rateAmount} (₹)</label>
                  <input
                    type="number"
                    className="form-control"
                    value={formData.rate}
                    onChange={(e) => handleFieldChange('rate', e.target.value)}
                    required
                  />
                </div>

                {/* Hour Meter Start / End */}
                <div className="form-group">
                  <label>{t.startMeter}</label>
                  <input
                    type="number"
                    step="0.1"
                    className="form-control"
                    placeholder="e.g. 1245.0"
                    value={formData.startMeter}
                    onChange={(e) => handleFieldChange('startMeter', e.target.value)}
                  />
                </div>

                <div className="form-group">
                  <label>{t.endMeter}</label>
                  <input
                    type="number"
                    step="0.1"
                    className="form-control"
                    placeholder="e.g. 1249.5"
                    value={formData.endMeter}
                    onChange={(e) => handleFieldChange('endMeter', e.target.value)}
                  />
                </div>

                {/* Worked Units */}
                <div className="form-group">
                  <label>{t.workedUnits} (Hours / Acres / Km)</label>
                  <input
                    type="number"
                    step="0.1"
                    className="form-control"
                    value={formData.quantity}
                    onChange={(e) => handleFieldChange('quantity', e.target.value)}
                    required
                  />
                </div>

                {/* Discount */}
                <div className="form-group">
                  <label>{t.discount}</label>
                  <input
                    type="number"
                    className="form-control"
                    value={formData.discount}
                    onChange={(e) => handleFieldChange('discount', e.target.value)}
                  />
                </div>

                {/* Net Total (Readonly) */}
                <div className="form-group">
                  <label style={{ color: 'var(--primary-700)', fontWeight: 800 }}>{t.totalAmount} (₹)</label>
                  <input
                    type="number"
                    className="form-control"
                    value={formData.totalAmount}
                    readOnly
                    style={{ background: 'var(--bg-subtle)', fontWeight: 800, fontSize: '1.1rem', color: 'var(--primary-700)' }}
                  />
                </div>

                {/* Payment Status */}
                <div className="form-group">
                  <SearchableSelect
                    label="Payment Collection Status"
                    value={formData.paymentStatus}
                    onChange={(val) => handleFieldChange('paymentStatus', val)}
                    options={[
                      { value: 'paid', label: `${t.paid} (Full Payment)`, badge: '100%' },
                      { value: 'partial', label: `${t.partial} (Advance / Part Payment)`, badge: 'Advance' },
                      { value: 'unpaid', label: `${t.unpaid} (Full Credit / Pending)`, badge: 'Due' }
                    ]}
                    lang={lang}
                  />
                </div>

                {/* Paid Amount */}
                <div className="form-group">
                  <label>{t.paidAmount} (₹)</label>
                  <input
                    type="number"
                    className="form-control"
                    value={formData.paidAmount}
                    onChange={(e) => handleFieldChange('paidAmount', e.target.value)}
                    required
                  />
                </div>

                {/* Balance Amount (Readonly) */}
                <div className="form-group">
                  <label style={{ color: '#dc2626', fontWeight: 800 }}>{t.balanceAmount} (₹)</label>
                  <input
                    type="number"
                    className="form-control"
                    value={formData.balanceAmount}
                    readOnly
                    style={{ background: 'var(--bg-subtle)', fontWeight: 800, fontSize: '1.1rem', color: '#dc2626' }}
                  />
                </div>

                {/* Who Collected & When */}
                <div className="form-group">
                  <label>{t.collectedBy} (Driver / Partner / Admin)</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="e.g. K. Murugan (Driver) or Kuppusamy (Partner)"
                    value={formData.collectedBy}
                    onChange={(e) => handleFieldChange('collectedBy', e.target.value)}
                  />
                </div>

                <div className="form-group">
                  <label>{t.collectedWhen}</label>
                  <input
                    type="datetime-local"
                    className="form-control"
                    value={formData.collectedWhen}
                    onChange={(e) => handleFieldChange('collectedWhen', e.target.value)}
                  />
                </div>

                {/* Payment Mode */}
                <div className="form-group">
                  <SearchableSelect
                    label={t.paymentMode}
                    value={formData.paymentMode}
                    onChange={(val) => handleFieldChange('paymentMode', val)}
                    options={[
                      { value: 'cash', label: t.cash },
                      { value: 'gpay_upi', label: t.gpayUpi },
                      { value: 'bank_transfer', label: t.bankTransfer },
                      { value: 'cheque', label: t.cheque },
                      { value: 'credit', label: t.creditPending }
                    ]}
                    lang={lang}
                  />
                </div>

                {/* Driver Bata */}
                <div className="form-group">
                  <label>Driver Bata Paid for this Trip (₹)</label>
                  <input
                    type="number"
                    className="form-control"
                    placeholder="e.g. 400"
                    value={formData.driverBata}
                    onChange={(e) => handleFieldChange('driverBata', e.target.value)}
                  />
                </div>

                {/* Work Description */}
                <div className="form-group col-full">
                  <label>{t.workDescription} / Field Notes</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="e.g. Rotavator fine tilling for turmeric or 5-Tyne deep ploughing for sugarcane"
                    value={formData.workDescription}
                    onChange={(e) => handleFieldChange('workDescription', e.target.value)}
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
        onConfirm={(pin) => onDeleteTrip(deleteModalState.item.id, pin)}
        itemTitle={deleteModalState.item ? `${deleteModalState.item.id} - ${deleteModalState.item.customerName}` : ''}
        role={role}
        lang={lang}
      />
    </div>
  );
}
