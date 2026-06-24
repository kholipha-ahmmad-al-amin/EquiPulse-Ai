import { useCallback, useState } from 'react'
import { generateAiContent } from '../utils/aiClient'
import { useInventory } from './useInventory'
import { useDailyRegister } from './useDailyRegister'
import { useCustomerLedger } from './useCustomerLedger'
import { useApiKeys } from './useApiKeys'

export type AiDecisionTask = {
  id: string
  priority: string
  title: { en: string; bn: string }
  meta: { en: string; bn: string }
  summary: { en: string; bn: string }
  metrics: { confidence: string; revenueImpact: string; stockImpact: string }
  risk: { level: string; guardrail: string; sources: string }
  logic: { en: string[]; bn: string[] }
}

export function useAiTasks() {
  const [tasks, setTasks] = useState<AiDecisionTask[]>([])
  const [loading, setLoading] = useState(false)
  const { items } = useInventory()
  const { register } = useDailyRegister()
  const { credits } = useCustomerLedger()
  const [apiKeys] = useApiKeys()

  const fetchTasks = useCallback(async () => {
    setLoading(true)
    try {
      
      const inventoryContext = items.slice(0, 30).map(i => `${i.name}: ${i.quantity} ${i.unit} (Min: ${i.minThreshold}, Price: ${i.price} Tk)`).join('\n')
      const totalCredit = credits.reduce((acc, c) => acc + c.amount, 0)
      const transactions = register?.transactions || []
      const totalSales = transactions.filter(t => t.type === 'sale').reduce((acc, t) => acc + t.amount, 0)
      const salesContext = register 
        ? `Today's Sales: ${totalSales} Tk from ${transactions.filter(t => t.type === 'sale').length} sales. Expenses: ${transactions.filter(t => t.type === 'expense').reduce((acc, t) => acc + t.amount, 0)} Tk.` 
        : 'No sales recorded today.'
      
      const systemPrompt = `You are "EquiPulse AI" Backend. Your job is to analyze Bangladeshi SME shop data and generate EXACTLY 3 actionable, high-impact business tasks.

Data Context:
[INVENTORY]
${inventoryContext}

[DAILY SALES]
${salesContext}

[LEDGER / BAKI]
Total Outstanding: ${totalCredit} Tk from ${credits.length} customers.

Instructions:
1. Generate tasks that cover different areas: Inventory Restock, Baki Collection, or Sales Opportunity.
2. Be specific. Use the names of products or amounts from the data.
3. Language: Bengali (bn) and English (en) for all text fields. Use natural, business-friendly Bengali.
4. Priorities: "Urgent" (Stockouts/Huge Baki), "Opportunity" (Up-selling/Seasonal), "Advice" (General optimization).
5. Risk: Level (Low/Medium/High) and a "guardrail" (safety advice).
6. Metrics: Quantifiable impact (Revenue, Stock, Confidence %).

Return ONLY a JSON array of 3 objects matching this type:
{
  id: string,
  priority: "Urgent" | "Opportunity" | "Advice",
  title: { en: string; bn: string },
  meta: { en: string; bn: string },
  summary: { en: string; bn: string },
  metrics: { confidence: string; revenueImpact: string; stockImpact: string },
  risk: { level: "Low"|"Medium"|"High"; guardrail: string; sources: string },
  logic: { en: string[]; bn: string[] }
}

Example Meta: "Inventory Alert", "Collection Task", "Growth Signal".`

      const jsonStr = await generateAiContent({
        apiKeys,
        model: 'gemini-1.5-flash',
        systemPrompt: systemPrompt,
        parts: [{ text: 'Generate 3 prioritized business decisions based on my shop data.' }],
        expectJson: true
      })

      const parsed = JSON.parse(jsonStr)
      if (Array.isArray(parsed) && parsed.length > 0) {
        setTasks(parsed)
      }
    } catch (err) {
      console.error('Failed to fetch AI tasks', err)
      // Display localized error advice if possible
    } finally {
      setLoading(false)
    }
  }, [credits, items, register, apiKeys])

  // Fetch only once when the user visits the queue or based on some trigger.
  // For safety, let's expose fetchTasks so the UI can call it manually.
  
  return { tasks, loading, fetchTasks, setTasks }
}
