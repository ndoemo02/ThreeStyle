import { useState, useEffect, useCallback, useRef } from 'react'

interface UseSpeechProps {
    onTranscript: (transcript: string) => void
    language?: string
}

export function useSpeech({ onTranscript, language = 'pl-PL' }: UseSpeechProps) {
    const [isListening, setIsListening] = useState(false)
    const [transcript, setTranscript] = useState('')
    const [error, setError] = useState<string | null>(null)

    // Definiujemy instancję recognition w ref albo state (tu użyjemy zewnętrznej by przetrwała re-rendery)
    const [recognition, setRecognition] = useState<any>(null)

    const onTranscriptRef = useRef(onTranscript)
    onTranscriptRef.current = onTranscript

    useEffect(() => {
        if (typeof window === 'undefined') return

        const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
        if (!SpeechRecognition) {
            setError("Twoja przeglądarka nie obsługuje Web Speech API. Użyj Chrome.")
            return
        }

        const rec = new SpeechRecognition()
        rec.continuous = true
        rec.interimResults = true
        rec.lang = language

        rec.onresult = (event: any) => {
            let currentTranscript = ''
            for (let i = event.resultIndex; i < event.results.length; ++i) {
                if (event.results[i].isFinal) {
                    currentTranscript += event.results[i][0].transcript
                }
            }
            if (currentTranscript.trim()) {
                setTranscript(currentTranscript)
                onTranscriptRef.current(currentTranscript) // Wyślij finalny fragment do rodzica
            }
        }

        rec.onerror = (event: any) => {
            console.error('Speech recognition error', event.error)
            if (event.error !== 'no-speech') {
                setError(event.error)
                setIsListening(false)
            }
        }

        rec.onend = () => {
            setIsListening(false)
        }

        setRecognition(rec)

        return () => {
            rec.stop()
        }
    }, [language]) // Removed onTranscript from dependencies

    const startListening = useCallback(() => {
        setError(null)
        setTranscript('')
        if (recognition) {
            try {
                recognition.start()
                setIsListening(true)
            } catch (e) {
                console.error(e)
            }
        }
    }, [recognition])

    const stopListening = useCallback(() => {
        if (recognition) {
            recognition.stop()
            setIsListening(false)
        }
    }, [recognition])

    const toggleListening = () => {
        if (isListening) stopListening()
        else startListening()
    }

    return {
        isListening,
        transcript,
        error,
        startListening,
        stopListening,
        toggleListening
    }
}
