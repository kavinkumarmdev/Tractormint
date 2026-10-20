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
  AlertCircle,
  X,
  Play,
  Pause,
  RotateCcw,
  Check,
  DollarSign,
  Zap,
  UserCheck,
  Layers
} from 'lucide-react';
import { translations, resolveBilingual } from '../translations/dictionary';
import AdminDeleteModal from './AdminDeleteModal';
import DatePicker from './common/DatePicker';
import SearchableSelect from './common/SearchableSelect';
import VoiceInput from './common/VoiceInput';
import { validatePositiveNumber } from '../services/storage';

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
  role,
  currentUser
}) {
  const t = translations[lang];
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all'); // all | paid | partial | unpaid
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [deleteModalState, setDeleteModalState] = useState({ isOpen: false, item: null });
  const [formError, setFormError] = useState('');

  // Toggle for Payment Collection (Hidden by default when adding new trip, saves to pending collection)
  const [isCollectionActive, setIsCollectionActive] = useState(false);

  // Time Entry Mode: 'manual' (default) | 'timer' (live stopwatch)
  const [timeEntryMode, setTimeEntryMode] = useState('manual');
  const [timerSeconds, setTimerSeconds] = useState(0);
  const [timerRunning, setTimerRunning] = useState(false);
  const [timerMessage, setTimerMessage] = useState('');

  // Optional custom/advanced fleet mode (multi-implement attachment)
  const [showAdvancedFleet, setShowAdvancedFleet] = useState(false);

  // Logged-in user assignment in this trip: 'driver' | 'collector' | 'none'
  const [loginUserAssignment, setLoginUserAssignment] = useState('collector');

  const tractors = fleet.filter(f => f.type === 'tractor');
  const implementsList = fleet.filter(f => f.type === 'implement');

  const loggedUserName = currentUser?.displayName || currentUser?.username || 'Operator';
  const loggedUserRole = currentUser?.role || role || 'operator';

  // Live Timer Interval
  useEffect(() => {
    let interval = null;
    if (timerRunning) {
      interval = setInterval(() => {
        setTimerSeconds(prev => prev + 1);
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [timerRunning]);

  const formatTimer = (totalSec) => {
    const h = Math.floor(totalSec / 3600);
    const m = Math.floor((totalSec % 3600) / 60);
    const s = totalSec % 60;
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  const getCurrentTimeFormatted = () => {
    const now = new Date();
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    return `${hours}:${minutes}`;
  };

  const resolveUnitLabel = (unit) => {
    if (unit === 'per_hour') return lang === 'ta' ? 'மணி நேரத்திற்கு' : 'Per Hour';
    if (unit === 'per_acre') return lang === 'ta' ? 'ஏக்கருக்கு' : 'Per Acre';
    if (unit === 'per_km') return lang === 'ta' ? 'கி.மீக்கு' : 'Per Km';
    if (unit === 'per_trip') return lang === 'ta' ? 'டிரிப்பிற்கு' : 'Per Trip';
    return unit || '';
  };

  // Build the Unified Single Select Options: (Tractor + Implement / Rate Card Combos)
  const comboOptions = [];

  // 1. From Rate Card combinations (Image 3)
  rateMatrix.forEach(r => {
    let matchedT = tractors.find(t => (r.tractorId && t.id === r.tractorId) || (r.tractorName && t.name.toLowerCase() === r.tractorName.toLowerCase()));
    const resolvedTractorId = matchedT ? matchedT.id : (r.tractorId || (tractors[0] ? tractors[0].id : 'TRAC-01'));
    const resolvedTractorName = matchedT ? matchedT.name : (r.tractorName || (tractors[0] ? tractors[0].name : 'Tractor'));

    let matchedI = implementsList.find(m => (r.implementId && m.id === r.implementId) || (r.implementName && m.name.toLowerCase() === r.implementName.toLowerCase()));
    const resolvedImplementId = matchedI ? matchedI.id : (r.implementId || 'none');
    const resolvedImplementName = matchedI ? matchedI.name : (r.implementName || 'Standalone Tractor');

    comboOptions.push({
      value: `rate_${r.id}`,
      label: `${resolvedTractorName} + ${resolvedImplementName}`,
      subLabel: `${resolveUnitLabel(r.unit)} • ₹${r.rate}`,
      badge: `₹${r.rate}`,
      rateItem: {
        ...r,
        tractorId: resolvedTractorId,
        tractorName: resolvedTractorName,
        implementId: resolvedImplementId,
        implementName: resolvedImplementName
      }
    });
  });

  // 2. Also ensure every tractor from fleet is selectable
  tractors.forEach(tr => {
    const hasStandaloneInRate = rateMatrix.some(r => r.tractorId === tr.id && (!r.implementId || r.implementId === 'none'));
    if (!hasStandaloneInRate) {
      comboOptions.push({
        value: `tr_${tr.id}_none`,
        label: `${tr.name} (${lang === 'ta' ? 'தனி டிராக்டர்' : 'Standalone Tractor'})`,
        subLabel: tr.regNumber || '',
        badge: 'Tractor',
        customCombo: {
          tractorId: tr.id,
          tractorName: tr.name,
          implementId: 'none',
          implementName: 'Standalone Tractor',
          unit: 'per_hour',
          rate: '900'
        }
      });
    }

    implementsList.forEach(imp => {
      const hasComboInRate = rateMatrix.some(r => r.tractorId === tr.id && r.implementId === imp.id);
      if (!hasComboInRate) {
        comboOptions.push({
          value: `tr_${tr.id}_imp_${imp.id}`,
          label: `${tr.name} + ${lang === 'ta' && imp.name_ta ? imp.name_ta : imp.name}`,
          subLabel: imp.category || (lang === 'ta' ? 'கருவி' : 'Implement'),
          badge: 'Combo',
          customCombo: {
            tractorId: tr.id,
            tractorName: tr.name,
            implementId: imp.id,
            implementName: imp.name,
            unit: 'per_hour',
            rate: '900'
          }
        });
      }
    });
  });

  // Form State
  const [formData, setFormData] = useState({
    id: '',
    date: new Date().toISOString().slice(0, 10),
    startTime: getCurrentTimeFormatted(),
    endTime: getCurrentTimeFormatted(),
    customerId: '',
    customerName: '',
    driverId: '',
    driverName: '',
    tractorId: '',
    tractorName: '',
    implementId: '',
    implementName: '',
    implementIds: [],
    implementNames: [],
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
    paidAmount: '0',
    balanceAmount: '3600',
    paymentStatus: 'unpaid',
    collectedBy: '',
    collectedWhen: new Date().toISOString().slice(0, 16).replace('T', ' '),
    paymentMode: 'credit',
    driverBata: '400',
    notes: ''
  });

  // Determine current active value for the single select (Tractor + Implement)
  const currentComboValue = (() => {
    if (!comboOptions || comboOptions.length === 0) return '';

    // 1. Try to find matching option in comboOptions by tractor + implement + unit
    const matchedExact = comboOptions.find(opt => {
      const item = opt.rateItem || opt.customCombo;
      if (!item) return false;

      const matchTrac = (formData.tractorId && item.tractorId && formData.tractorId === item.tractorId) ||
                        (formData.tractorName && item.tractorName && formData.tractorName.trim().toLowerCase() === item.tractorName.trim().toLowerCase());

      const isFormImpNone = !formData.implementId || formData.implementId === 'none' || formData.implementName === 'Standalone Tractor';
      const isItemImpNone = !item.implementId || item.implementId === 'none' || item.implementName === 'Standalone Tractor';
      
      const matchImp = (isFormImpNone && isItemImpNone) ||
                       (formData.implementId && item.implementId && formData.implementId === item.implementId) ||
                       (formData.implementName && item.implementName && formData.implementName.trim().toLowerCase() === item.implementName.trim().toLowerCase());

      const matchUnit = !formData.billingUnit || item.unit === formData.billingUnit;

      return matchTrac && matchImp && matchUnit;
    });
    if (matchedExact) return matchedExact.value;

    // 2. Try match without unit constraint
    const matchedLoose = comboOptions.find(opt => {
      const item = opt.rateItem || opt.customCombo;
      if (!item) return false;

      const matchTrac = (formData.tractorId && item.tractorId && formData.tractorId === item.tractorId) ||
                        (formData.tractorName && item.tractorName && formData.tractorName.trim().toLowerCase() === item.tractorName.trim().toLowerCase());

      const isFormImpNone = !formData.implementId || formData.implementId === 'none' || formData.implementName === 'Standalone Tractor';
      const isItemImpNone = !item.implementId || item.implementId === 'none' || item.implementName === 'Standalone Tractor';
      
      const matchImp = (isFormImpNone && isItemImpNone) ||
                       (formData.implementId && item.implementId && formData.implementId === item.implementId) ||
                       (formData.implementName && item.implementName && formData.implementName.trim().toLowerCase() === item.implementName.trim().toLowerCase());

      return matchTrac && matchImp;
    });
    if (matchedLoose) return matchedLoose.value;

    // 3. Fallback to first available comboOption
    return comboOptions[0]?.value || '';
  })();

  // Auto-lookup matching rate from Rate Card when Tractor, Implement or Date changes
  const lookupRate = (tractorId, implementId, date, unit) => {
    if (!tractorId) return null;
    if (!implementId || implementId === 'none') {
      const matched = rateMatrix.filter(r => 
        r.tractorId === tractorId && 
        (r.implementId === 'none' || !r.implementId) &&
        r.unit === unit &&
        r.effectiveDate <= date
      ).sort((a, b) => b.effectiveDate.localeCompare(a.effectiveDate))[0];
      return matched ? matched.rate : null;
    }

    const targetIds = implementId.split(',').map(s => s.trim());
    const matched = rateMatrix.filter(r => 
      r.tractorId === tractorId && 
      (targetIds.includes(r.implementId) || r.implementId === implementId || r.implementId === 'none') &&
      r.unit === unit &&
      r.effectiveDate <= date
    ).sort((a, b) => b.effectiveDate.localeCompare(a.effectiveDate))[0];

    return matched ? matched.rate : null;
  };

  // Handle Login User Assignment (Driver vs Collector)
  const applyLoginUserAssignment = (mode) => {
    setLoginUserAssignment(mode);
    if (mode === 'driver') {
      const matched = drivers.find(d => 
        (d.name && d.name.toLowerCase() === loggedUserName.toLowerCase()) ||
        (currentUser?.phone && d.phone && d.phone === currentUser.phone)
      );
      if (matched) {
        setFormData(prev => ({
          ...prev,
          driverId: matched.id,
          driverName: matched.name
        }));
      } else {
        setFormData(prev => ({
          ...prev,
          driverId: prev.driverId || (drivers[0] ? drivers[0].id : 'DRV-1'),
          driverName: loggedUserName
        }));
      }
    } else if (mode === 'collector') {
      const roleBadge = loggedUserRole === 'driver' ? 'Driver' : loggedUserRole === 'admin' ? 'Admin' : loggedUserRole === 'partner' ? 'Partner' : 'Collector';
      setFormData(prev => ({
        ...prev,
        collectedBy: `${loggedUserName} (${roleBadge})`
      }));
    }
  };

  // Single Select Combo Change handler: Sets Tractor + Implement + Unit + Rate & Auto-calculates!
  const handleSelectCombo = (val) => {
    const selected = comboOptions.find(o => o.value === val);
    if (!selected) return;

    let tracId = '';
    let tracName = '';
    let impId = 'none';
    let impName = 'Standalone Tractor';
    let unitVal = 'per_hour';
    let rateVal = '900';

    if (selected.rateItem) {
      const r = selected.rateItem;
      tracName = r.tractorName || (tractors[0] ? tractors[0].name : 'Tractor');
      tracId = r.tractorId;
      if (!tracId) {
        const foundT = tractors.find(t => r.tractorName && t.name.toLowerCase() === r.tractorName.toLowerCase());
        tracId = foundT ? foundT.id : (tractors[0] ? tractors[0].id : 'TRAC-01');
      }
      impId = r.implementId || 'none';
      impName = r.implementName || 'Standalone Tractor';
      if (impId === 'none' && r.implementName && r.implementName !== 'Standalone Tractor') {
        const foundI = implementsList.find(m => m.name.toLowerCase() === r.implementName.toLowerCase());
        if (foundI) impId = foundI.id;
      }
      unitVal = r.unit || 'per_hour';
      rateVal = (r.rate || '900').toString();
    } else if (selected.customCombo) {
      const c = selected.customCombo;
      tracId = c.tractorId || (tractors[0] ? tractors[0].id : 'TRAC-01');
      tracName = c.tractorName || (tractors[0] ? tractors[0].name : 'Tractor');
      impId = c.implementId;
      impName = c.implementName;
      unitVal = c.unit;
      rateVal = (c.rate || '900').toString();
    }

    setFormData(prev => {
      const qty = parseFloat(prev.quantity) || 0;
      const rt = parseFloat(rateVal) || 0;
      const disc = parseFloat(prev.discount) || 0;
      const gross = qty * rt;
      const net = Math.max(0, gross - disc);

      const impIds = impId && impId !== 'none' ? [impId] : [];
      const impNames = impName && impName !== 'Standalone Tractor' ? [impName] : [];

      const updated = {
        ...prev,
        tractorId: tracId,
        tractorName: tracName,
        implementId: impId,
        implementName: impName,
        implementIds: impIds,
        implementNames: impNames,
        billingUnit: unitVal,
        rate: rateVal,
        grossAmount: gross,
        totalAmount: net,
        workType: impName && impName !== 'Standalone Tractor' ? `${impName} Work` : prev.workType
      };

      if (!isCollectionActive) {
        updated.paidAmount = '0';
        updated.balanceAmount = net;
        updated.paymentStatus = 'unpaid';
      } else {
        if (prev.paymentStatus === 'paid') {
          updated.paidAmount = net.toString();
          updated.balanceAmount = 0;
        } else {
          const paid = parseFloat(prev.paidAmount) || 0;
          updated.balanceAmount = Math.max(0, net - paid);
        }
      }

      return updated;
    });
  };

  const handleOpenAdd = () => {
    const defaultCust = (customers && customers.length > 0) ? customers[0] : { id: 'CUST-01', name: 'General Customer' };
    const defaultDrv = (drivers && drivers.length > 0) ? drivers[0] : { id: 'DRV-01', name: 'Default Driver' };
    const defaultTrac = (tractors && tractors.length > 0) ? tractors[0] : { id: 'TRAC-01', name: 'Tractor' };
    const defaultImp = (implementsList && implementsList.length > 0) ? implementsList[0] : null;

    let maxNum = 1000;
    tripSheets.forEach(t => {
      if (t.id && typeof t.id === 'string') {
        const match = t.id.match(/TRP-(\d+)/i);
        if (match) {
          const num = parseInt(match[1], 10);
          if (num > maxNum) maxNum = num;
        }
      }
    });
    let nextNum = maxNum + 1;
    while (tripSheets.some(t => t.id === `TRP-${nextNum}`)) {
      nextNum++;
    }
    const newTripId = `TRP-${nextNum}`;
    const todayDate = new Date().toISOString().slice(0, 10);

    // Initial default from first comboOption if available
    let initialTracId = defaultTrac.id || 'TRAC-01';
    let initialTracName = defaultTrac.name || 'Tractor';
    let initialImpId = defaultImp ? (defaultImp.id || 'none') : 'none';
    let initialImpName = defaultImp ? (defaultImp.name || 'Standalone Tractor') : 'Standalone Tractor';
    let initialUnit = 'per_hour';
    let initialRate = '900';

    if (comboOptions && comboOptions.length > 0) {
      const firstOpt = comboOptions[0];
      const item = firstOpt.rateItem || firstOpt.customCombo;
      if (item) {
        initialTracId = item.tractorId || initialTracId;
        initialTracName = item.tractorName || initialTracName;
        initialImpId = item.implementId || initialImpId;
        initialImpName = item.implementName || initialImpName;
        initialUnit = item.unit || initialUnit;
        initialRate = (item.rate || initialRate).toString();
      }
    } else {
      const suggestedRate = lookupRate(initialTracId, initialImpId, todayDate, 'per_hour');
      if (suggestedRate) initialRate = suggestedRate.toString();
    }

    const initialImplementIds = initialImpId && initialImpId !== 'none' ? [initialImpId] : [];
    const initialImplementNames = initialImpName && initialImpName !== 'Standalone Tractor' ? [initialImpName] : [];

    const initialQty = '4';
    const gross = (parseFloat(initialQty) * parseFloat(initialRate)) || 3600;
    const net = gross;

    const isDriverRole = loggedUserRole === 'driver';
    const initAssignment = isDriverRole ? 'driver' : 'collector';

    let chosenDrvId = defaultDrv.id || 'DRV-01';
    let chosenDrvName = defaultDrv.name || 'Default Driver';
    if (initAssignment === 'driver') {
      const matchDrv = drivers.find(d => 
        (d.name && d.name.toLowerCase() === loggedUserName.toLowerCase()) ||
        (currentUser?.phone && d.phone && d.phone === currentUser.phone)
      );
      if (matchDrv) {
        chosenDrvId = matchDrv.id;
        chosenDrvName = matchDrv.name;
      } else {
        chosenDrvName = loggedUserName;
      }
    }

    const collectorString = initAssignment === 'collector'
      ? `${loggedUserName} (${loggedUserRole === 'admin' ? 'Admin' : loggedUserRole === 'partner' ? 'Partner' : 'Collector'})`
      : `${chosenDrvName} (Driver)`;

    setEditingItem(null);
    setFormError('');
    setIsCollectionActive(false);
    setTimeEntryMode('manual');
    setTimerSeconds(0);
    setTimerRunning(false);
    setTimerMessage('');
    setShowAdvancedFleet(false);
    setLoginUserAssignment(initAssignment);

    const currentTimeStr = getCurrentTimeFormatted();

    setFormData({
      id: newTripId,
      date: todayDate,
      startTime: currentTimeStr,
      endTime: currentTimeStr,
      customerId: defaultCust.id,
      customerName: defaultCust.name,
      driverId: chosenDrvId,
      driverName: chosenDrvName,
      tractorId: initialTracId,
      tractorName: initialTracName,
      implementId: initialImpId,
      implementName: initialImpName,
      implementIds: initialImplementIds,
      implementNames: initialImplementNames,
      workType: initialImpName && initialImpName !== 'Standalone Tractor' ? `${initialImpName} Work` : '5-Tyne Ploughing (5 கொழு உழவு)',
      workDescription: '',
      billingUnit: initialUnit,
      startMeter: '',
      endMeter: '',
      quantity: initialQty,
      rate: initialRate,
      grossAmount: gross,
      discount: '0',
      totalAmount: net,
      paidAmount: '0',
      balanceAmount: net,
      paymentStatus: 'unpaid',
      collectedBy: collectorString,
      collectedWhen: new Date().toISOString().slice(0, 16).replace('T', ' '),
      paymentMode: 'credit',
      driverBata: '400',
      notes: ''
    });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (trip, forceCollect = false) => {
    setEditingItem(trip);
    setFormError('');

    let tracId = trip.tractorId;
    let tracName = trip.tractorName;
    if (!tracId && tracName) {
      const matchT = tractors.find(t => t.name.toLowerCase() === tracName.toLowerCase());
      if (matchT) tracId = matchT.id;
    }
    if (!tracId && tractors.length > 0) {
      tracId = tractors[0].id;
      if (!tracName) tracName = tractors[0].name;
    }
    if (!tracId) {
      tracId = 'TRAC-01';
      if (!tracName) tracName = 'General Tractor';
    }

    let drvId = trip.driverId;
    let drvName = trip.driverName;
    if (!drvId && drvName) {
      const matchD = drivers.find(d => d.name.toLowerCase() === drvName.toLowerCase());
      if (matchD) drvId = matchD.id;
    }
    if (!drvId && drivers.length > 0) {
      drvId = drivers[0].id;
      if (!drvName) drvName = drivers[0].name;
    }
    if (!drvId) {
      drvId = 'DRV-01';
      if (!drvName) drvName = 'General Driver';
    }

    let custId = trip.customerId;
    let custName = trip.customerName;
    if (!custId && custName) {
      const matchC = customers.find(c => c.name && c.name.toLowerCase() === custName.toLowerCase());
      if (matchC) custId = matchC.id;
    }
    if (!custId && customers.length > 0) {
      custId = customers[0].id;
      if (!custName) custName = customers[0].name;
    }
    if (!custId) {
      custId = 'CUST-01';
      if (!custName) custName = 'General Customer';
    }

    let ids = [];
    if (Array.isArray(trip.implementIds) && trip.implementIds.length > 0) {
      ids = trip.implementIds;
    } else if (trip.implementId && trip.implementId !== 'none') {
      ids = trip.implementId.split(',').map(s => s.trim()).filter(Boolean);
    }
    const names = ids.map(id => {
      const found = implementsList.find(m => m.id === id);
      return found ? found.name : id;
    });

    const isPaid = parseFloat(trip.paidAmount) > 0 || trip.paymentStatus === 'paid' || trip.paymentStatus === 'partial';
    const activeCollection = forceCollect || isPaid;
    setIsCollectionActive(activeCollection);
    setTimeEntryMode('manual');
    setTimerSeconds(0);
    setTimerRunning(false);
    setTimerMessage('');
    setShowAdvancedFleet(ids.length > 1);

    if (drvName && drvName.toLowerCase() === loggedUserName.toLowerCase()) {
      setLoginUserAssignment('driver');
    } else if (trip.collectedBy && trip.collectedBy.toLowerCase().includes(loggedUserName.toLowerCase())) {
      setLoginUserAssignment('collector');
    } else {
      setLoginUserAssignment('none');
    }

    const net = parseFloat(trip.totalAmount) || 0;
    const paid = forceCollect ? net : (parseFloat(trip.paidAmount) || 0);
    const bal = Math.max(0, net - paid);

    setFormData({
      ...trip,
      tractorId: tracId,
      tractorName: tracName,
      driverId: drvId,
      driverName: drvName,
      customerId: custId,
      customerName: custName,
      paidAmount: paid.toString(),
      balanceAmount: bal,
      paymentStatus: forceCollect ? 'paid' : trip.paymentStatus,
      paymentMode: (forceCollect && (!trip.paymentMode || trip.paymentMode === 'credit')) ? 'cash' : trip.paymentMode,
      collectedBy: (forceCollect && !trip.collectedBy) ? `${loggedUserName} (Collector)` : (trip.collectedBy || ''),
      implementIds: ids,
      implementNames: names.length > 0 ? names : (trip.implementName ? [trip.implementName] : []),
      implementId: ids.join(','),
      implementName: trip.implementName || (names.length > 0 ? names.join(' + ') : 'Standalone Tractor')
    });
    setIsModalOpen(true);
  };

  const handleOpenCollect = (trip) => {
    handleOpenEdit(trip, true);
  };

  const handleToggleCollection = (checked) => {
    setIsCollectionActive(checked);
    setFormData(prev => {
      const net = parseFloat(prev.totalAmount) || 0;
      if (checked) {
        return {
          ...prev,
          paidAmount: net.toString(),
          balanceAmount: 0,
          paymentStatus: 'paid',
          paymentMode: prev.paymentMode === 'credit' ? 'cash' : (prev.paymentMode || 'cash'),
          collectedBy: prev.collectedBy || `${loggedUserName} (Collector)`,
          collectedWhen: prev.collectedWhen || new Date().toISOString().slice(0, 16).replace('T', ' ')
        };
      } else {
        return {
          ...prev,
          paidAmount: '0',
          balanceAmount: net,
          paymentStatus: 'unpaid',
          paymentMode: 'credit'
        };
      }
    });
  };

  // Stopwatch / Live Timer actions
  const handleStartPauseTimer = () => {
    setTimerRunning(prev => !prev);
  };

  const handleRestartTimer = () => {
    setTimerRunning(false);
    setTimerSeconds(0);
    setTimerMessage('');
  };

  const handleSetTimerToUnits = () => {
    const hrs = timerSeconds / 3600;
    const rounded = hrs < 0.05 ? 0.1 : Math.round(hrs * 100) / 100;
    
    const now = new Date();
    const endStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    const startObj = new Date(now.getTime() - timerSeconds * 1000);
    const startStr = `${String(startObj.getHours()).padStart(2, '0')}:${String(startObj.getMinutes()).padStart(2, '0')}`;

    setFormData(prev => {
      const rt = parseFloat(prev.rate) || 0;
      const disc = parseFloat(prev.discount) || 0;
      const gross = rounded * rt;
      const net = Math.max(0, gross - disc);
      return {
        ...prev,
        quantity: rounded.toString(),
        startTime: startStr,
        endTime: endStr,
        grossAmount: gross,
        totalAmount: net,
        paidAmount: isCollectionActive ? (prev.paymentStatus === 'paid' ? net.toString() : prev.paidAmount) : '0',
        balanceAmount: isCollectionActive ? Math.max(0, net - (parseFloat(prev.paidAmount) || 0)) : net,
        paymentStatus: isCollectionActive ? (prev.paymentStatus === 'unpaid' ? 'paid' : prev.paymentStatus) : 'unpaid'
      };
    });

    setTimerMessage(
      lang === 'ta' 
        ? `✅ நேர அளவு (${formatTimer(timerSeconds)}) -> ${rounded} மணியாக அமைக்கப்பட்டது! மொத்தம்: ₹${Math.round(rounded * parseFloat(formData.rate))}` 
        : `✅ Time elapsed (${formatTimer(timerSeconds)}) set as ${rounded} hrs! Total: ₹${Math.round(rounded * parseFloat(formData.rate))}`
    );
    setTimeout(() => setTimerMessage(''), 4000);
  };

  const handleFieldChange = (field, value) => {
    setFormData(prev => {
      const updated = { ...prev, [field]: value };

      if (field === 'customerId') {
        const found = customers.find(c => c.id === value);
        if (found) updated.customerName = found.name;
      }

      if (field === 'driverId') {
        const found = drivers.find(d => d.id === value);
        if (found) {
          updated.driverName = found.name;
          if (loginUserAssignment !== 'collector' && (!prev.collectedBy || prev.collectedBy.includes('Driver'))) {
            updated.collectedBy = `${found.name} (Driver)`;
          }
        }
      }

      if (field === 'tractorId') {
        const found = tractors.find(t => t.id === value);
        if (found) updated.tractorName = found.name;
        const suggestedRate = lookupRate(value, updated.implementId, updated.date, updated.billingUnit);
        if (suggestedRate) updated.rate = suggestedRate;
      }

      if (field === 'implementId') {
        const found = implementsList.find(m => m.id === value);
        updated.implementName = found ? found.name : 'Standalone Tractor';
        const suggestedRate = lookupRate(updated.tractorId, value, updated.date, updated.billingUnit);
        if (suggestedRate) updated.rate = suggestedRate;
      }

      if (field === 'billingUnit') {
        const suggestedRate = lookupRate(updated.tractorId, updated.implementId, updated.date, value);
        if (suggestedRate) updated.rate = suggestedRate;
      }

      if (field === 'startMeter' || field === 'endMeter') {
        const start = parseFloat(field === 'startMeter' ? value : updated.startMeter);
        const end = parseFloat(field === 'endMeter' ? value : updated.endMeter);
        if (!isNaN(start) && !isNaN(end) && end >= start) {
          updated.quantity = (end - start).toFixed(1);
        }
      }

      // Start & End Time duration calculation
      if (field === 'startTime' || field === 'endTime') {
        const sTime = field === 'startTime' ? value : updated.startTime;
        const eTime = field === 'endTime' ? value : updated.endTime;
        if (sTime && eTime) {
          const [sh, sm] = sTime.split(':').map(Number);
          const [eh, em] = eTime.split(':').map(Number);
          if (!isNaN(sh) && !isNaN(sm) && !isNaN(eh) && !isNaN(em)) {
            const startMins = sh * 60 + sm;
            const endMins = eh * 60 + em;
            const diffMins = endMins >= startMins ? (endMins - startMins) : (endMins + 1440 - startMins);
            if (diffMins > 0) {
              const diffHours = diffMins / 60;
              const roundedHours = Math.max(0.1, Math.round(diffHours * 100) / 100);
              if (updated.billingUnit === 'per_hour') {
                updated.quantity = roundedHours.toString();
              }
            }
          }
        }
      }

      const qty = parseFloat(field === 'quantity' ? value : updated.quantity) || 0;
      const rt = parseFloat(field === 'rate' ? value : updated.rate) || 0;
      const disc = parseFloat(field === 'discount' ? value : updated.discount) || 0;
      
      const gross = qty * rt;
      const net = Math.max(0, gross - disc);
      updated.grossAmount = gross;
      updated.totalAmount = net;

      if (!isCollectionActive) {
        updated.paidAmount = '0';
        updated.balanceAmount = net;
        updated.paymentStatus = 'unpaid';
        updated.paymentMode = 'credit';
      } else {
        if (field === 'paymentStatus') {
          if (value === 'paid') {
            updated.paidAmount = net.toString();
            updated.balanceAmount = 0;
          } else if (value === 'unpaid') {
            updated.paidAmount = '0';
            updated.balanceAmount = net;
            updated.paymentMode = 'credit';
          }
        } else if (field === 'paidAmount') {
          const paid = parseFloat(value) || 0;
          updated.balanceAmount = Math.max(0, net - paid);
          if (paid >= net && net > 0) {
            updated.paymentStatus = 'paid';
          } else if (paid > 0 && paid < net) {
            updated.paymentStatus = 'partial';
          } else if (paid === 0) {
            updated.paymentStatus = 'unpaid';
          }
        } else {
          // If totalAmount was recalculated, sync payment amounts
          if (updated.paymentStatus === 'paid') {
            updated.paidAmount = net.toString();
            updated.balanceAmount = 0;
          } else {
            const paid = parseFloat(updated.paidAmount) || 0;
            updated.balanceAmount = Math.max(0, net - paid);
          }
        }
      }

      return updated;
    });
  };

  const handleAddImplement = (impId) => {
    if (!impId || impId === 'none') return;
    setFormData(prev => {
      const currentIds = prev.implementIds || [];
      if (currentIds.includes(impId)) return prev;
      const newIds = [...currentIds, impId];
      const newNames = newIds.map(id => {
        const found = implementsList.find(m => m.id === id);
        return found ? found.name : id;
      });
      const newImpName = newNames.join(' + ');
      const newImpId = newIds.join(',');

      const suggestedRate = lookupRate(prev.tractorId, impId, prev.date, prev.billingUnit) ||
                            lookupRate(prev.tractorId, newIds[0], prev.date, prev.billingUnit);

      const updated = {
        ...prev,
        implementIds: newIds,
        implementNames: newNames,
        implementId: newImpId,
        implementName: newImpName
      };

      if (suggestedRate) {
        updated.rate = suggestedRate;
        const qty = parseFloat(prev.quantity) || 0;
        const disc = parseFloat(prev.discount) || 0;
        const gross = qty * parseFloat(suggestedRate);
        const net = Math.max(0, gross - disc);
        updated.grossAmount = gross;
        updated.totalAmount = net;
        if (!isCollectionActive) {
          updated.paidAmount = '0';
          updated.balanceAmount = net;
          updated.paymentStatus = 'unpaid';
        } else {
          if (prev.paymentStatus === 'paid') {
            updated.paidAmount = net.toString();
            updated.balanceAmount = 0;
          } else if (prev.paymentStatus === 'unpaid') {
            updated.paidAmount = '0';
            updated.balanceAmount = net;
          } else {
            const paid = parseFloat(prev.paidAmount) || 0;
            updated.balanceAmount = Math.max(0, net - paid);
          }
        }
      }

      return updated;
    });
  };

  const handleRemoveImplement = (impIdToRemove) => {
    setFormData(prev => {
      const currentIds = prev.implementIds || [];
      const newIds = currentIds.filter(id => id !== impIdToRemove);
      const newNames = newIds.map(id => {
        const found = implementsList.find(m => m.id === id);
        return found ? found.name : id;
      });
      const newImpName = newNames.length > 0 ? newNames.join(' + ') : 'Standalone Tractor';
      const newImpId = newIds.length > 0 ? newIds.join(',') : 'none';

      const suggestedRate = newIds.length > 0 
        ? lookupRate(prev.tractorId, newIds[0], prev.date, prev.billingUnit)
        : lookupRate(prev.tractorId, 'none', prev.date, prev.billingUnit);

      const updated = {
        ...prev,
        implementIds: newIds,
        implementNames: newNames,
        implementId: newImpId,
        implementName: newImpName
      };

      if (suggestedRate) {
        updated.rate = suggestedRate;
        const qty = parseFloat(prev.quantity) || 0;
        const disc = parseFloat(prev.discount) || 0;
        const gross = qty * parseFloat(suggestedRate);
        const net = Math.max(0, gross - disc);
        updated.grossAmount = gross;
        updated.totalAmount = net;
        if (!isCollectionActive) {
          updated.paidAmount = '0';
          updated.balanceAmount = net;
          updated.paymentStatus = 'unpaid';
        } else {
          if (prev.paymentStatus === 'paid') {
            updated.paidAmount = net.toString();
            updated.balanceAmount = 0;
          } else if (prev.paymentStatus === 'unpaid') {
            updated.paidAmount = '0';
            updated.balanceAmount = net;
          } else {
            const paid = parseFloat(prev.paidAmount) || 0;
            updated.balanceAmount = Math.max(0, net - paid);
          }
        }
      }

      return updated;
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setFormError('');

    // Auto-resolve tractorId, driverId & customerId if missing
    let resolvedTractorId = formData.tractorId;
    let resolvedTractorName = formData.tractorName;
    if (!resolvedTractorId && resolvedTractorName) {
      const matchT = tractors.find(t => t.name.toLowerCase() === resolvedTractorName.toLowerCase());
      if (matchT) resolvedTractorId = matchT.id;
    }
    if (!resolvedTractorId && tractors.length > 0) {
      resolvedTractorId = tractors[0].id;
      if (!resolvedTractorName) resolvedTractorName = tractors[0].name;
    }
    if (!resolvedTractorId) {
      resolvedTractorId = 'TRAC-01';
      if (!resolvedTractorName) resolvedTractorName = 'General Tractor';
    }

    let resolvedDriverId = formData.driverId;
    let resolvedDriverName = formData.driverName;
    if (!resolvedDriverId && resolvedDriverName) {
      const matchD = drivers.find(d => d.name.toLowerCase() === resolvedDriverName.toLowerCase());
      if (matchD) resolvedDriverId = matchD.id;
    }
    if (!resolvedDriverId && drivers.length > 0) {
      resolvedDriverId = drivers[0].id;
      if (!resolvedDriverName) resolvedDriverName = drivers[0].name;
    }
    if (!resolvedDriverId) {
      resolvedDriverId = 'DRV-01';
      if (!resolvedDriverName) resolvedDriverName = 'General Driver';
    }

    let resolvedCustomerId = formData.customerId;
    let resolvedCustomerName = formData.customerName;
    if (!resolvedCustomerId && resolvedCustomerName) {
      const matchC = customers.find(c => c.name && c.name.toLowerCase() === resolvedCustomerName.toLowerCase());
      if (matchC) resolvedCustomerId = matchC.id;
    }
    if (!resolvedCustomerId && customers.length > 0) {
      resolvedCustomerId = customers[0].id;
      if (!resolvedCustomerName) resolvedCustomerName = customers[0].name;
    }
    if (!resolvedCustomerId) {
      resolvedCustomerId = 'CUST-01';
      if (!resolvedCustomerName) resolvedCustomerName = 'General Customer';
    }

    if (!resolvedCustomerId) {
      setFormError(lang === 'ta' ? 'விவசாயி / வாடிக்கையாளரை தேர்வு செய்யவும்!' : 'Please select a Customer / Farmer!');
      return;
    }
    if (!resolvedDriverId) {
      setFormError(lang === 'ta' ? 'ஓட்டுநரை தேர்வு செய்யவும்!' : 'Please select a Driver / Operator!');
      return;
    }
    if (!resolvedTractorId) {
      setFormError(lang === 'ta' ? 'டிராக்டரை தேர்வு செய்யவும்!' : 'Please select a Tractor!');
      return;
    }
    if (!formData.date) {
      setFormError(lang === 'ta' ? 'டிரிப் தேதி அவசியம்!' : 'Trip date is required!');
      return;
    }

    if (formData.startMeter !== '' && formData.startMeter !== undefined &&
        formData.endMeter !== '' && formData.endMeter !== undefined) {
      const s = Number(formData.startMeter);
      const e = Number(formData.endMeter);
      if (isNaN(s) || s < 0) {
        setFormError(lang === 'ta' ? 'தொடக்க மீட்டர் அளவு செல்லுபடியாகவில்லை!' : 'Start Hour Meter must be a valid non-negative number!');
        return;
      }
      if (isNaN(e) || e < 0) {
        setFormError(lang === 'ta' ? 'முடிவு மீட்டர் அளவு செல்லுபடியாகவில்லை!' : 'End Hour Meter must be a valid non-negative number!');
        return;
      }
      if (e < s) {
        setFormError(lang === 'ta' ? `முடிவு மீட்டர் (${e}) தொடக்க மீட்டரை (${s}) விட குறைவாக இருக்க முடியாது!` : `End Hour Meter (${e}) cannot be less than Start Hour Meter (${s})!`);
        return;
      }
    }

    const qtyVal = validatePositiveNumber(formData.quantity, lang === 'ta' ? 'வேலை அளவு (மணி / ஏக்கர்)' : 'Quantity / Hours', false);
    if (!qtyVal.valid) {
      setFormError(qtyVal.error);
      return;
    }

    const rateVal = validatePositiveNumber(formData.rate, lang === 'ta' ? 'வாடகை கட்டணம்' : 'Billing Rate', false);
    if (!rateVal.valid) {
      setFormError(rateVal.error);
      return;
    }

    const gross = qtyVal.value * rateVal.value;
    if (formData.discount !== undefined && formData.discount !== '') {
      const disc = Number(formData.discount);
      if (isNaN(disc) || disc < 0) {
        setFormError(lang === 'ta' ? 'தள்ளுபடி தொகை செல்லுபடியாகவில்லை!' : 'Discount must be a valid non-negative number!');
        return;
      }
      if (disc > gross) {
        setFormError(lang === 'ta' ? `தள்ளுபடி (₹${disc}) மொத்த தொகையை (₹${gross}) விட அதிகமாக இருக்க முடியாது!` : `Discount (₹${disc}) cannot exceed Gross Total Amount (₹${gross})!`);
        return;
      }
    }

    const finalIds = formData.implementIds || [];
    const finalNames = finalIds.map(id => {
      const found = implementsList.find(m => m.id === id);
      return found ? found.name : id;
    });

    const netTotal = Math.max(0, gross - (parseFloat(formData.discount) || 0));

    let finalPaid = '0';
    let finalBal = netTotal;
    let finalStatus = 'unpaid';
    let finalMode = 'credit';
    let finalCollectedBy = formData.collectedBy || '';
    let finalCollectedWhen = formData.collectedWhen || '';

    if (isCollectionActive) {
      finalPaid = parseFloat(formData.paidAmount) || 0;
      finalBal = Math.max(0, netTotal - finalPaid);
      finalStatus = finalPaid >= netTotal ? 'paid' : (finalPaid > 0 ? 'partial' : 'unpaid');
      finalMode = formData.paymentMode || 'cash';
    } else {
      finalPaid = 0;
      finalBal = netTotal;
      finalStatus = 'unpaid';
      finalMode = 'credit';
    }

    const finalPayload = {
      ...formData,
      _isEditing: Boolean(editingItem),
      customerId: resolvedCustomerId,
      customerName: resolvedCustomerName,
      tractorId: resolvedTractorId,
      tractorName: resolvedTractorName,
      driverId: resolvedDriverId,
      driverName: resolvedDriverName,
      grossAmount: gross,
      totalAmount: netTotal,
      paidAmount: finalPaid,
      balanceAmount: finalBal,
      paymentStatus: finalStatus,
      paymentMode: finalMode,
      collectedBy: finalCollectedBy,
      collectedWhen: finalCollectedWhen,
      implementIds: finalIds,
      implementNames: finalNames,
      implementId: finalIds.length > 0 ? finalIds.join(',') : (formData.implementId || 'none'),
      implementName: finalNames.length > 0 ? finalNames.join(' + ') : (formData.implementName || 'Standalone Tractor')
    };

    const res = onSaveTrip(finalPayload);
    if (res && res.success === false) {
      setFormError(res.error || 'Failed to save trip sheet.');
      return;
    }

    setIsModalOpen(false);
  };

  const filteredTrips = tripSheets.filter(t => {
    const matchesSearch = (t.id || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                          (t.customerName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                          (t.driverName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                          (t.tractorName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                          (t.workDescription || '').toLowerCase().includes(searchTerm.toLowerCase());
    
    let matchesStatus = true;
    if (statusFilter === 'unpaid') {
      matchesStatus = t.paymentStatus === 'unpaid' || parseFloat(t.balanceAmount) > 0;
    } else if (statusFilter !== 'all') {
      matchesStatus = t.paymentStatus === statusFilter;
    }

    return matchesSearch && matchesStatus;
  });

  const pendingTripsCount = tripSheets.filter(t => parseFloat(t.balanceAmount) > 0 || t.paymentStatus === 'unpaid').length;
  const paidTripsCount = tripSheets.filter(t => t.paymentStatus === 'paid' && parseFloat(t.balanceAmount) === 0).length;

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
          <span>{lang === 'ta' ? 'புதிய டிரிப் சீட்டு' : 'New Trip Sheet'}</span>
        </button>
      </div>

      {/* Quick Filter Status Badges */}
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
        <button
          type="button"
          className={`btn btn-sm ${statusFilter === 'all' ? 'btn-primary' : 'btn-outline'}`}
          onClick={() => setStatusFilter('all')}
          style={{ borderRadius: '20px', padding: '0.35rem 0.85rem' }}
        >
          {lang === 'ta' ? 'அனைத்து டிரிப்கள்' : 'All Trips'} ({tripSheets.length})
        </button>
        <button
          type="button"
          className="btn btn-sm"
          onClick={() => setStatusFilter('unpaid')}
          style={{
            borderRadius: '20px',
            padding: '0.35rem 0.85rem',
            background: statusFilter === 'unpaid' ? '#ef4444' : '#fee2e2',
            color: statusFilter === 'unpaid' ? '#ffffff' : '#991b1b',
            border: '1px solid #fca5a5',
            fontWeight: 700
          }}
        >
          ⏳ {lang === 'ta' ? 'நிலுவை வசூல் பட்டியல்' : 'Pending Collections'} ({pendingTripsCount})
        </button>
        <button
          type="button"
          className="btn btn-sm"
          onClick={() => setStatusFilter('paid')}
          style={{
            borderRadius: '20px',
            padding: '0.35rem 0.85rem',
            background: statusFilter === 'paid' ? '#10b981' : '#dcfce7',
            color: statusFilter === 'paid' ? '#ffffff' : '#166534',
            border: '1px solid #86efac',
            fontWeight: 700
          }}
        >
          ✅ {lang === 'ta' ? 'முழுவதும் வசூலிக்கப்பட்டது' : 'Fully Paid'} ({paidTripsCount})
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
          <option value="unpaid">{t.unpaid} (Pending Collection)</option>
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
              {filteredTrips.map(trip => {
                const hasPendingBalance = parseFloat(trip.balanceAmount) > 0;
                return (
                  <tr 
                    key={trip.id} 
                    onClick={() => handleOpenEdit(trip)} 
                    style={{ cursor: 'pointer' }}
                    title={lang === 'ta' ? 'கிளிக் செய்து திருத்த அல்லது பணம் வசூலிக்க' : 'Click to view / collect payment'}
                  >
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
                    <td style={{ fontSize: '0.85rem' }}>
                      <span style={{ fontWeight: 600 }}>{trip.driverName}</span>
                    </td>
                    <td>
                      <div style={{ fontSize: '0.825rem', fontWeight: 600 }}>{trip.tractorName}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-light)', display: 'flex', flexWrap: 'wrap', gap: '3px', marginTop: '2px' }}>
                        {trip.implementName ? trip.implementName.split(' + ').map((name, idx) => (
                          <span key={idx} style={{
                            background: 'rgba(99, 102, 241, 0.1)',
                            color: 'var(--primary-700, #4338ca)',
                            borderRadius: '4px',
                            padding: '1px 5px',
                            fontSize: '0.7rem',
                            fontWeight: 500
                          }}>
                            {name}
                          </span>
                        )) : <span style={{ color: 'var(--text-light)' }}>Standalone Tractor</span>}
                      </div>
                    </td>
                    <td>
                      <div style={{ fontWeight: 600 }}>{trip.quantity} {trip.billingUnit === 'per_hour' ? 'hrs' : trip.billingUnit === 'per_acre' ? 'acres' : trip.billingUnit}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-light)' }}>@ ₹{trip.rate}</div>
                    </td>
                    <td style={{ fontWeight: 700 }}>₹{trip.totalAmount}</td>
                    <td style={{ fontWeight: 700, color: '#16a34a' }}>₹{trip.paidAmount}</td>
                    <td>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', alignItems: 'flex-start' }}>
                        <span style={{ 
                          fontWeight: 800, 
                          color: hasPendingBalance ? '#dc2626' : '#16a34a' 
                        }}>
                          ₹{trip.balanceAmount}
                        </span>
                        {hasPendingBalance && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleOpenCollect(trip);
                            }}
                            style={{
                              background: 'linear-gradient(135deg, #f59e0b, #d97706)',
                              color: '#ffffff',
                              border: 'none',
                              borderRadius: '4px',
                              padding: '2px 6px',
                              fontSize: '0.7rem',
                              fontWeight: 700,
                              cursor: 'pointer',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '2px',
                              boxShadow: '0 1px 2px rgba(0,0,0,0.1)'
                            }}
                            title="Collect payment now"
                          >
                            💰 {lang === 'ta' ? 'வசூலி' : 'Collect'}
                          </button>
                        )}
                      </div>
                    </td>
                    <td>
                      <div style={{ fontSize: '0.8rem', fontWeight: 600 }}>
                        {trip.collectedBy ? trip.collectedBy : '--'}
                      </div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-light)' }}>
                        {trip.paymentMode ? trip.paymentMode.toUpperCase() : ''} • {trip.collectedWhen ? trip.collectedWhen.slice(0, 10) : ''}
                      </div>
                    </td>
                    <td>
                      <span className={`badge ${
                        trip.paymentStatus === 'paid' ? 'badge-paid' :
                        trip.paymentStatus === 'partial' ? 'badge-partial' : 'badge-unpaid'
                      }`}>
                        {trip.paymentStatus === 'paid' ? t.paid :
                         trip.paymentStatus === 'partial' ? t.partial : (lang === 'ta' ? 'நிலுவை' : 'Pending')}
                      </span>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <div style={{ display: 'inline-flex', gap: '0.35rem' }} onClick={(e) => e.stopPropagation()}>
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
                );
              })}
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
        <div className="modal-overlay" onClick={() => setIsModalOpen(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '820px' }}>
            <div className="modal-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h3 style={{ margin: 0 }}>
                  {editingItem ? `${t.edit} Trip: ${editingItem.id}` : (lang === 'ta' ? 'புதிய உழவு டிரிப் சீட்டு' : 'New Tractor Trip Sheet')}
                </h3>
              </div>
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

                {/* 1. Customer Name */}
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

                {/* 2. Driver / Labor Name (with subtle button to set logged in user as driver) */}
                <div className="form-group">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem' }}>
                    <label style={{ margin: 0, fontWeight: 600 }}>{t.driverName} *</label>
                    <button
                      type="button"
                      onClick={() => applyLoginUserAssignment('driver')}
                      style={{
                        background: loginUserAssignment === 'driver' ? '#e0f2fe' : 'none',
                        border: loginUserAssignment === 'driver' ? '1px solid #7dd3fc' : 'none',
                        color: loginUserAssignment === 'driver' ? '#0369a1' : 'var(--primary-700)',
                        fontSize: '0.75rem',
                        cursor: 'pointer',
                        fontWeight: 600,
                        padding: '2px 6px',
                        borderRadius: '4px'
                      }}
                      title="Set logged in user as driver"
                    >
                      🚜 {lang === 'ta' ? 'நான் தான் ஓட்டுநர் (D)' : 'I am the Driver (D)'}
                    </button>
                  </div>
                  <SearchableSelect
                    label=""
                    value={formData.driverId}
                    onChange={(val) => handleFieldChange('driverId', val)}
                    options={drivers.map(d => ({ 
                      value: d.id, 
                      label: d.name + (d.name.toLowerCase() === loggedUserName.toLowerCase() ? ' (You)' : ''), 
                      subLabel: d.phone || '', 
                      badge: d.wageType || '' 
                    }))}
                    placeholder="-- Select Driver --"
                    searchPlaceholder={lang === 'ta' ? 'ஓட்டுநரைத் தேட...' : 'Search driver...'}
                    required
                    lang={lang}
                  />
                </div>

                {/* 3. Single Select: Tractor + Implement (Rate Card Combo) */}
                <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                  <SearchableSelect
                    label={`${lang === 'ta' ? 'டிராக்டர் + கருவி சேர்க்கை (விலை அட்டை)' : 'Tractor + Implement (Rate Card Combo)'} *`}
                    value={currentComboValue}
                    onChange={handleSelectCombo}
                    options={comboOptions}
                    placeholder={lang === 'ta' ? '-- டிராக்டர் + கருவி சேர்க்கை தேர்வு செய்க --' : '-- Select Tractor + Implement --'}
                    searchPlaceholder={lang === 'ta' ? 'தேடு (SWARAJ, Rotavator, 5-Tyne)...' : 'Search (SWARAJ, Rotavator, Cultivator)...'}
                    required
                    lang={lang}
                  />

                  {/* Active Selection Summary Card */}
                  {formData.tractorName && (
                    <div style={{
                      marginTop: '0.45rem',
                      padding: '0.5rem 0.85rem',
                      background: 'linear-gradient(135deg, #f0fdf4 0%, #f8fafc 100%)',
                      border: '1.5px solid #bbf7d0',
                      borderRadius: '8px',
                      fontSize: '0.825rem',
                      display: 'flex',
                      flexWrap: 'wrap',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: '0.5rem'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
                        <span style={{ fontWeight: 700, color: '#166534' }}>
                          🚜 {formData.tractorName}
                        </span>
                        <span style={{ color: '#cbd5e1' }}>|</span>
                        <span style={{ fontWeight: 600, color: '#3730a3' }}>
                          ⚙️ {formData.implementName || 'Standalone Tractor'}
                        </span>
                        <span style={{ color: '#cbd5e1' }}>|</span>
                        <span style={{ fontWeight: 800, color: '#047857' }}>
                          🏷️ ₹{formData.rate} / {formData.billingUnit === 'per_hour' ? (lang === 'ta' ? 'மணி' : 'hr') : formData.billingUnit === 'per_acre' ? (lang === 'ta' ? 'ஏக்கர்' : 'acre') : formData.billingUnit === 'per_km' ? 'km' : 'trip'}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setShowAdvancedFleet(prev => !prev)}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: '#0284c7',
                          fontSize: '0.75rem',
                          cursor: 'pointer',
                          textDecoration: 'underline',
                          fontWeight: 600
                        }}
                      >
                        {showAdvancedFleet ? (lang === 'ta' ? 'சுருக்கு' : 'Hide Multi-Implement') : (lang === 'ta' ? '+ ஒன்றுக்கு மேற்பட்ட கருவிகள்' : '+ Attach More Implements')}
                      </button>
                    </div>
                  )}

                  {/* Multi-implement drawer if user clicks "+ Attach More Implements" */}
                  {showAdvancedFleet && (
                    <div style={{
                      marginTop: '0.5rem',
                      padding: '0.75rem',
                      background: '#f8fafc',
                      border: '1px dashed #cbd5e1',
                      borderRadius: '8px'
                    }}>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem', marginBottom: '0.5rem' }}>
                        {(formData.implementIds || []).map(impId => {
                          const found = implementsList.find(m => m.id === impId);
                          return (
                            <span
                              key={impId}
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '0.35rem',
                                background: '#e0e7ff',
                                color: '#3730a3',
                                padding: '0.25rem 0.5rem',
                                borderRadius: '9999px',
                                fontSize: '0.78rem',
                                fontWeight: 600
                              }}
                            >
                              ⚙️ {found ? found.name : impId}
                              <button
                                type="button"
                                onClick={() => handleRemoveImplement(impId)}
                                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#4338ca', padding: 0 }}
                              >
                                <X size={12} />
                              </button>
                            </span>
                          );
                        })}
                      </div>

                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem' }}>
                        {implementsList.filter(imp => !(formData.implementIds || []).includes(imp.id)).slice(0, 6).map(imp => (
                          <button
                            key={imp.id}
                            type="button"
                            onClick={() => handleAddImplement(imp.id)}
                            style={{
                              background: '#ffffff',
                              border: '1px solid #cbd5e1',
                              color: '#334155',
                              fontSize: '0.72rem',
                              padding: '0.2rem 0.5rem',
                              borderRadius: '4px',
                              cursor: 'pointer'
                            }}
                          >
                            + {imp.name}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* 4. Work Date */}
                <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                  <DatePicker
                    label={t.tripDate}
                    value={formData.date}
                    onChange={(val) => handleFieldChange('date', val)}
                    required
                    lang={lang}
                  />
                </div>

                {/* 5. Time & Hours Entry Mode: Manual vs Live Timer with Start, Pause, Set, Restart */}
                <div style={{
                  gridColumn: '1 / -1',
                  background: 'var(--bg-subtle, #f8fafc)',
                  border: '1px solid var(--border-color, #e2e8f0)',
                  borderRadius: '10px',
                  padding: '0.85rem'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                    <div style={{ fontWeight: 700, fontSize: '0.875rem', color: 'var(--text-main)' }}>
                      ⏱️ {t.timeTrackingMode || 'Time Entry Mode'}
                    </div>
                    <div style={{ display: 'inline-flex', borderRadius: '8px', border: '1px solid #cbd5e1', overflow: 'hidden' }}>
                      <button
                        type="button"
                        onClick={() => setTimeEntryMode('manual')}
                        style={{
                          padding: '0.35rem 0.75rem',
                          fontSize: '0.8rem',
                          fontWeight: 700,
                          border: 'none',
                          cursor: 'pointer',
                          background: timeEntryMode === 'manual' ? '#0f766e' : '#ffffff',
                          color: timeEntryMode === 'manual' ? '#ffffff' : '#475569'
                        }}
                      >
                        🕒 {t.manualTime || 'Manual Time'}
                      </button>
                      <button
                        type="button"
                        onClick={() => setTimeEntryMode('timer')}
                        style={{
                          padding: '0.35rem 0.75rem',
                          fontSize: '0.8rem',
                          fontWeight: 700,
                          border: 'none',
                          cursor: 'pointer',
                          background: timeEntryMode === 'timer' ? '#0f766e' : '#ffffff',
                          color: timeEntryMode === 'timer' ? '#ffffff' : '#475569'
                        }}
                      >
                        ⏱️ {t.liveTimer || 'Live Timer (Start/Pause/Set)'}
                      </button>
                    </div>
                  </div>

                  {timeEntryMode === 'manual' ? (
                    <div className="form-grid" style={{ marginBottom: 0 }}>
                      <div className="form-group">
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem' }}>
                          <label style={{ margin: 0 }}>{t.startTime}</label>
                          <button
                            type="button"
                            onClick={() => handleFieldChange('startTime', getCurrentTimeFormatted())}
                            style={{
                              background: 'none',
                              border: 'none',
                              color: 'var(--primary-700)',
                              fontSize: '0.72rem',
                              cursor: 'pointer',
                              fontWeight: 600,
                              textDecoration: 'underline',
                              padding: 0
                            }}
                            title="Set to Current Time"
                          >
                            🕒 {lang === 'ta' ? 'இப்போது (Current)' : 'Now (Current)'}
                          </button>
                        </div>
                        <input
                          type="time"
                          className="form-control"
                          value={formData.startTime}
                          onChange={(e) => handleFieldChange('startTime', e.target.value)}
                        />
                      </div>
                      <div className="form-group">
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem' }}>
                          <label style={{ margin: 0 }}>{t.endTime}</label>
                          <button
                            type="button"
                            onClick={() => handleFieldChange('endTime', getCurrentTimeFormatted())}
                            style={{
                              background: 'none',
                              border: 'none',
                              color: 'var(--primary-700)',
                              fontSize: '0.72rem',
                              cursor: 'pointer',
                              fontWeight: 600,
                              textDecoration: 'underline',
                              padding: 0
                            }}
                            title="Set to Current Time"
                          >
                            🕒 {lang === 'ta' ? 'இப்போது (Current)' : 'Now (Current)'}
                          </button>
                        </div>
                        <input
                          type="time"
                          className="form-control"
                          value={formData.endTime}
                          onChange={(e) => handleFieldChange('endTime', e.target.value)}
                        />
                      </div>
                    </div>
                  ) : (
                    /* Live Timer UI with 3 Configuration Buttons: Start/Pause, Set, Restart */
                    <div style={{
                      background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
                      color: '#38bdf8',
                      borderRadius: '12px',
                      padding: '1.25rem',
                      textAlign: 'center',
                      boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                      border: '1px solid #334155'
                    }}>
                      <div style={{ fontSize: '0.75rem', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '0.25rem' }}>
                        {lang === 'ta' ? 'லைவ் ஸ்டாப்வாட்ச் நேரக் கண்காணிப்பு' : 'Live Field Work Stopwatch'}
                      </div>
                      <div style={{
                        fontFamily: 'monospace',
                        fontSize: '2.5rem',
                        fontWeight: 800,
                        color: timerRunning ? '#4ade80' : '#f8fafc',
                        letterSpacing: '2px',
                        textShadow: timerRunning ? '0 0 12px rgba(74,222,128,0.4)' : 'none',
                        margin: '0.5rem 0'
                      }}>
                        {formatTimer(timerSeconds)}
                      </div>
                      {timerMessage && (
                        <div style={{ color: '#86efac', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.5rem' }}>
                          {timerMessage}
                        </div>
                      )}
                      <div style={{ display: 'flex', justifyContent: 'center', gap: '0.5rem', flexWrap: 'wrap', marginTop: '0.5rem' }}>
                        <button
                          type="button"
                          onClick={handleStartPauseTimer}
                          style={{
                            padding: '0.5rem 1.1rem',
                            borderRadius: '8px',
                            fontWeight: 700,
                            fontSize: '0.85rem',
                            cursor: 'pointer',
                            border: 'none',
                            background: timerRunning ? '#f59e0b' : '#10b981',
                            color: '#ffffff',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.35rem',
                            boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
                          }}
                        >
                          {timerRunning ? (
                            <>
                              <Pause size={16} />
                              <span>{t.pauseTimer || 'Pause'}</span>
                            </>
                          ) : (
                            <>
                              <Play size={16} />
                              <span>{timerSeconds > 0 ? (lang === 'ta' ? 'மீண்டும் தொடங்கு' : 'Resume') : (t.startTimer || 'Start')}</span>
                            </>
                          )}
                        </button>
                        <button
                          type="button"
                          onClick={handleSetTimerToUnits}
                          style={{
                            padding: '0.5rem 1.1rem',
                            borderRadius: '8px',
                            fontWeight: 700,
                            fontSize: '0.85rem',
                            cursor: 'pointer',
                            border: 'none',
                            background: '#3b82f6',
                            color: '#ffffff',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.35rem',
                            boxShadow: '0 2px 4px rgba(59,130,246,0.3)'
                          }}
                        >
                          <Zap size={16} />
                          <span>{t.setTimer || 'Set to Bill'}</span>
                        </button>
                        <button
                          type="button"
                          onClick={handleRestartTimer}
                          style={{
                            padding: '0.5rem 1.1rem',
                            borderRadius: '8px',
                            fontWeight: 600,
                            fontSize: '0.85rem',
                            cursor: 'pointer',
                            border: '1px solid #475569',
                            background: 'rgba(255,255,255,0.08)',
                            color: '#cbd5e1',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.35rem'
                          }}
                        >
                          <RotateCcw size={16} />
                          <span>{t.restartTimer || 'Restart'}</span>
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {/* 6. Hour Meter Start / End (Optional) */}
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

                {/* 7. Billing Unit & Auto-filled Rate */}
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

                {/* Rate: Auto-filled from Rate Matrix Combo */}
                <div className="form-group">
                  <label style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span>{t.rateAmount} (₹)</span>
                    <span style={{ fontSize: '0.7rem', color: '#059669', fontWeight: 600 }}>
                      ⚡ {t.autoFilledRate || 'Auto-filled from Rate Card'}
                    </span>
                  </label>
                  <input
                    type="number"
                    className="form-control"
                    value={formData.rate}
                    onChange={(e) => handleFieldChange('rate', e.target.value)}
                    required
                  />
                </div>

                {/* 8. Worked Units & Discount */}
                <div className="form-group">
                  <label>{t.workedUnits} (Hours / Acres / Km)</label>
                  <input
                    type="number"
                    step="0.01"
                    className="form-control"
                    value={formData.quantity}
                    onChange={(e) => handleFieldChange('quantity', e.target.value)}
                    required
                  />
                </div>

                <div className="form-group">
                  <label>{t.discount}</label>
                  <input
                    type="number"
                    className="form-control"
                    value={formData.discount}
                    onChange={(e) => handleFieldChange('discount', e.target.value)}
                  />
                </div>

                {/* 9. Net Total (Readonly, Auto-calculated) */}
                <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                  <label style={{ color: 'var(--primary-700)', fontWeight: 800, fontSize: '0.95rem' }}>
                    {t.totalAmount} (₹)
                  </label>
                  <input
                    type="number"
                    className="form-control"
                    value={formData.totalAmount}
                    readOnly
                    style={{ 
                      background: 'var(--bg-subtle)', 
                      fontWeight: 800, 
                      fontSize: '1.25rem', 
                      color: 'var(--primary-700)',
                      border: '2px solid var(--primary-200)'
                    }}
                  />
                </div>

                {/* 10. Payment Collection Toggle Button Section */}
                <div style={{
                  gridColumn: '1 / -1',
                  background: isCollectionActive ? 'linear-gradient(135deg, #f0fdf4 0%, #ecfdf5 100%)' : '#f8fafc',
                  border: isCollectionActive ? '1.5px solid #86efac' : '1.5px solid #cbd5e1',
                  borderRadius: '12px',
                  padding: '1.1rem',
                  marginTop: '0.5rem',
                  transition: 'all 0.25s ease'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
                    <div>
                      <div style={{ fontWeight: 800, fontSize: '1rem', color: isCollectionActive ? '#166534' : '#334155', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <span>{isCollectionActive ? '💰' : '⏳'}</span>
                        <span>{t.collectNowToggle || 'Payment Collected Now?'}</span>
                      </div>
                      <div style={{ fontSize: '0.78rem', color: 'var(--text-light)', marginTop: '3px' }}>
                        {isCollectionActive 
                          ? (lang === 'ta' ? 'பணம் வசூலிக்கப்பட்டது - கீழே தொகையை சரிபார்க்கவும்' : 'Payment collected now - review and save collection details below')
                          : (lang === 'ta' ? 'பணம் பெறப்படவில்லை - நிலுவை வசூல் பட்டியலில் (Pending) சேமிக்கப்படும்' : 'Not collected yet - will be saved to Pending Collections')}
                      </div>
                    </div>

                    <label style={{ display: 'inline-flex', alignItems: 'center', cursor: 'pointer', gap: '0.6rem' }}>
                      <input
                        type="checkbox"
                        checked={isCollectionActive}
                        onChange={(e) => handleToggleCollection(e.target.checked)}
                        style={{ display: 'none' }}
                      />
                      <div style={{
                        width: '54px',
                        height: '28px',
                        background: isCollectionActive ? '#10b981' : '#94a3b8',
                        borderRadius: '9999px',
                        position: 'relative',
                        transition: 'background 0.25s ease',
                        boxShadow: isCollectionActive ? '0 0 10px rgba(16,185,129,0.4)' : 'none'
                      }}>
                        <div style={{
                          width: '22px',
                          height: '22px',
                          background: '#ffffff',
                          borderRadius: '50%',
                          position: 'absolute',
                          top: '3px',
                          left: isCollectionActive ? '29px' : '3px',
                          transition: 'left 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
                          boxShadow: '0 1px 3px rgba(0,0,0,0.2)'
                        }} />
                      </div>
                      <span style={{ fontSize: '0.85rem', fontWeight: 800, color: isCollectionActive ? '#059669' : '#64748b' }}>
                        {isCollectionActive ? (lang === 'ta' ? 'ஆம் (வசூலி)' : 'YES (Collect)') : (lang === 'ta' ? 'இல்லை (நிலுவை)' : 'NO (Pending)')}
                      </span>
                    </label>
                  </div>

                  {!isCollectionActive ? (
                    <div style={{
                      marginTop: '0.85rem',
                      padding: '0.75rem 1rem',
                      background: '#fffbeb',
                      borderRadius: '8px',
                      border: '1px solid #fef08a',
                      color: '#92400e',
                      fontSize: '0.85rem',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.65rem'
                    }}>
                      <AlertCircle size={20} style={{ color: '#d97706', flexShrink: 0 }} />
                      <div>
                        <strong>{lang === 'ta' ? 'நிலுவை வசூல் பட்டியலில் சேமிக்கப்படும்:' : 'Saving to Pending Collections:'}</strong>{' '}
                        {lang === 'ta' 
                          ? `முழுத் தொகை ₹${formData.totalAmount} நிலுவையாக வைக்கப்படும். பிறகு டிரிப் பட்டியலை கிளிக் செய்து எப்போது வேண்டுமானாலும் வசூலிக்கலாம்.` 
                          : `Net Total of ₹${formData.totalAmount} will be saved as pending due. You can click this trip in the list anytime later to collect.`}
                      </div>
                    </div>
                  ) : (
                    <div className="form-grid" style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid #bbf7d0', marginBottom: 0 }}>
                      
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
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem' }}>
                          <label style={{ margin: 0, fontWeight: 600 }}>{t.collectedBy}</label>
                          <button
                            type="button"
                            onClick={() => applyLoginUserAssignment('collector')}
                            style={{
                              background: 'none',
                              border: 'none',
                              color: 'var(--primary-700)',
                              fontSize: '0.75rem',
                              cursor: 'pointer',
                              fontWeight: 600,
                              textDecoration: 'underline',
                              padding: 0
                            }}
                            title="Set logged in user as collector"
                          >
                            👤 {lang === 'ta' ? 'நானே வசூலித்தேன்' : 'I Collected'}
                          </button>
                        </div>
                        <VoiceInput
                          label=""
                          placeholder="e.g. K. Murugan (Driver) or Kuppusamy (Partner)"
                          value={formData.collectedBy}
                          onChange={(val) => handleFieldChange('collectedBy', val)}
                          speechLang={lang === 'ta' ? 'ta-IN' : 'en-IN'}
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
                      <div className="form-group col-full">
                        <label>Driver Bata Paid for this Trip (₹)</label>
                        <input
                          type="number"
                          className="form-control"
                          placeholder="e.g. 400"
                          value={formData.driverBata}
                          onChange={(e) => handleFieldChange('driverBata', e.target.value)}
                        />
                      </div>

                    </div>
                  )}
                </div>

                {/* 11. Work Description / Field Notes */}
                <div className="form-group col-full">
                  <VoiceInput
                    label={`${t.workDescription} / Field Notes`}
                    placeholder="e.g. Rotavator fine tilling for turmeric or 5-Tyne deep ploughing for sugarcane"
                    value={formData.workDescription}
                    onChange={(val) => handleFieldChange('workDescription', val)}
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
        onConfirm={(pin) => onDeleteTrip(deleteModalState.item.id, pin)}
        itemTitle={deleteModalState.item ? `${deleteModalState.item.id} - ${deleteModalState.item.customerName}` : ''}
        role={role}
        lang={lang}
      />
    </div>
  );
}
