import { t } from 'i18next'
import type { InventoryItem } from '../hooks/useInventory'
import type { DailyRegister } from '../hooks/useDailyRegister'
import type { CustomerCredit } from '../hooks/useCustomerLedger'
import type { StoreProfile } from '../hooks/useStoreProfile'
import type { StaffMember } from '../hooks/useStaff'

export type LocalChatContext = {
  items: InventoryItem[]
  register: DailyRegister | null
  credits: CustomerCredit[]
  profile: StoreProfile | null
  staff: StaffMember[]
}

const REGEX = {
  sales: /sale|সেল|বিক্রি|বেচাবিক্রি|income|আয়|আজকে|today/i,
  inventory: /stock|স্টক|inventory|পণ্য|product|item|shortage|কম/i,
  baki: /baki|বাকি|due|credit|ধার|পাওনা/i,
  staff: /staff|স্টাফ|কর্মচারী|manager|ম্যানেজার|cashier/i,
  greeting: /hello|hi|hey|হ্যালো|হাই|কেমন|আছো|assalamu|salam|সালাম/i,
  owner: /মালিক|owner|আমার নাম|my name/i,
}

function formatCurrency(amount: number) {
  return `৳${amount.toLocaleString('en-IN')}`
}

export function evaluateLocalChatQuery(query: string, context: LocalChatContext, _locale: 'bn' | 'en'): string | null {
  const { items, register, credits, profile, staff } = context
  void _locale
  const ownerName = profile?.ownerName || (t(`Owner`))
  const storeName = profile?.storeName || (t(`your store`))

  // Check Greetings
  if (REGEX.greeting.test(query) && !REGEX.sales.test(query) && !REGEX.baki.test(query)) {
    return t(`Hello ${ownerName}! I am the local AI assistant for "${storeName}". How can I help you today? (e.g., ask "What is today's sale?" or "Who is on staff?")`)
  }

  // Check Owner/Profile Info
  if (REGEX.owner.test(query)) {
    return t(`This business is "${storeName}", owned by "${ownerName}".`)
  }

  // Check Sales Intent
  if (REGEX.sales.test(query)) {
    if (!register) {
      return t(`No sales register opened for today yet. Please open the register in POS.`)
    }
    const transactions = register.transactions || []
    const salesCount = transactions.filter(t => t.type === 'sale').length
    const totalSalesAmount = transactions.filter(t => t.type === 'sale').reduce((acc, t) => acc + t.amount, 0)
    const totalExpenses = transactions.filter(t => t.type === 'expense').reduce((acc, t) => acc + t.amount, 0)
    
    return t(`Today's total sales: ${formatCurrency(totalSalesAmount)} from ${salesCount} transactions.\nTotal expenses: ${formatCurrency(totalExpenses)}.\nOpening balance: ${formatCurrency(register.openingBalance)}.`)
  }

  // Check Baki Intent
  if (REGEX.baki.test(query)) {
    const totalCredit = credits.reduce((acc, c) => acc + c.amount, 0)
    const activeCustomers = credits.filter(c => c.amount > 0).length
    
    if (totalCredit === 0) {
      return t(`You currently have no outstanding dues from any customer. Great job!`)
    }
    
    return t(`You have a total due of ${formatCurrency(totalCredit)} from ${activeCustomers} customers. You might want to check the ledger and send reminders.`)
  }

  // Check Staff Intent
  if (REGEX.staff.test(query)) {
    if (!staff || staff.length === 0) {
      return t(`You haven't added any staff to "${storeName}" yet. You can add them from Staff Management.`)
    }
    
    const staffNames = staff.map(s => `${s.name} (${s.role})`).join(', ')
    return t(`You currently have ${staff.length} staff members: ${staffNames}.`)
  }

  // Check Inventory Intent
  if (REGEX.inventory.test(query)) {
    const lowStock = items.filter(i => i.quantity <= i.minThreshold)
    const totalValue = items.reduce((acc, i) => acc + (i.price * i.quantity), 0)
    
    let baseMsg = t(`You have ${items.length} products in inventory, with an estimated stock value of ${formatCurrency(totalValue)}.`)
      
    if (lowStock.length > 0) {
      const lowStockNames = lowStock.slice(0, 3).map(i => i.name).join(', ')
      baseMsg += t(`\n\nWarning: ${lowStock.length} products are running low on stock (e.g., ${lowStockNames}). Please restock.`)
    } else {
      baseMsg += t(`\n\nAll products have sufficient stock right now.`)
    }
    return baseMsg
  }

  // Fallback (Return null so the UI can decide to call Gemini or display a generic offline message)
  return null
}

/**
 * Attempts to call a locally running Ollama instance (e.g. Llama 3 or DeepSeek-R1-7B)
 * as an offline fallback when Gemini is unavailable.
 */
export async function queryOllamaOffline(prompt: string, context: LocalChatContext): Promise<string | null> {
  try {
    const contextStr = `Store Info: ${context.profile?.storeName || 'Unknown Store'}. 
    Inventory Items: ${context.items.length}. 
    Today Sales: ${context.register?.transactions?.filter(t => t.type === 'sale').length || 0}.`

    const response = await fetch('http://localhost:11434/api/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'llama3', // or 'deepseek-r1:7b'
        prompt: `System: You are an offline AI assistant for an SME POS system. Context: ${contextStr}\nUser: ${prompt}`,
        stream: false,
        options: {
          temperature: 0.3
        }
      })
    })

    if (!response.ok) {
      return null;
    }

    const data = await response.json()
    return data.response || null
  } catch (err) {
    // Ollama is likely not running or inaccessible
    console.warn('Ollama offline fallback failed:', err)
    return null
  }
}
