import React, { Component, ReactNode } from 'react'

interface Props { children: ReactNode }
interface State { hasError: boolean; error?: Error }

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('ErrorBoundary caught:', error, info)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center',
          justifyContent: 'center', height: '100vh', gap: 16, padding: 24,
          background: '#050d17', color: '#e2e8f0',
        }}>
          <div style={{ fontSize: 56 }}>⚠️</div>
          <h2 style={{ fontSize: 22, fontWeight: 600, margin: 0 }}>Có lỗi xảy ra</h2>
          <p style={{ color: '#94a3b8', fontSize: 14, textAlign: 'center', maxWidth: 420, margin: 0 }}>
            {this.state.error?.message || 'Lỗi không xác định'}
          </p>
          <button
            onClick={() => { this.setState({ hasError: false }); window.location.reload() }}
            style={{
              padding: '10px 24px', borderRadius: 10,
              border: '1px solid rgba(79,195,247,0.4)',
              cursor: 'pointer', fontSize: 14, background: 'rgba(79,195,247,0.1)',
              color: '#4fc3f7', fontWeight: 500,
            }}
          >
            Tải lại trang
          </button>
        </div>
      )
    }
    return this.props.children
  }
}
