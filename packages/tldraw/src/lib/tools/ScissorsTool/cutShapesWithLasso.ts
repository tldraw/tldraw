import {
	b64Vecs,
	Box,
	createShapeId,
	Editor,
	Image,
	intersectLineSegmentPolygon,
	pointInPolygon,
	TLDrawShape,
	TLImageShape,
	TLShape,
	TLShapeId,
	Vec,
	VecLike,
	VecModel,
} from '@tldraw/editor'
import { getPointsFromDrawSegments } from '../../shapes/draw/getPath'

/** @internal */
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
 *
 * @internal
 */
export function splitPolylineByPolygon(points: VecModel[], polygon: VecLike[]): SplitPolyline {
	const runs: VecModel[][] = []
	if (points.length === 0) return { inside: [], outside: [] }

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
	}
	if (run.length > 1) runs.push(run)

	// Classify each run by the middle of one of its segments rather than by a vertex: the end
	// vertices of a run are cut points that sit exactly on the outline.
	const result: SplitPolyline = { inside: [], outside: [] }
	for (const r of runs) {
		const k = Math.floor(r.length / 2)
		const mid = Vec.Med(r[k - 1], r[k])
		;(pointInPolygon(mid, polygon) ? result.inside : result.outside).push(r)
	}
	return result
}

function getDrawShapePagePoints(editor: Editor, shape: TLDrawShape): VecModel[] {
	const local = getPointsFromDrawSegments(
		shape.props.segments,
		shape.props.scaleX,
		shape.props.scaleY
	)
	if (shape.props.isClosed && local.length > 2) local.push(local[0].clone())
	const transform = editor.getShapePageTransform(shape)
	return local.map((p) => {
		const { x, y } = transform.applyToPoint(p)
		return { x, y, z: p.z }
	})
}

function createDrawPiece(editor: Editor, source: TLDrawShape, pagePoints: VecModel[]): TLShapeId {
	const origin = pagePoints[0]
	const points = pagePoints.map((p) => ({ x: p.x - origin.x, y: p.y - origin.y, z: p.z ?? 0.5 }))
	const id = createShapeId()
	editor.createShape<TLDrawShape>({
		id,
		type: 'draw',
		parentId: editor.getCurrentPageId(),
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

function loadImage(src: string) {
	return new Promise<HTMLImageElement>((resolve, reject) => {
		const image = Image()
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
	const localBounds = Box.FromPoints(local)
	if (localBounds.maxX <= 0 || localBounds.maxY <= 0) return null
	if (localBounds.minX >= shape.props.w || localBounds.minY >= shape.props.h) return null
	const region = Box.FromPoints([
		{ x: Math.max(0, localBounds.minX), y: Math.max(0, localBounds.minY) },
		{ x: Math.min(shape.props.w, localBounds.maxX), y: Math.min(shape.props.h, localBounds.maxY) },
	])
	if (region.w <= 0 || region.h <= 0) return null

	const image = await loadImage(src)
	if (editor.isDisposed || !editor.getShape(shape.id)) return null

	// Shape space maps onto the cropped part of the source bitmap.
	const crop = shape.props.crop
	const cropMinX = (crop?.topLeft.x ?? 0) * image.naturalWidth
	const cropMinY = (crop?.topLeft.y ?? 0) * image.naturalHeight
	const cropW = ((crop?.bottomRight.x ?? 1) - (crop?.topLeft.x ?? 0)) * image.naturalWidth
	const cropH = ((crop?.bottomRight.y ?? 1) - (crop?.topLeft.y ?? 0)) * image.naturalHeight
	const toPixel = (p: VecLike) => ({
		x: cropMinX + (p.x / shape.props.w) * cropW,
		y: cropMinY + (p.y / shape.props.h) * cropH,
	})
	const pixelPolygon = local.map(toPixel)
	const pixelRegion = Box.FromPoints([
		toPixel({ x: region.minX, y: region.minY }),
		toPixel({ x: region.maxX, y: region.maxY }),
	])

	function tracePolygon(ctx: CanvasRenderingContext2D) {
		ctx.beginPath()
		pixelPolygon.forEach((p, i) => (i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)))
		ctx.closePath()
	}

	const piece = document.createElement('canvas')
	piece.width = Math.max(1, Math.round(pixelRegion.w))
	piece.height = Math.max(1, Math.round(pixelRegion.h))
	const pieceCtx = piece.getContext('2d')!
	pieceCtx.translate(-pixelRegion.minX, -pixelRegion.minY)
	tracePolygon(pieceCtx)
	pieceCtx.clip()
	pieceCtx.drawImage(image, 0, 0)

	const remainder = document.createElement('canvas')
	remainder.width = image.naturalWidth
	remainder.height = image.naturalHeight
	const remainderCtx = remainder.getContext('2d')!
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
	if (editor.isDisposed || !editor.getShape(shape.id)) return null
	if (!pieceAsset || !remainderAsset) return null

	const transform = editor.getShapePageTransform(shape)
	const origin = transform.applyToPoint({ x: region.minX, y: region.minY })
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
			parentId: editor.getCurrentPageId(),
			x: origin.x,
			y: origin.y,
			rotation: transform.rotation(),
			opacity: shape.opacity,
			meta: shape.meta,
			props: { assetId: pieceAsset.id, w: region.w, h: region.h },
		})
	})
	return id
}

/**
 * Cut everything under a lasso free so it can be moved or copied on its own. Draw strokes are split
 * at the lasso outline, the lassoed region of an image becomes a new image shape, and every other
 * shape is taken whole when its centre lies inside the lasso.
 *
 * @internal
 */
export function cutShapesWithLasso(editor: Editor, polygon: VecLike[]): LassoCutResult {
	if (polygon.length < 3) return { ids: [], pending: null }
	const ids: TLShapeId[] = []
	const images: TLImageShape[] = []

	editor.run(() => {
		for (const shape of editor.getCurrentPageShapesSorted()) {
			if (shape.isLocked || shape.type === 'group') continue

			if (editor.isShapeOfType<TLImageShape>(shape, 'image')) {
				const corners = editor
					.getShapePageTransform(shape)
					.applyToPoints(editor.getShapeGeometry(shape).vertices)
				if (corners.every((corner) => pointInPolygon(corner, polygon))) ids.push(shape.id)
				else images.push(shape)
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

			const { inside, outside } = splitPolylineByPolygon(pagePoints, polygon)
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
