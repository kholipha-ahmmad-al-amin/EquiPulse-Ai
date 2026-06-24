import { Routes, Route, Navigate, NavLink, useLocation } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Bot,
  BarChart3,
  CheckCircle2,
  ClipboardList,
  Database,
  Moon,
  Settings2,
  ShieldCheck,
  Sun,
  Trophy,
  WifiOff,
  BookOpen,
  PackageSearch,
  Users,
  Home as HomeIcon,
  Cloud,
  AlertCircle,
  User,
  Lock,
  Sparkles,
  Store,
  LogOut,
  Clock,
  Menu,
  X,
  Calculator,
  type LucideIcon,
} from 'lucide-react'
import { lazy, Suspense, useState } from 'react'
import * as React from 'react'
import { BrandMark } from './components/BrandLogo'
import { AIChatPanel } from './components/AIChatPanel'
import { DiagnosticsPanel } from './components/DiagnosticsPanel'
import { OnboardingGuide } from './components/OnboardingGuide'
import { ProtectedRoute } from './components/ProtectedRoute'
import { NotFoundView } from './components/NotFoundView'
import { PulseBriefing } from './components/PulseBriefing'
import { useMerchantPulse } from './hooks/useMerchantPulse'
import { SetupStoreProfile } from './components/SetupStoreProfile'
import { SEOHead } from './components/SEOHead'
import { HomeView } from './components/HomeView'
import { CashierLockScreen } from './components/CashierLockScreen'
import { LanguageSelector } from './components/LanguageSelector'
import { useHaptic } from './hooks/useHaptic'
import { CommandPalette } from './components/CommandPalette'
import { PitchDeck } from './components/PitchDeck'

import { DashboardSkeleton } from './components/ui/Skeleton'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const lazyWithReload = <T extends React.ComponentType<any>>(componentImport: () => Promise<{ default: T }>) =>
  lazy(async () => {
    try {
      const module = await componentImport()
      sessionStorage.removeItem('chunk_reload')
      return module
    } catch (error) {
      if (
        error instanceof Error &&
        (error.name === 'ChunkLoadError' ||
          error.message.includes('Failed to fetch dynamically imported module') ||
          error.message.includes('Importing a module script failed'))
      ) {
        const reloadCount = parseInt(sessionStorage.getItem('chunk_reload') || '0', 10)
        if (reloadCount < 2) {
          sessionStorage.setItem('chunk_reload', String(reloadCount + 1))
          
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
          window.location.reload()
          return new Promise(() => {})
        }
      }
      throw error
    }
  })

const DataHub = lazyWithReload(() => import('./components/DataHub').then(m => ({ default: m.DataHub })))
const LeaderboardView = lazyWithReload(() => import('./components/LeaderboardView').then(m => ({ default: m.LeaderboardView })))
const MetricsHub = lazyWithReload(() => import('./components/MetricsHub').then(m => ({ default: m.MetricsHub })))
const FaqView = lazyWithReload(() => import('./components/FaqView').then(m => ({ default: m.FaqView })))
const InventoryView = lazyWithReload(() => import('./components/InventoryView').then(m => ({ default: m.InventoryView })))
const FinanceView = lazyWithReload(() => import('./components/FinanceView').then(m => ({ default: m.FinanceView })))
const StaffManagement = lazyWithReload(() => import('./components/StaffManagement').then(m => ({ default: m.StaffManagement })))
const PosView = lazyWithReload(() => import('./components/PosView').then(m => ({ default: m.PosView })))
const ProfileView = lazyWithReload(() => import('./components/ProfileView').then(m => ({ default: m.ProfileView })))
const AppMarketView = lazyWithReload(() => import('./components/AppMarketView').then(m => ({ default: m.AppMarketView })))
const AuthView = lazyWithReload(() => import('./components/AuthView').then(m => ({ default: m.AuthView })))
const PublicWebStoreView = lazyWithReload(() => import('./components/WebStoreView').then(m => ({ default: m.WebStoreView })))

import { useI18n, type TranslationKey } from './i18n'
import { useTheme } from './theme'
import { useAuthSession } from './hooks/useAuthSession'
import { useDriveSync } from './hooks/useDriveSync'
import { useNetworkStatus } from './hooks/useNetworkStatus'
import { useStoreProfile } from './hooks/useStoreProfile'
import { useInventory } from './hooks/useInventory'
import { useCustomerLedger } from './hooks/useCustomerLedger'
import { useCashierLock } from './hooks/useCashierLock'
import { useTimeClock } from './hooks/useTimeClock'
import { usePlugins, getPluginRoute, type PluginId } from './hooks/usePlugins'

function NetworkBanner() {
  const { isOnline } = useNetworkStatus()
  const { t } = useI18n()
  
  if (isOnline) return null

  return (
    <div className="bg-warning text-warning-foreground px-4 py-2 text-center text-sm font-semibold flex items-center justify-center gap-2 shadow-md z-[100] sticky top-0">
      <WifiOff size={16} />
      <span>
        {t("You are offline. Data is securely saved on-device.")}
      </span>
    </div>
  )
}

function DriveSyncBanner({ isSyncing, lastSyncTime }: { isSyncing: boolean; lastSyncTime: Date | null }) {
  const { t } = useI18n()
  
  if (!lastSyncTime && !isSyncing) return null
  
  return (
    <div className="bg-surface-strong text-ink px-4 py-1.5 text-center text-[10px] font-bold flex items-center justify-center gap-2 border-b border-line/40">
      <Cloud size={14} className={isSyncing ? 'animate-pulse text-accent' : 'text-success'} />
      <span>
        {isSyncing 
          ? (t('Syncing to Google Drive...'))
          : (t('Backed up to Google Drive'))
        }
      </span>
    </div>
  )
}

type WorkspaceTabValue = 'pos' | 'data' | 'inventory' | 'metrics' | 'leaderboard' | 'queue' | 'faq' | 'controls' | 'staff' | 'profile' | 'market' | 'finance'

type WorkspaceTab = {
  value: WorkspaceTabValue
  labelKey: TranslationKey
  headerKey: TranslationKey
  introKey: TranslationKey
  tooltipKey: TranslationKey
  icon: LucideIcon
}

const workspaceTabs: WorkspaceTab[] = [
  {
    value: 'pos',
    labelKey: 'tabPos',
    headerKey: 'headerPos',
    introKey: 'posIntro',
    tooltipKey: 'tooltipPos',
    icon: ClipboardList,
  },
  {
    value: 'data',
    labelKey: 'tabDataHub',
    headerKey: 'headerDataHub',
    introKey: 'dataHubIntro',
    tooltipKey: 'tooltipDataHub',
    icon: Database,
  },
  {
    value: 'inventory',
    labelKey: 'tabInventory',
    headerKey: 'headerInventory',
    introKey: 'inventoryIntro',
    tooltipKey: 'tooltipInventoryTab',
    icon: PackageSearch,
  },
  {
    value: 'metrics',
    labelKey: 'tabMetricsHub',
    headerKey: 'headerMetricsHub',
    introKey: 'metricsIntro',
    tooltipKey: 'tooltipMetrics',
    icon: BarChart3,
  },
  {
    value: 'leaderboard',
    labelKey: 'tabLeaderboard',
    headerKey: 'headerLeaderboard',
    introKey: 'leaderboardIntro',
    tooltipKey: 'tooltipLeaderboard',
    icon: Trophy,
  },
  {
    value: 'finance',
    labelKey: 'tabFinance' as TranslationKey,
    headerKey: 'headerFinance' as TranslationKey,
    introKey: 'financeIntro' as TranslationKey,
    tooltipKey: 'tooltipFinance' as TranslationKey,
    icon: Calculator,
  },
  {
    value: 'queue',
    labelKey: 'headerActionQueue' as TranslationKey,
    headerKey: 'headerActionQueue' as TranslationKey,
    introKey: 'posIntro' as TranslationKey,
    tooltipKey: 'tooltipAcceptDeploy' as TranslationKey,
    icon: Sparkles,
  },

  {
    value: 'controls',
    labelKey: 'tabSaasControls',
    headerKey: 'headerSaasControls',
    introKey: 'controlsIntro',
    tooltipKey: 'tooltipControls',
    icon: Settings2,
  },
  {
    value: 'profile',
    labelKey: 'tabProfile' as TranslationKey,
    headerKey: 'headerProfile' as TranslationKey,
    introKey: 'profileIntro' as TranslationKey,
    tooltipKey: 'tooltipProfile' as TranslationKey,
    icon: User,
  },
  {
    value: 'staff',
    labelKey: 'tabStaff',
    headerKey: 'headerStaff',
    introKey: 'staffIntro',
    tooltipKey: 'tooltipStaff',
    icon: Users,
  },
  {
    value: 'market',
    labelKey: 'tabMarket' as TranslationKey,
    headerKey: 'headerMarket' as TranslationKey,
    introKey: 'marketIntro' as TranslationKey,
    tooltipKey: 'tooltipMarket' as TranslationKey,
    icon: Store,
  },
  {
    value: 'faq',
    labelKey: 'tabFaq',
    headerKey: 'tabFaq',
    introKey: 'tooltipFaq',
    tooltipKey: 'tooltipFaq',
    icon: BookOpen,
  },
]

// Mobile tabs are dynamically generated in the App component based on role

const controlCards: Array<{
  labelKey: TranslationKey
  valueKey: TranslationKey
}> = [
  { labelKey: 'controlRules', valueKey: 'controlRulesValue' },
  { labelKey: 'controlBilling', valueKey: 'controlBillingValue' },
  { labelKey: 'controlAccess', valueKey: 'controlAccessValue' },
]

function LiveStatusPanel() {
  const { items } = useInventory()
  const { credits } = useCustomerLedger()
  const { t, locale } = useI18n()
  const isBn = locale === 'bn'
  
  const lowStockItems = items.filter(i => i.quantity <= (i.minThreshold ?? 5))
  const pendingCredits = credits.filter(c => c.status === 'pending')
  
  const totalPending = lowStockItems.length + pendingCredits.length;

  return (
    <section className={`mt-auto rounded-xl p-4 border transition-all ${totalPending > 0 ? 'bg-warning/5 border-warning/20' : 'bg-surface-strong/50 border-transparent'}`}>
      <div className="flex items-center justify-between mb-3">
        <h2 className={`font-heading text-xs font-bold tracking-wider uppercase ${totalPending > 0 ? 'text-warning' : 'text-ink-soft'}`}>
          {totalPending > 0 ? t("Action Required") : t("Live Status")}
        </h2>
        {totalPending > 0 ? (
          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-warning/20 text-[10px] font-black text-warning">
            {totalPending}
          </span>
        ) : (
          <div className="flex h-2 w-2 rounded-full bg-success shadow-glow-success animate-pulse"></div>
        )}
      </div>
      
      {totalPending > 0 ? (
        <ul className="space-y-2.5">
          {lowStockItems.length > 0 && (
            <li className="flex items-start gap-2 text-xs leading-tight text-ink-soft bg-surface p-2 rounded-lg border border-warning/10 shadow-sm relative overflow-hidden group">
              <div className="absolute left-0 top-0 bottom-0 w-1 bg-warning group-hover:w-1.5 transition-all"></div>
              <AlertCircle aria-hidden="true" className="mt-0.5 shrink-0 text-warning" size={12} />
              <div className="flex flex-col gap-0.5">
                <span className="font-bold text-ink">{isBn ? 'স্টক কমে গেছে' : 'Low Stock Alert'}</span>
                <span>{isBn ? `${lowStockItems.length}টি পণ্যের স্টক কম। এখনই রিস্টক করুন।` : `${lowStockItems.length} item(s) running low. Restock now.`}</span>
              </div>
            </li>
          )}
          {pendingCredits.length > 0 && (
            <li className="flex items-start gap-2 text-xs leading-tight text-ink-soft bg-surface p-2 rounded-lg border border-danger/10 shadow-sm relative overflow-hidden group">
              <div className="absolute left-0 top-0 bottom-0 w-1 bg-danger group-hover:w-1.5 transition-all"></div>
              <AlertCircle aria-hidden="true" className="mt-0.5 shrink-0 text-danger" size={12} />
              <div className="flex flex-col gap-0.5">
                <span className="font-bold text-ink">{isBn ? 'বকেয়া পেমেন্ট' : 'Pending Credits'}</span>
                <span>{isBn ? `${pendingCredits.length}টি বকেয়া পেমেন্ট বাকি আছে।` : `${pendingCredits.length} credit(s) waiting for collection.`}</span>
              </div>
            </li>
          )}
        </ul>
      ) : (
        <div className="flex flex-col items-center justify-center py-2 text-center gap-1.5">
          <CheckCircle2 className="text-success" size={24} />
          <span className="text-xs font-bold text-ink-soft">{t("System ready, offline-capable.")}</span>
          <span className="text-[10px] text-ink/40">{t("All caught up. Great job!")}</span>
        </div>
      )}
    </section>
  )
}

function App() {
  const { t } = useI18n()
  const { isNight, toggleTheme } = useTheme()
  const location = useLocation()
  const { user, loading, role, signOut } = useAuthSession()
  const { profile, loadingProfile } = useStoreProfile()
  const { triggerHaptic } = useHaptic()
  const { isLocked, lock, unlock, activeCashierRole, activeCashierId, activeCashierName } = useCashierLock()
  const { activePunch, punchIn, punchOut } = useTimeClock()
  const pulse = useMerchantPulse()
  const { isSyncing: driveSyncing, lastSyncTime: driveLastSync } = useDriveSync()
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const { installedViews } = usePlugins()

  const visibleTabs = workspaceTabs.filter(tab => {
    if (tab.value === 'staff' || tab.value === 'controls') {
      return role === 'owner' || role === 'admin';
    }
    if (tab.value === 'finance') {
      return role === 'owner' || role === 'admin' || (role === 'staff' && activeCashierRole !== 'cashier');
    }
    return true;
  });

  // Installed plugin sidebar entries. The path uses a stable /plugins/* prefix
  // so deep links survive plugin id renames.
  const pluginNavEntries = installedViews.map((view) => {
    const path = getPluginRoute(view.id as PluginId)
    return {
      value: path.replace(/^\//, ''),
      path,
      route: view.route,
      labelKey: view.labelKey,
      icon: view.icon,
      badge: view.badge,
    }
  })



  const activeTabValue = location.pathname.split('/')[1] || 'pos'
  
  const activeTabConfig =
    visibleTabs.find((tab) => tab.value === activeTabValue) ?? visibleTabs[0]!

  if (location.pathname.startsWith('/faq')) {
    return <FaqView />
  }

  if (location.pathname.startsWith('/presentation')) {
    return <PitchDeck />
  }

  if (location.pathname === '/') {
    if (user && !loading) {
      return <Navigate to="/pos" replace />
    }
    if (!loading) {
      return <Navigate to="/home" replace />
    }
  }

  if (location.pathname.startsWith('/auth')) {
    if (user && !loading) {
      return <Navigate to="/pos" replace />
    }
    if (!loading) {
      return <AuthView />
    }
  }

  if (location.pathname.startsWith('/home')) {
    const params = new URLSearchParams(location.search)
    const wantsHome = params.get('view') === 'home' || (location.state as { showHome?: boolean } | null)?.showHome === true
    if (user && !loading && !wantsHome) {
      return <Navigate to="/pos" replace />
    }
    if (!loading) {
      return <HomeView />
    }
  }

  // Public web store route - no auth required, no app shell
  const publicStoreMatch = location.pathname.match(/^\/store\/([^/]+)$/)
  if (publicStoreMatch) {
    return (
      <Suspense fallback={<DashboardSkeleton />}>
        <PublicWebStoreView />
      </Suspense>
    )
  }

  if (loading || (user && loadingProfile)) {
    return (
      <main className="min-h-screen bg-muted/30 font-sans text-ink flex items-center justify-center">
        <DashboardSkeleton />
      </main>
    )
  }

  if (user && !profile && location.pathname !== '/auth') {
    return <SetupStoreProfile />
  }

  return (
    <main className="min-h-screen bg-muted/30 font-sans text-ink selection:bg-accent/20 selection:text-accent pb-24 md:pb-0">
      <SEOHead />
      <NetworkBanner />
      <DriveSyncBanner isSyncing={driveSyncing} lastSyncTime={driveLastSync} />
      <OnboardingGuide />
      <CommandPalette />
      
      {isLocked && <CashierLockScreen onUnlock={unlock} />}
      
      <header className="glass z-40 fixed top-0 left-0 right-0 flex items-center justify-between border-b border-line px-4 py-3 pt-[max(env(safe-area-inset-top),0.75rem)] md:hidden">
        <div className="flex items-center gap-3">
          <BrandMark className="size-8 shrink-0" />
          <div>
            <p className="font-heading text-[15px] font-bold tracking-tight text-ink leading-tight">SME Pulse</p>
            <p className="text-[11px] font-semibold text-accent leading-none truncate max-w-[160px]">
              {profile?.storeName || (t('Store Setup'))}
            </p>
          </div>
        </div>

        {/* Hamburger Menu Button */}
        <button
          onClick={() => { triggerHaptic(20); setIsMobileMenuOpen(!isMobileMenuOpen); }}
          className="rounded-xl p-2 bg-surface-strong/80 hover:bg-surface-strong text-ink border border-line/50 flex items-center justify-center shrink-0 shadow-premium active:scale-95 z-50 relative"
          title="Open Menu"
        >
          {isMobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
        </button>

        {/* Mobile Dropdown Menu */}
        <AnimatePresence>
          {isMobileMenuOpen && (
            <>
              <div 
                className="fixed inset-0 z-45 bg-transparent" 
                onClick={() => setIsMobileMenuOpen(false)}
              />
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: -10 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95, y: -10 }}
                className="absolute right-4 top-16 z-50 w-60 rounded-2xl border border-line/60 bg-surface/95 backdrop-blur-3xl p-4 shadow-2xl flex flex-col gap-3.5"
              >
                {/* Language Selector */}
                <div className="flex items-center justify-between pb-2.5 border-b border-line/40">
                  <span className="text-xs font-black text-ink-soft uppercase tracking-wider">{t('Language')}</span>
                  <LanguageSelector className="shrink-0" />
                </div>

                {/* Home Link */}
                <NavLink
                  to="/home?view=home"
                  onClick={() => { triggerHaptic(10); setIsMobileMenuOpen(false); }}
                  className="flex items-center gap-3.5 text-sm font-bold text-ink-soft hover:text-ink px-2 py-1.5 rounded-xl hover:bg-surface-strong/60 transition-colors"
                >
                  <HomeIcon size={18} className="text-ink-soft" />
                  <span>{t('Home')}</span>
                </NavLink>

                {/* Theme Toggle */}
                <button
                  onClick={() => { triggerHaptic(10); toggleTheme(); }}
                  className="flex items-center gap-3.5 text-sm font-bold text-ink-soft hover:text-ink w-full text-left px-2 py-1.5 rounded-xl hover:bg-surface-strong/60 transition-colors"
                >
                  {isNight ? (
                    <>
                      <Sun size={18} className="text-accent" />
                      <span>{t('Light Mode')}</span>
                    </>
                  ) : (
                    <>
                      <Moon size={18} className="text-accent" />
                      <span>{t('Dark Mode')}</span>
                    </>
                  )}
                </button>

                {/* Lock POS */}
                <button
                  onClick={() => { triggerHaptic(10); lock(); setIsMobileMenuOpen(false); }}
                  className="flex items-center gap-3.5 text-sm font-bold text-ink-soft hover:text-ink w-full text-left px-2 py-1.5 rounded-xl hover:bg-surface-strong/60 transition-colors"
                >
                  <Lock size={18} className="text-ink-soft" />
                  <span>{t('Lock Screen')}</span>
                </button>

                {/* Sign Out */}
                <button
                  onClick={() => { triggerHaptic(10); void signOut(); setIsMobileMenuOpen(false); }}
                  className="flex items-center gap-3.5 text-sm font-black text-danger hover:bg-danger/10 w-full text-left px-2 py-1.5 rounded-xl transition-all border border-transparent hover:border-danger/10"
                >
                  <LogOut size={18} className="text-danger" />
                  <span>{t('Sign Out')}</span>
                </button>
              </motion.div>
            </>
          )}
        </AnimatePresence>
      </header>

      <nav className="fixed bottom-0 inset-x-0 z-50 bg-surface/95 border-t border-line px-4 py-2 pb-[calc(env(safe-area-inset-bottom)+0.5rem)] flex items-center overflow-x-auto gap-6 md:hidden shadow-[0_-4px_20px_-10px_rgba(0,0,0,0.1)] backdrop-blur-md no-scrollbar">
        {visibleTabs.map((tab) => {
          const Icon = tab.icon

          return (
            <NavLink
              to={`/${tab.value}`}
              className={({ isActive }) =>
                `flex flex-col items-center gap-0.5 rounded-xl px-1 sm:px-3 py-1 text-[9px] sm:text-[10px] font-black transition-all duration-300 shrink-0 min-w-[4rem] ${
                  isActive
                    ? 'text-accent scale-105'
                    : 'text-ink-soft hover:text-ink'
                }`
              }
              key={tab.value}
              title={t(tab.tooltipKey)}
            >
              <Icon aria-hidden="true" size={18} />
              <span className="leading-none mt-1 truncate max-w-[56px] text-center">{t(tab.labelKey)}</span>
            </NavLink>
          )
        })}
      </nav>

      <div className="mx-auto flex w-full max-w-[1600px] flex-col md:flex-row md:gap-4 lg:gap-6 xl:gap-8 md:px-4 lg:px-6 xl:px-8 md:py-4 lg:py-6 pt-16 md:pt-0">
        
        {/* Tablet Mini-Rail Sidebar (768px - 1024px) */}
        <aside className="glass bg-surface-strong/60 backdrop-blur-2xl z-20 hidden shrink-0 flex-col items-center gap-6 md:flex lg:hidden w-20 rounded-2xl border p-4 shadow-premium sticky top-4 h-[calc(100vh-32px)]">
          <BrandMark className="size-8 shrink-0 mb-2" />
          
          <nav className="flex flex-col gap-4 overflow-y-auto flex-1 w-full items-center scrollbar-none">
            {visibleTabs.map((tab) => {
              const Icon = tab.icon
              return (
                <NavLink
                  to={`/${tab.value}`}
                  className={({ isActive }) =>
                    `group relative flex items-center justify-center size-12 rounded-xl transition-all duration-300 ${
                      isActive
                        ? 'bg-accent text-surface shadow-glow'
                        : 'text-ink-soft hover:bg-surface-strong hover:text-ink'
                    }`
                  }
                  key={tab.value}
                  title={t(tab.tooltipKey)}
                  onClick={() => triggerHaptic(10)}
                >
                  <Icon aria-hidden="true" className={`shrink-0 transition-transform duration-300 ${activeTabConfig.value === tab.value ? 'scale-110' : 'group-hover:scale-110'}`} size={22} />
                </NavLink>
              )
            })}
          </nav>
          
          <div className="flex flex-col items-center gap-4 mt-auto border-t border-line/45 pt-4 w-full">
            <button
              onClick={toggleTheme}
              className="rounded-full p-2.5 bg-surface-strong hover:bg-muted text-accent transition-all duration-300 ring-1 ring-line/50 shadow-premium active:scale-95"
              title={isNight ? t('buttonDayTheme') : t('buttonNightTheme')}
            >
              {isNight ? <Sun size={18} /> : <Moon size={18} />}
            </button>
            <button
              onClick={lock}
              className="rounded-full p-2.5 bg-danger/10 hover:bg-danger/20 text-danger transition-all duration-300 ring-1 ring-danger/30 shadow-premium active:scale-95"
              title="Lock POS"
            >
              <Lock size={18} />
            </button>
            <button
              onClick={() => void signOut()}
              className="rounded-full p-2.5 bg-danger/10 hover:bg-danger/20 text-danger transition-all duration-300 ring-1 ring-danger/30 shadow-premium active:scale-95 mt-2"
              title={t('Sign Out')}
            >
              <LogOut size={18} />
            </button>
          </div>
        </aside>

        {/* Laptop/Desktop Expanded Sidebar (>1024px) */}
        <aside className="glass bg-surface-strong/60 backdrop-blur-2xl z-20 hidden shrink-0 flex-col gap-4 lg:flex lg:w-64 xl:w-72 lg:rounded-2xl lg:border lg:p-6 lg:shadow-premium sticky top-8 h-[calc(100vh-64px)]">
          <header className="flex flex-col gap-4 border-b border-line/45 pb-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <BrandMark className="size-9 shrink-0" />
                <div>
                  <p className="font-heading text-lg font-bold tracking-tight text-ink leading-tight">SME Pulse</p>
                  <p className="text-xs font-semibold text-accent leading-none">EquiPulse AI</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={toggleTheme}
                  className="rounded-full p-2.5 bg-surface-strong hover:bg-muted text-accent transition-all duration-300 ring-1 ring-line/50 flex items-center justify-center shrink-0 shadow-premium hover:shadow-glow active:scale-95"
                  title={isNight ? t('buttonDayTheme') : t('buttonNightTheme')}
                >
                  {isNight ? (
                    <Sun size={15} className="animate-fade-in" />
                  ) : (
                    <Moon size={15} className="animate-fade-in" />
                  )}
                </button>
                <button
                  onClick={lock}
                  className="rounded-full p-2.5 bg-danger/10 hover:bg-danger/20 text-danger transition-all duration-300 ring-1 ring-danger/30 flex items-center justify-center shrink-0 shadow-premium hover:shadow-glow active:scale-95"
                  title="Lock POS"
                >
                  <Lock size={15} />
                </button>
                <NavLink
                  to="/home?view=home"
                  className="rounded-full p-2.5 bg-surface-strong hover:bg-muted text-ink-soft transition-all duration-300 ring-1 ring-line/50 flex items-center justify-center shrink-0 shadow-premium hover:shadow-glow active:scale-95"
                  title="Go to Home"
                >
                  <HomeIcon size={15} />
                </NavLink>
              </div>
            </div>
            
            <LanguageSelector className="w-full" />
          </header>

          <div className="rounded-xl border border-line/70 bg-surface-strong/30 p-4 shadow-sm flex items-center gap-3">
            <div className="size-10 rounded-lg bg-accent/15 text-accent flex items-center justify-center font-heading text-lg font-bold shrink-0">
              {profile?.storeName ? profile.storeName.charAt(0).toUpperCase() : 'M'}
            </div>
            <div className="min-w-0">
              <p className="font-heading text-sm font-extrabold text-ink truncate leading-tight">
                {profile?.storeName || (t('Store Setup'))}
              </p>
              <p className="text-[10px] font-bold uppercase tracking-wider text-success mt-0.5 leading-none">
                {t('coopGrade', { tier: profile?.tier || 'Gold 🌟', defaultValue: `Coop Grade: ${profile?.tier || 'Gold 🌟'}` })}
              </p>
            </div>
          </div>

          {activeCashierId && (
            <div className="rounded-xl border border-line bg-surface/50 p-3 shadow-sm flex flex-col gap-2">
              <div className="flex items-center justify-between text-[11px] font-bold">
                <span className="text-ink-soft flex items-center gap-1.5">
                  <Clock size={12} className="text-accent" />
                  {activeCashierName}
                </span>
                <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-wider ${activePunch ? 'bg-success/15 text-success border border-success/20' : 'bg-warning/15 text-warning border border-warning/20'}`}>
                  {activePunch ? t('Clocked In') : t('Clocked Out')}
                </span>
              </div>
              <button
                onClick={() => {
                  triggerHaptic(20);
                  void (activePunch ? punchOut() : punchIn());
                }}
                className={`w-full py-2 rounded-xl text-xs font-black transition-all shadow-sm active:scale-95 text-center ${
                  activePunch
                    ? 'bg-danger/10 text-danger border border-danger/20 hover:bg-danger/20'
                    : 'bg-accent text-surface hover:bg-accent/90'
                }`}
              >
                {activePunch ? t('Punch Out Now') : t('Punch In Now')}
              </button>
            </div>
          )}

          <nav className="flex flex-col gap-1 overflow-y-auto flex-1">
            {visibleTabs.map((tab) => {
              const Icon = tab.icon

              return (
                <NavLink
                  to={`/${tab.value}`}
                  className={({ isActive }) =>
                    `group relative flex items-center gap-3 rounded-xl px-4 py-2.5 text-sm font-bold transition-all duration-300 ease-bounce ${
                      isActive
                        ? 'bg-accent text-surface shadow-glow'
                        : 'text-ink-soft hover:bg-surface-strong hover:text-ink'
                    }`
                  }
                  key={tab.value}
                  title={t(tab.tooltipKey)}
                  onClick={() => triggerHaptic(10)}
                >
                  <Icon aria-hidden="true" className={`shrink-0 transition-transform duration-300 ${activeTabConfig.value === tab.value ? 'scale-110' : 'group-hover:scale-110'}`} size={18} />
                  <span className="leading-none">{t(tab.labelKey)}</span>
                </NavLink>
              )
            })}

            {pluginNavEntries.length > 0 && (
              <div className="mt-3 border-t border-line/40 pt-3">
                <p className="px-4 pb-2 text-[10px] font-bold uppercase tracking-widest text-ink-soft">
                  {t('Installed Plugins')}
                </p>
                {pluginNavEntries.map((entry) => {
                  const Icon = entry.icon
                  const isActive = location.pathname.startsWith(entry.path)
                  return (
                    <NavLink
                      to={entry.path}
                      className={`group relative flex items-center gap-3 rounded-xl px-4 py-2.5 text-sm font-bold transition-all duration-300 ease-bounce ${
                        isActive
                          ? 'bg-accent text-surface shadow-glow'
                          : 'text-ink-soft hover:bg-surface-strong hover:text-ink'
                      }`}
                      key={entry.path}
                      title={t(entry.labelKey)}
                      onClick={() => triggerHaptic(10)}
                    >
                      <Icon aria-hidden="true" className="shrink-0 group-hover:scale-110 transition-transform duration-300" size={18} />
                      <span className="leading-none">{t(entry.labelKey)}</span>
                      {entry.badge && (
                        <span className="ml-auto rounded-md bg-accent/15 px-1.5 py-0.5 text-[9px] font-black uppercase tracking-wider text-accent">
                          {entry.badge}
                        </span>
                      )}
                    </NavLink>
                  )
                })}
              </div>
            )}
          </nav>
          
          {/* Sign Out Button - Desktop */}
          <div className="mt-auto pt-4 border-t border-line/50">
            <button
              onClick={() => void signOut()}
              className="group w-full flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-bold text-danger hover:bg-danger/10 transition-all duration-300 ease-bounce"
            >
              <LogOut className="shrink-0 group-hover:scale-110 transition-transform duration-300" size={18} />
              <span>{t('Sign Out')}</span>
            </button>
          </div>
          
          <LiveStatusPanel />
        </aside>
        <section className="flex-1 overflow-y-auto min-w-0">
          <AnimatePresence mode="wait">
            <motion.div
              key={location.pathname}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.3 }}
            >
              <Suspense fallback={<DashboardSkeleton />}>
                <Routes location={location} key={location.pathname}>
                <Route path="/" element={<Navigate to="/pos" replace />} />
                
                <Route element={<ProtectedRoute allowedRoles={['owner', 'staff', 'admin']} />}>
                  <Route path="/pos" element={<PosView />} />
                  <Route path="/data" element={<DataHub />} />
                  <Route path="/inventory" element={<InventoryView />} />
                   <Route path="/finance" element={
                    role === 'staff' && activeCashierRole === 'cashier' ? (
                      <div className="p-8 text-center text-ink-soft">
                        <ShieldCheck className="mx-auto mb-4 opacity-50" size={48} />
                        <p>{t('Access Denied. Owner or Manager role required.')}</p>
                      </div>
                    ) : (
                      <FinanceView />
                    )
                  } />
                  <Route path="/metrics" element={<MetricsHub />} />
                  <Route path="/leaderboard" element={<LeaderboardView />} />
                  <Route path="/queue" element={
                    <div className="flex h-full flex-col justify-center py-6">
                      <PulseBriefing actions={pulse.actions} />
                    </div>
                  } />
                  <Route path="/profile" element={<ProfileView />} />
                  <Route path="/market" element={<AppMarketView />} />
                  {installedViews.map((view) => (
                    <Route
                      key={view.id}
                      path={view.route}
                      element={<view.Component />}
                    />
                  ))}
                </Route>
                
                <Route element={<ProtectedRoute allowedRoles={['owner', 'admin']} />}>
                  <Route path="/staff" element={<StaffManagement />} />
                  <Route path="/controls" element={
                    <div className="p-6 grid gap-6 lg:grid-cols-3">
                      {controlCards.map(({ labelKey, valueKey }) => (
                        <article
                          className="group relative overflow-hidden rounded-2xl border border-line/50 bg-surface-strong p-5 shadow-sm transition-all hover:shadow-glass hover:border-accent/30"
                          key={labelKey}
                        >
                          <p className="text-sm font-medium text-ink-soft">{t(labelKey)}</p>
                          <p className="mt-2 font-heading text-3xl font-bold tracking-tight">
                            {t(valueKey)}
                          </p>
                        </article>
                      ))}
                      <section className="rounded-2xl border border-line/50 bg-surface-strong p-6 shadow-sm lg:col-span-3">
                        <h3 className="font-heading text-lg font-bold">{t('headerThemeControls')}</h3>
                        <div className="mt-5 flex flex-wrap gap-4">
                          <button
                            className="inline-flex items-center gap-2 rounded-xl bg-accent px-5 py-3 text-sm font-semibold text-surface shadow-glow transition-all hover:scale-[1.02] hover:bg-accent/90"
                            title={t('tooltipTheme')}
                            type="button"
                            onClick={toggleTheme}
                          >
                            {isNight ? <Sun aria-hidden="true" size={18} /> : <Moon aria-hidden="true" size={18} />}
                            {isNight ? t('buttonDayTheme') : t('buttonNightTheme')}
                          </button>
                          
                          {/* Offline AI Toggle */}
                          <div className="inline-flex items-center gap-3 rounded-xl border border-line bg-surface px-5 py-3 text-sm font-semibold shadow-sm transition-all">
                            <Bot size={18} className="text-success" />
                            <div className="flex flex-col">
                              <span>{t('Local AI (Ollama)')}</span>
                              <span className="text-[10px] text-ink-soft font-normal">{t('Offline Mode Active')}</span>
                            </div>
                            <div className="ml-4 w-10 h-5 rounded-full bg-success relative cursor-pointer opacity-80 hover:opacity-100">
                              <div className="absolute right-1 top-1 w-3 h-3 rounded-full bg-surface shadow-sm"></div>
                            </div>
                          </div>



                          <button
                            className="inline-flex items-center gap-2 rounded-xl border border-line bg-surface px-5 py-3 text-sm font-semibold shadow-sm transition-all hover:bg-muted"
                            title={t('tooltipDeployRules')}
                            type="button"
                          >
                            <ShieldCheck aria-hidden="true" size={18} />
                            {t('buttonDeployRules')}
                          </button>
                        </div>
                      </section>
                      <section className="lg:col-span-3">
                        <DiagnosticsPanel />
                      </section>
                    </div>
                  } />
                </Route>

                {/* Catch-All 404 Route */}
                <Route path="*" element={<NotFoundView />} />
                </Routes>
              </Suspense>
          </motion.div>
          </AnimatePresence>
        </section>
      </div>
      {/* Floating AI Chat Panel - single instance, opens via FAB */}
      <AIChatPanel />
    </main>
  )
}

export default App
