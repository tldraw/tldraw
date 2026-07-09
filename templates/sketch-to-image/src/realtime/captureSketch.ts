import { Editor, TLShapeId } from 'tldraw'
import { CAPTURE_SIZE } from '../constants'

/**
 * Rasterize the current sketch into a square base64 PNG data URL suitable for
 * the LCM image-to-image model.
 *
 * LCM expects a square (512x512) input. Rather than let tldraw trim to the
 * drawing's bounds — which would make the framing jump around as strokes are
 * added and removed — we render the shapes on a white background and letterbox
 * the result into a fixed square. That keeps the sketch-to-image mapping stable
 * from frame to frame.
 *
 * Returns `null` when there is nothing to capture (empty canvas).
 */
export async function captureSketch(editor: Editor): Promise<string | null> {
	const shapeIds = [...editor.getCurrentPageShapeIds()] as TLShapeId[]
	if (shapeIds.length === 0) return null

	const image = await editor.toImage(shapeIds, {
		format: 'png',
		background: true,
		padding: 16,
		// White paper regardless of the editor's dark/light mode.
		darkMode: false,
		pixelRatio: 1,
	})

	const bitmap = await blobToBitmap(image.blob)
	try {
		return letterboxToSquare(bitmap, CAPTURE_SIZE)
	} finally {
		bitmap.close()
	}
}

/** Draw a bitmap centered on a white square canvas and return a PNG data URL. */
function letterboxToSquare(bitmap: ImageBitmap, size: number): string {
	const canvas = document.createElement('canvas')
	canvas.width = size
	canvas.height = size
	const ctx = canvas.getContext('2d')
	if (!ctx) throw new Error('Could not get a 2d canvas context')

	ctx.fillStyle = '#ffffff'
	ctx.fillRect(0, 0, size, size)

	const scale = Math.min(size / bitmap.width, size / bitmap.height)
	const drawWidth = bitmap.width * scale
	const drawHeight = bitmap.height * scale
	const dx = (size - drawWidth) / 2
	const dy = (size - drawHeight) / 2
	ctx.drawImage(bitmap, dx, dy, drawWidth, drawHeight)

	return canvas.toDataURL('image/png')
}

async function blobToBitmap(blob: Blob): Promise<ImageBitmap> {
	return createImageBitmap(blob)
}
