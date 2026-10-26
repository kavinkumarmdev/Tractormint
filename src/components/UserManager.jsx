import React, { useState, useEffect } from 'react';
import { 
  Users, 
  UserPlus, 
  ShieldCheck, 
  ShieldAlert, 
  Shield, 
  Key, 
  Lock, 
  Phone, 
  CheckCircle2, 
  XCircle, 
  Edit3, 
  Trash2, 
  Search, 
  Filter, 
  AlertCircle,
  Eye,
  EyeOff,
  UserCheck,
  HelpCircle,
  Check,
  Minus,
  ChevronUp,
  ChevronDown,
  Tractor,
  History,
  Clock,
  Download,
  RefreshCw,
  Smartphone,
  Laptop
} from 'lucide-react';
import { translations } from '../translations/dictionary';
import { StorageService, normalizePhone, validatePhone10 } from '../services/storage';
import SearchableSelect from './common/SearchableSelect';
import BilingualVoiceGroup from './common/BilingualVoiceGroup';
import VoiceInput from './common/VoiceInput';

export default function UserManager({
  users = [],
  onSaveUser,
  onDeleteUser,
  currentUser,
  adminPin,
  lang,
  role
}) {
  const t = translations[lang];
  const [activeSubTab, setActiveSubTab] = useState('accounts'); // 'accounts' | 'history'
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [showPermGuide, setShowPermGuide] = useState(false);

  // Login History State
  const [loginLogs, setLoginLogs] = useState(() => StorageService.getLoginHistory());
  const [historySearch, setHistorySearch] = useState('');
  const [historyStatusFilter, setHistoryStatusFilter] = useState('all');
  const [showClearHistoryModal, setShowClearHistoryModal] = useState(false);
  const [clearHistoryPin, setClearHistoryPin] = useState('');
  const [clearHistoryError, setClearHistoryError] = useState('');

  const refreshLoginLogs = () => {
    setLoginLogs(StorageService.getLoginHistory());
  };

  // Form State
  const [formData, setFormData] = useState({
    username: '',
    displayName: '',
    displayName_ta: '',
    pin: '',
    role: 'operator',
    phone: '',
    status: 'active'
  });
  const [showPin, setShowPin] = useState(false);
  const [formError, setFormError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Delete Prompt State
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deletePinInput, setDeletePinInput] = useState('');
  const [deleteError, setDeleteError] = useState('');

  // Open Modal for Add
  const handleOpenAdd = () => {
    setEditingUser(null);
    setFormData({
      username: '',
      displayName: '',
      displayName_ta: '',
      pin: '',
      role: 'operator',
      phone: '',
      status: 'active'
    });
    setFormError('');
    setShowPin(false);
    setIsModalOpen(true);
  };

  // Open Modal for Edit
  const handleOpenEdit = (user) => {
    setEditingUser(user);
    setFormData({
      username: user.username || '',
      displayName: user.displayName || '',
      displayName_ta: user.displayName_ta || user.displayName || '',
      pin: user.pin !== undefined && user.pin !== null ? String(user.pin) : '',
      role: user.role || 'operator',
      phone: user.phone !== undefined && user.phone !== null ? String(user.phone) : '',
      status: user.status || 'active'
    });
    setFormError('');
    setShowPin(false);
    setIsModalOpen(true);
  };

  // Save / Submit
  const handleSubmit = (e) => {
    e.preventDefault();
    setFormError('');

    if (!formData.username.trim()) {
      setFormError(lang === 'ta' ? 'பயனர் பெயர் அவசியம்!' : 'Username is required!');
      return;
    }

    // 10-digit Mobile Phone Validation
    if (!formData.phone || !formData.phone.trim()) {
      setFormError(lang === 'ta' ? 'பணியாளர் அலைபேசி எண் அவசியம்!' : 'Staff mobile number is required!');
      return;
    }

    const phoneVal = validatePhone10(formData.phone, lang === 'ta' ? 'பணியாளர்' : 'Staff User');
    if (!phoneVal.valid) {
      setFormError(
        lang === 'ta'
          ? 'மொபைல் எண் சரியாக 10 இலக்கங்களாக இருக்க வேண்டும் (எ.கா. 9842211223) மற்றும் 6, 7, 8, அல்லது 9-ல் தொடங்க வேண்டும்.'
          : phoneVal.error
      );
      return;
    }

    const cleanPhone = phoneVal.phone;

    // Strict Uniqueness Check across all staff user logins
    const duplicate = users.find(u => {
      if (editingUser && u.id === editingUser.id) return false;
      return normalizePhone(u.phone) === cleanPhone;
    });

    if (duplicate) {
      setFormError(
        lang === 'ta'
          ? `அலைபேசி எண் "${cleanPhone}" ஏற்கனவே பயனர் @${duplicate.username} (${duplicate.displayName || ''}) கணக்கில் உள்ளது!`
          : `Mobile number "${cleanPhone}" is already assigned to user @${duplicate.username}!`
      );
      return;
    }

    if (!formData.pin || String(formData.pin).trim().length < 4) {
      setFormError(lang === 'ta' ? 'கடவுச்சொல்/PIN குறைந்தது 4 எழுத்துக்கள் இருக்க வேண்டும்!' : 'PIN must be at least 4 digits!');
      return;
    }

    const payload = {
      ...(editingUser || {}),
      username: formData.username.trim().toLowerCase(),
      displayName: formData.displayName.trim() || formData.username.trim(),
      displayName_ta: formData.displayName_ta.trim() || formData.displayName.trim() || formData.username.trim(),
      pin: String(formData.pin).trim(),
      role: formData.role,
      phone: cleanPhone,
      status: formData.status
    };

    const res = onSaveUser(payload);
    if (res && res.success) {
      setIsModalOpen(false);
      setSuccessMsg(
        editingUser 
          ? (lang === 'ta' ? 'பயனர் விவரங்கள் புதுப்பிக்கப்பட்டன!' : 'User updated successfully!') 
          : (lang === 'ta' ? 'புதிய உள்நுழைவு பயனர் உருவாக்கப்பட்டது!' : 'New login user created successfully!')
      );
      setTimeout(() => setSuccessMsg(''), 3500);
    } else {
      setFormError(res?.error || 'Failed to save user.');
    }
  };

  // Toggle User Status (Active / Inactive)
  const handleToggleStatus = (user) => {
    if (user.isDefault || user.username === 'admin') {
      alert(lang === 'ta' ? 'முதன்மை அட்மினை முடக்க முடியாது!' : 'Cannot deactivate Master Admin account!');
      return;
    }
    const newStatus = user.status === 'active' ? 'inactive' : 'active';
    onSaveUser({
      ...user,
      status: newStatus
    });
  };

  // Handle Delete Confirmation
  const confirmDelete = () => {
    if (!deleteTarget) return;
    setDeleteError('');
    const res = onDeleteUser(deleteTarget.id, deletePinInput);
    if (res && res.success) {
      setDeleteTarget(null);
      setDeletePinInput('');
      setSuccessMsg(lang === 'ta' ? 'பயனர் நீக்கப்பட்டது!' : 'User deleted successfully!');
      setTimeout(() => setSuccessMsg(''), 3500);
    } else {
      setDeleteError(res?.error || 'Incorrect Admin PIN.');
    }
  };

  // Filter Users
  const filteredUsers = users.filter((u) => {
    const matchesSearch = 
      (u.username || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (u.displayName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (u.displayName_ta || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (u.phone || '').includes(searchTerm);

    const matchesRole = roleFilter === 'all' || u.role === roleFilter;
    return matchesSearch && matchesRole;
  });

  // Role Badge Helper
  const getRoleBadge = (userRole) => {
    switch (userRole) {
      case 'admin':
        return { label: lang === 'ta' ? 'நிர்வாகி (Admin)' : 'Administrator', bg: '#ecfdf5', color: '#065f46', border: '#a7f3d0' };
      case 'operator':
        return { label: lang === 'ta' ? 'ஆபரேட்டர் (Operator)' : 'Field Operator', bg: '#fef3c7', color: '#92400e', border: '#fde68a' };
      case 'driver':
        return { label: lang === 'ta' ? 'டிரைவர் (Driver)' : 'Tractor Driver', bg: '#eff6ff', color: '#1e40af', border: '#bfdbfe' };
      case 'manager':
        return { label: lang === 'ta' ? 'மேலாளர் (Manager)' : 'Manager / Supervisor', bg: '#faf5ff', color: '#6b21a8', border: '#e9d5ff' };
      default:
        return { label: userRole, bg: '#f1f5f9', color: '#334155', border: '#cbd5e1' };
    }
  };

  // Handle Export History CSV
  const handleExportHistoryCSV = () => {
    if (!loginLogs || loginLogs.length === 0) return;
    const headers = ["Timestamp", "Username", "Staff Name", "Role", "Status", "Reason", "Device"];
    const rows = loginLogs.map(l => [
      `"${l.timestamp || ''}"`,
      `"${l.username || ''}"`,
      `"${l.displayName || ''}"`,
      `"${l.role || ''}"`,
      `"${l.status || ''}"`,
      `"${(l.reason || '').replace(/"/g, '""')}"`,
      `"${l.device || ''}"`
    ]);
    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `tractomint_login_audit_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Handle Clear History Confirmation
  const handleConfirmClearHistory = () => {
    setClearHistoryError('');
    const res = StorageService.clearLoginHistory(clearHistoryPin);
    if (res && res.success) {
      setShowClearHistoryModal(false);
      setClearHistoryPin('');
      refreshLoginLogs();
      setSuccessMsg(lang === 'ta' ? 'உள்நுழைவு வரலாறு அழிக்கப்பட்டது!' : 'Login history cleared successfully!');
      setTimeout(() => setSuccessMsg(''), 3500);
    } else {
      setClearHistoryError(res?.error || 'Incorrect PIN.');
    }
  };

  // Filter Login History Logs
  const filteredHistoryLogs = loginLogs.filter((log) => {
    const matchesSearch = 
      (log.username || '').toLowerCase().includes(historySearch.toLowerCase()) ||
      (log.displayName || '').toLowerCase().includes(historySearch.toLowerCase()) ||
      (log.reason || '').toLowerCase().includes(historySearch.toLowerCase()) ||
      (log.device || '').toLowerCase().includes(historySearch.toLowerCase());
    
    const matchesStatus = historyStatusFilter === 'all' || log.status === historyStatusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div>
      {/* Header bar */}
      <div className="card-header-bar">
        <div className="card-title-group">
          <h2 style={{ margin: 0 }}>
            <Users size={22} color="var(--primary-600)" />
            {lang === 'ta' ? 'பணியாளர்கள் & உள்நுழைவு மேலாண்மை' : 'Staff Accounts & Login Management'}
          </h2>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          {activeSubTab === 'accounts' ? (
            <>
              <button 
                type="button" 
                className="btn btn-outline"
                onClick={() => setShowPermGuide(!showPermGuide)}
                style={{ fontWeight: 600 }}
              >
                <HelpCircle size={16} />
                <span>{lang === 'ta' ? '4 நிலைகள் & அனுமதிகள்' : 'Role Permissions Guide'}</span>
                {showPermGuide ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
              </button>
              <button className="btn btn-primary" onClick={handleOpenAdd}>
                <UserPlus size={16} />
                <span>{lang === 'ta' ? 'புதிய பயனர் உருவாக்கு' : 'Add Login User'}</span>
              </button>
            </>
          ) : (
            <>
              <button 
                type="button" 
                className="btn btn-outline btn-sm"
                onClick={refreshLoginLogs}
                title={lang === 'ta' ? 'புதுப்பி' : 'Refresh'}
              >
                <RefreshCw size={15} />
                <span>{lang === 'ta' ? 'புதுப்பி' : 'Refresh'}</span>
              </button>
              <button 
                type="button" 
                className="btn btn-outline btn-sm"
                onClick={handleExportHistoryCSV}
                disabled={loginLogs.length === 0}
                title={lang === 'ta' ? 'பதிவிறக்கு' : 'Export CSV'}
              >
                <Download size={15} />
                <span>{lang === 'ta' ? 'பதிவிறக்கு' : 'Export CSV'}</span>
              </button>
              {role === 'admin' && (
                <button 
                  type="button" 
                  className="btn btn-outline btn-sm"
                  style={{ color: '#ef4444', borderColor: '#fca5a5' }}
                  onClick={() => {
                    setShowClearHistoryModal(true);
                    setClearHistoryPin('');
                    setClearHistoryError('');
                  }}
                  disabled={loginLogs.length === 0}
                  title={lang === 'ta' ? 'அழி' : 'Clear Log'}
                >
                  <Trash2 size={15} />
                  <span>{lang === 'ta' ? 'அழி' : 'Clear Log'}</span>
                </button>
              )}
            </>
          )}
        </div>
      </div>

      {/* Sub Tabs: Staff Accounts vs Login Audit History */}
      <div style={{ 
        display: 'flex', 
        gap: '0.5rem', 
        marginBottom: '1.25rem', 
        borderBottom: '1px solid var(--border-color)', 
        paddingBottom: '0.75rem',
        flexWrap: 'wrap'
      }}>
        <button
          type="button"
          className={`btn ${activeSubTab === 'accounts' ? 'btn-primary' : 'btn-outline'}`}
          onClick={() => setActiveSubTab('accounts')}
          style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', fontSize: '0.85rem' }}
        >
          <Users size={16} />
          <span>{lang === 'ta' ? 'பணியாளர் கணக்குகள்' : 'Staff Accounts'}</span>
          <span style={{ 
            background: activeSubTab === 'accounts' ? 'rgba(255,255,255,0.25)' : 'var(--bg-main)', 
            padding: '0.1rem 0.45rem', 
            borderRadius: '10px', 
            fontSize: '0.75rem',
            fontWeight: 700
          }}>
            {users.length}
          </span>
        </button>

        <button
          type="button"
          className={`btn ${activeSubTab === 'history' ? 'btn-primary' : 'btn-outline'}`}
          onClick={() => {
            refreshLoginLogs();
            setActiveSubTab('history');
          }}
          style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', fontSize: '0.85rem' }}
        >
          <History size={16} />
          <span>{lang === 'ta' ? 'உள்நுழைவு வரலாறு & தணிக்கை' : 'Login Audit History'}</span>
          <span style={{ 
            background: activeSubTab === 'history' ? 'rgba(255,255,255,0.25)' : 'var(--bg-main)', 
            padding: '0.1rem 0.45rem', 
            borderRadius: '10px', 
            fontSize: '0.75rem',
            fontWeight: 700
          }}>
            {loginLogs.length}
          </span>
        </button>
      </div>

      {/* Staff Accounts Sub-Tab */}
      {activeSubTab === 'accounts' && (
        <>
          {/* Roles & Permissions Explanation Guide */}
      {showPermGuide && (
        <div className="content-card" style={{ 
          marginBottom: '1.5rem', 
          border: '1.5px solid var(--primary-300)',
          background: 'var(--bg-card)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.75rem' }}>
            <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <ShieldCheck size={20} color="var(--primary-600)" />
              {lang === 'ta' ? '4 பயனர் நிலைகள் மற்றும் அவற்றின் அனுமதிகள் விளக்கம்' : 'Explanation of 4 System Roles & Permissions'}
            </h3>
            <button 
              type="button" 
              className="btn btn-outline btn-sm"
              onClick={() => setShowPermGuide(false)}
            >
              {lang === 'ta' ? 'மறை' : 'Hide'}
            </button>
          </div>

          {/* Role Summary Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '0.75rem', marginBottom: '1.25rem' }}>
            {/* 1. Admin */}
            <div style={{ padding: '0.85rem', borderRadius: 'var(--radius-sm)', background: '#ecfdf5', border: '1px solid #a7f3d0' }}>
              <div style={{ fontWeight: 800, color: '#065f46', fontSize: '0.9rem', marginBottom: '0.25rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                <ShieldCheck size={16} />
                <span>1. {lang === 'ta' ? 'முதன்மை நிர்வாகி (Admin)' : 'Administrator'}</span>
              </div>
              <p style={{ margin: 0, fontSize: '0.75rem', color: '#047857', lineHeight: 1.4 }}>
                {lang === 'ta' 
                  ? 'முழு அதிகாரம். அனைத்து தொகுதிகளையும் (Billing, Fleet, User Accounts, Google Sheets Sync, Audit Bin) நிர்வகிக்கலாம். பதிவுகளை நிரந்தரமாக நீக்கலாம்.' 
                  : 'Full master access. Can manage billing, fleet, user credentials, Google Sheets integration, and permanent record deletions.'}
              </p>
            </div>

            {/* 2. Manager */}
            <div style={{ padding: '0.85rem', borderRadius: 'var(--radius-sm)', background: '#faf5ff', border: '1px solid #e9d5ff' }}>
              <div style={{ fontWeight: 800, color: '#6b21a8', fontSize: '0.9rem', marginBottom: '0.25rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                <Shield size={16} />
                <span>2. {lang === 'ta' ? 'மேலாளர் (Manager)' : 'Operations Manager'}</span>
              </div>
              <p style={{ margin: 0, fontSize: '0.75rem', color: '#7e22ce', lineHeight: 1.4 }}>
                {lang === 'ta' 
                  ? 'கள & அலுவலக மேற்பார்வையாளர். டிரிப்புகள், வண்டிகள், வாடிக்கையாளர்கள், செலவுகள், பங்குதாரர் வரவு செலவு ஆகியவற்றை பதிவிடலாம். நீக்க அனுமதி இல்லை.' 
                  : 'Operational oversight. Manages trips, fleet, maintenance, rate cards, expenses, and partner splits. Cannot delete records or manage user logins.'}
              </p>
            </div>

            {/* 3. Operator */}
            <div style={{ padding: '0.85rem', borderRadius: 'var(--radius-sm)', background: '#fef3c7', border: '1px solid #fde68a' }}>
              <div style={{ fontWeight: 800, color: '#92400e', fontSize: '0.9rem', marginBottom: '0.25rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                <UserCheck size={16} />
                <span>3. {lang === 'ta' ? 'ஆபரேட்டர் (Field Operator)' : 'Field Billing Operator'}</span>
              </div>
              <p style={{ margin: 0, fontSize: '0.75rem', color: '#b45309', lineHeight: 1.4 }}>
                {lang === 'ta' 
                  ? 'தினசரி உழவு பில்லிங், டிரிப் ரசீது அச்சிடுதல், வாடிக்கையாளர் விவரம் சேர்த்தல், டீசல்/பராமரிப்பு செலவு பதிவு செய்தல். பங்குதாரர் லாபம் மற்றும் அமைப்புகள் மறைக்கப்படும்.' 
                  : 'Daily field billing, prints/shares trip slips, adds new customers, logs fuel & maintenance. Partner profits & settings are hidden.'}
              </p>
            </div>

            {/* 4. Driver */}
            <div style={{ padding: '0.85rem', borderRadius: 'var(--radius-sm)', background: '#eff6ff', border: '1px solid #bfdbfe' }}>
              <div style={{ fontWeight: 800, color: '#1e40af', fontSize: '0.9rem', marginBottom: '0.25rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                <Tractor size={16} />
                <span>4. {lang === 'ta' ? 'டிரைவர் (Tractor Driver)' : 'Tractor Driver'}</span>
              </div>
              <p style={{ margin: 0, fontSize: '0.75rem', color: '#1d4ed8', lineHeight: 1.4 }}>
                {lang === 'ta' 
                  ? 'டிரைவர் சுய பார்வை. தங்களின் டிரிப் தாள்கள் மற்றும் ரசீதுகளை பார்க்கலாம், வண்டி விவரங்கள் மற்றும் டீசல்/பழுது விவரங்களை பதிவு செய்யலாம்.' 
                  : 'Driver self-service. Views assigned trips & slips, inspects fleet machines, and logs fuel/breakdown notes.'}
              </p>
            </div>
          </div>

          {/* Matrix Table */}
          <div className="table-responsive" style={{ border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)' }}>
            <table className="data-table" style={{ fontSize: '0.78rem' }}>
              <thead>
                <tr>
                  <th style={{ minWidth: '180px' }}>{lang === 'ta' ? 'அம்சங்கள் / அனுமதிகள்' : 'Feature / Permission'}</th>
                  <th style={{ textAlign: 'center', width: '90px', background: '#ecfdf5', color: '#065f46' }}>Admin</th>
                  <th style={{ textAlign: 'center', width: '90px', background: '#faf5ff', color: '#6b21a8' }}>Manager</th>
                  <th style={{ textAlign: 'center', width: '90px', background: '#fef3c7', color: '#92400e' }}>Operator</th>
                  <th style={{ textAlign: 'center', width: '90px', background: '#eff6ff', color: '#1e40af' }}>Driver</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td><strong>{lang === 'ta' ? 'டாஷ்போர்டு & புள்ளிவிவரங்கள்' : 'Dashboard & Fleet Analytics'}</strong></td>
                  <td style={{ textAlign: 'center' }}><Check size={16} color="#059669" /></td>
                  <td style={{ textAlign: 'center' }}><Check size={16} color="#059669" /></td>
                  <td style={{ textAlign: 'center' }}><Check size={16} color="#059669" /></td>
                  <td style={{ textAlign: 'center' }}><Check size={16} color="#059669" /></td>
                </tr>
                <tr>
                  <td><strong>{lang === 'ta' ? 'டிரிப் ஷீட் பதிவு & பில் ரசீது' : 'Trip Sheets Entry & Trip Slips'}</strong></td>
                  <td style={{ textAlign: 'center' }}><Check size={16} color="#059669" /></td>
                  <td style={{ textAlign: 'center' }}><Check size={16} color="#059669" /></td>
                  <td style={{ textAlign: 'center' }}><Check size={16} color="#059669" /></td>
                  <td style={{ textAlign: 'center' }}><Check size={16} color="#059669" /></td>
                </tr>
                <tr>
                  <td><strong>{lang === 'ta' ? 'டிராக்டர் & இயந்திரங்கள் பட்டியல்' : 'Fleet & Machinery Roster'}</strong></td>
                  <td style={{ textAlign: 'center' }}><Check size={16} color="#059669" /></td>
                  <td style={{ textAlign: 'center' }}><Check size={16} color="#059669" /></td>
                  <td style={{ textAlign: 'center' }}><Check size={16} color="#059669" /></td>
                  <td style={{ textAlign: 'center' }}><Check size={16} color="#059669" /></td>
                </tr>
                <tr>
                  <td><strong>{lang === 'ta' ? 'டீசல் & பராமரிப்பு பதிவுகள்' : 'Fuel & Maintenance Logs'}</strong></td>
                  <td style={{ textAlign: 'center' }}><Check size={16} color="#059669" /></td>
                  <td style={{ textAlign: 'center' }}><Check size={16} color="#059669" /></td>
                  <td style={{ textAlign: 'center' }}><Check size={16} color="#059669" /></td>
                  <td style={{ textAlign: 'center' }}><Check size={16} color="#059669" /></td>
                </tr>
                <tr>
                  <td><strong>{lang === 'ta' ? 'வாடிக்கையாளர்கள் & டிரைவர்கள் மேலாண்மை' : 'Customers & Drivers Directory'}</strong></td>
                  <td style={{ textAlign: 'center' }}><Check size={16} color="#059669" /></td>
                  <td style={{ textAlign: 'center' }}><Check size={16} color="#059669" /></td>
                  <td style={{ textAlign: 'center' }}><Check size={16} color="#059669" /></td>
                  <td style={{ textAlign: 'center' }}><Minus size={16} color="#94a3b8" /></td>
                </tr>
                <tr>
                  <td><strong>{lang === 'ta' ? 'வாடகை விலை பட்டியல் (Rate Card)' : 'Combination Rate Matrix'}</strong></td>
                  <td style={{ textAlign: 'center' }}><Check size={16} color="#059669" /></td>
                  <td style={{ textAlign: 'center' }}><Check size={16} color="#059669" /></td>
                  <td style={{ textAlign: 'center' }}><Minus size={16} color="#94a3b8" /></td>
                  <td style={{ textAlign: 'center' }}><Minus size={16} color="#94a3b8" /></td>
                </tr>
                <tr>
                  <td><strong>{lang === 'ta' ? 'இதர வரவு & செலவு கணக்கு' : 'Income & Expense Ledger'}</strong></td>
                  <td style={{ textAlign: 'center' }}><Check size={16} color="#059669" /></td>
                  <td style={{ textAlign: 'center' }}><Check size={16} color="#059669" /></td>
                  <td style={{ textAlign: 'center' }}><Check size={16} color="#059669" /></td>
                  <td style={{ textAlign: 'center' }}><Minus size={16} color="#94a3b8" /></td>
                </tr>
                <tr>
                  <td><strong>{lang === 'ta' ? 'பங்குதாரர் லாபப் பகிர்வு (Partner Split)' : 'Partner Equity & Profit Split'}</strong></td>
                  <td style={{ textAlign: 'center' }}><Check size={16} color="#059669" /></td>
                  <td style={{ textAlign: 'center' }}><Check size={16} color="#059669" /></td>
                  <td style={{ textAlign: 'center' }}><Minus size={16} color="#94a3b8" /></td>
                  <td style={{ textAlign: 'center' }}><Minus size={16} color="#94a3b8" /></td>
                </tr>
                <tr>
                  <td><strong>{lang === 'ta' ? 'பயனர் கணக்குகள் மேலாண்மை (Staff Logins)' : 'Staff User Accounts Management'}</strong></td>
                  <td style={{ textAlign: 'center' }}><Check size={16} color="#059669" /></td>
                  <td style={{ textAlign: 'center' }}><Minus size={16} color="#94a3b8" /></td>
                  <td style={{ textAlign: 'center' }}><Minus size={16} color="#94a3b8" /></td>
                  <td style={{ textAlign: 'center' }}><Minus size={16} color="#94a3b8" /></td>
                </tr>
                <tr>
                  <td><strong>{lang === 'ta' ? 'நீக்கப்பட்டவை மீட்டெடுப்பு (Audit Trash)' : 'Audit Trash & Soft-Delete Restore'}</strong></td>
                  <td style={{ textAlign: 'center' }}><Check size={16} color="#059669" /></td>
                  <td style={{ textAlign: 'center' }}><Minus size={16} color="#94a3b8" /></td>
                  <td style={{ textAlign: 'center' }}><Minus size={16} color="#94a3b8" /></td>
                  <td style={{ textAlign: 'center' }}><Minus size={16} color="#94a3b8" /></td>
                </tr>
                <tr>
                  <td><strong>{lang === 'ta' ? 'கூகுள் ஷீட் மேகக்கணி இணைப்பு (Sheets Sync)' : 'Google Sheets Sync Configuration'}</strong></td>
                  <td style={{ textAlign: 'center' }}><Check size={16} color="#059669" /></td>
                  <td style={{ textAlign: 'center' }}><Minus size={16} color="#94a3b8" /></td>
                  <td style={{ textAlign: 'center' }}><Minus size={16} color="#94a3b8" /></td>
                  <td style={{ textAlign: 'center' }}><Minus size={16} color="#94a3b8" /></td>
                </tr>
                <tr>
                  <td><strong>{lang === 'ta' ? 'பதிவுகளை நீக்குதல் (Admin PIN தேவை)' : 'Delete Records (Admin PIN required)'}</strong></td>
                  <td style={{ textAlign: 'center' }}><Check size={16} color="#059669" /></td>
                  <td style={{ textAlign: 'center' }}><Minus size={16} color="#94a3b8" /></td>
                  <td style={{ textAlign: 'center' }}><Minus size={16} color="#94a3b8" /></td>
                  <td style={{ textAlign: 'center' }}><Minus size={16} color="#94a3b8" /></td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Global Success Banner */}
      {successMsg && (
        <div style={{
          padding: '0.75rem 1rem',
          borderRadius: 'var(--radius-sm)',
          background: '#ecfdf5',
          color: '#065f46',
          fontSize: '0.875rem',
          fontWeight: 600,
          marginBottom: '1.25rem',
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          border: '1px solid #a7f3d0'
        }}>
          <CheckCircle2 size={18} />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Security Status Banner */}
      <div style={{
        background: 'linear-gradient(135deg, rgba(6, 78, 59, 0.08), rgba(15, 118, 110, 0.08))',
        border: '1px solid rgba(6, 78, 59, 0.2)',
        borderRadius: 'var(--radius-md)',
        padding: '1rem 1.25rem',
        marginBottom: '1.5rem',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '0.75rem'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div style={{
            width: '36px',
            height: '36px',
            borderRadius: '50%',
            background: 'var(--primary-600)',
            color: '#fff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 2px 8px rgba(6, 78, 59, 0.3)'
          }}>
            <ShieldCheck size={20} />
          </div>
          <div>
            <h4 style={{ fontSize: '0.95rem', fontWeight: 800, margin: 0, color: 'var(--primary-800)' }}>
              {lang === 'ta' ? 'கட்டுப்படுத்தப்பட்ட உள்நுழைவு பாதுகாப்பு' : 'Strict Admin Access Control'}
            </h4>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              {lang === 'ta' 
                ? 'பொது பதிவு முடக்கப்பட்டுள்ளது. அட்மின் பதிவு செய்த பயனர்கள் மட்டுமே உள்நுழையலாம்.' 
                : 'Self-signup is disabled. Only accounts created by the Administrator can authenticate.'}
            </span>
          </div>
        </div>
        <span style={{
          fontSize: '0.75rem',
          fontWeight: 700,
          padding: '0.35rem 0.75rem',
          borderRadius: '999px',
          background: 'var(--primary-100)',
          color: 'var(--primary-800)',
          border: '1px solid var(--primary-300)'
        }}>
          {users.length} {lang === 'ta' ? 'பதிவு செய்யப்பட்ட கணக்குகள்' : 'Registered Users'}
        </span>
      </div>

      {/* KPI Cards */}
      <div className="kpi-grid" style={{ marginBottom: '1.5rem', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))' }}>
        <div className="kpi-card">
          <span className="kpi-label">{lang === 'ta' ? 'மொத்த பயனர்கள்' : 'Total Users'}</span>
          <span className="kpi-value">{users.length}</span>
          <span className="kpi-subtext">{users.filter(u => u.status === 'active').length} active</span>
        </div>
        <div className="kpi-card">
          <span className="kpi-label">{lang === 'ta' ? 'நிர்வாகிகள் (Admins)' : 'Administrators'}</span>
          <span className="kpi-value" style={{ color: '#059669' }}>
            {users.filter(u => u.role === 'admin').length}
          </span>
          <span className="kpi-subtext">Full permissions</span>
        </div>
        <div className="kpi-card">
          <span className="kpi-label">{lang === 'ta' ? 'ஆபரேட்டர்கள் (Staff)' : 'Field Operators'}</span>
          <span className="kpi-value" style={{ color: '#d97706' }}>
            {users.filter(u => u.role === 'operator').length}
          </span>
          <span className="kpi-subtext">Billing & Fleet</span>
        </div>
        <div className="kpi-card">
          <span className="kpi-label">{lang === 'ta' ? 'டிரைவர்கள் & ஊழியர்கள்' : 'Drivers / Staff'}</span>
          <span className="kpi-value" style={{ color: '#2563eb' }}>
            {users.filter(u => u.role === 'driver' || u.role === 'manager').length}
          </span>
          <span className="kpi-subtext">Operational staff</span>
        </div>
      </div>

      {/* Filters and Search Bar */}
      <div className="table-controls-bar">
        <div className="search-input-wrapper">
          <Search size={16} className="search-icon" />
          <input
            type="text"
            className="form-control search-input"
            placeholder={lang === 'ta' ? 'பெயர், பயனர் பெயர் அல்லது எண் தேட...' : 'Search by username, name, phone...'}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          <Filter size={15} color="var(--text-light)" />
          <select 
            className="form-control" 
            style={{ width: 'auto', minWidth: '130px' }}
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
          >
            <option value="all">{lang === 'ta' ? 'அனைத்து நிலைகளும்' : 'All Roles'}</option>
            <option value="admin">Administrator</option>
            <option value="operator">Field Operator</option>
            <option value="driver">Tractor Driver</option>
            <option value="manager">Manager / Supervisor</option>
          </select>
        </div>
      </div>

      {/* Users Table */}
      <div className="content-card" style={{ padding: 0, overflow: 'hidden' }}>
        <div className="table-responsive">
          <table className="custom-table">
            <thead>
              <tr>
                <th>{lang === 'ta' ? 'பயனர் விவரம்' : 'User / Staff'}</th>
                <th>{lang === 'ta' ? 'உள்நுழைவு பெயர்' : 'Username'}</th>
                <th>{lang === 'ta' ? 'அணுகல் நிலை' : 'Role'}</th>
                <th>{lang === 'ta' ? 'தொலைபேசி' : 'Phone'}</th>
                <th>{lang === 'ta' ? 'நிலை' : 'Status'}</th>
                <th>{lang === 'ta' ? 'கடைசி உள்நுழைவு' : 'Last Login'}</th>
                <th style={{ textAlign: 'right' }}>{t.actions}</th>
              </tr>
            </thead>
            <tbody>
              {filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ textAlign: 'center', padding: '2.5rem', color: 'var(--text-muted)' }}>
                    {lang === 'ta' ? 'பயனர்கள் எவரும் காணப்படவில்லை.' : 'No users found.'}
                  </td>
                </tr>
              ) : (
                filteredUsers.map((u) => {
                  const badge = getRoleBadge(u.role);
                  const isCurrent = currentUser?.username?.toLowerCase() === u.username.toLowerCase();
                  return (
                    <tr key={u.id}>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                          <div style={{
                            width: '34px',
                            height: '34px',
                            borderRadius: '50%',
                            background: u.role === 'admin' ? 'var(--primary-600)' : '#64748b',
                            color: '#fff',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontWeight: 700,
                            fontSize: '0.85rem'
                          }}>
                            {(u.displayName || u.username || 'U')[0].toUpperCase()}
                          </div>
                          <div>
                            <div style={{ fontWeight: 700, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                              <span>{lang === 'ta' ? (u.displayName_ta || u.displayName) : u.displayName}</span>
                              {isCurrent && (
                                <span style={{ fontSize: '0.65rem', background: '#ecfdf5', color: '#065f46', border: '1px solid #a7f3d0', padding: '0.1rem 0.4rem', borderRadius: '4px' }}>
                                  You
                                </span>
                              )}
                              {u.isDefault && (
                                <span style={{ fontSize: '0.65rem', background: '#fef3c7', color: '#92400e', border: '1px solid #fde68a', padding: '0.1rem 0.4rem', borderRadius: '4px' }}>
                                  Master
                                </span>
                              )}
                            </div>
                            {lang === 'ta' && u.displayName && u.displayName_ta && u.displayName !== u.displayName_ta && (
                              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{u.displayName}</div>
                            )}
                          </div>
                        </div>
                      </td>

                      <td>
                        <code style={{ fontSize: '0.8rem', background: 'var(--bg-subtle)', padding: '0.2rem 0.45rem', borderRadius: '4px' }}>
                          @{u.username}
                        </code>
                      </td>

                      <td>
                        <span style={{
                          fontSize: '0.75rem',
                          fontWeight: 700,
                          padding: '0.25rem 0.65rem',
                          borderRadius: '999px',
                          background: badge.bg,
                          color: badge.color,
                          border: `1px solid ${badge.border}`
                        }}>
                          {badge.label}
                        </span>
                      </td>

                      <td>
                        {u.phone ? (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.825rem' }}>
                            <Smartphone size={13} color="var(--text-light)" />
                            <span>{u.phone}</span>
                          </div>
                        ) : (
                          <span style={{ color: 'var(--text-light)', fontSize: '0.8rem' }}>—</span>
                        )}
                      </td>

                      <td>
                        <button
                          type="button"
                          onClick={() => handleToggleStatus(u)}
                          disabled={u.isDefault}
                          title={u.status === 'active' ? 'Click to suspend' : 'Click to activate'}
                          style={{
                            background: 'none',
                            border: 'none',
                            cursor: u.isDefault ? 'default' : 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.35rem',
                            fontSize: '0.8rem',
                            fontWeight: 600,
                            color: u.status === 'active' ? '#059669' : '#dc2626'
                          }}
                        >
                          {u.status === 'active' ? <CheckCircle2 size={15} /> : <XCircle size={15} />}
                          <span>{u.status === 'active' ? (lang === 'ta' ? 'செயலில்' : 'Active') : (lang === 'ta' ? 'முடக்கப்பட்டது' : 'Suspended')}</span>
                        </button>
                      </td>

                      <td>
                        <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                          {u.last_login || (lang === 'ta' ? 'இன்னும் உள்நுழையவில்லை' : 'Never logged in')}
                        </span>
                      </td>

                      <td style={{ textAlign: 'right' }}>
                        <div style={{ display: 'inline-flex', gap: '0.4rem' }}>
                          <button
                            type="button"
                            className="btn btn-outline btn-sm"
                            onClick={() => handleOpenEdit(u)}
                            title={t.edit}
                          >
                            <Edit3 size={13} />
                          </button>

                          {!u.isDefault && (
                            <button
                              type="button"
                              className="btn btn-outline btn-sm"
                              style={{ color: '#ef4444', borderColor: '#fca5a5' }}
                              onClick={() => {
                                setDeleteTarget(u);
                                setDeletePinInput('');
                                setDeleteError('');
                              }}
                              title={t.delete}
                            >
                              <Trash2 size={13} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
        </>
      )}

      {/* Login History Sub-Tab */}
      {activeSubTab === 'history' && (
        <div>
          {/* History KPIs */}
          <div className="kpi-grid" style={{ marginBottom: '1.5rem', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))' }}>
            <div className="kpi-card">
              <span className="kpi-label">{lang === 'ta' ? 'மொத்த உள்நுழைவு நிகழ்வுகள்' : 'Total Login Events'}</span>
              <span className="kpi-value">{loginLogs.length}</span>
              <span className="kpi-subtext">{lang === 'ta' ? 'பதிவான நடவடிக்கைகள்' : 'Lifetime audit events'}</span>
            </div>
            <div className="kpi-card">
              <span className="kpi-label">{lang === 'ta' ? 'வெற்றிகரமான உள்நுழைவுகள்' : 'Successful Logins'}</span>
              <span className="kpi-value" style={{ color: '#059669' }}>
                {loginLogs.filter(l => l.status === 'success').length}
              </span>
              <span className="kpi-subtext" style={{ color: '#059669' }}>
                <CheckCircle2 size={12} style={{ display: 'inline', marginRight: 4 }} />
                {lang === 'ta' ? 'அங்கீகரிக்கப்பட்டது' : 'Authorized access'}
              </span>
            </div>
            <div className="kpi-card">
              <span className="kpi-label">{lang === 'ta' ? 'தோல்வியுற்ற முயற்சிகள்' : 'Failed Attempts'}</span>
              <span className="kpi-value" style={{ color: loginLogs.filter(l => l.status === 'failed').length > 0 ? '#dc2626' : '#64748b' }}>
                {loginLogs.filter(l => l.status === 'failed').length}
              </span>
              <span className="kpi-subtext" style={{ color: loginLogs.filter(l => l.status === 'failed').length > 0 ? '#dc2626' : 'var(--text-light)' }}>
                {loginLogs.filter(l => l.status === 'failed').length > 0 ? 'Blocked attempts' : 'Zero security flags'}
              </span>
            </div>
            <div className="kpi-card">
              <span className="kpi-label">{lang === 'ta' ? 'பயன்படுத்தப்படும் தளங்கள்' : 'Active Platforms'}</span>
              <span className="kpi-value" style={{ color: '#2563eb' }}>
                {new Set(loginLogs.map(l => l.device).filter(Boolean)).size || 1}
              </span>
              <span className="kpi-subtext">Web & Mobile devices</span>
            </div>
          </div>

          {/* History Controls Bar */}
          <div className="table-controls-bar" style={{ marginBottom: '1rem' }}>
            <div className="search-input-wrapper">
              <Search size={16} className="search-icon" />
              <input
                type="text"
                className="form-control search-input"
                placeholder={lang === 'ta' ? 'பயனர், சாதனம் அல்லது காரணத்தை தேட...' : 'Search by username, staff name, device, reason...'}
                value={historySearch}
                onChange={(e) => setHistorySearch(e.target.value)}
              />
            </div>

            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
              <Filter size={15} color="var(--text-light)" />
              <select 
                className="form-control" 
                style={{ width: 'auto', minWidth: '140px' }}
                value={historyStatusFilter}
                onChange={(e) => setHistoryStatusFilter(e.target.value)}
              >
                <option value="all">{lang === 'ta' ? 'அனைத்து நிலைகளும்' : 'All Statuses'}</option>
                <option value="success">{lang === 'ta' ? 'வெற்றி (Success)' : 'Success Only'}</option>
                <option value="failed">{lang === 'ta' ? 'தோல்வி (Failed)' : 'Failed Attempts'}</option>
              </select>
            </div>
          </div>

          {/* History Table */}
          <div className="content-card" style={{ padding: 0, overflow: 'hidden' }}>
            <div className="table-responsive">
              <table className="data-table">
                <thead>
                  <tr>
                    <th style={{ width: '170px' }}>{lang === 'ta' ? 'தேதி & நேரம்' : 'Date & Time'}</th>
                    <th>{lang === 'ta' ? 'பணியாளர் / பயனர் பெயர்' : 'Staff / Username'}</th>
                    <th style={{ width: '130px' }}>{lang === 'ta' ? 'நிலை / பதவி' : 'System Role'}</th>
                    <th style={{ width: '120px', textAlign: 'center' }}>{lang === 'ta' ? 'முடிவு' : 'Status'}</th>
                    <th>{lang === 'ta' ? 'விவரம் / காரணம்' : 'Details / Reason'}</th>
                    <th style={{ width: '150px' }}>{lang === 'ta' ? 'சாதனம்' : 'Platform / Device'}</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredHistoryLogs.length === 0 ? (
                    <tr>
                      <td colSpan={6} style={{ textAlign: 'center', padding: '3rem 1rem', color: 'var(--text-light)' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem' }}>
                          <History size={36} color="var(--text-light)" />
                          <p style={{ margin: 0, fontWeight: 600 }}>
                            {lang === 'ta' ? 'உள்நுழைவு பதிவுகள் எதுவும் கிடைக்கவில்லை' : 'No login history records found.'}
                          </p>
                          <span style={{ fontSize: '0.8rem' }}>
                            {lang === 'ta' ? 'பணியாளர்கள் உள்நுழையும்போது இங்கு தணிக்கை செய்யப்படும்.' : 'Staff logins and PIN verification attempts will appear here in real-time.'}
                          </span>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    filteredHistoryLogs.map((log) => {
                      const badge = getRoleBadge(log.role);
                      const isSuccess = log.status === 'success';
                      return (
                        <tr key={log.id}>
                          <td>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-main)' }}>
                              <Clock size={13} color="var(--text-muted)" />
                              <span>{log.timestamp || 'Just now'}</span>
                            </div>
                          </td>
                          <td>
                            <div>
                              <div style={{ fontWeight: 700, fontSize: '0.875rem', color: 'var(--text-main)' }}>
                                {log.displayName || log.username}
                              </div>
                              <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>
                                @{log.username}
                              </div>
                            </div>
                          </td>
                          <td>
                            <span style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '0.25rem',
                              padding: '0.2rem 0.55rem',
                              borderRadius: '12px',
                              fontSize: '0.74rem',
                              fontWeight: 700,
                              background: badge.bg,
                              color: badge.color,
                              border: `1px solid ${badge.border}`
                            }}>
                              {badge.label}
                            </span>
                          </td>
                          <td style={{ textAlign: 'center' }}>
                            <span style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '0.3rem',
                              padding: '0.25rem 0.6rem',
                              borderRadius: '20px',
                              fontSize: '0.74rem',
                              fontWeight: 700,
                              background: isSuccess ? '#ecfdf5' : '#fee2e2',
                              color: isSuccess ? '#065f46' : '#991b1b',
                              border: `1px solid ${isSuccess ? '#a7f3d0' : '#fca5a5'}`
                            }}>
                              {isSuccess ? <CheckCircle2 size={13} /> : <XCircle size={13} />}
                              <span>{isSuccess ? (lang === 'ta' ? 'வெற்றி' : 'Success') : (lang === 'ta' ? 'தோல்வி' : 'Failed')}</span>
                            </span>
                          </td>
                          <td>
                            <span style={{ fontSize: '0.82rem', color: isSuccess ? 'var(--text-muted)' : '#b91c1c', fontWeight: isSuccess ? 400 : 600 }}>
                              {log.reason || (isSuccess ? 'Login Authorized' : 'Verification Denied')}
                            </span>
                          </td>
                          <td>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                              {log.device?.toLowerCase().includes('phone') || log.device?.toLowerCase().includes('ios') || log.device?.toLowerCase().includes('android') ? (
                                <Smartphone size={14} />
                              ) : (
                                <Laptop size={14} />
                              )}
                              <span>{log.device || 'Web Browser'}</span>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Add / Edit User Modal */}
      {isModalOpen && (
        <div className="modal-overlay" onClick={() => setIsModalOpen(false)}>
          <div className="modal-content" style={{ maxWidth: '480px' }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 style={{ fontSize: '1.15rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <UserCheck size={18} color="var(--primary-600)" />
                {editingUser 
                  ? (lang === 'ta' ? 'பயனர் விவரங்களை திருத்து' : 'Edit User Credentials') 
                  : (lang === 'ta' ? 'புதிய உள்நுழைவு பயனர் பதிவு' : 'Create New Login User')}
              </h3>
              <button 
                type="button" 
                className="btn btn-outline btn-sm"
                onClick={() => setIsModalOpen(false)}
                style={{ padding: '0.2rem 0.5rem', borderRadius: '50%', minWidth: '28px', height: '28px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleSubmit} style={{ padding: '1.25rem' }}>
              {formError && (
                <div style={{
                  background: '#fee2e2',
                  color: '#991b1b',
                  padding: '0.65rem 0.85rem',
                  borderRadius: 'var(--radius-sm)',
                  fontSize: '0.8rem',
                  marginBottom: '1rem',
                  border: '1px solid #fca5a5',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.4rem'
                }}>
                  <AlertCircle size={15} />
                  <span>{formError}</span>
                </div>
              )}

              <div className="form-group" style={{ marginBottom: '1rem' }}>
                <label>
                  {lang === 'ta' ? 'உள்நுழைவு பயனர் பெயர் (Username)' : 'Login Username (unique)'} *
                </label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="e.g. driver_mani or operator1"
                  value={formData.username}
                  onChange={(e) => setFormData({ ...formData, username: e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '') })}
                  required
                  autoFocus
                />
                <span style={{ fontSize: '0.72rem', color: 'var(--text-light)', marginTop: '0.2rem' }}>
                  Allowed: lowercase letters, numbers, and underscores (e.g. <code>selvam_driver</code>)
                </span>
              </div>

              <div style={{ marginBottom: '1rem' }}>
                <BilingualVoiceGroup
                  englishLabel="Full Name"
                  tamilLabel="முழு பெயர்"
                  englishValue={formData.displayName}
                  tamilValue={formData.displayName_ta}
                  onEnglishChange={(val) => setFormData(prev => ({ ...prev, displayName: val }))}
                  onTamilChange={(val) => setFormData(prev => ({ ...prev, displayName_ta: val }))}
                  englishPlaceholder="e.g. R. Manickam"
                  tamilPlaceholder="எ.கா. ஆர். மாணிக்கம்"
                  lang={lang}
                  required
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '1rem' }}>
                <div className="form-group">
                  <SearchableSelect
                    label={`${lang === 'ta' ? 'பயனர் நிலை / பதவி' : 'Access Role'}`}
                    required
                    value={formData.role}
                    onChange={(val) => setFormData({ ...formData, role: val })}
                    options={[
                      { value: 'operator', label: lang === 'ta' ? 'ஆபரேட்டர்' : 'Field Operator' },
                      { value: 'driver', label: lang === 'ta' ? 'டிரைவர்' : 'Tractor Driver' },
                      { value: 'manager', label: lang === 'ta' ? 'மேலாளர்' : 'Manager / Supervisor' },
                      { value: 'admin', label: lang === 'ta' ? 'முதன்மை நிர்வாகி' : 'Full Administrator' }
                    ]}
                    lang={lang}
                  />
                </div>

                <div className="form-group">
                  <SearchableSelect
                    label={lang === 'ta' ? 'கணக்கு நிலை' : 'Account Status'}
                    value={formData.status}
                    onChange={(val) => setFormData({ ...formData, status: val })}
                    options={[
                      { value: 'active', label: lang === 'ta' ? 'செயலில்' : 'Active (Can login)' },
                      { value: 'inactive', label: lang === 'ta' ? 'முடக்கப்பட்டது' : 'Suspended (Blocked)' }
                    ]}
                    lang={lang}
                  />
                </div>
              </div>

              <div className="form-group" style={{ marginBottom: '1rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                    <Key size={14} />
                    {lang === 'ta' ? 'உள்நுழைவு கடவுச்சொல் / PIN' : 'Login PIN / Password'} *
                  </label>
                  <button 
                    type="button" 
                    onClick={() => setShowPin(!showPin)} 
                    style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.75rem', color: 'var(--primary-700)', display: 'flex', alignItems: 'center', gap: '0.2rem' }}
                  >
                    {showPin ? <EyeOff size={13} /> : <Eye size={13} />}
                    <span>{showPin ? (lang === 'ta' ? 'மறை' : 'Hide') : (lang === 'ta' ? 'காட்டு' : 'Show')}</span>
                  </button>
                </div>
                <input
                  type={showPin ? "text" : "password"}
                  className="form-control"
                  placeholder={lang === 'ta' ? 'குறைந்தது 4 இலக்கங்கள்' : 'Min 4 digits (e.g. 5566)'}
                  value={formData.pin}
                  onChange={(e) => setFormData({ ...formData, pin: e.target.value })}
                  maxLength={12}
                  required
                />
              </div>

              <div className="form-group" style={{ marginBottom: '1.25rem' }}>
                <VoiceInput
                  label={lang === 'ta' ? 'அலைபேசி எண் (10 இலக்கங்கள்) *' : 'Mobile Number (10 digits) *'}
                  type="tel"
                  placeholder="9842211223"
                  value={formData.phone}
                  onChange={(val) => {
                    const digits = val.replace(/\D/g, '').slice(0, 10);
                    setFormData(prev => ({ ...prev, phone: digits }));
                    if (formError) setFormError('');
                  }}
                  speechLang={lang === 'ta' ? 'ta-IN' : 'en-IN'}
                  required
                />
                <span style={{ fontSize: '0.75rem', color: 'var(--text-light)', marginTop: '0.25rem', display: 'block' }}>
                  {lang === 'ta' ? '10 இலக்க தனித்துவமான எண் (உள்நுழையவும் பயன்படுத்தலாம்)' : '10-digit unique mobile number (can also be used to log in)'}
                </span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.65rem' }}>
                <button
                  type="button"
                  className="btn btn-outline"
                  onClick={() => setIsModalOpen(false)}
                >
                  {t.cancel}
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                >
                  {t.save}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal (Protected with Admin PIN) */}
      {deleteTarget && (
        <div className="modal-overlay" onClick={() => setDeleteTarget(null)}>
          <div className="modal-content" style={{ maxWidth: '420px' }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header" style={{ borderBottomColor: '#fecaca' }}>
              <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: '#dc2626', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <Trash2 size={18} />
                {lang === 'ta' ? 'பயனர் கணக்கை நீக்கு' : 'Delete Login User Account'}
              </h3>
              <button 
                type="button" 
                className="btn btn-outline btn-sm"
                onClick={() => setDeleteTarget(null)}
                style={{ padding: '0.2rem 0.5rem', borderRadius: '50%', minWidth: '28px', height: '28px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              >
                &times;
              </button>
            </div>

            <div style={{ padding: '1.25rem' }}>
              <p style={{ fontSize: '0.875rem', color: 'var(--text-main)', marginBottom: '1rem' }}>
                {lang === 'ta' 
                  ? `நீங்கள் நிச்சயமாக @${deleteTarget.username} (${deleteTarget.displayName}) கணக்கை நீக்க விரும்புகிறீர்களா?` 
                  : `Are you sure you want to permanently delete user @${deleteTarget.username} (${deleteTarget.displayName})?`}
              </p>

              {deleteError && (
                <div style={{
                  background: '#fee2e2',
                  color: '#991b1b',
                  padding: '0.5rem 0.75rem',
                  borderRadius: 'var(--radius-sm)',
                  fontSize: '0.8rem',
                  marginBottom: '1rem',
                  border: '1px solid #fca5a5'
                }}>
                  {deleteError}
                </div>
              )}

              <div className="form-group" style={{ marginBottom: '1.25rem' }}>
                <label style={{ fontSize: '0.8rem', fontWeight: 600, color: '#dc2626' }}>
                  {t.enterAdminPin} (Default: 1234)
                </label>
                <input
                  type="password"
                  className="form-control"
                  placeholder="Enter Admin PIN"
                  value={deletePinInput}
                  onChange={(e) => setDeletePinInput(e.target.value)}
                  maxLength={8}
                  autoFocus
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.65rem' }}>
                <button
                  type="button"
                  className="btn btn-outline"
                  onClick={() => setDeleteTarget(null)}
                >
                  {t.cancel}
                </button>
                <button
                  type="button"
                  className="btn btn-primary"
                  style={{ background: '#dc2626', borderColor: '#b91c1c' }}
                  onClick={confirmDelete}
                  disabled={!deletePinInput}
                >
                  {lang === 'ta' ? 'உறுதி செய்து நீக்கு' : 'Confirm & Delete'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Clear Login History Modal (Protected with Admin PIN) */}
      {showClearHistoryModal && (
        <div className="modal-overlay" onClick={() => setShowClearHistoryModal(false)}>
          <div className="modal-content" style={{ maxWidth: '420px' }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header" style={{ borderBottomColor: '#fecaca' }}>
              <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: '#dc2626', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <Trash2 size={18} />
                {lang === 'ta' ? 'உள்நுழைவு வரலாற்றை அழிக்கவும்' : 'Clear Login Audit History'}
              </h3>
              <button 
                type="button" 
                className="btn btn-outline btn-sm"
                onClick={() => setShowClearHistoryModal(false)}
                style={{ padding: '0.2rem 0.5rem', borderRadius: '50%', minWidth: '28px', height: '28px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              >
                &times;
              </button>
            </div>

            <div style={{ padding: '1.25rem' }}>
              <p style={{ fontSize: '0.875rem', color: 'var(--text-main)', marginBottom: '1rem' }}>
                {lang === 'ta' 
                  ? 'நீங்கள் நிச்சயமாக அனைத்து உள்நுழைவு பதிவு வரலாற்றையும் அழிக்க விரும்புகிறீர்களா? இது நிரந்தரமானது.' 
                  : 'Are you sure you want to permanently clear the login audit history log? This action cannot be undone.'}
              </p>

              {clearHistoryError && (
                <div style={{
                  background: '#fee2e2',
                  color: '#991b1b',
                  padding: '0.5rem 0.75rem',
                  borderRadius: 'var(--radius-sm)',
                  fontSize: '0.8rem',
                  marginBottom: '1rem',
                  border: '1px solid #fca5a5'
                }}>
                  {clearHistoryError}
                </div>
              )}

              <div className="form-group" style={{ marginBottom: '1.25rem' }}>
                <label style={{ fontSize: '0.8rem', fontWeight: 600, color: '#dc2626' }}>
                  {t.enterAdminPin} (Default: 1234)
                </label>
                <input
                  type="password"
                  className="form-control"
                  placeholder="Enter Admin PIN"
                  value={clearHistoryPin}
                  onChange={(e) => setClearHistoryPin(e.target.value)}
                  maxLength={8}
                  autoFocus
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.65rem' }}>
                <button
                  type="button"
                  className="btn btn-outline"
                  onClick={() => setShowClearHistoryModal(false)}
                >
                  {t.cancel}
                </button>
                <button
                  type="button"
                  className="btn btn-primary"
                  style={{ background: '#dc2626', borderColor: '#b91c1c' }}
                  onClick={handleConfirmClearHistory}
                  disabled={!clearHistoryPin}
                >
                  {lang === 'ta' ? 'அழித்திடுக' : 'Clear History'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
