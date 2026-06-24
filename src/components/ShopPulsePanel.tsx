import { motion } from 'framer-motion'
import {
  ArrowRight,
  ClipboardList,
  PackageCheck,
  PackageSearch,
  ReceiptText,
  UploadCloud,
  WalletCards,
  WifiOff,
  Sparkles,
  type LucideIcon,
} from 'lucide-react'
import { Link } from 'react-router-dom'
import { type MerchantPulse, type MerchantPulseAction, type PulseTone } from '../hooks/useMerchantPulse'
import { useI18n } from '../i18n'

type PulseMetricCard = {
  icon: LucideIcon
  label: string
  value: string
  detail: string
  tone: PulseTone
}

const toneClasses: Record<
  PulseTone,
  {
    border: string
    icon: string
    text: string
    surface: string
  }
> = {
  accent: {
    border: 'border-accent/30',
    icon: 'bg-accent/10 text-accent',
    text: 'text-accent',
    surface: 'bg-accent/5',
  },
  danger: {
    border: 'border-danger/30',
    icon: 'bg-danger/10 text-danger',
    text: 'text-danger',
    surface: 'bg-danger/5',
  },
  focus: {
    border: 'border-focus/30',
    icon: 'bg-focus/10 text-focus',
    text: 'text-focus',
    surface: 'bg-focus/5',
  },
  success: {
    border: 'border-success/30',
    icon: 'bg-success/10 text-success',
    text: 'text-success',
    surface: 'bg-success/5',
  },
  warning: {
    border: 'border-warning/30',
    icon: 'bg-warning/10 text-warning',
    text: 'text-warning',
    surface: 'bg-warning/5',
  },
}

function formatTaka(value: number, tNum: (num: string | number) => string) {
  return `৳${tNum(Math.round(value).toLocaleString())}`
}

function getActionIcon(action: MerchantPulseAction): LucideIcon {
  if (action.id.startsWith('stock')) return PackageSearch
  if (action.id.startsWith('credit') || action.id.startsWith('cash')) return WalletCards
  if (action.id.startsWith('upload')) return UploadCloud
  if (action.id.startsWith('offline')) return WifiOff
  return ClipboardList
}

export function ShopPulsePanel({ pulse }: { pulse: MerchantPulse }) {
  const { t, tNum, locale } = useI18n()
  const metrics: PulseMetricCard[] = [
    {
      icon: PackageCheck,
      label: t(`Stock Value`),
      value: formatTaka(pulse.totalStockValue, tNum),
      detail: t(`${tNum(pulse.lowStockItems.length)} stock alerts`),
      tone: pulse.lowStockItems.length > 0 ? 'warning' : 'success',
    },
    {
      icon: WalletCards,
      label: t(`Pending Baki`),
      value: formatTaka(pulse.totalOutstanding, tNum),
      detail: t(`${tNum(pulse.overdueCredits.length)} overdue accounts`),
      tone: pulse.overdueCredits.length > 0 ? 'danger' : 'accent',
    },
    {
      icon: ReceiptText,
      label: t(`Today Expense`),
      value: formatTaka(pulse.todayExpenseTotal, tNum),
      detail: t(`${formatTaka(pulse.weeklyExpenseTotal, tNum)} in 7 days`),
      tone: pulse.weeklyExpenseTotal > 0 ? 'focus' : 'success',
    },
  ]

  return (
    <section className="mb-8 overflow-hidden rounded-2xl border border-line/50 bg-surface/75 p-5 shadow-premium backdrop-blur-xl sm:p-6">
      <div className="flex flex-col gap-3 border-b border-line/50 pb-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-[10px] font-black uppercase tracking-widest text-accent">
            {t(`Today’s Shop Pulse`)}
          </p>
          <h2 className="mt-1 font-heading text-2xl font-extrabold tracking-tight text-ink">
            {t(`What needs attention now`)}
          </h2>
          <p className="mt-1 max-w-2xl text-sm leading-relaxed text-ink-soft">
            {t(`Plain-language actions generated from live inventory, khata, expenses, and local POS data.`)}
          </p>
        </div>
        <span
          className={`inline-flex w-fit items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-black ${
            pulse.isOnline
              ? 'border-success/30 bg-success/10 text-success'
              : 'border-warning/30 bg-warning/10 text-warning'
          }`}
        >
          {pulse.isOnline ? null : <WifiOff aria-hidden="true" size={14} />}
          {pulse.isOnline
            ? t(`Online sync ready`)
            : t(`Saving offline`)}
        </span>
        
        <Link
          to="/queue"
          className="ml-auto inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-accent to-indigo-500 px-4 py-2 text-xs font-black text-white shadow-premium transition-transform hover:scale-[1.02]"
        >
          <Sparkles size={14} />
          {t(`AI Swipe Queue`)}
        </Link>
      </div>

      <div className="mt-5 grid gap-4 lg:grid-cols-[0.95fr_1.35fr]">
        <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-1">
          {metrics.map((metric, index) => {
            const Icon = metric.icon
            const tone = toneClasses[metric.tone]

            return (
              <motion.article
                animate={{ opacity: 1, y: 0 }}
                className={`rounded-xl border ${tone.border} ${tone.surface} p-4 shadow-sm`}
                initial={{ opacity: 0, y: 12 }}
                key={metric.label}
                transition={{ delay: index * 0.06, duration: 0.26 }}
              >
                <div className="flex items-center gap-3">
                  <span className={`grid size-10 shrink-0 place-items-center rounded-lg ${tone.icon}`}>
                    <Icon aria-hidden="true" size={18} />
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-[10px] font-black uppercase tracking-wider text-ink-soft">
                      {metric.label}
                    </p>
                    <p className={`mt-1 font-heading text-2xl font-black leading-none ${tone.text}`}>
                      {metric.value}
                    </p>
                  </div>
                </div>
                <p className="mt-3 text-xs font-semibold leading-relaxed text-ink-soft">{metric.detail}</p>
              </motion.article>
            )
          })}
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          {pulse.actions.map((action, index) => {
            const Icon = getActionIcon(action)
            const tone = toneClasses[action.tone]

            return (
              <motion.article
                animate={{ opacity: 1, y: 0 }}
                className={`flex min-h-[180px] flex-col justify-between rounded-xl border ${tone.border} bg-surface-strong/70 p-4 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-glass`}
                initial={{ opacity: 0, y: 12 }}
                key={action.id}
                transition={{ delay: 0.12 + index * 0.06, duration: 0.28 }}
              >
                <div>
                  <div className="flex items-start justify-between gap-3">
                    <span className={`grid size-10 shrink-0 place-items-center rounded-lg ${tone.icon}`}>
                      <Icon aria-hidden="true" size={18} />
                    </span>
                    <span className={`rounded-full px-2.5 py-1 text-[10px] font-black ${tone.surface} ${tone.text}`}>
                      {tNum(action.metric[(locale === 'bn' ? 'bn' : 'en')])}
                    </span>
                  </div>
                  <h3 className="mt-4 font-heading text-base font-extrabold leading-tight text-ink">
                    {tNum(action.title[(locale === 'bn' ? 'bn' : 'en')])}
                  </h3>
                  <p className="mt-2 text-xs leading-relaxed text-ink-soft">
                    {tNum(action.body[(locale === 'bn' ? 'bn' : 'en')])}
                  </p>
                </div>
                <Link
                  className={`mt-4 inline-flex w-fit items-center gap-2 rounded-full border px-3.5 py-2 text-xs font-black transition-all hover:scale-[1.02] ${tone.border} ${tone.text} ${tone.surface}`}
                  to={action.route}
                >
                  {action.cta[(locale === 'bn' ? 'bn' : 'en')]}
                  <ArrowRight aria-hidden="true" size={14} />
                </Link>
              </motion.article>
            )
          })}
        </div>
      </div>
    </section>
  )
}
