import React, { useState, useEffect, useRef, useMemo } from 'react';
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
  Layers,
  Navigation as NavIcon,
  MapPin,
  Radio,
  Compass,
  CreditCard,
  Wallet,
  Activity
} from 'lucide-react';
import { translations, resolveBilingual } from '../translations/dictionary';
import AdminDeleteModal from './AdminDeleteModal';
import DatePicker from './common/DatePicker';
import SearchableSelect from './common/SearchableSelect';
import VoiceInput from './common/VoiceInput';
import { validatePositiveNumber } from '../services/storage';
import { formatDateDDMMYYYY, formatTimeDisplay } from '../utils/dateUtils';

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
  const [customerFilter, setCustomerFilter] = useState('all'); // all | customerId
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [deleteModalState, setDeleteModalState] = useState({ isOpen: false, item: null });
  const [formError, setFormError] = useState('');

  // Toggle for Payment Collection (Hidden by default when adding new trip, saves to pending collection)
  const [isCollectionActive, setIsCollectionActive] = useState(false);

  // Time Entry Mode: 'timer' (stopwatch) | 'map_timer' (GPS) | 'manual'
  const [timeEntryMode, setTimeEntryMode] = useState('timer');
  const [timerSeconds, setTimerSeconds] = useState(0);
  const [timerRunning, setTimerRunning] = useState(false);
  const [timerMessage, setTimerMessage] = useState('');

  // GPS Map Timer State (Rule 5)
  const [isGpsActive, setIsGpsActive] = useState(false);
  const [gpsStats, setGpsStats] = useState({
    latitude: null,
    longitude: null,
    accuracy: null,
    distanceKm: 0,
    elapsedSec: 0,
    lastCoord: null
  });
  const gpsWatchRef = useRef(null);
  const gpsTimerRef = useRef(null);

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

  // Clean up GPS tracking on unmount
  useEffect(() => {
    return () => {
      if (gpsWatchRef.current !== null && navigator.geolocation) {
        navigator.geolocation.clearWatch(gpsWatchRef.current);
      }
      if (gpsTimerRef.current) {
        clearInterval(gpsTimerRef.current);
      }
    };
  }, []);

  const startGpsTracking = () => {
    if (!navigator.geolocation) {
      alert(lang === 'ta' ? 'உங்கள் உலாவியில் GPS இருப்பிட சேவை கிடைக்கவில்லை.' : 'Geolocation is not supported by your browser.');
      return;
    }
    setIsGpsActive(true);
    setGpsStats({
      latitude: null,
      longitude: null,
      accuracy: null,
      distanceKm: 0,
      elapsedSec: 0,
      lastCoord: null
    });

    if (gpsTimerRef.current) clearInterval(gpsTimerRef.current);
    gpsTimerRef.current = setInterval(() => {
      setGpsStats(prev => ({ ...prev, elapsedSec: prev.elapsedSec + 1 }));
    }, 1000);

    if (gpsWatchRef.current !== null) {
      navigator.geolocation.clearWatch(gpsWatchRef.current);
    }
    gpsWatchRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        const { latitude, longitude, accuracy } = pos.coords;
        setGpsStats(prev => {
          let addedKm = 0;
          if (prev.lastCoord) {
            const dLat = (latitude - prev.lastCoord.lat) * (Math.PI / 180);
            const dLon = (longitude - prev.lastCoord.lng) * (Math.PI / 180);
            const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
                      Math.cos(prev.lastCoord.lat * (Math.PI / 180)) * Math.cos(latitude * (Math.PI / 180)) *
                      Math.sin(dLon / 2) * Math.sin(dLon / 2);
            const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
            const dist = 6371 * c;
            if (dist > 0.005) {
              addedKm = dist;
            }
          }
          return {
            ...prev,
            latitude: latitude.toFixed(6),
            longitude: longitude.toFixed(6),
            accuracy: Math.round(accuracy),
            distanceKm: parseFloat((prev.distanceKm + addedKm).toFixed(2)),
            lastCoord: { lat: latitude, lng: longitude }
          };
        });
      },
      (err) => {
        console.warn('GPS Error:', err.message);
      },
      { enableHighAccuracy: true, maximumAge: 2000, timeout: 10000 }
    );
  };

  const stopGpsTracking = () => {
    setIsGpsActive(false);
    if (gpsWatchRef.current !== null && navigator.geolocation) {
      navigator.geolocation.clearWatch(gpsWatchRef.current);
      gpsWatchRef.current = null;
    }
    if (gpsTimerRef.current) {
      clearInterval(gpsTimerRef.current);
      gpsTimerRef.current = null;
    }
  };

  const handleApplyGpsToBill = () => {
    let units = 0;
    if (formData.billingUnit === 'per_km') {
      units = Math.max(0.1, gpsStats.distanceKm);
    } else {
      const hrs = gpsStats.elapsedSec / 3600;
      units = hrs < 0.05 ? (gpsStats.distanceKm > 0 ? parseFloat((gpsStats.distanceKm / 8).toFixed(1)) : 0.1) : Math.round(hrs * 100) / 100;
    }
    handleFieldChange('quantity', units.toString());
    setTimerMessage(
      lang === 'ta'
        ? `✅ வரைபட GPS அளவீடு (${gpsStats.distanceKm} கி.மீ / ${formatTimer(gpsStats.elapsedSec)}) -> ${units} ${formData.billingUnit === 'per_km' ? 'கி.மீ' : 'மணி'} பில்லில் அமைக்கப்பட்டது!`
        : `✅ GPS field measurement (${gpsStats.distanceKm} km / ${formatTimer(gpsStats.elapsedSec)}) set to ${units} units!`
    );
    setTimeout(() => setTimerMessage(''), 4500);
  };

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
    paidOnDate: new Date().toISOString().slice(0, 10),
    collectedBy: '',
    collectedWhen: new Date().toISOString().slice(0, 16).replace('T', ' '),
    paymentMode: 'cash',
    driverBata: '400',
    notes: ''
  });

  // Rule 4: Compute machinery options mapped to the currently selected tractor
  const mappedMachineryOptions = useMemo(() => {
    const options = [];
    const currentTractorId = formData.tractorId || (tractors[0] ? tractors[0].id : '');
    const currentTractorName = formData.tractorName || (tractors[0] ? tractors[0].name : '');

    // 1. Find all rateMatrix entries for this tractor
    const mappedRates = rateMatrix.filter(r => {
      const matchId = currentTractorId && r.tractorId && r.tractorId === currentTractorId;
      const matchName = currentTractorName && r.tractorName && 
        r.tractorName.trim().toLowerCase() === currentTractorName.trim().toLowerCase();
      return matchId || matchName;
    });

    const mappedGroupTitle = lang === 'ta' ? '⭐ பொருத்தப்பட்ட கருவிகள் (விலை அட்டை)' : '⭐ Mapped Machinery (Rate Card)';
    mappedRates.forEach(r => {
      let matchedImp = implementsList.find(m => (r.implementId && m.id === r.implementId) || (r.implementName && m.name.toLowerCase() === r.implementName.toLowerCase()));
      const impId = matchedImp ? matchedImp.id : (r.implementId || 'none');
      const impNameEn = matchedImp ? matchedImp.name : (r.implementName || 'Standalone Tractor');
      const impNameTa = matchedImp?.name_ta || '';
      const displayLabel = (lang === 'ta' && impNameTa ? impNameTa : impNameEn);
      const isStandalone = impId === 'none' || impNameEn.toLowerCase().includes('standalone');

      options.push({
        value: impId,
        label: isStandalone ? (lang === 'ta' ? '⭐ தனி டிராக்டர் (கருவி இல்லை)' : '⭐ Standalone Tractor') : `⭐ ${displayLabel}`,
        subLabel: `${resolveUnitLabel(r.unit)} • ₹${r.rate}`,
        badge: `₹${r.rate}`,
        group: mappedGroupTitle,
        rate: r.rate,
        unit: r.unit,
        implementName: impNameEn,
        implementNameTa: impNameTa
      });
    });

    // 2. Other implements in fleet not mapped to this tractor
    const otherGroupTitle = lang === 'ta' ? 'பிற பண்ணை கருவிகள்' : 'Other Fleet Implements';
    implementsList.forEach(imp => {
      const alreadyIncluded = options.some(o => o.value === imp.id);
      if (!alreadyIncluded) {
        const displayLabel = lang === 'ta' && imp.name_ta ? imp.name_ta : imp.name;
        options.push({
          value: imp.id,
          label: displayLabel,
          subLabel: imp.category || (lang === 'ta' ? 'கருவி' : 'Implement'),
          badge: lang === 'ta' ? 'கருவி' : 'Implement',
          group: otherGroupTitle,
          rate: '900',
          unit: 'per_hour',
          implementName: imp.name,
          implementNameTa: imp.name_ta
        });
      }
    });

    // Standalone option if not yet added
    if (!options.some(o => o.value === 'none')) {
      options.push({
        value: 'none',
        label: lang === 'ta' ? 'தனி டிராக்டர் (கருவி இல்லை)' : 'Standalone Tractor',
        subLabel: lang === 'ta' ? 'கருவி ஏதுமில்லை' : 'No implement attached',
        badge: lang === 'ta' ? 'டிராக்டர்' : 'Tractor',
        group: otherGroupTitle,
        rate: '900',
        unit: 'per_hour',
        implementName: 'Standalone Tractor',
        implementNameTa: 'தனி டிராக்டர்'
      });
    }

    return options;
  }, [formData.tractorId, formData.tractorName, rateMatrix, implementsList, tractors, lang]);

  // Rule 10: Collector options
  const collectorOptions = useMemo(() => {
    const list = [];
    list.push({
      value: `${loggedUserName} (${lang === 'ta' ? 'நீங்கள்' : 'You'})`,
      label: `${loggedUserName} (${lang === 'ta' ? 'நீங்கள்' : 'You'})`,
      badge: lang === 'ta' ? 'உள்நுழைந்தவர்' : 'Current User'
    });
    if (formData.driverName) {
      list.push({
        value: `${formData.driverName} (${lang === 'ta' ? 'டிரைவர்' : 'Driver'})`,
        label: `${formData.driverName} (${lang === 'ta' ? 'டிரைவர்' : 'Driver'})`,
        badge: lang === 'ta' ? 'டிரைவர்' : 'Driver'
      });
    }
    drivers.forEach(d => {
      const dName = (lang === 'ta' && d.name_ta ? d.name_ta : d.name);
      if (dName !== formData.driverName && dName !== loggedUserName) {
        list.push({
          value: `${dName} (${lang === 'ta' ? 'டிரைவர்' : 'Driver'})`,
          label: dName,
          subLabel: d.phone || '',
          badge: lang === 'ta' ? 'டிரைவர்' : 'Driver'
        });
      }
    });
    return list;
  }, [loggedUserName, formData.driverName, drivers, lang]);

  // Determine current active value for the single select (Tractor + Implement)
  const currentComboValue = (() => {
    if (!comboOptions || comboOptions.length === 0) return '';
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

  // Rule 3: Select Tractor & Auto-refresh Mapped Machinery
  const handleSelectTractor = (tracId) => {
    const foundT = tractors.find(t => t.id === tracId);
    const tracName = foundT ? foundT.name : tracId;

    const mapped = rateMatrix.filter(r => r.tractorId === tracId || (r.tractorName && r.tractorName.toLowerCase() === tracName.toLowerCase()));
    
    let nextImpId = formData.implementId || 'none';
    let nextImpName = formData.implementName || 'Standalone Tractor';
    let nextRate = formData.rate || '900';
    let nextUnit = formData.billingUnit || 'per_hour';

    if (mapped.length > 0) {
      const isCurrentMapped = mapped.some(m => m.implementId === nextImpId || (nextImpId === 'none' && (!m.implementId || m.implementId === 'none')));
      if (!isCurrentMapped) {
        const firstRate = mapped[0];
        nextImpId = firstRate.implementId || 'none';
        nextImpName = firstRate.implementName || 'Standalone Tractor';
        nextRate = (firstRate.rate || nextRate).toString();
        nextUnit = firstRate.unit || nextUnit;
      } else {
        const matchedRate = mapped.find(m => m.implementId === nextImpId || (nextImpId === 'none' && (!m.implementId || m.implementId === 'none')));
        if (matchedRate) {
          nextRate = (matchedRate.rate || nextRate).toString();
          nextUnit = matchedRate.unit || nextUnit;
        }
      }
    }

    setFormData(prev => {
      const qty = parseFloat(prev.quantity) || 0;
      const rt = parseFloat(nextRate) || 0;
      const disc = parseFloat(prev.discount) || 0;
      const gross = qty * rt;
      const net = Math.max(0, gross - disc);
      const isPaid = prev.paymentStatus === 'paid';

      return {
        ...prev,
        tractorId: tracId,
        tractorName: tracName,
        implementId: nextImpId,
        implementName: nextImpName,
        implementIds: nextImpId && nextImpId !== 'none' ? [nextImpId] : [],
        implementNames: nextImpName && nextImpName !== 'Standalone Tractor' ? [nextImpName] : [],
        rate: nextRate,
        billingUnit: nextUnit,
        grossAmount: gross,
        totalAmount: net,
        paidAmount: isPaid ? net.toString() : '0',
        balanceAmount: isPaid ? 0 : net
      };
    });
  };

  // Rule 4: Select Machinery mapped to Tractor
  const handleSelectMachinery = (impId) => {
    const matchedOpt = mappedMachineryOptions.find(o => o.value === impId);
    let impName = matchedOpt?.implementName || (impId === 'none' ? 'Standalone Tractor' : impId);
    let newRate = matchedOpt?.rate;
    let newUnit = matchedOpt?.unit || formData.billingUnit || 'per_hour';

    const lookup = lookupRate(formData.tractorId, impId, formData.date, newUnit);
    if (lookup) {
      newRate = lookup;
    }

    setFormData(prev => {
      const rateVal = (newRate || prev.rate || '900').toString();
      const qty = parseFloat(prev.quantity) || 0;
      const rt = parseFloat(rateVal) || 0;
      const disc = parseFloat(prev.discount) || 0;
      const gross = qty * rt;
      const net = Math.max(0, gross - disc);
      const isPaid = prev.paymentStatus === 'paid';

      const impIds = impId && impId !== 'none' ? [impId] : [];
      const impNames = impName && impName !== 'Standalone Tractor' ? [impName] : [];

      return {
        ...prev,
        implementId: impId,
        implementName: impName,
        implementIds: impIds,
        implementNames: impNames,
        rate: rateVal,
        billingUnit: newUnit,
        grossAmount: gross,
        totalAmount: net,
        paidAmount: isPaid ? net.toString() : '0',
        balanceAmount: isPaid ? 0 : net,
        workType: impName && impName !== 'Standalone Tractor' ? `${impName} Work` : prev.workType
      };
    });
  };

  // Rule 8 & 11: Set Paid Status Toggle
  const handleSetPaidStatus = (isPaid) => {
    setFormData(prev => {
      const net = parseFloat(prev.totalAmount) || 0;
      if (isPaid) {
        setIsCollectionActive(true);
        return {
          ...prev,
          paymentStatus: 'paid',
          paidAmount: net.toString(),
          balanceAmount: 0,
          paidOnDate: prev.paidOnDate || prev.date || new Date().toISOString().slice(0, 10),
          paymentMode: (!prev.paymentMode || prev.paymentMode === 'credit') ? 'cash' : prev.paymentMode,
          collectedBy: prev.collectedBy || `${loggedUserName} (${lang === 'ta' ? 'நீங்கள்' : 'You'})`,
          collectedWhen: prev.collectedWhen || `${prev.date || new Date().toISOString().slice(0, 10)} 12:00`
        };
      } else {
        setIsCollectionActive(false);
        return {
          ...prev,
          paymentStatus: 'unpaid',
          paidAmount: '0',
          balanceAmount: net,
          paymentMode: 'credit'
        };
      }
    });
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
      setFormData(prev => ({
        ...prev,
        collectedBy: `${loggedUserName} (${lang === 'ta' ? 'நீங்கள்' : 'You'})`
      }));
    }
  };

  // Single Select Combo Change handler (for backwards compatibility)
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

      if (prev.paymentStatus === 'paid') {
        updated.paidAmount = net.toString();
        updated.balanceAmount = 0;
      } else {
        updated.paidAmount = '0';
        updated.balanceAmount = net;
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

    const isPaid = formData.paymentStatus === 'paid' || (isCollectionActive && parseFloat(formData.paidAmount) >= netTotal);

    let finalPaid = 0;
    let finalBal = netTotal;
    let finalStatus = 'unpaid';
    let finalMode = 'credit';
    let finalCollectedBy = '';
    let finalCollectedWhen = '';

    if (isPaid) {
      finalPaid = netTotal;
      finalBal = 0;
      finalStatus = 'paid';
      finalMode = (formData.paymentMode && formData.paymentMode !== 'credit') ? formData.paymentMode : 'cash';
      finalCollectedBy = formData.collectedBy || `${loggedUserName} (${lang === 'ta' ? 'நீங்கள்' : 'You'})`;
      finalCollectedWhen = formData.collectedWhen || `${formData.paidOnDate || formData.date} 12:00`;
    } else if (isCollectionActive && parseFloat(formData.paidAmount) > 0) {
      finalPaid = Math.min(netTotal, parseFloat(formData.paidAmount));
      finalBal = Math.max(0, netTotal - finalPaid);
      finalStatus = finalBal === 0 ? 'paid' : 'partial';
      finalMode = (formData.paymentMode && formData.paymentMode !== 'credit') ? formData.paymentMode : 'cash';
      finalCollectedBy = formData.collectedBy || '';
      finalCollectedWhen = formData.collectedWhen || '';
    } else {
      finalPaid = 0;
      finalBal = netTotal;
      finalStatus = 'unpaid';
      finalMode = 'credit';
      finalCollectedBy = '';
      finalCollectedWhen = '';
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

    let matchesCustomer = true;
    if (customerFilter !== 'all') {
      matchesCustomer = t.customerId === customerFilter || (t.customerName && t.customerName.toLowerCase() === customerFilter.toLowerCase());
    }

    return matchesSearch && matchesStatus && matchesCustomer;
  });

  const pendingTripsCount = tripSheets.filter(t => parseFloat(t.balanceAmount) > 0 || t.paymentStatus === 'unpaid').length;
  const paidTripsCount = tripSheets.filter(t => t.paymentStatus === 'paid' && parseFloat(t.balanceAmount) === 0).length;

  return (
    <div>
      {/* Header bar */}
      <div className="card-header-bar">
        <div className="card-title-group">
          <h2 style={{ margin: 0 }}><FileSpreadsheet size={22} /> {t.tripSheets}</h2>
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
            placeholder={lang === 'ta' ? 'தேடுக... (டிரிப் #, விவசாயி, டிரைவர்...)' : 'Search (Trip #, Customer, Driver...)'}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        {/* Customer Select Filter */}
        <select 
          className="filter-select"
          value={customerFilter}
          onChange={(e) => setCustomerFilter(e.target.value)}
          title={lang === 'ta' ? 'விவசாயி வாரியாக வடிகட்ட' : 'Filter by customer'}
        >
          <option value="all">{lang === 'ta' ? 'அனைத்து விவசாயிகள்' : 'All Customers'}</option>
          {customers.map(c => (
            <option key={c.id} value={c.id}>
              {lang === 'ta' && c.name_ta ? c.name_ta : c.name} {c.village ? `(${c.village})` : ''}
            </option>
          ))}
        </select>

        {/* Payment Status Filter */}
        <select 
          className="filter-select"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
        >
          <option value="all">{lang === 'ta' ? 'அனைத்து கட்டண நிலைகள்' : 'All Payment Statuses'}</option>
          <option value="paid">{lang === 'ta' ? 'முழுவதும் வசூலிக்கப்பட்டது' : 'Fully Paid'}</option>
          <option value="partial">{lang === 'ta' ? 'பகுதி வசூல்' : 'Partial'}</option>
          <option value="unpaid">{lang === 'ta' ? 'நிலுவை வசூல் பட்டியல்' : 'Pending Collection'}</option>
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
                <th>{lang === 'ta' ? 'டிராக்டர் + கருவி' : 'Tractor + Implement'}</th>
                <th>{lang === 'ta' ? 'வேலை அளவு' : 'Hours / Units'}</th>
                <th>{lang === 'ta' ? 'மொத்தம் (₹)' : 'Total (₹)'}</th>
                <th>{lang === 'ta' ? 'செலுத்தியது (₹)' : 'Paid (₹)'}</th>
                <th>{lang === 'ta' ? 'நிலுவை (₹)' : 'Balance (₹)'}</th>
                <th>{lang === 'ta' ? 'வசூல் விவரம்' : 'Collection Detail'}</th>
                <th>{lang === 'ta' ? 'கட்டண நிலை' : 'Status'}</th>
                <th style={{ textAlign: 'right' }}>{t.actions}</th>
              </tr>
            </thead>
            <tbody>
              {filteredTrips.map(trip => {
                const hasPendingBalance = parseFloat(trip.balanceAmount) > 0;
                const formattedDate = formatDateDDMMYYYY(trip.date);
                const startT = formatTimeDisplay(trip.startTime);
                const endT = formatTimeDisplay(trip.endTime);
                return (
                  <tr 
                    key={trip.id} 
                    onClick={() => handleOpenEdit(trip)} 
                    style={{ cursor: 'pointer' }}
                    title={lang === 'ta' ? 'கிளிக் செய்து திருத்த அல்லது பணம் வசூலிக்க' : 'Click to view / collect payment'}
                  >
                    <td style={{ fontWeight: 700, color: 'var(--primary-700)' }}>{trip.id}</td>
                    <td>
                      <div style={{ fontWeight: 600 }}>{formattedDate}</div>
                      {startT ? (
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-light)' }}>
                          {startT} {endT ? `- ${endT}` : ''}
                        </div>
                      ) : null}
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
                        )) : <span style={{ color: 'var(--text-light)' }}>{lang === 'ta' ? 'தனி டிராக்டர்' : 'Standalone Tractor'}</span>}
                      </div>
                    </td>
                    <td>
                      <div style={{ fontWeight: 600 }}>
                        {trip.quantity} {trip.billingUnit === 'per_hour' ? (lang === 'ta' ? 'மணி' : 'hrs') : trip.billingUnit === 'per_acre' ? (lang === 'ta' ? 'ஏக்கர்' : 'acres') : (lang === 'ta' ? 'டிரிப்' : trip.billingUnit)}
                      </div>
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

                {/* Rule 1: Customer Name (Pure Tamil, customer name + village + phone) */}
                <div className="form-group">
                  <SearchableSelect
                    label={lang === 'ta' ? 'விவசாயி / வாடிக்கையாளர் பெயர்' : 'Farmer / Customer Name'}
                    value={formData.customerId}
                    onChange={(val) => handleFieldChange('customerId', val)}
                    options={customers.map(c => ({
                      value: c.id,
                      label: (lang === 'ta' && c.name_ta ? c.name_ta : c.name),
                      subLabel: (lang === 'ta' && c.village_ta ? c.village_ta : c.village) || '',
                      badge: c.phone || ''
                    }))}
                    placeholder={lang === 'ta' ? '-- விவசாயியைத் தேர்வு செய்க --' : '-- Select Farmer / Customer --'}
                    searchPlaceholder={lang === 'ta' ? 'விவசாயியைத் தேட...' : 'Search farmer...'}
                    required
                    lang={lang}
                  />
                </div>

                {/* Rule 2: Driver Name (Pure Tamil, translated wage badge, quick button) */}
                <div className="form-group">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem' }}>
                    <label style={{ margin: 0, fontWeight: 600 }}>
                      {lang === 'ta' ? 'ஓட்டுநர் / தொழிலாளி பெயர்' : 'Driver / Labor Name'} <span style={{ color: '#ef4444' }}>*</span>
                    </label>
                    <button
                      type="button"
                      onClick={() => applyLoginUserAssignment('driver')}
                      style={{
                        background: loginUserAssignment === 'driver' ? '#e0f2fe' : 'none',
                        border: loginUserAssignment === 'driver' ? '1px solid #7dd3fc' : 'none',
                        color: loginUserAssignment === 'driver' ? '#0369a1' : 'var(--primary-700)',
                        fontSize: '0.75rem',
                        cursor: 'pointer',
                        fontWeight: 700,
                        padding: '2px 8px',
                        borderRadius: '4px'
                      }}
                      title="Set logged in user as driver"
                    >
                      🚜 {lang === 'ta' ? 'நான் தான் ஓட்டுநர்' : 'I am the Driver'}
                    </button>
                  </div>
                  <SearchableSelect
                    label=""
                    value={formData.driverId}
                    onChange={(val) => handleFieldChange('driverId', val)}
                    options={drivers.map(d => ({ 
                      value: d.id, 
                      label: (lang === 'ta' && d.name_ta ? d.name_ta : d.name) + (d.name.toLowerCase() === loggedUserName.toLowerCase() ? (lang === 'ta' ? ' (நீங்கள்)' : ' (You)') : ''), 
                      subLabel: d.phone || '', 
                      badge: d.wageType || '' 
                    }))}
                    placeholder={lang === 'ta' ? '-- ஓட்டுநரைத் தேர்வு செய்க --' : '-- Select Driver --'}
                    searchPlaceholder={lang === 'ta' ? 'ஓட்டுநரைத் தேட...' : 'Search driver...'}
                    required
                    lang={lang}
                  />
                </div>

                {/* Rule 3: Tractor Name (Dedicated Dropdown for Tractor) */}
                <div className="form-group">
                  <SearchableSelect
                    label={lang === 'ta' ? 'டிராக்டர் பெயர்' : 'Tractor Name'}
                    value={formData.tractorId}
                    onChange={handleSelectTractor}
                    options={tractors.map(t => ({
                      value: t.id,
                      label: (lang === 'ta' && t.name_ta ? t.name_ta : t.name),
                      subLabel: t.regNumber || '',
                      badge: lang === 'ta' ? 'டிராக்டர்' : 'Tractor'
                    }))}
                    placeholder={lang === 'ta' ? '-- டிராக்டரைத் தேர்வு செய்க --' : '-- Select Tractor --'}
                    searchPlaceholder={lang === 'ta' ? 'டிராக்டரைத் தேட (SWARAJ, Mahindra)...' : 'Search tractor...'}
                    required
                    lang={lang}
                  />
                </div>

                {/* Rule 4: Machinery Mapped to Tractor Dropdown */}
                <div className="form-group">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem' }}>
                    <label style={{ margin: 0, fontWeight: 600 }}>
                      {lang === 'ta' ? 'கருவி / இயந்திரம் (பொருத்தப்பட்டவை)' : 'Machinery (Mapped Implements)'} <span style={{ color: '#ef4444' }}>*</span>
                    </label>
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
                        fontWeight: 600,
                        padding: 0
                      }}
                    >
                      {showAdvancedFleet ? (lang === 'ta' ? 'சுருக்கு' : 'Hide Multi-Implement') : (lang === 'ta' ? '+ கூடுதல் கருவிகள்' : '+ Multi-Implements')}
                    </button>
                  </div>
                  <SearchableSelect
                    label=""
                    value={formData.implementId}
                    onChange={handleSelectMachinery}
                    options={mappedMachineryOptions}
                    placeholder={lang === 'ta' ? '-- கருவியைத் தேர்வு செய்க --' : '-- Select Implement --'}
                    searchPlaceholder={lang === 'ta' ? 'கருவியைத் தேட (ரோட்டாவேட்டர், கலப்பை)...' : 'Search implement...'}
                    required
                    lang={lang}
                  />

                  {/* Multi-implement drawer if user clicks "+ கூடுதல் கருவிகள்" */}
                  {showAdvancedFleet && (
                    <div style={{
                      marginTop: '0.5rem',
                      padding: '0.65rem',
                      background: '#f8fafc',
                      border: '1px dashed #cbd5e1',
                      borderRadius: '8px'
                    }}>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem', marginBottom: '0.4rem' }}>
                        {(formData.implementIds || []).map(impId => {
                          const found = implementsList.find(m => m.id === impId);
                          const impLabel = found ? (lang === 'ta' && found.name_ta ? found.name_ta : found.name) : impId;
                          return (
                            <span
                              key={impId}
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '0.35rem',
                                background: '#e0e7ff',
                                color: '#3730a3',
                                padding: '0.2rem 0.5rem',
                                borderRadius: '9999px',
                                fontSize: '0.75rem',
                                fontWeight: 600
                              }}
                            >
                              ⚙️ {impLabel}
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
                            + {lang === 'ta' && imp.name_ta ? imp.name_ta : imp.name}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Work Date */}
                <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                  <DatePicker
                    label={lang === 'ta' ? 'உழவு செய்த தேதி' : 'Work Date'}
                    value={formData.date}
                    onChange={(val) => handleFieldChange('date', val)}
                    required
                    lang={lang}
                  />
                </div>

                {/* Rule 5: Time Tracking (i) Timer (Stopwatch); (ii) Map Timer (GPS Tracker); (iii) Manual Time & Meters */}
                <div style={{
                  gridColumn: '1 / -1',
                  background: 'var(--bg-subtle, #f8fafc)',
                  border: '1.5px solid var(--border-color, #e2e8f0)',
                  borderRadius: '12px',
                  padding: '0.95rem'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                    <div style={{ fontWeight: 800, fontSize: '0.9rem', color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                      <span>⏱️</span>
                      <span>{lang === 'ta' ? 'நேரப் பதிவு முறை' : 'Time Tracking Mode'}</span>
                    </div>

                    {/* 3 Mode Tabs */}
                    <div style={{ display: 'inline-flex', borderRadius: '8px', border: '1px solid #cbd5e1', overflow: 'hidden' }}>
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
                        ⏱️ {lang === 'ta' ? 'நேரக் கண்காணிப்பு (Timer)' : 'Live Timer'}
                      </button>

                      <button
                        type="button"
                        onClick={() => setTimeEntryMode('map_timer')}
                        style={{
                          padding: '0.35rem 0.75rem',
                          fontSize: '0.8rem',
                          fontWeight: 700,
                          border: 'none',
                          cursor: 'pointer',
                          background: timeEntryMode === 'map_timer' ? '#0284c7' : '#ffffff',
                          color: timeEntryMode === 'map_timer' ? '#ffffff' : '#475569'
                        }}
                      >
                        🛰️ {lang === 'ta' ? 'வரைபட நேரம் (Map Timer)' : 'Map Timer (GPS)'}
                      </button>

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
                        🕒 {lang === 'ta' ? 'நேரத்தை உள்ளிடவும்' : 'Manual Time'}
                      </button>
                    </div>
                  </div>

                  {/* Mode 1: Live Stopwatch Timer */}
                  {timeEntryMode === 'timer' && (
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
                        {lang === 'ta' ? 'நேரக் கண்காணிப்பு ஸ்டாப்வாட்ச் (Live Stopwatch)' : 'Live Field Work Stopwatch'}
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
                              <span>{lang === 'ta' ? 'நிறுத்து' : 'Pause'}</span>
                            </>
                          ) : (
                            <>
                              <Play size={16} />
                              <span>{timerSeconds > 0 ? (lang === 'ta' ? 'மீண்டும் தொடங்கு' : 'Resume') : (lang === 'ta' ? 'தொடங்கு' : 'Start')}</span>
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
                          <span>{lang === 'ta' ? 'வேலை அளவாக அமை' : 'Set to Bill'}</span>
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
                          <span>{lang === 'ta' ? 'மீண்டும் தொடங்கு' : 'Restart'}</span>
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Mode 2: Map Timer (GPS Field Tracker) */}
                  {timeEntryMode === 'map_timer' && (
                    <div style={{
                      background: 'linear-gradient(135deg, #0c4a6e 0%, #075985 100%)',
                      color: '#ffffff',
                      borderRadius: '12px',
                      padding: '1.25rem',
                      boxShadow: '0 4px 12px rgba(2,132,199,0.25)',
                      border: '1px solid #38bdf8'
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontWeight: 800, fontSize: '0.9rem', color: '#e0f2fe' }}>
                          <Radio size={18} color="#38bdf8" />
                          <span>{lang === 'ta' ? 'ஜிபிஎஸ் வரைபட நேரக் கண்காணிப்பு (GPS Field Radar)' : 'GPS Field Map Tracker'}</span>
                        </div>
                        <div style={{
                          fontSize: '0.75rem',
                          padding: '3px 8px',
                          borderRadius: '9999px',
                          background: isGpsActive ? '#10b981' : 'rgba(255,255,255,0.15)',
                          fontWeight: 700,
                          color: '#ffffff'
                        }}>
                          {isGpsActive ? (lang === 'ta' ? '🟢 நேரலை இணைப்பு இயங்குகிறது' : '🟢 GPS Active Tracking') : (lang === 'ta' ? '⚪ நிறுத்தி வைக்கப்பட்டுள்ளது' : '⚪ GPS Idle')}
                        </div>
                      </div>

                      {/* Live GPS Coordinates and Computed Field Distance */}
                      <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
                        gap: '0.75rem',
                        margin: '0.75rem 0',
                        background: 'rgba(0,0,0,0.25)',
                        padding: '0.85rem',
                        borderRadius: '8px'
                      }}>
                        <div>
                          <div style={{ fontSize: '0.72rem', color: '#93c5fd', textTransform: 'uppercase' }}>
                            {lang === 'ta' ? 'கள தூரம் (Distance)' : 'Field Distance'}
                          </div>
                          <div style={{ fontSize: '1.45rem', fontWeight: 900, color: '#38bdf8', fontFamily: 'monospace' }}>
                            {gpsStats.distanceKm} <span style={{ fontSize: '0.85rem' }}>{lang === 'ta' ? 'கி.மீ' : 'km'}</span>
                          </div>
                        </div>
                        <div>
                          <div style={{ fontSize: '0.72rem', color: '#93c5fd', textTransform: 'uppercase' }}>
                            {lang === 'ta' ? 'கள நேரம் (Elapsed)' : 'Elapsed Time'}
                          </div>
                          <div style={{ fontSize: '1.45rem', fontWeight: 900, color: '#4ade80', fontFamily: 'monospace' }}>
                            {formatTimer(gpsStats.elapsedSec)}
                          </div>
                        </div>
                        <div>
                          <div style={{ fontSize: '0.72rem', color: '#93c5fd', textTransform: 'uppercase' }}>
                            {lang === 'ta' ? 'துல்லியம் (Accuracy)' : 'Accuracy'}
                          </div>
                          <div style={{ fontSize: '1.1rem', fontWeight: 700, color: '#f1f5f9', marginTop: '4px' }}>
                            {gpsStats.accuracy ? `±${gpsStats.accuracy} m` : '--'}
                          </div>
                        </div>
                        <div>
                          <div style={{ fontSize: '0.72rem', color: '#93c5fd', textTransform: 'uppercase' }}>
                            {lang === 'ta' ? 'அட்சரேகை / தீர்க்கரேகை' : 'Lat / Long'}
                          </div>
                          <div style={{ fontSize: '0.75rem', color: '#e0f2fe', fontFamily: 'monospace', marginTop: '4px' }}>
                            {gpsStats.latitude ? `${gpsStats.latitude}, ${gpsStats.longitude}` : (lang === 'ta' ? 'தொடங்கவும்' : 'Press Start')}
                          </div>
                        </div>
                      </div>

                      {timerMessage && (
                        <div style={{ color: '#86efac', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.5rem', textAlign: 'center' }}>
                          {timerMessage}
                        </div>
                      )}

                      <div style={{ display: 'flex', justifyContent: 'center', gap: '0.5rem', flexWrap: 'wrap', marginTop: '0.5rem' }}>
                        <button
                          type="button"
                          onClick={isGpsActive ? stopGpsTracking : startGpsTracking}
                          style={{
                            padding: '0.5rem 1.1rem',
                            borderRadius: '8px',
                            fontWeight: 700,
                            fontSize: '0.85rem',
                            cursor: 'pointer',
                            border: 'none',
                            background: isGpsActive ? '#f59e0b' : '#10b981',
                            color: '#ffffff',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.35rem',
                            boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
                          }}
                        >
                          {isGpsActive ? (
                            <>
                              <Pause size={16} />
                              <span>{lang === 'ta' ? 'GPS நிறுத்து' : 'Pause GPS'}</span>
                            </>
                          ) : (
                            <>
                              <NavIcon size={16} />
                              <span>{gpsStats.elapsedSec > 0 ? (lang === 'ta' ? 'மீண்டும் தொடங்கு' : 'Resume GPS') : (lang === 'ta' ? 'GPS தொடங்கு' : 'Start GPS')}</span>
                            </>
                          )}
                        </button>
                        <button
                          type="button"
                          onClick={handleApplyGpsToBill}
                          style={{
                            padding: '0.5rem 1.1rem',
                            borderRadius: '8px',
                            fontWeight: 700,
                            fontSize: '0.85rem',
                            cursor: 'pointer',
                            border: 'none',
                            background: '#38bdf8',
                            color: '#082f49',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.35rem',
                            boxShadow: '0 2px 4px rgba(56,189,248,0.3)'
                          }}
                        >
                          <Zap size={16} />
                          <span>{lang === 'ta' ? 'பில்லில் அமைக்க (Set to Bill)' : 'Set GPS to Bill'}</span>
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Mode 3: Manual Time & Meter Entry */}
                  {timeEntryMode === 'manual' && (
                    <div>
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
                              🕒 {lang === 'ta' ? 'இப்போது' : 'Now'}
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
                              🕒 {lang === 'ta' ? 'இப்போது' : 'Now'}
                            </button>
                          </div>
                          <input
                            type="time"
                            className="form-control"
                            value={formData.endTime}
                            onChange={(e) => handleFieldChange('endTime', e.target.value)}
                          />
                        </div>
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
                      </div>
                    </div>
                  )}
                </div>

                {/* Rule 6, 7 & 9: Work Billing Calculation Box (Formula: Units * Rate - Discount = Read-only Total) */}
                <div style={{
                  gridColumn: '1 / -1',
                  background: 'var(--bg-subtle, #f8fafc)',
                  border: '2px solid var(--primary-200, #bbf7d0)',
                  borderRadius: '12px',
                  padding: '1.1rem',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.04)'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.85rem' }}>
                    <div style={{ fontWeight: 800, fontSize: '0.95rem', color: 'var(--primary-800, #166534)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                      <span>🧮</span>
                      <span>{lang === 'ta' ? 'உழவு கட்டணம் கணக்கீடு' : 'Work Billing Calculation'}</span>
                    </div>
                    <div style={{ fontSize: '0.75rem', color: '#059669', fontWeight: 600 }}>
                      {lang === 'ta' ? 'விலை அட்டை கட்டணம் தானாக இணைக்கப்பட்டது' : 'Rate auto-mapped from card / editable'}
                    </div>
                  </div>

                  {/* Formula Grid: (Units) * (Rate) - (Discount) = Total */}
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))',
                    gap: '0.85rem',
                    alignItems: 'end'
                  }}>
                    {/* 1. Worked Units & Billing Unit */}
                    <div>
                      <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, marginBottom: '0.35rem', color: 'var(--text-main)' }}>
                        {lang === 'ta' ? '1. மொத்த அளவு (அலகு)' : '1. Total Units (Hours/Acres/Km)'} <span style={{ color: '#ef4444' }}>*</span>
                      </label>
                      <div style={{ display: 'flex', gap: '0.35rem' }}>
                        <input
                          type="number"
                          step="0.01"
                          className="form-control"
                          style={{ fontWeight: 700, fontSize: '1.05rem', minWidth: '85px' }}
                          value={formData.quantity}
                          onChange={(e) => handleFieldChange('quantity', e.target.value)}
                          required
                        />
                        <select
                          className="form-control"
                          style={{ width: 'auto', fontWeight: 600, fontSize: '0.85rem' }}
                          value={formData.billingUnit}
                          onChange={(e) => handleFieldChange('billingUnit', e.target.value)}
                        >
                          <option value="per_hour">{lang === 'ta' ? 'மணி' : 'Hour'}</option>
                          <option value="per_acre">{lang === 'ta' ? 'ஏக்கர்' : 'Acre'}</option>
                          <option value="per_km">{lang === 'ta' ? 'கி.மீ' : 'Km'}</option>
                          <option value="per_trip">{lang === 'ta' ? 'டிரிப்' : 'Trip'}</option>
                        </select>
                      </div>
                    </div>

                    {/* Multiply symbol */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', paddingBottom: '0.5rem', fontSize: '1.5rem', fontWeight: 900, color: 'var(--primary-700)' }}>
                      ×
                    </div>

                    {/* 2. Unit Rate (₹) with enter / edit option */}
                    <div>
                      <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, marginBottom: '0.35rem', color: 'var(--text-main)' }}>
                        {lang === 'ta' ? '2. ஒரு அலகின் கட்டணம் (₹)' : '2. Unit Rate (₹)'} <span style={{ color: '#ef4444' }}>*</span>
                      </label>
                      <div style={{ position: 'relative' }}>
                        <span style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', fontWeight: 700, color: 'var(--text-light)' }}>
                          ₹
                        </span>
                        <input
                          type="number"
                          className="form-control"
                          style={{ paddingLeft: '1.75rem', fontWeight: 700, fontSize: '1.05rem' }}
                          value={formData.rate}
                          onChange={(e) => handleFieldChange('rate', e.target.value)}
                          title={lang === 'ta' ? 'கட்டணத்தை மாற்ற இங்கே உள்ளிடலாம்' : 'Enter or modify rate here'}
                          required
                        />
                      </div>
                    </div>

                    {/* Minus symbol */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', paddingBottom: '0.5rem', fontSize: '1.5rem', fontWeight: 900, color: '#dc2626' }}>
                      −
                    </div>

                    {/* 3. Discount (₹) - Rule 9 */}
                    <div>
                      <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, marginBottom: '0.35rem', color: '#b91c1c' }}>
                        {lang === 'ta' ? '3. தள்ளுபடி (₹)' : '3. Discount (₹)'}
                      </label>
                      <div style={{ position: 'relative' }}>
                        <span style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', fontWeight: 700, color: '#b91c1c' }}>
                          ₹
                        </span>
                        <input
                          type="number"
                          className="form-control"
                          style={{ paddingLeft: '1.75rem', fontWeight: 700, fontSize: '1.05rem', color: '#b91c1c' }}
                          value={formData.discount}
                          onChange={(e) => handleFieldChange('discount', e.target.value)}
                          placeholder="0"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Equals & Read-only Total Display (Rule 7) */}
                  <div style={{
                    marginTop: '1rem',
                    paddingTop: '0.85rem',
                    borderTop: '1.5px dashed var(--border-color)',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    flexWrap: 'wrap',
                    gap: '0.75rem'
                  }}>
                    <div style={{ fontSize: '0.85rem', color: 'var(--text-light)' }}>
                      {lang === 'ta' 
                        ? `சூத்திரம்: (${formData.quantity} ${resolveUnitLabel(formData.billingUnit)} × ₹${formData.rate}) - தள்ளுபடி ₹${formData.discount || 0}`
                        : `Formula: (${formData.quantity} units × ₹${formData.rate}) - ₹${formData.discount || 0} discount`}
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      <span style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--text-main)' }}>
                        {lang === 'ta' ? 'நிகர மொத்தத் தொகை:' : 'Net Total:'}
                      </span>
                      <div style={{
                        background: 'linear-gradient(135deg, #059669, #047857)',
                        color: '#ffffff',
                        padding: '0.45rem 1.25rem',
                        borderRadius: '8px',
                        fontWeight: 900,
                        fontSize: '1.45rem',
                        letterSpacing: '0.5px',
                        boxShadow: '0 3px 10px rgba(5,150,105,0.3)',
                        userSelect: 'none'
                      }}>
                        ₹{formData.totalAmount}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Rule 8, 10 & 11: Payment Status Box (Paid / Unpaid, Paid On Date, Hand / Account, Collector) */}
                <div style={{
                  gridColumn: '1 / -1',
                  background: formData.paymentStatus === 'paid' ? 'linear-gradient(135deg, #f0fdf4 0%, #ecfdf5 100%)' : '#f8fafc',
                  border: formData.paymentStatus === 'paid' ? '2px solid #86efac' : '2px solid #cbd5e1',
                  borderRadius: '12px',
                  padding: '1.1rem',
                  transition: 'all 0.2s ease'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
                    <div>
                      <div style={{ fontWeight: 800, fontSize: '1rem', color: formData.paymentStatus === 'paid' ? '#166534' : '#334155', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <span>{formData.paymentStatus === 'paid' ? '✅' : '⏳'}</span>
                        <span>{lang === 'ta' ? 'பணம் வசூலிக்கப்பட்டதா?' : 'Payment Status (Paid / Unpaid)'}</span>
                      </div>
                      <div style={{ fontSize: '0.78rem', color: 'var(--text-light)', marginTop: '3px' }}>
                        {formData.paymentStatus === 'paid'
                          ? (lang === 'ta' ? 'பணம் முழுமையாகப் பெறப்பட்டது - வசூல் விவரங்களைச் சரிபார்க்கவும்' : 'Payment fully collected - verify collection details below')
                          : (lang === 'ta' ? 'பணம் பெறப்படவில்லை - நிலுவை வசூல் பட்டியலில் சேமிக்கப்படும்' : 'Not paid yet - saved to pending dues')}
                      </div>
                    </div>

                    {/* Paid vs Not Paid Segmented Buttons */}
                    <div style={{ display: 'inline-flex', borderRadius: '8px', border: '1.5px solid #cbd5e1', overflow: 'hidden' }}>
                      <button
                        type="button"
                        onClick={() => handleSetPaidStatus(true)}
                        style={{
                          padding: '0.5rem 1.1rem',
                          fontSize: '0.875rem',
                          fontWeight: 800,
                          border: 'none',
                          cursor: 'pointer',
                          background: formData.paymentStatus === 'paid' ? '#10b981' : '#ffffff',
                          color: formData.paymentStatus === 'paid' ? '#ffffff' : '#475569',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.4rem',
                          transition: 'all 0.15s ease'
                        }}
                      >
                        <CheckCircle2 size={16} />
                        <span>{lang === 'ta' ? 'செலுத்தப்பட்டது (Paid)' : 'Paid'}</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleSetPaidStatus(false)}
                        style={{
                          padding: '0.5rem 1.1rem',
                          fontSize: '0.875rem',
                          fontWeight: 800,
                          border: 'none',
                          cursor: 'pointer',
                          background: formData.paymentStatus === 'unpaid' ? '#ef4444' : '#ffffff',
                          color: formData.paymentStatus === 'unpaid' ? '#ffffff' : '#475569',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.4rem',
                          transition: 'all 0.15s ease'
                        }}
                      >
                        <Clock size={16} />
                        <span>{lang === 'ta' ? 'நிலுவை (Not Paid)' : 'Not Paid'}</span>
                      </button>
                    </div>
                  </div>

                  {/* If Paid: Show Paid On Date (Rule 8), Payment Mode (Rule 11), and Collector (Rule 10) */}
                  {formData.paymentStatus === 'paid' && (
                    <div style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid #bbf7d0' }}>
                      <div className="form-grid" style={{ marginBottom: 0 }}>
                        
                        {/* Rule 8: Paid On Date */}
                        <div className="form-group">
                          <DatePicker
                            label={lang === 'ta' ? 'செலுத்திய தேதி (Paid On Date)' : 'Paid On Date'}
                            value={formData.paidOnDate || formData.date}
                            onChange={(val) => {
                              handleFieldChange('paidOnDate', val);
                              handleFieldChange('collectedWhen', `${val} 12:00`);
                            }}
                            required
                            lang={lang}
                          />
                        </div>

                        {/* Rule 11: Hand or Account Mode */}
                        <div className="form-group">
                          <label style={{ fontWeight: 700, fontSize: '0.85rem', marginBottom: '0.4rem', display: 'block' }}>
                            {lang === 'ta' ? 'செலுத்திய விதம் (கையில் / வங்கி கணக்கு)' : 'Payment Method (Hand / Account)'} <span style={{ color: '#ef4444' }}>*</span>
                          </label>
                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                            <button
                              type="button"
                              onClick={() => handleFieldChange('paymentMode', 'cash')}
                              style={{
                                padding: '0.55rem',
                                borderRadius: '8px',
                                border: formData.paymentMode === 'cash' ? '2px solid #059669' : '1px solid #cbd5e1',
                                background: formData.paymentMode === 'cash' ? '#dcfce7' : '#ffffff',
                                color: formData.paymentMode === 'cash' ? '#166534' : '#475569',
                                fontWeight: 800,
                                fontSize: '0.85rem',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '0.35rem'
                              }}
                            >
                              <span>💵</span>
                              <span>{lang === 'ta' ? 'கையில் (Hand / Cash)' : 'Hand (Cash)'}</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => handleFieldChange('paymentMode', 'bank_account')}
                              style={{
                                padding: '0.55rem',
                                borderRadius: '8px',
                                border: formData.paymentMode === 'bank_account' ? '2px solid #0284c7' : '1px solid #cbd5e1',
                                background: formData.paymentMode === 'bank_account' ? '#e0f2fe' : '#ffffff',
                                color: formData.paymentMode === 'bank_account' ? '#0369a1' : '#475569',
                                fontWeight: 800,
                                fontSize: '0.85rem',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '0.35rem'
                              }}
                            >
                              <span>🏦</span>
                              <span>{lang === 'ta' ? 'வங்கி கணக்கு (Account / UPI)' : 'Account (UPI / Bank)'}</span>
                            </button>
                          </div>
                        </div>

                        {/* Rule 10: Collector Person */}
                        <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem' }}>
                            <label style={{ margin: 0, fontWeight: 700, fontSize: '0.85rem' }}>
                              {lang === 'ta' ? 'பணம் வசூலித்தவர் (Collector Person)' : 'Collector Person'} <span style={{ color: '#ef4444' }}>*</span>
                            </label>
                            <button
                              type="button"
                              onClick={() => handleFieldChange('collectedBy', `${loggedUserName} (${lang === 'ta' ? 'நீங்கள்' : 'You'})`)}
                              style={{
                                background: '#e0f2fe',
                                border: '1px solid #7dd3fc',
                                color: '#0369a1',
                                fontSize: '0.75rem',
                                cursor: 'pointer',
                                fontWeight: 700,
                                padding: '2px 8px',
                                borderRadius: '4px'
                              }}
                              title="Set logged-in user as collector"
                            >
                              👤 {lang === 'ta' ? 'நானே வசூலித்தேன்' : 'I Collected Myself'}
                            </button>
                          </div>
                          <SearchableSelect
                            label=""
                            value={formData.collectedBy}
                            onChange={(val) => handleFieldChange('collectedBy', val)}
                            options={collectorOptions}
                            placeholder={lang === 'ta' ? '-- வசூலித்தவரைத் தேர்ந்தெடுக்கவும் --' : '-- Select Collector --'}
                            searchPlaceholder={lang === 'ta' ? 'வசூலித்தவரைத் தேட...' : 'Search collector...'}
                            allowCustom
                            customButtonText={lang === 'ta' ? 'இந்தப் பெயரைப் பயன்படுத்து' : 'Use this person'}
                            lang={lang}
                          />
                        </div>

                      </div>
                    </div>
                  )}

                  {formData.paymentStatus === 'unpaid' && (
                    <div style={{
                      marginTop: '0.85rem',
                      padding: '0.65rem 0.85rem',
                      background: '#fffbeb',
                      borderRadius: '8px',
                      border: '1px solid #fef08a',
                      color: '#92400e',
                      fontSize: '0.825rem',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem'
                    }}>
                      <AlertCircle size={18} style={{ color: '#d97706', flexShrink: 0 }} />
                      <div>
                        {lang === 'ta' 
                          ? `முழுத் தொகை ₹${formData.totalAmount} நிலுவை பாக்கியாகப் பதிவு செய்யப்படும். விவசாயி பணம் தரும் போது டிரிப் சீட்டைத் திறந்து வசூலிக்கலாம்.`
                          : `Full amount ₹${formData.totalAmount} will be saved as outstanding credit. You can mark it collected anytime later.`}
                      </div>
                    </div>
                  )}
                </div>

                {/* Field Notes / Work Remarks */}
                <div className="form-group col-full">
                  <VoiceInput
                    label={lang === 'ta' ? 'குறிப்புகள் / வேலை விளக்கம்' : 'Field Notes / Remarks'}
                    placeholder={lang === 'ta' ? 'எ.கா: ரோட்டாவேட்டர் 2 முறை உழவு அல்லது மஞ்சள் பயிருக்கு பாத்தி அமைப்பு' : 'e.g. Rotavator fine tilling or sugarcane ridges'}
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
