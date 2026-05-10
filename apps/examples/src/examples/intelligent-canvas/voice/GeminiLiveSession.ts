/**
 * Gemini Live API session.
 *
 * Bidirectional streaming voice with the Gemini Live API. The browser
 * connects to a dev-server WebSocket proxy at /api/gemini/live, which
 * forwards to the Gemini endpoint with the API key attached.
 *
 * Responsibilities:
 *  - capture mic, downsample to 16kHz int16 PCM, stream to model
 *  - receive 24kHz int16 PCM, schedule for gap-free playback
 *  - dispatch tool calls (e.g. delegate_to_canvas) to the host app
 *  - emit timestamped events so we can measure end-to-end latency
 */

import {
	base64ToBytes,
	bufferToBase64,
	CAPTURE_WORKLET_SOURCE,
	int16ToFloat32,
} from './audio-utils'
import {
	GEMINI_LIVE_MODEL,
	GEMINI_LIVE_VOICE,
	LIVE_INPUT_SAMPLE_RATE,
	LIVE_OUTPUT_SAMPLE_RATE,
	LIVE_SYSTEM_PROMPT,
	LIVE_TOOL_DECLARATIONS,
} from './live-config'

export type LiveStatus =
	| 'idle'
	| 'connecting'
	| 'listening'
	| 'user-speaking'
	| 'thinking'
	| 'speaking'
	| 'error'

export interface LiveSessionCallbacks {
	onStatusChange: (status: LiveStatus, message?: string) => void
	/** Live model invoked the delegation tool. Run the heavy agent. */
	onDelegate: (intent: string) => Promise<void> | void
	/** Best-effort transcript of what the user said (output transcription). */
	onUserTranscript?: (text: string) => void
	/** Best-effort transcript of what the model said. */
	onModelTranscript?: (text: string) => void
	/** Generic structured event log — used for latency measurement. */
	onEvent?: (event: string, data?: Record<string, unknown>) => void
}

interface ToolCall {
	id: string
	name: string
	args: Record<string, unknown>
}

/** Minimal shape of the messages the Live API sends back. */
interface ServerMessage {
	setupComplete?: object
	serverContent?: {
		modelTurn?: { parts?: { inlineData?: { mimeType: string; data: string }; text?: string }[] }
		turnComplete?: boolean
		generationComplete?: boolean
		interrupted?: boolean
		inputTranscription?: { text: string }
		outputTranscription?: { text: string }
	}
	toolCall?: { functionCalls?: ToolCall[] }
	toolCallCancellation?: { ids: string[] }
	goAway?: { timeLeft: string }
}

export class GeminiLiveSession {
	private ws: WebSocket | null = null
	private callbacks: LiveSessionCallbacks
	private setupReady = false
	private pendingOutbound: string[] = []

	// audio capture
	private inputCtx: AudioContext | null = null
	private mediaStream: MediaStream | null = null
	private workletNode: AudioWorkletNode | null = null
	private sourceNode: MediaStreamAudioSourceNode | null = null

	// audio playback
	private outputCtx: AudioContext | null = null
	private playbackHead = 0
	private activeSources: AudioBufferSourceNode[] = []

	// for latency logging
	private speechStartedAt: number | null = null
	private firstAudioOutAt: number | null = null

	// running transcripts within a turn
	private currentUserTranscript = ''
	private currentModelTranscript = ''

	// turn buffering — used to defer a narration until the model's current
	// turn finishes, so we don't cut its sentence in half. We track BOTH
	// "model is currently producing audio" (modelTurnActive) and "we have
	// closed a user turn and are waiting for the response" (awaitingResponse).
	// The latter catches the race where the heavy agent finishes between
	// audioStreamEnd and the first audio chunk back from Live.
	private modelTurnActive = false
	private awaitingResponse = false
	private pendingNarration: string | null = null
	private pendingNarrationTimeout: ReturnType<typeof setTimeout> | null = null
	/** Hard cap on how long we wait for Live's turn to complete before
	 * force-flushing a queued narration. If turnComplete fails to arrive
	 * we'd otherwise leave the user in dead silence. */
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
		// Also emit to console so it shows up alongside the proxy logs.
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
									// Pin language so the model doesn't drift into another
									// language on noisy or short utterances.
									languageCode: 'en-US',
								},
							},
							systemInstruction: { parts: [{ text: LIVE_SYSTEM_PROMPT }] },
							tools: [{ functionDeclarations: LIVE_TOOL_DECLARATIONS }],
							inputAudioTranscription: {},
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
			// Surface close reason loudly — upstream typically closes with a
			// reason like "INVALID_ARGUMENT: Invalid model" or "model not found".
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

	/** Open mic, start streaming PCM to the model. */
	async startMic(): Promise<void> {
		if (!this.ws) await this.connect()
		// Wait for setup to complete before sending audio.
		if (!this.setupReady) await this.waitForSetup()

		if (this.mediaStream) return // already running

		this.setStatus('listening', 'Listening...')
		this.logEvent('mic-start')

		const stream = await navigator.mediaDevices.getUserMedia({
			audio: {
				channelCount: 1,
				sampleRate: LIVE_INPUT_SAMPLE_RATE,
				echoCancellation: true,
				noiseSuppression: true,
			},
		})
		this.mediaStream = stream

		const ctx = new AudioContext()
		this.inputCtx = ctx
		const blob = new Blob([CAPTURE_WORKLET_SOURCE], { type: 'application/javascript' })
		const url = URL.createObjectURL(blob)
		await ctx.audioWorklet.addModule(url)
		URL.revokeObjectURL(url)

		const source = ctx.createMediaStreamSource(stream)
		const worklet = new AudioWorkletNode(ctx, 'gemini-live-capture', {
			processorOptions: { targetRate: LIVE_INPUT_SAMPLE_RATE },
		})
		worklet.port.onmessage = (e) => {
			const buf = e.data as ArrayBuffer
			this.sendAudioChunk(buf)
		}

		source.connect(worklet)
		// Worklet must connect somewhere or it won't pull. Use a muted gain.
		const sink = ctx.createGain()
		sink.gain.value = 0
		worklet.connect(sink).connect(ctx.destination)

		this.sourceNode = source
		this.workletNode = worklet
	}

	/** Close mic. The session itself stays open so we can keep replying. */
	stopMic(): void {
		this.logEvent('mic-stop')
		this.workletNode?.disconnect()
		this.sourceNode?.disconnect()
		this.workletNode = null
		this.sourceNode = null
		this.mediaStream?.getTracks().forEach((t) => t.stop())
		this.mediaStream = null
		this.inputCtx?.close().catch(() => {})
		this.inputCtx = null
		// Hint to the model we're done speaking — server-side VAD will still
		// catch end-of-speech, but this lets us be explicit on push-to-talk.
		this.sendJson({
			realtimeInput: { audioStreamEnd: true },
		})
		// We've closed the user turn; we're now expecting the model's
		// response. Block any pending narration until that turn finishes.
		this.awaitingResponse = true
	}

	/**
	 * Hand the canvas agent's final answer to Live so it can continue
	 * speaking with continuity. If the model is currently mid-turn (still
	 * delivering its initial substantive opening), buffer the narration
	 * until that turn completes — sending a new turn mid-speech would
	 * interrupt and abruptly restart the model.
	 */
	narrate(text: string): void {
		if (!text.trim()) return
		if (this.modelTurnActive || this.awaitingResponse) {
			console.log(
				`[Live] narrate queued (modelTurnActive=${this.modelTurnActive} awaitingResponse=${this.awaitingResponse})`
			)
			this.pendingNarration = text
			// Safety net: if turnComplete never arrives (model runs long,
			// API drops the signal), force-flush after MAX_NARRATION_BUFFER_MS.
			if (this.pendingNarrationTimeout) clearTimeout(this.pendingNarrationTimeout)
			this.pendingNarrationTimeout = setTimeout(() => {
				if (this.pendingNarration) {
					console.warn(
						`[Live] narrate force-flushing after ${GeminiLiveSession.MAX_NARRATION_BUFFER_MS}ms — turnComplete never arrived`
					)
					const t = this.pendingNarration
					this.pendingNarration = null
					this.pendingNarrationTimeout = null
					// Reset flags so dispatch will go through.
					this.modelTurnActive = false
					this.awaitingResponse = false
					this.dispatchNarration(t)
				}
			}, GeminiLiveSession.MAX_NARRATION_BUFFER_MS)
			return
		}
		this.dispatchNarration(text)
	}

	private dispatchNarration(text: string): void {
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
	}

	/** Tear down everything. */
	async close(): Promise<void> {
		this.stopMic()
		this.stopAllPlayback()
		this.outputCtx?.close().catch(() => {})
		this.outputCtx = null
		if (this.ws && this.ws.readyState === WebSocket.OPEN) this.ws.close()
		this.ws = null
		this.setupReady = false
		this.setStatus('idle')
	}

	private waitForSetup(): Promise<void> {
		if (this.setupReady) return Promise.resolve()
		return new Promise((resolve) => {
			const tick = () => {
				if (this.setupReady) resolve()
				else setTimeout(tick, 20)
			}
			tick()
		})
	}

	/**
	 * Wait for `currentUserTranscript` to stop growing. Returns the trimmed
	 * transcript. Used right before delegating to the heavy agent so we get
	 * the user's literal words rather than the Live model's paraphrase.
	 *
	 * Polls every 80ms; resolves once the transcript has been stable for
	 * 240ms or a hard 1000ms timeout fires.
	 */
	private async waitForTranscriptSettled(): Promise<string> {
		const POLL_MS = 80
		const STABLE_REQUIRED = 3 // 3 × 80ms = 240ms of stability
		const MAX_WAIT_MS = 1000

		const start = performance.now()
		let lastLen = this.currentUserTranscript.length
		let stableCount = 0

		while (performance.now() - start < MAX_WAIT_MS) {
			await new Promise((r) => setTimeout(r, POLL_MS))
			const len = this.currentUserTranscript.length
			if (len === lastLen && len > 0) {
				stableCount++
				if (stableCount >= STABLE_REQUIRED) break
			} else {
				stableCount = 0
				lastLen = len
			}
		}
		return this.currentUserTranscript.trim()
	}

	private sendAudioChunk(buf: ArrayBuffer) {
		if (this.speechStartedAt === null) {
			this.speechStartedAt = performance.now()
			this.logEvent('user-audio-first-chunk')
		}
		this.sendJson({
			realtimeInput: {
				audio: {
					mimeType: `audio/pcm;rate=${LIVE_INPUT_SAMPLE_RATE}`,
					data: bufferToBase64(buf),
				},
			},
		})
	}

	private sendJson(obj: unknown) {
		const text = JSON.stringify(obj)
		if (this.ws && this.ws.readyState === WebSocket.OPEN) {
			this.ws.send(text)
		} else {
			this.pendingOutbound.push(text)
		}
	}

	private handleServerMessage(raw: string | ArrayBuffer | Blob) {
		// Live API sends JSON as text frames; some clients route via Blob.
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
		// Compact echo so we can see exactly what the API sends back. Audio
		// payloads are noisy, so we strip them.
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
			this.setStatus('listening', 'Ready')
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
			if (sc.inputTranscription?.text) {
				this.currentUserTranscript += sc.inputTranscription.text
			}
			if (sc.interrupted) {
				this.logEvent('interrupted')
				this.stopAllPlayback()
			}
			if (sc.turnComplete || sc.generationComplete) {
				this.logEvent('turn-complete', {
					user: this.currentUserTranscript,
					model: this.currentModelTranscript,
				})
				if (this.currentUserTranscript) {
					this.callbacks.onUserTranscript?.(this.currentUserTranscript)
				}
				if (this.currentModelTranscript) {
					this.callbacks.onModelTranscript?.(this.currentModelTranscript)
				}
				this.currentUserTranscript = ''
				this.currentModelTranscript = ''
				this.speechStartedAt = null
				this.firstAudioOutAt = null

				// Model turn finished. If we have a buffered narration
				// (heavy agent finished before the opening did), fire it
				// now — small breath so it doesn't feel rushed.
				this.modelTurnActive = false
				this.awaitingResponse = false
				if (this.pendingNarrationTimeout) {
					clearTimeout(this.pendingNarrationTimeout)
					this.pendingNarrationTimeout = null
				}
				if (this.pendingNarration) {
					console.log(`[Live] turnComplete → flushing queued narration`)
					const text = this.pendingNarration
					this.pendingNarration = null
					setTimeout(() => this.dispatchNarration(text), 150)
				}
			}
		}

		if (msg.toolCall?.functionCalls) {
			for (const call of msg.toolCall.functionCalls) {
				this.handleToolCall(call)
			}
		}

		if (msg.goAway) {
			this.logEvent('go-away', { timeLeft: msg.goAway.timeLeft })
		}
	}

	private handleAudioOut(b64: string) {
		if (this.firstAudioOutAt === null) {
			this.firstAudioOutAt = performance.now()
			const gap = this.speechStartedAt !== null ? this.firstAudioOutAt - this.speechStartedAt : null
			this.logEvent('model-audio-first-chunk', { sinceUserAudioStartMs: gap })
			this.setStatus('speaking', 'Speaking...')
		}
		const bytes = base64ToBytes(b64)
		// 16-bit signed LE -> Float32 @ 24kHz
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
		// Copy into a fresh ArrayBuffer-backed view so copyToChannel's strict
		// TypedArray<ArrayBuffer> overload accepts it (TS 5.7+ buffer narrowing).
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

	private async handleToolCall(call: ToolCall) {
		this.logEvent('tool-call', { name: call.name, args: call.args })

		let response: Record<string, unknown> = { ok: true }

		if (call.name === 'delegate_to_canvas') {
			// The toolCall message often arrives before inputTranscription
			// finishes streaming. Wait briefly for the transcript to settle
			// so the heavy agent gets the user's literal words, not the
			// Live model's paraphrase.
			const literalTranscript = await this.waitForTranscriptSettled()
			const paraphrase = String(call.args.intent ?? '').trim()
			const intent = literalTranscript || paraphrase
			console.log(
				`[Live] tool call delegate. transcript="${literalTranscript}" paraphrase="${paraphrase}" using="${intent}"`
			)
			try {
				// Fire-and-forget: respond immediately so the Live model can
				// keep talking. The heavy agent runs asynchronously.
				void (async () => {
					try {
						await this.callbacks.onDelegate(intent)
					} catch (err) {
						console.error('[Live] delegate failed:', err)
					}
				})()
				response = { status: 'started', intent }
			} catch (err) {
				response = { status: 'error', error: String(err) }
			}
		} else {
			response = { status: 'unknown_tool' }
		}

		this.sendJson({
			toolResponse: {
				functionResponses: [{ id: call.id, name: call.name, response }],
			},
		})
	}
}
