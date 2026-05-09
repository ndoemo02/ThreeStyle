import { useState, useEffect, useCallback, useRef } from 'react'

interface UseSpeechProps {
    onTranscript: (transcript: string) => void
    language?: string
}

// Web Speech API nie jest w standardowych typach TS — definiujemy interfejs
type SpeechRecognitionType = typeof window extends { SpeechRecognition: infer T } ? T : never

export function useSpeech({ onTranscript, language = 'pl-PL' }: UseSpeechProps) {
    const [isListening, setIsListening] = useState(false)
    const [transcript, setTranscript] = useState('')
    const [error, setError] = useState<string | null>(null)

    // SpeechRecognition to obiekt imperatywny — ref zamiast state (nie wywołuje re-renderów)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const recognitionRef = useRef<any>(null)
    const onTranscriptRef = useRef(onTranscript)
    onTranscriptRef.current = onTranscript

    useEffect(() => {
        if (typeof window === 'undefined') return

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const SpeechRecognitionAPI = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition

        if (!SpeechRecognitionAPI) {
            setError("Twoja przeglądarka nie obsługuje Web Speech API. Użyj Chrome.")
            return
        }

        const rec = new SpeechRecognitionAPI()
        rec.continuous = true
        rec.interimResults = true
        rec.lang = language

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        rec.onresult = (event: any) => {
            let currentTranscript = ''
            for (let i = event.resultIndex; i < event.results.length; ++i) {
                if (event.results[i].isFinal) {
                    currentTranscript += event.results[i][0].transcript
                }
            }
            if (currentTranscript.trim()) {
                setTranscript(currentTranscript)
                onTranscriptRef.current(currentTranscript)
            }
        }

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        rec.onerror = (event: any) => {
            if (event.error !== 'no-speech' && event.error !== 'network') {
                console.error('Speech recognition error', event.error)
            }
            if (event.error === 'network') {
                setError('Brak HTTPS / Sieć.')
                setIsListening(false)
            }
            else if (event.error !== 'no-speech') {
                setError(event.error)
                setIsListening(false)
            }
        }

        rec.onend = () => {
            setIsListening(false)
        }

        recognitionRef.current = rec

        return () => {
            rec.stop()
        }
    }, [language])

    const startListening = useCallback(() => {
        setError(null)
        setTranscript('')
        const rec = recognitionRef.current
        if (rec) {
            try {
                rec.start()
                setIsListening(true)
            } catch (e) {
                console.error(e)
            }
        }
    }, [])

    const stopListening = useCallback(() => {
        const rec = recognitionRef.current
        if (rec) {
            rec.stop()
            setIsListening(false)
        }
    }, [])

    const toggleListening = useCallback(() => {
        if (isListening) stopListening()
        else startListening()
    }, [isListening, startListening, stopListening])

    return {
        isListening,
        transcript,
        error,
        startListening,
        stopListening,
        toggleListening
    }
}
