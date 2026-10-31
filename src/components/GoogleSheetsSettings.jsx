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
import { validatePhone10 } from '../services/storage';

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
  settings = {}, 
  onSaveSettings, 
  onSyncAll, 
  onPullFromSheets,
  onClearAllData,
  allData = {}, 
  lang = 'ta', 
  role = 'admin' 
}) {
  const t = translations[lang] || translations.en;
  const [webAppUrl, setWebAppUrl] = useState(
    settings?.webAppUrl || ENV_GOOGLE_SHEETS_URL || ''
  );
  const [autoSync, setAutoSync] = useState(settings?.autoSync || false);
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
  const [settingsError, setSettingsError] = useState('');

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
    setSettingsError('');

    const pin = String(adminPin || '').trim();
    if (pin.length < 4) {
      setSettingsError(lang === 'ta' ? 'அட்மின் பாதுகாப்பு PIN குறைந்தது 4 இலக்கங்கள் இருக்க வேண்டும்!' : 'Admin Security PIN must be at least 4 digits!');
      return;
    }

    let cleanPhone = '';
    if (contactPhone && contactPhone.trim()) {
      const pVal = validatePhone10(contactPhone, lang === 'ta' ? 'தொடர்பு எண்' : 'Contact Phone');
      if (!pVal.valid) {
        setSettingsError(pVal.error);
        return;
      }
      cleanPhone = pVal.phone;
    }

    const res = onSaveSettings({
      ...settings,
      webAppUrl,
      autoSync,
      adminPin: pin,
      companyName,
      companyName_ta,
      contactPhone: cleanPhone,
      address
    });

    if (res && res.success === false) {
      setSettingsError(res.error || 'Failed to save settings.');
      return;
    }

    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 3000);
  };

  return (
    <div>
      {/* Header bar */}
      <div className="card-header-bar">
        <div className="card-title-group">
          <h2 style={{ margin: 0 }}><CloudSun size={22} /> {lang === 'ta' ? 'கூகுள் ஷீட் இணைப்பு & அமைப்புகள்' : t.googleSheetsTitle}</h2>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(440px, 1fr))', gap: '1.5rem' }}>
        
        {/* Google Sheets Connection Setup Card */}
        <div className="content-card">
          <h3 style={{ fontSize: '1.15rem', fontWeight: 700, marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <CloudSun size={18} color="var(--primary-600)" /> {lang === 'ta' ? 'கூகுள் ஷீட் வெப்ஹூக் இணைப்பு' : 'Google Sheet Webhook Connection'}
          </h3>
          <p style={{ fontSize: '0.825rem', color: 'var(--text-muted)', marginBottom: '1.25rem' }}>
            {lang === 'ta' 
              ? 'உங்கள் கூகுள் ஷீட்டிலிருந்து பதிவுகளை எடுக்க அல்லது தானாக சேமிக்க Web App URL ஐ உள்ளிடவும்.' 
              : 'Enter your Google Apps Script Web App URL to pull data from your spreadsheet or save all ledger records automatically.'}
          </p>

          <form onSubmit={handleSaveAllSettings}>
            <div className="form-group" style={{ marginBottom: '1rem' }}>
              <label>{lang === 'ta' ? 'கூகுள் ஆப்ஸ் ஸ்கிரிப்ட் URL' : t.webAppUrl}</label>
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
                    ? (lang === 'ta' ? '● சூழல் URL இணைக்கப்பட்டுள்ளது' : '● Configured via .env (VITE_GOOGLE_SHEETS_URL)') 
                    : (lang === 'ta' ? '● தனிப்பயன் URL' : '● Custom Web App URL')}
                </span>
                {webAppUrl && (
                  <span style={{ color: 'var(--text-muted)' }}>
                    {lang === 'ta' ? 'இணைப்பு ஐடி:' : 'Deployment ID:'} <code>{webAppUrl.match(/\/s\/([a-zA-Z0-9_-]+)\/exec/)?.[1] || 'Detected'}</code>
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
                    {lang === 'ta' ? 'இயல்பு URL மீட்டமை' : 'Reset to .env URL'}
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
                {lang === 'ta' ? 'ஒவ்வொரு புதிய பதிவு அல்லது திருத்தத்தின் போதும் தானாக கூகுள் ஷீட்டில் சேமிக்கவும்' : t.autoSyncOnSave}
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
                title={lang === 'ta' ? 'கூகுள் ஷீட்டிலிருந்து பதிவுகளை எடுக்க' : 'Get/Import all records from Google Sheet'}
              >
                {pulling ? <RefreshCw size={15} className="spin-animation" /> : <ArrowDownCircle size={16} />}
                {pulling ? (lang === 'ta' ? 'எடுக்கிறது...' : 'Fetching...') : (lang === 'ta' ? 'ஷீட்டிலிருந்து பதிவுகளை எடு' : 'Get from Google Sheet')}
              </button>

              {/* PUSH BUTTON */}
              <button 
                type="button" 
                className="btn btn-primary"
                onClick={handleTriggerPush}
                disabled={syncing || !webAppUrl}
                title={lang === 'ta' ? 'அனைத்து பதிவுகளையும் கூகுள் ஷீட்டில் சேமிக்க' : 'Push all local records into Google Sheet'}
              >
                {syncing ? <RefreshCw size={15} className="spin-animation" /> : <ArrowUpCircle size={16} />}
                {syncing ? (lang === 'ta' ? 'சேமிக்கிறது...' : 'Saving...') : (lang === 'ta' ? 'ஷீட்டில் பதிவுகளைச் சேமி' : 'Save to Google Sheet')}
              </button>

              {/* TEST BUTTON */}
              <button 
                type="button" 
                className="btn btn-outline"
                onClick={handleTestConnection}
                disabled={testing || !webAppUrl}
              >
                {testing ? <RefreshCw size={14} className="spin-animation" /> : <ExternalLink size={14} />}
                {testing ? (lang === 'ta' ? 'சோதிக்கிறது...' : 'Testing...') : (lang === 'ta' ? 'இணைப்பைச் சோதி' : t.testConnection)}
              </button>

              {/* SAVE SETTINGS BUTTON */}
              <button type="submit" className="btn btn-outline" style={{ marginLeft: 'auto' }}>
                {saveSuccess ? <Check size={14} color="#16a34a" /> : null}
                {saveSuccess ? (lang === 'ta' ? 'சேமிக்கப்பட்டது!' : 'Saved!') : (lang === 'ta' ? 'அமைப்புகளைச் சேமி' : t.save)}
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

            {/* Synchronized Ledger Metrics Grid */}
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
                <span style={{ fontSize: '0.75rem', color: 'var(--text-light)', display: 'block' }}>
                  {lang === 'ta' ? 'வாகனங்கள்' : 'Fleet'}
                </span>
                <strong style={{ fontSize: '1rem', color: 'var(--primary-700)' }}>{(allData?.fleet || []).length}</strong>
              </div>
              <div style={{ textAlign: 'center' }}>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-light)', display: 'block' }}>
                  {lang === 'ta' ? 'வாடகை' : 'Rates'}
                </span>
                <strong style={{ fontSize: '1rem', color: 'var(--primary-700)' }}>{(allData?.rateMatrix || []).length}</strong>
              </div>
              <div style={{ textAlign: 'center' }}>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-light)', display: 'block' }}>
                  {lang === 'ta' ? 'டிரைவர்கள்' : 'Drivers'}
                </span>
                <strong style={{ fontSize: '1rem', color: 'var(--primary-700)' }}>{(allData?.drivers || []).length}</strong>
              </div>
              <div style={{ textAlign: 'center' }}>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-light)', display: 'block' }}>
                  {lang === 'ta' ? 'விவசாயிகள்' : 'Farmers'}
                </span>
                <strong style={{ fontSize: '1rem', color: 'var(--primary-700)' }}>{(allData?.customers || []).length}</strong>
              </div>
              <div style={{ textAlign: 'center' }}>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-light)', display: 'block' }}>
                  {lang === 'ta' ? 'டிரிப் சீட்டுகள்' : 'Trip Sheets'}
                </span>
                <strong style={{ fontSize: '1rem', color: 'var(--primary-700)' }}>{(allData?.tripSheets || []).length}</strong>
              </div>
              <div style={{ textAlign: 'center' }}>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-light)', display: 'block' }}>
                  {lang === 'ta' ? 'பராமரிப்பு' : 'Maintenance'}
                </span>
                <strong style={{ fontSize: '1rem', color: 'var(--primary-700)' }}>{(allData?.maintenance || []).length}</strong>
              </div>
              <div style={{ textAlign: 'center' }}>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-light)', display: 'block' }}>
                  {lang === 'ta' ? 'வரவு/செலவு' : 'Income/Exp'}
                </span>
                <strong style={{ fontSize: '1rem', color: 'var(--primary-700)' }}>{(allData?.incomeExpense || []).length}</strong>
              </div>
              <div style={{ textAlign: 'center' }}>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-light)', display: 'block' }}>
                  {lang === 'ta' ? 'பங்குதாரர்கள்' : 'Partners'}
                </span>
                <strong style={{ fontSize: '1rem', color: 'var(--primary-700)' }}>{(allData?.partners || []).length}</strong>
              </div>
              <div style={{ textAlign: 'center' }}>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-light)', display: 'block' }}>
                  {lang === 'ta' ? 'பணியாளர்கள்' : 'Users'}
                </span>
                <strong style={{ fontSize: '1rem', color: 'var(--primary-700)' }}>{(allData?.users || []).length}</strong>
              </div>
            </div>
          </form>

          {/* Setup Guide & Copy Script Box */}
          <div style={{ marginTop: '1.25rem', background: 'var(--bg-subtle)', padding: '1.25rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem', flexWrap: 'wrap', gap: '0.5rem' }}>
              <h4 style={{ fontSize: '0.95rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <Code2 size={16} color="var(--primary-600)" />
                {lang === 'ta' ? 'கூகுள் ஆப்ஸ் ஸ்கிரிப்ட் குறியீடு' : 'Google Apps Script Code (Code.gs)'}
              </h4>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button 
                  className="btn btn-outline btn-sm"
                  onClick={() => setShowCodePreview(!showCodePreview)}
                  style={{ fontSize: '0.75rem' }}
                >
                  {showCodePreview ? (lang === 'ta' ? 'குறியீட்டை மறை' : 'Hide Code') : (lang === 'ta' ? 'குறியீட்டைப் பார்' : 'View Code')}
                </button>
                <button className="btn btn-primary btn-sm" onClick={handleCopyScript}>
                  {copied ? <Check size={13} color="#ffffff" /> : <Copy size={13} />}
                  {copied ? (lang === 'ta' ? 'நகலெடுக்கப்பட்டது!' : 'Code Copied!') : (lang === 'ta' ? 'குறியீட்டை நகலெடு' : t.copyScriptCode)}
                </button>
              </div>
            </div>

            <ol style={{ fontSize: '0.825rem', color: 'var(--text-muted)', paddingLeft: '1.25rem', lineHeight: '1.8' }}>
              {lang === 'ta' ? (
                <>
                  <li>sheets.google.com தளத்தில் உங்கள் கூகுள் ஷீட்டைத் திறக்கவும்.</li>
                  <li><strong>Extensions &gt; Apps Script</strong> பகுதிக்குச் செல்லவும்.</li>
                  <li><code>Code.gs</code>-ல் உள்ள பழைய வரிகளை நீக்கி, மேலே உள்ள <strong>"குறியீட்டை நகலெடு"</strong> பொத்தானை அழுத்தி ஒட்டவும்.</li>
                  <li><strong>Deploy &gt; New deployment &gt; வகை: Web App</strong> என்பதைத் தேர்ந்தெடுக்கவும்.</li>
                  <li><strong>முக்கியம்:</strong> <em>Execute as:</em> <strong>Me</strong> எனவும், <em>Who has access:</em> <strong>Anyone</strong> எனவும் தேர்வு செய்யவும்.</li>
                  <li><strong>Deploy</strong> செய்து URL ஐ நகலெடுத்து மேலே உள்ள கட்டத்தில் ஒட்டவும்!</li>
                </>
              ) : (
                <>
                  <li>Open your Google Sheet at <strong>sheets.google.com</strong>.</li>
                  <li>Go to <strong>Extensions &gt; Apps Script</strong>.</li>
                  <li>Delete any existing lines in <code>Code.gs</code> and click <strong>"Copy Google Apps Script Code"</strong> above to paste the code.</li>
                  <li>Click <strong>Deploy &gt; New deployment &gt; Select type: Web App</strong>.</li>
                  <li><strong>IMPORTANT:</strong> Set <em>Execute as:</em> <strong>Me</strong> and <em>Who has access:</em> <strong>Anyone</strong> (not "Only myself").</li>
                  <li>Click <strong>Deploy</strong>, authorize permissions, copy the Web App URL, and paste it into the input above!</li>
                </>
              )}
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
            <Building size={18} color="var(--primary-600)" /> {lang === 'ta' ? 'நிறுவன சுயவிவரம் மற்றும் பாதுகாப்பு அமைப்புகள்' : 'Company Profile & Security Settings'}
          </h3>
          <p style={{ fontSize: '0.825rem', color: 'var(--text-muted)', marginBottom: '1.25rem' }}>
            {lang === 'ta' 
              ? 'வணிகப் பெயர், ரசீதில் அச்சிடப்படும் தொலைபேசி எண், முகவரி மற்றும் நிர்வாகி பின்னை இங்கு அமைக்கவும்.' 
              : 'Configure your tractor business name, printed phone number, address, and Admin deletion PIN.'}
          </p>

          <form onSubmit={handleSaveAllSettings} className="form-grid">
            {settingsError && (
              <div className="col-full" style={{
                padding: '0.75rem 1rem',
                borderRadius: 'var(--radius-sm)',
                background: '#fee2e2',
                color: '#991b1b',
                fontSize: '0.85rem',
                fontWeight: 600,
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                border: '1px solid #fca5a5',
                marginBottom: '0.5rem'
              }}>
                <AlertCircle size={18} style={{ flexShrink: 0 }} />
                <span>{settingsError}</span>
              </div>
            )}
            
            {/* Show only relevant language company name */}
            {lang === 'ta' ? (
              <div className="form-group col-full">
                <label>நிறுவனத்தின் பெயர்</label>
                <input
                  type="text"
                  className="form-control"
                  value={companyName_ta || companyName}
                  onChange={(e) => {
                    setCompanyName_ta(e.target.value);
                    if (!companyName) setCompanyName(e.target.value);
                  }}
                  placeholder="எ.கா. ஸ்ரீ முருகன் டிராக்டர் ஒர்க்ஸ் & விவசாய சேவைகள்"
                />
              </div>
            ) : (
              <div className="form-group col-full">
                <label>Company / Business Name</label>
                <input
                  type="text"
                  className="form-control"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  placeholder="e.g. Sri Murugan Tractor Works & Agri Services"
                />
              </div>
            )}

            <div className="form-group">
              <label>{lang === 'ta' ? 'தொடர்பு தொலைபேசி எண் (10 இலக்கங்கள்)' : 'Contact Phone Number (10 digits)'}</label>
              <input
                type="tel"
                className="form-control"
                value={contactPhone}
                onChange={(e) => {
                  const digits = e.target.value.replace(/\D/g, '').slice(0, 10);
                  setContactPhone(digits);
                  if (settingsError) setSettingsError('');
                }}
                placeholder="9842299881"
              />
            </div>

            <div className="form-group">
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', color: '#dc2626' }}>
                <Key size={14} /> {lang === 'ta' ? 'நிர்வாகி பாதுகாப்பு PIN (நீக்க அனுமதி)' : 'Admin Security PIN (Delete Access)'}
              </label>
              <input
                type="password"
                className="form-control"
                value={adminPin}
                onChange={(e) => setAdminPin(e.target.value)}
                maxLength={8}
                placeholder={lang === 'ta' ? 'இயல்பு: 1234' : 'Default: 1234'}
              />
            </div>

            <div className="form-group col-full">
              <label>{lang === 'ta' ? 'வணிக முகவரி (ரசீதில் அச்சிடப்படும்)' : 'Yard / Office Address'}</label>
              <input
                type="text"
                className="form-control"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder={lang === 'ta' ? 'எ.கா. மெயின் வாய்க்கால் ரோடு, பேரூர்' : 'e.g. Main Canal Road, Perur, TN'}
              />
            </div>

            <div className="form-group col-full" style={{ marginTop: '0.5rem' }}>
              <button type="submit" className="btn btn-primary" style={{ width: '100%', padding: '0.75rem', fontWeight: 700 }}>
                {lang === 'ta' ? 'சுயவிவர அமைப்புகளைச் சேமிக்கவும்' : 'Save Profile & Settings'}
              </button>
            </div>
          </form>

          {/* CSV Export & Backup Utilities */}
          <div style={{ marginTop: '1.75rem', paddingTop: '1.25rem', borderTop: '1px solid var(--border-color)' }}>
            <h4 style={{ fontSize: '0.95rem', fontWeight: 700, marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <Download size={16} /> {lang === 'ta' ? 'தரவு பதிவிறக்கம் & காப்புப்பிரதி (CSV / Backup)' : 'Instant CSV Exports (Offline Backup)'}
            </h4>
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
              <button 
                className="btn btn-outline btn-sm"
                onClick={() => downloadCsv('TractoMint_TripSheets', convertToCsv(allData?.tripSheets || []))}
              >
                {lang === 'ta' ? 'டிரிப் சீட்டுகள் CSV' : 'Trip Sheets CSV'}
              </button>
              <button 
                className="btn btn-outline btn-sm"
                onClick={() => downloadCsv('TractoMint_Maintenance', convertToCsv(allData?.maintenance || []))}
              >
                {lang === 'ta' ? 'பராமரிப்பு CSV' : 'Maintenance CSV'}
              </button>
              <button 
                className="btn btn-outline btn-sm"
                onClick={() => downloadCsv('TractoMint_Customers', convertToCsv(allData?.customers || []))}
              >
                {lang === 'ta' ? 'விவசாயிகள் CSV' : 'Customers CSV'}
              </button>
              <button 
                className="btn btn-outline btn-sm"
                onClick={() => downloadCsv('TractoMint_Users', convertToCsv(allData?.users || []))}
              >
                {lang === 'ta' ? 'பணியாளர்கள் CSV' : 'Users CSV'}
              </button>
              <button 
                className="btn btn-outline btn-sm"
                onClick={() => downloadCsv('TractoMint_FullDatabase', JSON.stringify(allData || {}, null, 2))}
              >
                {lang === 'ta' ? 'முழு தரவு காப்புப்பிரதி (JSON)' : 'Full JSON Backup'}
              </button>
            </div>
          </div>

          {/* Reset / Clean All Data Button */}
          {role === 'admin' && (
            <div style={{ marginTop: '1.5rem', paddingTop: '1rem', borderTop: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-light)' }}>
                {lang === 'ta' ? 'அனைத்து உள்ளூர் பதிவுகளையும் அழிக்க:' : 'Remove all local records:'}
              </span>
              <button 
                type="button"
                className="btn btn-outline btn-sm" 
                style={{ color: '#ef4444', borderColor: '#fca5a5' }}
                onClick={() => {
                  if (window.confirm(lang === 'ta' ? 'நிச்சயமாக அனைத்து பதிவுகளையும் நீக்க விரும்புகிறீர்களா?' : 'Are you sure you want to remove all local records and start completely clean?')) {
                    onClearAllData();
                  }
                }}
              >
                <Trash2 size={13} />
                {lang === 'ta' ? 'அனைத்து பதிவுகளையும் அழி' : 'Clear All Data (Start Clean)'}
              </button>
            </div>
          )}

        </div>

      </div>
    </div>
  );
}
