import { useState, useCallback } from 'react'
import { useInventory, type InventoryItem } from './useInventory'
import { useToast } from '../components/ToastProvider'

export function useVoiceCommand(onMatch: (item: InventoryItem, qty: number) => void) {
  const [isListening, setIsListening] = useState(false)
  const { items } = useInventory()
  const toast = useToast()

  const startListening = useCallback(() => {
    type SR = new () => {
      continuous: boolean
      interimResults: boolean
      lang: string
      onstart: (() => void) | null
      onresult: ((event: { results: { transcript: string }[][] }) => void) | null
      onerror: ((event: { error: string }) => void) | null
      onend: (() => void) | null
      start(): void
      stop(): void
    }
    const w = window as Window & {
      SpeechRecognition?: SR
      webkitSpeechRecognition?: SR
    }
    const SpeechRecognition = w.SpeechRecognition ?? w.webkitSpeechRecognition
    if (!SpeechRecognition) {
      toast('Error', 'Voice recognition is not supported in your browser.', 'error')
      return
    }

    const recognition = new SpeechRecognition()
    recognition.continuous = false
    recognition.interimResults = false
    recognition.lang = 'en-US'

    recognition.onstart = () => {
      setIsListening(true)
      toast('Listening...', 'Speak the item name or quantity. (e.g. "Add two coffee")', 'success')
    }

    recognition.onresult = (event) => {
      const firstResult = event.results?.[0]?.[0]
      if (!firstResult) return
      const transcript = firstResult.transcript.toLowerCase()

      let found = false
      items.forEach(item => {
        if (transcript.includes(item.name.toLowerCase())) {
          // Attempt to parse number
          const numMatch = transcript.match(/\b(two|three|four|five|six|seven|eight|nine|ten|\d+)\b/)
          let qty = 1
          if (numMatch && numMatch[1] !== undefined) {
            const map: Record<string, number> = { two:2, three:3, four:4, five:5, six:6, seven:7, eight:8, nine:9, ten:10 }
            const word = numMatch[1]
            qty = map[word] ?? parseInt(word, 10) ?? 1
          }

          onMatch(item, qty)
          found = true
        }
      })
      if (!found) {
        toast('Voice Command', `No matching item found for "${transcript}"`, 'error')
      }
    }

    recognition.onerror = (event) => {
      console.error(event.error)
      setIsListening(false)
    }

    recognition.onend = () => {
      setIsListening(false)
    }

    recognition.start()
  }, [items, toast, onMatch])

  return {
    isListening,
    startListening
  }
}
