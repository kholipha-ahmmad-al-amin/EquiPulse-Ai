import { useState } from 'react'
import { motion } from 'framer-motion'
import { Store, User, MapPin, Tag, FileText, BadgeCheck, Mail, ShieldCheck, Globe, Share2, Copy, Check } from 'lucide-react'
import { useStoreProfile } from '../hooks/useStoreProfile'
import { useI18n } from '../i18n'
import { useAuthSession } from '../hooks/useAuthSession'
import { useToast } from './ToastProvider'

export function ProfileView() {
  const { t } = useI18n()
  const { profile, saveProfile } = useStoreProfile()
  const { user } = useAuthSession()
  const toast = useToast()
  const [copied, setCopied] = useState(false)

  if (!profile) return null

  return (
    <div className="p-6 sm:p-8 w-full max-w-4xl mx-auto space-y-6">
      <header className="mb-8">
        <h1 className="font-heading text-3xl font-black text-ink">
          {t(`Business Profile`)}
        </h1>
        <p className="text-ink-soft mt-1">
          {t(`Store identity and ownership details`)}
        </p>
      </header>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Business Identity Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass bg-surface-strong/60 backdrop-blur-2xl rounded-3xl p-6 xl:p-8 border border-line/40 relative overflow-hidden shadow-[0_8px_40px_rgb(0,0,0,0.06)] hover:-translate-y-1 hover:shadow-premium transition-all duration-300 group"
        >
          {/* Background Glow */}
          <div className="absolute -top-20 -right-20 w-40 h-40 bg-accent/10 rounded-full blur-3xl group-hover:bg-accent/20 transition-all duration-500 pointer-events-none"></div>
          
          <div className="flex items-center gap-4 mb-8">
            <div className="size-16 rounded-2xl bg-surface-strong/80 backdrop-blur-md border border-line shadow-sm flex items-center justify-center shrink-0 group-hover:border-accent/40 transition-colors">
              <Store size={28} className="text-accent" />
            </div>
            <div>
              <h2 className="font-heading text-2xl font-bold text-ink leading-tight">
                {profile.storeName}
              </h2>
              <p className="text-sm font-semibold text-accent flex items-center gap-1 mt-0.5">
                <Tag size={12} />
                {profile.category}
              </p>
            </div>
          </div>

          <div className="space-y-4 relative z-10">
            <div className="flex items-start gap-3 bg-surface/80 backdrop-blur-md p-4 rounded-2xl border border-line/40 shadow-sm hover:border-accent/30 transition-colors">
              <MapPin size={20} className="text-ink-soft shrink-0 mt-0.5" />
              <div>
                <p className="text-[10px] uppercase font-black text-ink-soft tracking-wider mb-1">
                  {t(`Location / Area`)}
                </p>
                <p className="text-sm font-bold text-ink leading-snug">
                  {profile.location || (t(`Not provided`))}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3 bg-surface/80 backdrop-blur-md p-4 rounded-2xl border border-line/40 shadow-sm hover:border-success/30 transition-colors">
              <BadgeCheck size={20} className="text-success shrink-0" />
              <div>
                <p className="text-[10px] uppercase font-black text-ink-soft tracking-wider mb-1">
                  {t(`Cooperative Grade`)}
                </p>
                <p className="text-sm font-black text-success">
                  {profile.tier || 'Gold 🌟'}
                </p>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Ownership Details Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="glass bg-surface-strong/60 backdrop-blur-2xl rounded-3xl p-6 xl:p-8 border border-line/40 relative overflow-hidden shadow-[0_8px_40px_rgb(0,0,0,0.06)] hover:-translate-y-1 hover:shadow-premium transition-all duration-300 group"
        >
          {/* Background Glow */}
          <div className="absolute -bottom-20 -right-20 w-40 h-40 bg-focus/10 rounded-full blur-3xl group-hover:bg-focus/20 transition-all duration-500 pointer-events-none"></div>

          <div className="flex items-center gap-3 mb-8 border-b border-line/40 pb-5">
            <div className="p-2.5 rounded-xl bg-focus/10 text-focus group-hover:scale-110 transition-transform">
              <ShieldCheck size={24} />
            </div>
            <h2 className="font-heading text-xl font-black text-ink">
              {t(`Ownership & Verification`)}
            </h2>
          </div>

          <div className="space-y-3 relative z-10">
            <div className="flex items-center justify-between bg-surface/80 backdrop-blur-md p-4 rounded-2xl border border-line/40 shadow-sm hover:border-focus/30 transition-colors">
              <div className="flex items-center gap-2.5 text-ink-soft">
                <User size={16} />
                <span className="text-[10px] font-black uppercase tracking-widest">{t(`Owner Name`)}</span>
              </div>
              <span className="text-sm font-bold text-ink">{profile.ownerName || '-'}</span>
            </div>

            <div className="flex items-center justify-between bg-surface/80 backdrop-blur-md p-4 rounded-2xl border border-line/40 shadow-sm hover:border-focus/30 transition-colors">
              <div className="flex items-center gap-2.5 text-ink-soft">
                <Mail size={16} />
                <span className="text-[10px] font-black uppercase tracking-widest">{t(`Account Email`)}</span>
              </div>
              <span className="text-sm font-bold text-ink">{user?.email || '-'}</span>
            </div>

            <div className="flex items-center justify-between bg-surface/80 backdrop-blur-md p-4 rounded-2xl border border-line/40 shadow-sm hover:border-focus/30 transition-colors">
              <div className="flex items-center gap-2.5 text-ink-soft">
                <FileText size={16} />
                <span className="text-[10px] font-black uppercase tracking-widest">{t(`NID Number`)}</span>
              </div>
              <span className="text-sm font-bold text-ink font-mono">{profile.ownerNid || '-'}</span>
            </div>

            <div className="flex items-center justify-between bg-surface/80 backdrop-blur-md p-4 rounded-2xl border border-line/40 shadow-sm hover:border-focus/30 transition-colors">
              <div className="flex items-center gap-2.5 text-ink-soft">
                <FileText size={16} />
                <span className="text-[10px] font-black uppercase tracking-widest">{t(`Trade License`)}</span>
              </div>
              <span className="text-sm font-bold text-ink font-mono">{profile.tradeLicense || '-'}</span>
            </div>

            <div className="flex items-center justify-between bg-surface/80 backdrop-blur-md p-4 rounded-2xl border border-line/40 shadow-sm hover:border-focus/30 transition-colors">
              <div className="flex items-center gap-2.5 text-ink-soft">
                <FileText size={16} />
                <span className="text-[10px] font-black uppercase tracking-widest">{t(`BIN / TIN`)}</span>
              </div>
              <span className="text-sm font-bold text-ink font-mono">{profile.binTin || '-'}</span>
            </div>
          </div>
        </motion.div>
      </div>

      {/* One-Click Web Store Setup (Feature 37) */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="glass bg-surface-strong/60 backdrop-blur-2xl rounded-3xl p-6 xl:p-8 border border-line/40 relative overflow-hidden shadow-[0_8px_40px_rgb(0,0,0,0.06)] hover:-translate-y-1 hover:shadow-premium transition-all duration-300 group"
      >
        <div className="absolute top-0 right-0 w-64 h-64 bg-accent/5 rounded-full blur-[80px] pointer-events-none -z-10"></div>
        
        <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-line pb-6 mb-6">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-accent/10 text-accent">
              <Globe size={22} />
            </div>
            <div>
              <h2 className="font-heading text-xl font-black text-ink">{t('One-Click Web Store')}</h2>
              <p className="text-xs text-ink-soft font-bold mt-1">{t('Publish a public storefront listing your live catalog.')}</p>
            </div>
          </div>
          
          <button
            onClick={async () => {
              const nextPublished = !profile.webStorePublished;
              const storeUrl = `https://webstore.equipulse-ai.com/store/${user?.uid || 'demo'}`;
              await saveProfile({
                webStorePublished: nextPublished,
                webStoreUrl: storeUrl
              });
              toast(
                nextPublished ? t('Web Store Published') : t('Web Store Unpublished'),
                nextPublished ? t('Your storefront is now live and public.') : t('Your storefront is now offline.'),
                nextPublished ? 'success' : 'info'
              );
            }}
            className={`px-6 py-2.5 rounded-xl text-xs font-black transition-all shadow-sm active:scale-95 ${
              profile.webStorePublished
                ? 'bg-danger text-surface hover:bg-danger/90'
                : 'bg-accent text-surface hover:bg-accent/90'
            }`}
          >
            {profile.webStorePublished ? t('Take Offline') : t('Publish Storefront')}
          </button>
        </header>

        {profile.webStorePublished ? (
          <div className="space-y-4">
            <div className="p-5 rounded-2xl bg-success/5 border border-success/20 shadow-sm flex items-start gap-4">
              <div className="shrink-0 mt-1">
                <Check size={20} className="text-success" />
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="font-bold text-ink">{t('Your Web Store is Live!')}</h4>
                <p className="text-xs text-ink-soft mt-1 leading-relaxed">
                  {t('Customers can browse your live catalog, see product prices, and place Click & Collect orders.')}
                </p>
                
                <div className="mt-4 flex flex-col sm:flex-row items-center gap-3 bg-surface p-3 rounded-xl border border-line/30 w-full">
                  <code className="text-xs text-accent font-mono truncate flex-1 break-all text-left">
                    {profile.webStoreUrl || `https://webstore.equipulse-ai.com/store/${user?.uid || 'demo'}`}
                  </code>
                  <div className="flex gap-2 w-full sm:w-auto shrink-0 justify-end">
                    <button
                      onClick={() => {
                        const url = profile.webStoreUrl || `https://webstore.equipulse-ai.com/store/${user?.uid || 'demo'}`;
                        navigator.clipboard.writeText(url);
                        setCopied(true);
                        toast(t('Copied to Clipboard'), t('Link copied successfully.'), 'success');
                        setTimeout(() => setCopied(false), 2000);
                      }}
                      className="inline-flex h-9 px-3 items-center justify-center rounded-xl bg-surface-strong border border-line hover:border-accent/40 text-ink hover:text-accent font-bold text-xs transition-all"
                    >
                      {copied ? <Check size={14} className="mr-1 text-success" /> : <Copy size={14} className="mr-1" />}
                      {copied ? t('Copied') : t('Copy Link')}
                    </button>
                    <button
                      onClick={() => {
                        const url = profile.webStoreUrl || `https://webstore.equipulse-ai.com/store/${user?.uid || 'demo'}`;
                        window.open(url, '_blank');
                      }}
                      className="inline-flex h-9 px-3 items-center justify-center rounded-xl bg-accent text-surface hover:bg-accent/90 font-bold text-xs transition-all shadow-sm"
                    >
                      <Share2 size={14} className="mr-1" />
                      {t('Visit Store')}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <p className="text-xs text-ink-soft italic text-center py-4">
            {t('Your web store is currently offline. Click "Publish Storefront" above to take your shop online.')}
          </p>
        )}
      </motion.div>
    </div>
  )
}
