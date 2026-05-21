import { TLShapeId } from '@tldraw/tlschema'
import type { Editor } from '../editor/Editor'
import { Box } from '../primitives/Box'
import { isDrawElementImageSupported } from './drawElementImageSupport'

/**
 * Options for {@link exportShapesViaDrawElementImage}.
 *
 * @public
 */
export interface ExportShapesViaDrawElementImageOptions {
	/** Device pixel ratio for the output canvas. Defaults to `window.devicePixelRatio` or 2. */
	pixelRatio?: number
	/** Optional CSS color for the background. Transparent by default. */
	background?: string
	/** Padding in screen pixels around the union bounds. Defaults to 0. */
	padding?: number
}

/**
 * Result returned from {@link exportShapesViaDrawElementImage}.
 *
 * @public
 */
export interface ExportShapesViaDrawElementImageResult {
	blob: Blob
	width: number
	height: number
	/** IDs of shapes that were not currently mounted in the DOM (e.g. culled off-screen). */
	skippedShapeIds: TLShapeId[]
}

/**
 * Experimental: export shapes to a PNG `Blob` by rasterizing their live DOM via
 * the `CanvasRenderingContext2D.drawElementImage()` API.
 *
 * Unlike {@link Editor.toImage}, this path does not go through an SVG /
 * `<foreignObject>` intermediate. It clones each shape's mounted DOM node into
 * an offscreen `<canvas layoutsubtree>` and rasterizes it directly. This means
 * iframes, video frames, and any other live HTML that the SVG pipeline can't
 * represent are captured as-shown — at the cost of working only with shapes
 * that are currently mounted in the document (no off-screen / culled shapes)
 * and ignoring shape rotation (since CSS transforms are not auto-applied by
 * the API).
 *
 * Returns `null` if the API is unavailable in this browser. Callers should
 * fall back to {@link Editor.toImage}, optionally surfacing
 * {@link DRAW_ELEMENT_IMAGE_FLAG_HINT}.
 *
 * @public
 */
export async function exportShapesViaDrawElementImage(
	editor: Editor,
	shapeIds: TLShapeId[],
	options: ExportShapesViaDrawElementImageOptions = {}
): Promise<ExportShapesViaDrawElementImageResult | null> {
	if (!isDrawElementImageSupported()) return null
	if (shapeIds.length === 0) return null

	const container = editor.getContainer()
	const ownerDocument = container.ownerDocument

	const mountedShapes: { id: TLShapeId; node: HTMLElement; bounds: Box }[] = []
	const skippedShapeIds: TLShapeId[] = []

	for (const id of shapeIds) {
		const node = container.querySelector<HTMLElement>(`[data-shape-id="${id}"]`)
		const bounds = editor.getShapePageBounds(id)
		if (!node || !bounds) {
			skippedShapeIds.push(id)
			continue
		}
		mountedShapes.push({ id, node, bounds })
	}

	if (mountedShapes.length === 0) return null

	const padding = options.padding ?? 0
	const pixelRatio =
		options.pixelRatio ?? (typeof window !== 'undefined' ? window.devicePixelRatio : 2) ?? 2

	const union = Box.Common(mountedShapes.map((s) => s.bounds)).expandBy(padding)

	const canvasWidth = Math.ceil(union.width * pixelRatio)
	const canvasHeight = Math.ceil(union.height * pixelRatio)

	const host = ownerDocument.createElement('div')
	host.style.cssText =
		'position: absolute; left: -99999px; top: 0; pointer-events: none; opacity: 0;'

	const canvas = ownerDocument.createElement('canvas')
	canvas.width = canvasWidth
	canvas.height = canvasHeight
	canvas.setAttribute('layoutsubtree', '')
	canvas.style.cssText = `width: ${union.width}px; height: ${union.height}px; position: relative;`

	host.appendChild(canvas)
	container.appendChild(host)

	const placedClones: { clone: HTMLElement; x: number; y: number }[] = []

	try {
		for (const { node, bounds } of mountedShapes) {
			const clone = node.cloneNode(true) as HTMLElement
			const localX = bounds.x - union.x
			const localY = bounds.y - union.y
			clone.style.position = 'absolute'
			clone.style.left = `${localX}px`
			clone.style.top = `${localY}px`
			clone.style.transform = 'none'
			canvas.appendChild(clone)
			placedClones.push({ clone, x: localX * pixelRatio, y: localY * pixelRatio })
		}

		const ctx = canvas.getContext('2d')
		if (!ctx) return null

		ctx.scale(pixelRatio, pixelRatio)

		if (options.background) {
			ctx.fillStyle = options.background
			ctx.fillRect(0, 0, union.width, union.height)
		}

		await waitForPaint(canvas, editor)

		for (const { clone, x, y } of placedClones) {
			;(ctx as any).drawElementImage(clone, x / pixelRatio, y / pixelRatio)
		}

		const blob = await new Promise<Blob | null>((resolve) =>
			canvas.toBlob((b) => resolve(b), 'image/png')
		)
		if (!blob) return null

		return {
			blob,
			width: canvasWidth,
			height: canvasHeight,
			skippedShapeIds,
		}
	} finally {
		host.remove()
	}
}

function waitForPaint(canvas: HTMLCanvasElement, editor: Editor): Promise<void> {
	return new Promise((resolve) => {
		let settled = false
		const done = () => {
			if (settled) return
			settled = true
			resolve()
		}
		canvas.addEventListener('paint', done, { once: true })
		try {
			;(canvas as any).requestPaint?.()
		} catch {
			// older builds expose drawElementImage without requestPaint; fall back to rAF
		}
		// Belt-and-braces fallback if the paint event never fires.
		editor.timers.requestAnimationFrame(() => editor.timers.requestAnimationFrame(done))
	})
}
