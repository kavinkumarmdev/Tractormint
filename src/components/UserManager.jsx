import React, { useState } from 'react';
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
} from 'lucide-react';
import { translations } from '../translations/dictionary';
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
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState(null);

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
      username: user.username,
      displayName: user.displayName || '',
      displayName_ta: user.displayName_ta || '',
      pin: user.pin || '',
      role: user.role || 'operator',
      phone: user.phone || '',
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
      phone: formData.phone.trim(),
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

  return (
    <div>
      {/* Header bar */}
      <div className="card-header-bar">
        <div className="card-title-group">
          <h2>
            <Users size={22} color="var(--primary-600)" />
            {lang === 'ta' ? 'பயனர்கள் & உள்நுழைவு மேலாண்மை' : 'User Accounts & Staff Logins'}
          </h2>
          <p>
            {lang === 'ta' 
              ? 'நிர்வாகி மட்டுமே இந்த அப்ளிகேஷனுக்கான உள்நுழைவு கணக்குகளை உருவாக்கவும் நிர்வகிக்கவும் முடியும்.' 
              : 'Admin-exclusive user portal: Only users created by Admin can log in to this application.'}
          </p>
        </div>
        <button className="btn btn-primary" onClick={handleOpenAdd}>
          <UserPlus size={16} />
          <span>{lang === 'ta' ? 'புதிய பயனர் உருவாக்கு' : 'Add Login User'}</span>
        </button>
      </div>

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

      {/* Add / Edit User Modal */}
      {isModalOpen && (
        <div className="modal-backdrop">
          <div className="modal-dialog" style={{ maxWidth: '480px' }}>
            <div className="modal-header">
              <h3 style={{ fontSize: '1.15rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <UserCheck size={18} color="var(--primary-600)" />
                {editingUser 
                  ? (lang === 'ta' ? 'பயனர் விவரங்களை திருத்து' : 'Edit User Credentials') 
                  : (lang === 'ta' ? 'புதிய உள்நுழைவு பயனர் பதிவு' : 'Create New Login User')}
              </h3>
              <button 
                type="button" 
                className="modal-close-btn"
                onClick={() => setIsModalOpen(false)}
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
                  englishLabel={lang === 'ta' ? 'முழு பெயர் (ஆங்கிலத்தில்)' : 'Full Name / Display Name (English)'}
                  tamilLabel={lang === 'ta' ? 'முழு பெயர் (தமிழில்)' : 'Full Name (Tamil)'}
                  englishValue={formData.displayName}
                  tamilValue={formData.displayName_ta}
                  onEnglishChange={(val) => setFormData(prev => ({ ...prev, displayName: val }))}
                  onTamilChange={(val) => setFormData(prev => ({ ...prev, displayName_ta: val }))}
                  englishPlaceholder="e.g. R. Manickam"
                  tamilPlaceholder="எ.கா. ஆர். மாணிக்கம்"
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
                      { value: 'operator', label: lang === 'ta' ? 'ஆபரேட்டர் (Field Operator)' : 'Field Operator' },
                      { value: 'driver', label: lang === 'ta' ? 'டிரைவர் (Tractor Driver)' : 'Tractor Driver' },
                      { value: 'manager', label: lang === 'ta' ? 'மேலாளர் (Manager)' : 'Manager / Supervisor' },
                      { value: 'admin', label: lang === 'ta' ? 'நிர்வாகி (Full Administrator)' : 'Full Administrator' }
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
                      { value: 'active', label: lang === 'ta' ? 'செயலில் (Active)' : 'Active (Can login)' },
                      { value: 'inactive', label: lang === 'ta' ? 'முடக்கு (Suspended)' : 'Suspended (Blocked)' }
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
                    <span>{showPin ? 'Hide' : 'Show'}</span>
                  </button>
                </div>
                <input
                  type={showPin ? "text" : "password"}
                  className="form-control"
                  placeholder="Min 4 digits (e.g. 5566)"
                  value={formData.pin}
                  onChange={(e) => setFormData({ ...formData, pin: e.target.value })}
                  maxLength={12}
                  required
                />
              </div>

              <div className="form-group" style={{ marginBottom: '1.25rem' }}>
                <VoiceInput
                  label={lang === 'ta' ? 'தொலைபேசி எண் (Phone)' : 'Phone Number (Optional)'}
                  type="tel"
                  placeholder="+91 98422 11223"
                  value={formData.phone}
                  onChange={(val) => setFormData(prev => ({ ...prev, phone: val }))}
                  speechLang="en-IN"
                />
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
        <div className="modal-backdrop">
          <div className="modal-dialog" style={{ maxWidth: '420px' }}>
            <div className="modal-header" style={{ borderBottomColor: '#fecaca' }}>
              <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: '#dc2626', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <Trash2 size={18} />
                {lang === 'ta' ? 'பயனர் கணக்கை நீக்கு' : 'Delete Login User Account'}
              </h3>
              <button 
                type="button" 
                className="modal-close-btn"
                onClick={() => setDeleteTarget(null)}
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

    </div>
  );
}
