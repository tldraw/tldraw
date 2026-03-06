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
	userAuth: createShapeId('userAuth'),
	session: createShapeId('session'),
	cache: createShapeId('cache'),
	proxy: createShapeId('proxy'),
	authz: createShapeId('authz'),
	token: createShapeId('token'),
	db: createShapeId('db'),
	middleware: createShapeId('middleware'),
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
			// [7] Group E: arrow path only
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
			{/* [9] */}
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
Stable shape IDs mean the reset function can recreate the same canvas state regardless of
what the user has done since the last reset.

[2]
Wrapping all shape creation in `editor.run()` groups it into a single undo step.

[3]
Group A — text overflow only. The shapes are well-spaced but too narrow for their labels.
`resolveTextWordWrap` widens each shape and shifts it left to keep the center in place.
`resolveShapeOverlaps` leaves them alone because they don't overlap anything.

[4]
Group B — overlap only. The labels fit within the shape width, so `resolveTextWordWrap`
leaves them alone. The shapes are stacked on top of each other, so `resolveShapeOverlaps`
pushes them apart.

[5]
Group C — both issues. The shapes overlap each other and their labels overflow. Both
`resolveTextWordWrap` and `resolveShapeOverlaps` act on this group.

[6]
Group D — no issues. The label fits and the shape doesn't overlap anything. None of the
cleanup passes move or resize it.

[7]
Group E — arrow path only. The label fits and there are no overlaps, but the arrow from
group A to group C passes straight through this shape. Only `rerouteArrows` acts on it,
adjusting the arrow's bend so its path curves around the shape.

[8]
The arrow connects a shape in group A to one in group C. Its straight path crosses group E,
which `rerouteArrows` routes around.

[9]
Guard against re-running setup when the canvas already has shapes (e.g. after a hot-reload).
*/
