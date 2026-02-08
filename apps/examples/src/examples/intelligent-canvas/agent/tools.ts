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

export const AGENT_TOOLS: FunctionDeclaration[] = [
	{
		name: 'write_text',
		description:
			'Create a text shape on the canvas. The text content will be streamed in automatically — just describe what to write.',
		parameters: {
			type: 'object',
			properties: {
				intent: {
					type: 'string',
					description:
						'Brief description of what to write, e.g. "A summary of black holes" or "Three fun facts about dolphins".',
				},
				x: { type: 'number', description: 'X position on canvas.' },
				y: { type: 'number', description: 'Y position on canvas.' },
			},
			required: ['intent', 'x', 'y'],
		},
	},
	{
		name: 'place_image',
		description: 'Place an image on the canvas from a URL.',
		parameters: {
			type: 'object',
			properties: {
				url: { type: 'string', description: 'The image URL.' },
				x: { type: 'number', description: 'X position on canvas.' },
				y: { type: 'number', description: 'Y position on canvas.' },
				w: { type: 'number', description: 'Width in pixels. Default 300.' },
				h: { type: 'number', description: 'Height in pixels. Default 300.' },
			},
			required: ['url', 'x', 'y'],
		},
	},
	{
		name: 'web_search',
		description:
			'Search the web for information on a topic. Returns a text summary. Currently delegates to Wikipedia.',
		parameters: {
			type: 'object',
			properties: {
				query: { type: 'string', description: 'The search query.' },
			},
			required: ['query'],
		},
	},
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
		name: 'speak',
		description: 'Speak text aloud using text-to-speech. Use when responding to voice input.',
		parameters: {
			type: 'object',
			properties: {
				text: { type: 'string', description: 'The text to speak aloud.' },
			},
			required: ['text'],
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
]

export interface ToolResult {
	success: boolean
	message: string
	imageUrl?: string
	/** For write_text: the created shape ID and intent for streaming */
	shapeId?: string
	intent?: string
}

export async function executeToolCall(
	editor: Editor,
	toolName: string,
	toolInput: Record<string, unknown>
): Promise<ToolResult> {
	switch (toolName) {
		case 'write_text':
			return executeWriteText(editor, toolInput)
		case 'place_image':
			return executePlaceImage(editor, toolInput)
		case 'web_search':
			return executeWebSearch(toolInput)
		case 'wikipedia_search':
			return executeWikipediaSearch(toolInput)
		case 'speak':
			return executeSpeak(toolInput)
		case 'analyze_canvas_area':
			return executeAnalyzeCanvasArea(editor, toolInput)
		case 'create_frame':
			return executeCreateFrame(editor, toolInput)
		case 'move_shape':
			return executeMoveShape(editor, toolInput)
		case 'remove_shape':
			return executeRemoveShape(editor, toolInput)
		default:
			return { success: false, message: `Unknown tool: ${toolName}` }
	}
}

function executeWriteText(editor: Editor, input: Record<string, unknown>): ToolResult {
	const intent = input.intent as string
	const x = input.x as number
	const y = input.y as number

	const id = createShapeId()
	editor.createShape({
		id,
		type: 'text',
		x,
		y,
		props: {
			richText: toRichText(''),
			autoSize: false,
			w: 500,
		},
	})

	return {
		success: true,
		message: `Created text shape ${id} at (${x}, ${y}) — content will be streamed for: ${intent}`,
		shapeId: id,
		intent,
	}
}

/** Update a text shape's content progressively. */
export function updateTextShapeContent(editor: Editor, shapeId: TLShapeId, text: string) {
	const shape = editor.getShape(shapeId)
	if (!shape) return
	editor.updateShape({
		id: shapeId,
		type: 'text',
		props: { richText: toRichText(text) },
	})
}

function executePlaceImage(editor: Editor, input: Record<string, unknown>): ToolResult {
	const url = input.url as string
	const x = input.x as number
	const y = input.y as number
	const w = (input.w as number) || 300
	const h = (input.h as number) || 300

	const hash = getHashForString(url)
	const assetId = AssetRecordType.createId(hash)

	// Create asset if it doesn't exist
	if (!editor.getAsset(assetId)) {
		editor.createAssets([
			AssetRecordType.create({
				id: assetId,
				type: 'image',
				typeName: 'asset',
				props: {
					name: 'image',
					src: url,
					w,
					h,
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
		props: {
			assetId,
			w,
			h,
		},
	})

	return { success: true, message: `Placed image ${shapeId} at (${x}, ${y})` }
}

async function executeWebSearch(input: Record<string, unknown>): Promise<ToolResult> {
	const query = input.query as string
	// Delegate to Wikipedia search as a starting point
	return executeWikipediaSearch({ topic: query })
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
			thumbnail?: { source: string }
		}

		let message = `**${data.title}**: ${data.extract}`
		let imageUrl: string | undefined

		if (data.thumbnail?.source) {
			imageUrl = data.thumbnail.source
			message += `\n\n[Thumbnail available: ${imageUrl}]`
		}

		return { success: true, message, imageUrl }
	} catch {
		return { success: false, message: `Failed to search Wikipedia for "${topic}"` }
	}
}

function executeSpeak(input: Record<string, unknown>): ToolResult {
	const text = input.text as string

	if (typeof window !== 'undefined' && window.speechSynthesis) {
		const utterance = new SpeechSynthesisUtterance(text)
		utterance.rate = 1.0
		utterance.pitch = 1.0
		window.speechSynthesis.speak(utterance)
	}

	return { success: true, message: 'Speaking text aloud.' }
}

function executeAnalyzeCanvasArea(editor: Editor, input: Record<string, unknown>): ToolResult {
	const x = input.x as number
	const y = input.y as number
	const w = input.w as number
	const h = input.h as number

	const shapes = editor.getCurrentPageShapes()
	const results: Record<string, unknown>[] = []

	for (const shape of shapes) {
		if (shape.type === 'arrow') continue
		const bounds = editor.getShapePageBounds(shape.id)
		if (!bounds) continue

		// Check if shape bounds intersect with the search area
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
