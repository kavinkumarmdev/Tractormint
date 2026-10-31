import React, { useState } from 'react';
import { Trash2, RotateCcw, ShieldCheck, ShieldAlert, Search, History, Calendar } from 'lucide-react';
import { translations } from '../translations/dictionary';
import { toSafeLower } from '../utils/langUtils';

export default function AuditTrashManager({ 
  deletedRecords = [], 
  onRestoreRecord, 
  lang = 'ta', 
  role = 'admin' 
}) {
  const t = translations[lang] || translations.en;
  const [searchTerm, setSearchTerm] = useState('');

  const filtered = (deletedRecords || []).filter(r => {
    if (!r) return false;
    const sLower = toSafeLower(searchTerm);
    if (!sLower) return true;
    const title = r.name || r.customerName || r.category || r.partnerName || r.tractorName || r.id || '';
    const tableName = r._tableName || '';
    return toSafeLower(title).includes(sLower) ||
           toSafeLower(tableName).includes(sLower);
  });

  return (
    <div>
      {/* Header bar */}
      <div className="card-header-bar">
        <div className="card-title-group">
          <h2 style={{ margin: 0 }}><History size={22} /> {t.auditTrash}</h2>
        </div>
      </div>

      {role !== 'admin' ? (
        <div className="content-card" style={{ textAlign: 'center', padding: '3rem 1rem' }}>
          <ShieldAlert size={48} style={{ color: '#ef4444', margin: '0 auto 1rem' }} />
          <h3 style={{ fontSize: '1.2rem', marginBottom: '0.5rem' }}>{t.adminProtected}</h3>
          <p style={{ color: 'var(--text-muted)', maxWidth: '500px', margin: '0 auto' }}>
            {lang === 'ta' 
              ? 'நீக்கப்பட்ட பதிவுகளைப் பார்க்கவும் மீட்டமைக்கவும் அட்மின் அனுமதி மட்டுமே உண்டு. தயவுசெய்து மேல் வலதுபுறத்தில் அட்மின் பதவிக்கு மாறவும்.' 
              : 'Only authenticated Admins with PIN can view the audit archive and restore soft-deleted records.'}
          </p>
        </div>
      ) : (
        <div>
          {/* Info Banner */}
          <div style={{ 
            background: 'var(--bg-card)', 
            border: '1px solid var(--border-color)', 
            borderLeft: '4px solid var(--primary-600)',
            padding: '1rem', 
            borderRadius: 'var(--radius-md)', 
            marginBottom: '1.25rem',
            fontSize: '0.875rem'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 700, color: 'var(--primary-700)', marginBottom: '0.2rem' }}>
              <ShieldCheck size={18} /> Enterprise Lifetime Retention Guarantee
            </div>
            <p style={{ color: 'var(--text-muted)' }}>
              All records in TractoMint are preserved permanently in the database. Deletions are soft-archived with a verifiable audit stamp and can be restored back to active service at any time.
            </p>
          </div>

          {/* Filter Bar */}
          <div className="filter-bar">
            <div className="search-input-wrapper">
              <Search size={16} className="search-icon-inside" />
              <input
                type="text"
                placeholder={t.search + ' (Search deleted items or table names...)'}
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
                    <th>{lang === 'ta' ? 'பிரிவு / அட்டவணை' : 'Module / Table'}</th>
                    <th>{lang === 'ta' ? 'பதிவு குறியீடு' : 'Record ID'}</th>
                    <th>{lang === 'ta' ? 'பதிவு விவரம்' : 'Record Description'}</th>
                    <th>{lang === 'ta' ? 'நீக்கப்பட்ட தேதி & நேரம்' : 'Deleted Date & Time'}</th>
                    <th>{lang === 'ta' ? 'நீக்கியவர்' : 'Deleted By'}</th>
                    <th style={{ textAlign: 'right' }}>{t.actions}</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((item, idx) => {
                    const title = item.name || item.customerName || item.category || item.partnerName || item.tractorName || item.id;
                    return (
                      <tr key={item.id + idx}>
                        <td>
                          <span className="badge badge-purple">{item._tableName}</span>
                        </td>
                        <td style={{ fontWeight: 700, color: 'var(--primary-700)' }}>{item.id}</td>
                        <td>
                          <div style={{ fontWeight: 600 }}>{title}</div>
                          {item.workDescription && <div style={{ fontSize: '0.75rem', color: 'var(--text-light)' }}>{item.workDescription}</div>}
                          {item.amount && <div style={{ fontSize: '0.75rem', color: 'var(--text-light)' }}>Amount: ₹{item.amount}</div>}
                          {item.totalAmount && <div style={{ fontSize: '0.75rem', color: 'var(--text-light)' }}>Total: ₹{item.totalAmount}</div>}
                        </td>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.85rem' }}>
                            <Calendar size={13} color="var(--text-light)" />
                            {item.deleted_at || 'Archived'}
                          </div>
                        </td>
                        <td>
                          <span className="badge badge-paid">
                            <ShieldCheck size={12} /> {item.deleted_by || 'Admin'}
                          </span>
                        </td>
                        <td style={{ textAlign: 'right' }}>
                          <button 
                            className="btn btn-outline btn-sm"
                            style={{ color: '#059669', borderColor: '#a7f3d0' }}
                            onClick={() => onRestoreRecord(item._tableKey, item.id)}
                            title="Restore back to active ledger"
                          >
                            <RotateCcw size={14} />
                            {t.restore}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                  {filtered.length === 0 && (
                    <tr>
                      <td colSpan="6" style={{ textAlign: 'center', padding: '2.5rem', color: 'var(--text-light)' }}>
                        {lang === 'ta' ? 'மறுசுழற்சி தொட்டி காலியாக உள்ளது. நீக்கப்பட்ட பதிவுகள் எதுவும் இல்லை.' : 'Recycle bin is empty. No deleted records found.'}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
