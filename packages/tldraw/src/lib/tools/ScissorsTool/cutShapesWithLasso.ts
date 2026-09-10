import {
	b64Vecs,
	Box,
	clampToBrowserMaxCanvasSize,
	createShapeId,
	Editor,
	getIndexAbove,
	Image,
	intersectLineSegmentPolygon,
	pointInPolygon,
	polygonsIntersect,
	TLDrawShape,
	TLImageShape,
	TLShape,
	TLShapeId,
	Vec,
	VecLike,
	VecModel,
} from '@tldraw/editor'
import { getPointsFromDrawSegments } from '../../shapes/draw/getPath'

export interface LassoCutResult {
	/** Shapes that were cut out synchronously and are ready to select. */
	ids: TLShapeId[]
	/** Image regions still being rendered, or null when the lasso touched no images. */
	pending: Promise<TLShapeId[]> | null
}

interface SplitPolyline {
	inside: VecModel[][]
	outside: VecModel[][]
}

/**
 * Split a polyline at every crossing of a closed polygon into the runs that fall inside and
 * outside it. Crossing points are shared by the adjoining runs so cut strokes stay visually joined.
 */
export function splitPolylineByPolygon(
	points: VecModel[],
	polygon: VecLike[],
	opts?: { closed?: boolean }
): SplitPolyline {
	const runs: VecModel[][] = []
	if (points.length === 0) return { inside: [], outside: [] }

	const isInside = points.map((p) => pointInPolygon(p, polygon))
	let run: VecModel[] = [points[0]]
	for (let i = 1; i < points.length; i++) {
		const a = points[i - 1]
		const b = points[i]
		const length = Vec.Dist(a, b) || 1
		const crossings = (intersectLineSegmentPolygon(a, b, polygon) ?? [])
			.map((p) => ({ p, t: Vec.Dist(a, p) / length }))
			.filter(({ t }) => t > 0 && t < 1)
			.sort((m, n) => m.t - n.t)
		for (const { p, t } of crossings) {
			const az = a.z ?? 0.5
			const bz = b.z ?? 0.5
			const cut = { x: p.x, y: p.y, z: az + (bz - az) * t }
			run.push(cut)
			if (run.length > 1) runs.push(run)
			run = [cut]
		}
		run.push(b)
		// A vertex sitting exactly on the outline yields no strict crossing, so the side change
		// between neighbouring vertices is the only signal that a cut belongs here.
		if (crossings.length === 0 && isInside[i - 1] !== isInside[i]) {
			runs.push(run)
			run = [b]
		}
	}
	if (run.length > 1) runs.push(run)

	const sideOf = (r: VecModel[]) => {
		// Sample the middle of a segment rather than a vertex: run ends are cut points on the outline.
		const k = Math.floor(r.length / 2)
		return pointInPolygon(Vec.Med(r[k - 1], r[k]), polygon)
	}

	// A closed stroke was opened at its first point, so rejoin the two runs that meet there.
	if (opts?.closed && runs.length > 1 && sideOf(runs[0]) === sideOf(runs[runs.length - 1])) {
		const first = runs.shift()!
		runs[runs.length - 1] = [...runs[runs.length - 1], ...first.slice(1)]
	}

	const result: SplitPolyline = { inside: [], outside: [] }
	for (const r of runs) (sideOf(r) ? result.inside : result.outside).push(r)
	return result
}

function getDrawShapePagePoints(editor: Editor, shape: TLDrawShape): VecModel[] {
	const local = getPointsFromDrawSegments(
		shape.props.segments,
		shape.props.scaleX,
		shape.props.scaleY
	)
	if (shape.props.isClosed && local.length > 2) local.push(local[0].clone())
	// The closing point is appended so the polyline covers the whole loop; the caller passes
	// `closed` so the split can rejoin the runs on either side of it.
	const transform = editor.getShapePageTransform(shape)
	return local.map((p) => {
		const { x, y } = transform.applyToPoint(p)
		return { x, y, z: p.z }
	})
}

function createDrawPiece(editor: Editor, source: TLDrawShape, pagePoints: VecModel[]): TLShapeId {
	// Pieces stay in the source's frame or group, so work in its parent's space.
	const local = pagePoints.map((p) => ({ ...editor.getPointInParentSpace(source, p), z: p.z }))
	const origin = local[0]
	const points = local.map((p) => ({ x: p.x - origin.x, y: p.y - origin.y, z: p.z ?? 0.5 }))
	const id = createShapeId()
	editor.createShape<TLDrawShape>({
		id,
		type: 'draw',
		parentId: source.parentId,
		index: source.index,
		x: origin.x,
		y: origin.y,
		rotation: 0,
		opacity: source.opacity,
		meta: source.meta,
		props: {
			color: source.props.color,
			fill: source.props.fill,
			dash: source.props.dash,
			size: source.props.size,
			isPen: source.props.isPen,
			scale: source.props.scale,
			scaleX: 1,
			scaleY: 1,
			isComplete: true,
			isClosed: false,
			segments: [{ type: 'free', path: b64Vecs.encodePoints(points, 3), dim: 3 }],
		},
	})
	return id
}

function isWholeShapeInside(editor: Editor, shape: TLShape, polygon: VecLike[]) {
	const bounds = editor.getShapePageBounds(shape)
	return !!bounds && pointInPolygon(bounds.center, polygon)
}

/** Whether a polygon overlaps the rectangle from (0, 0) to (w, h), beyond bounding boxes touching. */
function polygonOverlapsRect(polygon: VecLike[], w: number, h: number) {
	const corners = [
		{ x: 0, y: 0 },
		{ x: w, y: 0 },
		{ x: w, y: h },
		{ x: 0, y: h },
	]
	return (
		polygon.some((p) => p.x > 0 && p.x < w && p.y > 0 && p.y < h) ||
		corners.some((c) => pointInPolygon(c, polygon)) ||
		polygonsIntersect(polygon, corners)
	)
}

/** Bitmap regions can only be cut out of a static raster; animations and vectors stay whole. */
function canCutImageRegion(editor: Editor, shape: TLImageShape) {
	const asset = shape.props.assetId ? editor.getAsset(shape.props.assetId) : null
	if (!asset || asset.type !== 'image' || asset.props.isAnimated) return false
	return !asset.props.mimeType?.includes('svg')
}

function loadImage(src: string) {
	return new Promise<HTMLImageElement>((resolve, reject) => {
		const image = Image()
		// Without a CORS-clean load the canvas taints and toBlob throws.
		image.crossOrigin = 'anonymous'
		image.onload = () => resolve(image)
		image.onerror = () => reject(new Error('Could not load image'))
		image.src = src
	})
}

function canvasToFile(canvas: HTMLCanvasElement, name: string) {
	return new Promise<File>((resolve, reject) => {
		canvas.toBlob((blob) => {
			if (blob) resolve(new File([blob], name, { type: 'image/png' }))
			else reject(new Error('Could not encode image'))
		}, 'image/png')
	})
}

/**
 * Cut the lassoed region out of an image. The region becomes a new image shape at the same place
 * and pixel density, and the original is re-rendered with that region transparent. Both bitmaps go
 * through the editor's external content handler so they use the app's asset store.
 */
async function cutImageRegion(
	editor: Editor,
	shape: TLImageShape,
	polygon: VecLike[]
): Promise<TLShapeId | null> {
	const asset = shape.props.assetId ? editor.getAsset(shape.props.assetId) : null
	if (!asset || asset.type !== 'image') return null
	const src =
		(await editor.resolveAssetUrl(asset.id, { shouldResolveToOriginal: true })) ?? asset.props.src
	if (!src) return null

	const local = polygon.map((p) => editor.getPointInShapeSpace(shape, p))
	if (!polygonOverlapsRect(local, shape.props.w, shape.props.h)) return null
	const localBounds = Box.FromPoints(local)
	const region = Box.FromPoints([
		{ x: Math.max(0, localBounds.minX), y: Math.max(0, localBounds.minY) },
		{ x: Math.min(shape.props.w, localBounds.maxX), y: Math.min(shape.props.h, localBounds.maxY) },
	])
	if (region.w <= 0 || region.h <= 0) return null

	const image = await loadImage(src)
	if (editor.isDisposed) return null
	// The shape may have been edited while the bitmap decoded.
	const current = editor.getShape<TLImageShape>(shape.id)
	if (!current || current.props.assetId !== asset.id) return null
	shape = current

	// Shape space maps onto the cropped part of the source bitmap. Flips mirror shape space
	// relative to the bitmap, so undo them before sampling.
	const { flipX, flipY } = shape.props
	const unflip = (p: VecLike) => ({
		x: flipX ? shape.props.w - p.x : p.x,
		y: flipY ? shape.props.h - p.y : p.y,
	})
	const crop = shape.props.crop
	const cropMinX = (crop?.topLeft.x ?? 0) * image.naturalWidth
	const cropMinY = (crop?.topLeft.y ?? 0) * image.naturalHeight
	const cropW = ((crop?.bottomRight.x ?? 1) - (crop?.topLeft.x ?? 0)) * image.naturalWidth
	const cropH = ((crop?.bottomRight.y ?? 1) - (crop?.topLeft.y ?? 0)) * image.naturalHeight
	const toPixel = (p: VecLike) => ({
		x: cropMinX + (p.x / shape.props.w) * cropW,
		y: cropMinY + (p.y / shape.props.h) * cropH,
	})
	const pixelPolygon = local.map((p) => toPixel(unflip(p)))
	const pixelRegion = Box.FromPoints([
		toPixel(unflip({ x: region.minX, y: region.minY })),
		toPixel(unflip({ x: region.maxX, y: region.maxY })),
	])

	function tracePolygon(ctx: CanvasRenderingContext2D) {
		ctx.beginPath()
		pixelPolygon.forEach((p, i) => (i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)))
		ctx.closePath()
	}

	const piece = document.createElement('canvas')
	const [pieceW, pieceH] = clampToBrowserMaxCanvasSize(
		Math.max(1, Math.round(pixelRegion.w)),
		Math.max(1, Math.round(pixelRegion.h))
	)
	piece.width = pieceW
	piece.height = pieceH
	const pieceCtx = piece.getContext('2d')!
	pieceCtx.scale(pieceW / Math.max(1, pixelRegion.w), pieceH / Math.max(1, pixelRegion.h))
	pieceCtx.translate(-pixelRegion.minX, -pixelRegion.minY)
	tracePolygon(pieceCtx)
	pieceCtx.clip()
	pieceCtx.drawImage(image, 0, 0)

	const remainder = document.createElement('canvas')
	const [remainderW, remainderH] = clampToBrowserMaxCanvasSize(
		image.naturalWidth,
		image.naturalHeight
	)
	remainder.width = remainderW
	remainder.height = remainderH
	const remainderCtx = remainder.getContext('2d')!
	remainderCtx.scale(remainderW / image.naturalWidth, remainderH / image.naturalHeight)
	remainderCtx.drawImage(image, 0, 0)
	remainderCtx.globalCompositeOperation = 'destination-out'
	tracePolygon(remainderCtx)
	remainderCtx.fill()

	const [pieceAsset, remainderAsset] = await Promise.all([
		canvasToFile(piece, `${asset.props.name} (cut).png`).then((file) =>
			editor.getAssetForExternalContent({ type: 'file', file })
		),
		canvasToFile(remainder, asset.props.name).then((file) =>
			editor.getAssetForExternalContent({ type: 'file', file })
		),
	])
	if (editor.isDisposed || !pieceAsset || !remainderAsset) return null
	if (editor.getShape<TLImageShape>(shape.id)?.props.assetId !== asset.id) return null

	const origin = editor.getPointInParentSpace(
		shape,
		editor.getShapePageTransform(shape).applyToPoint({ x: region.minX, y: region.minY })
	)
	const id = createShapeId()
	editor.run(() => {
		editor.createAssets([pieceAsset, remainderAsset])
		editor.updateShape<TLImageShape>({
			id: shape.id,
			type: 'image',
			props: { assetId: remainderAsset.id },
		})
		editor.createShape<TLImageShape>({
			id,
			type: 'image',
			parentId: shape.parentId,
			index: getIndexAbove(shape.index),
			x: origin.x,
			y: origin.y,
			rotation: shape.rotation,
			opacity: shape.opacity,
			meta: shape.meta,
			props: { assetId: pieceAsset.id, w: region.w, h: region.h, flipX, flipY },
		})
	})
	return id
}

/**
 * Cut everything under a lasso free so it can be moved or copied on its own. Draw strokes are split
 * at the lasso outline, the lassoed region of an image becomes a new image shape, and every other
 * shape is taken whole when its centre lies inside the lasso.
 */
export function cutShapesWithLasso(editor: Editor, polygon: VecLike[]): LassoCutResult {
	const ids: TLShapeId[] = []
	const images: TLImageShape[] = []
	const lassoBounds = Box.FromPoints(polygon)

	editor.run(() => {
		for (const shape of editor.getCurrentPageShapesSorted()) {
			if (shape.type === 'group' || editor.isShapeOrAncestorLocked(shape)) continue
			const bounds = editor.getShapePageBounds(shape)
			if (!bounds || !bounds.collides(lassoBounds)) continue

			if (editor.isShapeOfType<TLImageShape>(shape, 'image')) {
				const corners = editor
					.getShapePageTransform(shape)
					.applyToPoints(editor.getShapeGeometry(shape).vertices)
				if (corners.every((corner) => pointInPolygon(corner, polygon))) ids.push(shape.id)
				else if (canCutImageRegion(editor, shape)) images.push(shape)
				else if (isWholeShapeInside(editor, shape, polygon)) ids.push(shape.id)
				continue
			}

			if (!editor.isShapeOfType<TLDrawShape>(shape, 'draw')) {
				if (isWholeShapeInside(editor, shape, polygon)) ids.push(shape.id)
				continue
			}

			const pagePoints = getDrawShapePagePoints(editor, shape)
			if (pagePoints.length < 2) {
				if (pagePoints[0] && pointInPolygon(pagePoints[0], polygon)) ids.push(shape.id)
				continue
			}

			const { inside, outside } = splitPolylineByPolygon(pagePoints, polygon, {
				closed: shape.props.isClosed,
			})
			if (inside.length === 0) continue
			if (outside.length === 0) {
				ids.push(shape.id)
				continue
			}

			for (const run of outside) createDrawPiece(editor, shape, run)
			for (const run of inside) ids.push(createDrawPiece(editor, shape, run))
			editor.deleteShape(shape.id)
		}
	})

	const pending =
		images.length === 0
			? null
			: Promise.all(
					images.map((shape) => cutImageRegion(editor, shape, polygon).catch(() => null))
				).then((pieces) => pieces.filter((id): id is TLShapeId => !!id))

	return { ids, pending }
}
