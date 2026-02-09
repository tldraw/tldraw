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
import {
	callGemini,
	fetchTTSWithTimestamps,
	getWordTimings,
	type GeminiContent,
	type GeminiPart,
	type WordTiming,
} from './api'
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

	/** Execute the orchestrator response: play speech via ElevenLabs and sync canvas items. */
	private async executeResponse(response: OrchestratorResponse) {
		this.callbacks.onStatusChange('thinking', 'Speaking...')

		const canvasItems = response.canvas ?? []

		// Compute canvas layout starting position
		const startPos = this.getNextCanvasPosition()
		const ITEM_GAP = 350

		// Try ElevenLabs with timestamps for synced playback
		let usedElevenLabs = false
		try {
			const ttsResponse = await fetchTTSWithTimestamps(response.speech, ELEVENLABS_DEFAULT_VOICE_ID)
			const wordTimings = getWordTimings(ttsResponse.alignment)

			// Play audio
			const audio = new Audio(`data:audio/mpeg;base64,${ttsResponse.audio_base64}`)
			const audioPromise = new Promise<void>((resolve) => {
				audio.onended = () => resolve()
				audio.onerror = () => resolve()
			})
			audio.play()
			usedElevenLabs = true

			// Schedule canvas items to appear synced to speech
			await this.scheduleCanvasItems(canvasItems, wordTimings, response.speech, startPos, ITEM_GAP)

			// Wait for audio to finish
			await audioPromise
		} catch {
			// ElevenLabs unavailable — fall back to browser TTS + immediate canvas placement
			if (!usedElevenLabs) {
				this.fallbackSpeak(response.speech)
				await this.placeAllCanvasItems(canvasItems, startPos, ITEM_GAP)
			}
		}
	}

	/** Schedule canvas items to appear at the moment their label is spoken. */
	private async scheduleCanvasItems(
		items: CanvasItem[],
		wordTimings: WordTiming[],
		speechText: string,
		startPos: { x: number; y: number },
		gap: number
	) {
		if (items.length === 0) return

		// For each item, find when its label appears in the speech
		const scheduled = items.map((item, index) => {
			const labelLower = item.label.toLowerCase()

			// Find the first word timing that contains/matches the label
			const timing = wordTimings.find((w) => {
				const wordLower = w.word.toLowerCase()
				return wordLower.includes(labelLower) || labelLower.includes(wordLower)
			})

			let startTime = timing?.startTime ?? 0

			// If no direct word match, estimate based on character position in speech
			if (!timing) {
				const labelIndex = speechText.toLowerCase().indexOf(labelLower)
				if (labelIndex >= 0) {
					const ratio = labelIndex / speechText.length
					const totalDuration = wordTimings[wordTimings.length - 1]?.endTime ?? 0
					startTime = ratio * totalDuration
				}
			}

			return { item, startTime, y: startPos.y + index * gap }
		})

		// Sort by time and schedule placement
		scheduled.sort((a, b) => a.startTime - b.startTime)

		const baseTime = Date.now()
		for (const { item, startTime: itemTime, y } of scheduled) {
			const delay = itemTime * 1000 - (Date.now() - baseTime)
			if (delay > 0) {
				await new Promise((r) => setTimeout(r, delay))
			}
			await this.placeCanvasItem(item, startPos.x, y)
		}
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

	/** Place a single canvas item (text or image) on the canvas. */
	private async placeCanvasItem(item: CanvasItem, x: number, y: number) {
		if (item.type === 'text') {
			placeTextShape(this.editor, item.content, x, y)
		} else if (item.type === 'image_search') {
			await placeImageFromSearch(this.editor, item.content, x, y)
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
			y: Math.round(maxBottom + 250),
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
