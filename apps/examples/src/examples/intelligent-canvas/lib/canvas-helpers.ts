import { Box, Editor, TLAssetId, TLShape, TLShapeId } from 'tldraw'

export interface ShapeContext {
	id: TLShapeId
	type: string
	x: number
	y: number
	text?: string
	hasImage: boolean
	assetId?: TLAssetId
}

/**
 * Find all shapes whose bounds intersect the given search area, excluding arrows.
 */
export function findNearbyShapes(editor: Editor, searchArea: Box): ShapeContext[] {
	const shapes = editor.getCurrentPageShapes()
	const results: ShapeContext[] = []

	for (const shape of shapes) {
		if (shape.type === 'arrow' || shape.type === 'highlight') continue
		const bounds = editor.getShapePageBounds(shape.id)
		if (!bounds) continue
		if (!searchArea.collides(bounds)) continue

		results.push(shapeToContext(editor, shape))
	}

	return results
}

/**
 * Convert a shape to a ShapeContext description.
 */
function shapeToContext(editor: Editor, shape: TLShape): ShapeContext {
	const text = editor.getShapeUtil(shape).getText(shape)?.trim() || undefined
	const props = shape.props as Record<string, unknown>
	const hasImage = shape.type === 'image'
	const assetId = (props.assetId as TLAssetId) || undefined

	return {
		id: shape.id,
		type: shape.type,
		x: Math.round(shape.x),
		y: Math.round(shape.y),
		text,
		hasImage,
		assetId: hasImage ? assetId : undefined,
	}
}

/**
 * Get base64 data for an image asset. Used to send images to Gemini as inlineData.
 */
export async function getImageBase64(
	editor: Editor,
	assetId: TLAssetId
): Promise<{ mimeType: string; data: string } | null> {
	const asset = editor.getAsset(assetId)
	if (!asset) return null

	const src = (asset.props as Record<string, unknown>).src as string | undefined
	if (!src) return null

	try {
		const response = await fetch(src)
		const blob = await response.blob()
		const mimeType = blob.type || 'image/png'
		const data = await blobToBase64(blob)
		return { mimeType, data }
	} catch {
		return null
	}
}

/**
 * Format shape contexts as readable text for the system prompt.
 */
export function describeShapesForPrompt(shapes: ShapeContext[]): string {
	if (shapes.length === 0) return 'No shapes nearby.'

	return shapes
		.map((s) => {
			let desc = `- ${s.id} (${s.type}) at (${s.x}, ${s.y})`
			if (s.text) desc += ` text: "${s.text}"`
			if (s.hasImage) desc += ' [contains image]'
			return desc
		})
		.join('\n')
}

/** Helper to convert a Blob to base64 string. */
async function blobToBase64(blob: Blob): Promise<string> {
	const buffer = await blob.arrayBuffer()
	const bytes = new Uint8Array(buffer)
	let binary = ''
	for (let i = 0; i < bytes.length; i++) {
		binary += String.fromCharCode(bytes[i])
	}
	return btoa(binary)
}

/**
 * Capture a JPEG screenshot of the entire canvas as base64 for sending to Gemini.
 */
export async function captureCanvasScreenshot(
	editor: Editor
): Promise<{ mimeType: string; data: string } | null> {
	const shapes = editor.getCurrentPageShapes()
	if (shapes.length === 0) return null

	try {
		const shapeIds = shapes.map((s) => s.id)
		const { blob } = await editor.toImage(shapeIds, {
			format: 'jpeg',
			quality: 0.6,
			pixelRatio: 1,
			background: true,
			padding: 16,
		})
		const data = await blobToBase64(blob)
		return { mimeType: 'image/jpeg', data }
	} catch {
		return null
	}
}

export interface HighlightFocusResult {
	highlightIds: TLShapeId[]
	focusedShapes: ShapeContext[]
}

/**
 * Find all highlight shapes and determine which content shapes they overlap.
 * Returns the highlight IDs (for deletion) and the focused content shapes.
 */
export function findHighlightFocusedShapes(editor: Editor): HighlightFocusResult {
	const allShapes = editor.getCurrentPageShapes()
	const highlightIds: TLShapeId[] = []
	const highlightBounds: Box[] = []

	for (const shape of allShapes) {
		if (shape.type !== 'highlight') continue
		const bounds = editor.getShapePageBounds(shape.id)
		if (!bounds) continue
		highlightIds.push(shape.id)
		highlightBounds.push(bounds)
	}

	if (highlightIds.length === 0) {
		return { highlightIds: [], focusedShapes: [] }
	}

	const focusedSet = new Set<TLShapeId>()
	const focusedShapes: ShapeContext[] = []

	for (const shape of allShapes) {
		if (shape.type === 'arrow' || shape.type === 'highlight') continue
		if (focusedSet.has(shape.id)) continue

		const shapeBounds = editor.getShapePageBounds(shape.id)
		if (!shapeBounds) continue

		for (const hBounds of highlightBounds) {
			if (hBounds.collides(shapeBounds)) {
				focusedSet.add(shape.id)
				focusedShapes.push(shapeToContext(editor, shape))
				break
			}
		}
	}

	return { highlightIds, focusedShapes }
}
