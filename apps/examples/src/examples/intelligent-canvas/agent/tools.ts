import {
	AssetRecordType,
	Editor,
	TLAssetId,
	TLDefaultColorStyle,
	TLDefaultFillStyle,
	TLDrawShapeSegment,
	TLShapeId,
	TLShapePartial,
	Vec,
	VecModel,
	b64Vecs,
	createShapeId,
	getHashForString,
	toRichText,
} from 'tldraw'
import { getImageBase64 } from '../lib/canvas-helpers'
import type { FunctionDeclaration } from './api'
import type { CodeTarget } from './image-to-code'
import { generateCodeFromImage } from './image-to-code'

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
		name: 'move_shape',
		description:
			'Move an existing shape to a new position on the canvas. The anchor parameter controls which point of the shape is placed at (x, y).',
		parameters: {
			type: 'object',
			properties: {
				shapeId: { type: 'string', description: 'The shape ID to move (e.g. "shape:abc123").' },
				x: { type: 'number', description: 'Target X position.' },
				y: { type: 'number', description: 'Target Y position.' },
				anchor: {
					type: 'string',
					enum: [
						'top-left',
						'top-center',
						'top-right',
						'center-left',
						'center',
						'center-right',
						'bottom-left',
						'bottom-center',
						'bottom-right',
					],
					description: 'Which point of the shape to place at (x, y). Default "top-left".',
				},
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
		name: 'draw_freehand',
		description:
			'Draw a freehand path on the canvas. Use this to sketch diagrams, underlines, circles, arrows, annotations, or any freehand illustration. Provide an array of {x, y} points in page coordinates. Use "smooth" style for curves and organic shapes, "straight" for angular/geometric shapes. Set closed=true and fill for filled shapes. Call multiple times for separate strokes.',
		parameters: {
			type: 'object',
			properties: {
				points: {
					type: 'array',
					description: 'Array of {x, y} coordinates defining the path. At least 2 points required.',
					items: {
						type: 'object',
						properties: {
							x: { type: 'number', description: 'X coordinate in page space.' },
							y: { type: 'number', description: 'Y coordinate in page space.' },
						},
						required: ['x', 'y'],
					},
				},
				color: {
					type: 'string',
					description: 'Stroke color. Default "black".',
					enum: [
						'black',
						'blue',
						'green',
						'grey',
						'light-blue',
						'light-green',
						'light-red',
						'light-violet',
						'orange',
						'red',
						'violet',
						'yellow',
					],
				},
				fill: {
					type: 'string',
					description: 'Fill style for closed shapes. Default "none".',
					enum: ['none', 'solid', 'semi', 'pattern'],
				},
				closed: {
					type: 'boolean',
					description: 'Whether to close the path back to the starting point. Default false.',
				},
				style: {
					type: 'string',
					description:
						'Drawing style. "smooth" interpolates curves between points, "straight" draws straight lines. Default "smooth".',
					enum: ['smooth', 'straight'],
				},
			},
			required: ['points'],
		},
	},
	{
		name: 'generate_code_from_image',
		description:
			'Generate procedural code from an image shape on the canvas. Analyzes the image and produces code that approximates it in the chosen target language. The generated code is placed as a text shape next to the source image.',
		parameters: {
			type: 'object',
			properties: {
				shapeId: {
					type: 'string',
					description: 'The ID of an image shape on the canvas (e.g. "shape:abc123").',
				},
				target: {
					type: 'string',
					description: 'Code generation target. Default "glsl".',
					enum: ['glsl', 'svg', 'p5js', 'canvas2d'],
				},
			},
			required: ['shapeId'],
		},
	},
	{
		name: 'place_shape',
		description:
			'Position a shape relative to another shape. Use this instead of move_shape when you want to place a shape next to, above, or below a reference shape.',
		parameters: {
			type: 'object',
			properties: {
				shapeId: {
					type: 'string',
					description: 'The shape ID to position (e.g. "shape:abc123").',
				},
				referenceShapeId: {
					type: 'string',
					description: 'The shape ID to position relative to.',
				},
				side: {
					type: 'string',
					enum: ['top', 'bottom', 'left', 'right'],
					description: 'Which side of the reference shape to place on.',
				},
				align: {
					type: 'string',
					enum: ['start', 'center', 'end'],
					description:
						'How to align along the perpendicular axis. "start" = left/top edge, "center" = centered, "end" = right/bottom edge. Default "center".',
				},
				sideOffset: {
					type: 'number',
					description: 'Gap in pixels between the shapes along the side axis. Default 20.',
				},
				alignOffset: {
					type: 'number',
					description: 'Additional offset in pixels along the alignment axis. Default 0.',
				},
			},
			required: ['shapeId', 'referenceShapeId', 'side'],
		},
	},
	{
		name: 'stack_shapes',
		description:
			'Stack multiple shapes horizontally or vertically with even spacing. Arranges shapes in a line.',
		parameters: {
			type: 'object',
			properties: {
				shapeIds: {
					type: 'array',
					items: { type: 'string' },
					description: 'Array of shape IDs to stack.',
				},
				direction: {
					type: 'string',
					enum: ['horizontal', 'vertical'],
					description:
						'Direction to stack: "horizontal" (left to right) or "vertical" (top to bottom).',
				},
				gap: {
					type: 'number',
					description: 'Gap in pixels between shapes. Default 20.',
				},
			},
			required: ['shapeIds', 'direction'],
		},
	},
	{
		name: 'align_shapes',
		description:
			'Align multiple shapes along an axis. For example, align left edges, center horizontally, or align tops.',
		parameters: {
			type: 'object',
			properties: {
				shapeIds: {
					type: 'array',
					items: { type: 'string' },
					description: 'Array of shape IDs to align.',
				},
				alignment: {
					type: 'string',
					enum: ['left', 'center-horizontal', 'right', 'top', 'center-vertical', 'bottom'],
					description: 'The alignment operation to apply.',
				},
			},
			required: ['shapeIds', 'alignment'],
		},
	},
	{
		name: 'distribute_shapes',
		description:
			'Distribute multiple shapes evenly along an axis so the gaps between them are equal. Requires at least 3 shapes.',
		parameters: {
			type: 'object',
			properties: {
				shapeIds: {
					type: 'array',
					items: { type: 'string' },
					description: 'Array of shape IDs to distribute (at least 3).',
				},
				direction: {
					type: 'string',
					enum: ['horizontal', 'vertical'],
					description: 'Direction to distribute: "horizontal" or "vertical".',
				},
			},
			required: ['shapeIds', 'direction'],
		},
	},
	{
		name: 'respond',
		description:
			'Respond to the user and finish your turn. Always call this as your final action. Include speech only for voice input — omit it for text-based requests like drawing or canvas organization.',
		parameters: {
			type: 'object',
			properties: {
				speech: {
					type: 'string',
					description:
						'Optional spoken narration. Include this when the user spoke via microphone (voice input). Omit for text-based requests where speech is unnecessary.',
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
			required: [],
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
		case 'move_shape':
			return executeMoveShape(editor, toolInput)
		case 'remove_shape':
			return executeRemoveShape(editor, toolInput)
		case 'draw_freehand':
			return executeDrawFreehand(editor, toolInput)
		case 'generate_code_from_image':
			return executeGenerateCodeFromImage(editor, toolInput)
		case 'place_shape':
			return executePlaceShape(editor, toolInput)
		case 'stack_shapes':
			return executeStackShapes(editor, toolInput)
		case 'align_shapes':
			return executeAlignShapes(editor, toolInput)
		case 'distribute_shapes':
			return executeDistributeShapes(editor, toolInput)
		case 'respond':
			return executeRespond(toolInput)
		default:
			return { success: false, message: `Unknown tool: ${toolName}` }
	}
}

function executeRespond(input: Record<string, unknown>): ToolResult {
	const speech = (input.speech as string) ?? ''
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

/** Place a sticky note shape on the canvas. Used for highlight-mode responses. */
export function placeNoteShape(editor: Editor, text: string, x: number, y: number): TLShapeId {
	const id = createShapeId()
	editor.createShape({
		id,
		type: 'note',
		x,
		y,
		props: {
			richText: toRichText(text),
			color: 'yellow',
			size: 'm',
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
		// 1. Search Wikipedia to find the real article title for this topic.
		const searchUrl = `https://en.wikipedia.org/w/api.php?action=opensearch&search=${encodeURIComponent(
			topic
		)}&limit=1&namespace=0&format=json&origin=*`
		const searchResp = await fetch(searchUrl)
		if (!searchResp.ok) {
			return { success: false, message: `Wikipedia search failed for "${topic}"` }
		}
		const searchData = (await searchResp.json()) as [string, string[], string[], string[]]
		const matchedTitle = searchData[1]?.[0]
		if (!matchedTitle) {
			return { success: false, message: `No Wikipedia article found for "${topic}"` }
		}

		// 2. Fetch the summary for that real title.
		const encoded = encodeURIComponent(matchedTitle)
		const response = await fetch(`https://en.wikipedia.org/api/rest_v1/page/summary/${encoded}`)
		if (!response.ok) {
			return { success: false, message: `Wikipedia summary failed for "${matchedTitle}"` }
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
	} catch (err) {
		return {
			success: false,
			message: `Failed to search Wikipedia for "${topic}": ${err instanceof Error ? err.message : String(err)}`,
		}
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

function executeMoveShape(editor: Editor, input: Record<string, unknown>): ToolResult {
	const shapeId = input.shapeId as TLShapeId
	const x = input.x as number
	const y = input.y as number
	const anchor = (input.anchor as string) ?? 'top-left'

	const shape = editor.getShape(shapeId)
	if (!shape) {
		return { success: false, message: `Shape ${shapeId} not found` }
	}

	const bounds = editor.getShapePageBounds(shapeId)
	if (!bounds) {
		return { success: false, message: `Could not get bounds for ${shapeId}` }
	}

	// Calculate the anchor point offset from bounds origin
	let anchorOffsetX = 0
	let anchorOffsetY = 0

	if (anchor.includes('center') && !anchor.includes('left') && !anchor.includes('right')) {
		anchorOffsetX = bounds.w / 2
	} else if (anchor.includes('right')) {
		anchorOffsetX = bounds.w
	}

	if (anchor.includes('center') && !anchor.includes('top') && !anchor.includes('bottom')) {
		anchorOffsetY = bounds.h / 2
	} else if (anchor.includes('bottom')) {
		anchorOffsetY = bounds.h
	}

	// Difference between shape origin and bounds origin (matters for rotated shapes)
	const shapeOriginDeltaX = shape.x - bounds.x
	const shapeOriginDeltaY = shape.y - bounds.y

	const newX = x - anchorOffsetX + shapeOriginDeltaX
	const newY = y - anchorOffsetY + shapeOriginDeltaY

	editor.updateShape({ id: shapeId, type: shape.type, x: newX, y: newY } as TLShapePartial)
	return { success: true, message: `Moved shape ${shapeId} (anchor: ${anchor}) to (${x}, ${y})` }
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

/** Duration of the progressive draw animation in milliseconds. */
const DRAW_ANIMATION_MS = 400

async function executeDrawFreehand(
	editor: Editor,
	input: Record<string, unknown>
): Promise<ToolResult> {
	const rawPoints = input.points as { x: number; y: number }[]
	if (!rawPoints || rawPoints.length < 2) {
		return { success: false, message: 'At least 2 points are required to draw a path.' }
	}

	const closed = (input.closed as boolean) ?? false
	const color = ((input.color as string) ?? 'black') as TLDefaultColorStyle
	const fill = ((input.fill as string) ?? 'none') as TLDefaultFillStyle
	const style = (input.style as string) ?? 'smooth'

	// Copy points and close path if needed
	const inputPoints = [...rawPoints]
	if (closed) {
		inputPoints.push(inputPoints[0])
	}

	// Calculate bounding box origin
	const minX = Math.min(...inputPoints.map((p) => p.x))
	const minY = Math.min(...inputPoints.map((p) => p.y))

	// Interpolate between sparse points for smooth rendering
	const maxGap = style === 'smooth' ? 10 : 2
	const interpolated: VecModel[] = []

	for (let i = 0; i < inputPoints.length - 1; i++) {
		const point = inputPoints[i]
		interpolated.push(point)

		const nextPoint = inputPoints[i + 1]
		if (!nextPoint) continue

		const distance = Vec.Dist(point, nextPoint)
		const numPointsToAdd = Math.floor(distance / maxGap)
		for (let j = 0; j < numPointsToAdd; j++) {
			const t = (j + 1) / (numPointsToAdd + 1)
			interpolated.push(Vec.Lrp(point, nextPoint, t))
		}
	}

	// Add the final point
	const lastInput = inputPoints[inputPoints.length - 1]
	interpolated.push(lastInput)

	if (interpolated.length < 2) {
		return { success: false, message: 'Not enough valid points after interpolation.' }
	}

	// Normalize to shape-local coordinates and add pressure
	const segmentPoints = interpolated.map((point) => ({
		x: point.x - minX,
		y: point.y - minY,
		z: 0.75,
	}))

	const id = createShapeId()

	// Create shape with just the first 2 points (incomplete — will be animated)
	const initialPoints = segmentPoints.slice(0, 2)
	editor.createShape({
		id,
		type: 'draw',
		x: minX,
		y: minY,
		props: {
			color,
			fill,
			dash: 'draw',
			size: 's',
			segments: [{ type: 'free', path: b64Vecs.encodePoints(initialPoints) }],
			isComplete: false,
			isClosed: false,
			isPen: true,
		},
	})

	// Animate: progressively reveal points over DRAW_ANIMATION_MS
	const FRAME_DELAY = 16
	const totalFrames = Math.ceil(DRAW_ANIMATION_MS / FRAME_DELAY)
	const pointsPerFrame = Math.max(1, Math.ceil(segmentPoints.length / totalFrames))

	for (let i = 2; i < segmentPoints.length; i += pointsPerFrame) {
		const end = Math.min(i + pointsPerFrame, segmentPoints.length)
		const currentPoints = segmentPoints.slice(0, end)
		editor.updateShape({
			id,
			type: 'draw',
			props: {
				segments: [
					{ type: 'free', path: b64Vecs.encodePoints(currentPoints) } as TLDrawShapeSegment,
				],
			},
		})
		await new Promise((r) => setTimeout(r, FRAME_DELAY))
	}

	// Final update: mark complete with all points and correct closed state
	editor.updateShape({
		id,
		type: 'draw',
		props: {
			segments: [{ type: 'free', path: b64Vecs.encodePoints(segmentPoints) } as TLDrawShapeSegment],
			isComplete: true,
			isClosed: closed,
		},
	})

	return { success: true, message: `Drew freehand path ${id} with ${interpolated.length} points.` }
}

async function executeGenerateCodeFromImage(
	editor: Editor,
	input: Record<string, unknown>
): Promise<ToolResult> {
	const shapeId = input.shapeId as TLShapeId
	const target = ((input.target as string) ?? 'glsl') as CodeTarget

	const shape = editor.getShape(shapeId)
	if (!shape) {
		return { success: false, message: `Shape ${shapeId} not found.` }
	}
	if (shape.type !== 'image') {
		return { success: false, message: `Shape ${shapeId} is not an image (type: ${shape.type}).` }
	}

	const assetId = (shape.props as unknown as { assetId?: TLAssetId }).assetId
	if (!assetId) {
		return { success: false, message: `Image shape ${shapeId} has no asset.` }
	}

	const imageData = await getImageBase64(editor, assetId)
	if (!imageData) {
		return { success: false, message: `Could not extract image data from shape ${shapeId}.` }
	}

	const code = await generateCodeFromImage(imageData.data, imageData.mimeType, target)

	// Place the code as a visual code shape to the right of the source image
	const bounds = editor.getShapePageBounds(shapeId)
	const sourceW = bounds ? bounds.w : 400
	const sourceH = bounds ? bounds.h : 400
	const codeX = bounds ? Math.round(bounds.x + bounds.w + 40) : Math.round(shape.x + 440)
	const codeY = bounds ? Math.round(bounds.y) : Math.round(shape.y)

	const codeShapeId = createShapeId()
	editor.createShape({
		id: codeShapeId,
		type: 'code',
		x: codeX,
		y: codeY,
		props: {
			w: Math.round(sourceW),
			h: Math.round(sourceH),
			code,
			target,
		},
	})

	return {
		success: true,
		message: `Generated ${target} code from image and placed as ${codeShapeId}.`,
	}
}

function executePlaceShape(editor: Editor, input: Record<string, unknown>): ToolResult {
	const shapeId = input.shapeId as TLShapeId
	const referenceShapeId = input.referenceShapeId as TLShapeId
	const side = input.side as 'top' | 'bottom' | 'left' | 'right'
	const align = (input.align as 'start' | 'center' | 'end') ?? 'center'
	const sideOffset = (input.sideOffset as number) ?? 20
	const alignOffset = (input.alignOffset as number) ?? 0

	const shape = editor.getShape(shapeId)
	const referenceShape = editor.getShape(referenceShapeId)
	if (!shape) return { success: false, message: `Shape ${shapeId} not found` }
	if (!referenceShape)
		return { success: false, message: `Reference shape ${referenceShapeId} not found` }

	const bbA = editor.getShapePageBounds(shapeId)
	const bbR = editor.getShapePageBounds(referenceShapeId)
	if (!bbA || !bbR) return { success: false, message: 'Could not get shape bounds' }

	let x: number
	let y: number

	if (side === 'top') {
		y = bbR.minY - bbA.h - sideOffset
		if (align === 'start') x = bbR.minX + alignOffset
		else if (align === 'center') x = bbR.midX - bbA.w / 2 + alignOffset
		else x = bbR.maxX - bbA.w - alignOffset
	} else if (side === 'bottom') {
		y = bbR.maxY + sideOffset
		if (align === 'start') x = bbR.minX + alignOffset
		else if (align === 'center') x = bbR.midX - bbA.w / 2 + alignOffset
		else x = bbR.maxX - bbA.w - alignOffset
	} else if (side === 'left') {
		x = bbR.minX - bbA.w - sideOffset
		if (align === 'start') y = bbR.minY + alignOffset
		else if (align === 'center') y = bbR.midY - bbA.h / 2 + alignOffset
		else y = bbR.maxY - bbA.h - alignOffset
	} else {
		x = bbR.maxX + sideOffset
		if (align === 'start') y = bbR.minY + alignOffset
		else if (align === 'center') y = bbR.midY - bbA.h / 2 + alignOffset
		else y = bbR.maxY - bbA.h - alignOffset
	}

	editor.updateShape({ id: shapeId, type: shape.type, x, y } as TLShapePartial)
	return {
		success: true,
		message: `Placed ${shapeId} on the ${side} of ${referenceShapeId} (align: ${align}, gap: ${sideOffset}px)`,
	}
}

function executeStackShapes(editor: Editor, input: Record<string, unknown>): ToolResult {
	const shapeIds = input.shapeIds as TLShapeId[]
	const direction = input.direction as 'horizontal' | 'vertical'
	const gap = (input.gap as number) ?? 20

	if (!shapeIds || shapeIds.length < 2) {
		return { success: false, message: 'At least 2 shape IDs are required to stack.' }
	}

	const missing = shapeIds.filter((id) => !editor.getShape(id))
	if (missing.length > 0) {
		return { success: false, message: `Shapes not found: ${missing.join(', ')}` }
	}

	editor.stackShapes(shapeIds, direction, Math.max(gap, 0))
	return {
		success: true,
		message: `Stacked ${shapeIds.length} shapes ${direction}ly with ${gap}px gap.`,
	}
}

function executeAlignShapes(editor: Editor, input: Record<string, unknown>): ToolResult {
	const shapeIds = input.shapeIds as TLShapeId[]
	const alignment = input.alignment as
		| 'left'
		| 'center-horizontal'
		| 'right'
		| 'top'
		| 'center-vertical'
		| 'bottom'

	if (!shapeIds || shapeIds.length < 2) {
		return { success: false, message: 'At least 2 shape IDs are required to align.' }
	}

	const missing = shapeIds.filter((id) => !editor.getShape(id))
	if (missing.length > 0) {
		return { success: false, message: `Shapes not found: ${missing.join(', ')}` }
	}

	editor.alignShapes(shapeIds, alignment)
	return { success: true, message: `Aligned ${shapeIds.length} shapes: ${alignment}.` }
}

function executeDistributeShapes(editor: Editor, input: Record<string, unknown>): ToolResult {
	const shapeIds = input.shapeIds as TLShapeId[]
	const direction = input.direction as 'horizontal' | 'vertical'

	if (!shapeIds || shapeIds.length < 3) {
		return { success: false, message: 'At least 3 shape IDs are required to distribute.' }
	}

	const missing = shapeIds.filter((id) => !editor.getShape(id))
	if (missing.length > 0) {
		return { success: false, message: `Shapes not found: ${missing.join(', ')}` }
	}

	editor.distributeShapes(shapeIds, direction)
	return { success: true, message: `Distributed ${shapeIds.length} shapes ${direction}ly.` }
}
