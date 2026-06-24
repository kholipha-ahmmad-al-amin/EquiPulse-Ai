import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Plus, Trash2, Edit2, Truck, X } from 'lucide-react'
import { useI18n } from '../i18n'
import { useSupplyChain, type Supplier, type PurchaseOrder, type PurchaseOrderItem } from '../hooks/useSupplyChain'
import { useInventory } from '../hooks/useInventory'
import { useToast } from './ToastProvider'
import { DatePicker } from './ui/DatePicker'

export function SupplyChainView() {
  const { t, tNum } = useI18n()
  const { suppliers, purchaseOrders, saveSupplier, deleteSupplier, savePurchaseOrder, deletePurchaseOrder } = useSupplyChain()
  const { items } = useInventory()
  const toast = useToast()

  const [activeTab, setActiveTab] = useState<'suppliers' | 'pos'>('suppliers')

  // Supplier Form State
  const [showSupplierForm, setShowSupplierForm] = useState(false)
  const [editingSupplierId, setEditingSupplierId] = useState<string | null>(null)
  const [supName, setSupName] = useState('')
  const [supContact, setSupContact] = useState('')
  const [supPhone, setSupPhone] = useState('')
  const [supEmail, setSupEmail] = useState('')
  const [supAddress, setSupAddress] = useState('')

  // PO Form State
  const [showPoForm, setShowPoForm] = useState(false)
  const [editingPoId, setEditingPoId] = useState<string | null>(null)
  const [poSupplierId, setPoSupplierId] = useState('')
  const [poExpectedDate, setPoExpectedDate] = useState('')
  const [poStatus, setPoStatus] = useState<'draft' | 'sent' | 'received' | 'cancelled'>('draft')
  const [poItems, setPoItems] = useState<PurchaseOrderItem[]>([])
  const [poNotes, setPoNotes] = useState('')

  // Supplier Functions
  const handleEditSupplier = (s: Supplier) => {
    setEditingSupplierId(s.id)
    setSupName(s.name)
    setSupContact(s.contactPerson || '')
    setSupPhone(s.phone)
    setSupEmail(s.email || '')
    setSupAddress(s.address || '')
    setShowSupplierForm(true)
  }

  const resetSupplierForm = () => {
    setEditingSupplierId(null)
    setSupName('')
    setSupContact('')
    setSupPhone('')
    setSupEmail('')
    setSupAddress('')
    setShowSupplierForm(false)
  }

  const handleSaveSupplier = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!supName || !supPhone) return

    const s: Supplier = {
      id: editingSupplierId || (typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(36)),
      name: supName,
      contactPerson: supContact,
      phone: supPhone,
      email: supEmail,
      address: supAddress,
      categories: [],
      status: 'active'
    }

    try {
      await saveSupplier(s)
      toast('Success', t(`Supplier saved`), 'success')
      resetSupplierForm()
    } catch (err) {
      console.error(err)
      toast('Error', 'Failed to save supplier', 'error')
    }
  }

  // PO Functions
  const handleEditPo = (po: PurchaseOrder) => {
    setEditingPoId(po.id)
    setPoSupplierId(po.supplierId)
    setPoExpectedDate(po.expectedDate || '')
    setPoStatus(po.status)
    setPoItems(po.items || [])
    setPoNotes(po.notes || '')
    setShowPoForm(true)
  }

  const resetPoForm = () => {
    setEditingPoId(null)
    setPoSupplierId('')
    setPoExpectedDate('')
    setPoStatus('draft')
    setPoItems([])
    setPoNotes('')
    setShowPoForm(false)
  }

  const handleAddPoItem = (inventoryId: string) => {
    if (!inventoryId) return
    const invItem = items.find(i => i.id === inventoryId)
    if (!invItem) return

    setPoItems(prev => {
      const existing = prev.find(p => p.itemId === inventoryId)
      if (existing) {
        return prev.map(p => p.itemId === inventoryId ? { ...p, quantity: p.quantity + 1, lineTotal: (p.quantity + 1) * p.unitPrice } : p)
      }
      return [...prev, {
        itemId: invItem.id,
        name: invItem.name,
        quantity: 1,
        unitPrice: invItem.costPrice || invItem.price || 0,
        lineTotal: invItem.costPrice || invItem.price || 0
      }]
    })
  }

  const handleUpdatePoItem = (index: number, field: 'quantity' | 'unitPrice', value: number) => {
    const updated = [...poItems]
    updated[index] = {
      ...updated[index]!,
      [field]: value,
      lineTotal: field === 'quantity' ? value * updated[index]!.unitPrice : updated[index]!.quantity * value
    }
    setPoItems(updated)
  }

  const handleSavePo = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!poSupplierId) {
      toast('Error', t(`Please select a supplier`), 'error')
      return
    }
    if (poItems.length === 0) {
      toast('Error', t(`Add items to order`), 'error')
      return
    }

    const supplier = suppliers.find(s => s.id === poSupplierId)
    const total = poItems.reduce((sum, item) => sum + item.lineTotal, 0)

    const po: PurchaseOrder = {
      id: editingPoId || (typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(36)),
      supplierId: poSupplierId,
      supplierName: supplier?.name || 'Unknown',
      orderDate: new Date().toISOString(),
      expectedDate: poExpectedDate,
      status: poStatus,
      items: poItems,
      totalAmount: total,
      notes: poNotes
    }

    try {
      await savePurchaseOrder(po)
      toast('Success', t(`Purchase order saved`), 'success')
      resetPoForm()
    } catch (err) {
      console.error(err)
      toast('Error', 'Failed to save PO', 'error')
    }
  }

  return (
    <div className="mx-auto max-w-7xl p-4 sm:p-6 lg:p-8 space-y-8 animate-in fade-in duration-500 pb-32">
      <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-ink flex items-center gap-3">
            <Truck className="text-accent" size={32} />
            {t(`Supply Chain`)}
          </h1>
          <p className="text-ink-soft mt-1">{t(`Manage your suppliers and purchase orders.`)}</p>
        </div>
        <div className="flex bg-surface-strong/50 p-1 rounded-xl">
          <button
            onClick={() => setActiveTab('suppliers')}
            className={`px-6 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'suppliers' ? 'bg-surface text-accent shadow-sm' : 'text-ink-soft hover:text-ink'}`}
          >
            {t(`Suppliers`)}
          </button>
          <button
            onClick={() => setActiveTab('pos')}
            className={`px-6 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'pos' ? 'bg-surface text-accent shadow-sm' : 'text-ink-soft hover:text-ink'}`}
          >
            {t(`Purchase Orders`)}
          </button>
        </div>
      </header>

      {activeTab === 'suppliers' && (
        <div className="space-y-6">
          <div className="flex justify-end">
            <button
              onClick={() => setShowSupplierForm(!showSupplierForm)}
              className="inline-flex items-center gap-2 rounded-xl bg-accent px-4 py-2 text-sm font-black text-surface hover:bg-accent/90 transition-all active:scale-95 shadow-sm"
            >
              {showSupplierForm ? <X size={16} /> : <Plus size={16} />}
              {showSupplierForm ? (t(`Cancel`)) : (t(`Add Supplier`))}
            </button>
          </div>

          <AnimatePresence>
            {showSupplierForm && (
              <motion.form
                initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
                onSubmit={handleSaveSupplier}
                className="overflow-hidden"
              >
                <div className="rounded-2xl border border-line bg-surface-strong/50 p-6 grid gap-4 sm:grid-cols-2">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-ink-soft">{t(`Supplier Name`)}</label>
                    <input required value={supName} onChange={e => setSupName(e.target.value)} className="w-full rounded-lg border border-line bg-surface p-2 text-sm focus:border-accent" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-ink-soft">{t(`Contact Person`)}</label>
                    <input value={supContact} onChange={e => setSupContact(e.target.value)} className="w-full rounded-lg border border-line bg-surface p-2 text-sm focus:border-accent" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-ink-soft">{t(`Phone Number`)}</label>
                    <input required value={supPhone} onChange={e => setSupPhone(e.target.value)} className="w-full rounded-lg border border-line bg-surface p-2 text-sm focus:border-accent" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-ink-soft">{t(`Email`)}</label>
                    <input type="email" value={supEmail} onChange={e => setSupEmail(e.target.value)} className="w-full rounded-lg border border-line bg-surface p-2 text-sm focus:border-accent" />
                  </div>
                  <div className="space-y-1 sm:col-span-2">
                    <label className="text-xs font-bold text-ink-soft">{t(`Address`)}</label>
                    <textarea value={supAddress} onChange={e => setSupAddress(e.target.value)} className="w-full rounded-lg border border-line bg-surface p-2 text-sm focus:border-accent" rows={2} />
                  </div>
                  <div className="sm:col-span-2 flex justify-end">
                    <button type="submit" className="rounded-xl bg-accent px-8 py-3 text-sm font-black text-surface hover:bg-accent/90 transition-all">
                      {t(`Save Supplier`)}
                    </button>
                  </div>
                </div>
              </motion.form>
            )}
          </AnimatePresence>

          <div className="bg-surface rounded-2xl shadow-sm border border-line/50 overflow-hidden">
            <table className="w-full text-left text-sm">
              <thead className="bg-surface-strong/30">
                <tr className="text-xs uppercase tracking-wider text-ink-soft">
                  <th className="p-4 font-bold">{t(`Name`)}</th>
                  <th className="p-4 font-bold">{t(`Contact`)}</th>
                  <th className="p-4 font-bold">{t(`Phone`)}</th>
                  <th className="p-4 font-bold text-right">{t(`Actions`)}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line/30">
                {suppliers.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="p-8 text-center text-ink-soft">
                      {t(`No suppliers found`)}
                    </td>
                  </tr>
                ) : (
                  suppliers.map(s => (
                    <tr key={s.id} className="hover:bg-surface-strong/10">
                      <td className="p-4 font-bold text-ink">{s.name}</td>
                      <td className="p-4 text-ink-soft">{s.contactPerson || '-'}</td>
                      <td className="p-4 text-ink-soft">{s.phone}</td>
                      <td className="p-4 text-right">
                        <div className="flex justify-end gap-2">
                          <button onClick={() => handleEditSupplier(s)} className="p-2 text-ink-soft hover:text-accent rounded-lg hover:bg-accent/10">
                            <Edit2 size={16} />
                          </button>
                          <button onClick={() => deleteSupplier(s.id)} className="p-2 text-ink-soft hover:text-danger rounded-lg hover:bg-danger/10">
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'pos' && (
        <div className="space-y-6">
          <div className="flex justify-end">
            <button
              onClick={() => setShowPoForm(!showPoForm)}
              className="inline-flex items-center gap-2 rounded-xl bg-accent px-4 py-2 text-sm font-black text-surface hover:bg-accent/90 transition-all active:scale-95 shadow-sm"
            >
              {showPoForm ? <X size={16} /> : <Plus size={16} />}
              {showPoForm ? (t(`Cancel`)) : (t(`New Purchase Order`))}
            </button>
          </div>

          <AnimatePresence>
            {showPoForm && (
              <motion.form
                initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
                onSubmit={handleSavePo}
                className="overflow-hidden"
              >
                <div className="rounded-2xl border border-line bg-surface-strong/50 p-6 grid gap-6">
                  <div className="grid sm:grid-cols-3 gap-4">
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-ink-soft">{t(`Supplier`)}</label>
                      <select required value={poSupplierId} onChange={e => setPoSupplierId(e.target.value)} className="w-full rounded-lg border border-line bg-surface p-2 text-sm focus:border-accent">
                        <option value="">{t(`Select Supplier`)}</option>
                        {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                      </select>
                    </div>
                    <div className="space-y-1">
                      <DatePicker 
                        label={t(`Expected Date`)}
                        value={poExpectedDate ? { 
                          year: poExpectedDate.split('-')[0] || '', 
                          month: poExpectedDate.split('-')[1] || '', 
                          day: poExpectedDate.split('-')[2] || '', 
                          iso: poExpectedDate 
                        } : null}
                        onChange={(val) => setPoExpectedDate(val?.iso || '')}
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-ink-soft">{t(`Status`)}</label>
                      <select value={poStatus} onChange={e => setPoStatus(e.target.value as 'draft' | 'sent' | 'received' | 'cancelled')} className="w-full rounded-lg border border-line bg-surface p-2 text-sm focus:border-accent">
                        <option value="draft">Draft</option>
                        <option value="sent">Sent</option>
                        <option value="received">Received</option>
                        <option value="cancelled">Cancelled</option>
                      </select>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <label className="text-xs font-bold text-ink-soft">{t(`Order Items`)}</label>
                    <div className="bg-surface border border-line rounded-xl overflow-hidden">
                      <table className="w-full text-left text-sm">
                        <thead className="bg-surface-strong/50 border-b border-line">
                          <tr>
                            <th className="p-3 font-bold text-xs uppercase text-ink-soft">{t(`Item`)}</th>
                            <th className="p-3 font-bold text-xs uppercase text-ink-soft w-24">{t(`Qty`)}</th>
                            <th className="p-3 font-bold text-xs uppercase text-ink-soft w-32">{t(`Unit Price`)}</th>
                            <th className="p-3 font-bold text-xs uppercase text-ink-soft w-32 text-right">{t(`Total`)}</th>
                            <th className="p-3 w-12"></th>
                          </tr>
                        </thead>
                        <tbody>
                          {poItems.map((pi, idx) => (
                            <tr key={idx} className="border-b border-line/30 last:border-0">
                              <td className="p-3 text-ink font-bold">{pi.name}</td>
                              <td className="p-3">
                                <input type="number" step="any" required min="0.01" value={pi.quantity} onChange={e => handleUpdatePoItem(idx, 'quantity', parseFloat(e.target.value) || 0)} className="w-full p-1 border border-line rounded" />
                              </td>
                              <td className="p-3">
                                <input type="number" step="any" required min="0" value={pi.unitPrice} onChange={e => handleUpdatePoItem(idx, 'unitPrice', parseFloat(e.target.value) || 0)} className="w-full p-1 border border-line rounded" />
                              </td>
                              <td className="p-3 text-right font-bold text-ink">
                                {tNum(pi.lineTotal)}
                              </td>
                              <td className="p-3">
                                <button type="button" onClick={() => setPoItems(prev => prev.filter((_, i) => i !== idx))} className="text-danger hover:bg-danger/10 p-1 rounded">
                                  <X size={16} />
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    <div className="flex gap-2">
                      <select onChange={(e) => { handleAddPoItem(e.target.value); e.target.value = '' }} className="flex-1 rounded-lg border border-line bg-surface p-2 text-sm focus:border-accent">
                        <option value="">{t(`+ Add Item from Inventory`)}</option>
                        {items.filter(i => !i.isBundle).map(i => <option key={i.id} value={i.id}>{i.name}</option>)}
                      </select>
                    </div>
                  </div>

                  <div className="flex justify-between items-center pt-4 border-t border-line/50">
                    <div className="w-1/2">
                      <label className="text-xs font-bold text-ink-soft block mb-1">{t(`Notes`)}</label>
                      <textarea value={poNotes} onChange={e => setPoNotes(e.target.value)} className="w-full rounded-lg border border-line bg-surface p-2 text-sm focus:border-accent" rows={2} />
                    </div>
                    <div className="text-right">
                      <div className="text-sm text-ink-soft mb-1">{t(`Total Amount`)}</div>
                      <div className="text-2xl font-black text-ink">{tNum(poItems.reduce((s, i) => s + i.lineTotal, 0))}</div>
                    </div>
                  </div>

                  <div className="flex justify-end gap-3 pt-4 border-t border-line/50">
                    <button type="submit" className="rounded-xl bg-accent px-8 py-3 text-sm font-black text-surface hover:bg-accent/90 transition-all">
                      {t(`Save Order`)}
                    </button>
                  </div>
                </div>
              </motion.form>
            )}
          </AnimatePresence>

          <div className="bg-surface rounded-2xl shadow-sm border border-line/50 overflow-hidden">
            <table className="w-full text-left text-sm">
              <thead className="bg-surface-strong/30">
                <tr className="text-xs uppercase tracking-wider text-ink-soft">
                  <th className="p-4 font-bold">PO #</th>
                  <th className="p-4 font-bold">{t(`Supplier`)}</th>
                  <th className="p-4 font-bold">{t(`Date`)}</th>
                  <th className="p-4 font-bold">{t(`Status`)}</th>
                  <th className="p-4 font-bold text-right">{t(`Total`)}</th>
                  <th className="p-4 font-bold text-right">{t(`Actions`)}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line/30">
                {purchaseOrders.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-ink-soft">
                      {t(`No purchase orders found`)}
                    </td>
                  </tr>
                ) : (
                  purchaseOrders.map(po => (
                    <tr key={po.id} className="hover:bg-surface-strong/10">
                      <td className="p-4 font-mono text-xs text-ink-soft">{po.id.substring(0, 8)}</td>
                      <td className="p-4 font-bold text-ink">{po.supplierName}</td>
                      <td className="p-4 text-ink-soft">{new Date(po.orderDate).toLocaleDateString()}</td>
                      <td className="p-4">
                        <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider ${
                          po.status === 'draft' ? 'bg-ink-soft/10 text-ink-soft' :
                          po.status === 'sent' ? 'bg-info/10 text-info' :
                          po.status === 'received' ? 'bg-success/10 text-success' :
                          'bg-danger/10 text-danger'
                        }`}>
                          {po.status}
                        </span>
                      </td>
                      <td className="p-4 text-right font-black text-ink">{tNum(po.totalAmount)}</td>
                      <td className="p-4 text-right">
                        <div className="flex justify-end gap-2">
                          <button onClick={() => handleEditPo(po)} className="p-2 text-ink-soft hover:text-accent rounded-lg hover:bg-accent/10">
                            <Edit2 size={16} />
                          </button>
                          <button onClick={() => deletePurchaseOrder(po.id)} className="p-2 text-ink-soft hover:text-danger rounded-lg hover:bg-danger/10">
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
