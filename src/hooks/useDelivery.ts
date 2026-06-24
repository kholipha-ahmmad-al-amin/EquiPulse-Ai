// useDelivery: real shipping + click-and-collect + social commerce publishing.
// All third-party calls require user-supplied credentials (BYO-keys via useCredentials).
// Click & Collect and Social Commerce catalog drafts work offline.

import { useCallback, useEffect, useState } from 'react'
import { getCachedCredential, getCredentialValues, type CredentialProvider } from './useCredentials'
import type { InventoryItem } from './useInventory'

// ------------------------------------------------------------------
// Types
// ------------------------------------------------------------------

export type DeliveryProvider = 'pathao' | 'steadfast' | 'redx' | 'sundarban'

export interface DeliveryAddress {
  name: string
  phone: string
  address: string
  city?: string
  area?: string
  postCode?: string
  note?: string
}

export interface DeliveryItem {
  name: string
  quantity: number
  weightKg?: number
  price?: number
}

export interface DeliveryShipment {
  id: string
  provider: DeliveryProvider
  trackingNumber: string
  status: string
  createdAt: number
  amount: number
  customer: DeliveryAddress
  raw?: unknown
}

export interface DeliveryReason {
  ok: boolean
  reason:
    | 'ok'
    | 'not_configured'
    | 'invalid_address'
    | 'provider_error'
    | 'rate_limited'
    | 'no_internet'
    | 'cancelled'
  error?: string
  shipment?: DeliveryShipment
}

interface PathaoCreds {
  provider: 'pathao'
  clientId: string
  clientSecret: string
  storeId: string
  baseUrl?: string
}

interface SteadfastCreds {
  provider: 'steadfast'
  apiKey: string
  secretKey: string
  baseUrl?: string
}

interface RedxCreds {
  provider: 'redx'
  apiToken: string
  baseUrl?: string
}

interface SundarbanCreds {
  provider: 'sundarban'
  apiKey: string
  baseUrl?: string
}

type CarrierCreds = PathaoCreds | SteadfastCreds | RedxCreds | SundarbanCreds

// ------------------------------------------------------------------
// Pathao
// ------------------------------------------------------------------

const PATHAO_DEFAULTS = {
  baseUrl: 'https://api-hermes.pathao.com',
  authBase: 'https://merchant.pathao.com',
}

let pathaoTokenCache: { token: string; expires: number } | null = null

const pathaoAuth = async (creds: PathaoCreds): Promise<string> => {
  const now = Date.now()
  if (pathaoTokenCache && pathaoTokenCache.expires > now + 60_000) {
    return pathaoTokenCache.token
  }
  const authBase = creds.baseUrl ? creds.baseUrl.replace(/\/+$/, '') : PATHAO_DEFAULTS.authBase
  const res = await fetch(`${authBase}/api/v1/issue-token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({
      client_id: creds.clientId,
      client_secret: creds.clientSecret,
      grant_type: 'password',
    }),
  })
  if (!res.ok) {
    const body = await res.text()
    throw new Error(`Pathao auth failed: ${res.status} ${body.slice(0, 200)}`)
  }
  const json = (await res.json()) as { access_token?: string; expires_in?: number }
  if (!json.access_token) throw new Error('Pathao returned no token')
  pathaoTokenCache = {
    token: json.access_token,
    expires: now + (json.expires_in || 3600) * 1000,
  }
  return json.access_token
}

const sendPathao = async (
  creds: PathaoCreds,
  order: { customer: DeliveryAddress; items: DeliveryItem[]; amount: number; reference?: string },
): Promise<DeliveryReason> => {
  const base = creds.baseUrl || PATHAO_DEFAULTS.baseUrl
  let token: string
  try {
    token = await pathaoAuth(creds)
  } catch (err) {
    return {
      ok: false,
      reason: 'provider_error',
      error: err instanceof Error ? err.message : 'Pathao auth failed',
    }
  }

  const recipient_phone = order.customer.phone.replace(/[^0-9+]/g, '')
  const recipient_address = [order.customer.address, order.customer.area, order.customer.city, order.customer.postCode]
    .filter(Boolean)
    .join(', ')

  const payload = {
    store_id: Number(creds.storeId) || creds.storeId,
    merchant_order_id: order.reference || `EP-${Date.now()}`,
    recipient_name: order.customer.name,
    recipient_phone,
    recipient_address,
    recipient_city: Number(order.customer.city) || 1,
    recipient_zone: Number(order.customer.area) || 1,
    recipient_area: order.customer.postCode || 'N/A',
    delivery_type: 48,
    item_type: 2,
    special_instruction: order.customer.note || '',
    item_quantity: order.items.reduce((s, i) => s + i.quantity, 0),
    item_weight: order.items.reduce((s, i) => s + (i.weightKg || 0.5), 0),
    amount_to_collect: Math.round(order.amount),
    item_description: order.items.map(i => `${i.quantity}x ${i.name}`).slice(0, 5).join(', '),
  }

  let res: Response
  try {
    res = await fetch(`${base}/api/v1/orders`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(payload),
    })
  } catch (err) {
    return { ok: false, reason: 'no_internet', error: err instanceof Error ? err.message : 'Network error' }
  }
  if (res.status === 429) return { ok: false, reason: 'rate_limited' }
  if (!res.ok) {
    const body = await res.text()
    return { ok: false, reason: 'provider_error', error: `Pathao ${res.status}: ${body.slice(0, 200)}` }
  }
  const json = (await res.json()) as { data?: { consignment_id?: string; tracking_code?: string }; message?: string }
  const tracking = json.data?.tracking_code || json.data?.consignment_id || 'pending'
  return {
    ok: true,
    reason: 'ok',
    shipment: {
      id: `pathao-${Date.now()}`,
      provider: 'pathao',
      trackingNumber: String(tracking),
      status: 'pending',
      createdAt: Date.now(),
      amount: order.amount,
      customer: order.customer,
      raw: json,
    },
  }
}

// ------------------------------------------------------------------
// Steadfast
// ------------------------------------------------------------------

const STeadFAST_DEFAULTS = { baseUrl: 'https://portal.steadfast.com.bd' }

const sendSteadfast = async (
  creds: SteadfastCreds,
  order: { customer: DeliveryAddress; items: DeliveryItem[]; amount: number; reference?: string },
): Promise<DeliveryReason> => {
  const base = creds.baseUrl || STeadFAST_DEFAULTS.baseUrl
  const recipient_phone = order.customer.phone.replace(/[^0-9]/g, '')
  const payload = {
    invoice: order.reference || `EP-${Date.now()}`,
    recipient_name: order.customer.name,
    recipient_phone,
    recipient_address: order.customer.address,
    recipient_city: order.customer.city || 'Dhaka',
    recipient_area: order.customer.area || '',
    recipient_thana: '',
    cod_amount: Math.round(order.amount),
    note: order.customer.note || '',
    item_description: order.items.map(i => `${i.quantity}x ${i.name}`).slice(0, 5).join(', '),
    delivery_type: 0,
  }
  let res: Response
  try {
    res = await fetch(`${base}/api/v1/create_order`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        'Api-Key': creds.apiKey,
        'Secret-Key': creds.secretKey,
      },
      body: JSON.stringify(payload),
    })
  } catch (err) {
    return { ok: false, reason: 'no_internet', error: err instanceof Error ? err.message : 'Network error' }
  }
  if (res.status === 429) return { ok: false, reason: 'rate_limited' }
  if (!res.ok) {
    const body = await res.text()
    return { ok: false, reason: 'provider_error', error: `Steadfast ${res.status}: ${body.slice(0, 200)}` }
  }
  const json = (await res.json()) as {
    status?: number
    message?: string
    consignment?: { tracking_code?: string; status?: string }
  }
  if (json.status !== 200) {
    return { ok: false, reason: 'provider_error', error: json.message || 'Steadfast rejected order' }
  }
  return {
    ok: true,
    reason: 'ok',
    shipment: {
      id: `steadfast-${Date.now()}`,
      provider: 'steadfast',
      trackingNumber: json.consignment?.tracking_code || 'pending',
      status: json.consignment?.status || 'in_review',
      createdAt: Date.now(),
      amount: order.amount,
      customer: order.customer,
      raw: json,
    },
  }
}

// ------------------------------------------------------------------
// RedX
// ------------------------------------------------------------------

const sendRedx = async (
  creds: RedxCreds,
  order: { customer: DeliveryAddress; items: DeliveryItem[]; amount: number; reference?: string },
): Promise<DeliveryReason> => {
  const base = creds.baseUrl || 'https://api.redx.com.bd'
  const payload = {
    customer_name: order.customer.name,
    customer_phone: order.customer.phone.replace(/[^0-9]/g, ''),
    delivery_area: order.customer.area || order.customer.city || 'Dhaka',
    delivery_address: order.customer.address,
    cash_collection_amount: Math.round(order.amount),
    parcel_weight: 0.5,
    invoice_id: order.reference || `EP-${Date.now()}`,
    product_description: order.items.map(i => `${i.quantity}x ${i.name}`).slice(0, 5).join(', '),
    note: order.customer.note || '',
  }
  let res: Response
  try {
    res = await fetch(`${base}/v1/user/parcel`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        'API-ACCESS-TOKEN': creds.apiToken,
      },
      body: JSON.stringify(payload),
    })
  } catch (err) {
    return { ok: false, reason: 'no_internet', error: err instanceof Error ? err.message : 'Network error' }
  }
  if (res.status === 429) return { ok: false, reason: 'rate_limited' }
  if (!res.ok) {
    const body = await res.text()
    return { ok: false, reason: 'provider_error', error: `RedX ${res.status}: ${body.slice(0, 200)}` }
  }
  const json = (await res.json()) as { tracking_id?: string; status?: string }
  return {
    ok: true,
    reason: 'ok',
    shipment: {
      id: `redx-${Date.now()}`,
      provider: 'redx',
      trackingNumber: json.tracking_id || 'pending',
      status: json.status || 'pickup_pending',
      createdAt: Date.now(),
      amount: order.amount,
      customer: order.customer,
      raw: json,
    },
  }
}

// ------------------------------------------------------------------
// Sundarban
// ------------------------------------------------------------------

const sendSundarban = async (
  creds: SundarbanCreds,
  order: { customer: DeliveryAddress; items: DeliveryItem[]; amount: number; reference?: string },
): Promise<DeliveryReason> => {
  const base = creds.baseUrl || 'https://csapi.sundarbancourier.com'
  const payload = {
    name: order.customer.name,
    mobileNo: order.customer.phone.replace(/[^0-9]/g, ''),
    address: order.customer.address,
    city: order.customer.city || 'Dhaka',
    area: order.customer.area,
    weight: 0.5,
    productPrice: Math.round(order.amount),
    cashCollection: Math.round(order.amount),
    reference: order.reference || `EP-${Date.now()}`,
    note: order.customer.note || '',
  }
  let res: Response
  try {
    res = await fetch(`${base}/api/v1/orders/create`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${creds.apiKey}` },
      body: JSON.stringify(payload),
    })
  } catch (err) {
    return { ok: false, reason: 'no_internet', error: err instanceof Error ? err.message : 'Network error' }
  }
  if (res.status === 429) return { ok: false, reason: 'rate_limited' }
  if (!res.ok) {
    const body = await res.text()
    return { ok: false, reason: 'provider_error', error: `Sundarban ${res.status}: ${body.slice(0, 200)}` }
  }
  const json = (await res.json()) as { trackingNumber?: string; status?: string }
  return {
    ok: true,
    reason: 'ok',
    shipment: {
      id: `sundarban-${Date.now()}`,
      provider: 'sundarban',
      trackingNumber: json.trackingNumber || 'pending',
      status: json.status || 'pending',
      createdAt: Date.now(),
      amount: order.amount,
      customer: order.customer,
      raw: json,
    },
  }
}

// ------------------------------------------------------------------
// Click & Collect
// ------------------------------------------------------------------

export interface ClickCollectOrder {
  id: string
  code: string
  customer: { name: string; phone: string }
  items: { name: string; quantity: number; price: number }[]
  total: number
  status: 'pending' | 'ready' | 'picked_up' | 'cancelled'
  createdAt: number
  notes?: string
}

const CLICK_COLLECT_KEY = 'equipulse.clickcollect.v1'

const generatePickupCode = (): string => {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let out = ''
  for (let i = 0; i < 6; i++) {
    out += chars[Math.floor(Math.random() * chars.length)]
  }
  return out
}

const loadClickCollect = (): ClickCollectOrder[] => {
  try {
    const raw = localStorage.getItem(CLICK_COLLECT_KEY)
    return raw ? (JSON.parse(raw) as ClickCollectOrder[]) : []
  } catch {
    return []
  }
}

const saveClickCollect = (orders: ClickCollectOrder[]) => {
  try {
    localStorage.setItem(CLICK_COLLECT_KEY, JSON.stringify(orders.slice(-200)))
  } catch {
    // localStorage quota or disabled storage - non-fatal
  }
}

// ------------------------------------------------------------------
// Social Commerce: catalog publishing
// ------------------------------------------------------------------

export type SocialProvider = 'facebook_catalog' | 'instagram_catalog'

export interface SocialPublishResult {
  ok: boolean
  reason: 'ok' | 'not_configured' | 'provider_error' | 'rate_limited' | 'no_internet' | 'no_items'
  uploaded: number
  catalogUrl?: string
  error?: string
}

interface FacebookCatalogCreds {
  provider: SocialProvider
  catalogId: string
  accessToken: string
  pixelId?: string
}

const buildFacebookFeed = (items: InventoryItem[], storeName: string, baseUrl?: string): string => {
  const rows: string[] = [
    'id,title,description,availability,condition,price,link,image_link,brand',
  ]
  for (const i of items) {
    const id = i.sku || i.id
    const title = (i.name || '').replace(/,/g, ' ').replace(/"/g, '')
    const desc = (i.category || i.name || '').replace(/,/g, ' ').replace(/"/g, '')
    const price = `${(i.price || 0).toFixed(2)} BDT`
    const link = baseUrl ? `${baseUrl}/product/${i.id}` : ''
    const img = ''
    rows.push([id, title, desc, i.quantity > 0 ? 'in stock' : 'out of stock', 'new', price, link, img, storeName].join(','))
  }
  return rows.join('\n')
}

const uploadFacebookFeed = async (
  creds: FacebookCatalogCreds,
  items: InventoryItem[],
  storeName: string,
  baseUrl?: string,
): Promise<SocialPublishResult> => {
  if (items.length === 0) return { ok: false, reason: 'no_items', uploaded: 0 }
  const feed = buildFacebookFeed(items, storeName, baseUrl)
  const url = `https://graph.facebook.com/v19.0/${encodeURIComponent(creds.catalogId)}/upload_edge`
  const form = new FormData()
  form.append('access_token', creds.accessToken)
  form.append('file', new Blob([feed], { type: 'text/csv' }), 'catalog.csv')
  form.append('type', 'feed')
  form.append('update_if_exists', 'true')
  let res: Response
  try {
    res = await fetch(url, { method: 'POST', body: form })
  } catch (err) {
    return { ok: false, reason: 'no_internet', uploaded: 0, error: err instanceof Error ? err.message : 'Network error' }
  }
  if (res.status === 429) return { ok: false, reason: 'rate_limited', uploaded: 0 }
  if (!res.ok) {
    const body = await res.text()
    return { ok: false, reason: 'provider_error', uploaded: 0, error: `Meta ${res.status}: ${body.slice(0, 200)}` }
  }
  const json = (await res.json()) as { handles?: string[]; id?: string }
  return {
    ok: true,
    reason: 'ok',
    uploaded: items.length,
    catalogUrl: `https://facebook.com/catalog/${creds.catalogId}`,
    error: json.handles?.[0] || json.id,
  }
}

// Instagram uses the same Meta Commerce catalog endpoint, so we share the creds.
const uploadInstagramFeed = uploadFacebookFeed

// ------------------------------------------------------------------
// Hook
// ------------------------------------------------------------------

export interface UseDeliveryResult {
  // Carrier
  configuredCarrier: DeliveryProvider | null
  createShipment: (order: {
    customer: DeliveryAddress
    items: DeliveryItem[]
    amount: number
    reference?: string
  }) => Promise<DeliveryReason>
  // Click & Collect
  clickCollectOrders: ClickCollectOrder[]
  createClickCollect: (input: {
    customer: { name: string; phone: string }
    items: { name: string; quantity: number; price: number }[]
    notes?: string
  }) => ClickCollectOrder
  markClickCollect: (id: string, status: ClickCollectOrder['status']) => void
  // Social
  configuredSocial: SocialProvider | null
  publishCatalog: (
    items: InventoryItem[],
    meta: { storeName: string; baseUrl?: string },
  ) => Promise<SocialPublishResult>
  // History (shipments in localStorage)
  recentShipments: DeliveryShipment[]
  clearShipmentHistory: () => void
}

const SHIPMENT_HISTORY_KEY = 'equipulse.shipments.v1'
const loadShipmentHistory = (): DeliveryShipment[] => {
  try {
    const raw = localStorage.getItem(SHIPMENT_HISTORY_KEY)
    return raw ? (JSON.parse(raw) as DeliveryShipment[]) : []
  } catch {
    return []
  }
}
const persistShipmentHistory = (list: DeliveryShipment[]) => {
  try {
    localStorage.setItem(SHIPMENT_HISTORY_KEY, JSON.stringify(list.slice(-200)))
  } catch {
    // localStorage quota or disabled storage - non-fatal
  }
}

const readCarrierCreds = (): { creds: CarrierCreds | null; provider: DeliveryProvider | null } => {
  const candidates: { provider: DeliveryProvider; providerKey: CredentialProvider }[] = [
    { provider: 'pathao', providerKey: 'shipping_pathao' },
    { provider: 'steadfast', providerKey: 'shipping_steadfast' },
    { provider: 'redx', providerKey: 'shipping_redx' },
    { provider: 'sundarban', providerKey: 'shipping_sundarban' },
  ]
  // Prefer the user-selected default in localStorage, else first configured.
  const preferred = (typeof localStorage !== 'undefined' && localStorage.getItem('equipulse.preferredCarrier')) as DeliveryProvider | null
  const ordered = preferred
    ? [candidates.find(c => c.provider === preferred), ...candidates.filter(c => c.provider !== preferred)].filter(Boolean) as typeof candidates
    : candidates
  for (const c of ordered) {
    const stored = getCachedCredential<Record<string, string>>(c.providerKey)
    if (stored && stored.values && Object.keys(stored.values).length > 0) {
      return { creds: { ...stored.values, provider: c.provider } as CarrierCreds, provider: c.provider }
    }
  }
  return { creds: null, provider: null }
}

const readSocialCreds = (): { creds: FacebookCatalogCreds | null; provider: SocialProvider | null } => {
  const fb = getCachedCredential<{ catalogId?: string; accessToken?: string }>('social_facebook')
  if (fb && fb.values?.catalogId && fb.values?.accessToken) {
    return { creds: { catalogId: fb.values.catalogId, accessToken: fb.values.accessToken, provider: 'facebook_catalog' }, provider: 'facebook_catalog' }
  }
  const ig = getCachedCredential<{ catalogId?: string; accessToken?: string }>('social_instagram')
  if (ig && ig.values?.catalogId && ig.values?.accessToken) {
    return { creds: { catalogId: ig.values.catalogId, accessToken: ig.values.accessToken, provider: 'instagram_catalog' }, provider: 'instagram_catalog' }
  }
  return { creds: null, provider: null }
}

export function useDelivery(): UseDeliveryResult {
  const [clickCollectOrders, setClickCollectOrders] = useState<ClickCollectOrder[]>(loadClickCollect)
  const [recentShipments, setRecentShipments] = useState<DeliveryShipment[]>(loadShipmentHistory)
  const [tick, setTick] = useState(0)

  useEffect(() => {
    const handler = () => setTick(t => t + 1)
    window.addEventListener('equipulse:credentials-changed', handler)
    return () => window.removeEventListener('equipulse:credentials-changed', handler)
  }, [])

  const { provider: configuredCarrier } = (() => {
    void tick
    return readCarrierCreds()
  })()
  const { provider: configuredSocial } = readSocialCreds()

  const createShipment = useCallback(
    async (order: { customer: DeliveryAddress; items: DeliveryItem[]; amount: number; reference?: string }): Promise<DeliveryReason> => {
      if (!order.customer?.name || !order.customer?.phone || !order.customer?.address) {
        return { ok: false, reason: 'invalid_address', error: 'Customer name, phone and address are required.' }
      }
      const live = readCarrierCreds().creds
      if (!live) return { ok: false, reason: 'not_configured', error: 'Configure a shipping provider in Settings.' }
      let result: DeliveryReason
      switch (live.provider) {
        case 'pathao': result = await sendPathao(live, order); break
        case 'steadfast': result = await sendSteadfast(live, order); break
        case 'redx': result = await sendRedx(live, order); break
        case 'sundarban': result = await sendSundarban(live, order); break
        default: result = { ok: false, reason: 'not_configured' }
      }
      if (result.ok && result.shipment) {
        const list = loadShipmentHistory()
        list.push(result.shipment)
        persistShipmentHistory(list)
        setRecentShipments(list)
      }
      return result
    },
    [],
  )

  const createClickCollect = useCallback(
    (input: { customer: { name: string; phone: string }; items: { name: string; quantity: number; price: number }[]; notes?: string }) => {
      const code = generatePickupCode()
      const order: ClickCollectOrder = {
        id: `cc-${Date.now()}`,
        code,
        customer: input.customer,
        items: input.items,
        total: input.items.reduce((s, i) => s + i.price * i.quantity, 0),
        status: 'pending',
        createdAt: Date.now(),
        notes: input.notes,
      }
      const list = loadClickCollect()
      list.push(order)
      saveClickCollect(list)
      setClickCollectOrders(list)
      return order
    },
    [],
  )

  const markClickCollect = useCallback((id: string, status: ClickCollectOrder['status']) => {
    const list = loadClickCollect().map(o => (o.id === id ? { ...o, status } : o))
    saveClickCollect(list)
    setClickCollectOrders(list)
  }, [])

  const publishCatalog = useCallback(
    async (items: InventoryItem[], meta: { storeName: string; baseUrl?: string }): Promise<SocialPublishResult> => {
      const live = readSocialCreds()
      if (!live.creds || !live.provider) {
        return { ok: false, reason: 'not_configured', uploaded: 0 }
      }
      if (live.provider === 'instagram_catalog') {
        return uploadInstagramFeed(live.creds, items, meta.storeName, meta.baseUrl)
      }
      return uploadFacebookFeed(live.creds, items, meta.storeName, meta.baseUrl)
    },
    [],
  )

  const clearShipmentHistory = useCallback(() => {
    persistShipmentHistory([])
    setRecentShipments([])
  }, [])

  return {
    configuredCarrier,
    createShipment,
    clickCollectOrders,
    createClickCollect,
    markClickCollect,
    configuredSocial,
    publishCatalog,
    recentShipments,
    clearShipmentHistory,
  }
}

// Re-exports for callers that need a non-React helper.
export { getCredentialValues, getCachedCredential }
