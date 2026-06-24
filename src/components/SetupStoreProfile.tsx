import { useState } from 'react'
import { motion } from 'framer-motion'
import { Store, User, MapPin, Tag, Sparkles } from 'lucide-react'
import { useStoreProfile } from '../hooks/useStoreProfile'
import { useI18n, type TranslationKey } from '../i18n'
import { BrandMark } from './BrandLogo'

const categories = [
  { id: 'grocery', en: 'Grocery & General Store', bn: 'মুদি ও জেনারেল স্টোর' },
  { id: 'pharmacy', en: 'Pharmacy & Medicine', bn: 'ফার্মেসি ও ঔষধ' },
  { id: 'electronics', en: 'Electronics & Gadgets', bn: 'ইলেকট্রনিক্স' },
  { id: 'hardware', en: 'Hardware & Tools', bn: 'হার্ডওয়্যার' },
  { id: 'fashion', en: 'Fashion & Garments', bn: 'পোশাক ও ফ্যাশন' },
  { id: 'others', en: 'Others', bn: 'অন্যান্য' },
]

export function SetupStoreProfile() {
  const { t } = useI18n()
  const { saveProfile } = useStoreProfile()
  
  const [storeName, setStoreName] = useState('')
  const [ownerName, setOwnerName] = useState('')
  const [category, setCategory] = useState(categories[0]?.en || '')
  const [location, setLocation] = useState('')
  const [ownerNid, setOwnerNid] = useState('')
  const [tradeLicense, setTradeLicense] = useState('')
  const [binTin, setBinTin] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Goal Gradient Effect: User starts at 20% completion just by creating an account.
  // This psychological hack increases the likelihood of completing the form by 30%.
  const baseProgress = 20; 
  const requiredFields = [storeName, category];
  const optionalFields = [ownerName, location, ownerNid, tradeLicense, binTin];
  
  const filledRequired = requiredFields.filter(Boolean).length;
  const filledOptional = optionalFields.filter(Boolean).length;
  
  // Calculate remaining 80% based on fields
  const totalWeight = requiredFields.length + (optionalFields.length * 0.5);
  const earnedWeight = filledRequired + (filledOptional * 0.5);
  const dynamicProgress = Math.round((earnedWeight / totalWeight) * 80);
  
  const progressPercent = Math.min(100, baseProgress + dynamicProgress);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!storeName || !category) return

    setIsSubmitting(true)
    try {
      await saveProfile({
        storeName,
        ownerName,
        category,
        location,
        tradeLicense,
        binTin,
        ownerNid,
        tier: 'Free',
      })
      // The parent App.tsx will automatically re-render and hide this component because `profile` will no longer be null.
    } catch (error: unknown) {
      console.error('Failed to save profile:', error)
      setIsSubmitting(false)
    }
  }

  return (
    <main className="min-h-screen bg-muted/30 font-sans text-ink flex items-center justify-center p-6 relative overflow-hidden">
      {/* Decorative background blurs */}
      <div className="absolute top-0 left-1/4 h-96 w-96 -translate-x-1/2 -translate-y-1/2 rounded-full bg-accent/20 blur-3xl"></div>
      <div className="absolute bottom-0 right-1/4 h-96 w-96 translate-x-1/2 translate-y-1/2 rounded-full bg-success/20 blur-3xl"></div>

      <motion.div
        initial={{ opacity: 0, y: 30, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        className="glass relative z-10 w-full max-w-xl rounded-3xl p-8 sm:p-10 shadow-glass border border-line/50"
      >
        <div className="text-center mb-8">
          <div className="mx-auto mb-5 grid size-16 place-items-center rounded-2xl bg-accent/10 shadow-sm border border-accent/20 text-accent">
            <BrandMark className="size-8" />
          </div>
          <h1 className="font-heading text-3xl font-black tracking-tight text-ink mb-2">
            {t(`Setup Your Business`)}
          </h1>
          <p className="text-sm text-ink-soft">
            {t(`Add your store details to get started with SME Pulse analytics.`)}
          </p>
        </div>

        {/* Zeigarnik Effect Progress Bar */}
        <div className="mb-8">
          <div className="flex justify-between text-xs font-bold mb-2">
            <span className="text-ink-soft">{t(`Profile Completion`)}</span>
            <span className="text-accent">{progressPercent}%</span>
          </div>
          <div className="h-2 w-full bg-surface-strong/50 rounded-full overflow-hidden border border-line/30">
            <motion.div 
              className="h-full bg-gradient-to-r from-accent to-sundarban"
              initial={{ width: 0 }}
              animate={{ width: `${progressPercent}%` }}
              transition={{ duration: 0.5, ease: "easeOut" }}
            />
          </div>
          {progressPercent < 100 && (
           <div className="mt-4 p-3 bg-warning/10 border border-warning/30 rounded-xl flex items-start gap-3 animate-pulse-soft shadow-sm ring-1 ring-warning/20">
             <div className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-warning/20 text-warning-strong">
               <span className="text-[10px] font-black">!</span>
             </div>
             <div>
               <p className="text-sm font-bold text-warning-strong">
                 {t(`Action Required: Incomplete Profile`)}
               </p>
               <p className="text-xs text-ink-soft mt-0.5">
                 {t(`You are already ${progressPercent}% done! Complete the final ${100 - progressPercent}% to unlock 3x more accurate AI predictions and clear this alert.`)}
               </p>
             </div>
           </div>
          )}
        </div>

        <form onSubmit={handleSubmit} className="grid gap-5">
          <div className="grid gap-2">
            <label className="text-xs font-black uppercase tracking-wider text-ink-soft ml-1">
              {t(`Store Name`)} <span className="text-danger">*</span>
            </label>
            <div className="relative">
              <Store className="absolute left-4 top-3.5 text-ink-soft/70" size={18} />
              <input
                required
                type="text"
                value={storeName}
                onChange={(e) => setStoreName(e.target.value)}
                placeholder={t(`e.g. Mayer Doa Store`)}
                className="w-full rounded-xl border border-line/50 bg-surface-strong/40 py-3.5 pl-11 pr-4 text-sm font-bold text-ink outline-none transition-all focus:border-accent focus:bg-surface focus:ring-2 focus:ring-accent/20 shadow-sm"
              />
            </div>
          </div>

          <div className="grid sm:grid-cols-2 gap-5">
            <div className="grid gap-2">
              <label className="text-xs font-black uppercase tracking-wider text-ink-soft ml-1">
                {t(`Business Type`)} <span className="text-danger">*</span>
              </label>
              <div className="relative">
                <Tag className="absolute left-4 top-3.5 text-ink-soft/70" size={18} />
                <select
                  required
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full appearance-none rounded-xl border border-line/50 bg-surface-strong/40 py-3.5 pl-11 pr-4 text-sm font-bold text-ink outline-none transition-all focus:border-accent focus:bg-surface focus:ring-2 focus:ring-accent/20 shadow-sm"
                >
                  {categories.map(cat => (
                    <option key={cat.id} value={cat.en}>{t(cat.en as TranslationKey)}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid gap-2">
              <label className="text-xs font-black uppercase tracking-wider text-ink-soft ml-1">
                {t(`Location (Optional)`)}
              </label>
              <div className="relative">
                <MapPin className="absolute left-4 top-3.5 text-ink-soft/70" size={18} />
                <input
                  type="text"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder={t(`e.g. Mirpur, Dhaka`)}
                  className="w-full rounded-xl border border-line/50 bg-surface-strong/40 py-3.5 pl-11 pr-4 text-sm font-bold text-ink outline-none transition-all focus:border-accent focus:bg-surface focus:ring-2 focus:ring-accent/20 shadow-sm"
                />
              </div>
            </div>
          </div>

          <div className="grid sm:grid-cols-2 gap-5">
            <div className="grid gap-2">
              <label className="text-xs font-black uppercase tracking-wider text-ink-soft ml-1">
                {t(`Owner Name (Optional)`)}
              </label>
              <div className="relative">
                <User className="absolute left-4 top-3.5 text-ink-soft/70" size={18} />
                <input
                  type="text"
                  value={ownerName}
                  onChange={(e) => setOwnerName(e.target.value)}
                  placeholder={t(`Enter your name`)}
                  className="w-full rounded-xl border border-line/50 bg-surface-strong/40 py-3.5 pl-11 pr-4 text-sm font-bold text-ink outline-none transition-all focus:border-accent focus:bg-surface focus:ring-2 focus:ring-accent/20 shadow-sm"
                />
              </div>
            </div>

            <div className="grid gap-2">
              <label className="text-xs font-black uppercase tracking-wider text-ink-soft ml-1">
                {t(`Owner NID (Optional)`)}
              </label>
              <div className="relative">
                <User className="absolute left-4 top-3.5 text-ink-soft/70" size={18} />
                <input
                  type="text"
                  value={ownerNid}
                  onChange={(e) => setOwnerNid(e.target.value)}
                  placeholder={t(`Enter NID number`)}
                  className="w-full rounded-xl border border-line/50 bg-surface-strong/40 py-3.5 pl-11 pr-4 text-sm font-bold text-ink outline-none transition-all focus:border-accent focus:bg-surface focus:ring-2 focus:ring-accent/20 shadow-sm"
                />
              </div>
            </div>
          </div>

          <div className="grid sm:grid-cols-2 gap-5">
            <div className="grid gap-2">
              <label className="text-xs font-black uppercase tracking-wider text-ink-soft ml-1">
                {t(`Trade License No. (Optional)`)}
              </label>
              <div className="relative">
                <Tag className="absolute left-4 top-3.5 text-ink-soft/70" size={18} />
                <input
                  type="text"
                  value={tradeLicense}
                  onChange={(e) => setTradeLicense(e.target.value)}
                  placeholder={t(`License number`)}
                  className="w-full rounded-xl border border-line/50 bg-surface-strong/40 py-3.5 pl-11 pr-4 text-sm font-bold text-ink outline-none transition-all focus:border-accent focus:bg-surface focus:ring-2 focus:ring-accent/20 shadow-sm"
                />
              </div>
            </div>

            <div className="grid gap-2">
              <label className="text-xs font-black uppercase tracking-wider text-ink-soft ml-1">
                {t(`BIN/TIN No. (Optional)`)}
              </label>
              <div className="relative">
                <Tag className="absolute left-4 top-3.5 text-ink-soft/70" size={18} />
                <input
                  type="text"
                  value={binTin}
                  onChange={(e) => setBinTin(e.target.value)}
                  placeholder={t(`BIN/TIN number`)}
                  className="w-full rounded-xl border border-line/50 bg-surface-strong/40 py-3.5 pl-11 pr-4 text-sm font-bold text-ink outline-none transition-all focus:border-accent focus:bg-surface focus:ring-2 focus:ring-accent/20 shadow-sm"
                />
              </div>
            </div>
          </div>

          <button
            type="submit"
            disabled={isSubmitting || !storeName}
            className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-accent px-6 py-4 text-sm font-black text-surface shadow-glow transition-all hover:scale-[1.01] hover:bg-accent/90 focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2 focus:ring-offset-surface disabled:opacity-60 disabled:hover:scale-100 disabled:cursor-not-allowed"
          >
            {isSubmitting ? (
              <span className="flex items-center gap-2">
                <Sparkles className="animate-spin" size={18} />
                {t(`Creating Profile...`)}
              </span>
            ) : (
              <span className="flex items-center gap-2">
                <Sparkles size={18} />
                {t(`Complete Setup`)}
              </span>
            )}
          </button>
        </form>
      </motion.div>
    </main>
  )
}
