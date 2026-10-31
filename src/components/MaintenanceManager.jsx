import React, { useState, useMemo } from 'react';
import { Wrench, Plus, Search, Edit3, Trash2, Fuel, Filter, X, AlertCircle, Check, User, Package, Calendar } from 'lucide-react';
import { translations, resolveBilingual } from '../translations/dictionary';
import AdminDeleteModal from './AdminDeleteModal';
import DatePicker from './common/DatePicker';
import SearchableSelect from './common/SearchableSelect';
import VoiceInput from './common/VoiceInput';
import { StorageService, validatePositiveNumber } from '../services/storage';
import { formatDateDDMMYYYY } from '../utils/dateUtils';
import { getBilingualText } from '../utils/langUtils';

// Standard Consumables / Things Categories
const DEFAULT_THINGS_CATEGORIES = [
  { id: 'diesel', name: 'Diesel / Fuel', name_ta: 'டீசல்', unit: 'liters' },
  { id: 'engine_oil', name: 'Engine Oil', name_ta: 'என்ஜின் ஆயில்', unit: 'liters' },
  { id: 'rotavator_blade', name: 'Rotavator Blades', name_ta: 'ரோட்டாவேட்டர் பிளேடுகள்', unit: 'pieces' },
  { id: '5tyne_blade', name: '5-Tyne Cultivator Blades', name_ta: '5 கொழு பிளேடுகள் / கொழுப்புகள்', unit: 'pieces' },
  { id: 'grease', name: 'Greasing & Lubrication', name_ta: 'கிரீஸ் அடித்தல்', unit: 'kg' },
  { id: 'hydraulic_oil', name: 'Hydraulic Oil', name_ta: 'ஹைட்ராலிக் ஆயில்', unit: 'liters' },
  { id: 'battery', name: 'Battery & Electricals', name_ta: 'பேட்டரி & எலக்ட்ரிக்கல்', unit: 'pieces' },
  { id: 'tires', name: 'Tires & Tubes', name_ta: 'டயர்கள் & டியூப்', unit: 'pieces' },
  { id: 'nuts_bolts', name: 'Nuts, Bolts & Fasteners', name_ta: 'நட்டுகள் & போல்ட்டுகள்', unit: 'pieces' },
  { id: 'air_filter', name: 'Air / Oil Filters', name_ta: 'ஏர் & ஆயில் பில்டர்கள்', unit: 'pieces' },
  { id: 'coolant', name: 'Coolant Liquid', name_ta: 'கூலண்ட் ஆயில் / தண்ணீர்', unit: 'liters' },
  { id: 'other_item', name: 'Other Item / Spares', name_ta: 'இதர பொருட்கள்', unit: 'pieces' }
];

const UNIT_OPTIONS = [
  { value: 'liters', label: 'Liters / லிட்டர்' },
  { value: 'kg', label: 'Kg / கிலோ' },
  { value: 'pieces', label: 'Pieces / எண்ணிக்கை' },
  { value: 'cans', label: 'Cans / கேன்' },
  { value: 'sets', label: 'Sets / செட்' },
  { value: 'meters', label: 'Meters / மீட்டர்' },
  { value: 'nos', label: 'Nos / எண்ணிக்கை' },
  { value: 'other', label: 'Other / இதர' }
];

export default function MaintenanceManager({ 
  maintenance = [], 
  fleet = [], 
  onSaveMaintenance, 
  onDeleteMaintenance, 
  lang = 'ta', 
  role = 'admin',
  currentUser,
  users = [],
  drivers = []
}) {
  const t = translations[lang] || translations.en;
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState('all'); // 'all' | 'things' | 'service'
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [deleteModalState, setDeleteModalState] = useState({ isOpen: false, item: null });
  const [formError, setFormError] = useState('');

  // 1) Entry Type Switcher: 'things' (Diesel/Oil/Blades) vs 'service' (Tractor/Machine Service)
  const [entryType, setEntryType] = useState('things');

  // Custom in-place added expense types
  const [customCategories, setCustomCategories] = useState(() => {
    try {
      return StorageService.getCustomExpenseTypes() || [];
    } catch (e) {
      return [];
    }
  });

  // Inline "Add New Type" form state (no other menu needed)
  const [isAddingNewType, setIsAddingNewType] = useState(false);
  const [newTypeName, setNewTypeName] = useState('');
  const [newTypeNameTa, setNewTypeNameTa] = useState('');
  const [newTypeUnit, setNewTypeUnit] = useState('pieces');

  // Combined categories list for Things
  const allThingsCategories = useMemo(() => {
    return [...DEFAULT_THINGS_CATEGORIES, ...customCategories];
  }, [customCategories]);

  // Compute default logged-in person
  const getLoggedPerson = () => {
    if (currentUser) {
      if (lang === 'ta' && currentUser.displayName_ta) {
        return currentUser.displayName_ta;
      }
      return currentUser.displayName || currentUser.username || 'Master Administrator';
    }
    return lang === 'ta' ? 'முதன்மை நிர்வாகி' : 'Master Administrator';
  };

  // Form State accommodating both Type 1 (Things) and Type 2 (Service)
  const [formData, setFormData] = useState({
    id: '',
    entryType: 'things', // 'things' | 'service'
    date: new Date().toISOString().slice(0, 10),
    // Type 1: Things
    category: 'diesel',
    category_ta: 'டீசல்',
    count: '50',
    unit: 'liters',
    unitCost: '92',
    // Type 2: Machine Service
    assetId: '',
    assetName: '',
    hourMeter: '',
    // Common
    amount: '4600',
    totalAmount: '4600',
    paidStatus: 'paid', // 'paid' | 'unpaid' | 'partial'
    paymentMode: 'cash', // 'cash' | 'gpay_upi' | 'bank_transfer' | 'credit'
    person: getLoggedPerson(),
    description: ''
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

  // Open modal with specific type
  const handleOpenAdd = (typeToOpen = 'things') => {
    const defaultAsset = fleet[0] || { id: '', name: 'General Fleet' };
    const defaultPerson = getLoggedPerson();
    setEditingItem(null);
    setFormError('');
    setEntryType(typeToOpen);
    setIsAddingNewType(false);
    setNewTypeName('');
    setNewTypeNameTa('');

    if (typeToOpen === 'things') {
      setFormData({
        id: generateUniqueMaintenanceId(),
        entryType: 'things',
        date: new Date().toISOString().slice(0, 10),
        category: 'diesel',
        category_ta: 'டீசல்',
        count: '50',
        unit: 'liters',
        unitCost: '92',
        assetId: '',
        assetName: 'General Fleet / பொது இருப்பு',
        hourMeter: '',
        amount: '4600',
        totalAmount: '4600',
        paidStatus: 'paid',
        paymentMode: 'cash',
        person: defaultPerson,
        description: 'HP Auto Fuel Point'
      });
    } else {
      setFormData({
        id: generateUniqueMaintenanceId(),
        entryType: 'service',
        date: new Date().toISOString().slice(0, 10),
        category: 'tractor_service',
        category_ta: 'டிராக்டர் / இயந்திரம் சர்வீஸ்',
        count: '1',
        unit: 'job',
        unitCost: '',
        assetId: defaultAsset.id,
        assetName: defaultAsset.name,
        hourMeter: defaultAsset.currentHours || '',
        amount: '1500',
        totalAmount: '1500',
        paidStatus: 'paid',
        paymentMode: 'cash',
        person: defaultPerson,
        description: ''
      });
    }
    setIsModalOpen(true);
  };

  const handleOpenEdit = (item) => {
    setEditingItem(item);
    setFormError('');
    setIsAddingNewType(false);

    const isSvc = item.entryType === 'service' || 
                  item.category === 'tractor_repair' || 
                  item.category === 'service_250h' || 
                  item.category === 'workshop_labor' ||
                  item.category === 'tractor_service';
    const resolvedType = isSvc ? 'service' : 'things';
    setEntryType(resolvedType);

    let assetId = item.assetId;
    if (!assetId && item.assetName) {
      const matchF = fleet.find(f => f.name.toLowerCase() === item.assetName.toLowerCase());
      if (matchF) assetId = matchF.id;
    }

    const amt = item.amount || item.totalAmount || '';

    setFormData({
      id: item.id || '',
      entryType: resolvedType,
      date: item.date || new Date().toISOString().slice(0, 10),
      category: item.category || (resolvedType === 'service' ? 'tractor_service' : 'diesel'),
      category_ta: item.category_ta || '',
      count: item.quantity !== undefined && item.quantity !== null ? String(item.quantity) : (item.count || ''),
      unit: item.unit || (resolvedType === 'service' ? 'job' : 'liters'),
      unitCost: item.unitCost !== undefined && item.unitCost !== null ? String(item.unitCost) : '',
      assetId: assetId || (fleet[0] ? fleet[0].id : ''),
      assetName: item.assetName || (fleet[0] ? fleet[0].name : ''),
      hourMeter: item.hourMeter !== undefined && item.hourMeter !== null ? String(item.hourMeter) : '',
      amount: String(amt),
      totalAmount: String(amt),
      paidStatus: item.paidStatus || (item.paymentMode === 'credit' ? 'unpaid' : 'paid'),
      paymentMode: item.paymentMode || 'cash',
      person: item.person || getLoggedPerson(),
      description: item.description || item.notes || item.vendorName || ''
    });
    setIsModalOpen(true);
  };

  // Field change handler
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
        const foundCat = allThingsCategories.find(c => c.id === value);
        if (foundCat) {
          updated.category_ta = foundCat.name_ta;
          if (foundCat.unit) updated.unit = foundCat.unit;
        }
      }

      // Auto-compute amount if user edits count and unitCost
      if (field === 'count' || field === 'unitCost') {
        const cnt = parseFloat(field === 'count' ? value : updated.count) || 0;
        const uc = parseFloat(field === 'unitCost' ? value : updated.unitCost) || 0;
        if (cnt > 0 && uc > 0) {
          const calc = (cnt * uc).toFixed(0);
          updated.amount = calc;
          updated.totalAmount = calc;
        }
      }

      // Sync amount and totalAmount
      if (field === 'amount') {
        updated.totalAmount = value;
      }

      // Auto-adjust paymentMode when paidStatus changes
      if (field === 'paidStatus') {
        if (value === 'unpaid') {
          updated.paymentMode = 'credit';
        } else if (value === 'paid' && updated.paymentMode === 'credit') {
          updated.paymentMode = 'cash';
        }
      }

      return updated;
    });
  };

  // Switch entry type within the modal
  const handleSwitchEntryType = (newType) => {
    setEntryType(newType);
    setFormError('');
    setIsAddingNewType(false);
    setFormData(prev => {
      const updated = { ...prev, entryType: newType };
      if (newType === 'service') {
        const defaultAsset = fleet.find(f => f.id === prev.assetId) || fleet[0] || { id: '', name: 'General Fleet' };
        updated.assetId = defaultAsset.id;
        updated.assetName = defaultAsset.name;
        updated.category = 'tractor_service';
        updated.category_ta = 'டிராக்டர் / இயந்திரம் சர்வீஸ்';
        updated.unit = 'job';
        if (defaultAsset.currentHours && !updated.hourMeter) {
          updated.hourMeter = defaultAsset.currentHours;
        }
      } else {
        updated.category = prev.category === 'tractor_service' ? 'diesel' : prev.category;
        const catObj = allThingsCategories.find(c => c.id === updated.category) || allThingsCategories[0];
        updated.category_ta = catObj.name_ta;
        updated.unit = catObj.unit || 'liters';
        if (!updated.count) updated.count = '50';
      }
      return updated;
    });
  };

  // In-place inline category creation (no other menu needed)
  const handleAddNewType = () => {
    if (!newTypeName.trim()) {
      setFormError(lang === 'ta' ? 'புதிய செலவு வகையின் பெயரை உள்ளிடவும்!' : 'Please enter the new expense type name!');
      return;
    }
    const cleanEn = newTypeName.trim();
    const cleanTa = newTypeNameTa.trim() || cleanEn;
    const catId = 'custom_' + cleanEn.toLowerCase().replace(/[^a-z0-9]/g, '_') + '_' + Date.now().toString().slice(-4);
    
    const newCat = {
      id: catId,
      name: cleanEn,
      name_ta: cleanTa,
      unit: newTypeUnit || 'pieces'
    };

    StorageService.saveCustomExpenseType(newCat);
    setCustomCategories(prev => [...prev, newCat]);

    // Immediately select this new category in form
    handleFormChange('category', catId);
    handleFormChange('category_ta', cleanTa);
    handleFormChange('unit', newCat.unit);

    setNewTypeName('');
    setNewTypeNameTa('');
    setIsAddingNewType(false);
    setFormError('');
  };

  // Form submission
  const handleSubmit = (e) => {
    e.preventDefault();
    setFormError('');

    if (!formData.date) {
      setFormError(lang === 'ta' ? 'தேதி அவசியம்!' : 'Date is required!');
      return;
    }

    const amtVal = validatePositiveNumber(formData.amount, lang === 'ta' ? 'தொகை' : 'Amount', false);
    if (!amtVal.valid) {
      setFormError(amtVal.error);
      return;
    }

    if (!formData.paidStatus) {
      setFormError(lang === 'ta' ? 'கட்டண நிலை அவசியம்!' : 'Paid status is required!');
      return;
    }

    if (entryType === 'things') {
      if (!formData.category) {
        setFormError(lang === 'ta' ? 'செலவு வகையை தேர்வு செய்யவும்!' : 'Please select type of expense!');
        return;
      }
      if (!formData.person || !formData.person.trim()) {
        setFormError(lang === 'ta' ? 'நபரின் பெயர் அவசியம்!' : 'Person name is required!');
        return;
      }
    } else {
      // Service
      if (!formData.assetId) {
        setFormError(lang === 'ta' ? 'டிராக்டர் அல்லது இயந்திரத்தை தேர்வு செய்யவும்!' : 'Please select Tractor or Machine!');
        return;
      }
    }

    if (formData.hourMeter !== undefined && formData.hourMeter !== '' && formData.hourMeter !== null) {
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

    const recordToSave = {
      ...formData,
      id: finalId,
      entryType,
      quantity: formData.count || (entryType === 'service' ? '1' : ''),
      totalAmount: String(formData.amount),
      amount: String(formData.amount),
      vendorName: formData.description,
      notes: formData.description,
      _isEditing: Boolean(editingItem)
    };

    const res = onSaveMaintenance(recordToSave);
    if (res && res.success === false) {
      setFormError(res.error || 'Failed to save maintenance record.');
      return;
    }

    setIsModalOpen(false);
  };

  // Filter items based on search and entryType filter
  const filteredItems = maintenance.filter(m => {
    const isSvc = m.entryType === 'service' || 
                  m.category === 'tractor_repair' || 
                  m.category === 'service_250h' || 
                  m.category === 'workshop_labor' ||
                  m.category === 'tractor_service';
    const mType = isSvc ? 'service' : 'things';

    if (typeFilter !== 'all' && mType !== typeFilter) {
      return false;
    }

    const searchLower = searchTerm.toLowerCase();
    const matchesSearch = 
      (m.assetName || '').toLowerCase().includes(searchLower) ||
      (m.category || '').toLowerCase().includes(searchLower) ||
      (m.category_ta || '').toLowerCase().includes(searchLower) ||
      (m.description || '').toLowerCase().includes(searchLower) ||
      (m.notes || '').toLowerCase().includes(searchLower) ||
      (m.vendorName || '').toLowerCase().includes(searchLower) ||
      (m.person || '').toLowerCase().includes(searchLower);

    return matchesSearch;
  });

  return (
    <div>
      {/* Header Bar */}
      <div className="card-header-bar" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
        <div className="card-title-group">
          <h2 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Wrench size={22} color="var(--primary-600)" /> 
            <span>{lang === 'ta' ? 'எரிபொருள், உதிரிபாகங்கள் & இயந்திர சர்வீஸ்' : 'Fuel, Spare Parts & Machine Service'}</span>
          </h2>
        </div>
        
        {/* Two Quick Add Buttons */}
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          <button 
            type="button" 
            className="btn btn-primary" 
            onClick={() => handleOpenAdd('things')}
            style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontWeight: 700 }}
          >
            <Fuel size={16} />
            <span>{lang === 'ta' ? '+ 1) பொருட்கள் / எரிபொருள்' : '+ 1) Things (Diesel, Spares)'}</span>
          </button>
          
          <button 
            type="button" 
            className="btn btn-secondary" 
            onClick={() => handleOpenAdd('service')}
            style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontWeight: 700, background: '#0284c7', borderColor: '#0284c7', color: '#fff' }}
          >
            <Wrench size={16} />
            <span>{lang === 'ta' ? '+ 2) இயந்திர சர்வீஸ்' : '+ 2) Machine Service'}</span>
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="filter-bar" style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap', marginBottom: '1rem' }}>
        <div className="search-input-wrapper" style={{ flex: 1, minWidth: '220px' }}>
          <Search size={16} className="search-icon-inside" />
          <input
            type="text"
            placeholder={lang === 'ta' ? 'தேடுக (டீசல், ஆயில், பிளேடு, கடை, டிராக்டர், நபர்)...' : 'Search (Diesel, Oil, Blades, Shop, Tractor, Person)...'}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        {/* 2-Type Filter Tabs */}
        <div style={{ display: 'flex', gap: '0.25rem', background: 'var(--bg-subtle)', padding: '3px', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
          <button
            type="button"
            className={`btn btn-sm ${typeFilter === 'all' ? 'btn-primary' : 'btn-outline'}`}
            style={{ padding: '0.35rem 0.65rem', border: 'none' }}
            onClick={() => setTypeFilter('all')}
          >
            {lang === 'ta' ? 'அனைத்தும்' : 'All'}
          </button>
          <button
            type="button"
            className={`btn btn-sm ${typeFilter === 'things' ? 'btn-primary' : 'btn-outline'}`}
            style={{ padding: '0.35rem 0.65rem', border: 'none', display: 'flex', alignItems: 'center', gap: '0.3rem' }}
            onClick={() => setTypeFilter('things')}
          >
            <Fuel size={14} />
            <span>{lang === 'ta' ? 'பொருட்கள் / எரிபொருள்' : 'Things / Fuel'}</span>
          </button>
          <button
            type="button"
            className={`btn btn-sm ${typeFilter === 'service' ? 'btn-primary' : 'btn-outline'}`}
            style={{ padding: '0.35rem 0.65rem', border: 'none', display: 'flex', alignItems: 'center', gap: '0.3rem' }}
            onClick={() => setTypeFilter('service')}
          >
            <Wrench size={14} />
            <span>{lang === 'ta' ? 'இயந்திர சர்வீஸ்' : 'Machine Service'}</span>
          </button>
        </div>
      </div>

      {/* Maintenance Table */}
      <div className="content-card" style={{ padding: '0' }}>
        <div className="table-responsive">
          <table className="data-table">
            <thead>
              <tr>
                <th>{lang === 'ta' ? 'தேதி' : 'Date'}</th>
                <th>{lang === 'ta' ? 'வகை / பொருள்' : 'Type / Item'}</th>
                <th>{lang === 'ta' ? 'இயந்திரம்' : 'Tractor / Machine'}</th>
                <th>{lang === 'ta' ? 'அளவு' : 'Count & Unit'}</th>
                <th>{lang === 'ta' ? 'தொகை (₹)' : 'Amount (₹)'}</th>
                <th>{lang === 'ta' ? 'கட்டண நிலை' : 'Paid Status'}</th>
                <th>{lang === 'ta' ? 'பதிவு செய்தவர்' : 'Person'}</th>
                <th>{lang === 'ta' ? 'கடை / விவரம்' : 'Shop / Description'}</th>
                <th style={{ textAlign: 'right' }}>{t.actions}</th>
              </tr>
            </thead>
            <tbody>
              {filteredItems.map(item => {
                const isSvc = item.entryType === 'service' || 
                              item.category === 'tractor_repair' || 
                              item.category === 'service_250h' || 
                              item.category === 'workshop_labor' ||
                              item.category === 'tractor_service';
                const dispCat = lang === 'ta' ? (item.category_ta || item.category) : (item.category || item.category_ta);
                const isPaid = item.paidStatus === 'paid' || (!item.paidStatus && item.paymentMode !== 'credit');
                const isPartial = item.paidStatus === 'partial';

                return (
                  <tr key={item.id}>
                    <td>
                      <div style={{ fontWeight: 600 }}>{formatDateDDMMYYYY(item.date)}</div>
                    </td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                        <span className={`badge ${isSvc ? 'badge-info' : 'badge-primary'}`} style={{ fontSize: '0.7rem' }}>
                          {isSvc ? '🔧 சர்வீஸ்' : '📦 பொருட்கள்'}
                        </span>
                        <span style={{ fontWeight: 700, color: 'var(--text-main)' }}>
                          {isSvc ? (lang === 'ta' ? 'சர்வீஸ் & பழுதுபார்ப்பு' : 'Machine Service') : dispCat}
                        </span>
                      </div>
                    </td>
                    <td>
                      {isSvc ? (
                        <span className="badge badge-purple" style={{ fontWeight: 700 }}>
                          {(() => {
                            const matched = fleet.find(f => f.id === item.assetId || f.name === item.assetName);
                            return getBilingualText(item.assetName || matched?.name, matched?.name_ta, lang);
                          })()}
                        </span>
                      ) : (
                        <span style={{ color: 'var(--text-light)', fontSize: '0.8rem' }}>
                          {item.assetName && item.assetName !== 'General Fleet / பொது இருப்பு' ? item.assetName : (lang === 'ta' ? 'பொது இருப்பு' : 'General')}
                        </span>
                      )}
                    </td>
                    <td>
                      {item.quantity || item.count ? (
                        <span>{item.quantity || item.count} {item.unit || ''}</span>
                      ) : (
                        <span style={{ color: 'var(--text-light)' }}>--</span>
                      )}
                    </td>
                    <td>
                      <span style={{ fontWeight: 800, color: '#d97706', fontSize: '0.98rem' }}>
                        ₹{Number(item.amount || item.totalAmount || 0).toLocaleString()}
                      </span>
                    </td>
                    <td>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                        <span className={`badge ${isPaid ? 'badge-success' : (isPartial ? 'badge-info' : 'badge-warning')}`} style={{ fontSize: '0.72rem' }}>
                          {isPaid ? (lang === 'ta' ? 'செலுத்தப்பட்டது' : 'PAID') : (isPartial ? (lang === 'ta' ? 'பகுதி செலுத்தியது' : 'PARTIAL') : (lang === 'ta' ? 'நிலுவை (கடன்)' : 'UNPAID'))}
                        </span>
                        {item.paymentMode && (
                          <span style={{ fontSize: '0.7rem', color: 'var(--text-light)', textTransform: 'uppercase' }}>
                            {item.paymentMode === 'gpay_upi' ? 'UPI / GPay' : item.paymentMode}
                          </span>
                        )}
                      </div>
                    </td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.85rem' }}>
                        <User size={13} style={{ color: 'var(--primary-600)' }} />
                        <span>{item.person || '--'}</span>
                      </div>
                    </td>
                    <td>
                      <div style={{ maxWidth: '240px', fontSize: '0.82rem', color: 'var(--text-main)', wordBreak: 'break-word' }}>
                        {item.description || item.notes || item.vendorName || '--'}
                      </div>
                      {item.hourMeter && (
                        <div style={{ fontSize: '0.72rem', color: 'var(--primary-600)', fontWeight: 600 }}>
                          ⏱️ {item.hourMeter} hrs
                        </div>
                      )}
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <div style={{ display: 'inline-flex', gap: '0.35rem' }}>
                        <button 
                          type="button"
                          className="btn btn-outline btn-sm"
                          onClick={() => handleOpenEdit(item)}
                          title="Edit"
                        >
                          <Edit3 size={14} />
                        </button>
                        <button 
                          type="button"
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
                );
              })}
              {filteredItems.length === 0 && (
                <tr>
                  <td colSpan="9" style={{ textAlign: 'center', padding: '2.5rem', color: 'var(--text-light)' }}>
                    {lang === 'ta' ? 'பதிவுகள் எதுவும் காணப்படவில்லை.' : 'No maintenance / expense records found.'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add / Edit Modal with Two Distinct Types */}
      {isModalOpen && (
        <div className="modal-overlay" onClick={() => setIsModalOpen(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '640px' }}>
            
            {/* Modal Header */}
            <div className="modal-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                {entryType === 'things' ? <Fuel size={20} color="var(--primary-600)" /> : <Wrench size={20} color="#0284c7" />}
                <h3 style={{ margin: 0, fontSize: '1.15rem' }}>
                  {editingItem ? (lang === 'ta' ? 'பதிவை திருத்து' : 'Edit Record') : (
                    entryType === 'things' 
                      ? (lang === 'ta' ? '1) பொருட்கள் / எரிபொருள் செலவு' : '1) Things (Diesel, Oil, Spares)')
                      : (lang === 'ta' ? '2) டிராக்டர் / இயந்திர சர்வீஸ்' : '2) Tractor / Machine Service')
                  )}
                </h3>
              </div>
              <button 
                type="button" 
                className="btn btn-outline btn-sm" 
                onClick={() => setIsModalOpen(false)}
                style={{ padding: '0.35rem 0.65rem' }}
              >
                <X size={16} />
              </button>
            </div>

            {/* Error Banner */}
            {formError && (
              <div style={{
                margin: '0.75rem 1.25rem 0',
                padding: '0.65rem 1rem',
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
              <div className="modal-body">
                
                {/* Type Switcher (Things vs Service) */}
                <div style={{ 
                  display: 'grid', 
                  gridTemplateColumns: '1fr 1fr', 
                  gap: '0.5rem', 
                  marginBottom: '1.25rem',
                  background: 'var(--bg-subtle)',
                  padding: '4px',
                  borderRadius: '10px'
                }}>
                  <button
                    type="button"
                    className={`btn ${entryType === 'things' ? 'btn-primary' : 'btn-outline'}`}
                    onClick={() => handleSwitchEntryType('things')}
                    style={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      justifyContent: 'center', 
                      gap: '0.45rem', 
                      padding: '0.55rem', 
                      fontWeight: 700, 
                      fontSize: '0.85rem',
                      border: entryType === 'things' ? 'none' : '1px solid transparent'
                    }}
                  >
                    <Fuel size={16} />
                    <span>{lang === 'ta' ? '1) பொருட்கள் / உதிரிபாகங்கள்' : '1) Things (Diesel/Spares)'}</span>
                  </button>
                  <button
                    type="button"
                    className={`btn ${entryType === 'service' ? 'btn-primary' : 'btn-outline'}`}
                    onClick={() => handleSwitchEntryType('service')}
                    style={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      justifyContent: 'center', 
                      gap: '0.45rem', 
                      padding: '0.55rem', 
                      fontWeight: 700, 
                      fontSize: '0.85rem',
                      background: entryType === 'service' ? '#0284c7' : 'transparent',
                      color: entryType === 'service' ? '#fff' : 'var(--text-main)',
                      border: entryType === 'service' ? 'none' : '1px solid transparent'
                    }}
                  >
                    <Wrench size={16} />
                    <span>{lang === 'ta' ? '2) இயந்திர சர்வீஸ்' : '2) Machine Service'}</span>
                  </button>
                </div>

                <div className="form-grid">
                  
                  {/* TYPE 1: THINGS (Diesel, Oil, Rotavator Blades, etc.) */}
                  {entryType === 'things' && (
                    <>
                      {/* 1. Date * */}
                      <div className="form-group">
                        <DatePicker
                          label={lang === 'ta' ? 'தேதி *' : 'Date *'}
                          value={formData.date}
                          onChange={(val) => handleFormChange('date', val)}
                          required
                          lang={lang}
                        />
                      </div>

                      {/* 2. Type of Expense * (Select + In-place Add) */}
                      <div className="form-group">
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.25rem' }}>
                          <label style={{ margin: 0 }}>
                            {lang === 'ta' ? 'செலவு வகை (Type of Expense) *' : 'Type of Expense *'}
                          </label>
                          {!isAddingNewType && (
                            <button
                              type="button"
                              className="btn btn-outline btn-sm"
                              onClick={() => setIsAddingNewType(true)}
                              style={{ padding: '2px 7px', fontSize: '0.72rem', color: 'var(--primary-700)', borderColor: 'var(--primary-300)' }}
                            >
                              + {lang === 'ta' ? 'புதிய வகை சேர்க்க' : 'Add New Type'}
                            </button>
                          )}
                        </div>

                        <SearchableSelect
                          value={formData.category}
                          onChange={(val) => handleFormChange('category', val)}
                          options={allThingsCategories.map(c => ({
                            value: c.id,
                            label: lang === 'ta' ? c.name_ta : c.name,
                            badge: c.unit ? c.unit : undefined
                          }))}
                          placeholder="-- Select Type of Expense --"
                          required
                          lang={lang}
                        />

                        {/* Inline "Add New Type" Right in Place (No other menu required!) */}
                        {isAddingNewType && (
                          <div style={{
                            marginTop: '0.5rem',
                            padding: '0.65rem 0.75rem',
                            borderRadius: '8px',
                            background: 'var(--bg-subtle)',
                            border: '1.5px dashed var(--primary-500)',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '0.45rem'
                          }}>
                            <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--primary-700)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <span>➕ {lang === 'ta' ? 'இங்கேயே புதிய வகை சேர்க்க:' : 'Add New Type In-Place:'}</span>
                              <button type="button" onClick={() => setIsAddingNewType(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6b7280' }}>
                                <X size={14} />
                              </button>
                            </div>
                            
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.4rem' }}>
                              <input 
                                type="text"
                                className="form-control"
                                placeholder="Type name (e.g. Fan Belt)"
                                value={newTypeName}
                                onChange={(e) => setNewTypeName(e.target.value)}
                                style={{ fontSize: '0.82rem', padding: '0.35rem 0.5rem' }}
                              />
                              <input 
                                type="text"
                                className="form-control"
                                placeholder="தமிழ் பெயர் (உதா: பேன் பெல்ட்)"
                                value={newTypeNameTa}
                                onChange={(e) => setNewTypeNameTa(e.target.value)}
                                style={{ fontSize: '0.82rem', padding: '0.35rem 0.5rem' }}
                              />
                            </div>

                            <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
                              <select
                                className="form-control"
                                value={newTypeUnit}
                                onChange={(e) => setNewTypeUnit(e.target.value)}
                                style={{ fontSize: '0.82rem', padding: '0.35rem 0.5rem', flex: 1 }}
                              >
                                {UNIT_OPTIONS.map(u => (
                                  <option key={u.value} value={u.value}>{u.label}</option>
                                ))}
                              </select>
                              
                              <button
                                type="button"
                                className="btn btn-primary btn-sm"
                                onClick={handleAddNewType}
                                style={{ padding: '0.35rem 0.75rem', fontSize: '0.82rem', fontWeight: 700 }}
                              >
                                {lang === 'ta' ? 'சேர்' : 'Add'}
                              </button>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* 3. Amount * */}
                      <div className="form-group">
                        <label style={{ color: '#d97706', fontWeight: 800 }}>
                          {lang === 'ta' ? 'தொகை (₹) *' : 'Amount (₹) *'}
                        </label>
                        <input
                          type="number"
                          step="any"
                          className="form-control"
                          placeholder="e.g. 4600"
                          value={formData.amount}
                          onChange={(e) => handleFormChange('amount', e.target.value)}
                          required
                          style={{ fontWeight: 800, fontSize: '1.05rem', color: '#d97706' }}
                        />
                      </div>

                      {/* 4. Paid Status * */}
                      <div className="form-group">
                        <label>{lang === 'ta' ? 'கட்டண நிலை (Paid Status) *' : 'Paid Status *'}</label>
                        <SearchableSelect
                          value={formData.paidStatus}
                          onChange={(val) => handleFormChange('paidStatus', val)}
                          options={[
                            { value: 'paid', label: lang === 'ta' ? '✅ Paid / செலுத்தப்பட்டது' : '✅ Paid' },
                            { value: 'unpaid', label: lang === 'ta' ? '⏳ Unpaid / நிலுவை (கடன்)' : '⏳ Unpaid / Credit' },
                            { value: 'partial', label: lang === 'ta' ? '🔄 Partial / பகுதி செலுத்தியது' : '🔄 Partial' }
                          ]}
                          required
                          lang={lang}
                        />
                      </div>

                      {/* 5. Person (Current Login User) * */}
                      <div className="form-group">
                        <label style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                          <User size={14} color="var(--primary-600)" />
                          <span>{lang === 'ta' ? 'நபர் (Person / Login User) *' : 'Person (Current Login User) *'}</span>
                        </label>
                        <input
                          type="text"
                          className="form-control"
                          value={formData.person}
                          onChange={(e) => handleFormChange('person', e.target.value)}
                          placeholder="e.g. Admin / Operator Name"
                          required
                        />
                      </div>

                      {/* 6. Count (Quantity) */}
                      <div className="form-group">
                        <label>{lang === 'ta' ? 'எண்ணிக்கை / அளவு (Count)' : 'Count / Quantity'}</label>
                        <input
                          type="number"
                          step="any"
                          className="form-control"
                          placeholder="e.g. 50"
                          value={formData.count}
                          onChange={(e) => handleFormChange('count', e.target.value)}
                        />
                      </div>

                      {/* 7. Unit (Liters, Kg, Pieces, etc.) */}
                      <div className="form-group">
                        <label>{lang === 'ta' ? 'அலகு (Unit)' : 'Unit'}</label>
                        <select
                          className="form-control"
                          value={formData.unit}
                          onChange={(e) => handleFormChange('unit', e.target.value)}
                        >
                          {UNIT_OPTIONS.map(u => (
                            <option key={u.value} value={u.value}>{u.label}</option>
                          ))}
                        </select>
                      </div>

                      {/* Payment Mode */}
                      <div className="form-group">
                        <label>{t.paymentMode}</label>
                        <select
                          className="form-control"
                          value={formData.paymentMode}
                          onChange={(e) => handleFormChange('paymentMode', e.target.value)}
                        >
                          <option value="cash">{t.cash}</option>
                          <option value="gpay_upi">{t.gpayUpi}</option>
                          <option value="bank_transfer">{t.bankTransfer}</option>
                          <option value="credit">Credit / Bunk Khata (கடன்)</option>
                        </select>
                      </div>

                      {/* 8. Description (Shop name, etc.) */}
                      <div className="form-group col-full">
                        <VoiceInput
                          label={lang === 'ta' ? 'விவரம் (கடை பெயர், ரசீது எண், குறிப்பு)' : 'Description (Shop Name, Invoice #, Notes)'}
                          placeholder={lang === 'ta' ? 'உதா: HP Auto Fuel Point, Bill #4920' : 'e.g. HP Auto Fuel Point / Sri Murugan Agri Spares, Bill #4920'}
                          value={formData.description}
                          onChange={(val) => handleFormChange('description', val)}
                          speechLang={lang === 'ta' ? 'ta-IN' : 'en-IN'}
                        />
                      </div>
                    </>
                  )}

                  {/* TYPE 2: TRACTOR OR MACHINE SERVICE */}
                  {entryType === 'service' && (
                    <>
                      {/* 1. Date * */}
                      <div className="form-group">
                        <DatePicker
                          label={lang === 'ta' ? 'தேதி *' : 'Date *'}
                          value={formData.date}
                          onChange={(val) => handleFormChange('date', val)}
                          required
                          lang={lang}
                        />
                      </div>

                      {/* 2. Select the Tractor or Machine * */}
                      <div className="form-group">
                        <SearchableSelect
                          label={lang === 'ta' ? 'டிராக்டர் அல்லது இயந்திரம் *' : 'Select Tractor or Machine *'}
                          value={formData.assetId}
                          onChange={(val) => handleFormChange('assetId', val)}
                          options={fleet.map(f => ({
                            value: f.id,
                            label: getBilingualText(f.name, f.name_ta, lang),
                            subLabel: f.regNumber || '',
                            badge: f.type === 'tractor' ? (lang === 'ta' ? 'டிராக்டர்' : 'Tractor') : (lang === 'ta' ? 'கருவி' : 'Machine')
                          }))}
                          placeholder="-- Select Tractor / Machine --"
                          required
                          lang={lang}
                        />
                      </div>

                      {/* 3. Amount * */}
                      <div className="form-group">
                        <label style={{ color: '#d97706', fontWeight: 800 }}>
                          {lang === 'ta' ? 'சர்வீஸ் கட்டணம் / தொகை (₹) *' : 'Service Amount (₹) *'}
                        </label>
                        <input
                          type="number"
                          step="any"
                          className="form-control"
                          placeholder="e.g. 2500"
                          value={formData.amount}
                          onChange={(e) => handleFormChange('amount', e.target.value)}
                          required
                          style={{ fontWeight: 800, fontSize: '1.05rem', color: '#d97706' }}
                        />
                      </div>

                      {/* 4. Paid Status * */}
                      <div className="form-group">
                        <label>{lang === 'ta' ? 'கட்டண நிலை (Paid Status) *' : 'Paid Status *'}</label>
                        <SearchableSelect
                          value={formData.paidStatus}
                          onChange={(val) => handleFormChange('paidStatus', val)}
                          options={[
                            { value: 'paid', label: lang === 'ta' ? '✅ Paid / செலுத்தப்பட்டது' : '✅ Paid' },
                            { value: 'unpaid', label: lang === 'ta' ? '⏳ Unpaid / நிலுவை (கடன்)' : '⏳ Unpaid / Credit' },
                            { value: 'partial', label: lang === 'ta' ? '🔄 Partial / பகுதி செலுத்தியது' : '🔄 Partial' }
                          ]}
                          required
                          lang={lang}
                        />
                      </div>

                      {/* Payment Mode */}
                      <div className="form-group">
                        <label>{t.paymentMode}</label>
                        <select
                          className="form-control"
                          value={formData.paymentMode}
                          onChange={(e) => handleFormChange('paymentMode', e.target.value)}
                        >
                          <option value="cash">{t.cash}</option>
                          <option value="gpay_upi">{t.gpayUpi}</option>
                          <option value="bank_transfer">{t.bankTransfer}</option>
                          <option value="credit">Workshop Credit (பட்டறை கடன்)</option>
                        </select>
                      </div>

                      {/* Hour Meter at Service */}
                      <div className="form-group">
                        <label>{t.meterReading} ({lang === 'ta' ? 'மணி மீட்டர்' : 'Hour Meter'})</label>
                        <input
                          type="number"
                          step="0.1"
                          className="form-control"
                          placeholder="e.g. 1245.0"
                          value={formData.hourMeter}
                          onChange={(e) => handleFormChange('hourMeter', e.target.value)}
                        />
                      </div>

                      {/* 5. Description (Reason and Shop Name etc.) */}
                      <div className="form-group col-full">
                        <VoiceInput
                          label={lang === 'ta' ? 'காரணம் & பட்டறை / மெக்கானிக் விவரம் (Reason & Shop Name) *' : 'Description (Reason & Workshop Name) *'}
                          placeholder={lang === 'ta' ? 'உதா: 250 மணி நேர ஆயில் சர்வீஸ், பிரேக் அட்ஜஸ்ட்மென்ட் - முருகன் பட்டறை' : 'e.g. 250 Hours Regular Service, Filter replacement done at Swaraj Authorized Workshop'}
                          value={formData.description}
                          onChange={(val) => handleFormChange('description', val)}
                          speechLang={lang === 'ta' ? 'ta-IN' : 'en-IN'}
                        />
                      </div>
                    </>
                  )}

                </div>
              </div>

              {/* Modal Footer */}
              <div className="modal-footer" style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
                <button type="button" className="btn btn-outline" onClick={() => setIsModalOpen(false)}>
                  {t.cancel}
                </button>
                <button type="submit" className="btn btn-primary" style={{ minWidth: '110px' }}>
                  {t.save}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Admin Delete Confirmation Modal */}
      <AdminDeleteModal
        isOpen={deleteModalState.isOpen}
        onClose={() => setDeleteModalState({ isOpen: false, item: null })}
        onConfirm={(pin) => onDeleteMaintenance(deleteModalState.item.id, pin)}
        itemTitle={deleteModalState.item ? `${deleteModalState.item.category || ''} (${deleteModalState.item.assetName || ''})` : ''}
        role={role}
        lang={lang}
      />
    </div>
  );
}
