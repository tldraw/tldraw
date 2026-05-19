import { useEffect } from 'react'
import {
	createShapeId,
	Editor,
	isShapeId,
	TLArrowShapeProps,
	TLComponents,
	TLGeoShapeProps,
	TLShapeId,
	Tldraw,
	toRichText,
	useEditor,
	useValue,
	VecLike,
} from 'tldraw'
import 'tldraw/tldraw.css'
import {
	exitFocusFrame,
	focusedFrame$,
	IProgressiveFrameShape,
	PROGRESSIVE_FRAME_TYPE,
	ProgressiveFrameShapeUtil,
} from './ProgressiveFrameShapeUtil'

// There's a guide at the bottom of this file!

// [1]
const shapeUtils = [ProgressiveFrameShapeUtil]

// [2]
// Listens for the Escape key while a frame is focused and exits focus mode.
// Returns null — no visible UI. Escape is the only way out now.
function EscapeToExit() {
	const editor = useEditor()
	const focused = useValue('focused progressive frame', () => focusedFrame$.get(), [])

	useEffect(() => {
		if (!focused) return
		const handler = (e: KeyboardEvent) => {
			if (e.key === 'Escape') {
				e.preventDefault()
				e.stopPropagation()
				exitFocusFrame(editor)
			}
		}
		document.addEventListener('keydown', handler, true)
		return () => document.removeEventListener('keydown', handler, true)
	}, [editor, focused])

	return null
}

const components: TLComponents = {
	InFrontOfTheCanvas: EscapeToExit,
}

const tldrawOptions = { createTextOnCanvasDoubleClick: false }

// Top-level layout: one connected architecture diagram. Each rectangle is a
// progressive frame; arrows between them are top-level shapes that show how the
// parts of the system relate. Double-click a frame to zoom in and see the
// sub-diagram for that part.
const FRAME_W = 560
const FRAME_H = 320

interface FrameSpec {
	id: string
	title: string
	x: number
	y: number
	fill(editor: Editor, parentId: TLShapeId, w: number, h: number): void
}

const FRAMES: FrameSpec[] = [
	{ id: 'user', title: 'User', x: 0, y: 480, fill: fillUserFrame },
	{ id: 'react', title: 'React app', x: 760, y: 480, fill: fillReactFrame },
	{ id: 'router', title: 'Router', x: 1520, y: 0, fill: fillRouterFrame },
	{ id: 'store', title: 'State store', x: 1520, y: 960, fill: fillStoreFrame },
	{ id: 'ui', title: 'UI components', x: 2280, y: 480, fill: fillUiFrame },
]

// Top-level edges: source frame id → target frame id.
const FRAME_EDGES: Array<[string, string]> = [
	['user', 'react'],
	['react', 'router'],
	['react', 'store'],
	['router', 'ui'],
	['store', 'ui'],
]

export default function ProgressiveFrameExample() {
	return (
		<div className="tldraw__editor">
			<Tldraw
				shapeUtils={shapeUtils}
				components={components}
				options={tldrawOptions}
				// [3]
				getShapeVisibility={(shape, editor) => {
					if (!shape.parentId || !isShapeId(shape.parentId)) return 'inherit'
					const parent = editor.getShape(shape.parentId)
					if (!parent || parent.type !== PROGRESSIVE_FRAME_TYPE) return 'inherit'
					return focusedFrame$.get()?.id === parent.id ? 'inherit' : 'hidden'
				}}
				// [4]
				onMount={(editor) => {
					const idByKey = new Map<string, TLShapeId>()

					// Create the progressive frames at the top level.
					for (const spec of FRAMES) {
						const id = createShapeId(spec.id)
						idByKey.set(spec.id, id)
						editor.createShape<IProgressiveFrameShape>({
							id,
							type: PROGRESSIVE_FRAME_TYPE,
							x: spec.x,
							y: spec.y,
							props: { w: FRAME_W, h: FRAME_H, title: spec.title },
						})
						spec.fill(editor, id, FRAME_W, FRAME_H)
					}

					// Connect frames with top-level arrows so the canvas reads as one
					// connected architecture diagram.
					for (const [fromKey, toKey] of FRAME_EDGES) {
						const from = FRAMES.find((s) => s.id === fromKey)!
						const to = FRAMES.find((s) => s.id === toKey)!
						const fromCenter = { x: from.x + FRAME_W / 2, y: from.y + FRAME_H / 2 }
						const toCenter = { x: to.x + FRAME_W / 2, y: to.y + FRAME_H / 2 }
						const { start, end } = edgePoints(from, to, fromCenter, toCenter)
						createArrow(editor, undefined, start, end, { size: 'l' })
					}

					editor.zoomToFit({ animation: { duration: 0 } })
				}}
			/>
		</div>
	)
}

// Pick start/end points on the source and target frame boundaries that face
// each other, so arrows look like they connect the rectangles.
function edgePoints(from: FrameSpec, to: FrameSpec, fromC: VecLike, toC: VecLike) {
	const dx = toC.x - fromC.x
	const dy = toC.y - fromC.y
	const horizontal = Math.abs(dx) >= Math.abs(dy)
	if (horizontal) {
		return {
			start: { x: dx > 0 ? from.x + FRAME_W : from.x, y: fromC.y },
			end: { x: dx > 0 ? to.x : to.x + FRAME_W, y: toC.y },
		}
	}
	return {
		start: { x: fromC.x, y: dy > 0 ? from.y + FRAME_H : from.y },
		end: { x: toC.x, y: dy > 0 ? to.y : to.y + FRAME_H },
	}
}

// --- Diagram helpers ---

const NODE_W = 130
const NODE_H = 60

function nodeEdge(
	x: number,
	y: number,
	side: 'top' | 'right' | 'bottom' | 'left'
): { x: number; y: number } {
	switch (side) {
		case 'top':
			return { x: x + NODE_W / 2, y }
		case 'right':
			return { x: x + NODE_W, y: y + NODE_H / 2 }
		case 'bottom':
			return { x: x + NODE_W / 2, y: y + NODE_H }
		case 'left':
			return { x, y: y + NODE_H / 2 }
	}
}

function createNode(
	editor: Editor,
	parentId: TLShapeId,
	x: number,
	y: number,
	label: string,
	color: TLGeoShapeProps['color'] = 'blue'
) {
	editor.createShape({
		type: 'geo',
		parentId,
		x,
		y,
		props: {
			geo: 'rectangle',
			w: NODE_W,
			h: NODE_H,
			color,
			fill: 'semi',
			labelColor: 'black',
			size: 's',
			richText: toRichText(label),
		} satisfies Partial<TLGeoShapeProps>,
	})
}

function createArrow(
	editor: Editor,
	parentId: TLShapeId | undefined,
	start: VecLike,
	end: VecLike,
	opts: { text?: string; size?: TLArrowShapeProps['size'] } = {}
) {
	editor.createShape({
		type: 'arrow',
		parentId,
		x: 0,
		y: 0,
		props: {
			start: { x: start.x, y: start.y },
			end: { x: end.x, y: end.y },
			color: 'grey',
			size: opts.size ?? 's',
			bend: 0,
			...(opts.text ? { richText: toRichText(opts.text) } : null),
		} satisfies Partial<TLArrowShapeProps>,
	})
}

// --- Sub-diagrams (one per frame) ---

function fillUserFrame(editor: Editor, parentId: TLShapeId, _w: number, _h: number) {
	const browser = { x: 60, y: 50 }
	const mobile = { x: 60, y: 210 }
	const events = { x: 370, y: 50 }
	const network = { x: 370, y: 210 }

	createNode(editor, parentId, browser.x, browser.y, 'Browser', 'blue')
	createNode(editor, parentId, mobile.x, mobile.y, 'Mobile device', 'blue')
	createNode(editor, parentId, events.x, events.y, 'Input events', 'orange')
	createNode(editor, parentId, network.x, network.y, 'Network', 'green')

	createArrow(
		editor,
		parentId,
		nodeEdge(browser.x, browser.y, 'right'),
		nodeEdge(events.x, events.y, 'left')
	)
	createArrow(
		editor,
		parentId,
		nodeEdge(mobile.x, mobile.y, 'right'),
		nodeEdge(events.x, events.y, 'left')
	)
	createArrow(
		editor,
		parentId,
		nodeEdge(events.x, events.y, 'bottom'),
		nodeEdge(network.x, network.y, 'top')
	)
}

function fillReactFrame(editor: Editor, parentId: TLShapeId, _w: number, _h: number) {
	const tree = { x: 60, y: 50 }
	const hooks = { x: 60, y: 210 }
	const effects = { x: 370, y: 50 }
	const refs = { x: 370, y: 210 }
	const dom = { x: 215, y: 130 }

	createNode(editor, parentId, tree.x, tree.y, 'Component tree', 'blue')
	createNode(editor, parentId, hooks.x, hooks.y, 'Hooks', 'violet')
	createNode(editor, parentId, effects.x, effects.y, 'Effects', 'orange')
	createNode(editor, parentId, refs.x, refs.y, 'Refs', 'green')
	createNode(editor, parentId, dom.x, dom.y, 'Virtual DOM', 'red')

	createArrow(editor, parentId, nodeEdge(tree.x, tree.y, 'right'), nodeEdge(dom.x, dom.y, 'left'))
	createArrow(editor, parentId, nodeEdge(hooks.x, hooks.y, 'right'), nodeEdge(dom.x, dom.y, 'left'))
	createArrow(
		editor,
		parentId,
		nodeEdge(dom.x, dom.y, 'right'),
		nodeEdge(effects.x, effects.y, 'left')
	)
	createArrow(editor, parentId, nodeEdge(dom.x, dom.y, 'right'), nodeEdge(refs.x, refs.y, 'left'))
}

function fillRouterFrame(editor: Editor, parentId: TLShapeId, _w: number, _h: number) {
	const url = { x: 60, y: 130 }
	const matcher = { x: 215, y: 50 }
	const guards = { x: 215, y: 210 }
	const loader = { x: 370, y: 130 }

	createNode(editor, parentId, url.x, url.y, 'URL', 'grey')
	createNode(editor, parentId, matcher.x, matcher.y, 'Route matcher', 'violet')
	createNode(editor, parentId, guards.x, guards.y, 'Guards', 'red')
	createNode(editor, parentId, loader.x, loader.y, 'Data loader', 'green')

	createArrow(
		editor,
		parentId,
		nodeEdge(url.x, url.y, 'right'),
		nodeEdge(matcher.x, matcher.y, 'left')
	)
	createArrow(
		editor,
		parentId,
		nodeEdge(url.x, url.y, 'right'),
		nodeEdge(guards.x, guards.y, 'left')
	)
	createArrow(
		editor,
		parentId,
		nodeEdge(matcher.x, matcher.y, 'right'),
		nodeEdge(loader.x, loader.y, 'left')
	)
	createArrow(
		editor,
		parentId,
		nodeEdge(guards.x, guards.y, 'right'),
		nodeEdge(loader.x, loader.y, 'left')
	)
}

function fillStoreFrame(editor: Editor, parentId: TLShapeId, _w: number, _h: number) {
	const action = { x: 60, y: 130 }
	const reducer = { x: 215, y: 130 }
	const state = { x: 370, y: 50 }
	const selector = { x: 370, y: 210 }

	createNode(editor, parentId, action.x, action.y, 'Action', 'orange')
	createNode(editor, parentId, reducer.x, reducer.y, 'Reducer', 'violet')
	createNode(editor, parentId, state.x, state.y, 'State tree', 'blue')
	createNode(editor, parentId, selector.x, selector.y, 'Selectors', 'green')

	createArrow(
		editor,
		parentId,
		nodeEdge(action.x, action.y, 'right'),
		nodeEdge(reducer.x, reducer.y, 'left')
	)
	createArrow(
		editor,
		parentId,
		nodeEdge(reducer.x, reducer.y, 'right'),
		nodeEdge(state.x, state.y, 'left')
	)
	createArrow(
		editor,
		parentId,
		nodeEdge(state.x, state.y, 'bottom'),
		nodeEdge(selector.x, selector.y, 'top')
	)
}

function fillUiFrame(editor: Editor, parentId: TLShapeId, _w: number, _h: number) {
	const layout = { x: 60, y: 50 }
	const button = { x: 60, y: 210 }
	const input = { x: 370, y: 50 }
	const modal = { x: 370, y: 210 }
	const tokens = { x: 215, y: 130 }

	createNode(editor, parentId, layout.x, layout.y, 'Layout', 'blue')
	createNode(editor, parentId, button.x, button.y, 'Button', 'green')
	createNode(editor, parentId, input.x, input.y, 'Input', 'orange')
	createNode(editor, parentId, modal.x, modal.y, 'Modal', 'red')
	createNode(editor, parentId, tokens.x, tokens.y, 'Design tokens', 'violet')

	createArrow(
		editor,
		parentId,
		nodeEdge(tokens.x, tokens.y, 'top'),
		nodeEdge(layout.x, layout.y, 'bottom')
	)
	createArrow(
		editor,
		parentId,
		nodeEdge(tokens.x, tokens.y, 'top'),
		nodeEdge(input.x, input.y, 'bottom')
	)
	createArrow(
		editor,
		parentId,
		nodeEdge(tokens.x, tokens.y, 'bottom'),
		nodeEdge(button.x, button.y, 'top')
	)
	createArrow(
		editor,
		parentId,
		nodeEdge(tokens.x, tokens.y, 'bottom'),
		nodeEdge(modal.x, modal.y, 'top')
	)
}

/*
Introduction:

This example shows a custom container shape — a "progressive disclosure frame" — used to build
a zoomable architecture diagram. The canvas shows one connected diagram: User → React app →
Router / State store → UI components. Each rectangle is a progressive frame; double-click one
to zoom in and reveal the sub-diagram for that part of the system. Press "Back to overview" or
Escape to step out and see the whole diagram again.

[1]
We register a single custom shape: the progressive frame. See ProgressiveFrameShapeUtil for the
implementation. It extends BaseFrameLikeShapeUtil so it can hold child shapes and clip them to
its bounds. It blocks nesting and uses double-click to "zoom in, lock the camera, and reveal
contents". While focused the frame is hollow for hit-testing so clicks fall through to its
children; while collapsed it's solid so the double-click registers.

[2]
The ExitFrameButton renders whenever a frame is focused (tracked via the focusedFrame$ signal
in ProgressiveFrameShapeUtil, which also stores the camera position from before the
double-click). Clicking it — or pressing Escape — unlocks the camera, clears the focus, and
restores the saved camera. We also disable createTextOnCanvasDoubleClick on the editor so
double-clicking the frame body doesn't try to create a text shape.

[3]
getShapeVisibility hides every shape whose parent is a progressive frame that isn't currently
focused. Because the callback reads from focusedFrame$ — itself an atom — the visibility cache
re-evaluates whenever the focus changes, so children appear and disappear automatically.

[4]
On mount we lay out five progressive frames at the canvas level in the same shape as a typical
frontend architecture (User, React app, Router, State store, UI components), connected by
plain arrows. Inside each frame we draw a small sub-diagram with its own internal components
and arrows. So you can take in the whole system at a glance, then drill into any piece.
*/
