import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Truck, 
  Lightbulb, 
  Coffee, 
  Coins,
  Plus,
  Trash2,
  ShieldCheck,
  WalletCards
} from 'lucide-react'
import { useI18n } from '../i18n'
import { useExpenses } from '../hooks/useExpenses'

type ExpenseCategory = 'transport' | 'utility' | 'labor' | 'tea'

function isExpenseCategory(value: string): value is ExpenseCategory {
  return value === 'transport' || value === 'utility' || value === 'labor' || value === 'tea'
}

const expenseCategoryIcons = {
  transport: Truck,
  utility: Lightbulb,
  labor: Coins,
  tea: Coffee,
}

export function DiagnosticsPanel() {
  const { t, tNum } = useI18n()
  // Expenses state
  const { expenses, addExpense, removeExpense } = useExpenses()
  const [category, setCategory] = useState<ExpenseCategory>('transport')
  const [amount, setAmount] = useState('')
  const [note, setNote] = useState('')
  const [showExpenseForm, setShowExpenseForm] = useState(false)

  const handleAddExpense = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!amount) return

    await addExpense({
      id: Date.now().toString(),
      category,
      amount: parseFloat(amount) || 0,
      note: note || (t(`General expense`)),
      date: new Date().toISOString().slice(0, 10),
    })

    setAmount('')
    setNote('')
    setShowExpenseForm(false)
  }

  const totalExpense = expenses.reduce((sum, e) => sum + e.amount, 0)

  return (
    <div className="w-full max-w-2xl mx-auto mt-4">
      
      {/* Daily Expense Ledger Book */}
      <section className="glass rounded-2xl p-6 shadow-sm border border-line/45 flex flex-col justify-between">
        <div>
          <header className="flex items-center justify-between gap-3 border-b border-line pb-4 mb-4">
            <div className="flex items-center gap-3">
              <span className="grid size-10 place-items-center rounded-xl bg-accent/10 text-accent">
                <Coins size={18} />
              </span>
              <div>
                <h3 className="font-heading text-lg font-extrabold tracking-tight">
                  {t(`Daily Expense Book`)}
                </h3>
                <p className="text-xs text-ink-soft">
                  {t(`Monitor shop expenditures and utility payouts.`)}
                </p>
              </div>
            </div>
            
            <button
              onClick={() => setShowExpenseForm(!showExpenseForm)}
              className="inline-flex size-9 items-center justify-center rounded-xl bg-accent text-surface shadow-glow transition-all hover:scale-105 active:scale-95 shrink-0"
              title={t(`Add new expense`)}
            >
              <Plus size={16} />
            </button>
          </header>

          {/* Add Expense Form */}
          <AnimatePresence>
            {showExpenseForm && (
              <motion.form
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                onSubmit={handleAddExpense}
                className="rounded-xl bg-surface-strong/60 border border-line p-4 mb-4 grid gap-3"
              >
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-black text-ink-soft uppercase">{t(`Category`)}</label>
                  <select
                    value={category}
                    onChange={(e) => {
                      if (isExpenseCategory(e.target.value)) {
                        setCategory(e.target.value)
                      }
                    }}
                    className="rounded-xl border border-line bg-surface px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-accent"
                  >
                    <option value="transport">{t(`Transport / Shipping`)}</option>
                    <option value="utility">{t(`Utility Bill`)}</option>
                    <option value="labor">{t(`Labor Wages`)}</option>
                    <option value="tea">{t(`Tea & Entertainment`)}</option>
                  </select>
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-black text-ink-soft uppercase">{t(`Expense (৳)`)}</label>
                  <input
                    type="number"
                    required
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="৳০"
                    className="rounded-xl border border-line bg-surface px-3 py-2 text-xs focus:outline-none"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-black text-ink-soft uppercase">{t(`Notes / Remarks`)}</label>
                  <input
                    type="text"
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    placeholder={t(`e.g. Electric bill`)}
                    className="rounded-xl border border-line bg-surface px-3 py-2 text-xs focus:outline-none"
                  />
                </div>
                <div className="flex justify-end gap-2 mt-1">
                  <button
                    type="button"
                    onClick={() => setShowExpenseForm(false)}
                    className="rounded-xl border border-line bg-surface px-3 py-1.5 text-[10px] font-bold text-ink hover:bg-muted"
                  >
                    {t(`Cancel`)}
                  </button>
                  <button
                    type="submit"
                    className="rounded-xl bg-accent px-4 py-1.5 text-[10px] font-black text-surface shadow-glow"
                  >
                    {t(`Add Cost`)}
                  </button>
                </div>
              </motion.form>
            )}
          </AnimatePresence>

          {/* Aggregate Expense Display */}
          <div className="rounded-2xl bg-surface-strong/60 border border-line p-4 mb-5 flex items-center justify-between shadow-sm">
            <div>
              <p className="text-[10px] font-black uppercase text-ink-soft tracking-wider leading-none">{t(`Today Total Outlay`)}</p>
              <p className="text-2xl font-heading font-black text-accent mt-1.5 leading-none">৳{tNum(totalExpense.toLocaleString())}</p>
            </div>
            <span className="inline-flex items-center gap-1.5 rounded-xl bg-accent/15 px-3 py-2 text-[10px] font-black text-accent border border-accent/10">
              <ShieldCheck size={12} /> {t(`Local Vault`)}
            </span>
          </div>

          {/* Expenses List */}
          <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
            {expenses.map((exp) => {
              const Icon = expenseCategoryIcons[exp.category as keyof typeof expenseCategoryIcons] || WalletCards

              return (
                <article
                  key={exp.id}
                  className="flex items-center justify-between gap-3 rounded-xl border border-line/65 bg-surface px-4 py-3 shadow-sm transition-all hover:border-accent/30"
                >
                  <div className="flex items-center gap-2.5">
                    <span className="grid size-9 place-items-center rounded-lg bg-muted text-ink-soft shrink-0">
                      <Icon size={14} />
                    </span>
                    <div>
                      <h4 className="font-heading text-xs sm:text-sm font-extrabold text-ink leading-tight">{exp.note}</h4>
                      <p className="text-[10px] text-ink-soft mt-1 leading-none">📅 {tNum(exp.date)}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <span className="font-heading text-sm sm:text-base font-black text-accent">৳{tNum(exp.amount.toLocaleString())}</span>
                    <button
                      onClick={() => void removeExpense(exp.id)}
                      className="inline-flex size-7 items-center justify-center rounded-lg bg-danger/10 text-danger border border-danger/10 hover:bg-danger hover:text-surface transition-colors shrink-0"
                      title={t(`Delete expense`)}
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                </article>
              )
            })}
          </div>
        </div>
      </section>
    </div>
  )
}
