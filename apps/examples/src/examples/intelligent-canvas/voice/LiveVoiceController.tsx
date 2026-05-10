/**
 * LiveVoiceController — push-to-talk that uses browser WebSpeech for STT,
 * Gemini Live for spoken output, and the heavy canvas agent for canvas work.
 *
 * Hold "M" to talk. On release we get the final transcript and:
 *   1. Send it to Live → primer plays (~3-4s)
 *   2. Dispatch to the heavy canvas agent (in parallel)
 *   3. When the heavy agent returns, narrate(speech) — buffered until Live's
 *      primer finishes so we don't interrupt mid-sentence.
 */

import { useCallback, useEffect, useRef } from 'react'
import type { IntelligentCanvasAgent } from '../agent/IntelligentCanvasAgent'
import { GeminiLiveSession, type LiveStatus } from './GeminiLiveSession'

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

interface LiveVoiceControllerProps {
	agentRef: React.MutableRefObject<IntelligentCanvasAgent | null>
	disabled?: boolean
	onStatus?: (status: LiveStatus, message?: string) => void
	onRecordingChange?: (recording: boolean) => void
}

export function LiveVoiceController({
	agentRef,
	disabled,
	onStatus,
	onRecordingChange,
}: LiveVoiceControllerProps) {
	const sessionRef = useRef<GeminiLiveSession | null>(null)
	const recognitionRef = useRef<SpeechRecognitionInstance | null>(null)

	// Create the Live session once and warm up the WebSocket so the first
	// utterance doesn't pay the ~6s setup-handshake cost.
	useEffect(() => {
		const session = new GeminiLiveSession({
			onStatusChange: (status, message) => {
				onStatus?.(status, message)
			},
			onModelTranscript: (text) => console.log(`[Live] model said: ${text}`),
		})
		sessionRef.current = session
		// Best-effort eager connect — ignore failures, retry lazily on first use.
		session.connect().catch((err) => console.warn('[Live] eager connect failed', err))

		return () => {
			void session.close()
			sessionRef.current = null
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [])

	const handleTranscript = useCallback(
		async (text: string) => {
			const session = sessionRef.current
			const agent = agentRef.current
			if (!session || !agent) return

			console.log(`[Voice] transcript: "${text}"`)

			// In case the eager connect hasn't completed yet.
			await session.connect().catch(() => {})

			// 1. Live primer (text in → audio out)
			session.sendUserText(text)

			// 2. Heavy agent in parallel. We defer the camera tour so it fires
			// the moment Live actually starts speaking the depth answer — that
			// way the camera moves match the words, not the silent transition.
			const t0 = performance.now()
			void agent.handleVoiceCommand(text, {
				silent: true,
				deferCameraTour: true,
				onResult: (result) => {
					const elapsed = Math.round(performance.now() - t0)
					console.log(
						`[Heavy] finished in ${elapsed}ms, speech len=${result.speech.length}, items=${result.canvasItems.length}`
					)
					if (result.speech) {
						sessionRef.current?.narrate(result.speech, () => {
							// Narration audio just started — kick off camera tour.
							result.runCameraTour()
						})
					}
				},
			})
		},
		[agentRef]
	)

	const startRecognition = useCallback(() => {
		if (disabled) return
		if (!window.webkitSpeechRecognition) {
			console.warn('[Voice] webkitSpeechRecognition not supported in this browser')
			return
		}
		// If something's already listening, ignore — keypress repeat or jitter.
		if (recognitionRef.current) return

		const recognition = new window.webkitSpeechRecognition()
		recognition.continuous = false
		recognition.interimResults = false
		recognition.lang = 'en-US'

		recognition.onresult = (e) => {
			const transcript = e.results[0][0].transcript
			if (transcript.trim()) handleTranscript(transcript.trim())
		}
		recognition.onerror = () => {
			recognitionRef.current = null
			onRecordingChange?.(false)
		}
		recognition.onend = () => {
			recognitionRef.current = null
			onRecordingChange?.(false)
		}

		recognitionRef.current = recognition
		recognition.start()
		onRecordingChange?.(true)
	}, [disabled, handleTranscript, onRecordingChange])

	const stopRecognition = useCallback(() => {
		recognitionRef.current?.stop()
		// onend will null out the ref and fire onRecordingChange(false).
	}, [])

	useEffect(() => {
		const inEditableTarget = (el: EventTarget | null) => {
			const target = el as HTMLElement | null
			if (!target) return false
			return (
				target.tagName === 'INPUT' ||
				target.tagName === 'TEXTAREA' ||
				target.tagName === 'SELECT' ||
				target.isContentEditable
			)
		}
		const handleKeyDown = (e: KeyboardEvent) => {
			if (e.repeat) return
			if (e.key !== 'm' && e.key !== 'M') return
			if (inEditableTarget(e.target)) return
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
