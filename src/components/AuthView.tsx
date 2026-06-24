import { motion } from 'framer-motion';
import { NavLink, Navigate } from 'react-router-dom';
import { useI18n } from '../i18n'
import { LanguageSelector } from './LanguageSelector';
import { useTheme } from '../theme';
import { useAuthSession } from '../hooks/useAuthSession';
import { BrandMark } from './BrandLogo';
import { AuthPanel } from './AuthPanel';
import { Sun, Moon, ArrowLeft } from 'lucide-react';

function NokshiBackground() {
  return (
    <div className="absolute inset-0 pointer-events-none opacity-[0.03] dark:opacity-[0.04] mix-blend-overlay z-0">
      <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <pattern id="nokshi-pattern" width="60" height="60" patternUnits="userSpaceOnUse">
            <path d="M30 0 L60 30 L30 60 L0 30 Z" fill="none" stroke="currentColor" strokeWidth="1"/>
            <circle cx="30" cy="30" r="12" fill="none" stroke="currentColor" strokeWidth="0.5"/>
            <circle cx="30" cy="30" r="2" fill="currentColor"/>
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#nokshi-pattern)"/>
      </svg>
    </div>
  );
}

export function AuthView() {
  const { t: _t } = useI18n();
  void _t;
  const { isNight, toggleTheme } = useTheme();
  const { user } = useAuthSession();

  // Redirect to dashboard if already logged in
  if (user) {
    return <Navigate to="/pos" replace />;
  }

  return (
    <div className="min-h-screen bg-surface font-sans text-ink selection:bg-sundarban/20 selection:text-sundarban flex flex-col overflow-hidden relative">
      <NokshiBackground />
      
      {/* Background Ambient Gradients - High Immersion */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <div className="absolute top-[-10%] left-[-10%] size-[800px] bg-sundarban/10 blur-[150px] rounded-full mix-blend-multiply dark:mix-blend-screen animate-pulse-soft"></div>
        <div className="absolute bottom-[-10%] right-[-10%] size-[700px] bg-terracotta/10 blur-[120px] rounded-full mix-blend-multiply dark:mix-blend-screen" style={{ animationDelay: '2s' }}></div>
      </div>

      {/* Header */}
      <header className="glass z-40 sticky top-0 flex items-center justify-between border-b border-line p-4 md:px-8 bg-surface-strong/40 backdrop-blur-3xl">
        <div className="flex items-center gap-4">
          <NavLink to="/" className="p-2 -ml-2 rounded-full hover:bg-muted text-ink-soft hover:text-ink transition-colors flex items-center justify-center">
            <ArrowLeft size={20} />
          </NavLink>
          <NavLink to="/" className="flex items-center gap-3 group">
            <BrandMark className="size-8 sm:size-10 shrink-0 text-sundarban drop-shadow-sm group-hover:scale-105 transition-transform" />
            <div className="hidden sm:block">
              <p className="font-heading text-lg sm:text-xl font-extrabold tracking-tight text-ink leading-tight">EquiPulse AI</p>
              <p className="text-[9px] sm:text-[10px] font-bold text-terracotta leading-none tracking-widest uppercase mt-0.5">by EquiSaaS BD</p>
            </div>
          </NavLink>
        </div>
        
        <div className="flex items-center gap-3 sm:gap-4">
          <button
            onClick={toggleTheme}
            className="rounded-full p-2 sm:p-2.5 bg-surface-strong hover:bg-muted text-sundarban transition-all duration-300 ring-1 ring-line/50 flex items-center justify-center shadow-premium active:scale-95"
            aria-label="Toggle Theme"
          >
            {isNight ? <Sun size={16} className="animate-fade-in sm:size-[18px]" /> : <Moon size={16} className="animate-fade-in sm:size-[18px]" />}
          </button>
          <LanguageSelector />
        </div>
      </header>

      {/* Main Content (Centered Focus) */}
      <main className="flex-1 flex items-center justify-center p-4 md:p-8 z-10">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ type: 'spring', damping: 25, stiffness: 200 }}
          className="w-full max-w-md xl:max-w-lg shrink-0 relative"
        >
          {/* Decorative Glow behind the panel */}
          <div className="absolute -inset-4 bg-gradient-to-r from-sundarban/20 via-transparent to-terracotta/20 blur-2xl rounded-full opacity-50 pointer-events-none" />
          
          <div className="glass p-6 sm:p-10 xl:p-12 rounded-[2rem] sm:rounded-[2.5rem] border border-line/60 shadow-[0_40px_100px_-20px_rgba(6,78,59,0.2)] dark:shadow-[0_40px_100px_-20px_rgba(0,0,0,0.6)] relative overflow-hidden backdrop-blur-2xl bg-surface-strong/80">
            {/* The actual AuthPanel handles the form */}
            <AuthPanel />
          </div>
        </motion.div>
      </main>
    </div>
  );
}
