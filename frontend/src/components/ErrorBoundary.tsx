import { Component } from 'react';
import type { ErrorInfo, ReactNode } from 'react';
import { ShieldAlert, RefreshCw } from 'lucide-react';

interface Props {
  children?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('System Crash Detected:', error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="h-screen w-screen bg-obsidian-900 flex items-center justify-center p-6 font-sans">
          <div className="max-w-md w-full glass p-8 rounded-3xl border-2 border-devil-gold shadow-[0_0_50px_rgba(212,175,55,0.2)] text-center animate-in zoom-in-95 duration-500">
            <ShieldAlert size={64} className="text-devil-gold mx-auto mb-6 animate-pulse" />
            <h1 className="text-2xl font-bold text-white mb-2 uppercase tracking-widest">Digital Core Interrupted</h1>
            <p className="text-devil-gold text-xs font-mono mb-8 leading-relaxed opacity-80 uppercase">
              {this.state.error?.message || 'A minor instability detected in the rendering engine.'}
            </p>
            <button
              onClick={() => window.location.reload()}
              className="w-full py-4 bg-devil-gold text-black rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-white transition-all transform hover:scale-105"
            >
              <RefreshCw size={20} />
              SOFT REBOOT SYSTEM
            </button>
            <p className="mt-6 text-[10px] text-white/30 font-mono tracking-tighter">
              PROTOCOL: AUTO-RECOVERY | STATUS: STANDBY
            </p>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
