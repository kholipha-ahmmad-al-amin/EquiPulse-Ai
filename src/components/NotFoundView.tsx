import { Link } from 'react-router-dom'
import { FileQuestion, Home, HelpCircle } from 'lucide-react'
import { useI18n } from '../i18n'
import { motion } from 'framer-motion'

export function NotFoundView() {
  const { t } = useI18n()

  return (
    <div className="flex min-h-[70vh] items-center justify-center p-4">
      <motion.section 
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
        className="glass w-full max-w-lg rounded-2xl p-8 border border-line/40 text-center shadow-glass backdrop-blur-md flex flex-col items-center"
      >
        <div className="relative mb-6">
          <div className="absolute inset-0 rounded-full bg-warning/10 animate-ping"></div>
          <span className="grid size-16 place-items-center rounded-full bg-warning/15 text-warning relative z-10 border border-warning/20">
            <FileQuestion aria-hidden="true" size={32} />
          </span>
        </div>

        <h1 className="font-heading text-4xl font-black tracking-tight sm:text-5xl">
          {t(`404`)}
        </h1>
        <h2 className="mt-3 font-heading text-xl font-extrabold text-ink">
          {t(`Page Not Found`)}
        </h2>
        <p className="mt-3 text-sm leading-relaxed text-ink-soft max-w-sm">
          {t("Sorry, the page you are looking for does not exist or has been moved to a new destination.")}
        </p>

        <div className="mt-8 flex flex-col sm:flex-row gap-3 w-full justify-center">
          <Link
            to="/home"
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-accent px-5 py-3 text-sm font-extrabold text-surface shadow-glow transition-all hover:scale-[1.02] hover:bg-accent/90 focus:outline-none"
          >
            <Home size={16} />
            {t(`Back to Home`)}
          </Link>
          <Link
            to="/faq"
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-line bg-surface-strong px-5 py-3 text-sm font-extrabold text-ink transition-all hover:bg-muted focus:outline-none"
          >
            <HelpCircle size={16} className="text-accent" />
            {t(`View FAQs`)}
          </Link>
        </div>
      </motion.section>
    </div>
  )
}
