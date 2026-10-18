import React, { useState } from 'react';
import { AlertTriangle, Lock, ShieldAlert } from 'lucide-react';
import { translations } from '../translations/dictionary';

export default function AdminDeleteModal({ 
  isOpen, 
  onClose, 
  onConfirm, 
  itemTitle, 
  role, 
  lang 
}) {
  const t = translations[lang];
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (role !== 'admin') {
      setError(t.operatorCanOnlyEdit);
      return;
    }
    const result = onConfirm(pin);
    if (result && !result.success) {
      setError(result.error || t.pinIncorrect);
    } else {
      setPin('');
      setError('');
      onClose();
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content" style={{ maxWidth: '440px' }}>
        <div className="modal-header" style={{ borderBottomColor: '#fecaca', background: 'rgba(239, 68, 68, 0.05)' }}>
          <h3 style={{ color: '#dc2626', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <AlertTriangle size={20} />
            {t.delete} Confirmation
          </h3>
        </div>
        
        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            {role !== 'admin' ? (
              <div style={{ textAlign: 'center', padding: '1rem 0' }}>
                <ShieldAlert size={48} style={{ color: '#ef4444', margin: '0 auto 1rem' }} />
                <h4 style={{ marginBottom: '0.5rem' }}>{t.adminProtected}</h4>
                <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>
                  {t.operatorCanOnlyEdit}
                </p>
              </div>
            ) : (
              <div>
                <p style={{ fontSize: '0.9rem', marginBottom: '1rem', color: 'var(--text-main)' }}>
                  Are you sure you want to move <strong>"{itemTitle}"</strong> to the Lifetime Archive / Recycle Bin?
                </p>
                <div className="form-group">
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <Lock size={14} />
                    {t.enterAdminPin} (Default: 1234)
                  </label>
                  <input
                    type="password"
                    className="form-control"
                    placeholder="Enter Admin PIN"
                    value={pin}
                    onChange={(e) => setPin(e.target.value)}
                    autoFocus
                    required
                  />
                  {error && (
                    <span style={{ color: '#ef4444', fontSize: '0.8rem', marginTop: '0.3rem' }}>
                      {error}
                    </span>
                  )}
                </div>
              </div>
            )}
          </div>

          <div className="modal-footer">
            <button type="button" className="btn btn-outline" onClick={onClose}>
              {t.cancel}
            </button>
            {role === 'admin' && (
              <button type="submit" className="btn btn-danger">
                {t.delete}
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}
