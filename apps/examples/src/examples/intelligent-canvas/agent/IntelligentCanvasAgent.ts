import { Box, Editor, TLShapeId } from 'tldraw'
import {
	describeShapesForPrompt,
	findNearbyShapes,
	getImageBase64,
	type ShapeContext,
} from '../lib/canvas-helpers'
import {
	ELEVENLABS_DEFAULT_VOICE_ID,
	ERROR_CLEAR_DELAY_MS,
	MAX_AGENT_ITERATIONS,
	NEARBY_MARGIN,
} from '../lib/constants'
import { callGemini, type GeminiContent, type GeminiPart } from './api'
import { buildSystemPrompt } from './systemPrompt'
import {
	AGENT_TOOLS,
	executeToolCall,
	placeImageFromSearch,
	placeTextShape,
	type CanvasItem,
	type OrchestratorResponse,
} from './tools'

export type AgentStatus = 'idle' | 'thinking' | 'error'

export interface AgentCallbacks {
	onStatusChange: (status: AgentStatus, message?: string) => void
}

export class IntelligentCanvasAgent {
	private editor: Editor
	private callbacks: AgentCallbacks
	private disposeHandler: (() => void) | null = null
	private processing = false

	constructor(editor: Editor, callbacks: AgentCallbacks) {
		this.editor = editor
		this.callbacks = callbacks
	}

	start() {
		this.disposeHandler = this.editor.sideEffects.registerAfterChangeHandler(
			'instance_page_state',
			(prev, next) => {
				const prevEditing = prev.editingShapeId
				const nextEditing = next.editingShapeId

				// Detect when text editing ends (editingShapeId goes from non-null to null)
				if (prevEditing && !nextEditing) {
					this.handleTextEditEnd(prevEditing)
				}
			}
		)
	}

	stop() {
		this.disposeHandler?.()
		this.disposeHandler = null
	}

	private handleTextEditEnd(shapeId: TLShapeId) {
		if (this.processing) return

		const shape = this.editor.getShape(shapeId)
		if (!shape) return

		if (shape.type !== 'text' && shape.type !== 'note') return

		const text = this.editor.getShapeUtil(shape).getText(shape)?.trim()
		if (!text) return

		const textBounds = this.editor.getShapePageBounds(shapeId)
		if (!textBounds) return

		const searchArea = textBounds.clone().expandBy(NEARBY_MARGIN)
		const nearbyShapes = findNearbyShapes(this.editor, searchArea)

		this.runAgentPipeline(text, nearbyShapes, shapeId)
	}

	handleVoiceCommand(text: string) {
		if (this.processing) return

		const { x, y } = this.editor.getViewportScreenCenter()
		const center = this.editor.screenToPage({ x, y })
		const searchArea = new Box(
			center.x - NEARBY_MARGIN,
			center.y - NEARBY_MARGIN,
			NEARBY_MARGIN * 2,
			NEARBY_MARGIN * 2
		)
		const nearbyShapes = findNearbyShapes(this.editor, searchArea)

		this.runAgentPipeline(`[Voice input] ${text}`, nearbyShapes, null)
	}

	private async runAgentPipeline(
		text: string,
		nearbyShapes: ShapeContext[],
		textShapeId: TLShapeId | null
	) {
		this.processing = true
		this.callbacks.onStatusChange('thinking', 'Agent thinking...')

		try {
			// Delete the trigger text shape if one was used
			if (textShapeId) {
				this.editor.deleteShapes([textShapeId])
			}

			// Build user content parts
			const userParts: GeminiPart[] = []

			let userContent = text
			if (nearbyShapes.length > 0) {
				userContent += `\n\n[Nearby shapes:\n${describeShapesForPrompt(nearbyShapes)}]`
			}
			userParts.push({ text: userContent })

			// If there are nearby images, extract base64 and add as inlineData
			const imageShapes = nearbyShapes.filter((s) => s.hasImage && s.assetId)
			for (const imgShape of imageShapes) {
				const imageData = await getImageBase64(this.editor, imgShape.assetId!)
				if (imageData) {
					userParts.push({
						inlineData: { mimeType: imageData.mimeType, data: imageData.data },
					})
				}
			}

			const systemPrompt = buildSystemPrompt(this.editor)
			const contents: GeminiContent[] = [{ role: 'user', parts: userParts }]

			// Agentic loop — runs until 'respond' tool is called or max iterations
			let orchestratorResponse: OrchestratorResponse | null = null

			for (let i = 0; i < MAX_AGENT_ITERATIONS; i++) {
				const response = await callGemini(systemPrompt, contents, AGENT_TOOLS)

				const candidate = response.candidates?.[0]
				if (!candidate) break

				const parts = candidate.content.parts
				const functionCalls = parts.filter(
					(p): p is GeminiPart & { functionCall: NonNullable<GeminiPart['functionCall']> } =>
						!!p.functionCall
				)

				if (functionCalls.length === 0) break

				// Add model response to conversation
				contents.push({ role: 'model', parts })

				// Execute function calls and build responses
				const responseParts: GeminiPart[] = []
				let gotResponse = false

				for (const part of functionCalls) {
					const result = await executeToolCall(
						this.editor,
						part.functionCall.name,
						part.functionCall.args
					)

					if (result.isResponse && result.orchestratorResponse) {
						orchestratorResponse = result.orchestratorResponse
						gotResponse = true
					}

					responseParts.push({
						functionResponse: {
							name: part.functionCall.name,
							response: result as unknown as Record<string, unknown>,
						},
					})
				}

				contents.push({ role: 'user', parts: responseParts })

				// If we got a respond call, stop the loop
				if (gotResponse) break
			}

			// Execute the orchestrator response: voice + canvas
			if (orchestratorResponse) {
				await this.executeResponse(orchestratorResponse)
			}

			this.callbacks.onStatusChange('idle')
		} catch (err) {
			const message = err instanceof Error ? err.message : 'Unknown error'
			this.callbacks.onStatusChange('error', message)
			setTimeout(() => {
				this.callbacks.onStatusChange('idle')
			}, ERROR_CLEAR_DELAY_MS)
		} finally {
			this.processing = false
		}
	}

	/** IDs of shapes placed during the current response, used for relayout. */
	private placedShapeIds: TLShapeId[] = []

	/** Execute the orchestrator response: place canvas items immediately, play audio, animate camera. */
	private async executeResponse(response: OrchestratorResponse) {
		this.callbacks.onStatusChange('thinking', 'Preparing canvas...')

		const canvasItems = response.canvas ?? []
		const startPos = this.getNextCanvasPosition()
		const ITEM_GAP = 350
		this.placedShapeIds = []

		// 1. Place all canvas items immediately
		await this.placeAllCanvasItems(canvasItems, startPos, ITEM_GAP)

		// 2. Relayout so they stack tightly
		if (this.placedShapeIds.length > 0) {
			this.relayoutPlacedShapes(startPos.x)
			await new Promise((r) => setTimeout(r, 50))
		}

		// 3. Fetch audio and play, with camera tour in parallel
		const fillers = ['Preparing...', 'Processing...', 'Composing...', 'Generating...']
		// Shuffle fillers and cycle through them while TTS loads
		const shuffled = fillers.sort(() => Math.random() - 0.5)
		let fillerIndex = 0
		this.callbacks.onStatusChange('thinking', shuffled[fillerIndex])
		const fillerInterval = setInterval(() => {
			fillerIndex = (fillerIndex + 1) % shuffled.length
			this.callbacks.onStatusChange('thinking', shuffled[fillerIndex])
		}, 1500)

		try {
			const audioBlob = await this.fetchTTSAudio(response.speech)
			clearInterval(fillerInterval)
			const audioUrl = URL.createObjectURL(audioBlob)
			const audio = new Audio(audioUrl)

			const audioPromise = new Promise<void>((resolve) => {
				audio.onended = () => {
					URL.revokeObjectURL(audioUrl)
					resolve()
				}
				audio.onerror = () => {
					URL.revokeObjectURL(audioUrl)
					resolve()
				}
			})

			this.callbacks.onStatusChange('thinking', 'Speaking...')
			audio.play()

			// Run camera tour alongside playback
			if (this.placedShapeIds.length > 0) {
				this.scheduleCameraTour(response.speech, canvasItems, audio)
			}

			await audioPromise
		} catch {
			clearInterval(fillerInterval)
			// ElevenLabs unavailable — fall back to browser TTS with camera tour
			if (this.placedShapeIds.length > 0) {
				this.scheduleFallbackCameraTour(response.speech, canvasItems)
			}
			this.fallbackSpeak(response.speech)
		}

		// Zoom out to show everything once narration ends
		if (this.placedShapeIds.length > 0) {
			this.editor.zoomToFit({ animation: { duration: 400 } })
		}
	}

	/** Fetch TTS audio from the streaming ElevenLabs endpoint as a blob. */
	private async fetchTTSAudio(text: string): Promise<Blob> {
		const response = await fetch('/api/elevenlabs/tts', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ text, voiceId: ELEVENLABS_DEFAULT_VOICE_ID }),
		})

		if (!response.ok) {
			throw new Error(`ElevenLabs TTS error ${response.status}`)
		}

		return response.blob()
	}

	/** Schedule camera animations to zoom to each canvas item at estimated times during audio playback. */
	private scheduleCameraTour(speech: string, canvasItems: CanvasItem[], audio: HTMLAudioElement) {
		// Estimate when each item's label appears in the speech as a fraction
		const schedule = this.buildCameraSchedule(speech, canvasItems)

		// Wait for audio to have a known duration, then schedule
		const onCanPlay = () => {
			audio.removeEventListener('canplaythrough', onCanPlay)
			const duration = audio.duration

			for (const { shapeId, fraction } of schedule) {
				const delayMs = fraction * duration * 1000
				setTimeout(() => {
					const bounds = this.editor.getShapePageBounds(shapeId)
					if (!bounds) return
					// Zoom to the shape with some padding
					const padded = bounds.clone().expandBy(100)
					this.editor.zoomToBounds(padded, { animation: { duration: 600 } })
				}, delayMs)
			}
		}

		if (audio.readyState >= 4) {
			onCanPlay()
		} else {
			audio.addEventListener('canplaythrough', onCanPlay)
		}
	}

	/** Schedule camera tour using estimated duration for browser TTS fallback. */
	private scheduleFallbackCameraTour(speech: string, canvasItems: CanvasItem[]) {
		const schedule = this.buildCameraSchedule(speech, canvasItems)
		// Estimate speech duration: ~2.5 words per second
		const wordCount = speech.split(/\s+/).length
		const estimatedDuration = wordCount / 2.5

		for (const { shapeId, fraction } of schedule) {
			const delayMs = fraction * estimatedDuration * 1000
			setTimeout(() => {
				const bounds = this.editor.getShapePageBounds(shapeId)
				if (!bounds) return
				const padded = bounds.clone().expandBy(100)
				this.editor.zoomToBounds(padded, { animation: { duration: 600 } })
			}, delayMs)
		}
	}

	/** Build a schedule mapping each canvas item to a fractional position in the speech. */
	private buildCameraSchedule(
		speech: string,
		canvasItems: CanvasItem[]
	): { shapeId: TLShapeId; fraction: number }[] {
		const speechLower = speech.toLowerCase()
		const schedule: { shapeId: TLShapeId; fraction: number }[] = []

		for (let i = 0; i < canvasItems.length; i++) {
			const shapeId = this.placedShapeIds[i]
			if (!shapeId) continue

			const labelLower = canvasItems[i].label.toLowerCase()
			const labelIndex = speechLower.indexOf(labelLower)
			// Fraction of how far through the speech this label appears
			const fraction = labelIndex >= 0 ? labelIndex / speech.length : i / canvasItems.length

			schedule.push({ shapeId, fraction })
		}

		schedule.sort((a, b) => a.fraction - b.fraction)
		return schedule
	}

	/** Place all canvas items immediately (fallback when ElevenLabs is unavailable). */
	private async placeAllCanvasItems(
		items: CanvasItem[],
		startPos: { x: number; y: number },
		gap: number
	) {
		for (let i = 0; i < items.length; i++) {
			await this.placeCanvasItem(items[i], startPos.x, startPos.y + i * gap)
		}
	}

	/** Place a single canvas item (text or image) on the canvas and track its ID. */
	private async placeCanvasItem(item: CanvasItem, x: number, y: number) {
		if (item.type === 'text') {
			const id = placeTextShape(this.editor, item.content, x, y)
			this.placedShapeIds.push(id)
		} else if (item.type === 'image_search') {
			const result = await placeImageFromSearch(this.editor, item.content, x, y)
			if (result) this.placedShapeIds.push(result.shapeId)
		}
	}

	/** Relayout placed shapes so they stack vertically with a small gap, no overlap. */
	private relayoutPlacedShapes(startX: number) {
		const GAP = 30
		let currentY: number | null = null

		for (const id of this.placedShapeIds) {
			const shape = this.editor.getShape(id)
			if (!shape) continue
			const bounds = this.editor.getShapePageBounds(id)
			if (!bounds) continue

			if (currentY === null) {
				// First shape — use its current Y as the starting point
				currentY = shape.y
			}

			// Move shape to the correct stacked position
			if (shape.x !== startX || shape.y !== currentY) {
				this.editor.updateShape({ id, type: shape.type, x: startX, y: currentY } as any)
			}

			// Advance past this shape's actual height
			const updatedBounds = this.editor.getShapePageBounds(id)
			currentY += (updatedBounds?.h ?? bounds.h) + GAP
		}
	}

	/** Get the next available position on the canvas for placing items. */
	private getNextCanvasPosition(): { x: number; y: number } {
		const shapes = this.editor.getCurrentPageShapes()
		let maxBottom = 0
		let leftMost = Infinity
		let hasShapes = false

		for (const shape of shapes) {
			if (shape.type === 'arrow') continue
			const bounds = this.editor.getShapePageBounds(shape.id)
			if (!bounds) continue
			hasShapes = true
			const bottom = bounds.y + bounds.h
			if (bottom > maxBottom) maxBottom = bottom
			if (bounds.x < leftMost) leftMost = bounds.x
		}

		if (!hasShapes) {
			const { x, y } = this.editor.getViewportScreenCenter()
			const center = this.editor.screenToPage({ x, y })
			return { x: Math.round(center.x), y: Math.round(center.y) }
		}

		return {
			x: leftMost === Infinity ? 0 : Math.round(leftMost),
			y: Math.round(maxBottom + 60),
		}
	}

	/** Fall back to browser speech synthesis when ElevenLabs is unavailable. */
	private fallbackSpeak(text: string) {
		if (typeof window !== 'undefined' && window.speechSynthesis) {
			const utterance = new SpeechSynthesisUtterance(text)
			utterance.rate = 1.0
			utterance.pitch = 1.0
			window.speechSynthesis.speak(utterance)
		}
	}
}
