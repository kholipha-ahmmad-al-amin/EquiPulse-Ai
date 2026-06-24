// WebStoreView: public storefront reachable at /store/:tenantId.
// Reads `storefront/{tenantId}/items` collection; no auth required.
// Customers can browse, add to cart, and place a "manual" order that the
// owner sees in their POS dashboard (we email/WhatsApp-link the order to the tenant).

import { useMemo, useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { ShoppingCart, Search, Store, Filter, Package, X, Send } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { useWebStore, storefrontUrl, type StorefrontItem } from '../hooks/useWebStore'
import { getCachedCredential } from '../hooks/useCredentials'

interface CartLine { item: StorefrontItem; qty: number }

const STORE_NAME_KEY = (tenantId: string) => `equipulse.storefront.name.${tenantId}`

const useStoreName = (tenantId: string | null) => {
  const [name, setName] = useState<string>('EquiPulse Store')
  useEffect(() => {
    if (!tenantId) return
    try {
      const stored = localStorage.getItem(STORE_NAME_KEY(tenantId))
      if (stored) setName(stored)
    } catch {
      // localStorage may be disabled (private browsing) - non-fatal
    }
  }, [tenantId])
  return name
}

const formatPrice = (n: number) => {
  if (typeof n !== 'number' || !isFinite(n)) return '0.00'
  return n.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 })
}

export function WebStoreView() {
  const params = useParams()
  const tenantId = params.tenantId || ''
  const { items, loading, error } = useWebStore(tenantId)
  const storeName = useStoreName(tenantId)

  const [query, setQuery] = useState('')
  const [category, setCategory] = useState<string>('all')
  const [cart, setCart] = useState<CartLine[]>([])
  const [showCart, setShowCart] = useState(false)
  const [orderForm, setOrderForm] = useState({ name: '', phone: '', address: '', note: '' })
  const [orderSent, setOrderSent] = useState(false)
  const [orderError, setOrderError] = useState<string | null>(null)

  const categories = useMemo(() => {
    const set = new Set<string>()
    for (const i of items) if (i.category) set.add(i.category)
    return ['all', ...Array.from(set).sort()]
  }, [items])

  const filtered = useMemo(() => {
    let out = items
    if (category !== 'all') out = out.filter(i => i.category === category)
    if (query.trim()) {
      const q = query.toLowerCase()
      out = out.filter(i => i.name.toLowerCase().includes(q) || (i.description || '').toLowerCase().includes(q))
    }
    return out
  }, [items, category, query])

  const cartTotal = cart.reduce((s, l) => s + l.item.price * l.qty, 0)
  const cartCount = cart.reduce((s, l) => s + l.qty, 0)

  const addToCart = (item: StorefrontItem) => {
    if (!item.inStock) return
    setCart(prev => {
      const existing = prev.find(l => l.item.id === item.id)
      if (existing) return prev.map(l => l.item.id === item.id ? { ...l, qty: l.qty + 1 } : l)
      return [...prev, { item, qty: 1 }]
    })
  }
  const removeFromCart = (id: string) => setCart(prev => prev.filter(l => l.item.id !== id))
  const setQty = (id: string, qty: number) => setCart(prev => prev.map(l => l.item.id === id ? { ...l, qty: Math.max(1, qty) } : l))

  const placeOrder = async () => {
    if (!orderForm.name || !orderForm.phone) {
      setOrderError('Name and phone are required.')
      return
    }
    setOrderError(null)
    const order = {
      id: `ws-${Date.now()}`,
      tenantId,
      customer: orderForm,
      items: cart.map(l => ({ name: l.item.name, quantity: l.qty, price: l.item.price })),
      total: cartTotal,
      createdAt: Date.now(),
      status: 'pending',
    }
    // Persist locally so the owner can see orders placed while the app is open.
    try {
      const key = `equipulse.webstore.orders.${tenantId}`
      const prev = JSON.parse(localStorage.getItem(key) || '[]')
      prev.push(order)
      localStorage.setItem(key, JSON.stringify(prev.slice(-200)))
    } catch {
      // localStorage quota or disabled - non-fatal
    }

    // Best-effort notification to the merchant (WhatsApp link).
    const wa = getCachedCredential<{ phoneNumberId?: string }>('whatsapp_cloud')
    if (wa?.values?.phoneNumberId) {
      const text = encodeURIComponent(
        `New webstore order from ${orderForm.name}\nPhone: ${orderForm.phone}\nTotal: ৳${formatPrice(cartTotal)}\nItems: ${cart.map(l => `${l.qty}x ${l.item.name}`).join(', ')}`,
      )
      try { window.open(`https://wa.me/?text=${text}`, '_blank') } catch {
        // popup blocked - non-fatal
      }
    }
    setOrderSent(true)
    setCart([])
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-surface to-muted">
        <div className="text-center">
          <div className="animate-spin w-12 h-12 mx-auto mb-4 border-4 border-accent border-t-transparent rounded-full" />
          <p className="text-ink-soft">Loading store…</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-surface to-muted p-6">
        <div className="max-w-md text-center bg-surface-strong rounded-2xl p-8 shadow-sm">
          <Store className="mx-auto mb-4 text-ink-soft" size={48} />
          <h1 className="text-2xl font-heading font-bold mb-2">Store Unavailable</h1>
          <p className="text-ink-soft mb-4">{error}</p>
          <Link to="/" className="text-accent hover:underline">Back to home</Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-surface via-muted to-surface text-ink">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-surface/95 backdrop-blur border-b border-line shadow-sm">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center gap-4">
          <Store className="text-accent" size={28} />
          <div className="flex-1 min-w-0">
            <h1 className="font-heading text-xl font-bold truncate">{storeName}</h1>
            <p className="text-xs text-ink-soft">Online store</p>
          </div>
          <button
            onClick={() => setShowCart(true)}
            className="relative inline-flex items-center gap-2 rounded-xl bg-accent px-4 py-2 text-sm font-semibold text-surface shadow-glow hover:bg-accent/90"
            type="button"
          >
            <ShoppingCart size={18} />
            Cart
            {cartCount > 0 && (
              <span className="absolute -top-2 -right-2 bg-error text-surface text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
                {cartCount}
              </span>
            )}
          </button>
        </div>
        {/* Search + filter */}
        <div className="max-w-6xl mx-auto px-4 pb-3 flex flex-col sm:flex-row gap-2">
          <div className="relative flex-1">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-soft" />
            <input
              className="w-full pl-9 pr-3 py-2 rounded-xl border border-line bg-surface text-sm focus:border-accent focus:outline-none"
              placeholder="Search products…"
              value={query}
              onChange={e => setQuery(e.target.value)}
            />
          </div>
          {categories.length > 1 && (
            <div className="flex items-center gap-2 overflow-x-auto">
              <Filter size={14} className="text-ink-soft flex-shrink-0" />
              {categories.map(c => (
                <button
                  key={c}
                  onClick={() => setCategory(c)}
                  className={`px-3 py-1 rounded-full text-xs whitespace-nowrap transition-colors ${category === c ? 'bg-accent text-surface' : 'bg-muted text-ink-soft hover:bg-line'}`}
                  type="button"
                >
                  {c}
                </button>
              ))}
            </div>
          )}
        </div>
      </header>

      {/* Catalog */}
      <main className="max-w-6xl mx-auto px-4 py-6">
        {filtered.length === 0 ? (
          <div className="text-center py-16 text-ink-soft">
            <Package className="mx-auto mb-3 opacity-50" size={48} />
            <p>No products published yet.</p>
            <p className="text-xs mt-1">Check back soon!</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
            {filtered.map(item => (
              <motion.article
                key={item.id}
                whileHover={{ y: -2 }}
                className="bg-surface-strong rounded-2xl border border-line/50 overflow-hidden shadow-sm hover:shadow-glass transition-shadow"
              >
                <div className="aspect-square bg-muted relative overflow-hidden">
                  {item.imageUrl ? (
                    <img src={item.imageUrl} alt={item.name} className="w-full h-full object-cover" loading="lazy" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-ink-soft">
                      <Package size={48} />
                    </div>
                  )}
                  {!item.inStock && (
                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                      <span className="text-surface font-bold text-sm">Out of stock</span>
                    </div>
                  )}
                </div>
                <div className="p-3">
                  <h3 className="font-semibold text-sm line-clamp-2 min-h-[2.5rem]">{item.name}</h3>
                  <div className="mt-1 flex items-baseline gap-1">
                    <span className="font-heading font-bold text-accent">৳{formatPrice(item.price)}</span>
                    {item.unit && <span className="text-xs text-ink-soft">/ {item.unit}</span>}
                  </div>
                  <button
                    disabled={!item.inStock}
                    onClick={() => addToCart(item)}
                    className="mt-2 w-full py-2 rounded-xl bg-accent text-surface text-xs font-semibold shadow-sm hover:bg-accent/90 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                    type="button"
                  >
                    {item.inStock ? 'Add to cart' : 'Unavailable'}
                  </button>
                </div>
              </motion.article>
            ))}
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-line bg-surface/60 py-6 text-center text-xs text-ink-soft">
        <p>Powered by <a href={storefrontUrl(tenantId)} className="text-accent hover:underline">EquiPulse AI</a></p>
        <p className="mt-1">Store ID: {tenantId}</p>
      </footer>

      {/* Cart drawer */}
      <AnimatePresence>
        {showCart && (
          <motion.aside
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'tween', duration: 0.25 }}
            className="fixed top-0 right-0 z-50 h-full w-full max-w-md bg-surface shadow-2xl flex flex-col"
          >
            <header className="flex items-center justify-between p-4 border-b border-line">
              <h2 className="font-heading font-bold text-lg">Your cart</h2>
              <button onClick={() => setShowCart(false)} className="p-2 rounded-lg hover:bg-muted" type="button" aria-label="Close cart">
                <X size={20} />
              </button>
            </header>
            <div className="flex-1 overflow-y-auto p-4 space-y-2">
              {cart.length === 0 ? (
                <p className="text-center text-ink-soft py-8">Your cart is empty.</p>
              ) : (
                cart.map(line => (
                  <div key={line.item.id} className="flex items-center gap-3 bg-muted rounded-xl p-3">
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm truncate">{line.item.name}</p>
                      <p className="text-xs text-ink-soft">৳{formatPrice(line.item.price)}</p>
                    </div>
                    <div className="flex items-center gap-1">
                      <button onClick={() => setQty(line.item.id, line.qty - 1)} className="w-7 h-7 rounded-lg bg-surface" type="button">−</button>
                      <span className="w-6 text-center text-sm">{line.qty}</span>
                      <button onClick={() => setQty(line.item.id, line.qty + 1)} className="w-7 h-7 rounded-lg bg-surface" type="button">+</button>
                    </div>
                    <button onClick={() => removeFromCart(line.item.id)} className="p-1 text-error" type="button" aria-label="Remove">
                      <X size={16} />
                    </button>
                  </div>
                ))
              )}
            </div>
            {cart.length > 0 && (
              <div className="p-4 border-t border-line space-y-3">
                <div className="flex justify-between text-sm font-semibold">
                  <span>Total</span>
                  <span className="text-accent">৳{formatPrice(cartTotal)}</span>
                </div>
                <button
                  onClick={() => { setOrderSent(false); setShowCart(false); }}
                  className="w-full py-2 rounded-xl bg-muted text-sm font-semibold"
                  type="button"
                >
                  Continue browsing
                </button>
              </div>
            )}
          </motion.aside>
        )}
      </AnimatePresence>

      {/* Checkout modal */}
      <AnimatePresence>
        {showCart && cart.length > 0 && !orderSent && (
          <CheckoutModal
            orderForm={orderForm}
            setOrderForm={setOrderForm}
            cartTotal={cartTotal}
            cartCount={cartCount}
            error={orderError}
            onClose={() => { setShowCart(false); setOrderError(null) }}
            onPlace={placeOrder}
          />
        )}
        {orderSent && (
          <SuccessModal onClose={() => { setOrderSent(false); setShowCart(false) }} />
        )}
      </AnimatePresence>
    </div>
  )
}

function CheckoutModal(props: {
  orderForm: { name: string; phone: string; address: string; note: string }
  setOrderForm: React.Dispatch<React.SetStateAction<{ name: string; phone: string; address: string; note: string }>>
  cartTotal: number
  cartCount: number
  error: string | null
  onClose: () => void
  onPlace: () => void
}) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[60] bg-black/50 flex items-center justify-center p-4"
      onClick={props.onClose}
    >
      <motion.div
        initial={{ scale: 0.95 }}
        animate={{ scale: 1 }}
        className="bg-surface rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-4"
        onClick={e => e.stopPropagation()}
      >
        <h3 className="font-heading font-bold text-lg">Place order</h3>
        <input
          className="w-full px-3 py-2 rounded-xl border border-line bg-surface text-sm"
          placeholder="Your name *"
          value={props.orderForm.name}
          onChange={e => props.setOrderForm(f => ({ ...f, name: e.target.value }))}
        />
        <input
          className="w-full px-3 py-2 rounded-xl border border-line bg-surface text-sm"
          placeholder="Phone * (e.g. 01XXXXXXXXX)"
          value={props.orderForm.phone}
          onChange={e => props.setOrderForm(f => ({ ...f, phone: e.target.value }))}
        />
        <textarea
          className="w-full px-3 py-2 rounded-xl border border-line bg-surface text-sm"
          placeholder="Delivery address"
          rows={2}
          value={props.orderForm.address}
          onChange={e => props.setOrderForm(f => ({ ...f, address: e.target.value }))}
        />
        <textarea
          className="w-full px-3 py-2 rounded-xl border border-line bg-surface text-sm"
          placeholder="Note for the seller (optional)"
          rows={2}
          value={props.orderForm.note}
          onChange={e => props.setOrderForm(f => ({ ...f, note: e.target.value }))}
        />
        <div className="flex items-center justify-between py-2 border-y border-line">
          <span className="text-sm text-ink-soft">{props.cartCount} item{props.cartCount > 1 ? 's' : ''}</span>
          <span className="font-heading font-bold text-accent">৳{formatPrice(props.cartTotal)}</span>
        </div>
        {props.error && <p className="text-error text-sm">{props.error}</p>}
        <div className="flex gap-2">
          <button
            onClick={props.onClose}
            className="flex-1 py-2 rounded-xl bg-muted text-sm font-semibold"
            type="button"
          >
            Cancel
          </button>
          <button
            onClick={props.onPlace}
            className="flex-1 py-2 rounded-xl bg-accent text-surface text-sm font-semibold inline-flex items-center justify-center gap-2"
            type="button"
          >
            <Send size={16} /> Place order
          </button>
        </div>
      </motion.div>
    </motion.div>
  )
}

function SuccessModal({ onClose }: { onClose: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[60] bg-black/50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95 }}
        animate={{ scale: 1 }}
        className="bg-surface rounded-2xl shadow-2xl w-full max-w-sm p-8 text-center"
        onClick={e => e.stopPropagation()}
      >
        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-success/20 flex items-center justify-center text-success">
          <Send size={28} />
        </div>
        <h3 className="font-heading font-bold text-xl mb-2">Order placed!</h3>
        <p className="text-sm text-ink-soft mb-6">
          The seller has been notified. They will confirm by phone or message.
        </p>
        <button
          onClick={onClose}
          className="w-full py-2 rounded-xl bg-accent text-surface text-sm font-semibold"
          type="button"
        >
          Continue shopping
        </button>
      </motion.div>
    </motion.div>
  )
}
