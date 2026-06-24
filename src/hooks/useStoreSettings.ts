import { useState, useCallback } from 'react'

export type StoreSettings = {
  currencySymbol: string
  secondaryCurrencySymbol: string
  exchangeRate: number
  storeName: string
  storeAddress: string
  vatRate: number
  receiptFooter: string
  n8nWebhookUrl: string
  dynamicPricing: boolean
  activeLocation: string
}

const SETTINGS_KEY = 'equipulse-store-settings'

const defaultSettings: StoreSettings = {
  currencySymbol: '৳',
  secondaryCurrencySymbol: '$',
  exchangeRate: 0, // 0 means disabled
  storeName: 'SME Pulse Retail',
  storeAddress: '123 Main Street, Business District',
  vatRate: 0,
  receiptFooter: 'Thank you for your purchase!',
  n8nWebhookUrl: '',
  dynamicPricing: false,
  activeLocation: 'Main Warehouse',
}

export function useStoreSettings() {
  const [settings, setSettings] = useState<StoreSettings>(() => {
    try {
      const stored = window.localStorage.getItem(SETTINGS_KEY)
      if (stored) {
        return { ...defaultSettings, ...JSON.parse(stored) }
      }
    } catch {
      // ignore
    }
    return defaultSettings
  })

  const saveSettings = useCallback((newSettings: Partial<StoreSettings>) => {
    setSettings((prev) => {
      const updated = { ...prev, ...newSettings }
      window.localStorage.setItem(SETTINGS_KEY, JSON.stringify(updated))
      return updated
    })
  }, [])

  return [settings, saveSettings] as const
}
