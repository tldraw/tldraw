import { createPortal } from 'react-dom'
import {
	createShapeId,
	createUserId,
	defaultOverlayUtils,
	Editor,
	InstancePresenceRecordType,
	Tldraw,
	useContainer,
	useEditor,
	useValue,
} from 'tldraw'
import 'tldraw/tldraw.css'
import { demoThreads, openThreadId, toggleThreadResolved } from './comment-pin-demo-state'
import { CommentPinOverlayUtil } from './CommentPinOverlayUtil'

// There's a guide at the bottom of this file!

// [1]
const overlayUtils = [...defaultOverlayUtils, CommentPinOverlayUtil]

// [2]
function onMount(editor: Editor) {
	const rect = createShapeId()
	const oval = createShapeId()
	const done = createShapeId()
	editor.createShapes([
		{ id: rect, type: 'geo', x: 200, y: 200, props: { geo: 'rectangle', w: 200, h: 120 } },
		{ id: oval, type: 'geo', x: 520, y: 320, props: { geo: 'ellipse', w: 160, h: 160 } },
		{ id: done, type: 'geo', x: 260, y: 460, props: { geo: 'rectangle', w: 180, h: 100 } },
	])

	// Seed threads at the shapes' corners, so selecting a shape puts its blue selection outline
	// directly under a pin — the pin should paint on top.
	demoThreads.set([
		{ id: 't1', x: 400, y: 200, color: '#4465e9', initial: 'A', count: 1, resolved: false },
		{ id: 't2', x: 680, y: 320, color: '#e03131', initial: 'B', count: 4, resolved: false },
		{ id: 't3', x: 440, y: 460, color: '#0c8599', initial: 'C', count: 2, resolved: true },
	])

	// [3] A parked collaborator cursor sitting over the first pin. Its util is at zIndex 1100, above
	// the pin at 1050, so it paints on top — the half of the layering the pin move is there to get
	// right. Refreshed on an interval so it stays counted as an active collaborator.
	const peer = InstancePresenceRecordType.create({
		id: InstancePresenceRecordType.createId(editor.store.id),
		currentPageId: editor.getCurrentPageId(),
		userId: createUserId('peer-1'),
		userName: 'Ada',
		cursor: { x: 398, y: 196, type: 'default', rotation: 0 },
		lastActivityTimestamp: Date.now(),
	})
	editor.store.mergeRemoteChanges(() => editor.store.put([peer]))
	editor.timers.setInterval(() => {
		editor.store.mergeRemoteChanges(() =>
			editor.store.put([{ ...peer, lastActivityTimestamp: Date.now() }])
		)
	}, 1000)

	editor.setCurrentTool('select')
}

export default function CommentPinOverlayExample() {
	return (
		<div className="tldraw__editor">
			<Tldraw overlayUtils={overlayUtils} onMount={onMount}>
				{/* [4] */}
				<CommentPopover />
			</Tldraw>
		</div>
	)
}

/**
 * The open thread's popover — the DOM half of the pattern. The marker is on the canvas; this
 * anchors to the marker's screen position and stays a normal React element, so rich text, inputs,
 * and buttons work exactly as they would anywhere else.
 */
function CommentPopover() {
	const editor = useEditor()
	const container = useContainer()

	const open = useValue(
		'open comment popover',
		() => {
			const id = openThreadId.get()
			if (!id) return null
			const thread = demoThreads.get().find((t) => t.id === id)
			if (!thread) return null
			// pageToViewport tracks the camera, so the popover follows pan/zoom.
			const point = editor.pageToViewport({ x: thread.x, y: thread.y })
			return { thread, point }
		},
		[editor]
	)

	if (!open) return null
	const { thread, point } = open

	return createPortal(
		<div
			style={{
				position: 'absolute',
				left: point.x,
				top: point.y,
				transform: 'translate(-50%, calc(-100% - 18px))',
				width: 220,
				background: 'var(--color-panel)',
				borderRadius: 8,
				boxShadow: 'var(--shadow-2)',
				padding: 12,
				zIndex: 400,
				pointerEvents: 'all',
				font: '13px var(--tl-font-sans, sans-serif)',
			}}
			onPointerDown={(e) => e.stopPropagation()}
		>
			<div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
				<div
					style={{
						width: 22,
						height: 22,
						borderRadius: '50%',
						background: thread.resolved ? '#c1c8cd' : thread.color,
						color: '#fff',
						display: 'grid',
						placeItems: 'center',
						fontWeight: 600,
						fontSize: 12,
					}}
				>
					{thread.initial}
				</div>
				<strong>Thread {thread.id.toUpperCase()}</strong>
				<button
					style={{ marginLeft: 'auto', cursor: 'pointer', border: 'none', background: 'none' }}
					onClick={() => openThreadId.set(null)}
				>
					✕
				</button>
			</div>
			<p style={{ margin: '0 0 10px', color: 'var(--color-text-1)' }}>
				{thread.count > 1 ? `${thread.count} comments in this thread.` : 'One comment here.'}
			</p>
			<button
				style={{
					cursor: 'pointer',
					padding: '4px 10px',
					borderRadius: 6,
					border: '1px solid var(--color-muted-1)',
					background: 'var(--color-low)',
				}}
				onClick={() => toggleThreadResolved(thread.id)}
			>
				{thread.resolved ? 'Reopen' : 'Resolve'}
			</button>
		</div>,
		container
	)
}

/*
This example draws comment pins as a canvas overlay and opens each thread's popover on click.

The pin marker is a `CommentPinOverlayUtil` — a canvas-space pseudo-shape, the same kind of object
as the built-in selection handles and collaborator cursors. The thread popover stays in the React
tree. Only the marker is on the canvas.

[1]
Register the util alongside `defaultOverlayUtils`. Its `zIndex` is 1050, which lands it between
`ArrowHintOverlayUtil` (1000) and `CollaboratorCursorOverlayUtil` (1100): above every selection,
brush, snap, and indicator overlay, below collaborator cursors. Because all overlays share one
ordered canvas, that position is a single integer — there's no second canvas to interleave a DOM
layer through.

[2]
Seed some shapes and some threads at their corners. Select a shape: its selection outline draws
under the pin at that corner, and the pin stays on top.

[3]
Park a collaborator cursor over the first pin. Cursors paint at zIndex 1100, so the cursor draws
above the pin — the other half of the ordering, for free from the same z-scale.

[4]
The popover is a child of `<Tldraw>`, so it renders inside the editor context. It reads the open
thread from the shared signal and anchors to the pin's screen position via `editor.pageToViewport`,
which tracks the camera so the popover follows pans and zooms.
*/
