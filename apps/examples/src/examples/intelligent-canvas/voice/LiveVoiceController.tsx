/**
 * LiveVoiceController — owns the GeminiLiveSession lifecycle and wires it
 * to the heavyweight canvas agent.
 *
 * Push-to-talk: hold "M" to stream mic audio. Release to flush.
 * The Live model talks back with low latency. Canvas-touching requests
 * are handed off via the `delegate_to_canvas` tool call, which calls
 * agent.handleVoiceCommand(intent, { silent: true }) — the heavy agent
 * places shapes but does NOT speak (Live is doing the talking).
 */

import { useCallback, useEffect, useRef } from 'react'
import type { IntelligentCanvasAgent } from '../agent/IntelligentCanvasAgent'
import { GeminiLiveSession, type LiveStatus } from './GeminiLiveSession'

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
	// Tracks whether the user is currently holding M. The connect+setup
	// handshake can take several seconds on first use, and we don't want
	// the mic to start streaming AFTER the user has already released.
	const wantsRecordingRef = useRef(false)

	// One-time session creation. We keep the WebSocket open across utterances
	// so the model has running conversation state.
	useEffect(() => {
		const session = new GeminiLiveSession({
			onStatusChange: (status, message) => {
				onStatus?.(status, message)
			},
			onDelegate: async (intent) => {
				const agent = agentRef.current
				if (!agent) {
					console.warn('[Live] delegate called but no agent mounted')
					return
				}
				const t0 = performance.now()
				console.log(`[Live] delegating to heavy agent: "${intent}"`)
				await agent.handleVoiceCommand(intent, {
					silent: true,
					onResult: (result) => {
						const elapsed = Math.round(performance.now() - t0)
						console.log(
							`[Live] heavy agent finished in ${elapsed}ms, speech len=${result.speech.length}, items=${result.canvasItems.length}`
						)
						if (result.speech) {
							sessionRef.current?.narrate(result.speech)
						}
					},
				})
			},
			onUserTranscript: (text) => console.log(`[Live] user said: ${text}`),
			onModelTranscript: (text) => console.log(`[Live] model said: ${text}`),
			onEvent: (_event, _data) => {
				// onEvent already logs via console.log inside the session;
				// hook stays here so we can fan it out somewhere later.
			},
		})
		sessionRef.current = session

		return () => {
			void session.close()
			sessionRef.current = null
		}
		// agentRef is a stable ref; onStatus/onRecordingChange are recreated
		// every render but we capture them via ref-style closure. Run once.
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [])

	const startTalking = useCallback(async () => {
		if (disabled) return
		const session = sessionRef.current
		if (!session) return
		wantsRecordingRef.current = true
		// Flip the indicator IMMEDIATELY so the user sees feedback even while
		// the WebSocket / mic permission is still resolving.
		onRecordingChange?.(true)
		try {
			await session.connect()
			// User may have released M during the connect handshake (which
			// can take several seconds the first time). Abort if so.
			if (!wantsRecordingRef.current) return
			await session.startMic()
			// And again after mic startup, in case getUserMedia took a moment.
			if (!wantsRecordingRef.current) {
				session.stopMic()
			}
		} catch (err) {
			console.error('[Live] failed to start mic:', err)
			onRecordingChange?.(false)
		}
	}, [disabled, onRecordingChange])

	const stopTalking = useCallback(() => {
		wantsRecordingRef.current = false
		onRecordingChange?.(false)
		const session = sessionRef.current
		if (!session) return
		session.stopMic()
	}, [onRecordingChange])

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
			void startTalking()
		}
		const handleKeyUp = (e: KeyboardEvent) => {
			if (e.key !== 'm' && e.key !== 'M') return
			stopTalking()
		}

		window.addEventListener('keydown', handleKeyDown)
		window.addEventListener('keyup', handleKeyUp)
		return () => {
			window.removeEventListener('keydown', handleKeyDown)
			window.removeEventListener('keyup', handleKeyUp)
		}
	}, [startTalking, stopTalking])

	return null
}
