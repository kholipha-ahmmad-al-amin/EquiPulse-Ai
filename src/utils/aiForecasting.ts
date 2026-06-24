import type { InventoryItem } from '../hooks/useInventory'
import type { DailyRegister } from '../hooks/useDailyRegister'
import type { CustomerCredit } from '../hooks/useCustomerLedger'
import { generateAiContent } from './aiClient'
import type { ApiKeys } from '../hooks/useApiKeys'

export type RestockSuggestion = {
  itemName: string
  currentQuantity: number
  suggestedQuantity: number
  reason: { en: string; bn: string }
  priority: 'Urgent' | 'Opportunity' | 'Advice'
}

export async function generateRestockAnalysis(
  items: InventoryItem[],
  register: DailyRegister | null,
  credits: CustomerCredit[],
  apiKeys?: ApiKeys
): Promise<RestockSuggestion[]> {
  if (!apiKeys || (!apiKeys.gemini && !apiKeys.groq && !apiKeys.openrouter)) return []

  const inventorySummary = items
    .slice(0, 40)
    .map(i => `${i.name}: ${i.quantity} ${i.unit} (Min: ${i.minThreshold}, Price: ${i.price} Tk)`)
    .join('\n')

  const salesSummary = register 
    ? register.transactions
        .filter(t => t.type === 'sale')
        .slice(-20)
        .map(t => `${t.note}: ${t.amount} Tk`)
        .join('\n')
    : 'No recent sales'

  const totalBaki = credits.reduce((sum, c) => sum + c.amount, 0)

  const systemPrompt = `You are an expert retail inventory forecaster for a Bangladeshi shop.
Analyze the following shop data and suggest EXACTLY 3 items to restock or actions to take.
Focus on items below their minimum threshold or high-velocity sales items.
Include localized context (e.g., mention common Bangladeshi brands or seasonal items if applicable).

Inventory:
${inventorySummary}

Recent Sales:
${salesSummary}

Total Outstanding Credit (Baki): ৳${totalBaki}

Return ONLY a JSON array of 3 objects:
[{
  "itemName": string,
  "currentQuantity": number,
  "suggestedQuantity": number,
  "reason": { "en": string, "bn": string },
  "priority": "Urgent" | "Opportunity" | "Advice"
}]`

  try {
    const response = await generateAiContent({
      apiKeys,
      systemPrompt,
      parts: [{ text: "Analyze my shop data and give me 3 restock suggestions." }],
      expectJson: true
    })

    return JSON.parse(response)
  } catch (err) {
    console.error('Forecasting error:', err)
    return []
  }
}
