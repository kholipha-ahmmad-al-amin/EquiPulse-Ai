import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { BrandMark } from './BrandLogo'
import { useI18n } from '../i18n'
import { LanguageSelector } from './LanguageSelector'
import { useTheme } from '../theme'
import { Sun, Moon, Sparkles, TrendingUp, Bot, Rocket, Users, HeartHandshake, Code2, Presentation, Brain, Database, ReceiptText, Smartphone, ArrowRight, BarChart3, WifiOff, ShieldCheck, BookOpen, ArrowUp } from 'lucide-react'
import { useAuthSession } from '../hooks/useAuthSession'
import { NavLink } from 'react-router-dom'

import { TeamShowcase } from './TeamShowcase'
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
  )
}

export function HomeView() {
  const { t } = useI18n()
  const { isNight, toggleTheme } = useTheme()
  const { user } = useAuthSession()

  const [showScrollTop, setShowScrollTop] = useState(false)

  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 400) {
        setShowScrollTop(true)
      } else {
        setShowScrollTop(false)
      }
    }
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  return (
    <div className="min-h-screen bg-surface font-sans text-ink selection:bg-sundarban/20 selection:text-sundarban flex flex-col overflow-x-hidden relative">
      <NokshiBackground />
      
      {/* Background Ambient Gradients */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <div className="absolute -top-40 -right-40 size-[600px] bg-sundarban/10 blur-[140px] rounded-full animate-pulse-soft mix-blend-multiply dark:mix-blend-screen"></div>
        <div className="absolute top-1/2 -left-40 size-[600px] bg-terracotta/10 blur-[140px] rounded-full mix-blend-multiply dark:mix-blend-screen"></div>
        <div className="absolute bottom-0 right-1/4 size-[500px] bg-gold/10 blur-[120px] rounded-full mix-blend-multiply dark:mix-blend-screen"></div>
      </div>

      {/* Header */}
      <header className="glass z-40 fixed top-0 left-0 right-0 flex items-center justify-between border-b border-line p-4 md:px-8">
        <div className="flex items-center gap-3">
          <BrandMark className="size-8 sm:size-10 shrink-0 text-sundarban drop-shadow-sm" />
          <div>
            <p className="font-heading text-lg sm:text-xl font-extrabold tracking-tight text-ink leading-tight">EquiPulse AI</p>
            <p className="text-[9px] sm:text-[10px] font-bold text-terracotta leading-none tracking-widest uppercase mt-0.5">by EquiSaaS BD</p>
          </div>
        </div>
        <div className="flex items-center gap-3 sm:gap-4">
          <button
            onClick={toggleTheme}
            className="rounded-full p-2 sm:p-2.5 bg-surface-strong hover:bg-muted text-sundarban transition-all duration-300 ring-1 ring-line/50 flex items-center justify-center shadow-premium active:scale-95"
          >
            {isNight ? <Sun size={16} className="animate-fade-in sm:size-[18px]" /> : <Moon size={16} className="animate-fade-in sm:size-[18px]" />}
          </button>
          <LanguageSelector />
          {user ? (
            <NavLink to="/pos" className="hidden md:flex items-center gap-2 rounded-full bg-sundarban text-white px-6 py-2.5 text-sm font-bold shadow-[0_4px_14px_0_rgba(6,78,59,0.39)] hover:scale-105 transition-all relative">
              {t(`Go to Dashboard`)}
              <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-danger text-[9px] font-black text-white animate-pulse shadow-[0_0_8px_rgba(239,68,68,0.8)] border-2 border-surface">!</span>
            </NavLink>
          ) : (
            <NavLink to="/auth" className="flex items-center gap-2 rounded-full bg-sundarban text-white px-5 sm:px-6 py-2 sm:py-2.5 text-xs sm:text-sm font-bold shadow-[0_4px_14px_0_rgba(6,78,59,0.39)] hover:scale-105 transition-all active:scale-95">
              {t(`Sign In`)}
            </NavLink>
          )}
        </div>
      </header>

      {/* Main Hero */}
      <main className="flex-1 flex flex-col z-10 w-full relative pt-[72px] sm:pt-[88px]">
        
        {/* 4-Tier Hero Section */}
        <section className="flex flex-col lg:flex-row items-center justify-center px-4 sm:px-8 md:px-12 py-10 sm:py-16 lg:py-24 xl:py-32 gap-10 lg:gap-16 xl:gap-24 max-w-[1536px] mx-auto w-full min-h-[90vh] relative">
          
          {/* Left Text Content */}
          <div className="flex-1 flex flex-col items-center lg:items-start text-center lg:text-left z-20 w-full lg:max-w-[55%] xl:max-w-[60%]">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-sundarban/10 text-sundarban font-bold text-xs uppercase tracking-widest mb-6 lg:mb-8 ring-1 ring-sundarban/30 shadow-sm"
            >
              <Sparkles size={14} />
              <span>Global Open Source Community</span>
            </motion.div>
            
            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="font-heading text-4xl sm:text-5xl md:text-6xl lg:text-5xl xl:text-7xl 2xl:text-[5.5rem] font-black tracking-tighter leading-[1.1] md:leading-[1.05] mb-6 lg:mb-8"
            >
              {t('The Smartest Assistant for')} <span className="text-transparent bg-clip-text bg-gradient-to-r from-sundarban via-teal-600 to-emerald-500">{t('Local Shopkeepers')}</span>
            </motion.h1>
            
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="text-base sm:text-lg md:text-xl lg:text-lg xl:text-2xl text-ink-soft max-w-2xl mb-8 lg:mb-12 leading-relaxed font-medium"
            >
              {t("Say goodbye to paper notebooks and calculation mistakes. Whether you have internet or not, turn your device into the most reliable manager for your store.")}
            </motion.p>
            
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="flex flex-col sm:flex-row items-center gap-4 w-full sm:w-auto"
            >
              {user ? (
                <NavLink to="/pos" className="flex w-full sm:w-auto items-center justify-center gap-2 rounded-full bg-sundarban text-white px-8 sm:px-10 py-4 sm:py-5 text-base sm:text-lg font-bold shadow-[0_8px_20px_0_rgba(6,78,59,0.35)] hover:shadow-[0_12px_28px_rgba(6,78,59,0.4)] hover:-translate-y-1 transition-all active:scale-95 relative overflow-hidden group">
                  <div className="absolute inset-0 bg-white/20 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700 ease-in-out"></div>
                  <Rocket size={22} className="relative z-10" />
                  <span className="relative z-10">{t(`Launch Dashboard`)}</span>
                  <span className="absolute -top-1 -right-1 sm:-top-2 sm:-right-2 flex h-5 w-5 sm:h-6 sm:w-6 items-center justify-center rounded-full bg-danger text-[10px] sm:text-xs font-black text-white animate-pulse shadow-[0_0_12px_rgba(239,68,68,0.8)] border-2 border-surface z-20">!</span>
                </NavLink>
              ) : (
                <NavLink to="/auth" className="flex w-full sm:w-auto items-center justify-center gap-2 rounded-full bg-sundarban text-white px-8 sm:px-10 py-4 sm:py-5 text-base sm:text-lg font-bold shadow-[0_8px_20px_0_rgba(6,78,59,0.35)] hover:shadow-[0_12px_28px_rgba(6,78,59,0.4)] hover:-translate-y-1 transition-all active:scale-95">
                  <Smartphone size={22} />
                  {t(`Authenticate to begin`)}
                  <ArrowRight size={20} className="animate-pulse-soft ml-1" />
                </NavLink>
              )}
              
              <NavLink to="/presentation" className="flex w-full sm:w-auto items-center justify-center gap-2 rounded-full bg-surface-strong text-ink px-8 sm:px-10 py-4 sm:py-5 text-base sm:text-lg font-bold shadow-sm ring-1 ring-line/50 hover:bg-muted hover:-translate-y-1 transition-all active:scale-95">
                <Presentation size={20} className="text-terracotta" />
                {t(`Official Pitch Deck`)}
              </NavLink>
            </motion.div>

            {/* Impact Stats Strip */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.45 }}
              className="mt-10 lg:mt-12 flex flex-wrap items-center justify-center lg:justify-start gap-6 sm:gap-10 xl:gap-14 text-sm w-full"
            >
              {[
                { stat: '100%', label: t(`Offline`), color: 'text-sundarban' },
                { stat: '100%', label: t(`Accurate`), color: 'text-terracotta' },
                { stat: '0৳', label: t(`Extra Cost`), color: 'text-gold' }
              ].map((m, i) => (
                <div key={i} className="flex flex-col items-center lg:items-start group cursor-default">
                  <span className={`font-heading text-3xl sm:text-4xl xl:text-5xl font-black ${m.color} leading-none group-hover:scale-110 transition-transform`}>{m.stat}</span>
                  <span className="text-[10px] sm:text-xs xl:text-sm font-bold uppercase tracking-widest text-ink-soft mt-2">{m.label}</span>
                </div>
              ))}
            </motion.div>
          </div>

          {/* Right Side: Auth Panel & Floating Elements */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.4 }}
            className="w-full lg:w-[45%] xl:w-[40%] flex justify-center relative mt-8 lg:mt-0"
          >
            {/* Desktop Floating Badges */}
            <div className="hidden xl:block absolute -left-16 top-12 animate-float z-30 pointer-events-none" style={{ animationDelay: '0s' }}>
              <div className="glass-accent p-4 xl:p-5 rounded-2xl flex items-center gap-4 shadow-premium border-sundarban/20 backdrop-blur-2xl">
                <div className="size-10 xl:size-12 rounded-full bg-sundarban/10 flex items-center justify-center text-sundarban">
                  <BarChart3 size={24} />
                </div>
                <div>
                  <p className="text-xs font-bold text-ink-soft uppercase tracking-wider">{t(`Monthly Profit`)}</p>
                  <p className="font-heading font-black text-xl xl:text-2xl text-ink">+24%</p>
                </div>
              </div>
            </div>

            <div className="hidden xl:block absolute -right-8 bottom-24 animate-float z-30 pointer-events-none" style={{ animationDelay: '1.2s' }}>
              <div className="glass p-4 xl:p-5 rounded-2xl flex items-center gap-4 shadow-premium border-terracotta/20 backdrop-blur-2xl">
                <div className="size-10 xl:size-12 rounded-full bg-terracotta/10 flex items-center justify-center text-terracotta">
                  <WifiOff size={24} />
                </div>
                <div>
                  <p className="text-xs font-bold text-ink-soft uppercase tracking-wider">{t(`Sync Status`)}</p>
                  <p className="font-heading font-black text-lg xl:text-xl text-ink">{t(`Saved Offline`)}</p>
                </div>
              </div>
            </div>

            {/* Feature Promo Box (Replaces AuthPanel) */}
            <div className="w-full max-w-md xl:max-w-lg shrink-0 relative z-20">
              <div className="glass p-8 sm:p-12 rounded-[2rem] sm:rounded-[2.5rem] border-2 border-line/60 shadow-[0_30px_80px_-20px_rgba(6,78,59,0.15)] dark:shadow-[0_30px_80px_-20px_rgba(0,0,0,0.5)] relative overflow-hidden backdrop-blur-2xl bg-gradient-to-br from-surface-strong/80 to-surface/40 flex flex-col items-center text-center">
                <div className="size-20 sm:size-24 bg-sundarban/10 text-sundarban rounded-full flex items-center justify-center mb-6 ring-8 ring-sundarban/5">
                  <ShieldCheck size={48} />
                </div>
                <h3 className="font-heading font-black text-2xl sm:text-3xl text-ink mb-4">
                  {t(`Works Without Internet`)}
                </h3>
                <p className="text-ink-soft font-medium leading-relaxed mb-8">
                  {t(`No internet? No problem. EquiPulse will keep running your store smoothly even when you are completely offline.`)}
                </p>
                <NavLink to="/presentation" className="flex items-center justify-center gap-2 w-full py-4 rounded-2xl bg-sundarban/10 text-sundarban hover:bg-sundarban hover:text-white transition-colors font-bold group">
                  <Presentation size={20} className="group-hover:scale-110 transition-transform" />
                  {t(`View Live Pitch Deck`)}
                </NavLink>
              </div>
            </div>
          </motion.div>
        </section>

        {/* Asymmetrical Bento Grid */}
        <section className="py-20 xl:py-32 px-4 sm:px-8 md:px-12 max-w-[1440px] mx-auto w-full relative z-20">
          <div className="text-center mb-12 sm:mb-20">
            <h2 className="font-heading text-3xl sm:text-4xl lg:text-5xl font-black mb-4">{t(`Features That Help You Grow`)}</h2>
            <p className="text-ink-soft text-base sm:text-lg lg:text-xl max-w-2xl mx-auto">{t(`Everything you need to manage your store, packed into one simple app.`)}</p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6 w-full">
            
            {/* Bento Block 1 - Large Span */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              whileHover={{ y: -4 }}
              className="glass p-8 sm:p-10 rounded-[2rem] border border-line/60 hover:border-sundarban/50 transition-all text-left flex flex-col justify-between shadow-sm hover:shadow-premium bg-gradient-to-br from-surface to-sundarban/5 md:col-span-2 xl:col-span-2 xl:row-span-2 group"
            >
              <div>
                <div className="size-16 rounded-2xl bg-surface-strong flex items-center justify-center transition-transform group-hover:scale-110 shadow-sm border border-line mb-6">
                  <WifiOff className="text-sundarban size-8" />
                </div>
                <h3 className="font-heading font-black text-ink text-2xl sm:text-3xl mb-4 leading-tight">{t(`Works Completely Offline`)}</h3>
                <p className="text-base sm:text-lg text-ink-soft leading-relaxed font-medium">{t(`No internet? No problem! You can keep adding sales and checking stock without any internet. When you get back online, it safely saves everything for you.`)}</p>
              </div>
            </motion.div>

            {/* Bento Block 2 */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              whileHover={{ y: -4 }}
              className="glass p-8 rounded-[2rem] border border-line/60 hover:border-terracotta/50 transition-all text-left flex flex-col shadow-sm hover:shadow-premium bg-gradient-to-br from-surface to-terracotta/5 group"
            >
              <div className="size-12 rounded-2xl bg-surface-strong flex items-center justify-center transition-transform group-hover:scale-110 shadow-sm border border-line mb-5">
                <Bot className="text-terracotta size-6" />
              </div>
              <h3 className="font-heading font-extrabold text-ink text-xl mb-3 leading-tight">{t(`Fast Cash Counter`)}</h3>
              <p className="text-sm text-ink-soft leading-relaxed">{t(`Forget using a calculator. Just select the product, and create a fast, accurate bill for your customer instantly.`)}</p>
            </motion.div>

            {/* Bento Block 3 */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              whileHover={{ y: -4 }}
              className="glass p-8 rounded-[2rem] border border-line/60 hover:border-gold/50 transition-all text-left flex flex-col shadow-sm hover:shadow-premium bg-gradient-to-br from-surface to-gold/5 group xl:col-start-4 xl:row-start-1"
            >
              <div className="size-12 rounded-2xl bg-surface-strong flex items-center justify-center transition-transform group-hover:scale-110 shadow-sm border border-line mb-5">
                <TrendingUp className="text-gold size-6" />
              </div>
              <h3 className="font-heading font-extrabold text-ink text-xl mb-3 leading-tight">{t(`Digital Baki Khata`)}</h3>
              <p className="text-sm text-ink-soft leading-relaxed">{t(`Easily record customer dues (Baki). Send quick SMS reminders so you never forget who owes you money.`)}</p>
            </motion.div>

            {/* Bento Block 4 - Wide Span */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              whileHover={{ y: -4 }}
              className="glass p-8 rounded-[2rem] border border-line/60 hover:border-fuchsia-500/40 transition-all text-left flex flex-col justify-center shadow-sm hover:shadow-premium bg-gradient-to-br from-surface to-fuchsia-500/5 md:col-span-2 xl:col-span-2 group"
            >
              <div className="flex items-start gap-5">
                <div className="size-12 rounded-2xl bg-surface-strong flex items-center justify-center transition-transform group-hover:scale-110 shadow-sm border border-line shrink-0">
                  <Brain className="text-fuchsia-500 size-6" />
                </div>
                <div>
                  <h3 className="font-heading font-extrabold text-ink text-xl mb-2 leading-tight">{t(`Smart Business Advice`)}</h3>
                  <p className="text-sm text-ink-soft leading-relaxed">{t(`Get daily suggestions on which products to restock, how to increase sales, and manage your shop better.`)}</p>
                </div>
              </div>
            </motion.div>

            {/* Bento Block 5 */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              whileHover={{ y: -4 }}
              className="glass p-8 rounded-[2rem] border border-line/60 hover:border-orange-500/40 transition-all text-left flex flex-col shadow-sm hover:shadow-premium bg-gradient-to-br from-surface to-orange-500/5 group md:col-span-1 xl:col-span-2"
            >
              <div className="size-12 rounded-2xl bg-surface-strong flex items-center justify-center transition-transform group-hover:scale-110 shadow-sm border border-line mb-5">
                <ReceiptText className="text-orange-500 size-6" />
              </div>
              <h3 className="font-heading font-extrabold text-ink text-xl mb-3 leading-tight">{t(`Instant Memo Scanner`)}</h3>
              <p className="text-sm text-ink-soft leading-relaxed">{t(`Don't type long lists of products. Just take a photo of your wholesale memo, and we will read it and calculate it for you.`)}</p>
            </motion.div>

            {/* Bento Block 6 */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              whileHover={{ y: -4 }}
              className="glass p-8 rounded-[2rem] border border-line/60 hover:border-blue-500/40 transition-all text-left flex flex-col shadow-sm hover:shadow-premium bg-gradient-to-br from-surface to-blue-500/5 group md:col-span-1 xl:col-span-2"
            >
              <div className="size-12 rounded-2xl bg-surface-strong flex items-center justify-center transition-transform group-hover:scale-110 shadow-sm border border-line mb-5">
                <Database className="text-blue-500 size-6" />
              </div>
              <h3 className="font-heading font-extrabold text-ink text-xl mb-3 leading-tight">{t(`Simple Sales Reports`)}</h3>
              <p className="text-sm text-ink-soft leading-relaxed">{t(`See your daily, weekly, and monthly sales in simple charts. Always know how much profit you made today.`)}</p>
            </motion.div>

          </div>
        </section>

        {/* Global Vision Section */}
        <section className="py-24 sm:py-32 px-6 sm:px-12 w-full bg-ink text-surface relative overflow-hidden">
          <div className="absolute inset-0 opacity-20 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-sundarban to-transparent mix-blend-screen"></div>
          <div className="absolute inset-0 opacity-[0.05] mix-blend-overlay">
            <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
              <defs>
                <pattern id="nokshi-dark" width="40" height="40" patternUnits="userSpaceOnUse">
                  <path d="M20 0 L40 20 L20 40 L0 20 Z" fill="none" stroke="#ffffff" strokeWidth="1"/>
                </pattern>
              </defs>
              <rect width="100%" height="100%" fill="url(#nokshi-dark)"/>
            </svg>
          </div>

          <div className="max-w-[1000px] mx-auto relative z-10 text-center">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              className="inline-flex items-center gap-2 sm:gap-3 px-4 sm:px-6 py-2 rounded-full bg-surface/10 border border-surface/20 mb-6 sm:mb-8 backdrop-blur-md"
            >
              <Code2 className="text-gold" size={16} />
              <span className="font-bold text-xs sm:text-sm tracking-widest uppercase">The Open Tech Cooperative</span>
            </motion.div>
            <h2 className="font-heading text-3xl sm:text-5xl lg:text-7xl font-black mb-6 sm:mb-8 leading-tight">
              Together We Build, <br/><span className="text-transparent bg-clip-text bg-gradient-to-r from-sundarban via-emerald-400 to-gold">Together We Own.</span>
            </h2>
            <p className="text-base sm:text-lg lg:text-xl text-surface/80 leading-relaxed mb-12 sm:mb-16 max-w-3xl mx-auto font-medium">
              {t('EquiPulse AI is redefining software development in Bangladesh through a revolutionary sweat equity model. We are a community-driven open tech cooperative building production-ready B2B SaaS solutions. We empower youth, eliminate unpaid internships, and share ownership with the builders.')}
            </p>
            <div className="flex flex-wrap justify-center gap-4 sm:gap-6">
              <div className="flex items-center gap-3 bg-surface/10 px-5 sm:px-6 py-3 sm:py-4 rounded-2xl border border-surface/10 backdrop-blur-md hover:bg-surface/20 transition-colors">
                <Users className="text-blue-400 size-5 sm:size-6" />
                <span className="font-bold text-sm sm:text-base">{t('Community Driven')}</span>
              </div>
              <div className="flex items-center gap-3 bg-surface/10 px-5 sm:px-6 py-3 sm:py-4 rounded-2xl border border-surface/10 backdrop-blur-md hover:bg-surface/20 transition-colors">
                <HeartHandshake className="text-terracotta size-5 sm:size-6" />
                <span className="font-bold text-sm sm:text-base">{t('Sweat Equity Model')}</span>
              </div>
              <div className="flex items-center gap-3 bg-surface/10 px-5 sm:px-6 py-3 sm:py-4 rounded-2xl border border-surface/10 backdrop-blur-md hover:bg-surface/20 transition-colors">
                <Code2 className="text-sundarban size-5 sm:size-6" />
                <span className="font-bold text-sm sm:text-base">{t('AGPL-3.0 Open Source')}</span>
              </div>
            </div>
          </div>
        </section>

        {/* Team Showcase Section */}
        <section className="py-20 sm:py-24 px-4 sm:px-8 md:px-12 w-full relative z-20">
          <div className="text-center mb-12 sm:mb-16">
            <h2 className="font-heading text-3xl sm:text-4xl font-black mb-4">Team EquiSaaS BD</h2>
            <p className="text-ink-soft max-w-2xl mx-auto">{t(`The Visionaries behind EquiPulse AI`)}</p>
          </div>
          <TeamShowcase />
        </section>

        {/* FAQ CTA Section */}
        <section className="py-12 sm:py-16 px-4 sm:px-8 md:px-12 max-w-[800px] mx-auto w-full relative z-20 text-center">
          <h2 className="font-heading text-2xl sm:text-3xl font-black mb-6">{t(`Have Questions?`)}</h2>
          <NavLink
            to="/faq"
            className="inline-flex items-center gap-2 rounded-full bg-surface-strong px-8 py-4 text-base font-bold text-ink shadow-sm transition-all hover:scale-105 hover:bg-muted ring-1 ring-line/50"
          >
            <BookOpen size={20} className="text-accent" />
            <span>{t(`Read our comprehensive FAQ`)}</span>
            <ArrowRight size={18} className="ml-2" />
          </NavLink>
        </section>
      </main>

      {/* Professional Footer */}
      <footer className="border-t border-line/50 bg-surface-strong/80 backdrop-blur-xl pt-16 pb-8 px-6 sm:px-12 z-20 relative">
        <div className="max-w-[1440px] mx-auto flex flex-col lg:flex-row justify-between items-center lg:items-start gap-12">
          
          <div className="flex flex-col items-center lg:items-start text-center lg:text-left max-w-sm">
            <div className="flex items-center gap-3 mb-6">
              <BrandMark className="size-8 shrink-0 text-sundarban" />
              <span className="font-heading font-black text-2xl tracking-tight">EquiPulse AI</span>
            </div>
            <p className="text-sm text-ink-soft mb-8 leading-relaxed font-medium">
              {t('An enterprise-grade, offline-first AI retail intelligence platform designed to empower micro-SMEs globally. Built as an open source initiative.')}
            </p>
            <div className="flex flex-col gap-3 mt-6">
              <NavLink to="/presentation" className="inline-flex items-center justify-center lg:justify-start gap-2 text-xs font-bold text-terracotta hover:underline">
                <Presentation size={14} />
                {t('View Pitch Deck Presentation')}
              </NavLink>
              <NavLink to="/pitch-guide" className="inline-flex items-center justify-center lg:justify-start gap-2 text-xs font-bold text-terracotta hover:underline">
                <Presentation size={14} />
                {t('Open Pitch Guide (For Founders)')}
              </NavLink>
            </div>
          </div>

          <div className="flex flex-col items-center lg:items-end text-center lg:text-right">
            <p className="text-xs text-ink-soft uppercase tracking-widest font-bold mb-4">Architected & Engineered By</p>
            <div className="flex flex-col items-center lg:items-end text-center lg:text-right">
              <span className="font-heading text-xl sm:text-2xl font-black text-ink">
                Kholipha Ahmmad Al-Amin
              </span>
              <span className="text-xs sm:text-sm font-semibold text-ink-soft mt-1">
                Student @ Atish Dipankar University of Science & Technology
              </span>
              <span className="text-[10px] sm:text-xs text-ink-soft/70 mt-1 max-w-[250px] sm:max-w-none">
                Team Lead @ Team EquiSaaS BD
              </span>
            </div>
          </div>
        </div>

        <div className="max-w-[1440px] mx-auto mt-12 sm:mt-16 pt-8 border-t border-line/30 flex flex-col sm:flex-row justify-between items-center gap-4 text-[10px] sm:text-xs text-ink-soft font-bold uppercase tracking-wider text-center sm:text-left">
          <p>© {new Date().getFullYear()} EquiPulse AI. All rights reserved.</p>
          <div className="flex items-center gap-1 opacity-70">
            Powered by <a href="https://equisaas-bd.com/" className="font-black text-ink hover:text-sundarban transition-colors">EquiSaaS BD</a>
          </div>
        </div>
      </footer>

      {/* Scroll to Top Button */}
      <AnimatePresence>
        {showScrollTop && (
          <motion.button
            initial={{ opacity: 0, scale: 0.8, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.8, y: 20 }}
            onClick={scrollToTop}
            className="fixed bottom-6 right-6 z-[100] p-3.5 bg-sundarban hover:bg-sundarban/90 text-white rounded-full shadow-lg hover:shadow-xl hover:-translate-y-1 transition-all active:scale-95 flex items-center justify-center border border-white/10"
            title="Scroll to Top"
          >
            <ArrowUp size={20} />
          </motion.button>
        )}
      </AnimatePresence>
    </div>
  )
}
