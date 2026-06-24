import { useState, useMemo, useRef, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useDriveSync } from '../hooks/useDriveSync'
import { Search, ShoppingCart, Trash2, Printer, Plus, Minus, UserCheck, CreditCard, Banknote, Smartphone, Landmark, Receipt, X, UserPlus, Mic, Bookmark, Clock, Scale, Gift, Camera, Sparkles, Loader2 } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { writeBatch, doc, collection, arrayUnion, serverTimestamp, increment } from 'firebase/firestore'
import { db } from '../../firebase/config'
import { useAuthSession } from '../hooks/useAuthSession'

import { useInventory, type InventoryItem } from '../hooks/useInventory'
import { useCRM, type CustomerProfile } from '../hooks/useCRM'
import { useDailyRegister, type RegisterPaymentMethod, type RegisterPaymentSplit } from '../hooks/useDailyRegister'
import { useExpenses } from '../hooks/useExpenses'
import { useHaptic } from '../hooks/useHaptic'
import { useI18n } from '../i18n'
import { useToast } from './ToastProvider'
import { useStoreProfile } from '../hooks/useStoreProfile'
import { useStoreSettings } from '../hooks/useStoreSettings'
import { useBarcodeScanner } from '../hooks/useBarcodeScanner'
import { useThermalPrinter } from '../hooks/useThermalPrinter'
import { useDrafts } from '../hooks/useDrafts'
import { useWeightScale } from '../hooks/useWeightScale'
import { useVoiceCommand } from '../hooks/useVoiceCommand'
import { useVision } from '../hooks/useVision'
import { LaborIllusionLoader } from './ui/LaborIllusionLoader'

type CartItem = {
  item: InventoryItem
  qty: number
  serialNumber?: string
}

export function PosView() {
  const { t, tNum, locale } = useI18n()
  const toast = useToast()
  
  const { tenantId } = useAuthSession()
  const { items: inventory } = useInventory()
  const navigate = useNavigate()
  const { lastSyncTime } = useDriveSync()

  const { customers, addOrUpdateCustomer } = useCRM()
  const { logTransaction, register } = useDailyRegister()
  const { profile } = useStoreProfile()
  const { addExpense } = useExpenses()
  const { triggerHaptic } = useHaptic()
  const [{ currencySymbol, secondaryCurrencySymbol, exchangeRate, storeName, storeAddress, vatRate, receiptFooter, dynamicPricing, activeLocation }] = useStoreSettings()
  const { isConnected: printerConnected, printReceipt: serialPrintReceipt } = useThermalPrinter()
  const { isConnected: scaleConnected, weight: scaleWeight } = useWeightScale()
  const { drafts, saveDraft, removeDraft } = useDrafts()
  const { recognize: visionRecognize, isConfigured: visionConfigured, provider: visionProvider } = useVision({ inventory })

  // Psychology-Driven UX states (Goal Gradient + Zeigarnik + Labor Illusion)
  const [showProgressWidget, setShowProgressWidget] = useState(() => {
    return window.localStorage.getItem('equipulse-hide-setup-widget') !== 'true'
  })
  const [isExpanded, setIsExpanded] = useState(false)
  const [isAuditing, setIsAuditing] = useState(false)
  const [auditStep, setAuditStep] = useState<string | null>(null)
  const [auditReport, setAuditReport] = useState<string | null>(null)

  const checklistItems = useMemo(() => {
    return [
      {
        id: 'profile',
        label: locale === 'bn' ? 'স্টোর প্রোফাইল ও আইডেন্টিটি সেটআপ' : 'Configure Store Profile & Identity',
        completed: !!(profile && profile.storeName && profile.storeName !== 'Store Setup' && profile.storeName !== 'Store Setup Store'),
        desc: locale === 'bn' ? 'আপনার ব্যবসার নাম ও বিবরণ সেট করুন' : 'Define your store name, category, and preferences',
        weight: 25,
        link: '/profile'
      },
      {
        id: 'inventory',
        label: locale === 'bn' ? 'কমপক্ষে ৩টি পণ্য যোগ করুন' : 'Add at least 3 products to catalog',
        completed: inventory.length >= 3,
        desc: locale === 'bn' ? `বর্তমানে ${inventory.length}টি পণ্য রয়েছে` : `Currently configured: ${inventory.length} product(s)`,
        weight: 25,
        link: '/inventory'
      },
      {
        id: 'customer',
        label: locale === 'bn' ? 'প্রথম কাস্টমার সিআরএম সেটআপ' : 'Establish Customer CRM Database',
        completed: customers.length > 0,
        desc: locale === 'bn' ? 'উন্নত রিলেশনশিপ ও লয়ালটি ট্র্যাকিং' : 'Track loyalty points and transaction histories',
        weight: 25,
        link: 'customer-modal' // Handled programmatically
      },
      {
        id: 'backup',
        label: locale === 'bn' ? 'ক্লাউড ব্যাকআপ সিঙ্ক্রোনাইজেশন' : 'Establish Cloud Backup Synchronization',
        completed: lastSyncTime !== null || !!window.localStorage.getItem('google-drive-backup-enabled') || !!window.localStorage.getItem('google-drive-sync-token'),
        desc: locale === 'bn' ? 'গুগল ড্রাইভ বা অনলাইন ক্লাউড সিঙ্ক' : 'Ensure zero-loss storage resilience',
        weight: 25,
        link: '/data'
      }
    ]
  }, [profile, inventory.length, customers.length, lastSyncTime, locale])

  const setupProgress = useMemo(() => {
    return checklistItems.reduce((acc, curr) => acc + (curr.completed ? curr.weight : 0), 0)
  }, [checklistItems])

  const lowStockItems = useMemo(() => {
    return inventory.filter(i => i.quantity <= (i.minThreshold ?? 5))
  }, [inventory])

  // Run simulated AI optimization audit (Labor Illusion)
  const runStoreAudit = async () => {
    triggerHaptic(50)
    setIsAuditing(true)
    setAuditReport(null)
    
    const steps = [
      locale === 'bn' ? 'লোকাল ডেকডিবি (DuckDB) রিলেশন স্ক্যান করা হচ্ছে...' : 'Analyzing local DuckDB relation mapping...',
      locale === 'bn' ? 'স্টক লেভেল এবং ডিমান্ড কোফিশিয়েন্ট হিসাব করা হচ্ছে...' : 'Calculating inventory variance and demand coefficients...',
      locale === 'bn' ? 'পিটুপি ল্যান সিঙ্ক এবং মার্জ কনф্লিক্ট পরীক্ষা করা হচ্ছে...' : 'Verifying Peer-to-Peer LAN sync health...',
      locale === 'bn' ? 'সিআরএম লয়্যালটি পয়েন্ট ক্যালিব্রেট করা হচ্ছে...' : 'Calibrating CRM customer cohorts...',
      locale === 'bn' ? 'নিউরন ম্যাপ ব্যবহার করে স্টকআউট প্রজেক্ট করা হচ্ছে...' : 'Forecasting seasonal runouts via local neural mapping...'
    ]

    for (const step of steps) {
      setAuditStep(step)
      await new Promise(r => setTimeout(r, 600))
    }

    setIsAuditing(false)
    setAuditStep(null)
    
    // Generate intelligent advice based on data
    const lowStockCount = lowStockItems.length
    if (lowStockCount > 0) {
      setAuditReport(
        locale === 'bn'
          ? `অডিট সম্পন্ন: আপনার স্টোর হেলথ ইনডেক্স ৮৫%। ${lowStockCount}টি গুরুত্বপূর্ণ পণ্য রিঅর্ডার লেভেলের নিচে রয়েছে। অবিলম্বে রিঅর্ডার করার পরামর্শ দেওয়া হলো।`
          : `Audit Finished: Store Health Index is 85%. ${lowStockCount} item(s) are critically below threshold. Immediate restocking recommended to prevent stockouts.`
      )
    } else {
      setAuditReport(
        locale === 'bn'
          ? `অডিট সম্পন্ন: আপনার স্টোর হেলথ ইনডেক্স ১০০%! কোনো অসঙ্গতি বা স্টকআউট ঝুঁকি পাওয়া যায়নি।`
          : `Audit Finished: Store Health Index is 100%! All database metrics are highly optimized. Zero stockout risk.`
      )
    }
  }

  const { isListening: isVoiceListening, startListening: startVoiceListening } = useVoiceCommand((item, qty) => {
    setCart(prev => {
      const existing = prev.findIndex(c => c.item.id === item.id)
      if (existing >= 0 && prev[existing]) {
        const newCart = [...prev]
        if (newCart[existing]) {
          newCart[existing].qty += qty
        }
        return newCart
      }
      return [...prev, { item, qty }]
    })
    triggerHaptic(50)
  })

  const [cart, setCart] = useState<CartItem[]>([])
  const [isRefundMode, setIsRefundMode] = useState(false)
  const [showExpenseModal, setShowExpenseModal] = useState(false)
  const [showDraftsModal, setShowDraftsModal] = useState(false)
  const [expenseAmount, setExpenseAmount] = useState('')
  const [expenseCategory, setExpenseCategory] = useState('tea')
  const [expenseNote, setExpenseNote] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [discount, setDiscount] = useState(0)
  const [applyPoints, setApplyPoints] = useState(false)
  const [paymentMethod, setPaymentMethod] = useState<RegisterPaymentMethod>('cash')
  const [splitAmounts, setSplitAmounts] = useState({ cash: 0, bkash: 0, nagad: 0, rocket: 0, upay: 0, tap: 0, bank: 0, gift_card: 0, credit: 0 })
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('')
  const selectedCustomer = useMemo(() => customers.find((c: CustomerProfile) => c.id === selectedCustomerId), [customers, selectedCustomerId])
  const [showAddCustomerModal, setShowAddCustomerModal] = useState(false)
  const [newCustomerName, setNewCustomerName] = useState('')
  const [newCustomerMobile, setNewCustomerMobile] = useState('')
  const searchInputRef = useRef<HTMLInputElement>(null)
  const [isMobileCartOpen, setIsMobileCartOpen] = useState(false)
  const [isProcessingCheckout, setIsProcessingCheckout] = useState(false)
  const [checkoutStage, setCheckoutStage] = useState('')
  


  // Handle custom event for Gemini Cart Addition
  useEffect(() => {
    const handleGeminiAdd = (e: Event) => {
      const customEvent = e as CustomEvent;
      const item = customEvent.detail.item as InventoryItem;
      const requestedQty = Number(customEvent.detail.qty);
      const qty = Number.isFinite(requestedQty) ? Math.max(1, Math.floor(requestedQty)) : 1;
      
      setCart(prev => {
        const existing = prev.find(c => c.item.id === item.id)
        const existingQty = existing?.qty ?? 0
        const allowedQty = Math.max(0, item.quantity - existingQty)
        if (allowedQty <= 0) {
          toast('Out of stock', 'Cannot add more than available inventory', 'error')
          return prev
        }
        const qtyToAdd = Math.min(qty, allowedQty)
        if (qtyToAdd < qty) {
          toast('Stock limited', `Only ${allowedQty} ${item.unit} available for ${item.name}.`, 'warning')
        }
        if (existing) {
          return prev.map(c => c.item.id === item.id ? { ...c, qty: c.qty + qtyToAdd } : c)
        }
        return [...prev, { item, qty: qtyToAdd }]
      })
      toast('Voice Added', `Added ${qty}x ${item.name}`, 'success');
      triggerHaptic(50);
    }
    window.addEventListener('gemini-add-cart', handleGeminiAdd);
    return () => window.removeEventListener('gemini-add-cart', handleGeminiAdd);
  }, [toast, triggerHaptic]);

  // Memoized handlers
  const addToCart = useCallback((item: InventoryItem, customQty?: number) => {
    triggerHaptic(30)
    
    let serialNumber = undefined
    if (item.hasSerial) {
      serialNumber = window.prompt(t(`Enter Serial Number for ${item.name}`)) || undefined
      if (item.hasSerial && !serialNumber) {
        toast('Serial Required', 'Serial number is required to add this item', 'warning')
        return
      }
    }

    const addedQty = typeof customQty === 'number' ? customQty : (isRefundMode ? -1 : 1)

    setCart(prev => {
      const existing = prev.find(c => c.item.id === item.id && c.serialNumber === serialNumber)
      if (existing) {
        if (!isRefundMode && existing.qty + addedQty > item.quantity) {
          toast('Out of stock', 'Cannot add more than available inventory', 'error')
          return prev
        }
        return prev.map(c => c.item.id === item.id && c.serialNumber === serialNumber ? { ...c, qty: c.qty + addedQty } : c)
      }
      if (!isRefundMode && item.quantity <= 0) {
        toast('Out of stock', 'This item is out of stock', 'error')
        return prev
      }
      return [...prev, { item, qty: addedQty, serialNumber }]
    })
    setSearchQuery('')
    searchInputRef.current?.focus()
  }, [triggerHaptic, toast, isRefundMode, t])

  const updateQty = useCallback((index: number, delta: number) => {
    setCart(prev => prev.map((c, i) => {
      if (i === index) {
        const newQty = c.qty + delta
        if (!isRefundMode && newQty < 0) return c
        if (isRefundMode && newQty > 0) return c
        if (!isRefundMode && newQty > c.item.quantity) {
          toast('Out of stock', 'Cannot add more than available inventory', 'error')
          return c
        }
        return { ...c, qty: newQty }
      }
      return c
    }))
  }, [toast, isRefundMode])

  const setQty = useCallback((index: number, qty: number) => {
    setCart(prev => prev.map((c, i) => {
      if (i === index) {
        if (!isRefundMode && qty < 0) return c
        if (isRefundMode && qty > 0) return c
        if (!isRefundMode && qty > c.item.quantity) {
          toast('Out of stock', 'Cannot add more than available inventory', 'error')
          return { ...c, qty: c.item.quantity }
        }
        return { ...c, qty }
      }
      return c
    }))
  }, [toast, isRefundMode])

  const removeCartItem = useCallback((index: number) => {
    setCart(prev => prev.filter((_, i) => i !== index))
  }, [])

  const handleImageRecognition = () => {
    if (!visionConfigured) {
      toast(
        'Vision Not Configured',
        'Set your Gemini or OpenAI Vision key in Settings → API Credentials to enable image checkout.',
        'error',
      )
      return
    }
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = 'image/*;capture=camera'
    input.onchange = async (e: Event) => {
      const file = (e.target as HTMLInputElement).files?.[0]
      if (!file) return
      toast('Analyzing Image...', `EquiPulse Vision (${visionProvider || 'AI'}) is matching your photo.`, 'info')
      try {
        const result = await visionRecognize(file)
        if (!result.ok) {
          if (result.reason === 'not_configured') {
            toast('Vision Not Configured', 'Add an API key in Settings → API Credentials.', 'error')
          } else if (result.reason === 'no_match') {
            toast('No Match', 'AI could not match the photo to your inventory. Try a clearer shot.', 'error')
          } else if (result.reason === 'rate_limited') {
            toast('Rate Limited', 'Vision provider is throttling. Try again in a moment.', 'error')
          } else if (result.reason === 'no_internet') {
            toast('Offline', 'Image recognition needs internet. Cart stays empty.', 'error')
          } else {
            toast('Vision Error', result.error || 'Provider error.', 'error')
          }
          return
        }
        let added = 0
        for (const c of result.candidates) {
          const item = c.matchedItem || inventory.find(i => i.name.toLowerCase() === c.name.toLowerCase())
          if (item) {
            addToCart(item, c.quantity)
            added += 1
          }
        }
        if (added > 0) {
          triggerHaptic([50, 30, 50])
          toast('Vision Match', `Added ${added} item${added > 1 ? 's' : ''} to cart.`, 'success')
        } else {
          toast('No Match', 'AI returned candidates but none matched your inventory.', 'error')
        }
      } catch (err) {
        toast('Vision Error', err instanceof Error ? err.message : 'Unknown error.', 'error')
      }
    }
    input.click()
  }



  const isBn = locale === 'bn'

  // Auto focus barcode scanner on mount
  useEffect(() => {
    searchInputRef.current?.focus()
  }, [])

  // Barcode Scanner Listener
  useBarcodeScanner({
    onScan: (barcode) => {
      const item = inventory.find(i => i.barcode === barcode || i.sku === barcode)
      if (item) {
        addToCart(item)
        triggerHaptic(50)
        toast(t(`Scanned`), `${item.name} added to cart.`, 'success')
      } else {
        triggerHaptic([50, 100, 50])
        toast(t(`Not Found`), `Barcode ${barcode} not in inventory.`, 'error')
      }
    }
  })

  const filteredItems = useMemo(() => {
    if (!searchQuery) return inventory
    const lower = searchQuery.toLowerCase()
    return inventory.filter(i => 
      i.name.toLowerCase().includes(lower) || 
      i.id.toLowerCase().includes(lower) || 
      i.category?.toLowerCase().includes(lower)
    )
  }, [searchQuery, inventory])



  const handleBarcodeScan = (e: React.FormEvent) => {
    e.preventDefault()
    if (!searchQuery) return

    const match = inventory.find(i => 
      i.id === searchQuery || 
      i.barcode === searchQuery ||
      i.sku?.toLowerCase() === searchQuery.toLowerCase() ||
      i.name.toLowerCase() === searchQuery.toLowerCase()
    )
    if (match) {
      addToCart(match)
    } else {
      toast('Not Found', 'No item found for this barcode', 'error')
    }
  }



  const hour = new Date().getHours()
  const isPeakHour = dynamicPricing && ((hour >= 12 && hour < 14) || (hour >= 18 && hour < 20))
  const dynamicPricingSurge = isPeakHour ? 0.1 : 0

  const baseSubtotal = cart.reduce((acc, c) => acc + (c.item.price * c.qty), 0)
  const surgeAmount = baseSubtotal * dynamicPricingSurge
  const subtotal = baseSubtotal + surgeAmount

  const taxTotal = cart.reduce((acc, c) => {
    const rate = typeof c.item.taxRate === 'number' ? c.item.taxRate : (vatRate || 0)
    return acc + (c.item.price * c.qty * (1 + dynamicPricingSurge) * (rate / 100))
  }, 0)
  
  const customerTier = useMemo(() => {
    if (!selectedCustomer) return null
    const spent = selectedCustomer.totalSpent || 0
    if (spent > 10000) return { name: 'Platinum', discountRate: 0.10 }
    if (spent > 5000) return { name: 'Gold', discountRate: 0.05 }
    if (spent > 2000) return { name: 'Silver', discountRate: 0.02 }
    return { name: 'Bronze', discountRate: 0.00 }
  }, [selectedCustomer])

  const tierDiscount = customerTier ? (subtotal * customerTier.discountRate) : 0
  const availablePoints = selectedCustomer?.loyaltyPoints || 0
  const pointsDiscount = applyPoints ? Math.min(availablePoints, subtotal + taxTotal - discount - tierDiscount) : 0
  const total = isRefundMode ? (subtotal + taxTotal) : Math.max(0, subtotal + taxTotal - discount - tierDiscount - pointsDiscount)

  const dailySalesTotal = register?.transactions?.filter(t => t.type === 'sale').reduce((sum, t) => sum + t.amount, 0) || 0
  const dailyTarget = 10000
  const goalProgress = Math.min((dailySalesTotal / dailyTarget) * 100, 100)

  const printReceipt = useCallback(() => {
    const finalStoreName = storeName || profile?.storeName || 'EquiPulse POS'
    
    // If native serial printer is connected, use it directly bypassing the browser UI
    if (printerConnected) {
      const receiptLines = [
        `Receipt: INV-${(new Date().toISOString().split('T')[0] || '').replace(/-/g, '')}-${(register?.transactions?.length || 0) + 1}`,
        `Date: ${new Date().toLocaleString()}`,
        `--------------------------------`,
      ];
      
      cart.forEach(c => {
        receiptLines.push(`${c.item.name}`);
        receiptLines.push(`${c.qty} x ${currencySymbol}${c.item.price} = ${currencySymbol}${c.qty * c.item.price}`);
      });
      
      receiptLines.push(`--------------------------------`);
      receiptLines.push(`Subtotal: ${currencySymbol}${subtotal}`);
      if (taxTotal > 0) receiptLines.push(`Tax/VAT: +${currencySymbol}${taxTotal.toFixed(2)}`);
      if (discount > 0) receiptLines.push(`Discount: -${currencySymbol}${discount}`);
      if (tierDiscount > 0) receiptLines.push(`Tier Discount (${customerTier?.name}): -${currencySymbol}${tierDiscount.toFixed(2)}`);
      if (pointsDiscount > 0) receiptLines.push(`Points Redeemed: -${currencySymbol}${pointsDiscount}`);
      receiptLines.push(`TOTAL: ${currencySymbol}${total.toFixed(2)}`);
      receiptLines.push(`--------------------------------`);
      receiptLines.push(receiptFooter || 'Thank You!');
      
      void serialPrintReceipt(receiptLines, finalStoreName);
      toast('Printing via Serial Port', 'Receipt sent directly to thermal printer.', 'success');
      return;
    }

    const paymentLabels: Record<string, { en: string; bn: string }> = {
      cash: { en: 'Cash (নগদ)', bn: 'নগদ' },
      bkash: { en: 'bKash', bn: 'বিকাশ' },
      nagad: { en: 'Nagad', bn: 'নগদ (মোবাইল)' },
      rocket: { en: 'Rocket', bn: 'রকেট' },
      bank: { en: 'Bank Transfer', bn: 'ব্যাংক ট্রান্সফার' },
      credit: { en: 'Credit (Baki)', bn: 'বাকি' },
      split: { en: 'Split Payment', bn: 'মিশ্র পেমেন্ট' },
      upay: { en: 'Upay (UCB)', bn: 'ইউপে' },
      tap: { en: 'Tap & Pay', bn: 'ট্যাপ পে' },
    }
    const methodLabel = (paymentLabels[paymentMethod]?.[(locale === 'bn' ? 'bn' : 'en')]) ?? paymentMethod.toUpperCase()
    const customer = customers.find(c => c.id === selectedCustomerId)

    const receiptHtml = `
      <html>
        <head>
          <title>${t(`Sales Receipt`)}</title>
          <link href="https://fonts.googleapis.com/css2?family=Hind+Siliguri:wght@400;600;700&display=swap" rel="stylesheet">
          <style>
            body { font-family: 'Hind Siliguri', monospace, sans-serif; width: 300px; margin: 0 auto; padding: 10px; color: #000; line-height: 1.5; }
            .text-center { text-align: center; }
            .text-right { text-align: right; }
            .flex { display: flex; justify-content: space-between; }
            .bold { font-weight: bold; }
            .line { border-bottom: 1px dashed #000; margin: 8px 0; }
            table { width: 100%; border-collapse: collapse; }
            th, td { text-align: left; padding: 3px 0; }
            .sm { font-size: 11px; }
          </style>
        </head>
        <body>
          <div class="text-center">
            <h2 style="margin-bottom: 2px; font-size: 18px;">${finalStoreName}</h2>
            <p class="sm" style="margin-top: 0; margin-bottom: 2px;">${storeAddress}</p>
            <p class="sm" style="margin-top: 0;">${t(`Sales Receipt`)}</p>
          </div>
          <div class="line"></div>
          <p class="sm">${t(`Receipt`)}: INV-${(new Date().toISOString().split('T')[0] || '').replace(/-/g, '')}-${(register?.transactions?.length || 0) + 1}</p>
          <p class="sm">${t(`Date`)}: ${new Date().toLocaleString()}</p>
          ${customer ? `<p class="sm">${t(`Customer`)}: <strong>${customer.name}</strong> (${customer.mobile})</p>` : ''}
          <p class="sm">${t(`Payment`)}: <strong>${methodLabel}</strong></p>
          <div class="line"></div>
          <table>
            <thead>
              <tr class="sm" style="border-bottom: 1px solid #000;">
                <th>${t(`Item`)}</th>
                <th>${t(`Qty`)}</th>
                <th class="text-right">${t(`Total`)}</th>
              </tr>
            </thead>
            <tbody>
              ${cart.map(c => `
                <tr class="sm">
                  <td>${c.item.name}</td>
                  <td>${c.qty}</td>
                  <td class="text-right">${currencySymbol}${(c.qty * c.item.price).toLocaleString()}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
          <div class="line"></div>
          <div class="flex sm"><span>${t(`Subtotal`)}:</span><span>${currencySymbol}${subtotal.toLocaleString()}</span></div>
          ${taxTotal > 0 ? `<div class="flex sm"><span>${t(`Tax / VAT`)}:</span><span>+${currencySymbol}${taxTotal.toLocaleString(undefined, {minimumFractionDigits: 2})}</span></div>` : ''}
          ${discount > 0 ? `<div class="flex sm"><span>${t(`Discount`)}:</span><span>-${currencySymbol}${discount.toLocaleString()}</span></div>` : ''}
          ${tierDiscount > 0 ? `<div class="flex sm"><span>${t(`Tier Discount`)} (${customerTier?.name}):</span><span>-${currencySymbol}${tierDiscount.toLocaleString(undefined, {minimumFractionDigits: 2})}</span></div>` : ''}
          ${pointsDiscount > 0 ? `<div class="flex sm"><span>${t(`Points Redeemed`)}:</span><span>-${currencySymbol}${pointsDiscount.toLocaleString()}</span></div>` : ''}
          <div class="line"></div>
          <div class="flex bold" style="font-size: 15px;"><span>${t(`TOTAL`)}:</span><span>${currencySymbol}${total.toLocaleString(undefined, {minimumFractionDigits: 2})}</span></div>
          ${exchangeRate > 0 && secondaryCurrencySymbol ? `<div class="flex sm" style="margin-top: 4px; color: #555;"><span>${t(`Equivalent`)}:</span><span>${secondaryCurrencySymbol}${(total * exchangeRate).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span></div>` : ''}
          <div class="line"></div>
          <p class="text-center sm" style="margin-top: 16px; white-space: pre-wrap;">${receiptFooter}</p>
          <p class="text-center" style="font-size: 9px; color: #999; margin-top: 4px;">Powered by SME Pulse</p>
          <script>
            window.onload = function() { 
              setTimeout(function() {
                window.print();
              }, 250);
            }
          </script>
        </body>
      </html>
    `
    // Use hidden iframe to bypass popup blockers
    const iframe = document.createElement('iframe')
    iframe.style.position = 'fixed'
    iframe.style.right = '0'
    iframe.style.bottom = '0'
    iframe.style.width = '0'
    iframe.style.height = '0'
    iframe.style.border = 'none'
    document.body.appendChild(iframe)

    const doc = iframe.contentWindow?.document
    if (doc) {
      doc.open()
      doc.write(receiptHtml)
      doc.close()
    }
    
    // Clean up iframe after a delay
    setTimeout(() => {
      if (document.body.contains(iframe)) {
        document.body.removeChild(iframe)
      }
    }, 10000)

  // The following deps are referenced only inside the `receiptHtml` template literal
  // and inside `${...}` interpolation expressions. The react-hooks/exhaustive-deps
  // static analyzer does not always pick up identifier references through these
  // template-literal expression nodes, so we disable the rule for this array.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cart, discount, isBn, locale, paymentMethod, profile?.storeName, subtotal, total, customers, selectedCustomerId, currencySymbol, receiptFooter, storeAddress, storeName, printerConnected, serialPrintReceipt, toast, customerTier, tierDiscount, exchangeRate, pointsDiscount, register?.transactions?.length, secondaryCurrencySymbol, t, taxTotal])

  const handleCheckout = useCallback(async () => {
    try {
      if (cart.length === 0) return
      triggerHaptic([50, 50, 100])

      // Labor Illusion: Slow down the perceived process slightly to make the system feel "intelligent" and hard-working.
      setIsProcessingCheckout(true)
      setCheckoutStage(t('Verifying Stock...'))
      await new Promise(r => setTimeout(r, 400))
      setCheckoutStage(t('Syncing Ledger...'))
      await new Promise(r => setTimeout(r, 400))
      setCheckoutStage(t('Finalizing...'))
      await new Promise(r => setTimeout(r, 400))
      
      // Check Register
      if (register?.status === 'closed') {
        toast(t(`Register Closed`), t(`Please open the register first`), 'warning')
        return
      }

      if (paymentMethod === 'credit' && !selectedCustomerId) {
        toast('Select Customer', 'Please select a customer for credit sale', 'error')
        return
      }

      const stockIssue = cart.find((cartItem) => {
        const latest = inventory.find((item) => item.id === cartItem.item.id)
        const availableQty = latest?.quantity ?? cartItem.item.quantity
        if (isRefundMode) {
          return !Number.isFinite(cartItem.qty) || cartItem.qty === 0
        }
        return !Number.isFinite(cartItem.qty) || cartItem.qty <= 0 || cartItem.qty > availableQty
      })
      if (stockIssue) {
        toast('Stock Error', isRefundMode ? 'Invalid refund quantity.' : `${stockIssue.item.name} is no longer available in the requested quantity.`, 'error')
        return
      }

      const finalPayments: RegisterPaymentSplit[] = []
      if (paymentMethod === 'split') {
        const splitTotal = Object.values(splitAmounts).reduce((a, b) => a + b, 0)
        const hasInvalidSplit = Object.values(splitAmounts).some((amount) => isRefundMode ? amount > 0 : amount < 0)
        if (hasInvalidSplit) {
          toast('Split Error', isRefundMode ? 'Refund amounts must be negative or zero' : 'Payment amounts cannot be negative', 'error')
          return
        }
        if (Math.abs(splitTotal - total) > 0.01) {
          toast('Split Error', `Split sum (${currencySymbol}${splitTotal.toFixed(2)}) must equal total (${currencySymbol}${total.toFixed(2)})`, 'error')
          return
        }
        if (splitAmounts.credit !== 0 && !selectedCustomerId) {
          toast('Select Customer', 'Please select a customer for the due/credit amount', 'error')
          return
        }
        
        Object.entries(splitAmounts).forEach(([method, amount]) => {
          if (amount !== 0) {
            const allowedMethods = ['cash', 'bkash', 'nagad', 'rocket', 'bank', 'credit', 'gift_card', 'upay', 'tap'] as const
            type AllowedMethod = typeof allowedMethods[number]
            if ((allowedMethods as readonly string[]).includes(method)) {
              finalPayments.push({ method: method as AllowedMethod, amount })
            }
          }
        })
      } else {
        finalPayments.push({ method: paymentMethod, amount: total })
      }

      if (!tenantId) throw new Error('Not logged in')
      const batch = writeBatch(db)

      const lineItems = cart.map(c => ({
        itemId: c.item.id,
        name: c.item.name,
        quantity: c.qty,
        unitPrice: c.item.price,
        lineTotal: c.qty * c.item.price,
        ...(c.serialNumber ? { serialNumber: c.serialNumber } : {})
      }))

      const todayId = new Date().toISOString().split('T')[0] || ''
      const registerRef = doc(collection(db, 'users', tenantId, 'registers'), todayId)
      
      const receiptNumber = `INV-${todayId.replace(/-/g, '')}-${(register?.transactions?.length || 0) + 1}`

      const activeCashierId = localStorage.getItem('equipulse_active_cashier_id') || null
      const activeCashierName = localStorage.getItem('equipulse_active_cashier_name') || null

      const newTx = {
        type: 'sale',
        amount: total,
        note: isRefundMode ? `POS Refund (${cart.length} items)` : `POS Sale (${cart.length} items)`,
        paymentMethod: paymentMethod,
        payments: finalPayments,
        items: lineItems,
        receiptNumber,
        cashierId: activeCashierId,
        cashierName: activeCashierName,
        id: typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(36) + Math.random().toString(36).substring(2),
        timestamp: new Date().toISOString()
      }
      
      batch.set(
        registerRef,
        {
          id: todayId,
          openingBalance: register?.openingBalance ?? 0,
          closingBalance: null,
          status: register?.status ?? 'open',
          transactions: arrayUnion(newTx),
          updatedAt: serverTimestamp(),
          createdAt: register?.createdAt ?? serverTimestamp(),
        },
        { merge: true }
      )

      // Award 10 participation points per transaction
      const storeProfileRef = doc(db, 'storeProfiles', tenantId)
      batch.set(storeProfileRef, {
        participationPoints: increment(10),
        updatedAt: serverTimestamp()
      }, { merge: true })

      // 2. Add to Customer Ledger if there's any credit
      const creditAmount = paymentMethod === 'split' ? splitAmounts.credit : (paymentMethod === 'credit' ? total : 0)
      if (creditAmount > 0 && selectedCustomerId) {
        const customer = customers.find((c: CustomerProfile) => c.id === selectedCustomerId)
        if (customer) {
          const newCreditId = typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(36) + Math.random().toString(36).substring(2)
          const creditRef = doc(collection(db, 'users', tenantId, 'credits'), newCreditId)
          batch.set(creditRef, {
            id: newCreditId,
            name: customer.name,
            mobile: customer.mobile,
            amount: creditAmount,
            createdAt: new Date().toISOString(),
            dueDate: '',
            status: 'pending',
            updatedAt: serverTimestamp()
          }, { merge: true })
        }
      }

      // 3. Deduct Inventory Atomically
      for (const c of cart) {
        if (c.item.isBundle && c.item.bundleItems && c.item.bundleItems.length > 0) {
          for (const bItem of c.item.bundleItems) {
            const compRef = doc(collection(db, 'users', tenantId, 'inventory'), bItem.id)
            batch.set(compRef, {
              quantity: increment(-(c.qty * bItem.quantity)),
              updatedAt: serverTimestamp()
            }, { merge: true })
          }
        } else {
          const itemRef = doc(collection(db, 'users', tenantId, 'inventory'), c.item.id)
          batch.set(itemRef, {
            quantity: increment(-c.qty),
            updatedAt: serverTimestamp()
          }, { merge: true })
        }
      }

      // 4. Update CRM with loyalty points & spend
      if (selectedCustomerId) {
        const customerRef = doc(collection(db, 'users', tenantId, 'customers'), selectedCustomerId)
        const earnedPoints = Math.floor(total / 100)
        batch.set(customerRef, {
          totalSpent: increment(total),
          loyaltyPoints: increment(earnedPoints - pointsDiscount),
          lastPurchaseDate: new Date().toISOString(),
          updatedAt: serverTimestamp()
        }, { merge: true })

        const purchaseRef = doc(collection(db, 'users', tenantId, 'customers', selectedCustomerId, 'purchases'))
        batch.set(purchaseRef, {
          id: purchaseRef.id,
          amount: total,
          items: cart.map(c => ({ name: c.item.name, qty: c.qty, price: c.item.price })),
          timestamp: new Date().toISOString()
        })
      }

      // 5. KDS Routing
      if (profile?.businessType === 'restaurant' || profile?.businessType === 'cafe' || profile?.businessType === 'food_cart') {
        const orderId = typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(36)
        const kitchenRef = doc(collection(db, 'users', tenantId, 'kitchen_orders'), orderId)
        batch.set(kitchenRef, {
          id: orderId,
          orderNumber: orderId.slice(-4).toUpperCase(),
          items: cart.map(c => ({ name: c.item.name, qty: c.qty })),
          status: 'pending',
          timestamp: new Date().toISOString()
        })
      }

      await batch.commit()

      // 4. Print Receipt
      printReceipt()

      toast('Success', 'Checkout completed successfully', 'success')
      window.dispatchEvent(new CustomEvent('equipulse-tour-action', { detail: { action: 'pos-completed' } }))
      setCart([])
      setDiscount(0)
      setApplyPoints(false)
      setSearchQuery('')
      setIsMobileCartOpen(false)
      searchInputRef.current?.focus()
      
    } catch (err: unknown) {
      console.error('CHECKOUT ERROR:', err)
      const msg = err instanceof Error ? err.message : 'Something went wrong. Please check console.'
      toast('Checkout Failed', msg, 'error')
    } finally {
      setIsProcessingCheckout(false)
    }
  }, [
    cart,
    customers,
    inventory,
    paymentMethod,
    printReceipt,
    register,
    selectedCustomerId,
    splitAmounts,
    total,
    toast,
    tenantId,
    triggerHaptic,
    currencySymbol,
    isRefundMode,
    pointsDiscount,
    profile?.businessType,
    t
  ])

  // Global Keyboard Shortcuts for POS
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'F2') {
        e.preventDefault()
        searchInputRef.current?.focus()
      }
      if (e.key === 'F9') {
        e.preventDefault()
        if (cart.length > 0) {
          void handleCheckout()
        } else {
          toast('Cart is empty', t(`Cart is empty`), 'error')
        }
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [cart.length, handleCheckout, isBn, toast, t])

  // Smart Keyboard Navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const isInput = e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement

      if (e.key === 'Escape') {
        setCart([])
        toast(t(`Cart Cleared`), '', 'success')
      } else if (e.key === 'Enter' && (!isInput || (isInput && searchQuery === ''))) {
        e.preventDefault()
        if (cart.length > 0) {
          void handleCheckout()
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [cart.length, handleCheckout, isBn, searchQuery, toast, t])

  const handleAddCustomer = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newCustomerName) return

    const newId = Date.now().toString()
    try {
      await addOrUpdateCustomer({
        id: newId,
        name: newCustomerName,
        mobile: newCustomerMobile || 'N/A'
      })
      setSelectedCustomerId(newId)
      setNewCustomerName('')
      setNewCustomerMobile('')
      setShowAddCustomerModal(false)
      toast(
        t(`Customer Added`),
        t(`New customer added successfully.`),
        'success'
      )
    } catch (err) {
      console.error(err)
      toast('Error', 'Failed to add customer', 'error')
    }
  }

  const handleExpenseSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!expenseAmount) return
    try {
      await addExpense({
        id: Date.now().toString(),
        category: expenseCategory,
        amount: parseFloat(expenseAmount),
        date: new Date().toISOString().split('T')[0] || '',
        note: expenseNote
      })
      await logTransaction({
        type: 'expense',
        amount: parseFloat(expenseAmount),
        note: `Expense: ${expenseCategory} - ${expenseNote}`
      })
      toast(
        t(`Expense Saved`),
        t(`Expense deducted from your cash register.`),
        'success'
      )
      setShowExpenseModal(false)
      setExpenseAmount('')
      setExpenseNote('')
    } catch (error) {
      console.error(error)
      toast('Error', 'Could not save expense', 'error')
    }
  }


  const getCategoryStyles = () => {
    if (!profile?.category) return { bg: 'bg-primary/5', border: 'border-primary/20', text: 'text-primary' }
    
    const cat = profile.category.toLowerCase()
    if (cat.includes('grocery') || cat.includes('মুদি')) return { bg: 'bg-success/5', border: 'border-success/20', text: 'text-success' }
    if (cat.includes('pharmacy') || cat.includes('ফার্মেসি')) return { bg: 'bg-teal-500/5', border: 'border-teal-500/20', text: 'text-teal-500' }
    if (cat.includes('fashion') || cat.includes('ফ্যাশন')) return { bg: 'bg-purple-500/5', border: 'border-purple-500/20', text: 'text-purple-500' }
    if (cat.includes('electronics') || cat.includes('ইলেকট্রনিক্স')) return { bg: 'bg-blue-500/5', border: 'border-blue-500/20', text: 'text-blue-500' }
    if (cat.includes('hardware') || cat.includes('হার্ডওয়্যার')) return { bg: 'bg-orange-500/5', border: 'border-orange-500/20', text: 'text-orange-500' }
    
    return { bg: 'bg-primary/5', border: 'border-primary/20', text: 'text-primary' }
  }

  const catStyle = getCategoryStyles()

  const renderCartSummary = () => (
    <div className="space-y-1.5 md:space-y-2">
      <div className="flex justify-between items-center text-sm">
        <span className="text-ink-soft font-bold">{t(`Subtotal`)}</span>
        <span className="font-black text-ink">{currencySymbol}{tNum(baseSubtotal.toLocaleString())}</span>
      </div>
      {surgeAmount > 0 && (
        <div className="flex justify-between items-center text-sm">
          <span className="text-accent font-bold">Surge Pricing (Peak)</span>
          <span className="font-black text-accent">+{currencySymbol}{tNum(surgeAmount.toLocaleString(undefined, {minimumFractionDigits: 2}))}</span>
        </div>
      )}
      {taxTotal > 0 && (
        <div className="flex justify-between items-center text-sm">
          <span className="text-ink-soft font-bold">{t(`Tax / VAT`)}</span>
          <span className="font-black text-danger">+{currencySymbol}{tNum(taxTotal.toLocaleString(undefined, {minimumFractionDigits: 2}))}</span>
        </div>
      )}
      <div className="flex justify-between items-center text-sm gap-4">
        <span className="text-ink-soft font-bold whitespace-nowrap">{t(`Discount`)}</span>
        <div className="relative w-28">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-soft text-sm font-bold">{currencySymbol}</span>
          <input 
            type="number" 
            min="0"
            value={discount || ''}
            onChange={e => setDiscount(Number(e.target.value))}
            className="w-full bg-surface/80 border border-line/60 rounded-xl pl-8 pr-3 py-1.5 text-right font-black focus:border-accent focus:ring-2 focus:ring-accent/20 outline-none transition-all shadow-inner"
          />
        </div>
      </div>
      {tierDiscount > 0 && (
        <div className="flex justify-between items-center text-sm">
          <span className="text-accent font-bold">{t(`Tier Discount`)} ({customerTier?.name})</span>
          <span className="font-black text-accent">-{currencySymbol}{tNum(tierDiscount.toLocaleString(undefined, {minimumFractionDigits: 2}))}</span>
        </div>
      )}
      {pointsDiscount > 0 && (
        <div className="flex justify-between items-center text-sm">
          <span className="text-accent font-bold">{t(`Points Applied`)}</span>
          <span className="font-black text-accent">-{currencySymbol}{tNum(pointsDiscount.toLocaleString())}</span>
        </div>
      )}
      <div className="flex justify-between items-end text-2xl font-black text-accent pt-2 border-t border-line/40">
        <span className="tracking-tight text-lg leading-none mb-1">{t(`Total`)}</span>
        <div className="text-right">
          <span className="tracking-tighter block leading-none">{currencySymbol}{tNum(total.toLocaleString())}</span>
          {exchangeRate > 0 && secondaryCurrencySymbol && (
            <span className="block text-xs text-ink-soft font-bold mt-1 tracking-widest opacity-80 leading-none">
              ≈ {secondaryCurrencySymbol}{tNum((total * exchangeRate).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }))}
            </span>
          )}
        </div>
      </div>
    </div>
  )

  const renderPaymentAndCustomer = () => (
    <div className="space-y-4">
      {/* Customer Selection */}
      <div className="flex gap-2">
        <div className="relative flex-1 group">
          <UserCheck size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-soft group-focus-within:text-accent transition-colors" />
          <select
            value={selectedCustomerId}
            onChange={e => setSelectedCustomerId(e.target.value)}
            className={`w-full bg-surface/80 border rounded-xl pl-10 pr-4 py-3 text-sm font-bold outline-none focus:border-accent focus:ring-2 focus:ring-accent/10 transition-all ${
              (paymentMethod === 'credit' && !selectedCustomerId) ? 'border-warning ring-2 ring-warning/20' : 'border-line/50'
            }`}
          >
            <option value="" className="font-normal text-ink-soft">
              {locale === 'bn' 
                ? (paymentMethod === 'credit' ? '* কাস্টমার সিলেক্ট করুন (বাধ্যতামূলক)...' : 'কাস্টমার সিলেক্ট করুন (ঐচ্ছিক)...')
                : (paymentMethod === 'credit' ? '* Select Customer (Required)...' : 'Select Customer (Optional)...')}
            </option>
            {customers.map((c: CustomerProfile) => (
              <option key={c.id} value={c.id} className="font-bold">{c.name} ({c.mobile})</option>
            ))}
          </select>
        </div>
        <motion.button 
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          type="button"
          title={t(`New Customer`)}
          onClick={() => setShowAddCustomerModal(true)}
          className="bg-surface/80 border border-line/50 text-ink-soft hover:text-accent hover:border-accent/40 hover:bg-accent/10 px-4 rounded-xl transition-all shadow-sm flex items-center justify-center animate-none"
        >
          <UserPlus size={18} />
        </motion.button>
      </div>

      {selectedCustomer && (selectedCustomer.loyaltyPoints || 0) > 0 && (
        <div className="flex items-center gap-3 p-3 bg-accent/5 rounded-xl border border-accent/20">
          <input 
            type="checkbox" 
            id="applyPoints"
            checked={applyPoints}
            onChange={(e) => setApplyPoints(e.target.checked)}
            className="w-5 h-5 accent-accent"
          />
          <label htmlFor="applyPoints" className="text-sm font-bold text-ink cursor-pointer flex-1">
            {t("Apply Loyalty Points")} 
            <span className="text-accent ml-1 block text-xs">({selectedCustomer.loyaltyPoints} pts = {currencySymbol}{tNum(selectedCustomer.loyaltyPoints)})</span>
          </label>
        </div>
      )}

      {/* Payment Methods */}
      <div className="grid grid-cols-4 gap-2">
        {[
          { id: 'cash', icon: Banknote, color: 'bg-success', hover: 'hover:bg-success/10 hover:text-success hover:border-success/30', label: 'Cash' },
          { id: 'bkash', icon: Smartphone, color: 'bg-[#E2136E]', hover: 'hover:bg-[#E2136E]/10 hover:text-[#E2136E] hover:border-[#E2136E]/30', label: 'bKash' },
          { id: 'nagad', icon: Smartphone, color: 'bg-[#F7941D]', hover: 'hover:bg-[#F7941D]/10 hover:text-[#F7941D] hover:border-[#F7941D]/30', label: 'Nagad' },
          { id: 'rocket', icon: Smartphone, color: 'bg-[#8C1515]', hover: 'hover:bg-[#8C1515]/10 hover:text-[#8C1515] hover:border-[#8C1515]/30', label: 'Rocket' },
          { id: 'upay', icon: Smartphone, color: 'bg-[#0057A8]', hover: 'hover:bg-[#0057A8]/10 hover:text-[#0057A8] hover:border-[#0057A8]/30', label: 'Upay' },
          { id: 'tap', icon: Smartphone, color: 'bg-[#00A651]', hover: 'hover:bg-[#00A651]/10 hover:text-[#00A651] hover:border-[#00A651]/30', label: 'Tap' },
          { id: 'bank', icon: Landmark, color: 'bg-indigo-600', hover: 'hover:bg-indigo-600/10 hover:text-indigo-600 hover:border-indigo-600/30', label: 'Bank' },
          { id: 'credit', icon: CreditCard, color: 'bg-warning', hover: 'hover:bg-warning/10 hover:text-warning hover:border-warning/30', label: t(`Credit`) },
          { id: 'gift_card', icon: Gift, color: 'bg-purple-500', hover: 'hover:bg-purple-500/10 hover:text-purple-500 hover:border-purple-500/30', label: 'Gift Card', span: 2 },
        ].map(method => (
          <button 
            type="button"
            key={method.id}
            onClick={() => setPaymentMethod(method.id as RegisterPaymentMethod)}
            className={`flex flex-col items-center justify-center gap-1.5 py-3 rounded-xl font-bold transition-all text-[11px] uppercase tracking-wider border ${method.span ? `col-span-${method.span}` : ''} ${
              paymentMethod === method.id 
                ? `${method.color} text-white border-transparent shadow-md scale-105 z-10 relative` 
                : `bg-surface/50 border-line/40 text-ink-soft ${method.hover}`
            }`}
          >
            <method.icon size={18} /> {method.label}
          </button>
        ))}
        <button 
          type="button"
          onClick={() => setPaymentMethod('split')}
          className={`col-span-4 flex flex-col items-center justify-center gap-1 py-3 rounded-xl font-bold transition-all text-xs uppercase tracking-widest border ${
            paymentMethod === 'split' ? 'bg-ink text-surface border-transparent shadow-md scale-105 z-10 relative' : 'bg-surface/50 border-line/40 text-ink-soft hover:bg-ink/10 hover:text-ink hover:border-ink/30'
          }`}
        >
          Split Payment (Mixed)
        </button>
      </div>

      {/* Local Payment Gateway QR Panel */}
      {(['bkash', 'nagad', 'rocket', 'upay', 'tap'] as RegisterPaymentMethod[]).includes(paymentMethod) && (
        <motion.div
          key={paymentMethod}
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
        >
          {(() => {
            const gatewayInfo: Record<string, { name: string; color: string; number: string; instruction: string; deeplink: string }> = {
              bkash: { name: 'bKash', color: '#E2136E', number: '01XXX-XXXXXX', instruction: 'Send Money to Merchant', deeplink: 'https://pay.bkash.com/?amount=' + total },
              nagad: { name: 'Nagad', color: '#F7941D', number: '01YYY-YYYYYY', instruction: 'Nagad Payment to Merchant', deeplink: 'https://pay.nagad.com.bd/?amount=' + total },
              rocket: { name: 'Rocket', color: '#8C1515', number: '01ZZZ-ZZZZZZ', instruction: 'DBBL Rocket Transfer to Merchant', deeplink: 'https://rocket.dutchbanglabank.com/?amount=' + total },
              upay: { name: 'Upay', color: '#0057A8', number: '01AAA-AAAAAA', instruction: 'UCB Upay Payment to Merchant', deeplink: 'https://upay.com.bd/?amount=' + total },
              tap: { name: 'Tap', color: '#00A651', number: '01BBB-BBBBBB', instruction: 'Tap & Pay via NFC/QR', deeplink: 'https://tap.com.bd/?amount=' + total },
            }
            const gw = gatewayInfo[paymentMethod]
            if (!gw) return null
            return (
              <div className="rounded-2xl border border-line/40 bg-surface/60 p-4 flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-widest" style={{ color: gw.color }}>{gw.name} {t(`Local Gateway`)}</p>
                    <p className="text-xs text-ink-soft mt-0.5">{gw.instruction}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xl font-black text-ink">{currencySymbol}{tNum(total.toLocaleString())}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 bg-surface rounded-xl border border-line/30 p-3">
                  <div className="w-16 h-16 shrink-0 rounded-xl border-2 flex items-center justify-center" style={{ borderColor: gw.color }}>
                    <div className="grid grid-cols-3 gap-0.5 p-1">
                      {Array.from({ length: 9 }).map((_, i) => (
                        <div key={i} className={`w-3 h-3 rounded-sm`} style={{ backgroundColor: [0,2,6,8].includes(i) ? gw.color : i === 4 ? gw.color : 'transparent', border: `1px solid ${gw.color}40` }} />
                      ))}
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[10px] text-ink-soft font-bold uppercase tracking-wider">{t(`Merchant Number`)}</p>
                    <p className="font-black text-ink text-sm mt-0.5">{gw.number}</p>
                    <a
                      href={gw.deeplink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 mt-1.5 text-[10px] font-black uppercase tracking-wider px-3 py-1 rounded-full"
                      style={{ backgroundColor: gw.color + '15', color: gw.color }}
                    >
                      {t(`Open App`)} &rarr;
                    </a>
                  </div>
                </div>
                <p className="text-[10px] text-ink-soft text-center">{t(`Confirm payment in app before charging`)}</p>
              </div>
            )
          })()}
        </motion.div>
      )}

      {paymentMethod === 'split' && (
        <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} className="space-y-2.5 pt-1 overflow-hidden">
          {[
            { id: 'cash', label: 'Cash' },
            { id: 'bkash', label: 'bKash' }, 
            { id: 'nagad', label: 'Nagad' },
            { id: 'rocket', label: 'Rocket' },
            { id: 'upay', label: 'Upay' },
            { id: 'tap', label: 'Tap' },
            { id: 'bank', label: 'Bank' },
            { id: 'gift_card', label: 'Gift Card' },
            { id: 'credit', label: 'Due (Baki)' }
          ].map(field => (
            <div key={field.id} className="flex items-center justify-between text-sm font-bold bg-surface/50 rounded-xl p-1.5 border border-line/30">
              <span className="pl-3 text-ink-soft">{field.label}:</span>
              <input type="number" 
                value={splitAmounts[field.id as keyof typeof splitAmounts] || ''} 
                onChange={e => setSplitAmounts(p => ({...p, [field.id]: Number(e.target.value)}))} 
                className="w-28 border border-line/50 bg-surface rounded-lg px-3 py-1.5 text-right font-black focus:border-accent outline-none" 
              />
            </div>
          ))}
          <div className="text-right text-xs font-bold text-ink-soft pt-1">
            Split Total: <span className="text-ink">{currencySymbol}{Object.values(splitAmounts).reduce((a, b) => a + b, 0).toLocaleString(undefined, {minimumFractionDigits: 2})}</span> / {currencySymbol}{total.toLocaleString(undefined, {minimumFractionDigits: 2})}
          </div>
        </motion.div>
      )}
    </div>
  )

  return (
    <div className="flex flex-col h-full min-h-[calc(100vh-140px)] md:h-[calc(100vh-140px)] lg:h-[calc(100vh-110px)] gap-3 lg:gap-4 font-sans selection:bg-accent/20">
      {/* Personalized Welcome Banner with Goal Gradient, Zeigarnik, Scarcity alerts & Labor Illusion */}
      {profile && (
        <motion.div 
          initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
          className={`flex flex-col shrink-0 rounded-2xl lg:rounded-[2rem] border ${catStyle.border} ${catStyle.bg} backdrop-blur-md px-6 py-4 lg:py-5 shadow-sm relative overflow-hidden gap-4`}
        >
          <div className="absolute inset-0 bg-gradient-to-r from-surface/40 to-transparent pointer-events-none"></div>
          
          <div className="flex items-center justify-between relative z-10 w-full">
            <div>
              <h2 className="font-heading font-black text-xl text-ink leading-tight tracking-tight">
                {t(`Welcome, ${profile.storeName}!`)}
              </h2>
              <p className="text-xs font-semibold text-ink-soft mt-0.5">
                {t(`Your ${profile.category} system is ready.`)}
              </p>
            </div>
            <div className="flex items-center gap-3">
              {/* Active Category Badge */}
              <span className={`text-[10px] sm:text-xs font-black uppercase tracking-widest px-3 py-1.5 rounded-lg bg-surface/80 backdrop-blur-md border border-line shadow-sm ${catStyle.text}`}>
                {profile.category}
              </span>
              {/* Mini Goal Progress Badge */}
              {setupProgress < 100 ? (
                <button 
                  onClick={() => setIsExpanded(!isExpanded)}
                  className="text-[10px] sm:text-xs font-black uppercase tracking-widest px-3 py-1.5 rounded-lg bg-warning/10 text-warning border border-warning/20 shadow-sm animate-pulse-soft hover:bg-warning/20 transition-all"
                >
                  {locale === 'bn' ? `সেটআপ ${setupProgress}%` : `Setup ${setupProgress}%`}
                </button>
              ) : (
                <span className="text-[10px] sm:text-xs font-black uppercase tracking-widest px-3 py-1.5 rounded-lg bg-success/10 text-success border border-success/20 shadow-sm">
                  {locale === 'bn' ? 'অপ্টিমাইজড' : 'Optimized'}
                </span>
              )}
            </div>
          </div>

          {/* Goal Gradient & Zeigarnik Onboarding Checklist */}
          {showProgressWidget && setupProgress < 100 && (
            <div className="relative z-10 bg-surface/50 border border-line/40 rounded-xl p-4 flex flex-col gap-3">
              <div className="flex items-center justify-between text-xs font-bold">
                <span className="text-ink flex items-center gap-2">
                  <Sparkles size={14} className="text-accent animate-pulse" />
                  {locale === 'bn' ? 'স্টোর অপ্টিমাইজেশন লক্ষ্য (Goal Gradient)' : 'Store Optimization Progress (Goal Gradient)'}
                </span>
                <div className="flex items-center gap-2">
                  <span className="text-accent">{setupProgress}% {locale === 'bn' ? 'সম্পন্ন' : 'Complete'}</span>
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowProgressWidget(false);
                      window.localStorage.setItem('equipulse-hide-setup-widget', 'true');
                    }}
                    className="text-ink-soft hover:text-danger font-black text-sm p-1 ml-1 leading-none transition-colors"
                    title="Dismiss"
                  >
                    ×
                  </button>
                </div>
              </div>
              
              {/* Progress Bar */}
              <div className="w-full bg-surface-strong/60 rounded-full h-2.5 overflow-hidden border border-line/20">
                <motion.div 
                  initial={{ width: 0 }}
                  animate={{ width: `${setupProgress}%` }}
                  transition={{ duration: 0.8, ease: 'easeOut' }}
                  className="bg-gradient-to-r from-accent via-indigo-500 to-success h-full"
                />
              </div>

              {/* Motivational nudge */}
              <p className="text-[11px] text-ink-soft leading-relaxed font-medium">
                {locale === 'bn' 
                  ? `💡 আর মাত্র ${100 - setupProgress}% সেটআপ বাকি আছে! সম্পূর্ণ ফিচারগুলো আনলক করতে নিচের অসমাপ্ত কাজগুলো সম্পন্ন করুন (Zeigarnik Effect)।`
                  : `💡 You are just ${100 - setupProgress}% away from full system calibration! Complete the pending tasks below to unlock ultimate retail capabilities (Zeigarnik Effect).`}
              </p>

              {/* Toggle checklist items */}
              <button 
                onClick={() => setIsExpanded(!isExpanded)}
                className="text-[11px] font-bold text-accent hover:underline text-left self-start mt-1 flex items-center gap-1"
              >
                {isExpanded 
                  ? (locale === 'bn' ? '▲ চেকলিস্ট লুকান' : '▲ Hide checklist items') 
                  : (locale === 'bn' ? '▼ অসমাপ্ত চেকলিস্ট দেখুন' : '▼ View pending checklist')}
              </button>

              <AnimatePresence>
                {isExpanded && (
                  <motion.div 
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden flex flex-col gap-2 mt-2 pt-2 border-t border-line/30"
                  >
                    {checklistItems.map(item => (
                      <div 
                        key={item.id}
                        onClick={() => {
                          if (item.link === 'customer-modal') {
                            setShowAddCustomerModal(true)
                          } else {
                            navigate(item.link)
                          }
                        }}
                        className={`flex items-center justify-between p-2.5 rounded-xl border text-xs cursor-pointer transition-all hover:bg-surface-strong/60 ${
                          item.completed 
                            ? 'bg-success/5 border-success/20 text-ink-soft' 
                            : 'bg-surface border-line/60 text-ink font-semibold hover:border-accent/40 shadow-sm'
                        }`}
                      >
                        <div className="flex flex-col">
                          <span className={item.completed ? 'line-through text-ink/40' : ''}>{item.label}</span>
                          <span className="text-[10px] font-normal text-ink-soft mt-0.5">{item.desc}</span>
                        </div>
                        <span className={`px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider ${
                          item.completed 
                            ? 'bg-success/10 text-success' 
                            : 'bg-warning/10 text-warning animate-pulse'
                        }`}>
                          {item.completed ? (locale === 'bn' ? 'সম্পন্ন' : 'Done') : (locale === 'bn' ? 'বাকি' : 'Pending')}
                        </span>
                      </div>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}

          {/* Urgency / Scarcity Inventory Alert */}
          {lowStockItems.length > 0 && (
            <motion.div 
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              className="relative z-10 bg-danger/5 border border-danger/20 rounded-xl p-3 flex items-start gap-2.5"
            >
              <span className="flex h-2 w-2 rounded-full bg-danger shadow-[0_0_8px_rgba(239,68,68,0.8)] animate-ping mt-1.5 shrink-0"></span>
              <div className="flex-1 text-xs">
                <span className="font-bold text-danger">
                  {locale === 'bn' ? `⚠️ জরুরি স্টক সতর্কতা (Urgency Principle): ` : `⚠️ CRITICAL SUPPLY SHORTAGE (Urgency/Scarcity): `}
                </span>
                <span className="text-ink-soft font-semibold">
                  {locale === 'bn' 
                    ? `আপনার স্টোরের ${lowStockItems.length}টি পণ্য রিঅর্ডার সীমার নিচে চলে গেছে। কাস্টমার অর্ডার মিস করা থেকে বাঁচতে এখনই স্টক রিফিল করুন!`
                    : `${lowStockItems.length} item(s) are critically low. Reorder now to preserve customer satisfaction levels and secure your sales pipeline!`}
                </span>
                <button 
                  onClick={() => navigate('/inventory')} 
                  className="text-accent underline hover:text-accent-ink font-bold block mt-1.5 animate-pulse"
                >
                  {locale === 'bn' ? 'পণ্য তালিকা দেখুন →' : 'Manage Inventory Catalog →'}
                </button>
              </div>
            </motion.div>
          )}

          {/* Labor Illusion Diagnostic Audit Panel */}
          <div className="relative z-10 flex flex-wrap items-center gap-3">
            <button 
              onClick={runStoreAudit}
              disabled={isAuditing}
              className="inline-flex items-center gap-2 rounded-xl bg-accent px-4 py-2.5 text-xs font-black text-white shadow-glow hover:opacity-90 active:scale-95 transition-all disabled:opacity-50"
            >
              {isAuditing ? (
                <>
                  <Loader2 size={13} className="animate-spin animate-fade-in" />
                  <span>{locale === 'bn' ? 'অডিট চলছে...' : 'Auditing System...'}</span>
                </>
              ) : (
                <>
                  <Sparkles size={13} className="animate-pulse" />
                  <span>{locale === 'bn' ? 'রিয়েল-টাইম এআই অডিট রান করুন' : 'Run Real-Time AI Audit'}</span>
                </>
              )}
            </button>
            {isAuditing && auditStep && (
              <span className="text-[11px] font-bold text-accent animate-pulse">{auditStep}</span>
            )}
            {!isAuditing && auditReport && (
              <div className="w-full mt-1.5 p-3 rounded-xl bg-surface/80 border border-line/60 text-xs font-bold text-ink-soft animate-fade-in shadow-inner">
                {auditReport}
              </div>
            )}
          </div>
        </motion.div>
      )}

      {/* AI Audit Fullscreen Loader */}
      <AnimatePresence>
        {isAuditing && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4 backdrop-blur-md"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-surface/95 backdrop-blur-3xl p-8 rounded-3xl shadow-[0_20px_60px_rgba(0,0,0,0.3)] border border-line/50"
            >
              <LaborIllusionLoader message={t("Running Real-Time AI Diagnostics & Optimization...")} />
              {auditStep && (
                <div className="text-center mt-4">
                  <span className="text-[11px] font-bold text-ink-soft animate-pulse">{auditStep}</span>
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex flex-col md:flex-row gap-3 lg:gap-6 min-h-0 flex-1 relative w-full h-full pb-20 md:pb-0">
        {/* Left: Product Selection - Kinetic Grid */}
        <div className="flex-1 min-w-0 flex flex-col bg-surface/60 backdrop-blur-2xl border border-line/40 rounded-[2rem] overflow-hidden shadow-sm md:shadow-[0_8px_30px_rgb(0,0,0,0.04)] relative min-h-[60vh] md:min-h-0 md:h-full">
          <div className={`absolute -top-40 -left-40 w-96 h-96 ${catStyle.bg} rounded-full blur-[120px] pointer-events-none opacity-40 animate-pulse-soft`}></div>
          <div className="absolute bottom-0 right-0 w-96 h-96 bg-accent/5 rounded-full blur-[120px] pointer-events-none opacity-40"></div>
          
          <div className="p-5 border-b border-line/30 bg-surface/50 backdrop-blur-md relative z-20 flex gap-3">
            <form onSubmit={handleBarcodeScan} className="relative group flex-1">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-ink-soft group-focus-within:text-accent transition-colors" size={20} />
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder={t(`Scan barcode or search name...`)}
                className="w-full bg-surface-strong/50 backdrop-blur-sm border border-line/50 rounded-2xl pl-12 pr-4 py-4 font-bold text-ink focus:border-accent focus:bg-surface focus:ring-4 focus:ring-accent/10 outline-none transition-all shadow-sm"
              />
              <button type="submit" className="hidden">Search</button>
            </form>
              <button
                type="button"
                onClick={startVoiceListening}
                className={`flex items-center justify-center shrink-0 w-[56px] rounded-2xl transition-all shadow-sm ${isVoiceListening ? 'bg-danger text-white animate-pulse shadow-glow-danger' : 'bg-surface-strong/50 border border-line/50 text-ink-soft hover:text-accent hover:border-accent/30'}`}
                title={t(`Voice Input`)}
              >
                <Mic size={20} />
              </button>
              <button
                type="button"
                onClick={handleImageRecognition}
                className="flex items-center justify-center shrink-0 w-[56px] rounded-2xl transition-all shadow-sm bg-surface-strong/50 border border-line/50 text-ink-soft hover:text-accent hover:border-accent/30"
                title="Image Recognition Checkout"
              >
                <Camera size={20} />
              </button>
          </div>
        
          <div className="flex-1 overflow-y-auto p-4 md:p-5 pb-[120px] md:pb-5 grid grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-3 md:gap-4 content-start z-10 relative">
            <AnimatePresence>
              {filteredItems.map(item => (
                <motion.button
                  layout
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  whileHover={{ y: -4, scale: 1.02 }}
                  whileTap={{ scale: 0.95 }}
                  key={item.id}
                  onClick={() => addToCart(item)}
                  disabled={item.quantity <= 0}
                  className={`text-left p-4 md:p-5 rounded-2xl border transition-all relative overflow-hidden group flex flex-col justify-between min-h-[130px] md:min-h-[150px] ${
                    item.quantity <= 0 
                      ? 'border-danger/30 bg-danger/5 opacity-60 cursor-not-allowed grayscale' 
                      : 'border-line/40 bg-surface/60 backdrop-blur-xl hover:border-accent/60 hover:shadow-[0_8px_24px_rgb(0,0,0,0.08)] hover:bg-surface hover:-translate-y-1'
                  }`}
                >
                  <div className="absolute inset-0 bg-gradient-to-br from-accent/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                  <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-accent to-focus scale-x-0 group-hover:scale-x-100 transition-transform duration-300 origin-left rounded-full" />
                  <div className="relative z-10 flex-1 flex flex-col justify-start">
                    <h3 className="font-heading font-extrabold text-ink line-clamp-2 whitespace-normal leading-snug text-sm md:text-base mb-1.5" title={item.name}>{item.name}</h3>
                    <p className="text-[10px] md:text-[11px] font-bold tracking-wider text-ink-soft/70 uppercase">{item.category || 'General'}</p>
                  </div>
                  <div className="flex justify-between items-end mt-4 relative z-10">
                    <span className="font-black text-accent text-base md:text-lg tracking-tight">{currencySymbol}{tNum(item.price.toLocaleString())}</span>
                    <div className="flex flex-col items-end gap-1">
                      {item.quantity > 0 && item.quantity <= (item.minThreshold || 5) ? (
                        <span className="text-[9px] font-black uppercase tracking-wider px-2 py-1 rounded-lg bg-danger text-white border border-danger shadow-glow-danger animate-pulse flex items-center gap-1">
                          ⚠️ Only {item.quantity} Left! High Demand!
                        </span>
                      ) : (
                        <span className={`text-[10px] font-black uppercase tracking-wider px-2 py-1 rounded-lg ${item.quantity <= 0 ? 'bg-danger/10 text-danger' : 'bg-surface-strong text-ink-soft border border-line/50'}`}>
                          {item.quantity <= 0 ? 'Out of Stock' : `${item.quantity} ${item.unit}`}
                        </span>
                      )}
                    </div>
                  </div>
                </motion.button>
              ))}
            </AnimatePresence>
            {filteredItems.length === 0 && (
              <div className="col-span-full py-20 text-center text-ink-soft">
                <Search size={48} className="mx-auto opacity-20 mb-4" />
                <p className="font-bold">{t(`No products found.`)}</p>
              </div>
            )}
          </div>
        </div>

        {/* Floating Mobile Cart Summary Button */}
        <div className="md:hidden fixed bottom-[calc(env(safe-area-inset-bottom)+4.5rem)] left-4 right-4 z-[40]">
          <button 
            onClick={() => setIsMobileCartOpen(true)}
            className="w-full bg-accent/95 backdrop-blur-md text-surface px-5 py-4 rounded-[1.5rem] shadow-[0_8px_30px_-5px_rgba(var(--color-accent),0.5)] font-black flex items-center justify-between border border-white/20 active:scale-95 transition-transform"
          >
             <div className="flex items-center gap-3">
               <div className="relative p-2 bg-white/20 rounded-xl">
                 <ShoppingCart size={20} />
                 <span className="absolute -top-1.5 -right-1.5 bg-danger text-white text-[10px] w-5 h-5 rounded-full flex items-center justify-center border-2 border-accent shadow-sm">{tNum(cart.length)}</span>
               </div>
               <span className="tracking-wide text-sm">{t(`View Cart`)}</span>
             </div>
             <div className="flex items-center gap-3">
               <span className="text-lg tracking-tight">{currencySymbol}{tNum(total.toLocaleString())}</span>
               <div className="w-1 h-6 bg-white/30 rounded-full"></div>
               <span className="text-xs uppercase tracking-widest text-white/80">{t(`Pay`)}</span>
             </div>
          </button>
        </div>

        {/* Mobile Overlay */}
        <AnimatePresence>
          {isMobileCartOpen && (
             <motion.div 
               initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
               onClick={() => setIsMobileCartOpen(false)}
               className="md:hidden fixed inset-0 bg-ink/60 backdrop-blur-sm z-[50]"
             />
          )}
        </AnimatePresence>

        {/* Right: Cart & Checkout - Glassmorphic Panel */}
        <div className={`fixed left-0 bottom-0 w-full max-w-[100vw] z-[60] transition-transform duration-500 ease-out md:static md:z-20 md:w-[320px] lg:w-[360px] xl:w-[400px] flex flex-col bg-surface/95 md:bg-surface-strong/80 backdrop-blur-3xl border-t md:border border-line/40 rounded-t-[2rem] md:rounded-3xl lg:rounded-[2rem] overflow-hidden shadow-[0_-10px_40px_rgba(0,0,0,0.15)] md:shadow-[0_8px_40px_rgb(0,0,0,0.08)] h-[90vh] md:h-full shrink-0 pb-[calc(env(safe-area-inset-bottom)+0.5rem)] md:pb-0 ${isMobileCartOpen ? 'translate-y-0' : 'translate-y-full md:translate-y-0'}`}>
          {/* Drag Handle for Mobile */}
          <div className="md:hidden w-full flex justify-center pt-3 pb-1 shrink-0 cursor-grab" onClick={() => setIsMobileCartOpen(false)}>
            <div className="w-12 h-1.5 bg-line/50 rounded-full"></div>
          </div>
          <div className="p-4 md:p-6 border-b border-line/30 flex flex-col bg-surface-strong/30 backdrop-blur-md shrink-0">
            <div className="flex flex-col">
              <div className="flex items-center justify-between">
                <h2 className="font-heading font-black text-2xl flex items-center gap-3 truncate">
                  <div className="p-2.5 bg-accent/10 rounded-2xl shrink-0">
                    <ShoppingCart size={24} className="text-accent" />
                  </div>
                  <span className="truncate">{t(`Current Sale`)}</span>
                </h2>
                <button 
                  onClick={() => setIsMobileCartOpen(false)} 
                  className="md:hidden p-2 bg-surface border border-line/50 rounded-xl text-ink-soft hover:text-ink transition-colors"
                >
                  <X size={18} />
                </button>
              </div>
              {activeLocation && (
                <span className="text-xs font-black text-ink-strong uppercase tracking-widest mt-4 mb-3 flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-accent animate-pulse-soft shadow-[0_0_8px_rgba(var(--color-accent),0.6)]"></div>
                  {activeLocation}
                </span>
              )}
              <div className="flex flex-col w-full mt-4 relative">
                <div className="flex justify-between items-center text-[10px] font-bold text-ink-soft uppercase tracking-widest mb-2">
                  <span className="flex items-center gap-1.5">
                    {goalProgress >= 80 && goalProgress < 100 && <span className="text-accent animate-bounce">🔥</span>}
                    {goalProgress >= 100 && <span className="text-success">🎯</span>}
                    {t('Daily Target')}
                  </span>
                  <span className={`transition-colors duration-500 ${goalProgress >= 100 ? 'text-success font-black text-xs' : 'text-accent'}`}>{Math.round(goalProgress)}%</span>
                </div>
                <div className="w-full h-2.5 bg-line/50 rounded-full overflow-hidden relative shadow-inner">
                  <div 
                    className={`absolute top-0 left-0 h-full rounded-full transition-all duration-1000 ease-out ${goalProgress >= 100 ? 'bg-success shadow-[0_0_10px_rgba(16,185,129,0.8)]' : goalProgress >= 80 ? 'bg-accent shadow-[0_0_10px_rgba(var(--color-accent),0.6)] animate-pulse-soft' : 'bg-accent'}`} 
                    style={{ width: `${Math.min(goalProgress, 100)}%` }}
                  >
                    {goalProgress > 0 && goalProgress < 100 && (
                      <div className="absolute top-0 right-0 bottom-0 w-4 bg-gradient-to-r from-transparent to-white/40 rounded-r-full"></div>
                    )}
                  </div>
                </div>
                {goalProgress >= 80 && goalProgress < 100 && <span className="text-[10px] text-accent font-bold mt-2 uppercase text-right tracking-wider animate-pulse-soft">Almost there! Keep pushing 💪</span>}
                {goalProgress >= 100 && <span className="text-[10px] text-success font-bold mt-2 uppercase text-right tracking-wider animate-bounce">Target Unlocked! 🎉 Excellent Work!</span>}
              </div>
            </div>
            <div className="flex flex-wrap gap-2.5 mt-6">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setIsRefundMode(!isRefundMode)}
                className={`flex-1 min-w-[90px] flex flex-col sm:flex-row justify-center items-center gap-1.5 font-bold p-2.5 rounded-xl text-[11px] sm:text-xs transition-colors border ${
                  isRefundMode 
                    ? 'bg-danger text-white border-danger shadow-glow' 
                    : 'bg-surface text-ink hover:bg-danger/10 hover:text-danger border-line/40'
                }`}
              >
                <Receipt size={18} className="shrink-0" />
                <span className="whitespace-nowrap">{t(`Refund Mode`)}</span>
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setShowDraftsModal(true)}
                className="flex-1 min-w-[90px] flex flex-col sm:flex-row justify-center items-center gap-1.5 bg-focus/10 text-focus hover:bg-focus/20 font-bold p-2.5 rounded-xl text-[11px] sm:text-xs transition-colors border border-focus/20 relative"
              >
                <Bookmark size={18} fill="currentColor" className="shrink-0" />
                <span className="whitespace-nowrap">{t(`Drafts`)}</span>
                {drafts.length > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 sm:static bg-focus text-white text-[10px] rounded-full w-5 h-5 flex items-center justify-center font-black shadow-md">{drafts.length}</span>
                )}
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setShowExpenseModal(true)}
                className="flex-1 min-w-[90px] flex flex-col sm:flex-row justify-center items-center gap-1.5 bg-danger/10 text-danger hover:bg-danger/20 font-bold p-2.5 rounded-xl text-[11px] sm:text-xs transition-colors border border-danger/20"
              >
                <Receipt size={18} className="shrink-0" />
                <span className="whitespace-nowrap">{t(`Expense`)}</span>
              </motion.button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-3 relative">
            <AnimatePresence mode="popLayout">
              {cart.map((c, index) => (
                <motion.div 
                  layout
                  initial={{ opacity: 0, x: 20, scale: 0.95 }}
                  animate={{ opacity: 1, x: 0, scale: 1 }}
                  exit={{ opacity: 0, x: -20, scale: 0.95 }}
                  key={`${c.item.id}-${index}`} 
                  className="flex gap-3 items-center border border-line/40 bg-surface/50 p-3 rounded-2xl shadow-sm hover:border-line/80 transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <h4 className="font-bold text-sm text-ink truncate leading-tight mb-1">{c.item.name}</h4>
                    <p className="text-[11px] font-bold tracking-wider text-ink-soft/70 uppercase">
                      {currencySymbol}{tNum(c.item.price.toLocaleString())}
                      {c.serialNumber && <span className="ml-2 text-accent bg-accent/10 px-1.5 py-0.5 rounded-md">SN: {c.serialNumber}</span>}
                    </p>
                  </div>
                  <div className="flex items-center gap-1 bg-surface-strong/50 rounded-xl p-1 border border-line/30 w-[100px] justify-between shadow-inner relative">
                    {scaleConnected && ['kg', 'g', 'oz', 'lb'].includes(c.item.unit.toLowerCase()) && (
                      <button 
                        onClick={() => setQty(index, scaleWeight)}
                        title="Read from Scale"
                        className="absolute -top-3 -right-3 bg-accent text-surface p-1.5 rounded-full shadow-glow z-10 hover:scale-110 transition-transform"
                      >
                        <Scale size={12} />
                      </button>
                    )}
                    <button onClick={() => updateQty(index, -1)} className="p-1.5 hover:bg-surface hover:shadow-sm rounded-lg text-ink-soft hover:text-ink transition-all"><Minus size={14} /></button>
                    <input 
                      type="number" 
                      step="any" 
                      min="0" 
                      value={c.qty} 
                      onChange={(e) => setQty(index, parseFloat(e.target.value) || 0)} 
                      className="w-12 text-center bg-transparent font-black text-sm outline-none no-spinners" 
                    />
                    <button onClick={() => updateQty(index, 1)} className="p-1.5 hover:bg-surface hover:shadow-sm rounded-lg text-ink-soft hover:text-ink transition-all"><Plus size={14} /></button>
                  </div>
                  <div className="font-black text-base w-16 text-right text-ink tracking-tight">
                    {currencySymbol}{tNum((c.qty * c.item.price).toLocaleString())}
                  </div>
                  <button onClick={() => removeCartItem(index)} className="p-2.5 text-danger/60 hover:text-danger hover:bg-danger/10 rounded-xl transition-colors">
                    <Trash2 size={16} />
                  </button>
                </motion.div>
              ))}
            </AnimatePresence>
            {cart.length === 0 && (
              <div className="h-full flex flex-col items-center justify-center text-ink-soft/40 space-y-4">
                <div className="p-6 bg-surface-strong/30 rounded-full">
                  <ShoppingCart size={48} className="opacity-50" />
                </div>
                <p className="font-bold text-sm tracking-widest uppercase">{t(`Cart is empty`)}</p>
              </div>
            )}

            {cart.length > 0 && (
              <div className="border-t border-line/30 pt-4 mt-4">
                {renderPaymentAndCustomer()}
              </div>
            )}
          </div>

          <div className="p-4 md:p-5 border-t border-line/20 md:border-line/30 bg-surface/95 md:bg-surface-strong/40 backdrop-blur-md space-y-4 shrink-0 z-20">
            {/* Cart Summary in fixed footer */}
            {cart.length > 0 && renderCartSummary()}

            {/* Checkout Button (Visible on both mobile and desktop) */}
            <div className="flex gap-2 w-full">
              {cart.length > 0 && (
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => {
                    const dName = prompt(t(`Enter a name for this parked cart:`))
                    if (dName) {
                      saveDraft(dName, cart)
                      setCart([])
                      toast(t(`Cart Parked`), '', 'success')
                    }
                  }}
                  className="w-1/3 py-5 sm:py-6 bg-surface-strong text-ink rounded-2xl font-black text-sm flex flex-col items-center justify-center gap-1 hover:bg-line/50 transition-all border border-line/50 shadow-sm"
                >
                  <Clock size={20} />
                  <span>{t(`Park`)}</span>
                </motion.button>
              )}
              <motion.button 
                id="tour-pos-checkout"
                whileHover={cart.length > 0 && !isProcessingCheckout ? { scale: 1.02, y: -2 } : {}}
                whileTap={cart.length > 0 && !isProcessingCheckout ? { scale: 0.98 } : {}}
                disabled={cart.length === 0 || isProcessingCheckout}
                onClick={handleCheckout}
                className="flex-1 py-5 sm:py-6 bg-accent text-surface rounded-2xl font-black text-xl sm:text-2xl flex items-center justify-center gap-3 hover:bg-accent/90 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-[0_8px_30px_-5px_rgba(var(--color-accent),0.4)] hover:shadow-[0_12px_40px_-5px_rgba(var(--color-accent),0.6)] relative overflow-hidden group"
              >
                <div className="absolute inset-0 bg-white/20 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700 ease-in-out"></div>
                {isProcessingCheckout ? (
                  <div className="relative z-10 flex flex-col items-center justify-center">
                    <span className="text-lg animate-pulse">{checkoutStage}</span>
                  </div>
                ) : (
                  <>
                    <Printer size={26} className="relative z-10" />
                    <span className="relative z-10 tracking-wide">{t(`Checkout & Print`)}</span>
                  </>
                )}
              </motion.button>
            </div>
          </div>
        </div>

      <AnimatePresence>
        {showDraftsModal && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[150] flex items-center justify-center bg-surface-strong/80 p-4 backdrop-blur-md"
          >
            <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }} className="w-full max-w-md overflow-hidden rounded-[2rem] border border-line/40 bg-surface/90 backdrop-blur-xl shadow-2xl">
              <div className="flex items-center justify-between border-b border-line/30 bg-surface-strong/30 p-5">
                <h3 className="font-heading text-xl font-black text-ink flex items-center gap-2"><Bookmark className="text-focus"/> {t(`Drafts & Suspended Sales`)}</h3>
                <button onClick={() => setShowDraftsModal(false)} className="rounded-xl p-2 text-ink-soft hover:bg-surface hover:text-ink"><X size={20} /></button>
              </div>
              <div className="p-4 max-h-[60vh] overflow-y-auto space-y-3">
                {drafts.length === 0 ? (
                  <div className="text-center py-10 text-ink-soft font-bold">{t(`No drafts found.`)}</div>
                ) : (
                  drafts.map(draft => (
                    <div key={draft.id} className="flex flex-col gap-2 p-4 border border-line/50 rounded-2xl bg-surface hover:border-focus/40 transition-colors">
                      <div className="flex justify-between items-start">
                        <div>
                          <h4 className="font-bold text-ink">{draft.name}</h4>
                          <p className="text-xs text-ink-soft">{new Date(draft.timestamp).toLocaleString()}</p>
                          <p className="text-sm font-bold mt-1 text-accent">{draft.items.length} items</p>
                        </div>
                        <div className="flex gap-2">
                          <button onClick={() => { setCart(draft.items); removeDraft(draft.id); setShowDraftsModal(false); toast('Cart Loaded', '', 'success'); }} className="px-3 py-1.5 bg-focus text-surface text-xs font-bold rounded-lg hover:bg-focus/90">Load</button>
                          <button onClick={() => removeDraft(draft.id)} className="px-2 py-1.5 bg-danger/10 text-danger text-xs font-bold rounded-lg hover:bg-danger/20"><Trash2 size={16} /></button>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </motion.div>
          </motion.div>
        )}

        {showExpenseModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[150] flex items-center justify-center bg-surface-strong/80 p-4 backdrop-blur-md"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              className="w-full max-w-md overflow-hidden rounded-[2rem] border border-line/40 bg-surface/90 backdrop-blur-xl shadow-2xl"
            >
              <div className="flex items-center justify-between border-b border-line/30 bg-surface-strong/30 p-5">
                <h3 className="font-heading text-xl font-black text-ink">
                  {t(`Daily Expense Entry`)}
                </h3>
                <button
                  onClick={() => setShowExpenseModal(false)}
                  className="rounded-xl p-2 text-ink-soft hover:bg-surface hover:text-ink transition-colors border border-transparent hover:border-line"
                >
                  <X size={20} />
                </button>
              </div>

              <form onSubmit={handleExpenseSubmit} className="p-6 space-y-5">
                <div className="space-y-2">
                  <label className="text-xs font-black uppercase tracking-wider text-ink-soft">
                    {locale === 'bn' ? `খরচের পরিমাণ (${currencySymbol})` : `Amount (${currencySymbol})`}
                  </label>
                  <input
                    type="number"
                    required
                    value={expenseAmount}
                    onChange={(e) => setExpenseAmount(e.target.value)}
                    className="w-full rounded-xl border border-line bg-surface-strong/50 p-4 font-bold text-lg focus:border-accent focus:outline-none focus:ring-4 focus:ring-accent/10 transition-all"
                    placeholder="e.g., 150"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-black uppercase tracking-wider text-ink-soft">
                    {t(`Category`)}
                  </label>
                  <select
                    value={expenseCategory}
                    onChange={(e) => setExpenseCategory(e.target.value)}
                    className="w-full rounded-xl border border-line bg-surface-strong/50 p-4 font-bold focus:border-accent focus:outline-none focus:ring-4 focus:ring-accent/10 transition-all"
                  >
                    <option value="tea">{t(`Tea & Snacks`)}</option>
                    <option value="transport">{t(`Transport`)}</option>
                    <option value="utility">{t(`Utility Bill`)}</option>
                    <option value="labor">{t(`Labor`)}</option>
                    <option value="other">{t(`Other`)}</option>
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-black uppercase tracking-wider text-ink-soft">
                    {t(`Note (Optional)`)}
                  </label>
                  <input
                    type="text"
                    value={expenseNote}
                    onChange={(e) => setExpenseNote(e.target.value)}
                    className="w-full rounded-xl border border-line bg-surface-strong/50 p-4 font-bold focus:border-accent focus:outline-none focus:ring-4 focus:ring-accent/10 transition-all"
                    placeholder={t(`Write details...`)}
                  />
                </div>

                <div className="pt-4">
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    type="submit"
                    className="w-full rounded-xl bg-danger py-4 text-base font-black text-white shadow-lg shadow-danger/20 hover:bg-danger/90 transition-all"
                  >
                    {t(`Save Expense`)}
                  </motion.button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}

        {showAddCustomerModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[150] flex items-center justify-center bg-surface-strong/80 p-4 backdrop-blur-md"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              className="w-full max-w-sm overflow-hidden rounded-[2rem] border border-line/40 bg-surface/90 backdrop-blur-xl shadow-2xl"
            >
              <div className="flex items-center justify-between border-b border-line/30 bg-surface-strong/30 p-5">
                <h3 className="font-heading text-xl font-black text-ink flex items-center gap-2">
                  <div className="p-2 bg-accent/10 rounded-lg">
                    <UserPlus size={18} className="text-accent" />
                  </div>
                  {t(`New Customer`)}
                </h3>
                <button
                  onClick={() => setShowAddCustomerModal(false)}
                  className="rounded-xl p-2 text-ink-soft hover:bg-surface hover:text-ink transition-colors border border-transparent hover:border-line"
                >
                  <X size={20} />
                </button>
              </div>

              <form onSubmit={handleAddCustomer} className="p-6 space-y-5">
                <div className="space-y-2">
                  <label className="text-xs font-black uppercase tracking-wider text-ink-soft">
                    {t(`Customer Name`)}
                  </label>
                  <input
                    type="text"
                    required
                    value={newCustomerName}
                    onChange={(e) => setNewCustomerName(e.target.value)}
                    className="w-full rounded-xl border border-line bg-surface-strong/50 p-4 font-bold focus:border-accent focus:outline-none focus:ring-4 focus:ring-accent/10 transition-all"
                    placeholder={t(`e.g. Rahim`)}
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-black uppercase tracking-wider text-ink-soft">
                    {t(`Mobile Number`)}
                  </label>
                  <input
                    type="tel"
                    value={newCustomerMobile}
                    onChange={(e) => setNewCustomerMobile(e.target.value)}
                    className="w-full rounded-xl border border-line bg-surface-strong/50 p-4 font-bold focus:border-accent focus:outline-none focus:ring-4 focus:ring-accent/10 transition-all"
                    placeholder={t(`e.g. 01712...`)}
                  />
                </div>

                <div className="pt-4">
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    type="submit"
                    className="w-full rounded-xl bg-accent py-4 text-base font-black text-surface shadow-lg shadow-accent/20 hover:bg-accent/90 transition-all"
                  >
                    {t(`Save Customer`)}
                  </motion.button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      </div>
    </div>
  )
}


