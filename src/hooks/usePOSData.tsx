/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useState, useMemo, useCallback, type ReactNode } from 'react'
import { loadCSVAndAnalyze } from '../utils/duckdbHelper'
import { useStoreProfile } from './useStoreProfile'

export type POSAnalysisRow = {
  category: string
  total_revenue: number
  total_quantity: number
}

type POSDataContextType = {
  analysisResult: POSAnalysisRow[] | null
  isProcessing: boolean
  error: string | null
  processCSV: (file: File) => Promise<void>
  clearData: () => void
}

const POSDataContext = createContext<POSDataContextType | null>(null)

export function POSDataProvider({ children }: { children: ReactNode }) {
  const [analysisResult, setAnalysisResult] = useState<POSAnalysisRow[] | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { profile, saveProfile } = useStoreProfile()

  const processCSV = useCallback(async (file: File) => {
    setIsProcessing(true)
    setError(null)
    setAnalysisResult(null)

    try {
      const text = await file.text()
      const results = await loadCSVAndAnalyze(text)
      setAnalysisResult(results)
      
      // Award points for using AI intelligence
      if (profile) {
        const currentPts = profile.participationPoints || 0
        await saveProfile({ participationPoints: currentPts + 50 })
      }
    } catch (err: unknown) {
      console.error('POSData Processing Error:', err)
      const msg = err instanceof Error ? err.message : 'Failed to parse CSV with DuckDB'
      setError(msg)
      throw err // Let components catch and handle toast notifications
    } finally {
      setIsProcessing(false)
    }
  }, [profile, saveProfile])

  const clearData = useCallback(() => {
    setAnalysisResult(null)
    setError(null)
  }, [])

  const contextValue = useMemo(() => ({
    analysisResult,
    isProcessing,
    error,
    processCSV,
    clearData,
  }), [analysisResult, isProcessing, error, processCSV, clearData])

  return (
    <POSDataContext.Provider value={contextValue}>
      {children}
    </POSDataContext.Provider>
  )
}

export function usePOSData() {
  const context = useContext(POSDataContext)
  if (!context) {
    throw new Error('usePOSData must be used within a POSDataProvider')
  }
  return context
}
