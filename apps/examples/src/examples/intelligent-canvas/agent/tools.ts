import {
	AssetRecordType,
	Editor,
	TLShapeId,
	TLShapePartial,
	createShapeId,
	getHashForString,
	toRichText,
} from 'tldraw'
import type { FunctionDeclaration } from './api'

/** Canvas item in an orchestrator response — a visual aid for the narration. */
export interface CanvasItem {
	type: 'text' | 'image_search'
	content: string
	label: string
}

/** The parsed output of the 'respond' tool call. */
export interface OrchestratorResponse {
	speech: string
	canvas?: CanvasItem[]
}

export const AGENT_TOOLS: FunctionDeclaration[] = [
	{
		name: 'wikipedia_search',
		description:
			'Look up a topic on Wikipedia. Returns the page summary and thumbnail image URL if available.',
		parameters: {
			type: 'object',
			properties: {
				topic: { type: 'string', description: 'The Wikipedia article title or topic to search.' },
			},
			required: ['topic'],
		},
	},
	{
		name: 'analyze_canvas_area',
		description:
			'Describe shapes in a rectangular area of the canvas. Returns a JSON description of shapes found.',
		parameters: {
			type: 'object',
			properties: {
				x: { type: 'number', description: 'Left edge of the area.' },
				y: { type: 'number', description: 'Top edge of the area.' },
				w: { type: 'number', description: 'Width of the area.' },
				h: { type: 'number', description: 'Height of the area.' },
			},
			required: ['x', 'y', 'w', 'h'],
		},
	},
	{
		name: 'create_frame',
		description: 'Create a frame shape to visually group content on the canvas.',
		parameters: {
			type: 'object',
			properties: {
				x: { type: 'number', description: 'X position of the frame.' },
				y: { type: 'number', description: 'Y position of the frame.' },
				w: { type: 'number', description: 'Width of the frame.' },
				h: { type: 'number', description: 'Height of the frame.' },
				name: { type: 'string', description: 'Label for the frame.' },
			},
			required: ['x', 'y', 'w', 'h'],
		},
	},
	{
		name: 'move_shape',
		description: 'Move an existing shape to a new position on the canvas.',
		parameters: {
			type: 'object',
			properties: {
				shapeId: { type: 'string', description: 'The shape ID to move (e.g. "shape:abc123").' },
				x: { type: 'number', description: 'New X position.' },
				y: { type: 'number', description: 'New Y position.' },
			},
			required: ['shapeId', 'x', 'y'],
		},
	},
	{
		name: 'remove_shape',
		description: 'Delete a shape from the canvas.',
		parameters: {
			type: 'object',
			properties: {
				shapeId: { type: 'string', description: 'The shape ID to delete.' },
			},
			required: ['shapeId'],
		},
	},
	{
		name: 'respond',
		description:
			'Respond to the user with spoken narration and optional canvas visuals. This is your primary way to communicate — always use this tool to deliver your final response. The speech will be read aloud and canvas items will appear progressively, synced to the narration.',
		parameters: {
			type: 'object',
			properties: {
				speech: {
					type: 'string',
					description:
						'The full text to speak aloud. Use a natural, conversational tone. This is the primary response the user will hear.',
				},
				canvas: {
					type: 'array',
					description:
						'Optional visual items to place on the canvas alongside the narration. Each item appears when its label is mentioned in the speech.',
					items: {
						type: 'object',
						properties: {
							type: {
								type: 'string',
								enum: ['text', 'image_search'],
								description:
									'Type of canvas item: "text" for a text shape, "image_search" for a Wikipedia image lookup.',
							},
							content: {
								type: 'string',
								description:
									'For "text": the text to display on the canvas. For "image_search": the Wikipedia search query.',
							},
							label: {
								type: 'string',
								description:
									'A word or short phrase that appears in the speech text. The canvas item will appear when this word is spoken. Must match text in the speech field.',
							},
						},
						required: ['type', 'content', 'label'],
					},
				},
			},
			required: ['speech'],
		},
	},
]

export interface ToolResult {
	success: boolean
	message: string
	imageUrl?: string
	imageWidth?: number
	imageHeight?: number
	/** Set to true when the 'respond' tool is called, signaling the loop should end. */
	isResponse?: boolean
	/** The parsed orchestrator response, if this is a 'respond' tool call. */
	orchestratorResponse?: OrchestratorResponse
}

export async function executeToolCall(
	editor: Editor,
	toolName: string,
	toolInput: Record<string, unknown>
): Promise<ToolResult> {
	switch (toolName) {
		case 'wikipedia_search':
			return executeWikipediaSearch(toolInput)
		case 'analyze_canvas_area':
			return executeAnalyzeCanvasArea(editor, toolInput)
		case 'create_frame':
			return executeCreateFrame(editor, toolInput)
		case 'move_shape':
			return executeMoveShape(editor, toolInput)
		case 'remove_shape':
			return executeRemoveShape(editor, toolInput)
		case 'respond':
			return executeRespond(toolInput)
		default:
			return { success: false, message: `Unknown tool: ${toolName}` }
	}
}

function executeRespond(input: Record<string, unknown>): ToolResult {
	const speech = input.speech as string
	const canvas = input.canvas as CanvasItem[] | undefined

	const orchestratorResponse: OrchestratorResponse = { speech, canvas }
	return {
		success: true,
		message: `Responding with speech (${speech.length} chars) and ${canvas?.length ?? 0} canvas items.`,
		isResponse: true,
		orchestratorResponse,
	}
}

/** Place a text shape on the canvas. Used by the orchestrator pipeline. */
export function placeTextShape(editor: Editor, text: string, x: number, y: number): TLShapeId {
	const id = createShapeId()
	editor.createShape({
		id,
		type: 'text',
		x,
		y,
		props: {
			richText: toRichText(text),
			autoSize: false,
			w: 500,
			font: 'mono',
		},
	})
	return id
}

/** Target display width for images on the canvas. */
const IMAGE_DISPLAY_WIDTH = 400

/** Place an image on the canvas from a URL. Used by the orchestrator pipeline. */
export async function placeImageFromSearch(
	editor: Editor,
	query: string,
	x: number,
	y: number
): Promise<{ shapeId: TLShapeId; imageUrl: string } | null> {
	const result = await executeWikipediaSearch({ topic: query })
	if (!result.imageUrl) return null

	const url = result.imageUrl
	const srcW = result.imageWidth ?? IMAGE_DISPLAY_WIDTH
	const srcH = result.imageHeight ?? IMAGE_DISPLAY_WIDTH
	const aspect = srcW / srcH
	const w = IMAGE_DISPLAY_WIDTH
	const h = Math.round(IMAGE_DISPLAY_WIDTH / aspect)

	const hash = getHashForString(url)
	const assetId = AssetRecordType.createId(hash)

	if (!editor.getAsset(assetId)) {
		editor.createAssets([
			AssetRecordType.create({
				id: assetId,
				type: 'image',
				typeName: 'asset',
				props: {
					name: 'image',
					src: url,
					w: srcW,
					h: srcH,
					mimeType: 'image/png',
					isAnimated: false,
					fileSize: undefined,
				},
				meta: {},
			}),
		])
	}

	const shapeId = createShapeId()
	editor.createShape({
		id: shapeId,
		type: 'image',
		x,
		y,
		props: { assetId, w, h },
	})

	return { shapeId, imageUrl: url }
}

async function executeWikipediaSearch(input: Record<string, unknown>): Promise<ToolResult> {
	const topic = input.topic as string

	try {
		const encoded = encodeURIComponent(topic)
		const response = await fetch(`https://en.wikipedia.org/api/rest_v1/page/summary/${encoded}`)

		if (!response.ok) {
			return { success: false, message: `Wikipedia lookup failed for "${topic}"` }
		}

		const data = (await response.json()) as {
			title: string
			extract: string
			thumbnail?: { source: string; width: number; height: number }
			originalimage?: { source: string; width: number; height: number }
		}

		let message = `**${data.title}**: ${data.extract}`
		let imageUrl: string | undefined
		let imageWidth: number | undefined
		let imageHeight: number | undefined

		// Prefer originalimage for better quality, fall back to thumbnail
		const image = data.originalimage ?? data.thumbnail
		if (image?.source) {
			imageUrl = image.source
			imageWidth = image.width
			imageHeight = image.height
			message += `\n\n[Image available: ${imageUrl} (${imageWidth}x${imageHeight})]`
		}

		return { success: true, message, imageUrl, imageWidth, imageHeight }
	} catch {
		return { success: false, message: `Failed to search Wikipedia for "${topic}"` }
	}
}

function executeAnalyzeCanvasArea(editor: Editor, input: Record<string, unknown>): ToolResult {
	const x = input.x as number
	const y = input.y as number
	const w = input.w as number
	const h = input.h as number

	const shapes = editor.getCurrentPageShapes()
	const results: Record<string, unknown>[] = []

	for (const shape of shapes) {
		if (shape.type === 'arrow' || shape.type === 'highlight') continue
		const bounds = editor.getShapePageBounds(shape.id)
		if (!bounds) continue

		if (
			bounds.x + bounds.w < x ||
			bounds.x > x + w ||
			bounds.y + bounds.h < y ||
			bounds.y > y + h
		) {
			continue
		}

		const text = editor.getShapeUtil(shape).getText(shape)?.trim()
		results.push({
			id: shape.id,
			type: shape.type,
			x: Math.round(bounds.x),
			y: Math.round(bounds.y),
			w: Math.round(bounds.w),
			h: Math.round(bounds.h),
			...(text ? { text: text.slice(0, 200) } : {}),
			...(shape.type === 'image' ? { hasImage: true } : {}),
		})
	}

	return {
		success: true,
		message:
			results.length > 0
				? JSON.stringify(results, null, 2)
				: 'No shapes found in the specified area.',
	}
}

function executeCreateFrame(editor: Editor, input: Record<string, unknown>): ToolResult {
	const x = input.x as number
	const y = input.y as number
	const w = input.w as number
	const h = input.h as number
	const name = (input.name as string) || ''

	const id = createShapeId()
	editor.createShape({
		id,
		type: 'frame',
		x,
		y,
		props: { w, h, name },
	})

	return { success: true, message: `Created frame ${id} at (${x}, ${y}) size ${w}x${h}` }
}

function executeMoveShape(editor: Editor, input: Record<string, unknown>): ToolResult {
	const shapeId = input.shapeId as TLShapeId
	const x = input.x as number
	const y = input.y as number

	const shape = editor.getShape(shapeId)
	if (!shape) {
		return { success: false, message: `Shape ${shapeId} not found` }
	}

	editor.updateShape({ id: shapeId, type: shape.type, x, y } as TLShapePartial)
	return { success: true, message: `Moved shape ${shapeId} to (${x}, ${y})` }
}

function executeRemoveShape(editor: Editor, input: Record<string, unknown>): ToolResult {
	const shapeId = input.shapeId as TLShapeId

	const shape = editor.getShape(shapeId)
	if (!shape) {
		return { success: false, message: `Shape ${shapeId} not found` }
	}

	editor.deleteShapes([shapeId])
	return { success: true, message: `Removed shape ${shapeId}` }
}
