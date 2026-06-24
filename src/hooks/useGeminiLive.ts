import { useState, useRef, useCallback } from 'react'
import { useApiKeys } from './useApiKeys'

export type LiveFunctionCall = {
  name: string
  args: Record<string, unknown>
}

type UseGeminiLiveProps = {
  systemInstruction?: string
  tools?: Record<string, unknown>[]
  onFunctionCall?: (call: LiveFunctionCall) => void
  onTextDiff?: (text: string) => void
  onDisconnected?: () => void
}

export function useGeminiLive({ systemInstruction, tools, onFunctionCall, onTextDiff, onDisconnected }: UseGeminiLiveProps) {
  const [apiKeys] = useApiKeys()
  const [isLive, setIsLive] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  const wsRef = useRef<WebSocket | null>(null)
  const audioContextRef = useRef<AudioContext | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const processorRef = useRef<ScriptProcessorNode | null>(null)

  const stop = useCallback(() => {
    if (processorRef.current) {
      processorRef.current.disconnect()
      processorRef.current = null
    }
    if (audioContextRef.current) {
      audioContextRef.current.close()
      audioContextRef.current = null
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop())
      streamRef.current = null
    }
    if (wsRef.current) {
      wsRef.current.close()
      wsRef.current = null
    }
    setIsLive(false)
    onDisconnected?.()
  }, [onDisconnected])

  const start = useCallback(async () => {
    const key = apiKeys.gemini || import.meta.env.VITE_GEMINI_API_KEY
    
    if (!key) {
      setError('Gemini API key is required for Live Voice API.')
      return
    }

    try {
      setError(null)
      
      // 1. Initialize Audio
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      streamRef.current = stream
      
      const audioCtx = new AudioContext({ sampleRate: 16000 })
      audioContextRef.current = audioCtx
      
      const source = audioCtx.createMediaStreamSource(stream)
      // Deprecated but works everywhere without needing a separate worklet file
      const processor = audioCtx.createScriptProcessor(4096, 1, 1)
      processorRef.current = processor

      // 2. Initialize WebSocket
      const url = `wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1alpha.GenerativeService.BidiGenerateContent?key=${key}`
      const ws = new WebSocket(url)
      wsRef.current = ws

      ws.onopen = () => {
        setIsLive(true)
        // Send setup message
        const setupMessage = {
          setup: {
            model: 'models/gemini-2.0-flash-exp',
            systemInstruction: systemInstruction ? {
              parts: [{ text: systemInstruction }]
            } : undefined,
            tools: tools && tools.length > 0 ? [{ functionDeclarations: tools }] : undefined
          }
        }
        ws.send(JSON.stringify(setupMessage))
        
        // Send ClientContent initial (to say we are ready)
        ws.send(JSON.stringify({
          clientContent: {
            turns: [{ role: 'user', parts: [{ text: 'Hello, I am ready.' }] }],
            turnComplete: true
          }
        }))
      }

      ws.onmessage = (event) => {
        try {
          // BidiGenerateContent JSON API sends text or objects if negotiated text.
          // Wait, actually Gemini BidiGenerateContent expects binary JSON or text JSON?
          // It's text JSON if you don't specify blob format.
          const data = JSON.parse(event.data)
          
          if (data.serverContent?.modelTurn) {
            const parts = data.serverContent.modelTurn.parts
            for (const part of parts) {
              if (part.text && onTextDiff) {
                onTextDiff(part.text)
              }
              if (part.functionCall && onFunctionCall) {
                onFunctionCall({
                  name: part.functionCall.name,
                  args: part.functionCall.args
                })
                
                // Automatically send function response back
                if (ws.readyState === WebSocket.OPEN) {
                  ws.send(JSON.stringify({
                    clientContent: {
                      turnComplete: true,
                      turns: [{
                        role: 'user',
                        parts: [{
                          functionResponse: {
                            name: part.functionCall.name,
                            response: { result: 'success' }
                          }
                        }]
                      }]
                    }
                  }))
                }
              }
            }
          }
        } catch (e) {
          console.error('Failed to parse WS message', e)
        }
      }

      ws.onerror = (e) => {
        console.error('Gemini WS Error', e)
        setError('WebSocket Connection Error')
        stop()
      }

      ws.onclose = () => {
        stop()
      }

      // 3. Start Streaming Audio Data
      processor.onaudioprocess = (e) => {
        if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return
        
        const inputData = e.inputBuffer.getChannelData(0)
        // Convert Float32Array to Int16Array
        const pcmData = new Int16Array(inputData.length)
        for (let i = 0; i < inputData.length; i++) {
          const val = inputData[i] || 0
          const s = Math.max(-1, Math.min(1, val))
          pcmData[i] = s < 0 ? s * 0x8000 : s * 0x7FFF
        }
        
        // Convert Int16Array to Base64 (Chunked to prevent GC spikes and Call Stack limit)
        const uint8Array = new Uint8Array(pcmData.buffer)
        let binary = ''
        const CHUNK_SIZE = 4096;
        for (let i = 0; i < uint8Array.byteLength; i += CHUNK_SIZE) {
          const chunk = uint8Array.subarray(i, i + CHUNK_SIZE)
          binary += String.fromCharCode.apply(null, Array.from(chunk))
        }
        const base64Audio = btoa(binary)

        // Send RealtimeInput
        wsRef.current.send(JSON.stringify({
          realtimeInput: {
            mediaChunks: [{
              mimeType: 'audio/pcm;rate=16000',
              data: base64Audio
            }]
          }
        }))
      }

      // Connect the audio graph
      source.connect(processor)
      processor.connect(audioCtx.destination)

    } catch (e) {
      console.error('Failed to start Live API', e)
      setError(e instanceof Error ? e.message : 'Unknown error starting Live API')
      stop()
    }
  }, [apiKeys.gemini, onFunctionCall, onTextDiff, stop, systemInstruction, tools])

  return { isLive, error, start, stop }
}
