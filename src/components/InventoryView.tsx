import { useState, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Plus, Trash2, Edit2, AlertCircle, Package, Mic, Brain, X, Loader2, Download, Upload, Barcode, Printer, MessageCircle, Zap, CloudCog } from 'lucide-react'
import ReactBarcode from 'react-barcode'
import { useI18n } from '../i18n'
import { useInventory, type InventoryItem } from '../hooks/useInventory'
import { useApiKeys } from '../hooks/useApiKeys'
import { useToast } from './ToastProvider'
import { generateAiContent } from '../utils/aiClient'
import { useStoreProfile } from '../hooks/useStoreProfile'
import { DatePicker } from './ui/DatePicker'
import { useHaptic } from '../hooks/useHaptic'
import { useStoreSettings } from '../hooks/useStoreSettings'
import { renderMarkdownToHtml } from '../utils/markdownLite'
import { LaborIllusionLoader } from './ui/LaborIllusionLoader'

export function InventoryView() {
  const { t, tNum } = useI18n()
  const { items, saveItem, removeItem } = useInventory()
  const [{ currencySymbol }] = useStoreSettings()
  const { profile } = useStoreProfile()
  const toast = useToast()
  const { triggerHaptic } = useHaptic()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [apiKeys] = useApiKeys()

  const [showForm, setShowForm] = useState(false)
  const [showBarcodeModal, setShowBarcodeModal] = useState(false)
  const [selectedBarcodeItem, setSelectedBarcodeItem] = useState<InventoryItem | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [isListening, setIsListening] = useState(false)

  const [name, setName] = useState('')
  const [category, setCategory] = useState('')
  const [quantity, setQuantity] = useState('')
  const [unit, setUnit] = useState('kg')
  const [minThreshold, setMinThreshold] = useState('0')
  const [price, setPrice] = useState('')
  const [costPrice, setCostPrice] = useState('')
  const [wholesalePrice, setWholesalePrice] = useState('')
  const [barcode, setBarcode] = useState('')
  const [sku, setSku] = useState('')
  const [batchNo, setBatchNo] = useState('')
  const [expiryDate, setExpiryDate] = useState('')
  const [supplierName, setSupplierName] = useState('')
  const [size, setSize] = useState('')
  const [color, setColor] = useState('')
  const [taxRate, setTaxRate] = useState('')
  const [warehouseQuantity, setWarehouseQuantity] = useState('')
  const [isBundle, setIsBundle] = useState(false)
  const [bundleItems, setBundleItems] = useState<{ id: string; quantity: number }[]>([])
  const [transferModalItem, setTransferModalItem] = useState<InventoryItem | null>(null)
  const [transferAmount, setTransferAmount] = useState('')
  const [transferDirection, setTransferDirection] = useState<'to_warehouse' | 'to_store'>('to_warehouse')
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [analysisResult, setAnalysisResult] = useState<string | null>(null)

  const handleGeneratePO = (item: InventoryItem) => {
    const poNumber = `PO-${Math.floor(1000 + Math.random() * 9000)}-${new Date().getFullYear()}`;
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;
    
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Purchase Order - ${poNumber}</title>
        <style>
          body { font-family: system-ui, -apple-system, sans-serif; padding: 40px; color: #111; max-width: 800px; margin: 0 auto; }
          .header { display: flex; justify-content: space-between; border-bottom: 2px solid #eee; padding-bottom: 20px; margin-bottom: 40px; }
          .title { font-size: 28px; font-weight: 900; margin: 0; text-transform: uppercase; letter-spacing: -1px; }
          .po-number { color: #666; font-size: 14px; font-weight: bold; }
          .section { margin-bottom: 40px; }
          .section-title { font-size: 12px; text-transform: uppercase; color: #888; font-weight: bold; margin-bottom: 8px; letter-spacing: 1px; }
          table { width: 100%; border-collapse: collapse; margin-top: 20px; }
          th, td { padding: 12px; text-align: left; border-bottom: 1px solid #eee; }
          th { font-size: 12px; text-transform: uppercase; color: #888; font-weight: bold; }
          .footer { margin-top: 80px; text-align: center; color: #888; font-size: 12px; }
          @media print { body { padding: 0; } }
        </style>
      </head>
      <body>
        <div class="header">
          <div>
            <h1 class="title">Purchase Order</h1>
            <div class="po-number">${poNumber}</div>
          </div>
          <div style="text-align: right">
            <strong>${profile?.storeName || 'Store'}</strong>
          </div>
        </div>
        <div style="display: flex; justify-content: space-between;">
          <div class="section">
            <div class="section-title">Supplier Details</div>
            <strong>${item.supplierName || 'General Supplier'}</strong><br>
            For Item: ${item.name}
          </div>
          <div class="section" style="text-align: right">
            <div class="section-title">Order Details</div>
            Date: ${new Date().toLocaleDateString()}<br>
            Status: PENDING
          </div>
        </div>
        <table>
          <thead>
            <tr>
              <th>Item</th>
              <th>SKU / Batch</th>
              <th>Suggested Restock Qty</th>
              <th>Est. Unit Cost</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td><strong>${item.name}</strong></td>
              <td>${item.batchNo || item.sku || '-'}</td>
              <td>${Math.max(item.minThreshold * 2, 10)} ${item.unit}</td>
              <td>${currencySymbol}${item.costPrice || item.price || 0}</td>
            </tr>
          </tbody>
        </table>
        <div class="footer">
          Generated automatically by EquiPulse AI Supply Chain.<br>
          Please fulfill this order at your earliest convenience.
        </div>
        <script>
          window.onload = () => { window.print(); }
        </script>
      </body>
      </html>
    `;
    printWindow.document.write(html);
    printWindow.document.close();
  }

  const exportCSV = () => {
    const headers = ['id', 'name', 'category', 'quantity', 'unit', 'price', 'minThreshold', 'batchNo', 'expiryDate', 'size', 'color']
    const csvContent = [
      headers.join(','),
      ...items.map(item => headers.map(header => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const val = (item as any)[header]
        return typeof val === 'string' && val.includes(',') ? `"${val}"` : (val ?? '')
      }).join(','))
    ].join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.setAttribute('download', `inventory_${new Date().toISOString().split('T')[0]}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const getLevenshteinDistance = (a: string, b: string) => {
    const matrix = Array.from({ length: a.length + 1 }, () => Array(b.length + 1).fill(0))
    for (let i = 0; i <= a.length; i++) matrix[i]![0] = i
    for (let j = 0; j <= b.length; j++) matrix[0]![j] = j
    for (let i = 1; i <= a.length; i++) {
      for (let j = 1; j <= b.length; j++) {
        if (a[i - 1] === b[j - 1]) {
          matrix[i]![j] = matrix[i - 1]![j - 1]
        } else {
          matrix[i]![j] = Math.min(matrix[i - 1]![j - 1] as number, matrix[i]![j - 1] as number, matrix[i - 1]![j] as number) + 1
        }
      }
    }
    return matrix[a.length]![b.length]
  }

  const findBestColumnMatch = (headers: string[], target: string, aliases: string[] = []) => {
    const searchTerms = [target, ...aliases].map(t => t.toLowerCase())
    let bestMatchIdx = -1
    let minDistance = Infinity

    headers.forEach((h, idx) => {
      const headerLower = h.toLowerCase().trim()
      searchTerms.forEach(term => {
        if (headerLower.includes(term) || term.includes(headerLower)) {
          if (0 < minDistance) { minDistance = 0; bestMatchIdx = idx; }
        }
        const dist = getLevenshteinDistance(headerLower, term)
        if (dist < minDistance && dist <= 2) { // Max 2 typos
          minDistance = dist
          bestMatchIdx = idx
        }
      })
    })
    return bestMatchIdx
  }

  const importCSV = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = async (e) => {
      try {
        const text = e.target?.result as string
        const lines = text.split('\n').filter(l => l.trim())
        if (lines.length < 2) return
        
        const headers = (lines[0] || '').split(',').map(h => h.trim().replace(/^"|"$/g, ''))
        const importedItems: InventoryItem[] = []

        // Resolve Fuzzy Indices
        const idIdx = findBestColumnMatch(headers, 'id', ['uuid', 'item id', 'product id'])
        const nameIdx = findBestColumnMatch(headers, 'name', ['product name', 'item', 'title', 'product', 'description', 'নাম'])
        const qtyIdx = findBestColumnMatch(headers, 'quantity', ['qty', 'stock', 'count', 'amount', 'পরিমাণ'])
        const priceIdx = findBestColumnMatch(headers, 'price', ['selling price', 'mrp', 'rate', 'retail price', 'দাম', 'মূল্য'])
        const catIdx = findBestColumnMatch(headers, 'category', ['type', 'department', 'class', 'ক্যাটাগরি'])
        const unitIdx = findBestColumnMatch(headers, 'unit', ['uom', 'measure'])
        const minIdx = findBestColumnMatch(headers, 'minThreshold', ['alert', 'low stock', 'min qty', 'min stock'])
        const batchIdx = findBestColumnMatch(headers, 'batchNo', ['batch', 'lot', 'batch code'])
        const expiryIdx = findBestColumnMatch(headers, 'expiryDate', ['expiry', 'exp date', 'valid till'])
        const sizeIdx = findBestColumnMatch(headers, 'size', ['dimension'])
        const colorIdx = findBestColumnMatch(headers, 'color', ['colour', 'shade'])
        const skuIdx = findBestColumnMatch(headers, 'sku', ['item code'])
        const barcodeIdx = findBestColumnMatch(headers, 'barcode', ['upc', 'ean', 'isbn'])
        const costIdx = findBestColumnMatch(headers, 'costPrice', ['cost', 'purchase price', 'buy price', 'কেনার দাম'])

        for (let i = 1; i < lines.length; i++) {
          const row = lines[i] || ''
          const values: string[] = []
          let inQuotes = false
          let currentVal = ''
          
          for (let j = 0; j < row.length; j++) {
            if (row[j] === '"') {
              inQuotes = !inQuotes
            } else if (row[j] === ',' && !inQuotes) {
              values.push(currentVal.replace(/^"|"$/g, '').trim())
              currentVal = ''
            } else {
              currentVal += row[j]
            }
          }
          values.push(currentVal.replace(/^"|"$/g, '').trim())

          if (values.length >= 2 && nameIdx !== -1 && values[nameIdx]) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const rawItem: any = {
              id: (idIdx !== -1 && values[idIdx]) ? (values[idIdx] as string) : (typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(36) + Math.random().toString(36).substring(2)),
              name: (values[nameIdx] as string) || 'Unknown',
              quantity: qtyIdx !== -1 ? (parseFloat(values[qtyIdx] as string) || 0) : 0,
              price: priceIdx !== -1 ? (parseFloat(values[priceIdx] as string) || 0) : 0,
              category: (catIdx !== -1 && values[catIdx]) ? (values[catIdx] as string) : (profile?.category || 'General'),
              unit: (unitIdx !== -1 && values[unitIdx]) ? (values[unitIdx] as string) : 'pcs',
              minThreshold: minIdx !== -1 ? (parseFloat(values[minIdx] as string) || 5) : 5,
              batchNo: (batchIdx !== -1 && values[batchIdx]) ? (values[batchIdx] as string) : undefined,
              expiryDate: (expiryIdx !== -1 && values[expiryIdx]) ? (values[expiryIdx] as string) : undefined,
              size: (sizeIdx !== -1 && values[sizeIdx]) ? (values[sizeIdx] as string) : undefined,
              color: (colorIdx !== -1 && values[colorIdx]) ? (values[colorIdx] as string) : undefined,
              sku: (skuIdx !== -1 && values[skuIdx]) ? (values[skuIdx] as string) : undefined,
              barcode: (barcodeIdx !== -1 && values[barcodeIdx]) ? (values[barcodeIdx] as string) : undefined,
              costPrice: costIdx !== -1 ? (parseFloat(values[costIdx] as string) || undefined) : undefined,
            }
            
            // Remove undefined fields to prevent Firestore crash
            Object.keys(rawItem).forEach(key => {
              if (rawItem[key] === undefined) {
                delete rawItem[key]
              }
            })
            
            importedItems.push(rawItem as InventoryItem)
          }
        }
        
        await Promise.all(importedItems.map(item => saveItem(item)))
        toast('Success', `Imported ${importedItems.length} items with Fuzzy Matching!`, 'success')
      } catch (err) {
        console.error(err)
        toast('Error', 'Failed to import CSV.', 'error')
      }
    }
    reader.readAsText(file)
    // reset input
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const handleDeepAnalysis = async () => {
    if (items.length === 0) {
      toast(t(`Inventory is empty`), t(`Nothing to analyze.`), 'error')
      return
    }
    
    setIsAnalyzing(true)
    try {
      const inventoryContext = items.map(i => `- ${i.name}: ${i.quantity} ${i.unit} (Price: ${i.price}, Min: ${i.minThreshold})`).join('\n')
      
      const prompt = `Perform a deep analysis of this inventory:\n${inventoryContext}\n\nUser prefers ${t(`English`)}. Format the response in Markdown. Identify dead stock, fast-moving items, and suggest reorders. Be concise but insightful.`
      
      const reply = await generateAiContent({
        apiKeys,
        model: 'gemini-1.5-flash',
        parts: [{ text: prompt }]
      })
      
      setAnalysisResult(reply)
    } catch (err) {
      console.error(err)
      toast('Error', 'Analysis failed.', 'error')
    } finally {
      setIsAnalyzing(false)
    }
  }

  const handleEdit = (item: InventoryItem) => {
    setEditingId(item.id)
    setName(item.name)
    setBarcode(item.barcode || '')
    setSku(item.sku || '')
    setCategory(item.category || '')
    setQuantity(item.quantity.toString())
    setUnit(item.unit)
    setMinThreshold(item.minThreshold?.toString() || '0')
    setPrice(item.price.toString())
    setCostPrice(item.costPrice?.toString() || '')
    setWholesalePrice(item.wholesalePrice?.toString() || '')
    setBatchNo(item.batchNo || '')
    setExpiryDate(item.expiryDate || '')
    setSupplierName(item.supplierName || '')
    setSize(item.size || '')
    setColor(item.color || '')
    setTaxRate(item.taxRate?.toString() || '')
    setWarehouseQuantity(item.warehouseQuantity?.toString() || '')
    setIsBundle(item.isBundle || false)
    setBundleItems(item.bundleItems || [])
    setShowForm(true)
  }

  const startVoicePOS = () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    if (!SpeechRecognition) {
      toast(
        t(`Voice entry unavailable`),
        t(`Your browser does not support Voice POS.`),
        'error',
      )
      return
    }

    const recognition = new SpeechRecognition()
    recognition.lang = t(`en-US`)
    recognition.interimResults = false
    recognition.maxAlternatives = 1

    recognition.onstart = () => setIsListening(true)
    
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript
      setName(transcript)
      setShowForm(true)
      setIsListening(false)
    }

    recognition.onerror = () => setIsListening(false)
    recognition.onend = () => setIsListening(false)

    recognition.start()
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name || !quantity || !price) return
    triggerHaptic([50, 100])

    const item: InventoryItem = {
      id: editingId || (typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(36) + Math.random().toString(36).substring(2)),
      name,
      barcode,
      sku,
      category: category || profile?.category || (t(`General`)),
      quantity: parseFloat(quantity) || 0,
      unit,
      minThreshold: parseFloat(minThreshold) || 5,
      price: parseFloat(price) || 0,
      costPrice: costPrice ? parseFloat(costPrice) : undefined,
      wholesalePrice: wholesalePrice ? parseFloat(wholesalePrice) : undefined,
      batchNo,
      expiryDate,
      supplierName,
      size,
      color,
      taxRate: taxRate ? parseFloat(taxRate) : undefined,
      warehouseQuantity: warehouseQuantity ? parseFloat(warehouseQuantity) : undefined,
      isBundle,
      bundleItems: isBundle ? bundleItems : undefined,
    }

    // Remove undefined fields to prevent Firestore crash
    Object.keys(item).forEach(key => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      if ((item as any)[key] === undefined) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        delete (item as any)[key]
      }
    })

    try {
      await saveItem(item)
      window.dispatchEvent(new CustomEvent('equipulse-tour-action', { detail: { action: 'inventory-added' } }))
      toast(t(`Saved`), t(`Item saved to inventory.`), 'success')
      resetForm()
    } catch (err) {
      console.error(err)
      toast('Error', 'Failed to save item', 'error')
    }
  }

  const handleTransfer = async () => {
    if (!transferModalItem || !transferAmount) return
    const amt = parseFloat(transferAmount)
    if (isNaN(amt) || amt <= 0) {
      toast('Error', 'Invalid transfer amount', 'error')
      return
    }

    const currentStoreQty = transferModalItem.quantity || 0
    const currentWarehouseQty = transferModalItem.warehouseQuantity || 0

    let newStoreQty = currentStoreQty
    let newWarehouseQty = currentWarehouseQty

    if (transferDirection === 'to_warehouse') {
      if (amt > currentStoreQty) {
        toast('Error', 'Not enough stock in store', 'error')
        return
      }
      newStoreQty -= amt
      newWarehouseQty += amt
    } else {
      if (amt > currentWarehouseQty) {
        toast('Error', 'Not enough stock in warehouse', 'error')
        return
      }
      newWarehouseQty -= amt
      newStoreQty += amt
    }

    try {
      await saveItem({
        ...transferModalItem,
        quantity: newStoreQty,
        warehouseQuantity: newWarehouseQty
      })
      toast('Success', 'Stock transferred successfully', 'success')
      setTransferModalItem(null)
      setTransferAmount('')
    } catch (err) {
      console.error(err)
      toast('Error', 'Failed to transfer stock', 'error')
    }
  }


  const resetForm = () => {
    setEditingId(null)
    setName('')
    setBarcode('')
    setSku('')
    setCategory('')
    setQuantity('')
    setUnit('kg')
    setMinThreshold('0')
    setPrice('')
    setCostPrice('')
    setWholesalePrice('')
    setBatchNo('')
    setExpiryDate('')
    setSupplierName('')
    setSize('')
    setColor('')
    setTaxRate('')
    setWarehouseQuantity('')
    setIsBundle(false)
    setBundleItems([])
    setShowForm(false)
  }

  const isPharmacy = profile?.category === 'pharmacy' || profile?.category === 'Pharmacy & Medicine'
  const isFashion = profile?.category === 'fashion' || profile?.category === 'clothing' || profile?.category === 'Fashion & Garments'

  const lowStockItems = items.filter(i => i.quantity <= i.minThreshold)

  const handleRemoveItem = async (id: string) => {
    try {
      await removeItem(id)
      toast(t(`Removed`), t(`Item removed successfully.`), 'success')
    } catch (err) {
      console.error(err)
      toast('Error', 'Failed to remove item', 'error')
    }
  }

  const handleQuickAdd = async (demoItem: Partial<InventoryItem>) => {
    triggerHaptic([50, 100])
    const item: InventoryItem = {
      id: typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(36) + Math.random().toString(36).substring(2),
      name: demoItem.name || 'Demo',
      quantity: demoItem.quantity || 10,
      price: demoItem.price || 100,
      category: demoItem.category || profile?.category || 'General',
      unit: demoItem.unit || 'pcs',
      minThreshold: 5,
    }
    try {
      await saveItem(item)
      window.dispatchEvent(new CustomEvent('equipulse-tour-action', { detail: { action: 'inventory-added' } }))
      toast(t(`Added`), `${item.name} ${t(`was successfully added.`)}`, 'success')
    } catch (err) {
      console.error(err)
      toast('Error', 'Failed to add item', 'error')
    }
  }

  const getQuickAddItems = () => {
    switch(profile?.category) {
      case 'Grocery & General Store': return [
        { name: 'Miniket Rice', price: 75, quantity: 50, unit: 'kg', category: 'Rice' },
        { name: 'Rupchanda Oil', price: 165, quantity: 20, unit: 'ltr', category: 'Oil' },
        { name: 'Fresh Sugar', price: 135, quantity: 30, unit: 'kg', category: 'Sugar' }
      ];
      case 'Pharmacy & Medicine': return [
        { name: 'Napa 500mg', price: 20, quantity: 100, unit: 'pcs', category: 'Fever' },
        { name: 'Seclo 20mg', price: 60, quantity: 50, unit: 'pcs', category: 'Gastric' },
        { name: 'Sergel 20mg', price: 80, quantity: 30, unit: 'pcs', category: 'Gastric' }
      ];
      case 'Fashion & Garments': return [
        { name: 'Cotton T-Shirt', price: 350, quantity: 20, unit: 'pcs', category: 'Men' },
        { name: 'Denim Jeans', price: 1200, quantity: 15, unit: 'pcs', category: 'Men' },
        { name: 'Silk Saree', price: 2500, quantity: 5, unit: 'pcs', category: 'Women' }
      ];
      case 'Electronics & Gadgets': return [
        { name: 'Type-C Cable', price: 250, quantity: 30, unit: 'pcs', category: 'Accessories' },
        { name: 'Bluetooth Earbuds', price: 1200, quantity: 10, unit: 'pcs', category: 'Audio' },
        { name: 'Smart Watch', price: 2500, quantity: 5, unit: 'pcs', category: 'Wearables' }
      ];
      case 'Hardware & Tools': return [
        { name: 'Berger Paint 1L', price: 850, quantity: 15, unit: 'pcs', category: 'Paint' },
        { name: 'Iron Nails', price: 120, quantity: 50, unit: 'kg', category: 'Fasteners' },
        { name: 'Hammer', price: 450, quantity: 10, unit: 'pcs', category: 'Tools' }
      ];
      default: return [
        { name: 'Notebook', price: 60, quantity: 20, unit: 'pcs', category: 'General' },
        { name: 'Pen', price: 10, quantity: 50, unit: 'pcs', category: 'General' }
      ];
    }
  }

  return (
    <div className="grid gap-6">
      {/* Overview Cards */}
      <div className="grid gap-4 sm:grid-cols-3">
        <article className="glass bg-surface-strong/60 backdrop-blur-2xl rounded-2xl p-5 border border-line/40 shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:-translate-y-1 hover:shadow-premium transition-all duration-300 group">
          <p className="text-xs font-bold text-ink-soft uppercase tracking-wider group-hover:text-ink transition-colors">{t(`Total Items`)}</p>
          <p className="mt-2 font-heading text-3xl font-black text-ink">{tNum(items.length)}</p>
        </article>
        <article className="glass bg-surface-strong/60 backdrop-blur-2xl rounded-2xl p-5 border border-line/40 shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:-translate-y-1 hover:shadow-premium transition-all duration-300 group">
          <p className="text-xs font-bold text-ink-soft uppercase tracking-wider group-hover:text-ink transition-colors">{t(`Stock Value`)}</p>
          <p className="mt-2 font-heading text-3xl font-black text-success">
            {currencySymbol}{tNum(items.reduce((sum, item) => sum + (item.price * item.quantity), 0).toLocaleString())}
          </p>
        </article>
        <article className="glass bg-warning/5 backdrop-blur-2xl rounded-2xl p-5 border border-warning/40 shadow-[0_8px_30px_rgba(234,179,8,0.1)] hover:-translate-y-1 hover:shadow-[0_12px_40px_rgba(234,179,8,0.2)] transition-all duration-300 group relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-warning/10 rounded-full blur-3xl group-hover:bg-warning/20 transition-all duration-500 pointer-events-none"></div>
          <p className="text-xs font-bold text-warning-strong uppercase tracking-wider relative z-10">{t(`Low Stock Alerts`)}</p>
          <div className="mt-2 flex items-center gap-2 relative z-10">
            <AlertCircle size={28} className="text-warning-strong animate-pulse" />
            <span className="font-heading text-3xl font-black text-warning-strong">{tNum(lowStockItems.length)}</span>
          </div>
        </article>
      </div>

      {/* Zeigarnik Effect Alerts */}
      {(() => {
        const missingPrice = items.filter(i => !i.price || i.price <= 0).length;
        const missingCost = items.filter(i => !i.costPrice || i.costPrice <= 0).length;
        if (missingPrice > 0 || missingCost > 0) {
          return (
            <div className="glass bg-danger/10 backdrop-blur-md rounded-2xl p-4 sm:p-5 border border-danger/20 shadow-sm animate-fade-in flex flex-col sm:flex-row gap-4 items-start sm:items-center relative overflow-hidden group mb-2">
              <div className="absolute inset-0 bg-gradient-to-r from-danger/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
              <div className="p-3 bg-danger/20 rounded-full shrink-0 relative">
                <div className="absolute inset-0 bg-danger blur-md rounded-full opacity-30 animate-pulse"></div>
                <CloudCog size={24} className="text-danger relative z-10 animate-bounce" />
              </div>
              <div className="flex-1 relative z-10">
                <h3 className="font-heading font-extrabold text-danger text-lg">{t(`Incomplete System Setup`)}</h3>
                <p className="text-danger-strong text-sm font-medium mt-1 leading-relaxed">
                  {missingPrice > 0 && <span className="block">⚠️ {missingPrice} {t(`products are missing a selling price.`)}</span>}
                  {missingCost > 0 && <span className="block">⚠️ {missingCost} {t(`products are missing purchase cost. Profit calculations will be inaccurate.`)}</span>}
                </p>
              </div>
              <button onClick={() => {
                const item = items.find(i => (!i.price || i.price <= 0) || (!i.costPrice || i.costPrice <= 0));
                if (item) handleEdit(item);
              }} className="shrink-0 bg-danger text-white px-5 py-2.5 rounded-xl font-bold hover:bg-danger/90 hover:-translate-y-0.5 transition-all shadow-md active:scale-95 text-sm uppercase tracking-wider relative z-10">
                {t(`Fix Now`)}
              </button>
            </div>
          );
        }
        return null;
      })()}

      {/* Main Content Area */}
      <div className="glass bg-surface-strong/60 backdrop-blur-2xl rounded-3xl border border-line/40 p-6 shadow-[0_8px_40px_rgb(0,0,0,0.08)]">
        <div className="flex flex-col xl:flex-row xl:items-center xl:justify-between gap-4 mb-6">
          <h2 className="font-heading text-xl font-extrabold flex items-center gap-2">
            <Package size={20} className="text-accent" />
            {t(`Your Inventory`)}
          </h2>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={exportCSV}
              className="inline-flex items-center gap-2 rounded-xl border border-line bg-surface px-4 py-2 text-sm font-bold shadow-sm hover:shadow-md transition-all hover:-translate-y-0.5 hover:bg-surface-strong text-ink active:scale-95"
              title="Export CSV"
            >
              <Download size={16} />
              {t(`Export`)}
            </button>
            
            <input 
              type="file" 
              accept=".csv" 
              ref={fileInputRef} 
              className="hidden" 
              onChange={importCSV} 
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              className="inline-flex items-center gap-2 rounded-xl border border-line bg-surface px-4 py-2 text-sm font-bold shadow-sm hover:shadow-md transition-all hover:-translate-y-0.5 hover:bg-surface-strong text-ink active:scale-95"
              title="Import CSV"
            >
              <Upload size={16} />
              {t(`Import`)}
            </button>

            <button
              onClick={handleDeepAnalysis}
              disabled={isAnalyzing}
              className="inline-flex items-center gap-2 rounded-xl border border-accent/30 bg-accent/10 px-4 py-2 text-sm font-bold text-accent shadow-[0_0_15px_rgba(var(--color-accent),0.1)] hover:shadow-[0_0_25px_rgba(var(--color-accent),0.2)] transition-all hover:-translate-y-0.5 hover:bg-accent/20 disabled:opacity-50 active:scale-95"
            >
              {isAnalyzing ? <Loader2 size={16} className="animate-spin" /> : <Brain size={16} />}
              {isAnalyzing ? (t(`Analyzing...`)) : (t(`Deep Analysis`))}
            </button>
            <button
              onClick={() => {
                const catalogText = `*${profile?.storeName || 'Our Store'} - Catalog*\n\n` + 
                  items.filter(i => i.quantity > 0).slice(0, 50).map(i => `📦 ${i.name} - ${currencySymbol}${i.price}`).join('\n') + 
                  `\n\n_Reply to order!_`
                window.open(`https://wa.me/?text=${encodeURIComponent(catalogText)}`, '_blank')
              }}
              className="inline-flex items-center gap-2 rounded-xl border border-success/30 bg-success/10 px-4 py-2 text-sm font-bold text-success shadow-[0_0_15px_rgba(var(--color-success),0.1)] hover:shadow-[0_0_25px_rgba(var(--color-success),0.2)] transition-all hover:-translate-y-0.5 hover:bg-success/20 active:scale-95"
            >
              <MessageCircle size={16} />
              {t(`Share WhatsApp`)}
            </button>
            <button
              onClick={startVoicePOS}
              className={`inline-flex items-center gap-2 rounded-xl border border-line px-4 py-2 text-sm font-bold shadow-sm hover:shadow-md transition-all hover:-translate-y-0.5 active:scale-95 ${isListening ? 'bg-danger text-white animate-pulse border-danger shadow-[0_0_20px_rgba(var(--color-danger),0.4)]' : 'bg-surface hover:bg-surface-strong text-ink'}`}
            >
              <Mic size={16} />
              {isListening ? (t(`Listening...`)) : (t(`Voice POS`))}
            </button>
            <button
              id="tour-inventory-add"
              onClick={() => { resetForm(); setShowForm(!showForm) }}
              className="inline-flex items-center gap-2 rounded-xl bg-accent px-4 py-2 text-sm font-black text-surface shadow-[0_0_20px_rgba(var(--color-accent),0.3)] hover:shadow-[0_0_30px_rgba(var(--color-accent),0.5)] hover:bg-accent/90 transition-all hover:-translate-y-0.5 active:scale-95"
            >
              <Plus size={16} />
              {showForm ? (t(`Cancel`)) : (t(`Add Product`))}
            </button>
          </div>
        </div>

        <AnimatePresence mode="wait">
          {showForm && (
            <motion.form
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              onSubmit={handleSave}
              className="overflow-hidden mb-6"
            >
              <div className="rounded-xl border border-line bg-surface-strong/50 p-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-ink-soft">{t(`Product Name`)}</label>
                  <input required value={name} onChange={e => setName(e.target.value)} className="w-full rounded-lg border border-line bg-surface p-2 text-sm focus:border-accent focus:outline-none" />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-ink-soft">{t(`Category`)}</label>
                  <input value={category} onChange={e => setCategory(e.target.value)} className="w-full rounded-lg border border-line bg-surface p-2 text-sm focus:border-accent focus:outline-none" />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-ink-soft">{t(`Barcode`)}</label>
                  <input value={barcode} onChange={e => setBarcode(e.target.value)} className="w-full rounded-lg border border-line bg-surface p-2 text-sm focus:border-accent focus:outline-none" />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-ink-soft">SKU</label>
                  <input value={sku} onChange={e => setSku(e.target.value)} className="w-full rounded-lg border border-line bg-surface p-2 text-sm focus:border-accent focus:outline-none" />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-ink-soft">{t(`Cost Price`)}</label>
                  <input type="number" step="any" value={costPrice} onChange={e => setCostPrice(e.target.value)} className="w-full rounded-lg border border-line bg-surface p-2 text-sm focus:border-accent focus:outline-none" />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-ink-soft">{t(`Retail Price`)}</label>
                  <input required type="number" step="any" value={price} onChange={e => setPrice(e.target.value)} className="w-full rounded-lg border border-line bg-surface p-2 text-sm focus:border-accent focus:outline-none" />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-ink-soft">{t(`Wholesale Price`)}</label>
                  <input type="number" step="any" value={wholesalePrice} onChange={e => setWholesalePrice(e.target.value)} className="w-full rounded-lg border border-line bg-surface p-2 text-sm focus:border-accent focus:outline-none" />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-ink-soft">{t(`Store Quantity`)}</label>
                  <div className="flex gap-2">
                    <input required type="number" step="any" value={quantity} onChange={e => setQuantity(e.target.value)} className="w-full rounded-lg border border-line bg-surface p-2 text-sm focus:border-accent focus:outline-none" />
                    <select value={unit} onChange={e => setUnit(e.target.value)} className="rounded-lg border border-line bg-surface px-2 text-sm focus:border-accent focus:outline-none">
                      <option value="kg">KG</option>
                      <option value="ltr">Ltr</option>
                      <option value="pcs">Pcs</option>
                    </select>
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-ink-soft">{t(`Warehouse Quantity`)}</label>
                  <input type="number" step="any" value={warehouseQuantity} onChange={e => setWarehouseQuantity(e.target.value)} className="w-full rounded-lg border border-line bg-surface p-2 text-sm focus:border-accent focus:outline-none" />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-ink-soft">{t(`Min Threshold (Alert)`)}</label>
                  <input required type="number" step="any" value={minThreshold} onChange={e => setMinThreshold(e.target.value)} className="w-full rounded-lg border border-line bg-surface p-2 text-sm focus:border-accent focus:outline-none" />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-ink-soft">{t(`Supplier Name`)}</label>
                  <input value={supplierName} onChange={e => setSupplierName(e.target.value)} placeholder="e.g. Acme Corp" className="w-full rounded-lg border border-line bg-surface p-2 text-sm focus:border-accent focus:outline-none" />
                </div>
                {(isPharmacy || profile?.category?.toLowerCase().includes('grocery') || profile?.category?.toLowerCase().includes('super')) && (
                  <>
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-ink-soft">{t(`Batch No.`)}</label>
                      <input value={batchNo} onChange={e => setBatchNo(e.target.value)} className="w-full rounded-lg border border-line bg-surface p-2 text-sm focus:border-accent focus:outline-none" />
                    </div>
                    <div className="space-y-1">
                      <DatePicker 
                        label={t(`Expiry Date`)}
                        value={expiryDate ? { 
                          year: expiryDate.split('-')[0] || '', 
                          month: expiryDate.split('-')[1] || '', 
                          day: expiryDate.split('-')[2] || '', 
                          iso: expiryDate 
                        } : null}
                        onChange={(val) => setExpiryDate(val?.iso || '')}
                      />
                    </div>
                  </>
                )}
                {isFashion && (
                  <>
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-ink-soft">{t(`Size`)}</label>
                      <input value={size} onChange={e => setSize(e.target.value)} placeholder="M, L, XL" className="w-full rounded-lg border border-line bg-surface p-2 text-sm focus:border-accent focus:outline-none" />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-ink-soft">{t(`Color`)}</label>
                      <input value={color} onChange={e => setColor(e.target.value)} placeholder="Red, Blue" className="w-full rounded-lg border border-line bg-surface p-2 text-sm focus:border-accent focus:outline-none" />
                    </div>
                  </>
                )}
                <div className="space-y-1">
                  <label className="text-xs font-bold text-ink-soft flex justify-between">
                    {t(`Tax / VAT Rate (%)`)}
                    <span className="text-ink-soft/60 italic font-normal text-[10px]">{t(`(Optional - Overrides Default)`)}</span>
                  </label>
                  <input type="number" step="any" placeholder={t(`e.g. 5`)} value={taxRate} onChange={e => setTaxRate(e.target.value)} className="w-full rounded-lg border border-line bg-surface p-2 text-sm focus:border-accent focus:outline-none" />
                </div>
                <div className="lg:col-span-3 sm:col-span-2 space-y-3 bg-surface-strong/30 p-4 rounded-xl border border-line border-dashed">
                  <label className="flex items-center gap-2 cursor-pointer w-fit">
                    <input 
                      type="checkbox" 
                      checked={isBundle} 
                      onChange={e => setIsBundle(e.target.checked)} 
                      className="rounded border-line text-accent focus:ring-accent"
                    />
                    <span className="text-sm font-bold text-ink">{t(`Is this a Bundle/Composite Item?`)}</span>
                  </label>
                  {isBundle && (
                    <div className="space-y-2 mt-2">
                      <p className="text-xs text-ink-soft mb-2">{t(`Select bundle components:`)}</p>
                      {bundleItems.map((bItem, idx) => {
                        const actualItem = items.find(i => i.id === bItem.id)
                        return (
                          <div key={idx} className="flex gap-2 items-center bg-surface p-2 rounded-lg border border-line shadow-sm">
                            <span className="flex-1 text-sm font-bold text-ink">{actualItem?.name || 'Unknown'}</span>
                            <input 
                              type="number" 
                              value={bItem.quantity} 
                              onChange={e => {
                                const newArr = [...bundleItems]
                                newArr[idx]!.quantity = parseFloat(e.target.value) || 0
                                setBundleItems(newArr)
                              }}
                              className="w-20 rounded-md border border-line bg-surface p-1 text-sm focus:border-accent focus:outline-none"
                              placeholder="Qty"
                            />
                            <button 
                              type="button" 
                              onClick={() => {
                                const newArr = [...bundleItems]
                                newArr.splice(idx, 1)
                                setBundleItems(newArr)
                              }}
                              className="p-1 text-danger hover:bg-danger/10 rounded-md"
                            >
                              <X size={14} />
                            </button>
                          </div>
                        )
                      })}
                      <select
                        className="w-full rounded-lg border border-line bg-surface p-2 text-sm focus:border-accent focus:outline-none text-ink-soft"
                        onChange={(e) => {
                          if (!e.target.value) return
                          if (!bundleItems.find(i => i.id === e.target.value)) {
                            setBundleItems([...bundleItems, { id: e.target.value, quantity: 1 }])
                          }
                          e.target.value = ''
                        }}
                      >
                        <option value="">{t(`+ Add Component Item`)}</option>
                        {items.filter(i => i.id !== editingId && !i.isBundle).map(i => (
                          <option key={i.id} value={i.id}>{i.name}</option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>
                <div className="flex items-end lg:col-span-3 sm:col-span-2 mt-2">
                  <button type="submit" className="w-full rounded-xl bg-accent py-4 text-base font-black text-surface hover:bg-accent/90 transition-all shadow-[0_4px_20px_rgba(var(--color-accent),0.3)] hover:shadow-[0_8px_30px_rgba(var(--color-accent),0.4)] hover:-translate-y-1 active:scale-95">
                    {t(`Save Item`)}
                  </button>
                </div>
              </div>
            </motion.form>
          )}
        </AnimatePresence>

        <div className="overflow-x-auto">
          {/* Desktop Table View */}
          <table className="w-full text-left text-sm hidden md:table border-separate border-spacing-y-3">
            <thead>
              <tr className="text-left text-xs uppercase tracking-wider text-ink-soft/80">
                <th className="pb-4 px-4 font-bold">{t(`Product Name`)}</th>
                <th className="pb-4 px-4 font-bold">{t(`Category`)}</th>
                {isPharmacy && <th className="pb-4 px-4 font-bold">{t(`Batch & Expiry`)}</th>}
                {isFashion && <th className="pb-4 px-4 font-bold">{t(`Size & Color`)}</th>}
                <th className="pb-4 px-4 font-bold text-right">{t(`Price`)}</th>
                <th className="pb-4 px-4 font-bold text-right">{t(`Store Qty`)}</th>
                <th className="pb-4 px-4 font-bold text-right">{t(`Warehouse`)}</th>
                <th className="pb-4 px-4 font-bold text-right">{t(`Actions`)}</th>
              </tr>
            </thead>
            <tbody>
              {items.length === 0 ? (
                <tr>
                  <td colSpan={isPharmacy || isFashion ? 6 : 5} className="py-16 text-center">
                    <div className="flex flex-col items-center justify-center space-y-3">
                      <div className="flex size-16 items-center justify-center rounded-2xl bg-accent/10 text-accent">
                        <Package size={32} />
                      </div>
                      <div>
                        <h3 className="font-heading text-lg font-bold text-ink">{t(`Inventory is Empty`)}</h3>
                        <p className="text-sm text-ink-soft mt-1 max-w-sm mx-auto">{t(`Add your first product or click below to quick add popular items.`)}</p>
                        
                        <div className="mt-6 border-t border-line/30 pt-6 w-full max-w-lg">
                          <p className="text-xs font-bold text-ink-soft uppercase tracking-wider mb-3">
                            {t(`Quick Add Popular Items`)}
                          </p>
                          <div className="flex flex-wrap gap-2 justify-center">
                            {getQuickAddItems().map((qItem, idx) => (
                              <button
                                key={idx}
                                onClick={() => void handleQuickAdd(qItem)}
                                className="inline-flex items-center gap-2 rounded-lg bg-surface px-3 py-2 text-xs font-bold text-ink shadow-sm ring-1 ring-line hover:bg-accent/10 hover:text-accent hover:ring-accent/50 transition-all"
                              >
                                <Plus size={14} />
                                {qItem.name}
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  </td>
                </tr>
              ) : (
                items.map(item => {
                  const isLow = item.quantity <= item.minThreshold
                  return (
                    <tr key={item.id} className="group transition-all duration-300 hover:-translate-y-0.5">
                      <td className="py-5 px-4 font-bold text-ink group-hover:text-accent transition-colors bg-surface-strong/20 group-hover:bg-surface-strong/60 rounded-l-2xl border-y border-l border-line/40 group-hover:border-accent/20 mb-2 shadow-sm">
                        {item.name}
                        {isLow && item.quantity > 0 && (
                          <span className="ml-2 inline-flex items-center gap-1 rounded-full bg-danger/10 px-2 py-0.5 text-[10px] font-black text-danger border border-danger/20 shadow-[0_0_15px_rgba(var(--color-danger),0.4)] animate-pulse relative group-hover:scale-105 transition-transform">
                            <div className="absolute inset-0 bg-danger/20 blur-md rounded-full"></div>
                            <Zap size={12} className="relative z-10 fill-danger text-danger" /> 
                            <span className="relative z-10">🔥 {t(`High Demand`)}! {t(`Only`)} {item.quantity} {t(`Left`)}</span>
                          </span>
                        )}
                        {item.quantity <= 0 && (
                          <span className="ml-2 inline-flex items-center gap-1 rounded-full bg-line/20 px-2 py-0.5 text-[10px] font-black text-ink-soft border border-line/50 relative grayscale">
                            <AlertCircle size={12} className="relative z-10" /> 
                            <span className="relative z-10 uppercase">{t(`Out of Stock`)}</span>
                          </span>
                        )}
                      </td>
                      <td className="py-5 px-4 text-ink-soft bg-surface-strong/20 group-hover:bg-surface-strong/60 border-y border-line/40 group-hover:border-accent/20 mb-2">{item.category}</td>
                      {(isPharmacy || profile?.category?.toLowerCase().includes('grocery') || profile?.category?.toLowerCase().includes('super')) && (
                        <td className="py-5 px-4 text-ink-soft text-xs bg-surface-strong/20 group-hover:bg-surface-strong/60 border-y border-line/40 group-hover:border-accent/20 mb-2">
                          {item.batchNo && <span className="block border border-line/30 rounded px-1.5 py-0.5 w-fit bg-surface/80 shadow-sm">B: {item.batchNo}</span>}
                          {item.expiryDate && (() => {
                            const expiryDays = Math.ceil((new Date(item.expiryDate).getTime() - Date.now()) / (1000 * 3600 * 24));
                            const isExpired = expiryDays < 0;
                            const isExpiringSoon = expiryDays >= 0 && expiryDays <= 30;
                            return (
                              <span className={`block mt-1 font-semibold ${isExpired ? 'text-danger animate-pulse' : isExpiringSoon ? 'text-warning-strong' : ''}`}>
                                Exp: {item.expiryDate} {isExpired ? '(Expired)' : isExpiringSoon ? `(${expiryDays}d left)` : ''}
                              </span>
                            )
                          })()}
                        </td>
                      )}
                      {isFashion && (
                        <td className="py-5 px-4 text-ink-soft text-xs bg-surface-strong/20 group-hover:bg-surface-strong/60 border-y border-line/40 group-hover:border-accent/20 mb-2">
                          {item.size && <span className="block font-bold">Size: {item.size}</span>}
                          {item.color && <span className="block">Color: {item.color}</span>}
                        </td>
                      )}
                      <td className="py-5 px-4 text-right font-black tracking-tight bg-surface-strong/20 group-hover:bg-surface-strong/60 border-y border-line/40 group-hover:border-accent/20 mb-2">{currencySymbol}{tNum(item.price.toLocaleString())}</td>
                      <td className={`relative py-5 px-4 text-right font-black text-lg ${isLow ? 'text-danger' : 'text-success'} bg-surface-strong/20 group-hover:bg-surface-strong/60 border-y border-line/40 group-hover:border-accent/20 mb-2`}>
                        {isLow && <div className="absolute inset-0 bg-danger/5 animate-pulse pointer-events-none"></div>}
                        <span className="relative z-10">{tNum(item.quantity)} <span className="text-xs font-bold text-ink-soft">{item.unit}</span></span>
                      </td>
                      <td className="py-5 px-4 text-right font-black text-lg text-ink-soft bg-surface-strong/20 group-hover:bg-surface-strong/60 border-y border-line/40 group-hover:border-accent/20 mb-2">
                        {tNum(item.warehouseQuantity || 0)} <span className="text-xs font-bold text-ink-soft">{item.unit}</span>
                      </td>
                      <td className="py-5 px-4 text-right bg-surface-strong/20 group-hover:bg-surface-strong/60 rounded-r-2xl border-y border-r border-line/40 group-hover:border-accent/20 mb-2">
                        <div className="flex items-center justify-end gap-2 opacity-60 group-hover:opacity-100 transition-opacity">
                          {isLow && (
                            <button onClick={() => handleGeneratePO(item)} className="rounded-xl p-2 bg-surface border border-line/50 text-warning-strong hover:border-warning hover:bg-warning/10 transition-all hover:scale-110 active:scale-95 shadow-sm" title={t(`Generate PO`)}>
                              <Printer size={16} />
                            </button>
                          )}
                          <button onClick={() => setTransferModalItem(item)} className="rounded-xl p-2 bg-surface border border-line/50 text-ink-soft hover:border-info hover:bg-info/10 hover:text-info transition-all hover:scale-110 active:scale-95 shadow-sm" title={t(`Transfer Stock`)}>
                            <Upload size={16} />
                          </button>
                          <button onClick={() => handleEdit(item)} className="rounded-xl p-2 bg-surface border border-line/50 text-ink-soft hover:border-accent hover:bg-accent/10 hover:text-accent transition-all hover:scale-110 active:scale-95 shadow-sm">
                            <Edit2 size={16} />
                          </button>
                          <button onClick={() => void handleRemoveItem(item.id)} className="rounded-xl p-2 bg-surface border border-line/50 text-ink-soft hover:border-danger hover:bg-danger/10 hover:text-danger transition-all hover:scale-110 active:scale-95 shadow-sm">
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>

          {/* Mobile Cards View */}
          <div className="md:hidden space-y-4">
            {items.length === 0 ? (
              <div className="py-12 text-center">
                <div className="flex flex-col items-center justify-center space-y-3">
                  <div className="flex size-16 items-center justify-center rounded-2xl bg-accent/10 text-accent">
                    <Package size={32} />
                  </div>
                  <div>
                    <h3 className="font-heading text-lg font-bold text-ink">{t(`Inventory is Empty`)}</h3>
                    <p className="text-sm text-ink-soft mt-1 max-w-sm mx-auto">{t(`Add your first product or click below to quick add popular items.`)}</p>
                    <div className="mt-6 border-t border-line/30 pt-6 w-full max-w-lg">
                      <p className="text-xs font-bold text-ink-soft uppercase tracking-wider mb-3">
                        {t(`Quick Add Popular Items`)}
                      </p>
                      <div className="flex flex-wrap gap-2 justify-center">
                        {getQuickAddItems().map((qItem, idx) => (
                          <button
                            key={idx}
                            onClick={() => void handleQuickAdd(qItem)}
                            className="inline-flex items-center gap-2 rounded-lg bg-surface px-3 py-2 text-xs font-bold text-ink shadow-sm ring-1 ring-line hover:bg-accent/10 hover:text-accent hover:ring-accent/50 transition-all"
                          >
                            <Plus size={14} />
                            {qItem.name}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              items.map(item => {
                const isLow = item.quantity <= item.minThreshold
                return (
                  <div key={item.id} className="rounded-2xl border border-line/40 bg-surface/80 backdrop-blur-md p-5 shadow-[0_4px_20px_rgb(0,0,0,0.03)] hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] hover:-translate-y-1 transition-all duration-300 relative group overflow-hidden">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-accent/5 rounded-full blur-2xl group-hover:bg-accent/10 transition-colors pointer-events-none"></div>
                    <div className="flex justify-between items-start mb-3 relative z-10">
                      <div>
                        <h4 className="font-black text-ink text-lg tracking-tight leading-tight">{item.name}</h4>
                        <p className="text-[11px] font-bold text-ink-soft mt-0.5 uppercase tracking-wider">{item.category}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <button onClick={() => { setSelectedBarcodeItem(item); setShowBarcodeModal(true); }} className="rounded-xl p-2.5 bg-surface border border-line/50 text-ink-soft hover:border-focus hover:text-focus transition-all shadow-sm active:scale-95 hover:scale-110">
                          <Barcode size={16} />
                        </button>
                        {isLow && (
                          <button onClick={() => handleGeneratePO(item)} title="Generate Purchase Order" className="rounded-xl p-2.5 bg-surface border border-warning/50 text-warning-strong hover:border-warning hover:text-warning transition-all shadow-sm active:scale-95 hover:scale-110">
                            <Printer size={16} />
                          </button>
                        )}
                        <button onClick={() => handleEdit(item)} className="rounded-xl p-2.5 bg-surface border border-line/50 text-ink-soft hover:border-accent hover:text-accent transition-all shadow-sm active:scale-95 hover:scale-110">
                          <Edit2 size={16} />
                        </button>
                        <button onClick={() => void handleRemoveItem(item.id)} className="rounded-xl p-2.5 bg-surface border border-line/50 text-ink-soft hover:border-danger hover:text-danger transition-all shadow-sm active:scale-95 hover:scale-110">
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-3 mt-4 border-t border-line/30 pt-4 relative z-10">
                      <div className="bg-surface-strong/50 rounded-xl p-3 border border-line/40">
                        <p className="text-[10px] font-bold text-ink-soft uppercase tracking-wider mb-1">{t(`Price`)}</p>
                        <p className="font-black text-ink text-base">{currencySymbol}{tNum(item.price.toLocaleString())}</p>
                      </div>
                      <div className={`relative bg-surface-strong/50 rounded-xl p-3 border ${isLow ? 'border-danger/40 bg-danger/5' : 'border-line/40'}`}>
                        {isLow && <div className="absolute inset-0 bg-danger/10 blur-xl animate-pulse pointer-events-none rounded-xl"></div>}
                        <p className="relative z-10 text-[10px] font-bold text-ink-soft uppercase tracking-wider mb-1">{t(`Stock`)}</p>
                        <p className={`relative z-10 font-black text-lg leading-none ${isLow ? 'text-danger' : 'text-success'}`}>
                          {tNum(item.quantity)} <span className="text-[10px] font-bold text-ink-soft">{item.unit}</span>
                          {isLow && (
                            <span className="ml-1.5 inline-flex items-center gap-1 rounded border border-danger/30 bg-danger/10 px-1.5 py-0.5 text-[9px] font-black text-danger shadow-[0_0_15px_rgba(var(--color-danger),0.4)] animate-pulse relative top-[-2px]">
                              <AlertCircle size={10} /> CRITICAL
                            </span>
                          )}
                        </p>
                      </div>
                      {(isPharmacy || profile?.category?.toLowerCase().includes('grocery') || profile?.category?.toLowerCase().includes('super')) && (item.batchNo || item.expiryDate) && (
                        <div className="col-span-2 mt-1 bg-surface-strong/30 rounded-xl p-3 border border-line/30">
                          <p className="text-[10px] font-bold text-ink-soft uppercase tracking-wider mb-1">{t(`Batch & Expiry`)}</p>
                          <p className="text-xs font-bold text-ink flex flex-wrap gap-2">
                            {item.batchNo && <span className="bg-surface px-2 py-0.5 rounded border border-line/50 mr-2">B: {item.batchNo} </span>}
                            {item.expiryDate && (() => {
                              const expiryDays = Math.ceil((new Date(item.expiryDate).getTime() - Date.now()) / (1000 * 3600 * 24));
                              const isExpired = expiryDays < 0;
                              const isExpiringSoon = expiryDays >= 0 && expiryDays <= 30;
                              return (
                                <span className={`bg-surface px-2 py-0.5 rounded border border-line/50 ${isExpired ? 'text-danger border-danger/30 animate-pulse' : isExpiringSoon ? 'text-warning-strong border-warning/30' : ''}`}>
                                  Exp: {item.expiryDate} {isExpired ? '(Expired)' : isExpiringSoon ? `(${expiryDays}d left)` : ''}
                                </span>
                              )
                            })()}
                          </p>
                        </div>
                      )}
                      {isFashion && (item.size || item.color) && (
                        <div className="col-span-2 mt-1 bg-surface-strong/30 rounded-xl p-3 border border-line/30 flex gap-2">
                          {item.size && <div className="bg-surface px-3 py-1 rounded-lg border border-line/50 text-xs font-bold">Size: {item.size}</div>}
                          {item.color && <div className="bg-surface px-3 py-1 rounded-lg border border-line/50 text-xs font-bold flex items-center gap-2">
                            <span className="w-3 h-3 rounded-full border border-line/50" style={{backgroundColor: item.color.toLowerCase()}}></span>
                            {item.color}
                          </div>}
                        </div>
                      )}
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </div>
      </div>

      {/* Analysis Loader Modal */}
      <AnimatePresence>
        {isAnalyzing && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 p-4 backdrop-blur-md"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-surface/95 backdrop-blur-3xl p-8 rounded-3xl shadow-[0_20px_60px_rgba(0,0,0,0.3)] border border-line/50"
            >
              <LaborIllusionLoader message={t("Running Deep Inventory Analysis...")} />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Analysis Result Modal */}
      <AnimatePresence>
        {analysisResult && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
          >
            <motion.div
              initial={{ scale: 0.95, y: 20, opacity: 0 }}
              animate={{ scale: 1, y: 0, opacity: 1 }}
              exit={{ scale: 0.95, y: 20, opacity: 0 }}
              className="relative w-full max-w-2xl max-h-[85vh] overflow-y-auto rounded-[2rem] bg-surface/95 backdrop-blur-3xl p-8 shadow-[0_20px_60px_rgba(0,0,0,0.3)] border border-line/50"
            >
              <div className="absolute top-0 right-0 w-64 h-64 bg-accent/10 rounded-full blur-[80px] pointer-events-none -z-10"></div>
              <div className="mb-6 flex items-center justify-between pb-4 border-b border-line/30">
                <h3 className="flex items-center gap-3 font-heading text-2xl font-black text-ink">
                  <div className="p-2.5 rounded-xl bg-accent/10 text-accent">
                    <Brain size={24} />
                  </div>
                  {t(`AI Deep Analysis`)}
                </h3>
                <button
                  onClick={() => setAnalysisResult(null)}
                  className="rounded-xl p-2.5 hover:bg-surface-strong border border-transparent hover:border-line/50 transition-all text-ink-soft hover:text-ink"
                >
                  <X size={20} />
                </button>
              </div>
              <div className="prose prose-sm md:prose-base dark:prose-invert max-w-none prose-headings:font-heading prose-headings:font-black prose-p:leading-relaxed prose-li:font-medium">
                <div dangerouslySetInnerHTML={{ __html: renderMarkdownToHtml(analysisResult) }} />
              </div>
            </motion.div>
          </motion.div>
        )}

        {showBarcodeModal && selectedBarcodeItem && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
          >
            <motion.div
              initial={{ scale: 0.95, y: 20, opacity: 0 }}
              animate={{ scale: 1, y: 0, opacity: 1 }}
              exit={{ scale: 0.95, y: 20, opacity: 0 }}
              className="relative w-full max-w-sm overflow-hidden rounded-[2rem] bg-surface/95 backdrop-blur-3xl p-6 shadow-[0_20px_60px_rgba(0,0,0,0.3)] border border-line/50"
            >
              <div className="mb-4 flex items-center justify-between pb-4 border-b border-line/30">
                <h3 className="flex items-center gap-2 font-heading text-xl font-black text-ink">
                  <Barcode size={20} className="text-accent" />
                  {t(`Barcode Generator`)}
                </h3>
                <button
                  onClick={() => setShowBarcodeModal(false)}
                  className="rounded-xl p-2 text-ink-soft hover:bg-surface-strong hover:text-ink transition-all"
                >
                  <X size={20} />
                </button>
              </div>
              <div className="flex flex-col items-center gap-6 py-6">
                <div className="w-full text-center mb-2">
                  <h4 className="font-bold text-lg text-ink">{selectedBarcodeItem.name}</h4>
                  <p className="text-sm font-bold text-ink-soft">{currencySymbol}{tNum(selectedBarcodeItem.price.toLocaleString())}</p>
                </div>
                <div className="bg-white p-4 rounded-xl shadow-inner border border-line/20">
                  <ReactBarcode 
                    value={selectedBarcodeItem.barcode || selectedBarcodeItem.id.substring(0, 8)} 
                    width={2}
                    height={80}
                    fontSize={14}
                    background="#ffffff"
                    lineColor="#000000"
                    margin={0}
                  />
                </div>
              </div>
              <div className="mt-4 flex gap-3 pt-4 border-t border-line/30">
                <button
                  onClick={() => setShowBarcodeModal(false)}
                  className="flex-1 py-3 bg-surface-strong text-ink font-bold rounded-xl hover:bg-line/50 transition-colors"
                >
                  {t(`Close`)}
                </button>
                <button
                  onClick={() => {
                    const printWindow = window.open('', '', 'width=600,height=400');
                    if (printWindow) {
                      printWindow.document.write(`
                        <html>
                          <head>
                            <title>Print Barcode</title>
                            <style>
                              body { font-family: sans-serif; text-align: center; margin-top: 20px; }
                              .label { border: 1px dashed #ccc; display: inline-block; padding: 10px; border-radius: 8px; }
                              .name { font-weight: bold; margin-bottom: 5px; font-size: 14px; }
                              .price { font-weight: bold; margin-bottom: 10px; font-size: 14px; }
                              .barcode-img { margin-top: 5px; }
                            </style>
                          </head>
                          <body>
                            <div class="label">
                              <div class="name">${selectedBarcodeItem.name}</div>
                              <div class="price">${currencySymbol}${selectedBarcodeItem.price.toLocaleString()}</div>
                              <div style="display: flex; justify-content: center;">
                                <!-- Barcode rendering for print window is basic; ideally we'd pass the SVG, but for now we print the container -->
                                <svg id="barcode"></svg>
                              </div>
                            </div>
                            <script src="https://cdn.jsdelivr.net/npm/jsbarcode@3.11.5/dist/JsBarcode.all.min.js"></script>
                            <script>
                              JsBarcode("#barcode", "${selectedBarcodeItem.barcode || selectedBarcodeItem.id.substring(0, 8)}", {
                                width: 2, height: 60, displayValue: true, fontSize: 14
                              });
                              setTimeout(() => {
                                window.print();
                                window.close();
                              }, 500);
                            </script>
                          </body>
                        </html>
                      `);
                      printWindow.document.close();
                    }
                  }}
                  className="flex-1 py-3 bg-accent text-surface font-black rounded-xl shadow-sm hover:shadow-md hover:bg-accent/90 transition-all flex items-center justify-center gap-2"
                >
                  <Printer size={18} />
                  {t(`Print`)}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      <AnimatePresence>
        {transferModalItem && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-ink/50 p-4 backdrop-blur-sm"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
              className="w-full max-w-md rounded-2xl bg-surface p-6 shadow-xl"
            >
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-bold text-ink">{t(`Transfer Stock`)}</h3>
                <button onClick={() => setTransferModalItem(null)} className="p-2 text-ink-soft hover:bg-surface-strong rounded-full">
                  <X size={20} />
                </button>
              </div>

              <div className="mb-4">
                <p className="font-bold text-ink">{transferModalItem.name}</p>
                <div className="flex gap-4 mt-2 text-sm text-ink-soft">
                  <div>Store: <span className="font-bold text-ink">{transferModalItem.quantity}</span> {transferModalItem.unit}</div>
                  <div>Warehouse: <span className="font-bold text-ink">{transferModalItem.warehouseQuantity || 0}</span> {transferModalItem.unit}</div>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="text-xs font-bold text-ink-soft mb-1 block">Direction</label>
                  <select 
                    value={transferDirection} 
                    onChange={e => setTransferDirection(e.target.value as 'to_warehouse' | 'to_store')}
                    className="w-full rounded-lg border border-line bg-surface p-2 text-sm focus:border-accent focus:outline-none"
                  >
                    <option value="to_warehouse">Store → Warehouse</option>
                    <option value="to_store">Warehouse → Store</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-bold text-ink-soft mb-1 block">Amount ({transferModalItem.unit})</label>
                  <input 
                    type="number" 
                    step="any"
                    value={transferAmount} 
                    onChange={e => setTransferAmount(e.target.value)} 
                    className="w-full rounded-lg border border-line bg-surface p-2 text-sm focus:border-accent focus:outline-none" 
                  />
                </div>
                <button 
                  onClick={handleTransfer}
                  className="w-full py-3 bg-accent text-surface font-black rounded-xl shadow-sm hover:shadow-md hover:bg-accent/90 transition-all"
                >
                  Confirm Transfer
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
