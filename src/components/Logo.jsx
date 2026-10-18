import React from 'react';

export default function Logo({ size = 'md', showText = true, lang = 'en', onClick }) {
  const dimensions = {
    sm: { img: 32, title: '1.1rem', sub: '0.65rem' },
    md: { img: 44, title: '1.35rem', sub: '0.75rem' },
    lg: { img: 64, title: '1.85rem', sub: '0.85rem' }
  }[size] || { img: 44, title: '1.35rem', sub: '0.75rem' };

  return (
    <div 
      className="tractomint-brand" 
      onClick={onClick}
      style={{ 
        display: 'inline-flex', 
        alignItems: 'center', 
        gap: '0.75rem',
        cursor: onClick ? 'pointer' : 'default',
        userSelect: 'none'
      }}
    >
      {/* Premium Logo Graphic Container */}
      <div 
        style={{
          width: dimensions.img,
          height: dimensions.img,
          borderRadius: size === 'lg' ? '18px' : '12px',
          overflow: 'hidden',
          background: 'linear-gradient(135deg, #064e3b, #047857)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 4px 14px rgba(5, 150, 105, 0.35)',
          border: '1.5px solid rgba(52, 211, 153, 0.4)',
          position: 'relative',
          flexShrink: 0
        }}
      >
        <img 
          src="/logo.png" 
          alt="TractoMint Logo" 
          style={{ 
            width: '100%', 
            height: '100%', 
            objectFit: 'cover',
            transform: 'scale(1.08)'
          }} 
        />
      </div>

      {/* Typography */}
      {showText && (
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <div 
            style={{ 
              fontSize: dimensions.title, 
              fontWeight: 900, 
              letterSpacing: '-0.03em', 
              lineHeight: 1.1,
              display: 'flex',
              alignItems: 'center',
              gap: '0.2rem'
            }}
          >
            <span style={{ color: 'var(--text-main)' }}>Tracto</span>
            <span style={{ 
              background: 'linear-gradient(135deg, #10b981, #059669)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              fontWeight: 900
            }}>Mint</span>
            <span 
              style={{ 
                fontSize: '0.65rem', 
                background: 'var(--primary-100)', 
                color: 'var(--primary-800)', 
                padding: '0.15rem 0.4rem', 
                borderRadius: '6px',
                fontWeight: 700,
                marginLeft: '0.25rem',
                border: '1px solid var(--primary-200)',
                letterSpacing: '0.02em'
              }}
            >
              PRO
            </span>
          </div>

          <span 
            style={{ 
              fontSize: dimensions.sub, 
              color: 'var(--text-muted)', 
              fontWeight: 600,
              marginTop: '0.15rem'
            }}
          >
            {lang === 'ta' 
              ? 'டிராக்டர் & விவசாய இயந்திரங்கள் லெட்ஜர்' 
              : 'Tractor Fleet & Billing Ledger'}
          </span>
        </div>
      )}
    </div>
  );
}
