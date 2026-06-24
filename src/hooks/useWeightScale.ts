import { useState, useCallback, useRef, useEffect } from 'react'
import { useToast } from '../components/ToastProvider'

export function useWeightScale() {
  const [isConnected, setIsConnected] = useState(false)
  const [weight, setWeight] = useState<number>(0)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const portRef = useRef<any | null>(null)
  const readerRef = useRef<ReadableStreamDefaultReader | null>(null)
  const toast = useToast()

  const disconnect = useCallback(async () => {
    if (readerRef.current) {
      await readerRef.current.cancel().catch(() => {})
      readerRef.current = null
    }
    if (portRef.current) {
      await portRef.current.close().catch(() => {})
      portRef.current = null
    }
    setIsConnected(false)
    setWeight(0)
  }, [])

  const connect = useCallback(async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    if (!('serial' in navigator) || !(navigator as any).serial) {
      toast('Not Supported', 'Web Serial API is not supported in this browser.', 'error')
      return
    }

    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const port = await (navigator as any).serial.requestPort()
      await port.open({ baudRate: 9600 })
      portRef.current = port
      setIsConnected(true)
      toast('Scale Connected', 'Hardware weight scale connected successfully.', 'success')

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const textDecoder = new (window as any).TextDecoderStream()
      port.readable?.pipeTo(textDecoder.writable)
      const reader = textDecoder.readable.getReader()
      readerRef.current = reader

      let buffer = ''
      while (true) {
        const { value, done } = await reader.read()
        if (done) break
        
        buffer += value
        const lines = buffer.split(/[\r\n]+/)
        if (lines.length > 1) {
          const secondToLast = lines[lines.length - 2]
          if (secondToLast) {
            const latestCompleteLine = secondToLast.trim()
            buffer = lines[lines.length - 1] || ''
            
            // Parse weight: common formats e.g. "  1.235 kg", "ST,NT,+   1.235 kg"
            const match = latestCompleteLine.match(/[\d.]+/)
            if (match && match[0]) {
              const parsedWeight = parseFloat(match[0])
              if (!isNaN(parsedWeight)) {
                setWeight(parsedWeight)
              }
            }
          }
        }
      }
    } catch (err: unknown) {
      console.error('Scale error:', err)
      if (err instanceof Error && err.name !== 'NotFoundError') {
        toast('Connection Error', 'Could not connect to the scale.', 'error')
      }
      void disconnect()
    }
  }, [toast, disconnect])

  useEffect(() => {
    return () => {
      void disconnect()
    }
  }, [disconnect])

  return { connect, disconnect, isConnected, weight }
}
