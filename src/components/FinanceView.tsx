import { useState, useMemo, useEffect } from 'react'
import { Calculator, DollarSign, TrendingDown, TrendingUp, Download, CheckCircle2, Package, BookOpen, ScrollText, Clock, ArrowRightLeft, ShieldAlert } from 'lucide-react'
import { useI18n, convertToBanglaNumerals } from '../i18n'
import { useAuthSession } from '../hooks/useAuthSession'
import { useExpenses } from '../hooks/useExpenses'
import { useInventory } from '../hooks/useInventory'
import { useStoreSettings } from '../hooks/useStoreSettings'
import { collection, getDocs } from 'firebase/firestore'
import { db } from '../../firebase/config'
import { useDailyRegister, type DailyRegister, type CashTransaction, type RegisterLineItem } from '../hooks/useDailyRegister'
import { useToast } from './ToastProvider'
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip as RechartsTooltip, CartesianGrid } from 'recharts'

export function FinanceView() {
  const { t, tNum, locale } = useI18n()
  const [{ currencySymbol }] = useStoreSettings()
  const { tenantId } = useAuthSession()
  const toast = useToast()

  const { register: todayRegister, openRegister, closeRegister } = useDailyRegister()
  
  const [registers, setRegisters] = useState<DailyRegister[]>([])
  const { expenses } = useExpenses()
  const { items: inventory } = useInventory()

  const [dateRange, setDateRange] = useState<'today' | 'week' | 'month' | 'year'>('month')
  const [activeTab, setActiveTab] = useState<'pnl' | 'ledger' | 'till' | 'cashflow'>('pnl')

  // Till Management Form States
  const [showOpenRegisterModal, setShowOpenRegisterModal] = useState(false)
  const [showCloseRegisterModal, setShowCloseRegisterModal] = useState(false)
  const [openingBalanceInput, setOpeningBalanceInput] = useState('')
  const [closingBalanceInput, setClosingBalanceInput] = useState('')
  const [zReportData, setZReportData] = useState<{
    openingBalance: number
    totalSales: number
    totalExpenses: number
    cashSales: number
    gatewaySales: number
    expectedCash: number
  } | null>(null)

  useEffect(() => {
    if (!tenantId) return
    const fetchAllRegisters = async () => {
      try {
        const querySnapshot = await getDocs(collection(db, 'users', tenantId, 'registers'))
        const allRegisters = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as DailyRegister))
        setRegisters(allRegisters)
      } catch (err) {
        console.error('Failed to fetch registers', err)
      }
    }
    fetchAllRegisters()
  }, [tenantId])

  // Calculate metrics
  const { totalRevenue, totalCOGS, totalOperatingExpenses, totalTax } = useMemo(() => {
    let rev = 0
    let tax = 0
    let cogs = 0
    let opex = 0

    // Filter by date
    const cutoff = new Date()
    if (dateRange === 'today') cutoff.setHours(0,0,0,0)
    else if (dateRange === 'week') cutoff.setDate(cutoff.getDate() - 7)
    else if (dateRange === 'month') cutoff.setMonth(cutoff.getMonth() - 1)
    else if (dateRange === 'year') cutoff.setFullYear(cutoff.getFullYear() - 1)

    // Calculate Revenue, Tax, and COGS from registers
    registers.forEach((reg: DailyRegister) => {
      if (reg.transactions) {
        reg.transactions.forEach((tx: CashTransaction) => {
          const txDate = new Date(tx.timestamp)
          if (txDate >= cutoff && tx.type === 'sale') {
            rev += tx.amount
            // Simple assumption: 15% VAT for demo purposes, or we could look up item specific tax
            tax += tx.amount * 0.15 

            // Calculate COGS by looking up cost prices from inventory
            if (tx.items) {
              tx.items.forEach((lineItem: RegisterLineItem) => {
                const invItem = inventory.find(i => i.id === lineItem.itemId)
                const cost = invItem?.costPrice || (lineItem.unitPrice * 0.7) // Fallback to 70% of retail if cost not set
                cogs += (cost * lineItem.quantity)
              })
            }
          }
        })
      }
    })

    // Calculate Expenses
    expenses.forEach(exp => {
      const expDate = new Date(exp.date)
      if (expDate >= cutoff) {
        opex += exp.amount
      }
    })

    return { totalRevenue: rev, totalCOGS: cogs, totalOperatingExpenses: opex, totalTax: tax }
  }, [registers, expenses, inventory, dateRange])

  const grossProfit = totalRevenue - totalCOGS
  const netProfit = grossProfit - totalOperatingExpenses

  const journalEntries = useMemo(() => {
    const entries: { id: string, date: string, description: string, debits: { account: string, amount: number }[], credits: { account: string, amount: number }[] }[] = []
    
    const cutoff = new Date()
    if (dateRange === 'today') cutoff.setHours(0,0,0,0)
    else if (dateRange === 'week') cutoff.setDate(cutoff.getDate() - 7)
    else if (dateRange === 'month') cutoff.setMonth(cutoff.getMonth() - 1)
    else if (dateRange === 'year') cutoff.setFullYear(cutoff.getFullYear() - 1)

    registers.forEach((reg: DailyRegister) => {
      reg.transactions?.forEach((tx: CashTransaction) => {
        if (new Date(tx.timestamp) < cutoff) return
        if (tx.type === 'sale') {
          entries.push({
            id: tx.id,
            date: tx.timestamp,
            description: tx.note || 'POS Sale',
            debits: [{ account: tx.paymentMethod === 'credit' ? 'Accounts Receivable' : 'Cash on Hand', amount: tx.amount }],
            credits: [{ account: 'Sales Revenue', amount: tx.amount }]
          })
        }
      })
    })
    expenses.forEach(exp => {
      if (new Date(exp.date) < cutoff) return
      entries.push({
        id: exp.id,
        date: exp.date,
        description: `Expense: ${exp.note || exp.category}`,
        debits: [{ account: 'Operating Expense', amount: exp.amount }],
        credits: [{ account: 'Cash on Hand', amount: exp.amount }]
      })
    })
    return entries.sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime())
  }, [registers, expenses, dateRange])

  const cashFlowSeries = useMemo(() => {
    let daysToTrack = 30
    if (dateRange === 'today') daysToTrack = 1
    else if (dateRange === 'week') daysToTrack = 7
    else if (dateRange === 'month') daysToTrack = 30
    else if (dateRange === 'year') daysToTrack = 365

    const dates = Array.from({ length: daysToTrack }).map((_, i) => {
      const d = new Date()
      d.setDate(d.getDate() - (daysToTrack - 1 - i))
      return d.toISOString().split('T')[0] || ''
    })

    let currentCash = 10000 
    
    return dates.map(dateStr => {
      let inflow = 0
      let outflow = 0

      registers.forEach((reg: DailyRegister) => {
        if (reg.transactions) {
          reg.transactions.forEach((tx: CashTransaction) => {
            if (tx.timestamp && tx.timestamp.startsWith(dateStr)) {
              if (tx.type === 'sale') {
                inflow += tx.amount
              } else if (tx.type === 'cash_in' || tx.type === 'credit_payment') {
                inflow += tx.amount
              } else if (tx.type === 'expense' || tx.type === 'cash_out') {
                outflow += tx.amount
              }
            }
          })
        }
      })

      expenses.forEach(exp => {
        if (exp.date === dateStr) {
          outflow += exp.amount
        }
      })

      currentCash += (inflow - outflow)

      const displayDate = dateStr.slice(5)
      return {
        date: locale === 'bn' ? convertToBanglaNumerals(displayDate) : displayDate,
        inflow,
        outflow,
        balance: currentCash
      }
    })
  }, [registers, expenses, dateRange, locale])

  const cashFlowForecastSeries = useMemo(() => {
    const lastBalance = cashFlowSeries[cashFlowSeries.length - 1]?.balance ?? 10000
    const averageDailyInflow = cashFlowSeries.reduce((acc, curr) => acc + curr.inflow, 0) / cashFlowSeries.length || 500
    const averageDailyOutflow = cashFlowSeries.reduce((acc, curr) => acc + curr.outflow, 0) / cashFlowSeries.length || 300
    const netDailyFlow = averageDailyInflow - averageDailyOutflow

    return Array.from({ length: 7 }).map((_, i) => {
      const d = new Date()
      d.setDate(d.getDate() + i + 1)
      const projectedBalance = Math.round(lastBalance + (netDailyFlow * (i + 1)) + Math.sin(i) * 200)
      const label = d.toLocaleDateString(t("en-US"), { weekday: 'short' })
      return {
        date: label,
        balance: projectedBalance
      }
    })
  }, [cashFlowSeries, t])

  const handleExport = () => {
    // Fake export
    const a = document.createElement('a')
    a.href = 'data:text/plain;charset=utf-8,' + encodeURIComponent('Finance Report Export\n...')
    a.download = `finance_report_${dateRange}.csv`
    a.click()
  }

  return (
    <div className="grid gap-6">
      <div className="glass bg-surface-strong/60 backdrop-blur-3xl rounded-3xl p-6 xl:p-8 shadow-[0_8px_40px_rgb(0,0,0,0.10)] border border-line/40 relative overflow-hidden">
        {/* Subtle gradient backdrop */}
        <div className="absolute inset-0 bg-gradient-to-br from-accent/5 via-transparent to-focus/5 pointer-events-none" />
        <header className="relative flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-line pb-6 mb-6">
          <div>
            <h2 className="font-heading text-2xl font-black text-ink flex items-center gap-3">
              <span className="p-2 rounded-xl bg-accent/10 border border-accent/20">
                <Calculator className="text-accent" size={22} />
              </span>
              {t(`Finance & Accounting`)}
            </h2>
            <p className="text-sm text-ink-soft mt-1.5">
              {t(`Profit & Loss, Operational Expenses, and Tax summaries.`)}
            </p>
          </div>
          
          <div className="flex items-center gap-2">
            <select
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value as 'today' | 'week' | 'month' | 'year')}
              className="rounded-xl border border-line bg-surface px-4 py-2 text-sm font-bold shadow-sm focus:outline-none focus:border-accent focus:ring-2 focus:ring-accent/20 transition-shadow"
            >
              <option value="today">{t(`Today`)}</option>
              <option value="week">{t(`This Week`)}</option>
              <option value="month">{t(`This Month`)}</option>
              <option value="year">{t(`This Year`)}</option>
            </select>
            <button
              onClick={handleExport}
              className="inline-flex items-center gap-2 rounded-xl border border-line bg-surface px-4 py-2 text-sm font-bold shadow-sm hover:-translate-y-0.5 hover:shadow-md hover:border-accent/40 transition-all duration-200 active:scale-95"
            >
              <Download size={16} />
              {t(`Export`)}
            </button>
          </div>
        </header>

        {/* Executive Summary Cards */}
        <div className="relative grid gap-4 md:grid-cols-5 mb-8">
          <div className="group p-5 rounded-2xl bg-surface/80 backdrop-blur-sm border border-line shadow-sm hover:-translate-y-1 hover:shadow-[0_8px_24px_rgb(0,0,0,0.07)] hover:border-accent/30 transition-all duration-300 cursor-default">
            <p className="text-[10px] font-black uppercase tracking-wider text-ink-soft mb-2">{t(`Gross Revenue`)}</p>
            <p className="text-3xl font-heading font-black text-ink group-hover:text-accent transition-colors duration-300">{currencySymbol}{tNum(totalRevenue.toLocaleString(undefined, { maximumFractionDigits: 0 }))}</p>
            <div className="mt-2 h-0.5 w-0 group-hover:w-full bg-gradient-to-r from-accent to-accent/30 transition-all duration-500 rounded-full" />
          </div>
          <div className="group p-5 rounded-2xl bg-surface/80 backdrop-blur-sm border border-line shadow-sm hover:-translate-y-1 hover:shadow-[0_8px_24px_rgb(0,0,0,0.07)] hover:border-danger/30 transition-all duration-300 cursor-default">
            <p className="text-[10px] font-black uppercase tracking-wider text-ink-soft mb-2">{t(`Total Costs`)}</p>
            <p className="text-3xl font-heading font-black text-danger">{currencySymbol}{tNum((totalCOGS + totalOperatingExpenses).toLocaleString(undefined, { maximumFractionDigits: 0 }))}</p>
            <div className="mt-2 h-0.5 w-0 group-hover:w-full bg-gradient-to-r from-danger to-danger/30 transition-all duration-500 rounded-full" />
          </div>
          <div className="group p-5 rounded-2xl bg-surface/80 backdrop-blur-sm border border-line shadow-sm hover:-translate-y-1 hover:shadow-[0_8px_24px_rgb(0,0,0,0.07)] hover:border-warning/30 transition-all duration-300 cursor-default">
            <p className="text-[10px] font-black uppercase tracking-wider text-ink-soft mb-2">{t(`Tax Collected`)}</p>
            <p className="text-3xl font-heading font-black text-warning">{currencySymbol}{tNum(totalTax.toLocaleString(undefined, { maximumFractionDigits: 0 }))}</p>
            <div className="mt-2 h-0.5 w-0 group-hover:w-full bg-gradient-to-r from-warning to-warning/30 transition-all duration-500 rounded-full" />
          </div>
          <div className={`group p-5 rounded-2xl border shadow-sm hover:-translate-y-1 hover:shadow-[0_8px_24px_rgb(0,0,0,0.07)] transition-all duration-300 cursor-default ${netProfit >= 0 ? 'bg-success/10 border-success/30 hover:border-success/60' : 'bg-danger/10 border-danger/30 hover:border-danger/60'}`}>
            <p className="text-[10px] font-black uppercase tracking-wider text-ink-soft mb-2">{t(`Net Profit`)}</p>
            <p className={`text-3xl font-heading font-black ${netProfit >= 0 ? 'text-success' : 'text-danger'}`}>
              {currencySymbol}{tNum(netProfit.toLocaleString(undefined, { maximumFractionDigits: 0 }))}
            </p>
            <div className={`mt-2 h-0.5 w-0 group-hover:w-full transition-all duration-500 rounded-full ${netProfit >= 0 ? 'bg-gradient-to-r from-success to-success/30' : 'bg-gradient-to-r from-danger to-danger/30'}`} />
          </div>
          <div className="group p-5 rounded-2xl border border-indigo-500/30 bg-indigo-500/10 shadow-sm hover:-translate-y-1 hover:shadow-[0_8px_24px_rgba(99,102,241,0.15)] transition-all duration-300 cursor-default">
            <p className="text-[10px] font-black uppercase tracking-wider text-indigo-500/80 mb-2">{t(`30-Day Forecast`)}</p>
            <p className="text-3xl font-heading font-black text-indigo-500">
              {currencySymbol}{tNum(((totalRevenue / (dateRange === 'today' ? 1 : dateRange === 'week' ? 7 : dateRange === 'month' ? 30 : 365)) * 30).toLocaleString(undefined, { maximumFractionDigits: 0 }))}
            </p>
            <div className="mt-2 h-0.5 w-0 group-hover:w-full bg-gradient-to-r from-indigo-500 to-indigo-500/30 transition-all duration-500 rounded-full" />
          </div>
        </div>

        {/* Budget Goal Gradient Tracker */}
        {(() => {
          const budgetLimit = 50000
          const currentOpex = totalOperatingExpenses
          const budgetPct = Math.min(100, (currentOpex / budgetLimit) * 100)
          const isNearLimit = budgetPct >= 80
          return (
            <div className="p-5 rounded-2xl border border-line bg-surface/50 backdrop-blur-sm shadow-sm mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex-1">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-ink-soft">
                    {t(`Monthly Expense Budget Goal Tracker`)}
                  </span>
                  <span className={`text-xs font-bold ${isNearLimit ? 'text-danger font-black animate-pulse' : 'text-accent'}`}>
                    {tNum(currentOpex.toLocaleString())} / {tNum(budgetLimit.toLocaleString())} {currencySymbol} ({tNum(Math.round(budgetPct))}%)
                  </span>
                </div>
                <div className="w-full h-3 bg-surface-strong rounded-full overflow-hidden border border-line/30 relative">
                  <div 
                    className={`h-full rounded-full transition-all duration-1000 ${isNearLimit ? 'bg-gradient-to-r from-danger to-orange-500' : 'bg-gradient-to-r from-accent to-emerald-500'}`}
                    style={{ width: `${budgetPct}%` }}
                  />
                </div>
              </div>
              <div className="md:w-64 shrink-0 flex flex-col justify-center text-xs">
                {budgetPct < 100 ? (
                  <p className="text-ink-soft font-medium">
                    🎯 {t("Cooperative Goal:")} {t("Keep opex under budget.")} {t("Remaining limit:")} <span className="font-bold text-success">{currencySymbol}{tNum(Math.max(0, budgetLimit - currentOpex).toLocaleString())}</span>
                  </p>
                ) : (
                  <p className="text-danger font-bold">
                    ⚠️ {t("Warning: Monthly budget limit exceeded!")}
                  </p>
                )}
              </div>
            </div>
          )
        })()}

        {/* Tab Navigation */}
        <div className="flex gap-4 mb-6 border-b border-line overflow-x-auto no-scrollbar">
          <button 
            onClick={() => setActiveTab('pnl')}
            className={`pb-3 font-bold text-sm transition-colors border-b-2 shrink-0 ${activeTab === 'pnl' ? 'border-accent text-accent' : 'border-transparent text-ink-soft hover:text-ink'}`}
          >
            {t(`Profit & Loss`)}
          </button>
          <button 
            onClick={() => setActiveTab('ledger')}
            className={`pb-3 font-bold text-sm transition-colors border-b-2 flex items-center gap-2 shrink-0 ${activeTab === 'ledger' ? 'border-accent text-accent' : 'border-transparent text-ink-soft hover:text-ink'}`}
          >
            <BookOpen size={16} />
            {t(`General Ledger`)}
          </button>
          <button 
            onClick={() => setActiveTab('till')}
            className={`pb-3 font-bold text-sm transition-colors border-b-2 flex items-center gap-2 shrink-0 ${activeTab === 'till' ? 'border-accent text-accent' : 'border-transparent text-ink-soft hover:text-ink'}`}
          >
            <Clock size={16} />
            {t(`Till & Register`)}
          </button>
          <button 
            onClick={() => setActiveTab('cashflow')}
            className={`pb-3 font-bold text-sm transition-colors border-b-2 flex items-center gap-2 shrink-0 ${activeTab === 'cashflow' ? 'border-accent text-accent' : 'border-transparent text-ink-soft hover:text-ink'}`}
          >
            <ArrowRightLeft size={16} />
            {t(`Cash Flow & Forecast`)}
          </button>
        </div>

        {activeTab === 'pnl' && (
          <div className="grid lg:grid-cols-2 gap-8 animate-fade-in">
            {/* Detailed Breakdown */}
            <div>
              <h3 className="font-heading text-lg font-bold mb-4">{t(`Profit & Loss Statement`)}</h3>
              <div className="bg-surface rounded-2xl border border-line overflow-hidden">
                <div className="flex justify-between items-center p-4 border-b border-line/50">
                  <span className="flex items-center gap-2 text-sm font-bold"><TrendingUp size={16} className="text-success" /> Revenue (Sales)</span>
                  <span className="font-mono font-bold">{currencySymbol}{tNum(totalRevenue.toLocaleString(undefined, { maximumFractionDigits: 0 }))}</span>
                </div>
                <div className="flex justify-between items-center p-4 border-b border-line/50 bg-danger/5">
                  <span className="flex items-center gap-2 text-sm font-bold text-danger"><Package size={16} /> Cost of Goods Sold (COGS)</span>
                  <span className="font-mono font-bold text-danger">-{currencySymbol}{tNum(totalCOGS.toLocaleString(undefined, { maximumFractionDigits: 0 }))}</span>
                </div>
                <div className="flex justify-between items-center p-4 border-b border-line font-bold bg-surface-strong">
                  <span className="text-sm">Gross Profit</span>
                  <span className="font-mono">{currencySymbol}{tNum(grossProfit.toLocaleString(undefined, { maximumFractionDigits: 0 }))}</span>
                </div>
                <div className="flex justify-between items-center p-4 border-b border-line/50 bg-danger/5">
                  <span className="flex items-center gap-2 text-sm font-bold text-danger"><TrendingDown size={16} /> Operating Expenses</span>
                  <span className="font-mono font-bold text-danger">-{currencySymbol}{tNum(totalOperatingExpenses.toLocaleString(undefined, { maximumFractionDigits: 0 }))}</span>
                </div>
                <div className={`flex justify-between items-center p-4 font-black text-lg ${netProfit >= 0 ? 'bg-success/20 text-success-dark' : 'bg-danger/20 text-danger-dark'}`}>
                  <span>Net Profit (Loss)</span>
                  <span className="font-mono">{currencySymbol}{tNum(netProfit.toLocaleString(undefined, { maximumFractionDigits: 0 }))}</span>
                </div>
              </div>
            </div>

            {/* Quick Actions / Explanations */}
            <div className="space-y-4">
              <h3 className="font-heading text-lg font-bold mb-4">{t(`Tax & Compliance`)}</h3>
              
              <div className="p-5 rounded-2xl bg-surface border border-line shadow-sm flex gap-4">
                <div className="shrink-0 mt-1">
                  <CheckCircle2 className="text-success" size={24} />
                </div>
                <div>
                  <h4 className="font-bold text-ink">Ready for Filing</h4>
                  <p className="text-sm text-ink-soft mt-1 leading-relaxed">
                    You have collected <strong>{currencySymbol}{tNum(totalTax.toLocaleString(undefined, { maximumFractionDigits: 0 }))}</strong> in Output VAT during this period. You can deduct your Input VAT (recorded in Supply Chain) before submitting to the local tax authority.
                  </p>
                  <button className="mt-3 text-xs font-bold text-accent hover:underline">Download NBR Tax Form (Draft)</button>
                </div>
              </div>

              <div className="p-5 rounded-2xl bg-accent/5 border border-accent/20 shadow-sm flex gap-4 mt-4">
                <div className="shrink-0 mt-1">
                  <DollarSign className="text-accent" size={24} />
                </div>
                <div>
                  <h4 className="font-bold text-ink">Capital Entry / Withdrawal</h4>
                  <p className="text-sm text-ink-soft mt-1 leading-relaxed">
                    Record owner drawings or capital injections directly to adjust your balance sheet.
                  </p>
                  <button className="mt-3 px-4 py-2 bg-accent text-white rounded-xl text-xs font-black shadow-sm hover:shadow-md transition-all">Add Journal Entry</button>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'ledger' && (
          <div className="bg-surface rounded-2xl border border-line overflow-hidden shadow-sm animate-fade-in">
            <div className="p-4 bg-surface-strong border-b border-line flex items-center gap-3">
              <ScrollText className="text-accent" size={20} />
              <h3 className="font-heading font-bold">{t(`Double-Entry Journal`)}</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="text-xs uppercase bg-surface-strong text-ink-soft border-b border-line">
                  <tr>
                    <th className="px-6 py-4 font-bold">Date & Description</th>
                    <th className="px-6 py-4 font-bold">Account</th>
                    <th className="px-6 py-4 text-right font-bold">Debit (DR)</th>
                    <th className="px-6 py-4 text-right font-bold">Credit (CR)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line/40">
                  {journalEntries.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="px-6 py-8 text-center text-ink-soft italic">No journal entries found for this period.</td>
                    </tr>
                  ) : journalEntries.map((entry) => (
                    <tr key={entry.id} className="hover:bg-accent/5 transition-colors">
                      <td className="px-6 py-4 font-medium align-top">
                        <div className="text-ink">{entry.description}</div>
                        <div className="text-[10px] text-ink-soft mt-1">{tNum(new Date(entry.date).toLocaleString(t("en-US")))}</div>
                      </td>
                      <td className="px-6 py-4 align-top">
                        <div className="space-y-1">
                          {entry.debits.map((dr, i) => <div key={'dr'+i} className="font-bold">{dr.account}</div>)}
                          {entry.credits.map((cr, i) => <div key={'cr'+i} className="pl-4 text-ink-soft">{cr.account}</div>)}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right align-top font-mono text-xs">
                        <div className="space-y-1">
                          {entry.debits.map((dr, i) => <div key={'dr'+i}>{currencySymbol}{tNum(dr.amount.toLocaleString())}</div>)}
                          {entry.credits.map((_, i) => <div key={'cr'+i} className="opacity-0">-</div>)}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right align-top font-mono text-xs">
                        <div className="space-y-1">
                          {entry.debits.map((_, i) => <div key={'dr'+i} className="opacity-0">-</div>)}
                          {entry.credits.map((cr, i) => <div key={'cr'+i}>{currencySymbol}{tNum(cr.amount.toLocaleString())}</div>)}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'till' && (
          <div className="space-y-6 animate-fade-in">
            {/* Daily Till Controls */}
            {!todayRegister ? (
              <div className="p-8 text-center rounded-2xl border border-dashed border-line/80 bg-surface/50 max-w-md mx-auto space-y-4">
                <div className="flex size-16 items-center justify-center rounded-2xl bg-accent/10 text-accent mx-auto">
                  <Clock size={32} />
                </div>
                <div>
                  <h3 className="font-heading text-lg font-bold text-ink">{t(`Register is Closed`)}</h3>
                  <p className="text-xs text-ink-soft mt-1 leading-relaxed">
                    {t(`To begin sales or log transactions, please open today's register drawer.`)}
                  </p>
                </div>
                <button
                  onClick={() => setShowOpenRegisterModal(true)}
                  className="px-6 py-3 bg-accent text-surface rounded-xl font-black text-sm shadow-[0_4px_20px_rgba(var(--color-accent),0.3)] hover:bg-accent/90 transition-all animate-bounce"
                >
                  {t(`Open Register Drawer`)}
                </button>
              </div>
            ) : todayRegister.status === 'closed' ? (
              <div className="space-y-6">
                <div className="p-6 rounded-2xl bg-danger/5 border border-danger/20 flex items-start gap-4">
                  <ShieldAlert className="text-danger shrink-0 mt-0.5" size={24} />
                  <div>
                    <h4 className="font-bold text-danger">{t('Register Closed (Shift Ended)')}</h4>
                    <p className="text-xs text-ink-soft mt-1 leading-relaxed">
                      {t("Today's cash register drawer is locked. You cannot perform checkouts until the next shift is opened.")}
                    </p>
                  </div>
                </div>

                {/* Z-Report Summary Card */}
                <div className="glass bg-surface rounded-3xl p-6 border border-line shadow-sm">
                  <h3 className="font-heading font-black text-lg text-ink border-b border-line pb-4 mb-4 flex items-center gap-2">
                    <ScrollText className="text-accent" size={18} />
                    {t('Shift Z-Report Summary')}
                  </h3>

                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                    <div className="bg-surface-strong p-4 rounded-xl border border-line/30">
                      <p className="text-[10px] font-black uppercase text-ink-soft">{t('Opening Balance')}</p>
                      <p className="text-2xl font-black mt-1">{currencySymbol}{tNum(todayRegister.openingBalance.toLocaleString())}</p>
                    </div>
                    <div className="bg-surface-strong p-4 rounded-xl border border-line/30">
                      <p className="text-[10px] font-black uppercase text-ink-soft">{t('Counted Closing Cash')}</p>
                      <p className="text-2xl font-black mt-1 text-success">{currencySymbol}{tNum((todayRegister.closingBalance || 0).toLocaleString())}</p>
                    </div>
                    <div className="bg-surface-strong p-4 rounded-xl border border-line/30">
                      <p className="text-[10px] font-black uppercase text-ink-soft">{t('Net Transactions')}</p>
                      {(() => {
                        const sales = todayRegister.transactions?.filter(t => t.type === 'sale') || []
                        const totalSales = sales.reduce((a, b) => a + b.amount, 0)
                        return (
                          <p className="text-2xl font-black mt-1 text-accent">{currencySymbol}{tNum(totalSales.toLocaleString())}</p>
                        )
                      })()}
                    </div>
                    <div className="bg-surface-strong p-4 rounded-xl border border-line/30">
                      <p className="text-[10px] font-black uppercase text-ink-soft">{t('Discrepancy (Over/Short)')}</p>
                      {(() => {
                        const sales = todayRegister.transactions?.filter(t => t.type === 'sale') || []
                        const cashSales = sales.filter(s => s.paymentMethod === 'cash').reduce((a, b) => a + b.amount, 0)
                        const expected = todayRegister.openingBalance + cashSales
                        const diff = (todayRegister.closingBalance || 0) - expected
                        return (
                          <p className={`text-2xl font-black mt-1 ${diff >= 0 ? 'text-success' : 'text-danger'}`}>
                            {diff >= 0 ? '+' : ''}{currencySymbol}{tNum(diff.toLocaleString())}
                          </p>
                        )
                      })()}
                    </div>
                  </div>

                  <div className="mt-6 border-t border-line/40 pt-4 flex justify-between">
                    <span className="text-xs text-ink-soft font-bold">
                      {t('Closed at:')} {(() => {
                        const raw = todayRegister.updatedAt as { toDate?: () => Date } | string | number | Date | null | undefined
                        const dt = raw
                          ? (typeof raw === 'object' && 'toDate' in raw && typeof raw.toDate === 'function'
                              ? raw.toDate()
                              : new Date(raw as string | number | Date))
                          : new Date()
                        return tNum(dt.toLocaleString())
                      })()}
                    </span>
                    <button
                      onClick={() => {
                        window.print()
                      }}
                      className="px-4 py-2 rounded-xl bg-surface-strong border border-line hover:border-accent text-xs font-black"
                    >
                      {t('Print Z-Report')}
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              // Drawer is currently open
              <div className="space-y-6">
                <div className="glass bg-surface rounded-3xl p-6 border border-line shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                  <div>
                    <h3 className="font-heading text-lg font-black text-ink flex items-center gap-2">
                      <span className="relative flex h-2.5 w-2.5">
                        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-success opacity-75"></span>
                        <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-success"></span>
                      </span>
                      {t('Register Drawer is Open')}
                    </h3>
                    <p className="text-xs text-ink-soft mt-1 leading-relaxed">
                      {t('Opening Cash Balance:')} <span className="font-bold text-ink">{currencySymbol}{tNum(todayRegister.openingBalance.toLocaleString())}</span>
                    </p>
                  </div>

                  <button
                    onClick={() => {
                      const sales = todayRegister.transactions?.filter(t => t.type === 'sale') || []
                      const totalSales = sales.reduce((a, b) => a + b.amount, 0)
                      const cashSales = sales.filter(s => s.paymentMethod === 'cash').reduce((a, b) => a + b.amount, 0)
                      const gatewaySales = sales.filter(s => s.paymentMethod !== 'cash' && s.paymentMethod !== 'credit').reduce((a, b) => a + b.amount, 0)
                      const expectedCash = todayRegister.openingBalance + cashSales
                      
                      setZReportData({
                        openingBalance: todayRegister.openingBalance,
                        totalSales,
                        totalExpenses: 0,
                        cashSales,
                        gatewaySales,
                        expectedCash
                      })
                      setShowCloseRegisterModal(true)
                    }}
                    className="px-5 py-2.5 bg-danger text-surface rounded-xl text-xs font-black shadow-sm hover:bg-danger/90 transition-all active:scale-95"
                  >
                    {t('Close Register Drawer (Z-Report)')}
                  </button>
                </div>

                {/* Today's Transactions Log */}
                <div className="bg-surface rounded-2xl border border-line overflow-hidden shadow-sm">
                  <div className="p-4 bg-surface-strong border-b border-line flex items-center gap-3">
                    <ScrollText className="text-accent" size={20} />
                    <h3 className="font-heading font-bold">{t(`Today's Transactions`)}</h3>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                      <thead className="text-xs uppercase bg-surface-strong text-ink-soft border-b border-line">
                        <tr>
                          <th className="px-6 py-4 font-bold">Receipt</th>
                          <th className="px-6 py-4 font-bold">Cashier</th>
                          <th className="px-6 py-4 font-bold">Payment Method</th>
                          <th className="px-6 py-4 text-right font-bold">Amount</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-line/40">
                        {!todayRegister.transactions || todayRegister.transactions.length === 0 ? (
                          <tr>
                            <td colSpan={4} className="px-6 py-8 text-center text-ink-soft italic">{t('No transactions recorded today yet.')}</td>
                          </tr>
                        ) : todayRegister.transactions.map((tx) => (
                          <tr key={tx.id} className="hover:bg-accent/5 transition-colors">
                            <td className="px-6 py-4 font-medium">
                              <div className="text-ink font-bold">{tx.note || 'POS Sale'}</div>
                              <div className="text-[10px] text-ink-soft mt-0.5">{tNum(new Date(tx.timestamp).toLocaleTimeString())}</div>
                            </td>
                            <td className="px-6 py-4 text-ink-soft font-bold">
                              {tx.cashierName || t('Store Owner')}
                            </td>
                            <td className="px-6 py-4">
                              <span className="capitalize bg-surface-strong px-2 py-0.5 rounded text-[10px] font-bold border border-line">
                                {tx.paymentMethod}
                              </span>
                            </td>
                            <td className="px-6 py-4 text-right font-mono font-bold text-accent">
                              {currencySymbol}{tNum(tx.amount.toLocaleString())}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* Modal: Open Register */}
            {showOpenRegisterModal && (
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-surface-strong/80 p-4 backdrop-blur-sm animate-fade-in">
                <div className="w-full max-w-sm rounded-2xl border border-line bg-surface p-6 shadow-premium">
                  <h3 className="font-heading text-lg font-bold">
                    {t(`Open Cash Drawer`)}
                  </h3>
                  <p className="mt-1 text-xs text-ink-soft">
                    {t(`Input the starting cash amount currently in the drawer to balance the till.`)}
                  </p>
                  
                  <form onSubmit={async (e) => {
                    e.preventDefault()
                    const balance = parseFloat(openingBalanceInput) || 0
                    try {
                      await openRegister(balance)
                      toast(t('Register Opened'), t('Cash drawer is ready for transactions.'), 'success')
                      setShowOpenRegisterModal(false)
                      setOpeningBalanceInput('')
                    } catch (err) {
                      console.error(err)
                      toast('Error', 'Failed to open register', 'error')
                    }
                  }} className="mt-4 flex flex-col gap-4">
                    <div>
                      <label className="text-xs font-black text-ink-soft">{t(`Opening Cash Balance`)}</label>
                      <input
                        type="number"
                        required
                        min={0}
                        value={openingBalanceInput}
                        onChange={(e) => setOpeningBalanceInput(e.target.value)}
                        placeholder={`${currencySymbol}0`}
                        className="mt-1 w-full rounded-xl border border-line bg-surface px-4 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-accent"
                      />
                    </div>
                    <div className="flex justify-end gap-2 mt-2">
                      <button
                        type="button"
                        onClick={() => setShowOpenRegisterModal(false)}
                        className="rounded-xl border border-line bg-surface px-4 py-2 text-xs font-bold text-ink hover:bg-muted"
                      >
                        {t(`Cancel`)}
                      </button>
                      <button
                        type="submit"
                        className="rounded-xl bg-accent px-5 py-2 text-xs font-black text-surface shadow-glow"
                      >
                        {t(`Open Register`)}
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}

            {/* Modal: Close Register (Z-Report) */}
            {showCloseRegisterModal && zReportData && (
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-surface-strong/80 p-4 backdrop-blur-sm animate-fade-in">
                <div className="w-full max-w-md rounded-2xl border border-line bg-surface p-6 shadow-premium max-h-[90vh] overflow-y-auto">
                  <h3 className="font-heading text-lg font-bold border-b border-line pb-2 mb-4">
                    {t(`Register Z-Report & Drawer Closing`)}
                  </h3>
                  
                  <div className="space-y-3 text-xs leading-relaxed text-ink-soft">
                    <div className="flex justify-between border-b border-line/30 pb-1.5">
                      <span>{t('Opening Cash:')}</span>
                      <span className="font-bold text-ink">{currencySymbol}{tNum(zReportData.openingBalance.toLocaleString())}</span>
                    </div>
                    <div className="flex justify-between border-b border-line/30 pb-1.5">
                      <span>{t('Total POS Sales:')}</span>
                      <span className="font-bold text-ink">{currencySymbol}{tNum(zReportData.totalSales.toLocaleString())}</span>
                    </div>
                    <div className="flex justify-between border-b border-line/30 pb-1.5">
                      <span>{t('Cash Sales:')}</span>
                      <span className="font-bold text-ink">{currencySymbol}{tNum(zReportData.cashSales.toLocaleString())}</span>
                    </div>
                    <div className="flex justify-between border-b border-line/30 pb-1.5">
                      <span>{t('Mobile Gateway Sales:')}</span>
                      <span className="font-bold text-ink">{currencySymbol}{tNum(zReportData.gatewaySales.toLocaleString())}</span>
                    </div>
                    <div className="flex justify-between font-black text-ink border-b border-line pb-1.5">
                      <span>{t('Expected Cash in Drawer:')}</span>
                      <span className="text-accent">{currencySymbol}{tNum(zReportData.expectedCash.toLocaleString())}</span>
                    </div>
                  </div>

                  <form onSubmit={async (e) => {
                    e.preventDefault()
                    const balance = parseFloat(closingBalanceInput) || 0
                    try {
                      await closeRegister(balance)
                      toast(t('Register Closed'), t('Z-Report generated successfully.'), 'success')
                      setShowCloseRegisterModal(false)
                      setClosingBalanceInput('')
                      setZReportData(null)
                    } catch (err) {
                      console.error(err)
                      toast('Error', 'Failed to close register', 'error')
                    }
                  }} className="mt-6 flex flex-col gap-4">
                    <div>
                      <label className="text-xs font-black text-ink">{t(`Counted Cash in Drawer`)}</label>
                      <input
                        type="number"
                        required
                        min={0}
                        value={closingBalanceInput}
                        onChange={(e) => setClosingBalanceInput(e.target.value)}
                        placeholder={`${currencySymbol} expected: ${zReportData.expectedCash}`}
                        className="mt-1.5 w-full rounded-xl border border-line bg-surface px-4 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-danger font-bold"
                      />
                    </div>
                    <div className="flex justify-end gap-2 mt-2">
                      <button
                        type="button"
                        onClick={() => {
                          setShowCloseRegisterModal(false)
                          setZReportData(null)
                        }}
                        className="rounded-xl border border-line bg-surface px-4 py-2 text-xs font-bold text-ink hover:bg-muted"
                      >
                        {t(`Cancel`)}
                      </button>
                      <button
                        type="submit"
                        className="rounded-xl bg-danger px-5 py-2 text-xs font-black text-surface shadow-glow"
                      >
                        {t(`Lock Drawer & End Shift`)}
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'cashflow' && (
          <div className="space-y-6 animate-fade-in">
            {/* Cash Flow quick overview cards */}
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="bg-surface p-5 rounded-2xl border border-line/60 shadow-sm">
                <p className="text-[10px] font-black uppercase text-ink-soft">{t('Total Inflow')}</p>
                <p className="text-2xl font-heading font-black text-success mt-1">
                  +{currencySymbol}{tNum(cashFlowSeries.reduce((a, b) => a + b.inflow, 0).toLocaleString())}
                </p>
              </div>
              <div className="bg-surface p-5 rounded-2xl border border-line/60 shadow-sm">
                <p className="text-[10px] font-black uppercase text-ink-soft">{t('Total Outflow')}</p>
                <p className="text-2xl font-heading font-black text-danger mt-1">
                  -{currencySymbol}{tNum(cashFlowSeries.reduce((a, b) => a + b.outflow, 0).toLocaleString())}
                </p>
              </div>
              <div className="bg-surface p-5 rounded-2xl border border-line/60 shadow-sm">
                <p className="text-[10px] font-black uppercase text-ink-soft">{t('Net Cash Flow')}</p>
                {(() => {
                  const inflow = cashFlowSeries.reduce((a, b) => a + b.inflow, 0)
                  const outflow = cashFlowSeries.reduce((a, b) => a + b.outflow, 0)
                  const diff = inflow - outflow
                  return (
                    <p className={`text-2xl font-heading font-black mt-1 ${diff >= 0 ? 'text-success' : 'text-danger'}`}>
                      {diff >= 0 ? '+' : ''}{currencySymbol}{tNum(diff.toLocaleString())}
                    </p>
                  )
                })()}
              </div>
            </div>

            <div className="grid lg:grid-cols-2 gap-6">
              {/* Daily Cash Flow Trend Chart */}
              <div className="glass bg-surface rounded-3xl p-6 border border-line shadow-sm">
                <h3 className="font-heading font-black text-base text-ink mb-4">{t('Daily Cash Inflow & Outflow')}</h3>
                <div className="h-64 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={cashFlowSeries} margin={{ top: 10, right: 0, left: -20, bottom: 0 }}>
                      <defs>
                        <linearGradient id="colorInflow" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="rgb(var(--color-success))" stopOpacity={0.4}/>
                          <stop offset="95%" stopColor="rgb(var(--color-success))" stopOpacity={0}/>
                        </linearGradient>
                        <linearGradient id="colorOutflow" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="rgb(var(--color-danger))" stopOpacity={0.4}/>
                          <stop offset="95%" stopColor="rgb(var(--color-danger))" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgb(var(--color-line))" vertical={false} />
                      <XAxis dataKey="date" stroke="rgb(var(--color-ink-soft))" fontSize={10} tickLine={false} axisLine={false} />
                      <YAxis stroke="rgb(var(--color-ink-soft))" fontSize={10} tickLine={false} axisLine={false} />
                      <RechartsTooltip contentStyle={{ backgroundColor: 'rgb(var(--color-surface-strong))', border: '1px solid rgb(var(--color-line))', borderRadius: '12px' }} />
                      <Area type="monotone" dataKey="inflow" stroke="rgb(var(--color-success))" strokeWidth={2.5} fillOpacity={1} fill="url(#colorInflow)" />
                      <Area type="monotone" dataKey="outflow" stroke="rgb(var(--color-danger))" strokeWidth={2.5} fillOpacity={1} fill="url(#colorOutflow)" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Cumulative Balance Projection Chart */}
              <div className="glass bg-surface rounded-3xl p-6 border border-line shadow-sm">
                <h3 className="font-heading font-black text-base text-ink mb-4">{t('7-Day Cash Flow Forecast (Cumulative Balance)')}</h3>
                <div className="h-64 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={cashFlowForecastSeries} margin={{ top: 10, right: 0, left: -20, bottom: 0 }}>
                      <defs>
                        <linearGradient id="colorProjected" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="rgb(var(--color-accent))" stopOpacity={0.4}/>
                          <stop offset="95%" stopColor="rgb(var(--color-accent))" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgb(var(--color-line))" vertical={false} />
                      <XAxis dataKey="date" stroke="rgb(var(--color-ink-soft))" fontSize={10} tickLine={false} axisLine={false} />
                      <YAxis stroke="rgb(var(--color-ink-soft))" fontSize={10} tickLine={false} axisLine={false} />
                      <RechartsTooltip contentStyle={{ backgroundColor: 'rgb(var(--color-surface-strong))', border: '1px solid rgb(var(--color-line))', borderRadius: '12px' }} />
                      <Area type="monotone" dataKey="balance" stroke="rgb(var(--color-accent))" strokeWidth={3} fillOpacity={1} fill="url(#colorProjected)" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
