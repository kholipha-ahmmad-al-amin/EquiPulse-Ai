import { useState, useEffect } from 'react'
import { generateAiContent } from '../utils/aiClient'
import { useApiKeys } from '../hooks/useApiKeys'
import { useToast } from './ToastProvider'
import { useI18n } from '../i18n'
import { useStoreProfile } from '../hooks/useStoreProfile'

export function OcrUploader({ onParseComplete }: { onParseComplete?: (data: unknown) => void }) {
  const [isParsing, setIsParsing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loadingStep, setLoadingStep] = useState(0)
  const [apiKeys] = useApiKeys()
  const toast = useToast()
  const { t } = useI18n()
  const { profile, saveProfile } = useStoreProfile()
  
  const loadingStates = [
    t(`Initializing neural networks...`),
    t(`Scanning document for text...`),
    t(`Translating Bengali context...`),
    t(`Extracting prices & quantities...`),
    t(`Verifying totals via AI...`)
  ]

  useEffect(() => {
    if (isParsing) {
      setLoadingStep(0)
      const interval = setInterval(() => {
        setLoadingStep(prev => Math.min(prev + 1, loadingStates.length - 1))
      }, 1200)
      return () => clearInterval(interval)
    }
  }, [isParsing, loadingStates.length])

  const processFile = async (fileOrBlob: Blob, mimeType: string) => {
    setError(null)
    setIsParsing(true)

    try {
      // Convert file to base64
      const buffer = await fileOrBlob.arrayBuffer()
      const base64Data = btoa(
        new Uint8Array(buffer).reduce((data, byte) => data + String.fromCharCode(byte), '')
      )

      const text = await generateAiContent({
        apiKeys,
        model: 'gemini-1.5-flash',
        parts: [
          {
            inlineData: {
              data: base64Data,
              mimeType,
            },
          },
          {
            text: `
              You are an expert OCR and financial data extractor working for a Bangladeshi SME ERP system. You are analyzing an image of a receipt, cash memo, or invoice. It may be crumpled, handwritten (very common in Bangladesh), or taken in low light. It may contain English, Bengali (Bangla), or a mix of both.
              
              CRITICAL RULES FOR BENGALI HANDWRITING:
              - Translate ALL Bengali numerals (০, ১, ২, ৩, ৪, ৫, ৬, ৭, ৮, ৯) into standard English numbers (0-9) for price, quantity, and total.
              - If the product name is in Bengali, keep it in Bengali.
              - Often, "Rate" and "Amount" are written loosely. Deduce price per unit if necessary.
              
              Follow these strict rules:
              1. Extract all line items (product, price, quantity, total).
              2. Sum the individual 'total' values of all line items to calculate an 'expected_total'.
              3. Extract the 'actual_total' stated at the bottom of the receipt.
              4. If expected_total !== actual_total, or if the image quality is so poor that numbers are ambiguous, set 'ocr_warning' to a string explaining the discrepancy in Bengali. Otherwise, set it to null.
              
              Return ONLY a raw JSON object with this exact structure:
              {
                "line_items": [
                  { "product": "Item Name", "price": 100, "quantity": 2, "total": 200 }
                ],
                "expected_total": 200,
                "actual_total": 200,
                "ocr_warning": null
              }
              Do not wrap the JSON in markdown blocks like \`\`\`json.
            `,
          },
        ]
      })
      if (text) {
        const cleanedText = text.replace(/```json/g, '').replace(/```/g, '').trim()
        const parsedJson = JSON.parse(cleanedText)
        console.log('OCR Parsed JSON:', parsedJson)
        
        if (parsedJson.ocr_warning) {
          toast('OCR Discrepancy', parsedJson.ocr_warning, 'warning')
        } else {
          toast('OCR Successful', 'Document parsed seamlessly.', 'success')
          if (profile) {
            const currentPts = profile.participationPoints || 0
            await saveProfile({ participationPoints: currentPts + 50 })
          }
        }
        
        window.dispatchEvent(new CustomEvent('equipulse-tour-action', { detail: { action: 'ocr-completed' } }))
        onParseComplete?.(parsedJson)
      } else {
        throw new Error('No response returned from the parser')
      }
    } catch (err: unknown) {
      console.error('OCR Parsing failed', err)
      const msg = err instanceof Error ? err.message : 'Failed to parse document'
      setError(msg)
      toast('OCR Failed', msg, 'error')
    } finally {
      setIsParsing(false)
    }
  }

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return
    await processFile(file, file.type)
  }



  return (
    <div className="rounded-xl border border-line bg-surface p-4 flex flex-col gap-4">

      <label className="flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-accent/30 bg-surface-strong/50 py-10 transition hover:bg-accent/5 hover:border-accent group">
        <span className="text-sm font-bold text-ink-soft group-hover:text-accent">
          {isParsing 
            ? (t(`Parsing receipt with smart OCR...`)) 
            : (t(`Drop memo image or click to upload (Image/PDF)`))}
        </span>
        <input
          accept="image/*,application/pdf"
          className="hidden"
          disabled={isParsing}
          type="file"
          onChange={(e) => void handleFileChange(e)}
        />
      </label>

      {isParsing && (
        <div className="mt-4 flex flex-col items-center justify-center space-y-4 rounded-xl border border-accent/30 bg-surface-strong/40 p-6 shadow-inner relative overflow-hidden">
          <div className="absolute inset-0 bg-accent/5 blur-xl animate-pulse"></div>
          <div className="relative z-10 flex flex-col items-center text-center">
            <div className="mb-4 relative">
              <div className="h-10 w-10 rounded-full border-2 border-accent/20 border-t-accent animate-spin"></div>
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="h-4 w-4 rounded-full bg-accent/30 animate-ping"></div>
              </div>
            </div>
            <h4 className="font-heading text-lg font-black text-accent mb-1">{t(`Neural Vision Engine Active`)}</h4>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-ink-soft uppercase tracking-widest">{t(`Stage`)} {loadingStep + 1}/{loadingStates.length}:</span>
              <span className="text-sm font-black text-ink animate-pulse">{loadingStates[loadingStep]}</span>
            </div>
            
            <div className="w-full max-w-xs mt-4">
              <div className="h-1.5 w-full bg-line/30 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-accent transition-all duration-500 ease-out"
                  style={{ width: `${((loadingStep + 1) / loadingStates.length) * 100}%` }}
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {error && <p className="mt-2 text-xs text-danger font-semibold">{error}</p>}
    </div>
  )
}

