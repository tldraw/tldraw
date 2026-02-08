import { Box, Editor, TLShapeId } from 'tldraw'
import {
	describeShapesForPrompt,
	findNearbyShapes,
	getImageBase64,
	type ShapeContext,
} from '../lib/canvas-helpers'
import { ERROR_CLEAR_DELAY_MS, MAX_AGENT_ITERATIONS, NEARBY_MARGIN } from '../lib/constants'
import { callGemini, generateGeminiText, type GeminiContent, type GeminiPart } from './api'
import { buildSystemPrompt } from './systemPrompt'
import { AGENT_TOOLS, executeToolCall, updateTextShapeContent } from './tools'

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

		// Only process text and note shapes as prompts
		if (shape.type !== 'text' && shape.type !== 'note') return

		// Get text content
		const text = this.editor.getShapeUtil(shape).getText(shape)?.trim()
		if (!text) return

		// Find nearby shapes of all types
		const textBounds = this.editor.getShapePageBounds(shapeId)
		if (!textBounds) return

		const searchArea = textBounds.clone().expandBy(NEARBY_MARGIN)
		const nearbyShapes = findNearbyShapes(this.editor, searchArea)

		// Run the agent pipeline
		this.runAgentPipeline(text, nearbyShapes, shapeId)
	}

	handleVoiceCommand(text: string) {
		if (this.processing) return

		// Use viewport center to find nearby shapes
		const { x, y } = this.editor.getViewportScreenCenter()
		const center = this.editor.screenToPage({ x, y })
		const searchArea = new Box(
			center.x - NEARBY_MARGIN,
			center.y - NEARBY_MARGIN,
			NEARBY_MARGIN * 2,
			NEARBY_MARGIN * 2
		)
		const nearbyShapes = findNearbyShapes(this.editor, searchArea)

		this.runAgentPipeline(text, nearbyShapes, null)
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

			// Add text with nearby shape context
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

			// Track tool results for context in streaming calls
			const toolContext: string[] = []

			// Agentic loop
			for (let i = 0; i < MAX_AGENT_ITERATIONS; i++) {
				const response = await callGemini(systemPrompt, contents, AGENT_TOOLS)

				const candidate = response.candidates?.[0]
				if (!candidate) break

				const parts = candidate.content.parts
				const functionCalls = parts.filter(
					(p): p is GeminiPart & { functionCall: NonNullable<GeminiPart['functionCall']> } =>
						!!p.functionCall
				)

				if (functionCalls.length === 0) {
					// No function calls — model is done
					break
				}

				// Add model response to conversation
				contents.push({ role: 'model', parts })

				// Execute function calls and build responses
				const responseParts: GeminiPart[] = []
				const pendingStreams: { shapeId: TLShapeId; intent: string }[] = []

				for (const part of functionCalls) {
					const result = await executeToolCall(
						this.editor,
						part.functionCall.name,
						part.functionCall.args
					)

					// Track non-write_text tool results as context for streaming
					if (part.functionCall.name !== 'write_text') {
						toolContext.push(`[${part.functionCall.name}]: ${result.message}`)
					}

					// Queue write_text shapes for streaming
					if (part.functionCall.name === 'write_text' && result.shapeId && result.intent) {
						pendingStreams.push({
							shapeId: result.shapeId as TLShapeId,
							intent: result.intent,
						})
					}

					responseParts.push({
						functionResponse: {
							name: part.functionCall.name,
							response: result as unknown as Record<string, unknown>,
						},
					})
				}

				// Stream text content into write_text shapes
				for (const { shapeId, intent } of pendingStreams) {
					const streamedText = await this.streamTextIntoShape(shapeId, intent, text, toolContext)
					// Update the function response with the actual streamed text
					const idx = responseParts.findIndex((p) => p.functionResponse?.name === 'write_text')
					if (idx !== -1 && responseParts[idx].functionResponse) {
						responseParts[idx].functionResponse.response = {
							success: true,
							message: `Wrote text: "${streamedText.slice(0, 100)}..."`,
						}
					}
				}

				contents.push({ role: 'user', parts: responseParts })
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

	/** Generate text and progressively reveal it on a text shape. */
	private async streamTextIntoShape(
		shapeId: TLShapeId,
		intent: string,
		userQuestion: string,
		toolContext: string[]
	): Promise<string> {
		this.callbacks.onStatusChange('thinking', 'Writing...')

		const contextBlock =
			toolContext.length > 0 ? `\n\nResearch results:\n${toolContext.join('\n')}` : ''

		const streamPrompt = `User asked: "${userQuestion}"${contextBlock}\n\nWrite about: ${intent}`
		const streamSystemPrompt =
			'You are writing text for an infinite canvas. Write concise, informative text (1-3 short paragraphs). Do not use markdown formatting. Do not use headers. Just write plain text.'

		const fullText = await generateGeminiText(streamSystemPrompt, streamPrompt)

		// Progressively reveal text word by word
		const words = fullText.split(/(\s+)/)
		let revealed = ''
		for (const word of words) {
			revealed += word
			updateTextShapeContent(this.editor, shapeId, revealed)
			await new Promise((r) => setTimeout(r, 20))
		}

		return fullText
	}
}
