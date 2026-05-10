/**
 * Gemini Live API session — text-in, audio-out.
 *
 * The user's words come from browser WebSpeech (in LiveVoiceController);
 * we only push text turns into Live and receive PCM audio back. No mic
 * streaming, no tool calling, no `realtimeInput`. Much simpler.
 *
 * Two text-input methods:
 *   - sendUserText(text)   — start a fresh user turn (the primer)
 *   - narrate(text)        — push the heavy agent's depth answer in. If
 *                             Live is still mid-primer, this is BUFFERED
 *                             until turnComplete so we don't interrupt.
 */

import { base64ToBytes, int16ToFloat32 } from './audio-utils'
import {
	GEMINI_LIVE_MODEL,
	GEMINI_LIVE_VOICE,
	LIVE_OUTPUT_SAMPLE_RATE,
	LIVE_SYSTEM_PROMPT,
} from './live-config'

export type LiveStatus = 'idle' | 'connecting' | 'ready' | 'speaking' | 'error'

export interface LiveSessionCallbacks {
	onStatusChange: (status: LiveStatus, message?: string) => void
	/** Best-effort transcript of what the model said this turn. */
	onModelTranscript?: (text: string) => void
	/** Generic structured event log — used for latency measurement. */
	onEvent?: (event: string, data?: Record<string, unknown>) => void
}

interface ServerMessage {
	setupComplete?: object
	serverContent?: {
		modelTurn?: { parts?: { inlineData?: { mimeType: string; data: string }; text?: string }[] }
		turnComplete?: boolean
		generationComplete?: boolean
		interrupted?: boolean
		outputTranscription?: { text: string }
	}
	goAway?: { timeLeft: string }
}

export class GeminiLiveSession {
	private ws: WebSocket | null = null
	private callbacks: LiveSessionCallbacks
	private setupReady = false
	private pendingOutbound: string[] = []

	// audio playback
	private outputCtx: AudioContext | null = null
	private playbackHead = 0
	private activeSources: AudioBufferSourceNode[] = []

	// running model transcript within a turn
	private currentModelTranscript = ''

	// Turn buffering. Tracks whether the model is currently producing or
	// is about to produce audio — we use this to defer narrate() calls so
	// the heavy agent's depth answer doesn't interrupt the primer mid-sentence.
	private modelTurnActive = false
	private awaitingResponse = false
	private pendingNarration: string | null = null
	private pendingNarrationOnPlayStart: (() => void) | null = null
	private pendingNarrationTimeout: ReturnType<typeof setTimeout> | null = null
	// When true, the next audio chunk we receive belongs to a freshly-
	// dispatched narration turn — we use it to fire `onPlayStart` callbacks
	// the instant the model starts speaking the depth answer.
	private narrationStartArmed = false
	private narrationStartCallback: (() => void) | null = null
	/** Hard cap on how long we wait for Live's turn to complete before
	 * force-flushing a queued narration. */
	private static readonly MAX_NARRATION_BUFFER_MS = 8000

	constructor(callbacks: LiveSessionCallbacks) {
		this.callbacks = callbacks
	}

	private setStatus(status: LiveStatus, message?: string) {
		this.callbacks.onStatusChange(status, message)
	}

	private logEvent(event: string, data?: Record<string, unknown>) {
		const stamped = { t: performance.now(), ...data }
		this.callbacks.onEvent?.(event, stamped)
		// eslint-disable-next-line no-console
		console.log(`[Live] ${event}`, stamped)
	}

	/** Open the WebSocket and run the setup handshake. */
	async connect(): Promise<void> {
		if (this.ws) return
		this.setStatus('connecting', 'Opening voice channel...')
		this.logEvent('ws-connect-start')

		const wsUrl = this.buildWsUrl()
		const ws = new WebSocket(wsUrl)
		ws.binaryType = 'arraybuffer'
		this.ws = ws

		await new Promise<void>((resolve, reject) => {
			ws.addEventListener('open', () => {
				this.logEvent('ws-open')
				ws.send(
					JSON.stringify({
						setup: {
							model: GEMINI_LIVE_MODEL,
							generationConfig: {
								responseModalities: ['AUDIO'],
								speechConfig: {
									voiceConfig: { prebuiltVoiceConfig: { voiceName: GEMINI_LIVE_VOICE } },
									languageCode: 'en-US',
								},
							},
							systemInstruction: { parts: [{ text: LIVE_SYSTEM_PROMPT }] },
							outputAudioTranscription: {},
						},
					})
				)
				resolve()
			})
			ws.addEventListener('error', (e) => {
				this.logEvent('ws-error', { error: String(e) })
				reject(new Error('Live WebSocket error'))
			})
		})

		ws.addEventListener('message', (e) => this.handleServerMessage(e.data))
		ws.addEventListener('close', (e) => {
			const wasReady = this.setupReady
			console.warn(
				`[Live] ws-close code=${e.code} wasClean=${e.wasClean} setupReady=${wasReady} reason="${e.reason}"`
			)
			this.logEvent('ws-close', { code: e.code, reason: e.reason, wasReady })
			this.setStatus('error', e.reason || 'Live channel closed')
			this.ws = null
			this.setupReady = false
		})
	}

	private buildWsUrl(): string {
		const proto = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
		return `${proto}//${window.location.host}/api/gemini/live`
	}

	/**
	 * Push a user text turn into the session. Live will respond with audio
	 * (the primer). Use this when WebSpeech gives us a final transcript.
	 */
	sendUserText(text: string): void {
		if (!text.trim()) return
		console.log(`[Live] sendUserText: "${text}"`)
		this.sendJson({
			clientContent: {
				turns: [{ role: 'user', parts: [{ text }] }],
				turnComplete: true,
			},
		})
		// We've opened a turn; block any narration buffering until Live's
		// response completes.
		this.modelTurnActive = true
		this.awaitingResponse = true
	}

	/**
	 * Hand the canvas agent's depth answer to Live. Buffered if the model
	 * is currently mid-turn — the queued narration fires automatically on
	 * the next turnComplete (with a safety force-flush after a few seconds
	 * if turnComplete never arrives).
	 *
	 * @param onPlayStart - fires the instant the first audio chunk for this
	 *   narration arrives (= the model started speaking the depth answer).
	 *   Use this to sync canvas animations to the actual voice timing.
	 */
	narrate(text: string, onPlayStart?: () => void): void {
		if (!text.trim()) return
		if (this.modelTurnActive || this.awaitingResponse) {
			console.log(
				`[Live] narrate queued (modelTurnActive=${this.modelTurnActive} awaitingResponse=${this.awaitingResponse})`
			)
			this.pendingNarration = text
			this.pendingNarrationOnPlayStart = onPlayStart ?? null
			if (this.pendingNarrationTimeout) clearTimeout(this.pendingNarrationTimeout)
			this.pendingNarrationTimeout = setTimeout(() => {
				if (this.pendingNarration) {
					console.warn(
						`[Live] narrate force-flushing after ${GeminiLiveSession.MAX_NARRATION_BUFFER_MS}ms — turnComplete never arrived`
					)
					const t = this.pendingNarration
					const cb = this.pendingNarrationOnPlayStart
					this.pendingNarration = null
					this.pendingNarrationOnPlayStart = null
					this.pendingNarrationTimeout = null
					this.modelTurnActive = false
					this.awaitingResponse = false
					this.dispatchNarration(t, cb ?? undefined)
				}
			}, GeminiLiveSession.MAX_NARRATION_BUFFER_MS)
			return
		}
		this.dispatchNarration(text, onPlayStart)
	}

	private dispatchNarration(text: string, onPlayStart?: () => void): void {
		console.log(`[Live] narrate dispatch: "${text.slice(0, 80)}..."`)
		this.sendJson({
			clientContent: {
				turns: [
					{
						role: 'user',
						parts: [
							{
								text: `[canvas_agent_finished] The canvas agent is done. Smoothly continue from whatever you just said into reading this final answer aloud — do not say "alright" or "so" or any reset filler, just glide into the content as if it's the next paragraph of what you were already saying. Read it naturally, in your voice, do not paraphrase or add commentary:\n\n"${text}"`,
							},
						],
					},
				],
				turnComplete: true,
			},
		})
		this.modelTurnActive = true
		this.awaitingResponse = true
		// Arm the play-start callback to fire on the next incoming audio chunk.
		this.narrationStartArmed = true
		this.narrationStartCallback = onPlayStart ?? null
	}

	/** Tear down everything. */
	async close(): Promise<void> {
		this.stopAllPlayback()
		this.outputCtx?.close().catch(() => {})
		this.outputCtx = null
		if (this.pendingNarrationTimeout) {
			clearTimeout(this.pendingNarrationTimeout)
			this.pendingNarrationTimeout = null
		}
		if (this.ws && this.ws.readyState === WebSocket.OPEN) this.ws.close()
		this.ws = null
		this.setupReady = false
		this.setStatus('idle')
	}

	private sendJson(obj: unknown) {
		const text = JSON.stringify(obj)
		if (this.ws && this.ws.readyState === WebSocket.OPEN && this.setupReady) {
			this.ws.send(text)
		} else {
			this.pendingOutbound.push(text)
		}
	}

	private handleServerMessage(raw: string | ArrayBuffer | Blob) {
		const handle = (text: string) => {
			let msg: ServerMessage
			try {
				msg = JSON.parse(text) as ServerMessage
			} catch {
				return
			}
			this.processMessage(msg)
		}
		if (typeof raw === 'string') {
			handle(raw)
		} else if (raw instanceof ArrayBuffer) {
			handle(new TextDecoder().decode(raw))
		} else if (raw instanceof Blob) {
			raw
				.text()
				.then(handle)
				.catch(() => {})
		}
	}

	private processMessage(msg: ServerMessage) {
		// Compact echo for debugging — strip audio payloads so the log is readable.
		try {
			const sanitized = JSON.parse(JSON.stringify(msg)) as ServerMessage
			const parts = sanitized.serverContent?.modelTurn?.parts
			if (parts) {
				for (const p of parts) {
					if (p.inlineData?.data) p.inlineData.data = `<${p.inlineData.data.length}b base64>`
				}
			}
			console.log('[Live] msg:', sanitized)
		} catch {}

		if (msg.setupComplete) {
			this.setupReady = true
			this.logEvent('setup-complete')
			this.setStatus('ready')
			while (this.pendingOutbound.length > 0) {
				this.ws?.send(this.pendingOutbound.shift()!)
			}
			return
		}

		if (msg.serverContent) {
			const sc = msg.serverContent
			const parts = sc.modelTurn?.parts ?? []
			for (const part of parts) {
				if (part.inlineData?.mimeType?.startsWith('audio/pcm')) {
					this.modelTurnActive = true
					this.handleAudioOut(part.inlineData.data)
				}
				if (part.text) {
					this.modelTurnActive = true
					this.currentModelTranscript += part.text
				}
			}
			if (sc.outputTranscription?.text) {
				this.currentModelTranscript += sc.outputTranscription.text
			}
			if (sc.interrupted) {
				// In this text-in/audio-out setup, "interrupted" only fires
				// when we ourselves send a new clientContent (the queued
				// narration). We DON'T want to kill the primer's tail audio
				// in that case — let it play out naturally so the depth
				// audio queues seamlessly onto playbackHead. Just log it.
				this.logEvent('interrupted (ignored — text-only mode)')
			}

			if (sc.turnComplete || sc.generationComplete) {
				this.logEvent('turn-complete', { model: this.currentModelTranscript })
				if (this.currentModelTranscript) {
					this.callbacks.onModelTranscript?.(this.currentModelTranscript)
				}
				this.currentModelTranscript = ''

				// Model turn finished — flush any queued narration.
				this.modelTurnActive = false
				this.awaitingResponse = false
				if (this.pendingNarrationTimeout) {
					clearTimeout(this.pendingNarrationTimeout)
					this.pendingNarrationTimeout = null
				}
				if (this.pendingNarration) {
					console.log(`[Live] turnComplete → flushing queued narration`)
					const text = this.pendingNarration
					const cb = this.pendingNarrationOnPlayStart
					this.pendingNarration = null
					this.pendingNarrationOnPlayStart = null
					setTimeout(() => this.dispatchNarration(text, cb ?? undefined), 150)
				}
			}
		}

		if (msg.goAway) {
			this.logEvent('go-away', { timeLeft: msg.goAway.timeLeft })
		}
	}

	private handleAudioOut(b64: string) {
		this.setStatus('speaking', 'Speaking...')
		// First audio chunk after a narration dispatch — fire the play-start
		// callback so the caller can sync canvas animations to the spoken word.
		if (this.narrationStartArmed) {
			this.narrationStartArmed = false
			const cb = this.narrationStartCallback
			this.narrationStartCallback = null
			if (cb) {
				console.log(`[Live] narration audio started → firing onPlayStart`)
				cb()
			}
		}
		const bytes = base64ToBytes(b64)
		const int16 = new Int16Array(bytes.buffer, bytes.byteOffset, bytes.byteLength / 2)
		const float = int16ToFloat32(int16)
		this.scheduleAudio(float)
	}

	private scheduleAudio(samples: Float32Array) {
		if (!this.outputCtx) {
			this.outputCtx = new AudioContext({ sampleRate: LIVE_OUTPUT_SAMPLE_RATE })
		}
		const ctx = this.outputCtx
		const buffer = ctx.createBuffer(1, samples.length, LIVE_OUTPUT_SAMPLE_RATE)
		// Fresh ArrayBuffer-backed view for copyToChannel's strict typing.
		const fresh = new Float32Array(samples.length)
		fresh.set(samples)
		buffer.copyToChannel(fresh, 0)
		const src = ctx.createBufferSource()
		src.buffer = buffer
		src.connect(ctx.destination)

		const now = ctx.currentTime
		const startAt = Math.max(now, this.playbackHead)
		src.start(startAt)
		this.playbackHead = startAt + buffer.duration
		this.activeSources.push(src)
		src.onended = () => {
			const idx = this.activeSources.indexOf(src)
			if (idx >= 0) this.activeSources.splice(idx, 1)
		}
	}

	private stopAllPlayback() {
		for (const src of this.activeSources) {
			try {
				src.stop()
			} catch {}
		}
		this.activeSources = []
		if (this.outputCtx) {
			this.playbackHead = this.outputCtx.currentTime
		}
	}
}
