import {
	Editor,
	TLDefaultColorStyle,
	TLGeoShape,
	TLShapePartial,
	Tldraw,
	createShapeId,
	useEditor,
	useValue,
} from 'tldraw'
import 'tldraw/tldraw.css'
import { getFootprints } from './footprints'
import { ASSET_SPEC, KitName } from './kit'
import { World3d } from './World3d'

// A "make real" for whole worlds: the tldraw page is a top-down plan, and every
// geo shape you draw is a building footprint. The panel in the corner renders a
// live ligne-claire 3D world from those shapes — draw, drag, resize or recolour
// a shape and the world updates in place. Tag a shape with an asset (a pagoda, a
// house, or a generated model) and that structure stands on its footprint
// instead of a plain block. Nothing about the 3D scene is stored; it's a pure
// derived view of the canvas.
export default function LigneClaireWorldExample() {
	return (
		<div style={{ position: 'absolute', inset: 0 }}>
			<Tldraw persistenceKey="ligne-claire-world" onMount={seedStarterPlan}>
				<WorldPanel />
			</Tldraw>
		</div>
	)
}

function WorldPanel() {
	const editor = useEditor()
	// The one line that makes it live: recompute footprints whenever any shape
	// changes. `getFootprints` reads reactive geometry, so `useValue` re-runs on
	// every move/resize/recolour and the world re-renders.
	const footprints = useValue('footprints', () => getFootprints(editor), [editor])

	return (
		<div
			onPointerDown={(e) => e.stopPropagation()}
			onWheelCapture={(e) => e.stopPropagation()}
			style={{
				position: 'absolute',
				right: 12,
				bottom: 12,
				width: '46%',
				height: '62%',
				zIndex: 400,
				pointerEvents: 'all',
				borderRadius: 12,
				overflow: 'hidden',
				border: '2px solid #2b2b2b',
				boxShadow: '0 8px 24px rgba(0,0,0,0.18)',
			}}
		>
			<World3d footprints={footprints} />
			<div
				style={{
					position: 'absolute',
					left: 10,
					top: 8,
					right: 10,
					display: 'flex',
					flexWrap: 'wrap',
					gap: 6,
				}}
			>
				<AssetButton editor={editor} label="Pagoda" asset="pagoda" />
				<AssetButton editor={editor} label="Shrine" asset="shrine" />
				<AssetButton editor={editor} label="Torii" asset="torii" />
				<AssetButton editor={editor} label="Bridge" asset="bridge" />
				<AssetButton editor={editor} label="House" asset="house" />
				<AssetButton editor={editor} label="Block" asset={null} />
			</div>
			<div
				style={{
					position: 'absolute',
					left: 10,
					bottom: 8,
					font: '600 11px/1.4 Inter, system-ui, sans-serif',
					color: '#3a352c',
					pointerEvents: 'none',
				}}
			>
				Draw geo shapes → buildings. Select one + a button to place a structure. `meta.storeys` =
				height.
			</div>
		</div>
	)
}

// Set (or clear) the asset on the selected geo shapes.
function AssetButton({
	editor,
	label,
	asset,
}: {
	editor: Editor
	label: string
	asset: KitName | null
}) {
	const apply = () => {
		const geos = editor.getSelectedShapes().filter((s) => s.type === 'geo')
		if (geos.length === 0) return
		editor.updateShapes(
			geos.map((s): TLShapePartial<TLGeoShape> => {
				const meta = { ...s.meta, asset }
				if (asset === null) return { id: s.id, type: 'geo', meta }
				// Snap the shape to the asset's canonical footprint so the plan reads
				// as what it builds. Keep the shape's longest side as the width and
				// derive the depth from the asset's aspect.
				const spec = ASSET_SPEC[asset]
				const b = editor.getShapeGeometry(s).bounds
				const long = Math.max(b.width, b.height)
				const w = long
				const h = Math.max(8, long / spec.aspect)
				return { id: s.id, type: 'geo', meta, props: { geo: spec.geo, w, h } }
			})
		)
	}
	return (
		<button
			onPointerDown={(e) => e.stopPropagation()}
			onClick={apply}
			style={{
				font: '600 11px Inter, system-ui, sans-serif',
				color: '#3a352c',
				background: '#f4f1ea',
				border: '1.5px solid #2b2b2b',
				borderRadius: 6,
				padding: '3px 8px',
				cursor: 'pointer',
			}}
		>
			{label}
		</button>
	)
}

// Drop a little starter plan on the first, empty mount so the world isn't blank.
function seedStarterPlan(editor: Editor) {
	if (editor.getCurrentPageShapes().length > 0) return
	const geo = (
		x: number,
		y: number,
		w: number,
		h: number,
		geoType: 'rectangle' | 'ellipse' | 'triangle',
		color: TLDefaultColorStyle,
		meta: { storeys?: number; asset?: KitName } = {}
	): TLShapePartial<TLGeoShape> => ({
		id: createShapeId(),
		type: 'geo',
		x,
		y,
		meta,
		props: { w, h, geo: geoType, color, fill: 'solid' },
	})

	editor.createShapes([
		geo(0, 0, 200, 200, 'ellipse', 'red', { asset: 'pagoda' }), // our pagoda
		geo(300, 40, 130, 110, 'rectangle', 'yellow', { asset: 'house' }),
		geo(300, 240, 120, 120, 'rectangle', 'blue', { storeys: 3 }),
		geo(-70, 260, 140, 90, 'triangle', 'orange', { storeys: 1 }),
		geo(120, 340, 90, 90, 'ellipse', 'green', { asset: 'house' }),
	])
	editor.zoomToFit({ animation: { duration: 0 } })
}
