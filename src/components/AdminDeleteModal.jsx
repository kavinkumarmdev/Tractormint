import React, { useState } from 'react';
import { AlertTriangle, Lock, ShieldAlert, X } from 'lucide-react';
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
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '440px' }}>
        <div className="modal-header" style={{ borderBottomColor: '#fecaca', background: 'rgba(239, 68, 68, 0.05)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 style={{ color: '#dc2626', display: 'flex', alignItems: 'center', gap: '0.5rem', margin: 0 }}>
            <AlertTriangle size={20} />
            {t.delete} Confirmation
          </h3>
          <button 
            type="button" 
            className="btn btn-outline btn-sm" 
            onClick={onClose}
            style={{ padding: '0.25rem 0.5rem', display: 'flex', alignItems: 'center', gap: '0.25rem', borderColor: '#fca5a5', color: '#dc2626' }}
          >
            <X size={15} />
            <span>{t.cancel || 'Cancel'}</span>
          </button>
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
                <p style={{ fontSize: '0.9rem', marginBottom: '0.65rem', color: 'var(--text-main)' }}>
                  {lang === 'ta' 
                    ? <><strong>"{itemTitle}"</strong> பதிவை தற்காலிகமாக நீக்கி மறுசுழற்சி தொட்டிக்கு (Recycle Bin) நகர்த்த விரும்புகிறீர்களா?</>
                    : <>Are you sure you want to temporarily delete <strong>"{itemTitle}"</strong> and move to the Recycle Bin?</>}
                </p>
                <div style={{
                  fontSize: '0.75rem',
                  background: 'rgba(245, 158, 11, 0.1)',
                  color: '#92400e',
                  padding: '0.5rem 0.75rem',
                  borderRadius: '8px',
                  marginBottom: '1rem',
                  border: '1px solid rgba(245, 158, 11, 0.25)',
                  lineHeight: '1.4'
                }}>
                  {lang === 'ta'
                    ? 'ℹ️ தற்காலிக நீக்கம்: இந்தப் பதிவு பயன்பாட்டிலிருந்து நீக்கப்பட்டு மறுசுழற்சி தொட்டிக்கு செல்லும். நிர்வாகி சரிபார்த்து மேலே உள்ள "ஷீட்டில் சேமி" கிளிக் செய்யும் வரை கூகுள் ஷீட்டில் மாற்றப்படாது.'
                    : 'ℹ️ Temporary Delete: Moved to Recycle Bin locally. Google Sheet will not be affected until you review and click "Save to Sheet".'}
                </div>
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
