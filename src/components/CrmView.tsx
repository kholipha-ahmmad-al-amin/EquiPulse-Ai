import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import confetti from 'canvas-confetti'
import { 
  UserPlus, 
  MessageSquare, 
  Trash2, 
  Banknote, 
  Users, 
  Trophy,
  ShieldCheck,
  Star,
  History,
  Receipt,
  X,
  Loader2,
  Mail
} from 'lucide-react'
import { useI18n } from '../i18n'
import { useCustomerLedger, type CustomerCredit } from '../hooks/useCustomerLedger'
import { useCRM, type CustomerProfile } from '../hooks/useCRM'

interface PurchaseItem { name: string; qty?: number; price?: number; total?: number }
interface Purchase { id: string; timestamp: string | number | Date; amount: number; items?: PurchaseItem[] }
import { DatePicker } from './ui/DatePicker'
import { useStoreProfile } from '../hooks/useStoreProfile'
import { useStoreSettings } from '../hooks/useStoreSettings'
import { useLeaderboard } from '../hooks/useLeaderboard'
import { useToast } from './ToastProvider'

export function CrmView() {
  const { locale, tNum, t } = useI18n()
  const toast = useToast()

  // Hooks
  const { credits, addCredit, recordPayment, queueCreditReminder } = useCustomerLedger()
  const { customers, addOrUpdateCustomer, deleteCustomer, getCustomerHistory } = useCRM()
  const { profile } = useStoreProfile()
  const [{ currencySymbol }] = useStoreSettings()
  const { entries: topMerchants } = useLeaderboard(4)

  // State
  const [name, setName] = useState('')
  const [mobile, setMobile] = useState('')
  const [email, setEmail] = useState('')
  const [amount, setAmount] = useState('')
  const [dueDate, setDueDate] = useState('')
  const [showAddForm, setShowAddForm] = useState(false)
  const [smsStatus, setSmsStatus] = useState<string | null>(null)
  const [paymentModalCredit, setPaymentModalCredit] = useState<CustomerCredit | null>(null)
  const [paymentAmount, setPaymentAmount] = useState('')

  // Campaign & History States
  const [showCampaignModal, setShowCampaignModal] = useState(false)
  const [campaignSubject, setCampaignSubject] = useState('')
  const [campaignBody, setCampaignBody] = useState('')
  const [campaignTargetSegment, setCampaignTargetSegment] = useState<'All' | 'Platinum' | 'Gold' | 'Silver' | 'Bronze'>('All')

  const [historyModalCustomer, setHistoryModalCustomer] = useState<CustomerProfile | null>(null)
  const [customerHistory, setCustomerHistory] = useState<Purchase[]>([])
  const [loadingHistory, setLoadingHistory] = useState(false)

  const getCustomerTier = (totalSpent: number) => {
    if (totalSpent > 10000) return { name: 'Platinum', color: 'bg-indigo-500/10 text-indigo-500 border-indigo-500/20' }
    if (totalSpent > 5000) return { name: 'Gold', color: 'bg-warning/10 text-warning border-warning/20' }
    if (totalSpent > 2000) return { name: 'Silver', color: 'bg-slate-400/10 text-slate-500 border-slate-400/20' }
    return { name: 'Bronze', color: 'bg-amber-600/10 text-amber-700 border-amber-600/20' }
  }

  const getNextTierGoal = (totalSpent: number) => {
    if (totalSpent > 10000) return null // Max tier
    if (totalSpent > 5000) {
      const needed = 10000 - totalSpent
      const pct = Math.min(100, ((totalSpent - 5000) / 5000) * 100)
      return { next: 'Platinum', needed, pct }
    }
    if (totalSpent > 2000) {
      const needed = 5000 - totalSpent
      const pct = Math.min(100, ((totalSpent - 2000) / 3000) * 100)
      return { next: 'Gold', needed, pct }
    }
    const needed = 2000 - totalSpent
    const pct = Math.min(100, (totalSpent / 2000) * 100)
    return { next: 'Silver', needed, pct }
  }

  const handleSendCampaign = (e: React.FormEvent) => {
    e.preventDefault()
    const filtered = customers.filter(c => {
      if (campaignTargetSegment === 'All') return true
      const tier = getCustomerTier(c.totalSpent || 0).name
      return tier === campaignTargetSegment
    })
    const emails = filtered.map(c => c.email).filter(Boolean) as string[]
    if (emails.length === 0) {
      toast('No Targets', 'No customers with email in the selected segment.', 'warning')
      return
    }
    const bccList = emails.join(',')
    const mailtoUrl = `mailto:?bcc=${encodeURIComponent(bccList)}&subject=${encodeURIComponent(campaignSubject)}&body=${encodeURIComponent(campaignBody)}`
    window.open(mailtoUrl, '_blank')
    toast('Campaign Launched', `BCC'd ${emails.length} customer(s).`, 'success')
    setShowCampaignModal(false)
    setCampaignSubject('')
    setCampaignBody('')
  }

  const handleViewHistory = async (customer: CustomerProfile) => {
    setHistoryModalCustomer(customer)
    setLoadingHistory(true)
    const history = await getCustomerHistory(customer.id)
    setCustomerHistory(history as Purchase[])
    setLoadingHistory(false)
  }

  const handleRecordPayment = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!paymentModalCredit || !paymentAmount) return
    
    const amt = parseFloat(paymentAmount)
    if (amt > 0) {
      try {
        await recordPayment(paymentModalCredit.id, amt, 'cash', 'Partial Payment')
        toast(
          t("Payment Recorded"),
          t("Credit ledger updated successfully."),
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

  const handleAddCustomer = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name || !mobile) return

    // Add to CRM
    await addOrUpdateCustomer({ name, mobile, email })

    // If there's an initial credit amount, add it to Ledger
    if (parseFloat(amount) > 0) {
      await addCredit({
        id: Date.now().toString(),
        name,
        mobile,
        amount: parseFloat(amount),
        dueDate: dueDate || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
        status: 'pending',
      })
    }

    setName('')
    setMobile('')
    setEmail('')
    setAmount('')
    setDueDate('')
    setShowAddForm(false)
    toast('Success', t("Customer Added"), 'success')
  }

  const handleSendSms = async (customer: CustomerProfile, dueAmount: number, credit: CustomerCredit | undefined) => {
    if (!credit) return
    setSmsStatus(customer.id)
    try {
      await queueCreditReminder(credit, locale)
      
      const message = t('smsReminderMsg', { 
        name: customer.name, 
        amount: `${currencySymbol}${dueAmount}`, 
        store: profile?.storeName || 'SME Pulse',
        defaultValue: `Dear ${customer.name}, your due amount is ${currencySymbol}${dueAmount}. Please pay soon. - ${profile?.storeName || 'SME Pulse'}`
      })
      
      const smsUrl = `sms:${customer.mobile}?body=${encodeURIComponent(message)}`
      const a = document.createElement('a')
      a.href = smsUrl
      a.click()

      toast(
        t("Reminder sending"),
        t('openingSmsApp', { name: customer.name, defaultValue: `Opening SMS app for ${customer.name}.` }),
        'success',
      )
    } catch (error) {
      console.error(error)
      toast(
        t("Reminder was not queued"),
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

  const totalLTV = customers.reduce((sum, c) => sum + (c.totalSpent || 0), 0)

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
      
      {/* Tab Left: Customer CRM & Ledger */}
      <section className="glass bg-surface-strong/60 backdrop-blur-2xl rounded-3xl p-6 xl:p-8 shadow-[0_8px_40px_rgb(0,0,0,0.08)] border border-line/40 flex flex-col justify-between h-full relative overflow-hidden">
        <div className="absolute -top-32 -left-32 w-64 h-64 bg-accent/5 rounded-full blur-[80px] pointer-events-none -z-10"></div>
        <div className="relative z-10">
          <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-line pb-6">
            <div>
              <h3 className="font-heading text-xl font-extrabold tracking-tight">
                {t("Customer Relationship (CRM)")}
              </h3>
              <p className="mt-1 text-sm text-ink-soft">
                {t("Track loyalty points, lifetime value, and credit ledgers in one place.")}
              </p>
            </div>
            
            <div className="flex gap-2">
              <button
                onClick={() => setShowCampaignModal(true)}
                className="inline-flex items-center gap-2 rounded-xl bg-surface border border-line px-4 py-2.5 text-xs font-black text-ink-soft hover:text-accent hover:border-accent/30 transition-all hover:scale-[1.02]"
              >
                <Mail size={14} />
                {t("Email Campaign")}
              </button>
              <button
                onClick={() => setShowAddForm(!showAddForm)}
                className="inline-flex items-center gap-2 rounded-xl bg-accent px-4 py-2.5 text-xs font-black text-surface shadow-glow transition-all hover:scale-[1.02]"
              >
                <UserPlus size={14} />
                {t("Add New Customer")}
              </button>
            </div>
          </header>

          {/* Add Customer Form */}
          <AnimatePresence>
            {showAddForm && (
              <motion.form
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                onSubmit={handleAddCustomer}
                className="mt-6 rounded-2xl bg-surface-strong/60 border border-line p-5 grid gap-4 sm:grid-cols-2"
              >
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-black text-ink-soft">{t("Customer Name*")}</label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder={t("e.g. Rafique Brother")}
                    className="rounded-xl border border-line bg-surface px-4 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-accent"
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-black text-ink-soft">{t("Mobile Number*")}</label>
                  <input
                    type="tel"
                    required
                    value={mobile}
                    onChange={(e) => setMobile(e.target.value)}
                    placeholder={t("e.g. 017xxxxxxxx")}
                    className="rounded-xl border border-line bg-surface px-4 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-accent"
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-black text-ink-soft">{t("Email (Optional)")}</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder={t("e.g. email@example.com")}
                    className="rounded-xl border border-line bg-surface px-4 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-accent"
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-black text-ink-soft">{t('initialCreditDue', { symbol: currencySymbol, defaultValue: `Initial Credit Due (${currencySymbol})` })}</label>
                  <input
                    type="number"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder={t("e.g. 1500")}
                    className="rounded-xl border border-line bg-surface px-4 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-accent"
                  />
                </div>
                {parseFloat(amount) > 0 && (
                  <div className="flex flex-col gap-1.5 sm:col-span-2">
                    <DatePicker 
                      label={t("Credit Due Date")}
                      value={dueDate ? { 
                        year: dueDate.split('-')[0] || '', 
                        month: dueDate.split('-')[1] || '', 
                        day: dueDate.split('-')[2] || '', 
                        iso: dueDate 
                      } : null}
                      onChange={(val) => setDueDate(val?.iso || '')}
                    />
                  </div>
                )}
                <div className="sm:col-span-2 flex justify-end gap-2 mt-2">
                  <button
                    type="button"
                    onClick={() => setShowAddForm(false)}
                    className="rounded-xl border border-line bg-surface px-4 py-2 text-xs font-bold text-ink hover:bg-muted"
                  >
                    {t("Cancel")}
                  </button>
                  <button
                    type="submit"
                    className="rounded-xl bg-accent px-5 py-2 text-xs font-black text-surface shadow-glow"
                  >
                    {t("Save Customer")}
                  </button>
                </div>
              </motion.form>
            )}
          </AnimatePresence>

          {/* CRM Quick Stats */}
          <section className="grid gap-4 grid-cols-1 min-[480px]:grid-cols-3 mt-6">
            <article className="rounded-2xl border border-line/60 bg-surface/80 backdrop-blur-md p-5 flex flex-col sm:flex-row items-center sm:items-start gap-4 shadow-sm hover:shadow-[0_8px_30px_rgb(0,0,0,0.06)] hover:-translate-y-1 transition-all duration-300 text-center sm:text-left">
              <span className="grid size-12 place-items-center rounded-xl bg-success/15 text-success shrink-0 shadow-inner">
                <Users size={20} />
              </span>
              <div>
                <p className="text-[10px] font-black uppercase text-ink-soft tracking-wider leading-none mb-1.5">{t("Total Customers")}</p>
                <p className="text-2xl font-heading font-black text-success leading-none">{tNum(customers.length)}</p>
              </div>
            </article>
            <article className="rounded-2xl border border-line/60 bg-surface/80 backdrop-blur-md p-5 flex flex-col sm:flex-row items-center sm:items-start gap-4 shadow-sm hover:shadow-[0_8px_30px_rgb(0,0,0,0.06)] hover:-translate-y-1 transition-all duration-300 text-center sm:text-left">
              <span className="grid size-12 place-items-center rounded-xl bg-warning/15 text-warning shrink-0 shadow-inner">
                <Banknote size={20} />
              </span>
              <div>
                <p className="text-[10px] font-black uppercase text-ink-soft tracking-wider leading-none mb-1.5">{t("Total Dues")}</p>
                <p className="text-2xl font-heading font-black text-warning leading-none">{currencySymbol}{tNum(totalOutstanding.toLocaleString('en-US'))}</p>
              </div>
            </article>
            <article className="rounded-2xl border border-line/60 bg-surface/80 backdrop-blur-md p-5 flex flex-col sm:flex-row items-center sm:items-start gap-4 shadow-sm hover:shadow-[0_8px_30px_rgb(0,0,0,0.06)] hover:-translate-y-1 transition-all duration-300 text-center sm:text-left">
              <span className="grid size-12 place-items-center rounded-xl bg-accent/15 text-accent shrink-0 shadow-inner">
                <Star size={20} />
              </span>
              <div>
                <p className="text-[10px] font-black uppercase text-ink-soft tracking-wider leading-none mb-1.5">{t("Customer LTV")}</p>
                <p className="text-2xl font-heading font-black text-accent leading-none">{currencySymbol}{tNum(totalLTV.toLocaleString('en-US'))}</p>
              </div>
            </article>
          </section>

          {/* CRM List */}
          <div className="mt-8 space-y-3">
            {customers.length === 0 ? (
              <div className="py-16 text-center rounded-xl border border-dashed border-line/80 bg-surface/50">
                <div className="flex flex-col items-center justify-center space-y-3">
                  <div className="flex size-16 items-center justify-center rounded-2xl bg-accent/10 text-accent">
                    <UserPlus size={32} />
                  </div>
                  <div>
                    <h3 className="font-heading text-lg font-bold text-ink">{t("CRM is Empty")}</h3>
                    <p className="text-sm text-ink-soft mt-1 max-w-sm mx-auto">{t("Click \"Add New Customer\" above to start building your CRM.")}</p>
                  </div>
                </div>
              </div>
            ) : (
              customers.map((customer: CustomerProfile) => {
                const credit = credits.find(c => c.mobile === customer.mobile && c.status !== 'paid')
                const dueAmount = credit ? credit.amount : 0

                return (
                  <article
                    key={customer.id}
                    className="group flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 rounded-2xl border border-line/40 bg-surface/80 backdrop-blur-md p-5 shadow-[0_4px_20px_rgb(0,0,0,0.03)] transition-all duration-300 hover:-translate-y-1 hover:shadow-premium hover:border-accent/40"
                  >
                    <div className="flex items-center gap-4">
                      <div className="size-12 rounded-xl bg-surface-strong flex items-center justify-center font-heading text-xl font-black text-ink shrink-0 border border-line/50 group-hover:bg-accent/10 group-hover:text-accent group-hover:border-accent/30 transition-colors">
                        {customer.name.substring(0, 1)}
                      </div>
                      <div>
                        <h4 className="font-heading text-sm sm:text-base font-extrabold text-ink leading-tight flex items-center gap-2">
                          {customer.name}
                          {(() => {
                            const tier = getCustomerTier(customer.totalSpent || 0)
                            return (
                              <span className={`text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full border ${tier.color}`}>
                                {tier.name}
                              </span>
                            )
                          })()}
                        </h4>
                        <p className="text-xs text-ink-soft mt-1 leading-none">
                          📱 {tNum(customer.mobile)} | {t("Pts:")} <span className="font-bold text-accent">{tNum(customer.loyaltyPoints || 0)}</span>
                        </p>
                        {(() => {
                          const goal = getNextTierGoal(customer.totalSpent || 0)
                          if (!goal) return null
                          return (
                            <div className="mt-2 w-full min-w-[160px] max-w-[240px]">
                              <div className="flex justify-between text-[9px] text-ink-soft mb-1 font-bold">
                                <span>{t("Progress to")} {goal.next}</span>
                                <span>{tNum(Math.round(goal.pct))}%</span>
                              </div>
                              <div className="w-full h-1 bg-surface-strong rounded-full overflow-hidden border border-line/10">
                                <div 
                                  className="h-full bg-gradient-to-r from-accent to-emerald-500 rounded-full transition-all duration-500" 
                                  style={{ width: `${goal.pct}%` }}
                                />
                              </div>
                            </div>
                          )
                        })()}
                      </div>
                    </div>

                    <div className="flex items-center justify-between sm:justify-end gap-4">
                      <div className="text-left sm:text-right">
                        <p className="font-heading text-[10px] uppercase text-ink-soft mb-0.5">{t("Total Spent")}</p>
                        <p className="font-heading text-base font-black text-ink leading-none">{currencySymbol}{tNum((customer.totalSpent || 0).toLocaleString('en-US'))}</p>
                      </div>
                      
                      <div className="h-8 w-px bg-line mx-2 hidden sm:block"></div>

                      <div className="text-left sm:text-right">
                        <p className="font-heading text-[10px] uppercase text-ink-soft mb-0.5">{t("Due Balance")}</p>
                        <p className={`font-heading text-base font-black leading-none ${dueAmount > 0 ? 'text-warning' : 'text-success'}`}>
                          {currencySymbol}{tNum(dueAmount.toLocaleString('en-US'))}
                        </p>
                        {dueAmount > 0 && credit?.dueDate && (() => {
                          const daysUntilDue = Math.ceil((new Date(credit.dueDate).getTime() - Date.now()) / (1000 * 3600 * 24));
                          const isOverdue = daysUntilDue < 0;
                          const isDueSoon = daysUntilDue >= 0 && daysUntilDue <= 3;
                          return (
                            <p className={`text-[10px] mt-1.5 font-black uppercase tracking-wider px-2 py-0.5 rounded-full inline-block ${
                              isOverdue ? 'bg-danger text-surface animate-pulse shadow-glow-danger' : 
                              isDueSoon ? 'bg-warning/20 text-warning-strong border border-warning/30' : 
                              'bg-surface-strong text-ink-soft'
                            }`}>
                              {isOverdue ? t(`Overdue! Act Now`) : 
                               isDueSoon ? t(`Due in ${daysUntilDue} Days`) : 
                               t(`Due: ${credit.dueDate}`)}
                            </p>
                          );
                        })()}
                      </div>

                      <div className="flex items-center gap-2">
                        {dueAmount > 0 && credit && (
                          <>
                            <button
                              onClick={() => setPaymentModalCredit(credit)}
                              className="inline-flex h-9 px-3 items-center justify-center rounded-xl bg-success/15 text-success font-bold text-xs border border-success/10 transition-all hover:bg-success hover:text-surface shrink-0"
                            >
                              {t("Receive")}
                            </button>
                            <button
                              onClick={() => handleSendSms(customer, dueAmount, credit)}
                              disabled={smsStatus === customer.id}
                              className="inline-flex size-9 items-center justify-center rounded-xl bg-warning/15 text-warning border border-warning/10 transition-all hover:bg-warning hover:text-surface shrink-0"
                              title={t("Send SMS reminder")}
                            >
                              {smsStatus === customer.id ? (
                                <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-warning border-t-transparent" />
                              ) : (
                                <MessageSquare size={14} />
                              )}
                            </button>
                          </>
                        )}
                        <button
                          onClick={() => handleViewHistory(customer)}
                          className="inline-flex size-9 items-center justify-center rounded-xl bg-surface border border-line/50 text-ink-soft hover:border-info hover:text-info hover:bg-info/10 transition-all shrink-0"
                          title={t("Purchase History")}
                        >
                          <History size={16} />
                        </button>
                        <button
                          onClick={() => deleteCustomer(customer.id)}
                          className="inline-flex size-9 items-center justify-center rounded-xl bg-danger/10 text-danger border border-danger/10 transition-all hover:bg-danger hover:text-surface shrink-0"
                          title={t("Delete Customer")}
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  </article>
                )
              })
            )}
          </div>

          {/* Payment Modal */}
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
                    {t("Receive Payment")}
                  </h3>
                  <p className="mt-1 text-sm text-ink-soft">
                    {t("Customer:")} <span className="font-bold text-ink">{paymentModalCredit.name}</span>
                    <br />
                    {t("Current Due:")} <span className="font-bold text-accent">{currencySymbol}{tNum(paymentModalCredit.amount.toLocaleString('en-US'))}</span>
                  </p>
                  
                  <form onSubmit={handleRecordPayment} className="mt-4 flex flex-col gap-4">
                    <div>
                      <label className="text-xs font-black text-ink-soft">{t("Payment Amount")}</label>
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
                        {t("Cancel")}
                      </button>
                      <button
                        type="submit"
                        className="rounded-xl bg-success px-5 py-2 text-xs font-black text-white shadow-glow"
                      >
                        {t("Confirm")}
                      </button>
                    </div>
                  </form>
                </motion.div>
              </motion.div>
            )}
            
            {showCampaignModal && (
              <motion.div
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="fixed inset-0 z-50 flex items-center justify-center bg-surface-strong/80 p-4 backdrop-blur-sm"
              >
                <motion.div
                  initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }}
                  className="w-full max-w-md rounded-3xl border border-line bg-surface p-6 shadow-premium"
                >
                  <div className="flex items-center justify-between border-b border-line/30 pb-4 mb-4">
                    <h3 className="font-heading text-lg font-black text-ink flex items-center gap-2">
                      <Mail className="text-accent" size={20} />
                      {t("Email Marketing Campaign")}
                    </h3>
                    <button onClick={() => setShowCampaignModal(false)} className="rounded-xl p-2 text-ink-soft hover:bg-surface-strong/50 hover:text-ink"><X size={18} /></button>
                  </div>
                  
                  <form onSubmit={handleSendCampaign} className="flex flex-col gap-4">
                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs font-black text-ink-soft">{t("Target Customer Segment")}</label>
                      <select
                        value={campaignTargetSegment}
                        onChange={(e) => setCampaignTargetSegment(e.target.value as 'All' | 'Platinum' | 'Gold' | 'Silver' | 'Bronze')}
                        className="rounded-xl border border-line bg-surface px-4 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-accent font-bold"
                      >
                        <option value="All">{t("All Customers")}</option>
                        <option value="Platinum">{t("Platinum Segment")}</option>
                        <option value="Gold">{t("Gold Segment")}</option>
                        <option value="Silver">{t("Silver Segment")}</option>
                        <option value="Bronze">{t("Bronze Segment")}</option>
                      </select>
                    </div>

                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs font-black text-ink-soft">{t("Email Subject")}</label>
                      <input
                        type="text"
                        required
                        value={campaignSubject}
                        onChange={(e) => setCampaignSubject(e.target.value)}
                        placeholder={t("e.g. Special Discount for our VIPs!")}
                        className="rounded-xl border border-line bg-surface px-4 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-accent"
                      />
                    </div>

                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs font-black text-ink-soft">{t("Email Message Body")}</label>
                      <textarea
                        required
                        rows={4}
                        value={campaignBody}
                        onChange={(e) => setCampaignBody(e.target.value)}
                        placeholder={t("Write your message here...")}
                        className="rounded-xl border border-line bg-surface px-4 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-accent"
                      />
                    </div>

                    <div className="flex justify-end gap-2 mt-2">
                      <button
                        type="button"
                        onClick={() => setShowCampaignModal(false)}
                        className="rounded-xl border border-line bg-surface px-4 py-2 text-xs font-bold text-ink hover:bg-muted"
                      >
                        {t("Cancel")}
                      </button>
                      <button
                        type="submit"
                        className="rounded-xl bg-accent px-5 py-2 text-xs font-black text-surface shadow-glow"
                      >
                        {t("Launch Campaign")}
                      </button>
                    </div>
                  </form>
                </motion.div>
              </motion.div>
            )}

            {historyModalCustomer && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 p-4 backdrop-blur-sm"
                onClick={() => setHistoryModalCustomer(null)}
              >
                <motion.div
                  initial={{ scale: 0.95, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.95, opacity: 0 }}
                  onClick={(e) => e.stopPropagation()}
                  className="w-full max-w-lg rounded-3xl bg-surface p-6 shadow-premium sm:p-8"
                >
                  <div className="flex items-center justify-between mb-6">
                    <div>
                      <h2 className="font-heading text-xl font-black tracking-tight text-ink">
                        {historyModalCustomer.name}
                      </h2>
                      <p className="text-xs font-bold text-ink-soft mt-1">{t("Purchase History")}</p>
                    </div>
                    <button onClick={() => setHistoryModalCustomer(null)} className="rounded-xl p-2 bg-surface-strong/50 text-ink-soft hover:bg-surface-strong hover:text-ink transition-colors">
                      <X size={20} />
                    </button>
                  </div>

                  {loadingHistory ? (
                    <div className="flex justify-center items-center py-12">
                      <Loader2 className="animate-spin text-accent" size={32} />
                    </div>
                  ) : customerHistory.length === 0 ? (
                    <div className="text-center py-12 bg-surface-strong/20 rounded-2xl border border-line/40">
                      <Receipt size={48} className="mx-auto text-ink/20 mb-3" />
                      <p className="text-ink-soft font-bold text-sm">{t("No past purchases found.")}</p>
                    </div>
                  ) : (
                    <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2 custom-scrollbar">
                      {customerHistory.map((purchase, idx) => {
                        const itemQty = (q: number | undefined): string => tNum(q ?? 0)
                        const itemPrice = (p: number | undefined): string => tNum(p ?? 0)
                        return (
                        <div key={idx} className="bg-surface-strong/30 rounded-2xl p-4 border border-line/40">
                          <div className="flex justify-between items-start mb-3 border-b border-line/30 pb-3">
                            <div>
                              <p className="text-[11px] font-bold text-ink-soft uppercase tracking-wider">{new Date(purchase.timestamp).toLocaleString(locale)}</p>
                              <p className="text-xs text-ink-soft mt-0.5 opacity-60">ID: {purchase.id}</p>
                            </div>
                            <p className="font-black text-ink text-base">{currencySymbol}{tNum(purchase.amount.toLocaleString())}</p>
                          </div>
                          <div className="space-y-1.5">
                            {(purchase.items || []).map((item: PurchaseItem, i: number) => (
                              <div key={i} className="flex justify-between text-xs items-center">
                                <span className="text-ink font-semibold flex items-center gap-2">
                                  <span className="w-1 h-1 rounded-full bg-accent/50 inline-block"></span>
                                  {item.name}
                                </span>
                                <span className="text-ink-soft font-bold">
                                  {itemQty(item.qty)} x {currencySymbol}{itemPrice(item.price)}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )
                      })}
                    </div>
                  )}
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
                {t("Co-op Leaderboard")}
              </h3>
              <p className="text-xs text-ink-soft">
                {t("Earn points for smart decisions.")}
              </p>
            </div>
          </header>

          <div className="mb-6 rounded-2xl bg-surface-strong/70 border border-line p-5 shadow-sm text-center">
            <p className="text-[10px] font-black uppercase text-ink-soft tracking-wider mb-1">
              {t("Your Participation Points")}
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
              {t('pointsAway', { pts: tNum(distToNextTier.toLocaleString('en-US')), defaultValue: `${tNum(distToNextTier.toLocaleString('en-US'))} points away from next tier equity.` })}
            </p>
          </div>

          <div className="space-y-3 relative z-10">
            <p className="text-[10px] font-black text-ink-soft uppercase tracking-wider mb-2">
              {t("Top Co-op Merchants")}
            </p>
            
            <AnimatePresence>
              {topMerchants.map((merchant, idx) => {
                const rank = idx + 1
                const isMe = merchant.displayName === profile?.storeName
                
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
                          {merchant.displayName} {isMe && (t("(You)"))}
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

          <div className="rounded-xl bg-success/10 border border-success/20 p-4 mt-6 flex items-start gap-2.5 text-xs text-ink-soft leading-normal">
            <ShieldCheck className="shrink-0 text-success mt-0.5" size={14} />
            <p>
              {t("Using AI recommendations for inventory directly earns you participation points.")}
            </p>
          </div>
        </div>
      </section>
    </div>
  )
}
