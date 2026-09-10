import {
	AssetRecordType,
	b64Vecs,
	Box,
	createShapeId,
	Editor,
	getPointsFromDrawSegments,
	intersectLineSegmentPolygon,
	pointInPolygon,
	TLDrawShape,
	TLImageAsset,
	TLImageShape,
	TLShape,
	TLShapeId,
	Vec,
	VecLike,
	VecModel,
} from 'tldraw'

interface SplitPolyline {
	inside: VecModel[][]
	outside: VecModel[][]
}

/**
 * Split a polyline at every crossing of a closed polygon, returning the runs that fall inside and
 * outside it. Crossing points are shared by the adjoining runs so cut strokes stay visually joined.
 */
export function splitPolylineByPolygon(points: VecModel[], polygon: VecLike[]): SplitPolyline {
	const result: SplitPolyline = { inside: [], outside: [] }
	if (points.length === 0) return result

	let run: VecModel[] = [points[0]]
	let isInside = pointInPolygon(points[0], polygon)

	function flush() {
		if (run.length > 1) (isInside ? result.inside : result.outside).push(run)
	}

	for (let i = 1; i < points.length; i++) {
		const a = points[i - 1]
		const b = points[i]
		const crossings = (intersectLineSegmentPolygon(a, b, polygon) ?? [])
			.map((p) => ({ p, t: Vec.Dist(a, p) / (Vec.Dist(a, b) || 1) }))
			.filter(({ t }) => t > 0 && t < 1)
			.sort((m, n) => m.t - n.t)
		for (const { p, t } of crossings) {
			const az = a.z ?? 0.5
			const bz = b.z ?? 0.5
			const cut = { x: p.x, y: p.y, z: az + (bz - az) * t }
			run.push(cut)
			flush()
			isInside = !isInside
			run = [cut]
		}
		run.push(b)
	}
	flush()

	// A point that lands exactly on the outline can leave a run with an unchanged state, so recheck
	// each run rather than trusting the toggle alone. Sample the middle of a segment, never a vertex:
	// a run's end vertices are cut points that sit on the outline itself.
	const all = [...result.inside, ...result.outside]
	result.inside = []
	result.outside = []
	for (const r of all) {
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
		const image = new Image()
		image.crossOrigin = 'anonymous'
		image.onload = () => resolve(image)
		image.onerror = () => reject(new Error('Could not load image'))
		image.src = src
	})
}

function createImageAsset(editor: Editor, canvas: HTMLCanvasElement, name: string) {
	const src = canvas.toDataURL('image/png')
	const asset: TLImageAsset = {
		id: AssetRecordType.createId(),
		typeName: 'asset',
		type: 'image',
		props: {
			name,
			src,
			w: canvas.width,
			h: canvas.height,
			mimeType: 'image/png',
			isAnimated: false,
			fileSize: src.length,
		},
		meta: {},
	}
	editor.createAssets([asset])
	return asset
}

/**
 * Cut the lassoed region out of an image. The region becomes a new image shape at the same place
 * and pixel density, and the original is re-rendered with that region made transparent.
 */
async function extractImageRegion(
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
	// Clamp the working area to the part of the lasso that overlaps the image.
	const region = Box.FromPoints([
		{ x: Math.max(0, localBounds.minX), y: Math.max(0, localBounds.minY) },
		{ x: Math.min(shape.props.w, localBounds.maxX), y: Math.min(shape.props.h, localBounds.maxY) },
	])
	if (localBounds.maxX <= 0 || localBounds.maxY <= 0) return null
	if (localBounds.minX >= shape.props.w || localBounds.minY >= shape.props.h) return null
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
	const width = Math.max(1, Math.round(pixelRegion.w))
	const height = Math.max(1, Math.round(pixelRegion.h))

	function tracePolygon(ctx: CanvasRenderingContext2D) {
		ctx.beginPath()
		pixelPolygon.forEach((p, i) => (i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)))
		ctx.closePath()
	}

	// The cut-out piece.
	const piece = document.createElement('canvas')
	piece.width = width
	piece.height = height
	const pieceCtx = piece.getContext('2d')!
	pieceCtx.translate(-pixelRegion.minX, -pixelRegion.minY)
	tracePolygon(pieceCtx)
	pieceCtx.clip()
	pieceCtx.drawImage(image, 0, 0)

	// The original with the piece removed.
	const remainder = document.createElement('canvas')
	remainder.width = image.naturalWidth
	remainder.height = image.naturalHeight
	const remainderCtx = remainder.getContext('2d')!
	remainderCtx.drawImage(image, 0, 0)
	remainderCtx.globalCompositeOperation = 'destination-out'
	tracePolygon(remainderCtx)
	remainderCtx.fill()

	const transform = editor.getShapePageTransform(shape)
	const origin = transform.applyToPoint({ x: region.minX, y: region.minY })
	const id = createShapeId()
	editor.run(() => {
		const pieceAsset = createImageAsset(editor, piece, `${asset.props.name} (cut)`)
		const remainderAsset = createImageAsset(editor, remainder, asset.props.name)
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
 * Lift everything under a lasso into its own set of shapes. Draw strokes are cut precisely at the
 * lasso outline, images have the lassoed region cut out as a new image, and every other shape is
 * taken whole when its centre lies inside. Resolves to the ids of the extracted shapes.
 */
export async function extractShapesInLasso(
	editor: Editor,
	polygon: VecLike[]
): Promise<TLShapeId[]> {
	if (polygon.length < 3) return []
	const extracted: TLShapeId[] = []
	const images: TLImageShape[] = []

	editor.run(() => {
		for (const shape of editor.getCurrentPageShapesSorted()) {
			if (shape.isLocked || shape.type === 'group') continue

			if (editor.isShapeOfType<TLImageShape>(shape, 'image')) {
				const corners = editor
					.getShapePageTransform(shape)
					.applyToPoints(editor.getShapeGeometry(shape).vertices)
				if (corners.every((corner) => pointInPolygon(corner, polygon))) extracted.push(shape.id)
				else images.push(shape)
				continue
			}

			if (!editor.isShapeOfType<TLDrawShape>(shape, 'draw')) {
				if (isWholeShapeInside(editor, shape, polygon)) extracted.push(shape.id)
				continue
			}

			const pagePoints = getDrawShapePagePoints(editor, shape)
			if (pagePoints.length < 2) {
				if (pagePoints[0] && pointInPolygon(pagePoints[0], polygon)) extracted.push(shape.id)
				continue
			}

			const { inside, outside } = splitPolylineByPolygon(pagePoints, polygon)
			if (inside.length === 0) continue
			if (outside.length === 0) {
				extracted.push(shape.id)
				continue
			}

			for (const run of outside) createDrawPiece(editor, shape, run)
			for (const run of inside) extracted.push(createDrawPiece(editor, shape, run))
			editor.deleteShape(shape.id)
		}
	})

	const pieces = await Promise.all(
		images.map((shape) => extractImageRegion(editor, shape, polygon).catch(() => null))
	)
	for (const id of pieces) if (id) extracted.push(id)

	return extracted
}
