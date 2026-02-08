import { useCallback, useEffect, useRef, useState } from 'react'

interface SpeechRecognitionEvent {
	results: { [index: number]: { [index: number]: { transcript: string } } }
}

interface SpeechRecognitionInstance {
	continuous: boolean
	interimResults: boolean
	lang: string
	start(): void
	stop(): void
	onresult: ((e: SpeechRecognitionEvent) => void) | null
	onerror: (() => void) | null
	onend: (() => void) | null
}

declare global {
	interface Window {
		webkitSpeechRecognition: new () => SpeechRecognitionInstance
	}
}

interface MicrophoneButtonProps {
	onTranscript: (text: string) => void
	disabled: boolean
	onRecordingChange: (recording: boolean) => void
}

export function MicrophoneButton({
	onTranscript,
	disabled,
	onRecordingChange,
}: MicrophoneButtonProps) {
	const [, setRecording] = useState(false)
	const recognitionRef = useRef<SpeechRecognitionInstance | null>(null)

	const stopRecognition = useCallback(() => {
		if (recognitionRef.current) {
			recognitionRef.current.stop()
			recognitionRef.current = null
		}
		setRecording(false)
		onRecordingChange(false)
	}, [onRecordingChange])

	const startRecognition = useCallback(() => {
		if (disabled) return
		if (!window.webkitSpeechRecognition) {
			console.warn('Speech recognition not supported in this browser')
			return
		}

		const recognition = new window.webkitSpeechRecognition()
		recognition.continuous = false
		recognition.interimResults = false
		recognition.lang = 'en-US'

		recognition.onresult = (e: SpeechRecognitionEvent) => {
			const transcript = e.results[0][0].transcript
			if (transcript.trim()) {
				onTranscript(transcript.trim())
			}
		}

		recognition.onerror = () => {
			setRecording(false)
			onRecordingChange(false)
			recognitionRef.current = null
		}

		recognition.onend = () => {
			setRecording(false)
			onRecordingChange(false)
			recognitionRef.current = null
		}

		recognitionRef.current = recognition
		recognition.start()
		setRecording(true)
		onRecordingChange(true)
	}, [disabled, onTranscript, onRecordingChange])

	useEffect(() => {
		const handleKeyDown = (e: KeyboardEvent) => {
			if (e.repeat) return
			if (e.key !== 'm' && e.key !== 'M') return
			const target = e.target as HTMLElement
			if (
				target.tagName === 'INPUT' ||
				target.tagName === 'TEXTAREA' ||
				target.tagName === 'SELECT' ||
				target.isContentEditable
			) {
				return
			}
			e.preventDefault()
			startRecognition()
		}
		const handleKeyUp = (e: KeyboardEvent) => {
			if (e.key !== 'm' && e.key !== 'M') return
			stopRecognition()
		}
		window.addEventListener('keydown', handleKeyDown)
		window.addEventListener('keyup', handleKeyUp)
		return () => {
			window.removeEventListener('keydown', handleKeyDown)
			window.removeEventListener('keyup', handleKeyUp)
		}
	}, [startRecognition, stopRecognition])

	return null
}
