import { useState, useRef, useEffect } from 'react'
import { useI18n, type Locale } from '../i18n'
import { Globe, ChevronDown, Check } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

const LANGUAGES: { code: Locale; name: string; flag: string }[] = [
  { code: 'en', name: 'English', flag: '🇺🇸' },
  { code: 'bn', name: 'বাংলা', flag: '🇧🇩' },
  { code: 'zh', name: '中文', flag: '🇨🇳' },
  { code: 'hi', name: 'हिन्दी', flag: '🇮🇳' },
  { code: 'es', name: 'Español', flag: '🇪🇸' },
  { code: 'fr', name: 'Français', flag: '🇫🇷' },
  { code: 'ar', name: 'العربية', flag: '🇸🇦' },
  { code: 'ru', name: 'Русский', flag: '🇷🇺' },
  { code: 'pt', name: 'Português', flag: '🇵🇹' },
  { code: 'id', name: 'Bahasa Indonesia', flag: '🇮🇩' },
  { code: 'ur', name: 'اردو', flag: '🇵🇰' },
  { code: 'de', name: 'Deutsch', flag: '🇩🇪' },
  { code: 'ja', name: '日本語', flag: '🇯🇵' },
  { code: 'sw', name: 'Kiswahili', flag: '🇰🇪' },
  { code: 'tr', name: 'Türkçe', flag: '🇹🇷' }
]

export function LanguageSelector({ className = '' }: { className?: string }) {
  const { locale, setLocale } = useI18n()
  const [isOpen, setIsOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  const currentLang = LANGUAGES.find((l) => l.code === locale) || LANGUAGES[0]

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center justify-between gap-2 bg-surface/85 backdrop-blur-md border border-line/60 hover:border-accent/40 rounded-xl px-3 py-2 text-xs font-black text-ink shadow-sm hover:shadow-glow hover:bg-muted/30 transition-all duration-300 outline-none w-full select-none active:scale-[0.98]"
      >
        <div className="flex items-center gap-1.5 min-w-0">
          <Globe className="w-3.5 h-3.5 text-accent shrink-0" />
          <span className="text-sm leading-none shrink-0">{currentLang?.flag}</span>
          <span className="truncate">{currentLang?.name}</span>
        </div>
        <ChevronDown className={`w-3 h-3 text-ink-soft shrink-0 transition-transform duration-300 ${isOpen ? 'rotate-180 text-accent' : ''}`} />
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95, y: -10 }}
            transition={{ duration: 0.15, ease: 'easeOut' }}
            className="absolute top-full mt-1.5 right-0 z-[100] w-52 max-h-64 overflow-y-auto rounded-2xl border border-line/60 bg-surface/95 backdrop-blur-3xl p-1.5 shadow-2xl flex flex-col gap-0.5"
            style={{ originY: 'top' }}
          >
            {LANGUAGES.map((lang) => {
              const isActive = lang.code === locale
              return (
                <button
                  key={lang.code}
                  type="button"
                  onClick={() => {
                    setLocale(lang.code)
                    setIsOpen(false)
                  }}
                  className={`flex items-center justify-between gap-2 rounded-lg px-2.5 py-1.5 text-left text-xs transition-all duration-200 select-none ${
                    isActive
                      ? 'bg-accent/15 text-accent font-black'
                      : 'text-ink-soft hover:bg-accent/5 hover:text-ink font-semibold'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className="text-sm leading-none">{lang.flag}</span>
                    <span>{lang.name}</span>
                  </div>
                  {isActive && <Check className="w-3.5 h-3.5 text-accent shrink-0" />}
                </button>
              )
            })}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
