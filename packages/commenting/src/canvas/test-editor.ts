import { Mat, type Editor, type TLShape, type TLShapeId } from 'tldraw'

/**
 * A fake editor for anchor tests. Test-only — not exported from the package barrel.
 *
 * Shapes are modelled the way tldraw models them: a local geometry box with its origin at (0, 0),
 * plus a page transform carrying position and rotation. Anchor code has to compose those two
 * correctly, so the fake uses the real `Mat` rather than faking the maths it is meant to be
 * testing — a stub that returned page-aligned bounds would pass whether or not rotation is handled.
 */
export interface FakeShapeSpec {
	id: string
	/** Drives the area-bound shape-type exemption. Defaults to a stroked shape ('geo'). */
	type?: string
	/** Position of the shape's origin in page space. */
	x?: number
	y?: number
	/** Rotation about the shape's origin, in radians. */
	rotation?: number
	w?: number
	h?: number
	/**
	 * What `distanceToPoint` reports for this shape, regardless of the point. Negative means the
	 * point is inside a fill. Geometry maths belongs to tldraw; these tests only care how the
	 * commenting code interprets the number.
	 */
	distanceToOutline?: number
}

export interface FakeEditorOptions {
	pageId?: string
	zoom?: number
	/** Order returned by `getShapesAtPoint`, which is top-most first. */
	shapes?: FakeShapeSpec[]
}

export const FAKE_PAGE_ID = 'page:one'

export function createFakeEditor({
	pageId = FAKE_PAGE_ID,
	zoom = 1,
	shapes = [],
}: FakeEditorOptions = {}): Editor {
	const specs = new Map(shapes.map((spec) => [spec.id, spec]))

	const records = new Map<string, TLShape>(
		shapes.map((spec) => [
			spec.id,
			{ id: spec.id as TLShapeId, type: spec.type ?? 'geo' } as TLShape,
		])
	)

	const specOf = (shape: TLShape | TLShapeId): FakeShapeSpec | undefined =>
		specs.get(typeof shape === 'string' ? shape : shape.id)

	const transformOf = (shape: TLShape | TLShapeId): Mat | undefined => {
		const spec = specOf(shape)
		if (!spec) return undefined
		// Translate then rotate, matching how tldraw composes a shape's page transform.
		return Mat.Identity()
			.translate(spec.x ?? 0, spec.y ?? 0)
			.rotate(spec.rotation ?? 0)
	}

	return {
		getCurrentPageId: () => pageId,
		getZoomLevel: () => zoom,
		getShape: (id: TLShapeId) => records.get(id as unknown as string),
		getShapePageTransform: (shape: TLShape | TLShapeId) => transformOf(shape),
		getShapeGeometry: (shape: TLShape | TLShapeId) => {
			const spec = specOf(shape)
			const w = spec?.w ?? 0
			const h = spec?.h ?? 0
			return {
				bounds: { minX: 0, minY: 0, maxX: w, maxY: h, w, h, width: w, height: h },
				distanceToPoint: () => spec?.distanceToOutline ?? 0,
			}
		},
		getPointInShapeSpace: (shape: TLShape | TLShapeId, page: { x: number; y: number }) => {
			const transform = transformOf(shape)
			if (!transform) return page
			return Mat.applyToPoint(Mat.Inverse(transform), page)
		},
		getShapesAtPoint: () => shapes.map((spec) => records.get(spec.id)!),
		// Only the 'text-range' anchor still reads page bounds. Unrotated shapes only, which is all
		// that anchor kind is used with.
		getShapePageBounds: (shape: TLShape | TLShapeId) => {
			const spec = specOf(shape)
			if (!spec) return undefined
			const w = spec.w ?? 0
			const h = spec.h ?? 0
			const x = spec.x ?? 0
			const y = spec.y ?? 0
			return { minX: x, minY: y, maxX: x + w, maxY: y + h, w, h, width: w, height: h }
		},
	} as unknown as Editor
}
