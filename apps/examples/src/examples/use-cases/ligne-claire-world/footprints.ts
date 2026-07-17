import { Editor, TLDefaultColorStyle, TLGeoShape } from 'tldraw'
import { KIT } from './kit'

// A footprint is a single geo shape read as a building outline in *page space*.
// The 3D world is a pure derived view of these — nothing about the 3D scene is
// stored. Move a shape on the canvas and its footprint (and therefore its
// building) moves with it on the next reactive recompute.
export interface Footprint {
	id: string
	// Outline vertices in page coordinates. Rectangles give 4 corners, ellipses a
	// ring, triangles 3 — so a round shape becomes a round tower for free.
	points: { x: number; y: number }[]
	color: string // resolved to a flat ligne-claire hex
	storeys: number
	// Un-rotated centre + local size + rotation, so an asset can be placed to
	// match the shape's real footprint (size, aspect, orientation), not just a
	// bounding box. All in page units / radians.
	center: { x: number; y: number }
	localW: number
	localH: number
	rotation: number
	// If set, this footprint renders a compiled `Scene` asset (a pagoda, a
	// generated model, …) instead of a plain extruded prism.
	assetCode?: string
}

// tldraw palette -> flat, slightly desaturated inks that read as ligne claire.
const COLOR_HEX: Partial<Record<TLDefaultColorStyle, string>> = {
	black: '#3a352c',
	grey: '#b7b3a7',
	'light-violet': '#c8b6e2',
	violet: '#8b6fc0',
	blue: '#4a7fb5',
	'light-blue': '#8fb8d8',
	yellow: '#e6c34a',
	orange: '#d08a4a',
	green: '#6b9b6b',
	'light-green': '#a6c48a',
	red: '#c0604a',
	white: '#efe9d8',
}

// The whole coupling lives here: read every geo shape's live page-space outline.
// `getShapeGeometry` and `getShapePageTransform` are reactive, so calling this
// inside a `useValue` recomputes whenever any shape moves, resizes, or recolors.
export function getFootprints(editor: Editor): Footprint[] {
	const out: Footprint[] = []
	for (const shape of editor.getCurrentPageShapes()) {
		if (shape.type !== 'geo') continue
		const geometry = editor.getShapeGeometry(shape)
		const transform = editor.getShapePageTransform(shape)
		const verts = transform.applyToPoints(geometry.vertices)
		if (verts.length < 3) continue
		const props = shape.props as TLGeoShape['props']
		const color = COLOR_HEX[props.color] ?? '#e0dccb'
		const meta = shape.meta as { storeys?: number; asset?: string; assetCode?: string }
		// Height is emergent: tag a shape with `meta.storeys` to make it taller.
		// Everything defaults to a single storey.
		const storeys = Math.max(1, Number(meta?.storeys) || 1)
		// A footprint can carry raw asset code, or name a kit entry. Raw wins.
		const assetCode = meta?.assetCode ?? (meta?.asset ? KIT[meta.asset] : undefined)
		const bounds = geometry.bounds
		const center = transform.applyToPoint(bounds.center)
		out.push({
			id: shape.id,
			points: verts.map((v) => ({ x: v.x, y: v.y })),
			color,
			storeys,
			center: { x: center.x, y: center.y },
			localW: bounds.width,
			localH: bounds.height,
			rotation: shape.rotation,
			assetCode,
		})
	}
	return out
}
