import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import confetti from 'canvas-confetti'
import { 
  UserPlus, 
  MessageSquare, 
  Trash2, 
  Banknote, 
  Clock, 
  Users, 
  Trophy,
  ShieldCheck
} from 'lucide-react'
import { useI18n } from '../i18n'
import { useCustomerLedger, type CustomerCredit } from '../hooks/useCustomerLedger'
import { DatePicker } from './ui/DatePicker'
import { useStoreProfile } from '../hooks/useStoreProfile'
import { useStoreSettings } from '../hooks/useStoreSettings'
import { useLeaderboard } from '../hooks/useLeaderboard'
import { useToast } from './ToastProvider'

export function LeaderboardView() {
  const { t, tNum, locale } = useI18n()
  const toast = useToast()

  // Firestore hooks
  const { credits, addCredit, recordPayment, queueCreditReminder, removeCredit } = useCustomerLedger()
  const { profile } = useStoreProfile()
  const [{ currencySymbol }] = useStoreSettings()
  const { entries: topMerchants } = useLeaderboard(4)

  // Bakir Khata State
  const [name, setName] = useState('')
  const [mobile, setMobile] = useState('')
  const [amount, setAmount] = useState('')
  const [dueDate, setDueDate] = useState('')
  const [showAddForm, setShowAddForm] = useState(false)
  const [smsStatus, setSmsStatus] = useState<string | null>(null)
  const [paymentModalCredit, setPaymentModalCredit] = useState<CustomerCredit | null>(null)
  const [paymentAmount, setPaymentAmount] = useState('')

  const handleRecordPayment = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!paymentModalCredit || !paymentAmount) return
    
    const amt = parseFloat(paymentAmount)
    if (amt > 0) {
      try {
        await recordPayment(paymentModalCredit.id, amt, 'cash', 'Partial Payment')
        toast(
          t(`Payment Recorded`),
          t(`Credit ledger updated successfully.`),
          'success'
        )
      } catch (error) {
        console.error(error)
        toast('Error', 'Failed to record payment', 'error')
      }
    }
    setPaymentModalCredit(null)
    setPaymentAmount('')
  }

  const handleAddCredit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name || !amount) return

    await addCredit({
      id: Date.now().toString(),
      name,
      mobile: mobile || 'N/A',
      amount: parseFloat(amount) || 0,
      dueDate: dueDate || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
      status: 'pending',
    })

    setName('')
    setMobile('')
    setAmount('')
    setDueDate('')
    setShowAddForm(false)
  }

  const handleDeleteCredit = async (id: string) => {
    await removeCredit(id)
  }

  const handleSendSms = async (customer: CustomerCredit) => {
    setSmsStatus(customer.id)
    try {
      await queueCreditReminder(customer, locale)
      
      // Native SMS Intent
      const message = t(`Dear ${customer.name}, your due amount is ${currencySymbol}${customer.amount}. Please pay soon. - ${profile?.storeName || 'SME Pulse'}`)
      
      const smsUrl = `sms:${customer.mobile}?body=${encodeURIComponent(message)}`
      const a = document.createElement('a')
      a.href = smsUrl
      a.click()

      toast(
        t(`Reminder sending`),
        t(`Opening SMS app for ${customer.name}.`),
        'success',
      )
    } catch (error) {
      console.error(error)
      toast(
        t(`Reminder was not queued`),
        error instanceof Error ? error.message : undefined,
        'error',
      )
    } finally {
      setSmsStatus(null)
    }
  }

  const totalOutstanding = credits
    .filter((c: CustomerCredit) => c.status !== 'paid')
    .reduce((sum: number, c: CustomerCredit) => sum + c.amount, 0)

  const myPoints = profile?.participationPoints || 0
  const nextTierGoal = 3000
  const distToNextTier = Math.max(0, nextTierGoal - myPoints)
  const fillPercentage = Math.min(100, Math.round((myPoints / nextTierGoal) * 100))

  useEffect(() => {
    if (myPoints > 1000) {
      const timer = setTimeout(() => {
        confetti({
          particleCount: 100,
          spread: 70,
          origin: { y: 0.6 }
        })
      }, 500)
      return () => clearTimeout(timer)
    }
  }, [myPoints])

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_350px] xl:grid-cols-[1fr_400px]">
      
      {/* Tab Left: Bakir Khata Digital Ledger */}
      <section className="glass bg-surface-strong/60 backdrop-blur-2xl rounded-3xl p-6 xl:p-8 shadow-[0_8px_40px_rgb(0,0,0,0.08)] border border-line/40 flex flex-col justify-between h-full relative overflow-hidden">
        <div className="absolute -top-32 -left-32 w-64 h-64 bg-accent/5 rounded-full blur-[80px] pointer-events-none -z-10"></div>
        <div className="relative z-10">
          <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-line pb-6">
            <div>
              <h3 className="font-heading text-xl font-extrabold tracking-tight">
                {t(`Digital Credit Ledger`)}
              </h3>
              <p className="mt-1 text-sm text-ink-soft">
                {t(`Track outstanding store credits and dispatch automated reminder logs.`)}
              </p>
            </div>
            
            <button
              onClick={() => setShowAddForm(!showAddForm)}
              className="inline-flex items-center gap-2 rounded-xl bg-accent px-4 py-2.5 text-xs font-black text-surface shadow-glow transition-all hover:scale-[1.02]"
            >
              <UserPlus size={14} />
              {t(`Add New Customer`)}
            </button>
          </header>

          {/* Add Customer Credit Form */}
          <AnimatePresence>
            {showAddForm && (
              <motion.form
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                onSubmit={handleAddCredit}
                className="mt-6 rounded-2xl bg-surface-strong/60 border border-line p-5 grid gap-4 sm:grid-cols-2"
              >
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-black text-ink-soft">{t(`Customer Name`)}</label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder={t(`e.g. Rafique Brother`)}
                    className="rounded-xl border border-line bg-surface px-4 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-accent"
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-black text-ink-soft">{t(`Mobile Number`)}</label>
                  <input
                    type="tel"
                    value={mobile}
                    onChange={(e) => setMobile(e.target.value)}
                    placeholder={t(`e.g. 017xxxxxxxx`)}
                    className="rounded-xl border border-line bg-surface px-4 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-accent"
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-black text-ink-soft">{t(`Credit Amount (${currencySymbol})`)}</label>
                  <input
                    type="number"
                    required
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder={t(`e.g. 1500`)}
                    className="rounded-xl border border-line bg-surface px-4 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-accent"
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <DatePicker 
                    label={t(`Payment Due Date`)}
                    value={dueDate ? { 
                      year: dueDate.split('-')[0] || '', 
                      month: dueDate.split('-')[1] || '', 
                      day: dueDate.split('-')[2] || '', 
                      iso: dueDate 
                    } : null}
                    onChange={(val) => setDueDate(val?.iso || '')}
                  />
                </div>
                <div className="sm:col-span-2 flex justify-end gap-2 mt-2">
                  <button
                    type="button"
                    onClick={() => setShowAddForm(false)}
                    className="rounded-xl border border-line bg-surface px-4 py-2 text-xs font-bold text-ink hover:bg-muted"
                  >
                    {t(`Cancel`)}
                  </button>
                  <button
                    type="submit"
                    className="rounded-xl bg-accent px-5 py-2 text-xs font-black text-surface shadow-glow"
                  >
                    {t(`Save Credit`)}
                  </button>
                </div>
              </motion.form>
            )}
          </AnimatePresence>

          {/* Credits Quick Stats */}
          <section className="grid gap-4 grid-cols-1 min-[480px]:grid-cols-3 mt-6">
            <article className="rounded-2xl border border-line/60 bg-surface/80 backdrop-blur-md p-5 flex flex-col sm:flex-row items-center sm:items-start gap-4 shadow-sm hover:shadow-[0_8px_30px_rgb(0,0,0,0.06)] hover:-translate-y-1 transition-all duration-300 text-center sm:text-left">
              <span className="grid size-12 place-items-center rounded-xl bg-accent/15 text-accent shrink-0 shadow-inner">
                <Banknote size={20} />
              </span>
              <div>
                <p className="text-[10px] font-black uppercase text-ink-soft tracking-wider leading-none mb-1.5">{t(`Total Credits`)}</p>
                <p className="text-2xl font-heading font-black text-accent leading-none">{currencySymbol}{tNum(totalOutstanding.toLocaleString('en-US'))}</p>
              </div>
            </article>
            <article className="rounded-2xl border border-line/60 bg-surface/80 backdrop-blur-md p-5 flex flex-col sm:flex-row items-center sm:items-start gap-4 shadow-sm hover:shadow-[0_8px_30px_rgb(0,0,0,0.06)] hover:-translate-y-1 transition-all duration-300 text-center sm:text-left">
              <span className="grid size-12 place-items-center rounded-xl bg-success/15 text-success shrink-0 shadow-inner">
                <Users size={20} />
              </span>
              <div>
                <p className="text-[10px] font-black uppercase text-ink-soft tracking-wider leading-none mb-1.5">{t(`Active Ledger`)}</p>
                <p className="text-2xl font-heading font-black text-success leading-none">{tNum(credits.length)} <span className="text-xs">{t(`accounts`)}</span></p>
              </div>
            </article>
            <article className="rounded-2xl border border-line/60 bg-surface/80 backdrop-blur-md p-5 flex flex-col sm:flex-row items-center sm:items-start gap-4 shadow-sm hover:shadow-[0_8px_30px_rgb(0,0,0,0.06)] hover:-translate-y-1 transition-all duration-300 text-center sm:text-left">
              <span className="grid size-12 place-items-center rounded-xl bg-warning/15 text-warning shrink-0 shadow-inner">
                <Clock size={20} />
              </span>
              <div>
                <p className="text-[10px] font-black uppercase text-ink-soft tracking-wider leading-none mb-1.5">{t(`Reminders Sent`)}</p>
                <p className="text-2xl font-heading font-black text-warning leading-none">{tNum('14')} <span className="text-xs">{t(`times`)}</span></p>
              </div>
            </article>
          </section>

          {/* Ledger Table List */}
          <div className="mt-8 space-y-3">
            {credits.length === 0 ? (
              <div className="py-16 text-center rounded-xl border border-dashed border-line/80 bg-surface/50">
                <div className="flex flex-col items-center justify-center space-y-3">
                  <div className="flex size-16 items-center justify-center rounded-2xl bg-accent/10 text-accent">
                    <UserPlus size={32} />
                  </div>
                  <div>
                    <h3 className="font-heading text-lg font-bold text-ink">{t(`Ledger is Empty`)}</h3>
                    <p className="text-sm text-ink-soft mt-1 max-w-sm mx-auto">{t(`Click "Add New Customer" above to start tracking credit ledgers.`)}</p>
                  </div>
                </div>
              </div>
            ) : (
              credits.map((credit: CustomerCredit) => (
              <article
                key={credit.id}
                className="group flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 rounded-2xl border border-line/40 bg-surface/80 backdrop-blur-md p-5 shadow-[0_4px_20px_rgb(0,0,0,0.03)] transition-all duration-300 hover:-translate-y-1 hover:shadow-premium hover:border-accent/40"
              >
                <div className="flex items-center gap-4">
                  <div className="size-12 rounded-xl bg-surface-strong flex items-center justify-center font-heading text-xl font-black text-ink shrink-0 border border-line/50 group-hover:bg-accent/10 group-hover:text-accent group-hover:border-accent/30 transition-colors">
                    {credit.name.substring(0, 1)}
                  </div>
                  <div>
                    <h4 className="font-heading text-sm sm:text-base font-extrabold text-ink leading-tight">{credit.name}</h4>
                    <p className="text-xs text-ink-soft mt-1 leading-none">📱 {tNum(credit.mobile)} | 📅 {t(`Due:`)} {tNum(credit.dueDate)}</p>
                  </div>
                </div>

                <div className="flex items-center justify-between sm:justify-end gap-4">
                  <div className="text-left sm:text-right">
                    <p className="font-heading text-lg font-black text-accent leading-none">{currencySymbol}{tNum(credit.amount.toLocaleString('en-US'))}</p>
                    <span className={`inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[9px] font-black uppercase tracking-wider mt-1 leading-none ${credit.status === 'paid' ? 'bg-success/10 text-success' : credit.status === 'partial' ? 'bg-warning/10 text-warning' : 'bg-accent/10 text-accent'}`}>
                      {t(`credit.status`)}
                    </span>
                    {(credit.paidAmount || 0) > 0 && (
                      <p className="text-[10px] text-ink-soft mt-1">
                        Paid: {currencySymbol}{tNum(credit.paidAmount?.toLocaleString('en-US') || '0')} / {currencySymbol}{tNum(credit.originalAmount?.toLocaleString('en-US') || '0')}
                      </p>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    {credit.status !== 'paid' && (
                      <button
                        onClick={() => setPaymentModalCredit(credit)}
                        className="inline-flex h-9 px-3 items-center justify-center rounded-xl bg-success/15 text-success font-bold text-xs border border-success/10 transition-all hover:bg-success hover:text-surface shrink-0"
                      >
                        {t(`Receive`)}
                      </button>
                    )}
                    <button
                      onClick={() => handleSendSms(credit)}
                      disabled={smsStatus === credit.id}
                      className="inline-flex size-9 items-center justify-center rounded-xl bg-accent/15 text-accent border border-accent/10 transition-all hover:bg-accent hover:text-surface shrink-0"
                      title={t(`Send credit SMS reminder`)}
                    >
                      {smsStatus === credit.id ? (
                        <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-accent border-t-transparent" />
                      ) : (
                        <MessageSquare size={14} />
                      )}
                    </button>
                    <button
                      onClick={() => handleDeleteCredit(credit.id)}
                      className="inline-flex size-9 items-center justify-center rounded-xl bg-danger/10 text-danger border border-danger/10 transition-all hover:bg-danger hover:text-surface shrink-0"
                      title={t(`Delete record`)}
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              </article>
            )))}
          </div>

          <AnimatePresence>
            {paymentModalCredit && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-50 flex items-center justify-center bg-surface-strong/80 p-4 backdrop-blur-sm"
              >
                <motion.div
                  initial={{ scale: 0.95 }}
                  animate={{ scale: 1 }}
                  exit={{ scale: 0.95 }}
                  className="w-full max-w-sm rounded-2xl border border-line bg-surface p-6 shadow-premium"
                >
                  <h3 className="font-heading text-lg font-bold">
                    {t(`Receive Payment`)}
                  </h3>
                  <p className="mt-1 text-sm text-ink-soft">
                    {t(`Customer:`)} <span className="font-bold text-ink">{paymentModalCredit.name}</span>
                    <br />
                    {t(`Current Due:`)} <span className="font-bold text-accent">{currencySymbol}{tNum(paymentModalCredit.amount.toLocaleString('en-US'))}</span>
                  </p>
                  
                  <form onSubmit={handleRecordPayment} className="mt-4 flex flex-col gap-4">
                    <div>
                      <label className="text-xs font-black text-ink-soft">{t(`Payment Amount`)}</label>
                      <input
                        type="number"
                        required
                        max={paymentModalCredit.amount}
                        min={1}
                        value={paymentAmount}
                        onChange={(e) => setPaymentAmount(e.target.value)}
                        placeholder={`${currencySymbol}...`}
                        className="mt-1 w-full rounded-xl border border-line bg-surface px-4 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-success"
                      />
                    </div>
                    <div className="flex justify-end gap-2 mt-2">
                      <button
                        type="button"
                        onClick={() => setPaymentModalCredit(null)}
                        className="rounded-xl border border-line bg-surface px-4 py-2 text-xs font-bold text-ink hover:bg-muted"
                      >
                        {t(`Cancel`)}
                      </button>
                      <button
                        type="submit"
                        className="rounded-xl bg-success px-5 py-2 text-xs font-black text-white shadow-glow"
                      >
                        {t(`Confirm`)}
                      </button>
                    </div>
                  </form>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </section>

      {/* Tab Right: Cooperative Equity & Leaderboard */}
      <section className="glass bg-surface-strong/60 backdrop-blur-2xl rounded-3xl p-6 xl:p-8 shadow-[0_8px_40px_rgb(0,0,0,0.08)] border border-line/40 flex flex-col justify-between relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-focus/5 rounded-full blur-[80px] pointer-events-none -z-10"></div>
        <div className="relative z-10">
          <header className="flex items-center gap-3 border-b border-line pb-4 mb-4">
            <span className="grid size-10 place-items-center rounded-xl bg-accent/10 text-accent">
              <Trophy size={18} />
            </span>
            <div>
              <h3 className="font-heading text-lg font-extrabold tracking-tight">
                {t(`Co-op Leaderboard`)}
              </h3>
              <p className="text-xs text-ink-soft">
                {t(`Earn points for smart decisions & build ecosystem equity.`)}
              </p>
            </div>
          </header>

          {/* User's Current Equity Status */}
          <div className="mb-6 rounded-2xl bg-surface-strong/70 border border-line p-5 shadow-sm text-center">
            <p className="text-[10px] font-black uppercase text-ink-soft tracking-wider mb-1">
              {t(`Your Participation Points`)}
            </p>
            <div className="flex items-end justify-center gap-1.5 mb-2">
              <span className="font-heading text-4xl font-black text-accent leading-none">
                {tNum(myPoints.toLocaleString('en-US'))}
              </span>
              <span className="text-sm font-bold text-ink-soft mb-0.5">pts</span>
            </div>
            <div className="w-full bg-muted rounded-full h-2 mb-2 overflow-hidden">
              <div className="bg-accent h-2 rounded-full transition-all duration-1000" style={{ width: `${fillPercentage}%` }}></div>
            </div>
            <p className="text-[10px] text-ink-soft">
              {t(`${tNum(distToNextTier.toLocaleString('en-US'))} points away from next tier equity.`)}
            </p>
          </div>

          {/* Leaderboard Rankings */}
          <div className="space-y-3 relative z-10">
            <p className="text-[10px] font-black text-ink-soft uppercase tracking-wider mb-2">
              {t(`Top Co-op Merchants`)}
            </p>
            
            <AnimatePresence>
              {topMerchants.map((merchant, idx) => {
                const rank = idx + 1
                const isMe = merchant.displayName === profile?.storeName
                
                // Tier based badge styling
                let tierBg = 'bg-muted/50 border-line/50 text-ink-soft'
                let tierIconBg = 'bg-muted text-ink-soft'
                if (rank === 1) { tierBg = 'bg-gradient-to-r from-warning/20 to-warning/5 border-warning/30 shadow-glow-warning'; tierIconBg = 'bg-warning text-surface shadow-md' }
                else if (rank === 2) { tierBg = 'bg-gradient-to-r from-slate-200/20 to-transparent border-slate-200/30'; tierIconBg = 'bg-slate-300 text-slate-700 shadow-sm' }
                else if (rank === 3) { tierBg = 'bg-gradient-to-r from-amber-700/10 to-transparent border-amber-700/20'; tierIconBg = 'bg-amber-700/20 text-amber-700 shadow-sm' }

                return (
                  <motion.article
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: idx * 0.1 }}
                    key={merchant.id}
                    className={`flex items-center justify-between gap-4 rounded-2xl border p-4 transition-all duration-300 ${
                      isMe 
                        ? 'border-accent/40 bg-accent/10 shadow-[0_0_20px_rgba(var(--color-accent),0.15)] scale-[1.02]' 
                        : tierBg
                    }`}
                  >
                    <div className="flex items-center gap-4">
                      <span className={`grid size-10 place-items-center rounded-xl font-black text-sm ${tierIconBg}`}>
                        #{tNum(rank.toString())}
                      </span>
                      <div>
                        <h4 className="font-heading text-xs font-bold text-ink leading-tight">
                          {merchant.displayName} {isMe && (t(`(You)`))}
                        </h4>
                        <p className={`text-[9px] font-bold uppercase mt-0.5 ${rank === 1 ? 'text-warning' : 'text-accent'}`}>
                          {merchant.tier}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="font-heading text-sm font-black text-ink">{tNum(merchant.points.toLocaleString('en-US'))}</span>
                    </div>
                  </motion.article>
                )
              })}
            </AnimatePresence>
          </div>

          {/* Equity Explanation Callout */}
          <div className="rounded-xl bg-success/10 border border-success/20 p-4 mt-6 flex items-start gap-2.5 text-xs text-ink-soft leading-normal">
            <ShieldCheck className="shrink-0 text-success mt-0.5" size={14} />
            <p>
              {t(`Using AI recommendations for inventory directly earns you participation points, translating to real ecosystem equity.`)}
            </p>
          </div>
        </div>
      </section>
    </div>
  )
}
