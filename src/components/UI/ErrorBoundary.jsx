import React, { Component } from 'react';

export class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    console.error('ErrorBoundary caught:', error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100vh',
          background: '#0d1b2a',
          color: '#e2e8f0',
          fontFamily: 'Inter, sans-serif',
          gap: 16,
          padding: 24,
        }}>
          <div style={{ fontSize: 64, animation: 'pulse 2s infinite' }}>⚠️</div>
          <h2 style={{ fontSize: 24, fontWeight: 600, color: '#ff5252', margin: 0 }}>Có lỗi xảy ra</h2>
          <p style={{
            color: '#8892b0',
            fontSize: 14,
            textAlign: 'center',
            maxWidth: 450,
            margin: '0 0 8px 0',
            lineHeight: 1.6,
            background: 'rgba(255, 82, 82, 0.05)',
            border: '1px solid rgba(255, 82, 82, 0.15)',
            padding: '12px 16px',
            borderRadius: 8,
            wordBreak: 'break-word',
          }}>
            {this.state.error?.message || 'Lỗi không xác định trong luồng giao diện.'}
          </p>
          <button
            onClick={() => {
              this.setState({ hasError: false, error: null });
              window.location.reload();
            }}
            style={{
              padding: '10px 24px',
              borderRadius: 8,
              background: '#00e676',
              color: '#0d1b2a',
              fontWeight: 600,
              border: 'none',
              cursor: 'pointer',
              fontSize: 14,
              boxShadow: '0 4px 14px rgba(0, 230, 118, 0.3)',
              transition: 'transform 0.2s',
            }}
            onMouseOver={(e) => { e.currentTarget.style.transform = 'scale(1.05)'; }}
            onMouseOut={(e) => { e.currentTarget.style.transform = 'scale(1)'; }}
          >
            Tải lại trang
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

export default ErrorBoundary;
