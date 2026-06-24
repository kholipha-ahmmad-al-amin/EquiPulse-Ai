import { useMemo } from 'react'
import { useCustomerLedger, type CustomerCredit } from './useCustomerLedger'
import { useExpenses } from './useExpenses'
import { useInventory, type InventoryItem } from './useInventory'
import { useNetworkStatus } from './useNetworkStatus'
import { usePOSData } from './usePOSData'
import { useState, useEffect } from 'react'

export type PulseTone = 'accent' | 'danger' | 'focus' | 'success' | 'warning'

export type MerchantPulseAction = {
  id: string
  tone: PulseTone
  route: '/data' | '/inventory' | '/leaderboard' | '/metrics' | '/queue'
  metric: {
    en: string
    bn: string
  }
  title: {
    en: string
    bn: string
  }
  body: {
    en: string
    bn: string
  }
  cta: {
    en: string
    bn: string
  }
}

export type MerchantPulse = {
  actions: MerchantPulseAction[]
  lowStockItems: InventoryItem[]
  overdueCredits: CustomerCredit[]
  dueSoonCredits: CustomerCredit[]
  pendingCredits: CustomerCredit[]
  totalOutstanding: number
  totalStockValue: number
  todayExpenseTotal: number
  weeklyExpenseTotal: number
  hasPOSData: boolean
  isOnline: boolean
  isLoading: boolean
}

const DAY_MS = 24 * 60 * 60 * 1000

function startOfLocalDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate())
}

function toLocalDateKey(date: Date) {
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${date.getFullYear()}-${month}-${day}`
}

function parseLocalDate(value?: string) {
  if (!value) return null

  const date = /^\d{4}-\d{2}-\d{2}$/.test(value)
    ? new Date(`${value}T00:00:00`)
    : new Date(value)

  return Number.isNaN(date.getTime()) ? null : date
}

function daysUntil(value?: string, today = startOfLocalDay(new Date())) {
  const date = parseLocalDate(value)
  if (!date) return Number.POSITIVE_INFINITY
  return Math.floor((startOfLocalDay(date).getTime() - today.getTime()) / DAY_MS)
}

function sortByStockPressure(items: InventoryItem[]) {
  return [...items].sort((left, right) => {
    const leftRatio = left.minThreshold > 0 ? left.quantity / left.minThreshold : left.quantity
    const rightRatio = right.minThreshold > 0 ? right.quantity / right.minThreshold : right.quantity
    return leftRatio - rightRatio
  })
}

function sortByDuePressure(credits: CustomerCredit[]) {
  return [...credits].sort((left, right) => {
    const dueDelta = daysUntil(left.dueDate) - daysUntil(right.dueDate)
    if (dueDelta !== 0) return dueDelta
    return right.amount - left.amount
  })
}

export function useMerchantPulse(): MerchantPulse {
  const { credits, loading: loadingCredits } = useCustomerLedger()
  const { expenses, loading: loadingExpenses } = useExpenses()
  const { items, loading: loadingInventory } = useInventory()
  const { analysisResult, isProcessing } = usePOSData()
  const { isOnline } = useNetworkStatus()

  const [dynamicTasks, setDynamicTasks] = useState<MerchantPulseAction[]>([])
  const [decidedTasks, setDecidedTasks] = useState<Record<string, number>>({})

  useEffect(() => {
    const loadStorageState = () => {
      try {
        const dTasks = JSON.parse(window.localStorage.getItem('equipulse-dynamic-tasks') || '[]')
        setDynamicTasks(dTasks)
      } catch (e) {
        console.warn('Failed to parse dynamic tasks', e)
      }
      try {
        const decided = JSON.parse(window.localStorage.getItem('equipulse-decided-tasks') || '{}')
        setDecidedTasks(decided)
      } catch (e) {
        console.warn('Failed to parse decided tasks', e)
      }
    }
    
    loadStorageState()
    window.addEventListener('storage', loadStorageState)
    return () => window.removeEventListener('storage', loadStorageState)
  }, [])

  return useMemo(() => {
    const today = startOfLocalDay(new Date())
    const sevenDaysAgo = new Date(today.getTime() - 6 * DAY_MS)
    const todayIso = toLocalDateKey(today)

    const lowStockItems = sortByStockPressure(
      items.filter((item) => item.quantity <= item.minThreshold),
    )

    const pendingCredits = credits.filter((credit) => credit.status === 'pending')
    const overdueCredits = sortByDuePressure(
      pendingCredits.filter((credit) => daysUntil(credit.dueDate, today) < 0),
    )
    const dueSoonCredits = sortByDuePressure(
      pendingCredits.filter((credit) => {
        const dueInDays = daysUntil(credit.dueDate, today)
        return dueInDays >= 0 && dueInDays <= 3
      }),
    )

    const expiringSoonItems = items.filter(item => {
      if (!item.expiryDate) return false
      const days = daysUntil(item.expiryDate, today)
      return days >= 0 && days <= 30
    }).sort((a, b) => daysUntil(a.expiryDate!, today) - daysUntil(b.expiryDate!, today))

    const totalOutstanding = pendingCredits.reduce((sum, credit) => sum + credit.amount, 0)
    const totalStockValue = items.reduce(
      (sum, item) => sum + item.price * Math.max(0, item.quantity),
      0,
    )

    const todayExpenseTotal = expenses
      .filter((expense) => expense.date === todayIso)
      .reduce((sum, expense) => sum + expense.amount, 0)

    const weeklyExpenseTotal = expenses
      .filter((expense) => {
        const expenseDate = parseLocalDate(expense.date)
        return Boolean(expenseDate && expenseDate >= sevenDaysAgo && expenseDate <= today)
      })
      .reduce((sum, expense) => sum + expense.amount, 0)

    const actions: MerchantPulseAction[] = []
    const primaryLowStock = lowStockItems[0]
    const primaryOverdue = overdueCredits[0]
    const primaryDueSoon = dueSoonCredits[0]
    const primaryExpiring = expiringSoonItems[0]

    if (primaryExpiring) {
      actions.push({
        id: `expiry-soon-${primaryExpiring.id}`,
        tone: 'danger',
        route: '/inventory',
        metric: {
          en: `${expiringSoonItems.length} expiring`,
          bn: `${expiringSoonItems.length}টির মেয়াদ শেষ হচ্ছে`,
        },
        title: {
          en: `${primaryExpiring.name} expires in ${daysUntil(primaryExpiring.expiryDate, today)} days`,
          bn: `${primaryExpiring.name}-এর মেয়াদ ${daysUntil(primaryExpiring.expiryDate, today)} দিনের মধ্যে শেষ হবে`,
        },
        body: {
          en: `Consider discounting ${primaryExpiring.name} before the expiry date: ${primaryExpiring.expiryDate}.`,
          bn: `মেয়াদ শেষ হওয়ার আগেই ${primaryExpiring.name} ডিসকাউন্টে বিক্রির কথা ভাবুন। মেয়াদ: ${primaryExpiring.expiryDate}।`,
        },
        cta: {
          en: 'View inventory',
          bn: 'ইনভেন্টরি দেখুন',
        },
      })
    }

    if (!isOnline) {
      actions.push({
        id: 'offline-safe-mode',
        tone: 'success',
        route: '/queue',
        metric: {
          en: 'Offline safe',
          bn: 'অফলাইন সুরক্ষিত',
        },
        title: {
          en: 'Keep working, your shop data is being saved locally',
          bn: 'কাজ চালিয়ে যান, দোকানের ডাটা লোকালেই সেভ হচ্ছে',
        },
        body: {
          en: 'Inventory, khata, and decisions will sync again when internet returns.',
          bn: 'ইন্টারনেট ফিরলে ইনভেন্টরি, বাকির খাতা ও সিদ্ধান্ত আবার সিঙ্ক হবে।',
        },
        cta: {
          en: 'Review actions',
          bn: 'সিদ্ধান্ত দেখুন',
        },
      })
    }

    if (primaryLowStock) {
      const reorderQuantity = Math.max(
        Math.ceil(primaryLowStock.minThreshold * 2 - primaryLowStock.quantity),
        Math.ceil(primaryLowStock.minThreshold || 1),
      )

      actions.push({
        id: `stock-reorder-${primaryLowStock.id}`,
        tone: primaryLowStock.quantity <= primaryLowStock.minThreshold / 2 ? 'danger' : 'warning',
        route: '/inventory',
        metric: {
          en: `${lowStockItems.length} low`,
          bn: `${lowStockItems.length}টি কম`,
        },
        title: {
          en: `${primaryLowStock.name} can run out soon`,
          bn: `${primaryLowStock.name} দ্রুত শেষ হতে পারে`,
        },
        body: {
          en: `Only ${primaryLowStock.quantity} ${primaryLowStock.unit} is left. Order about ${reorderQuantity} ${primaryLowStock.unit} to reach a safer shelf level.`,
          bn: `হাতে আছে ${primaryLowStock.quantity} ${primaryLowStock.unit}। নিরাপদ স্টকে ফিরতে প্রায় ${reorderQuantity} ${primaryLowStock.unit} অর্ডার করুন।`,
        },
        cta: {
          en: 'Update stock',
          bn: 'স্টক আপডেট',
        },
      })
    }

    if (primaryOverdue) {
      actions.push({
        id: `credit-overdue-${primaryOverdue.id}`,
        tone: 'danger',
        route: '/leaderboard',
        metric: {
          en: `৳${Math.round(totalOutstanding).toLocaleString()} due`,
          bn: `৳${Math.round(totalOutstanding).toLocaleString()} বাকি`,
        },
        title: {
          en: `${primaryOverdue.name} has overdue baki`,
          bn: `${primaryOverdue.name}-এর বাকি সময় পার হয়েছে`,
        },
        body: {
          en: `The oldest pending amount is ৳${Math.round(primaryOverdue.amount).toLocaleString()}. Queue a polite reminder from the khata so cash does not get stuck.`,
          bn: `সবচেয়ে পুরনো বাকি ৳${Math.round(primaryOverdue.amount).toLocaleString()}। ক্যাশ আটকে না রাখতে খাতা থেকে ভদ্র রিমাইন্ডার কিউ করুন।`,
        },
        cta: {
          en: 'Open khata',
          bn: 'খাতা খুলুন',
        },
      })
    } else if (primaryDueSoon) {
      actions.push({
        id: `credit-due-soon-${primaryDueSoon.id}`,
        tone: 'warning',
        route: '/leaderboard',
        metric: {
          en: `${dueSoonCredits.length} due soon`,
          bn: `${dueSoonCredits.length}টি শিগগির`,
        },
        title: {
          en: 'Send gentle reminders before due dates pass',
          bn: 'তারিখ পার হওয়ার আগেই নরম তাগাদা পাঠান',
        },
        body: {
          en: `${primaryDueSoon.name} is due within ${Math.max(0, daysUntil(primaryDueSoon.dueDate, today))} days. Early reminders are easier than late collection.`,
          bn: `${primaryDueSoon.name}-এর টাকা ${Math.max(0, daysUntil(primaryDueSoon.dueDate, today))} দিনের মধ্যে দেওয়ার কথা। আগে নরম তাগাদা দিলে আদায় সহজ হয়।`,
        },
        cta: {
          en: 'Open khata',
          bn: 'খাতা খুলুন',
        },
      })
    }

    if (totalOutstanding > 0 && totalStockValue > 0 && totalOutstanding > totalStockValue * 0.35) {
      actions.push({
        id: 'cash-pressure-check',
        tone: 'warning',
        route: '/leaderboard',
        metric: {
          en: 'Cash pressure',
          bn: 'ক্যাশ চাপ',
        },
        title: {
          en: 'Too much working cash is stuck in baki',
          bn: 'ওয়ার্কিং ক্যাশের বড় অংশ বাকিতে আটকে আছে',
        },
        body: {
          en: `Pending baki is about ${Math.round((totalOutstanding / totalStockValue) * 100)}% of current stock value. Collect before making a large reorder.`,
          bn: `মোট বাকি বর্তমান স্টক ভ্যালুর প্রায় ${Math.round((totalOutstanding / totalStockValue) * 100)}%। বড় অর্ডারের আগে কিছু টাকা আদায় করুন।`,
        },
        cta: {
          en: 'Review customers',
          bn: 'কাস্টমার দেখুন',
        },
      })
    }

    if (weeklyExpenseTotal > 0) {
      actions.push({
        id: 'weekly-expense-check',
        tone: 'focus',
        route: '/metrics',
        metric: {
          en: `৳${Math.round(weeklyExpenseTotal).toLocaleString()} spent`,
          bn: `৳${Math.round(weeklyExpenseTotal).toLocaleString()} খরচ`,
        },
        title: {
          en: 'Check transport and utility costs before pricing',
          bn: 'দাম ঠিক করার আগে পরিবহন ও ইউটিলিটি খরচ দেখুন',
        },
        body: {
          en: 'Small recurring costs can quietly erase margin. Add them to price checks before discounting fast-moving items.',
          bn: 'ছোট ছোট নিয়মিত খরচ লাভ কমিয়ে দিতে পারে। দ্রুত বিক্রি হওয়া পণ্যে ছাড় দেওয়ার আগে এগুলো হিসাব করুন।',
        },
        cta: {
          en: 'View pulse',
          bn: 'হিসাব দেখুন',
        },
      })
    }

    if (!analysisResult?.length) {
      actions.push({
        id: 'upload-sales-csv',
        tone: 'accent',
        route: '/data',
        metric: {
          en: 'Needs sales',
          bn: 'বিক্রির ডাটা দরকার',
        },
        title: {
          en: 'Upload today’s sales to improve suggestions',
          bn: 'আরও ভালো পরামর্শ পেতে আজকের বিক্রির ডাটা আপলোড করুন',
        },
        body: {
          en: 'DuckDB can calculate best sellers, stock velocity, and local pricing signals directly on this device.',
          bn: 'DuckDB আপনার ডিভাইসেই সেরা পণ্য, বিক্রির গতি ও লোকাল দাম সম্পর্কিত সিগন্যাল হিসাব করবে।',
        },
        cta: {
          en: 'Upload data',
          bn: 'ডাটা আপলোড',
        },
      })
    }

    if (!items.length) {
      actions.unshift({
        id: 'first-inventory-entry',
        tone: 'accent',
        route: '/inventory',
        metric: {
          en: 'Start here',
          bn: 'এখান থেকে শুরু',
        },
        title: {
          en: 'Add your first 5 fast-moving products',
          bn: 'সবচেয়ে বেশি বিক্রি হওয়া ৫টি পণ্য আগে যোগ করুন',
        },
        body: {
          en: 'Start with rice, oil, sugar, flour, or your real best sellers. The app becomes useful as soon as stock exists.',
          bn: 'চাল, তেল, চিনি, আটা বা আপনার দোকানের আসল দ্রুত বিক্রি হওয়া পণ্য দিয়ে শুরু করুন। স্টক থাকলেই অ্যাপ কাজে লাগবে।',
        },
        cta: {
          en: 'Add product',
          bn: 'পণ্য যোগ',
        },
      })
    }

    const combinedActions = [...dynamicTasks, ...actions]
    const filteredActions = combinedActions
      .filter((a) => {
        const decidedAt = decidedTasks[a.id]
        if (!decidedAt) return true
        // Filter out if decided within the last 24 hours
        return Date.now() - decidedAt > 24 * 60 * 60 * 1000
      })
      .slice(0, 4)

    return {
      actions: filteredActions,
      dueSoonCredits,
      hasPOSData: Boolean(analysisResult?.length),
      isLoading: loadingCredits || loadingExpenses || loadingInventory || isProcessing,
      isOnline,
      lowStockItems,
      overdueCredits,
      pendingCredits,
      todayExpenseTotal,
      totalOutstanding,
      totalStockValue,
      weeklyExpenseTotal,
    }
  }, [
    analysisResult,
    credits,
    expenses,
    isOnline,
    isProcessing,
    items,
    loadingCredits,
    loadingExpenses,
    loadingInventory,
    decidedTasks,
    dynamicTasks
  ])
}
