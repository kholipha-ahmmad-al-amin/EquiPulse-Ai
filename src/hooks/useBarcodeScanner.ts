import { useEffect, useRef } from 'react'

type UseBarcodeScannerOptions = {
  onScan: (barcode: string) => void
  threshold?: number // ms to wait before considering it a manual typing vs a scanner
}

export function useBarcodeScanner({ onScan, threshold = 50 }: UseBarcodeScannerOptions) {
  const keysRef = useRef<string>('')
  const lastKeyTimeRef = useRef<number>(0)

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if typing in an input field (unless we want to capture it anyway, but usually input fields handle their own)
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      ) {
        // If the user happens to have the search input focused, the scanner will just type into the search bar.
        // We'll let the search bar handle 'Enter' if needed, or we can intercept.
        // Let's NOT intercept if they are actively typing.
        return
      }

      const now = Date.now()
      if (now - lastKeyTimeRef.current > threshold) {
        // Too slow, probably manual typing. Reset buffer.
        keysRef.current = ''
      }

      lastKeyTimeRef.current = now

      if (e.key === 'Enter') {
        if (keysRef.current.length > 2) { // Barcodes are usually long
          onScan(keysRef.current)
          e.preventDefault()
        }
        keysRef.current = ''
      } else if (e.key.length === 1) { // Only single characters
        keysRef.current += e.key
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [onScan, threshold])
}
