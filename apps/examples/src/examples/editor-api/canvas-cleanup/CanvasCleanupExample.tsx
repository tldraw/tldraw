import {
	cleanupCanvas,
	createShapeId,
	Editor,
	rerouteArrows,
	resolveShapeOverlaps,
	resolveTextWordWrap,
	Tldraw,
	TldrawUiButton,
	toRichText,
	useEditor,
} from 'tldraw'
import 'tldraw/tldraw.css'
import './canvas-cleanup.css'

// [1]
const IDS = {
	// Group A: text overflow only — spaced apart, but too narrow for their labels
	userAuth: createShapeId('userAuth'),
	session: createShapeId('session'),
	// Group B: overlap only — labels fit, but shapes are piled on top of each other
	cache: createShapeId('cache'),
	proxy: createShapeId('proxy'),
	// Group C: both issues — overlapping AND labels overflow
	authz: createShapeId('authz'),
	token: createShapeId('token'),
	// Group D: no issues — label fits, no overlap (should be untouched)
	db: createShapeId('db'),
	// Group E: arrow path only — sits across the arrow, no text or overlap issues
	middleware: createShapeId('middleware'),
	// Arrow connecting group A to group C (passes through group E)
	arrow: createShapeId('arrow'),
}

function setupCanvas(editor: Editor) {
	// [2]
	editor.run(() => {
		editor.deleteShapes([...editor.getCurrentPageShapeIds()])

		editor.createShapes([
			// [3] Group A: text overflow only
			{
				id: IDS.userAuth,
				type: 'geo',
				x: 50,
				y: 80,
				props: { w: 70, h: 60, color: 'blue', richText: toRichText('UserAuthentication') },
			},
			{
				id: IDS.session,
				type: 'geo',
				x: 50,
				y: 260,
				props: { w: 70, h: 60, color: 'blue', richText: toRichText('SessionStorage') },
			},
			// [4] Group B: overlap only
			{
				id: IDS.cache,
				type: 'geo',
				x: 310,
				y: 80,
				props: { w: 120, h: 60, color: 'green', richText: toRichText('Cache') },
			},
			{
				id: IDS.proxy,
				type: 'geo',
				x: 345,
				y: 110,
				props: { w: 120, h: 60, color: 'green', richText: toRichText('Proxy') },
			},
			// [5] Group C: both issues
			{
				id: IDS.authz,
				type: 'geo',
				x: 570,
				y: 80,
				props: { w: 70, h: 60, color: 'red', richText: toRichText('Authorization') },
			},
			{
				id: IDS.token,
				type: 'geo',
				x: 600,
				y: 110,
				props: { w: 70, h: 60, color: 'red', richText: toRichText('TokenRefresh') },
			},
			// [6] Group D: no issues
			{
				id: IDS.db,
				type: 'geo',
				x: 340,
				y: 310,
				props: { w: 130, h: 60, color: 'violet', richText: toRichText('Database') },
			},
			// [7] Group E: arrow path only — label and size are fine, no overlap with anything,
			// but the arrow from group A to group C passes straight through it.
			{
				id: IDS.middleware,
				type: 'geo',
				x: 280,
				y: 75,
				props: { w: 110, h: 60, color: 'orange', richText: toRichText('Middleware') },
			},
		])

		// [8]
		editor.createShape({ id: IDS.arrow, type: 'arrow', props: { color: 'grey' } })
		editor.createBindings([
			{
				type: 'arrow',
				fromId: IDS.arrow,
				toId: IDS.userAuth,
				props: {
					terminal: 'start',
					normalizedAnchor: { x: 0.5, y: 0.5 },
					isExact: false,
					isPrecise: false,
				},
			},
			{
				type: 'arrow',
				fromId: IDS.arrow,
				toId: IDS.authz,
				props: {
					terminal: 'end',
					normalizedAnchor: { x: 0.5, y: 0.5 },
					isExact: false,
					isPrecise: false,
				},
			},
		])

		editor.zoomToFit({ animation: { duration: 300 } })
	})
}

// [9]
function Controls() {
	const editor = useEditor()

	return (
		<div className="tlui-menu canvas-cleanup-controls">
			<TldrawUiButton type="normal" onClick={() => setupCanvas(editor)}>
				Reset messy canvas
			</TldrawUiButton>
			<TldrawUiButton type="normal" onClick={() => resolveTextWordWrap(editor)}>
				Fix word wrap
			</TldrawUiButton>
			<TldrawUiButton type="normal" onClick={() => resolveShapeOverlaps(editor)}>
				Fix overlaps
			</TldrawUiButton>
			<TldrawUiButton type="normal" onClick={() => rerouteArrows(editor)}>
				Reroute arrows
			</TldrawUiButton>
			<TldrawUiButton type="normal" onClick={() => cleanupCanvas(editor)}>
				Clean up all
			</TldrawUiButton>
			<TldrawUiButton type="normal" onClick={() => editor.undo()}>
				Undo
			</TldrawUiButton>
		</div>
	)
}

export default function CanvasCleanupExample() {
	return (
		<div className="tldraw__editor">
			{/* [10] */}
			<Tldraw
				onMount={(editor) => {
					if (editor.getCurrentPageShapeIds().size > 0) return
					setupCanvas(editor)
				}}
				components={{ TopPanel: Controls }}
			/>
		</div>
	)
}

/*
[1]
Stable shape IDs let the reset function reliably recreate the same state regardless of
what the user has done since the last reset.

[2]
Wrap all shape creation in `editor.run()` so it counts as a single undo step, keeping
the undo history clean.

[3]
Group A — text overflow only. The shapes are well-spaced so `resolveShapeOverlaps` won't
touch them, but their widths are too small for the label words. `resolveTextWordWrap` widens
each shape and shifts it left so the center stays in place.

[4]
Group B — overlap only. Labels ("Cache", "Proxy") are short enough to fit within the shape
width, so `resolveTextWordWrap` leaves them alone. The shapes are deliberately piled on top
of each other, so `resolveShapeOverlaps` will push them apart.

[5]
Group C — both issues. The shapes overlap each other AND their labels overflow. Both passes
will act on this group.

[6]
Group D — no issues. The label fits within the shape width and the shape doesn't overlap
anything. None of the cleanup passes should move or resize it, demonstrating that clean
shapes are left untouched.

[7]
Group E — arrow path only. The label fits and there are no overlaps, but the arrow from
group A to group C passes straight through this shape. `resolveTextWordWrap` and
`resolveShapeOverlaps` leave it untouched; only `rerouteArrows` acts on it by adjusting
the arrow's bend so its path curves around the shape.

[8]
The arrow connects a shape from group A to one in group C. Its straight path crosses group E
(Middleware), which `rerouteArrows` will route around. As the overlap pass moves the endpoint
shapes, the arrow reroutes automatically — no extra work required for that part.

[9]
The Controls component is rendered via the `TopPanel` slot so it sits inside the canvas.
Each button calls one of the four cleanup utilities:
- `resolveTextWordWrap`: widens shapes whose labels would break a word across lines.
- `resolveShapeOverlaps`: pushes overlapping shapes apart until each pair has ≥ 20px of space.
- `rerouteArrows`: adjusts arrow bend values so paths avoid non-endpoint bystander shapes.
- `cleanupCanvas`: runs all three in order as a single undoable step.

[10]
Guard against re-running setup when the canvas already has shapes (e.g. after a hot-reload).
*/
