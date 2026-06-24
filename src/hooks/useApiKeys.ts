import { useState, useCallback } from 'react'

export type ApiKeys = {
  gemini: string
  groq: string
  openrouter: string
  cohere: string
  atomesus: string
}

const KEY_CACHE_ID = 'equipulse-api-keys'

export function useApiKeys() {
  const [keys, setKeys] = useState<ApiKeys>(() => {
    const defaultKeys: ApiKeys = {
      gemini: import.meta.env.VITE_GEMINI_API_KEY || '',
      groq: import.meta.env.VITE_GROQ_API_KEY || '',
      openrouter: import.meta.env.VITE_OPENROUTER_API_KEY || '',
      cohere: import.meta.env.VITE_COHERE_API_KEY || '',
      atomesus: import.meta.env.VITE_ATOMESUS_API_KEY || '',
    }

    const stored = window.localStorage.getItem(KEY_CACHE_ID)
    if (stored) {
      try {
        const parsed = JSON.parse(atob(stored))
        return { ...defaultKeys, ...parsed }
      } catch {
        return defaultKeys
      }
    }
    return defaultKeys
  })

  const saveKeys = useCallback((newKeys: Partial<ApiKeys>) => {
    setKeys(prev => {
      const updated = { ...prev, ...newKeys }
      window.localStorage.setItem(KEY_CACHE_ID, btoa(JSON.stringify(updated)))
      return updated
    })
  }, [])

  return [keys, saveKeys] as const
}
