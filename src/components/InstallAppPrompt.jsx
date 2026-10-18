import React, { useState, useEffect } from 'react';
import { Download, Smartphone, X, CheckCircle2, Share } from 'lucide-react';

export default function InstallAppPrompt({ lang = 'en' }) {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [isStandalone, setIsStandalone] = useState(false);
  const [showIOSModal, setShowIOSModal] = useState(false);
  const [installedSuccessfully, setInstalledSuccessfully] = useState(false);

  useEffect(() => {
    // Check if app is already running in standalone PWA mode
    const isApp = window.matchMedia('(display-mode: standalone)').matches || 
                  window.navigator.standalone === true;
    setIsStandalone(isApp);

    // Listen for beforeinstallprompt event (Chrome, Android, Edge)
    const handleBeforeInstallPrompt = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    // Listen for appinstalled event
    const handleAppInstalled = () => {
      setInstalledSuccessfully(true);
      setDeferredPrompt(null);
      setIsStandalone(true);
      setTimeout(() => setInstalledSuccessfully(false), 5000);
    };

    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const handleInstallClick = async () => {
    // If iOS Safari
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
    if (isIOS && !isStandalone) {
      setShowIOSModal(true);
      return;
    }

    if (deferredPrompt) {
      deferredPrompt.prompt();
      const choiceResult = await deferredPrompt.userChoice;
      if (choiceResult.outcome === 'accepted') {
        setInstalledSuccessfully(true);
        setDeferredPrompt(null);
      }
    } else {
      // Fallback: show instructions
      setShowIOSModal(true);
    }
  };

  // If already running inside installed standalone app, show small verified badge or nothing
  if (isStandalone) {
    return (
      <div 
        className="app-installed-badge"
        title={lang === 'ta' ? 'TractoMint செயலி முறையில் இயங்குகிறது' : 'TractoMint running in Standalone App Mode'}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '0.35rem',
          padding: '0.25rem 0.6rem',
          borderRadius: '9999px',
          background: 'rgba(16, 185, 129, 0.12)',
          border: '1px solid rgba(16, 185, 129, 0.3)',
          color: '#10b981',
          fontSize: '0.725rem',
          fontWeight: 700
        }}
      >
        <CheckCircle2 size={13} />
        <span className="app-badge-text">{lang === 'ta' ? 'ஆப் மோடு' : 'App Mode'}</span>
      </div>
    );
  }

  return (
    <>
      {/* Install Button in Header */}
      <button 
        className="btn btn-sm install-app-btn"
        onClick={handleInstallClick}
        title={lang === 'ta' ? 'TractoMint செயலியை உங்கள் மொபைலில் நிறுவவும்' : 'Install TractoMint to Home Screen'}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '0.4rem',
          background: 'linear-gradient(135deg, #059669, #047857)',
          color: '#ffffff',
          border: 'none',
          padding: '0.35rem 0.75rem',
          borderRadius: 'var(--radius-sm)',
          fontWeight: 700,
          fontSize: '0.8rem',
          boxShadow: '0 2px 8px rgba(5, 150, 105, 0.3)',
          cursor: 'pointer',
          transition: 'all 0.2s ease'
        }}
      >
        <Smartphone size={15} />
        <span className="install-btn-text">
          {lang === 'ta' ? 'ஆப் நிறுவு' : 'Install App'}
        </span>
      </button>

      {/* iOS / General Add to Home Screen Instructions Modal */}
      {showIOSModal && (
        <div 
          className="modal-overlay" 
          onClick={() => setShowIOSModal(false)}
          style={{ zIndex: 100000 }}
        >
          <div 
            className="modal-content" 
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: '420px', padding: '1.5rem', textAlign: 'center' }}
          >
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button 
                onClick={() => setShowIOSModal(false)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}
              >
                <X size={20} />
              </button>
            </div>

            <div style={{
              width: 56,
              height: 56,
              borderRadius: '16px',
              margin: '0 auto 1rem',
              overflow: 'hidden',
              boxShadow: '0 4px 12px rgba(5, 150, 105, 0.35)'
            }}>
              <img src="/logo.png" alt="TractoMint" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            </div>

            <h3 style={{ fontSize: '1.2rem', fontWeight: 800, marginBottom: '0.5rem', color: 'var(--text-main)' }}>
              {lang === 'ta' ? 'TractoMint செயலியை நிறுவவும்' : 'Install TractoMint App'}
            </h3>
            
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '1.25rem', lineHeight: 1.5 }}>
              {lang === 'ta' 
                ? 'உங்கள் மொபைல் முகப்புத் திரையில் (Home Screen) முழு செயலியைப் போல பயன்படுத்த கீழே உள்ள எளிய படிகளைப் பின்பற்றவும்:'
                : 'Install TractoMint on your Home Screen to launch it full-screen just like a native mobile app:'}
            </p>

            <div style={{
              background: 'var(--bg-subtle)',
              border: '1px solid var(--border-color)',
              borderRadius: 'var(--radius-md)',
              padding: '1rem',
              textAlign: 'left',
              fontSize: '0.85rem',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.85rem',
              marginBottom: '1.25rem'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <span style={{
                  background: 'var(--primary-600)',
                  color: '#fff',
                  width: 24,
                  height: 24,
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '0.75rem',
                  fontWeight: 800,
                  flexShrink: 0
                }}>1</span>
                <span>
                  {lang === 'ta' 
                    ? 'உலாவி மெனுவில் உள்ள பகிர் (Share) அல்லது 3 புள்ளிகளை அழுத்தவும்.' 
                    : 'Tap the browser Share button or the 3-dot menu icon.'}
                </span>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <span style={{
                  background: 'var(--primary-600)',
                  color: '#fff',
                  width: 24,
                  height: 24,
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '0.75rem',
                  fontWeight: 800,
                  flexShrink: 0
                }}>2</span>
                <span>
                  {lang === 'ta' 
                    ? 'பட்டியலில் "Add to Home Screen" (முகப்புத் திரையில் சேர்) என்பதை தேர்ந்தெடுக்கவும்.' 
                    : 'Select "Add to Home Screen" or "Install App".'}
                </span>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <span style={{
                  background: 'var(--primary-600)',
                  color: '#fff',
                  width: 24,
                  height: 24,
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '0.75rem',
                  fontWeight: 800,
                  flexShrink: 0
                }}>3</span>
                <span>
                  {lang === 'ta' 
                    ? 'இப்போது TractoMint உங்கள் மொபைலில் தனி செயலியாக செயல்படும்!' 
                    : 'Launch anytime directly from your app icons without browser tabs!'}
                </span>
              </div>
            </div>

            <button 
              className="btn btn-primary"
              onClick={() => setShowIOSModal(false)}
              style={{ width: '100%', padding: '0.65rem' }}
            >
              {lang === 'ta' ? 'புரிந்தது' : 'Got it!'}
            </button>
          </div>
        </div>
      )}
    </>
  );
}
