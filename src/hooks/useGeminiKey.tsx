import { useState, useCallback } from 'react'

const KEY_CACHE_ID = 'equipulse-gemini-key'

export function useGeminiKey() {
  const [key, setKey] = useState<string>(() => {
    // Obfuscated read
    const stored = window.localStorage.getItem(KEY_CACHE_ID)
    if (stored) {
      try {
        return atob(stored)
      } catch {
        return ''
      }
    }
    return import.meta.env.VITE_GEMINI_API_KEY || ''
  })

  const saveKey = useCallback((newKey: string) => {
    setKey(newKey)
    if (newKey && newKey !== import.meta.env.VITE_GEMINI_API_KEY) {
      window.localStorage.setItem(KEY_CACHE_ID, btoa(newKey))
    } else if (!newKey) {
      window.localStorage.removeItem(KEY_CACHE_ID)
    }
  }, [])

  return [key, saveKey] as const
}
