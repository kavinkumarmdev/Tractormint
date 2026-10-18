import React, { useState } from 'react';
import { 
  CloudSun, 
  Check, 
  Copy, 
  RefreshCw, 
  ExternalLink, 
  Key, 
  Building, 
  Download, 
  CheckCircle2, 
  AlertCircle,
  ArrowDownCircle,
  ArrowUpCircle,
  Trash2,
  Code2
} from 'lucide-react';
import { translations } from '../translations/dictionary';
import { APPS_SCRIPT_TEMPLATE, testGoogleSheetConnection } from '../services/googleSheets';
import { ENV_GOOGLE_SHEETS_URL } from '../config/env';

export const convertToCsv = (data) => {
  if (!data || data.length === 0) return '';
  const headers = Object.keys(data[0]);
  const rows = data.map(obj => headers.map(h => JSON.stringify(obj[h] ?? '')).join(','));
  return [headers.join(','), ...rows].join('\n');
};

export const downloadCsv = (filename, csvData) => {
  const blob = new Blob([csvData], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `${filename}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

export default function GoogleSheetsSettings({ 
  settings, 
  onSaveSettings, 
  onSyncAll, 
  onPullFromSheets,
  onClearAllData,
  allData, 
  lang, 
  role 
}) {
  const t = translations[lang];
  const [webAppUrl, setWebAppUrl] = useState(
    settings.webAppUrl || ENV_GOOGLE_SHEETS_URL || ''
  );
  const [autoSync, setAutoSync] = useState(settings.autoSync || false);
  const [adminPin, setAdminPin] = useState(settings.adminPin || '1234');
  const [companyName, setCompanyName] = useState(settings.companyName || '');
  const [companyName_ta, setCompanyName_ta] = useState(settings.companyName_ta || '');
  const [contactPhone, setContactPhone] = useState(settings.contactPhone || '');
  const [address, setAddress] = useState(settings.address || '');

  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState(null);
  const [copied, setCopied] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [pulling, setPulling] = useState(false);
  const [syncMessage, setSyncMessage] = useState('');
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [showCodePreview, setShowCodePreview] = useState(false);

  const handleCopyScript = () => {
    navigator.clipboard.writeText(APPS_SCRIPT_TEMPLATE);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleTestConnection = async () => {
    setTesting(true);
    setTestResult(null);
    const res = await testGoogleSheetConnection(webAppUrl);
    setTesting(false);
    setTestResult(res);
  };

  const handleTriggerPush = async () => {
    setSyncing(true);
    setSyncMessage('');
    const res = await onSyncAll(webAppUrl);
    setSyncing(false);
    if (res && res.success) {
      setSyncMessage(res.message || 'Data saved successfully into Google Sheets!');
    } else {
      setSyncMessage(res?.error || 'Push failed. Check your Web App URL.');
    }
  };

  const handleTriggerPull = async () => {
    setPulling(true);
    setSyncMessage('');
    const res = await onPullFromSheets(webAppUrl);
    setPulling(false);
    if (res && res.success) {
      setSyncMessage(`Successfully fetched and loaded data from Google Sheets (${res.spreadsheetName || 'Spreadsheet'})!`);
    } else {
      setSyncMessage(res?.error || 'Pull failed. Make sure your Google Apps Script is deployed with "Anyone" access.');
    }
  };

  const handleSaveAllSettings = (e) => {
    e.preventDefault();
    onSaveSettings({
      ...settings,
      webAppUrl,
      autoSync,
      adminPin,
      companyName,
      companyName_ta,
      contactPhone,
      address
    });
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 3000);
  };

  return (
    <div>
      {/* Header bar */}
      <div className="card-header-bar">
        <div className="card-title-group">
          <h2><CloudSun size={22} /> {t.googleSheetsTitle}</h2>
          <p>{lang === 'ta' ? 'கூகுள் ஷீட் உடன் நேரடி இருவழி ஒத்திசைவு (இறக்குமதி மற்றும் ஏற்றுமதி)' : 'Two-way synchronization between TractoMint and your private Google Spreadsheet'}</p>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(440px, 1fr))', gap: '1.5rem' }}>
        
        {/* Google Sheets Connection Setup Card */}
        <div className="content-card">
          <h3 style={{ fontSize: '1.15rem', fontWeight: 700, marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <CloudSun size={18} color="var(--primary-600)" /> Google Sheet Webhook Connection
          </h3>
          <p style={{ fontSize: '0.825rem', color: 'var(--text-muted)', marginBottom: '1.25rem' }}>
            Enter your Google Apps Script Web App URL to pull data from your spreadsheet or save all ledger records automatically.
          </p>

          <form onSubmit={handleSaveAllSettings}>
            <div className="form-group" style={{ marginBottom: '1rem' }}>
              <label>{t.webAppUrl}</label>
              <input
                type="url"
                className="form-control"
                placeholder="https://script.google.com/macros/s/AKfycbx.../exec"
                value={webAppUrl}
                onChange={(e) => setWebAppUrl(e.target.value)}
                required
              />
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '0.35rem', flexWrap: 'wrap', gap: '0.4rem', fontSize: '0.75rem' }}>
                <span style={{ 
                  color: (webAppUrl && webAppUrl === ENV_GOOGLE_SHEETS_URL) ? '#059669' : 'var(--text-light)', 
                  fontWeight: (webAppUrl && webAppUrl === ENV_GOOGLE_SHEETS_URL) ? 600 : 400,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px'
                }}>
                  {(webAppUrl && webAppUrl === ENV_GOOGLE_SHEETS_URL) 
                    ? '● Configured via .env (VITE_GOOGLE_SHEETS_URL)' 
                    : '● Custom Web App URL'}
                </span>
                {webAppUrl && (
                  <span style={{ color: 'var(--text-muted)' }}>
                    Deployment ID: <code>{webAppUrl.match(/\/s\/([a-zA-Z0-9_-]+)\/exec/)?.[1] || 'Detected'}</code>
                  </span>
                )}
              </div>
              {webAppUrl !== ENV_GOOGLE_SHEETS_URL && ENV_GOOGLE_SHEETS_URL && (
                <div style={{ marginTop: '0.35rem' }}>
                  <button
                    type="button"
                    onClick={() => setWebAppUrl(ENV_GOOGLE_SHEETS_URL)}
                    className="btn btn-outline btn-sm"
                    style={{ fontSize: '0.72rem', padding: '0.15rem 0.5rem' }}
                  >
                    Reset to .env URL
                  </button>
                </div>
              )}
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.25rem' }}>
              <input
                type="checkbox"
                id="autoSyncCheck"
                checked={autoSync}
                onChange={(e) => setAutoSync(e.target.checked)}
                style={{ width: '16px', height: '16px', accentColor: 'var(--primary-600)' }}
              />
              <label htmlFor="autoSyncCheck" style={{ fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer' }}>
                {t.autoSyncOnSave}
              </label>
            </div>

            {/* Sync Action Buttons */}
            <div style={{ display: 'flex', gap: '0.65rem', flexWrap: 'wrap', marginBottom: '1.25rem' }}>
              {/* PULL BUTTON */}
              <button 
                type="button" 
                className="btn btn-primary"
                onClick={handleTriggerPull}
                disabled={pulling || !webAppUrl}
                style={{ background: 'linear-gradient(135deg, #0284c7, #0369a1)' }}
                title="Get/Import all records from Google Sheet"
              >
                {pulling ? <RefreshCw size={15} className="spin-animation" /> : <ArrowDownCircle size={16} />}
                {pulling ? 'Fetching...' : (lang === 'ta' ? 'ஷீட்டிலிருந்து எடு (Get Data)' : 'Get from Google Sheet')}
              </button>

              {/* PUSH BUTTON */}
              <button 
                type="button" 
                className="btn btn-primary"
                onClick={handleTriggerPush}
                disabled={syncing || !webAppUrl}
                title="Push all local records into Google Sheet"
              >
                {syncing ? <RefreshCw size={15} className="spin-animation" /> : <ArrowUpCircle size={16} />}
                {syncing ? 'Saving...' : (lang === 'ta' ? 'ஷீட்டில் சேமி (Push Data)' : 'Save to Google Sheet')}
              </button>

              {/* TEST BUTTON */}
              <button 
                type="button" 
                className="btn btn-outline"
                onClick={handleTestConnection}
                disabled={testing || !webAppUrl}
              >
                {testing ? <RefreshCw size={14} className="spin-animation" /> : <ExternalLink size={14} />}
                {testing ? 'Testing...' : t.testConnection}
              </button>

              {/* SAVE SETTINGS BUTTON */}
              <button type="submit" className="btn btn-outline" style={{ marginLeft: 'auto' }}>
                {saveSuccess ? <Check size={14} color="#16a34a" /> : null}
                {saveSuccess ? 'Saved!' : t.save}
              </button>
            </div>

            {testResult && (
              <div style={{ 
                padding: '0.75rem', 
                borderRadius: 'var(--radius-sm)', 
                background: testResult.success ? '#ecfdf5' : '#fef2f2',
                color: testResult.success ? '#065f46' : '#991b1b',
                fontSize: '0.85rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                marginBottom: '1rem',
                border: testResult.success ? '1px solid #a7f3d0' : '1px solid #fecaca'
              }}>
                {testResult.success ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
                <span>
                  {testResult.success 
                    ? (testResult.message || `Connected to: "${testResult.spreadsheetName}". Ready to sync.`) 
                    : (testResult.message || testResult.error || 'Connection error')}
                </span>
              </div>
            )}

            {syncMessage && (
              <div style={{ 
                padding: '0.75rem', 
                borderRadius: 'var(--radius-sm)', 
                background: '#eff6ff',
                color: '#1e40af',
                fontSize: '0.85rem',
                marginBottom: '1rem',
                border: '1px solid #bfdbfe'
              }}>
                {syncMessage}
              </div>
            )}

            {/* Synchronized Ledger Metrics Grid (Kannaku360 pattern) */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(105px, 1fr))',
              gap: '0.6rem',
              marginBottom: '1.25rem',
              padding: '0.85rem',
              background: 'var(--bg-subtle)',
              borderRadius: 'var(--radius-sm)',
              border: '1px solid var(--border-color)'
            }}>
              <div style={{ textAlign: 'center' }}>
                <span style={{ fontSize: '0.7rem', color: 'var(--text-light)', display: 'block' }}>Fleet</span>
                <strong style={{ fontSize: '1rem', color: 'var(--primary-700)' }}>{(allData?.fleet || []).length}</strong>
              </div>
              <div style={{ textAlign: 'center' }}>
                <span style={{ fontSize: '0.7rem', color: 'var(--text-light)', display: 'block' }}>Rates</span>
                <strong style={{ fontSize: '1rem', color: 'var(--primary-700)' }}>{(allData?.rateMatrix || []).length}</strong>
              </div>
              <div style={{ textAlign: 'center' }}>
                <span style={{ fontSize: '0.7rem', color: 'var(--text-light)', display: 'block' }}>Drivers</span>
                <strong style={{ fontSize: '1rem', color: 'var(--primary-700)' }}>{(allData?.drivers || []).length}</strong>
              </div>
              <div style={{ textAlign: 'center' }}>
                <span style={{ fontSize: '0.7rem', color: 'var(--text-light)', display: 'block' }}>Farmers</span>
                <strong style={{ fontSize: '1rem', color: 'var(--primary-700)' }}>{(allData?.customers || []).length}</strong>
              </div>
              <div style={{ textAlign: 'center' }}>
                <span style={{ fontSize: '0.7rem', color: 'var(--text-light)', display: 'block' }}>Trip Sheets</span>
                <strong style={{ fontSize: '1rem', color: 'var(--primary-700)' }}>{(allData?.tripSheets || []).length}</strong>
              </div>
              <div style={{ textAlign: 'center' }}>
                <span style={{ fontSize: '0.7rem', color: 'var(--text-light)', display: 'block' }}>Maintenance</span>
                <strong style={{ fontSize: '1rem', color: 'var(--primary-700)' }}>{(allData?.maintenance || []).length}</strong>
              </div>
              <div style={{ textAlign: 'center' }}>
                <span style={{ fontSize: '0.7rem', color: 'var(--text-light)', display: 'block' }}>Income/Exp</span>
                <strong style={{ fontSize: '1rem', color: 'var(--primary-700)' }}>{(allData?.incomeExpense || []).length}</strong>
              </div>
              <div style={{ textAlign: 'center' }}>
                <span style={{ fontSize: '0.7rem', color: 'var(--text-light)', display: 'block' }}>Partners</span>
                <strong style={{ fontSize: '1rem', color: 'var(--primary-700)' }}>{(allData?.partners || []).length}</strong>
              </div>
              <div style={{ textAlign: 'center' }}>
                <span style={{ fontSize: '0.7rem', color: 'var(--text-light)', display: 'block' }}>Users</span>
                <strong style={{ fontSize: '1rem', color: 'var(--primary-700)' }}>{(allData?.users || []).length}</strong>
              </div>
            </div>
          </form>

          {/* Setup Guide & Copy Script Box */}
          <div style={{ marginTop: '1.25rem', background: 'var(--bg-subtle)', padding: '1.25rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem', flexWrap: 'wrap', gap: '0.5rem' }}>
              <h4 style={{ fontSize: '0.95rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <Code2 size={16} color="var(--primary-600)" />
                {lang === 'ta' ? 'கூகுள் ஆப்ஸ் ஸ்கிரிப்ட் குறியீடு (Code.gs)' : 'Google Apps Script Code (Code.gs)'}
              </h4>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button 
                  className="btn btn-outline btn-sm"
                  onClick={() => setShowCodePreview(!showCodePreview)}
                  style={{ fontSize: '0.75rem' }}
                >
                  {showCodePreview ? 'Hide Code' : 'View Code'}
                </button>
                <button className="btn btn-primary btn-sm" onClick={handleCopyScript}>
                  {copied ? <Check size={13} color="#ffffff" /> : <Copy size={13} />}
                  {copied ? 'Code Copied!' : t.copyScriptCode}
                </button>
              </div>
            </div>

            <ol style={{ fontSize: '0.8rem', color: 'var(--text-muted)', paddingLeft: '1.25rem', lineHeight: '1.8' }}>
              <li>Open your Google Sheet at <strong>sheets.google.com</strong>.</li>
              <li>Go to <strong>Extensions &gt; Apps Script</strong>.</li>
              <li>Delete any existing lines in <code>Code.gs</code> and click <strong>"Copy Google Apps Script Code"</strong> above to paste the code.</li>
              <li>Click <strong>Deploy &gt; New deployment &gt; Select type: Web App</strong>.</li>
              <li><strong>IMPORTANT:</strong> Set <em>Execute as:</em> <strong>Me</strong> and <em>Who has access:</em> <strong>Anyone</strong> (not "Only myself").</li>
              <li>Click <strong>Deploy</strong>, authorize permissions, copy the Web App URL, and paste it into the input above!</li>
            </ol>

            {showCodePreview && (
              <pre style={{
                marginTop: '1rem',
                background: '#0f172a',
                color: '#e2e8f0',
                padding: '1rem',
                borderRadius: 'var(--radius-sm)',
                fontSize: '0.75rem',
                overflowX: 'auto',
                maxHeight: '260px'
              }}>
                <code>{APPS_SCRIPT_TEMPLATE}</code>
              </pre>
            )}
          </div>
        </div>

        {/* Company Branding & Data Cleaning Card */}
        <div className="content-card">
          <h3 style={{ fontSize: '1.15rem', fontWeight: 700, marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Building size={18} color="var(--primary-600)" /> Company Profile & Security Settings
          </h3>
          <p style={{ fontSize: '0.825rem', color: 'var(--text-muted)', marginBottom: '1.25rem' }}>
            Configure your tractor business name, printed phone number, address, and Admin deletion PIN.
          </p>

          <form onSubmit={handleSaveAllSettings} className="form-grid">
            <div className="form-group col-full">
              <label>Company / Business Name (English)</label>
              <input
                type="text"
                className="form-control"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                placeholder="e.g. Sri Murugan Tractor Works & Agri Services"
              />
            </div>

            <div className="form-group col-full">
              <label>நிறுவனத்தின் பெயர் (தமிழ்)</label>
              <input
                type="text"
                className="form-control"
                value={companyName_ta}
                onChange={(e) => setCompanyName_ta(e.target.value)}
                placeholder="எ.கா. ஸ்ரீ முருகன் டிராக்டர் ஒர்க்ஸ் & விவசாய சேவைகள்"
              />
            </div>

            <div className="form-group">
              <label>Contact Phone Number</label>
              <input
                type="text"
                className="form-control"
                value={contactPhone}
                onChange={(e) => setContactPhone(e.target.value)}
                placeholder="+91 98422 99881"
              />
            </div>

            <div className="form-group">
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', color: '#dc2626' }}>
                <Key size={14} /> Admin Security PIN (Delete Access)
              </label>
              <input
                type="password"
                className="form-control"
                value={adminPin}
                onChange={(e) => setAdminPin(e.target.value)}
                maxLength={8}
                placeholder="Default: 1234"
              />
            </div>

            <div className="form-group col-full">
              <label>Yard / Office Address</label>
              <input
                type="text"
                className="form-control"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="e.g. Main Canal Road, Perur, TN"
              />
            </div>

            <div className="form-group col-full" style={{ marginTop: '0.5rem' }}>
              <button type="submit" className="btn btn-primary" style={{ width: '100%' }}>
                Save Profile & Settings
              </button>
            </div>
          </form>

          {/* CSV Export & Backup Utilities */}
          <div style={{ marginTop: '1.75rem', paddingTop: '1.25rem', borderTop: '1px solid var(--border-color)' }}>
            <h4 style={{ fontSize: '0.95rem', fontWeight: 700, marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <Download size={16} /> Instant CSV Exports (Offline Backup)
            </h4>
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
              <button 
                className="btn btn-outline btn-sm"
                onClick={() => downloadCsv('TractoMint_TripSheets', convertToCsv(allData.tripSheets))}
              >
                Trip Sheets CSV
              </button>
              <button 
                className="btn btn-outline btn-sm"
                onClick={() => downloadCsv('TractoMint_Maintenance', convertToCsv(allData.maintenance))}
              >
                Maintenance CSV
              </button>
              <button 
                className="btn btn-outline btn-sm"
                onClick={() => downloadCsv('TractoMint_Customers', convertToCsv(allData.customers))}
              >
                Customers CSV
              </button>
              <button 
                className="btn btn-outline btn-sm"
                onClick={() => downloadCsv('TractoMint_Users', convertToCsv(allData.users))}
              >
                Users CSV
              </button>
              <button 
                className="btn btn-outline btn-sm"
                onClick={() => downloadCsv('TractoMint_FullDatabase', JSON.stringify(allData, null, 2))}
              >
                Full JSON Backup
              </button>
            </div>
          </div>

          {/* Reset / Clean All Data Button */}
          {role === 'admin' && (
            <div style={{ marginTop: '1.5rem', paddingTop: '1rem', borderTop: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-light)' }}>
                {lang === 'ta' ? 'அனைத்து உள்ளூர் தரவையும் அழிக்க' : 'Remove all local records:'}
              </span>
              <button 
                type="button"
                className="btn btn-outline btn-sm" 
                style={{ color: '#ef4444', borderColor: '#fca5a5' }}
                onClick={() => {
                  if (window.confirm("Are you sure you want to remove all local records and start completely clean?")) {
                    onClearAllData();
                  }
                }}
              >
                <Trash2 size={13} />
                {lang === 'ta' ? 'அனைத்து தரவையும் அழி (Clear All)' : 'Clear All Data (Start Clean)'}
              </button>
            </div>
          )}

        </div>

      </div>
    </div>
  );
}
