import React from 'react';
import { RotateCcw, LayoutDashboard, ShieldAlert } from 'lucide-react';

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("ErrorBoundary caught an error:", error, errorInfo);
    this.setState({ errorInfo });
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
    if (this.props.onReset) {
      this.props.onReset();
    }
  };

  render() {
    if (this.state.hasError) {
      const isTamil = this.props.lang === 'ta';
      
      return (
        <div style={{
          padding: '2.5rem 1.5rem',
          maxWidth: '650px',
          margin: '2rem auto',
          background: 'var(--bg-card)',
          border: '1px solid #fecaca',
          borderRadius: '18px',
          boxShadow: '0 10px 25px -5px rgba(239, 68, 68, 0.1)',
          textAlign: 'center'
        }}>
          <div style={{
            width: '64px',
            height: '64px',
            borderRadius: '20px',
            background: 'rgba(239, 68, 68, 0.12)',
            color: '#dc2626',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 1.25rem'
          }}>
            <ShieldAlert size={34} />
          </div>

          <h2 style={{ fontSize: '1.3rem', fontWeight: 800, color: 'var(--text-main)', marginBottom: '0.5rem' }}>
            {isTamil ? 'பக்கத்தைக் காண்பிப்பதில் தற்காலிக சிக்கல்' : 'Unable to display this section'}
          </h2>

          <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', lineHeight: 1.5, marginBottom: '1.5rem' }}>
            {isTamil 
              ? 'இந்த மெனுவின் தகவலை ஏற்றுவதில் எதிர்பாராத பிழை ஏற்பட்டுள்ளது. கீழே உள்ள முகப்பு பொத்தானை அழுத்தி தொடரலாம்.'
              : 'An unexpected rendering error occurred while loading this section. You can safely return to the dashboard.'}
          </p>

          <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center', flexWrap: 'wrap' }}>
            <button
              type="button"
              className="btn btn-primary"
              onClick={this.handleReset}
              style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', fontWeight: 700 }}
            >
              <LayoutDashboard size={16} />
              <span>{isTamil ? 'முகப்பு பலகைக்குச் செல்' : 'Back to Dashboard'}</span>
            </button>

            <button
              type="button"
              className="btn btn-outline"
              onClick={() => window.location.reload()}
              style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', fontWeight: 600 }}
            >
              <RotateCcw size={15} />
              <span>{isTamil ? 'பக்கத்தை மீண்டும் ஏற்று' : 'Reload Application'}</span>
            </button>
          </div>

          {this.state.error && (
            <div style={{
              marginTop: '1.5rem',
              padding: '0.75rem',
              background: 'var(--bg-subtle)',
              borderRadius: '8px',
              fontSize: '0.75rem',
              color: 'var(--text-light)',
              textAlign: 'left',
              fontFamily: 'monospace',
              overflowX: 'auto',
              maxHeight: '120px'
            }}>
              <strong>Error:</strong> {this.state.error.toString()}
            </div>
          )}
        </div>
      );
    }

    return this.props.children;
  }
}
