import { Component, type ErrorInfo, type ReactNode } from 'react'
import { AlertOctagon, RotateCcw, Copy, CheckCircle2 } from 'lucide-react'

interface Props {
  children: ReactNode
}

interface State {
  hasError: boolean
  error?: Error
  copied: boolean
}

export class ErrorBoundary extends Component<Props, State> {
  public override state: State = {
    hasError: false,
    copied: false
  }

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, copied: false }
  }

  public override componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('EquiPulse Global Error Caught:', error, errorInfo)
  }

  private handleCopy = () => {
    if (this.state.error) {
      navigator.clipboard.writeText(this.state.error.stack || this.state.error.message)
      this.setState({ copied: true })
      setTimeout(() => this.setState({ copied: false }), 2000)
    }
  }

  private handleRestart = async () => {
    if ('serviceWorker' in navigator) {
      try {
        const registrations = await navigator.serviceWorker.getRegistrations();
        for (const registration of registrations) {
          await registration.unregister();
        }
        const keys = await caches.keys();
        for (const key of keys) {
          await caches.delete(key);
        }
      } catch (e) {
        console.error('Failed to clear cache', e);
      }
    }
    sessionStorage.removeItem('chunk_reload');
    window.location.reload();
  }

  public override render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-surface text-ink p-6 relative overflow-hidden font-sans">
          {/* Ambient Glows */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-danger/10 rounded-full blur-[100px] opacity-60 pointer-events-none"></div>
          
          <div className="max-w-xl w-full bg-surface-strong/80 backdrop-blur-2xl p-8 sm:p-10 rounded-3xl border border-danger/20 shadow-[0_24px_70px_rgba(239,68,68,0.1)] text-center relative z-10">
            <div className="mx-auto w-16 h-16 bg-danger/10 rounded-2xl flex items-center justify-center mb-6 shadow-[0_0_20px_rgba(239,68,68,0.3)] border border-danger/20">
              <AlertOctagon size={32} className="text-danger" />
            </div>
            
            <h1 className="text-3xl font-heading font-extrabold text-ink tracking-tight mb-3">System Exception</h1>
            <p className="text-sm text-ink-soft mb-8 leading-relaxed max-w-md mx-auto">
              EquiPulse encountered an unexpected runtime error. Your offline data remains completely safe. Please reload the application.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <button
                onClick={() => void this.handleRestart()}
                className="inline-flex items-center justify-center gap-2 bg-danger hover:bg-danger/90 text-white py-3 px-8 rounded-xl font-bold transition-all shadow-[0_0_15px_rgba(239,68,68,0.3)] hover:shadow-[0_0_25px_rgba(239,68,68,0.5)] active:scale-95"
              >
                <RotateCcw size={18} />
                Safe Restart
              </button>
            </div>

            {this.state.error && (
              <div className="mt-8 text-left group">
                <div className="flex items-center justify-between mb-2 px-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-ink-soft">Diagnostic Stack Trace</span>
                  <button 
                    onClick={this.handleCopy}
                    className="text-ink-soft hover:text-ink transition-colors flex items-center gap-1.5 text-xs font-semibold"
                  >
                    {this.state.copied ? <CheckCircle2 size={14} className="text-success" /> : <Copy size={14} />}
                    {this.state.copied ? 'Copied' : 'Copy'}
                  </button>
                </div>
                <div className="p-4 bg-black/5 dark:bg-black/40 rounded-xl border border-line/50 overflow-x-auto relative">
                  <div className="absolute top-0 left-0 w-1 h-full bg-danger/50 rounded-l-xl"></div>
                  <code className="text-[11px] text-danger/90 whitespace-pre break-words font-mono block">
                    {this.state.error.message}
                    {'\n'}
                    <span className="text-ink-soft/70">{this.state.error.stack?.split('\n').slice(1, 4).join('\n')}</span>
                  </code>
                </div>
              </div>
            )}
          </div>
        </div>
      )
    }

    return this.props.children
  }
}
