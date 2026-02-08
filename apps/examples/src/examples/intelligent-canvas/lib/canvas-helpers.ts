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
		if (shape.type === 'arrow') continue
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
		const buffer = await blob.arrayBuffer()
		const bytes = new Uint8Array(buffer)
		let binary = ''
		for (let i = 0; i < bytes.length; i++) {
			binary += String.fromCharCode(bytes[i])
		}
		const data = btoa(binary)
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
