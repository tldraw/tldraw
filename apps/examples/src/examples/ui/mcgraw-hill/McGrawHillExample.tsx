import { useCallback, useRef, useState } from 'react'
import { TLComponents, Tldraw, createShapeId, track, useEditor } from 'tldraw'
import 'tldraw/tldraw.css'
import './mcgraw-hill.css'
import mcgrawHillPageUrl from './index.html?url'

// There's a guide at the bottom of this file!

// [1] The McGraw-Hill page has a natural layout width around this size. We
// render the iframe at fixed pixel dimensions in page-space; tldraw scales it
// with the camera transform.
const PAGE_WIDTH = 1024
const PAGE_HEIGHT = 820

// [2] Inject a stylesheet into the iframe (same-origin, served by Vite) so
// the ALEKS page's own drawing toolbar is hidden - our floating toolbar
// replaces it.
function onIframeLoad(e: React.SyntheticEvent<HTMLIFrameElement>) {
	try {
		const doc = e.currentTarget.contentDocument
		if (!doc) return
		const style = doc.createElement('style')
		style.textContent =
			'#menubar_undefined_0_figed, #menu_tooltip_menubar_undefined_0_figed { display: none !important; }'
		doc.head.appendChild(style)
	} catch {
		// cross-origin iframes can't be mutated; safe to ignore
	}
}

// [3] Rendered as an `OnTheCanvas` component so it lives inside tldraw's
// camera-transformed layer and scales / pans with the editor camera.
function McGrawHillBackdrop() {
	return (
		<iframe
			src={mcgrawHillPageUrl}
			title="McGraw-Hill ALEKS"
			className="mh-backdrop"
			onLoad={onIframeLoad}
			style={{
				position: 'absolute',
				top: 0,
				left: 0,
				width: PAGE_WIDTH,
				height: PAGE_HEIGHT,
			}}
		/>
	)
}

const components: TLComponents = {
	Background: null,
	OnTheCanvas: McGrawHillBackdrop,
}

export default function McGrawHillExample() {
	return (
		<div className="tldraw__editor mh-root">
			<Tldraw persistenceKey="mcgraw-hill-annotation" hideUi components={components}>
				<AnnotationToolbar />
			</Tldraw>
		</div>
	)
}

// [4] The floating toolbar. Reactive to the editor's current tool via `track`
// so the active button highlights correctly. Draggable via a small handle
// strip along the top.
const AnnotationToolbar = track(function AnnotationToolbar() {
	const editor = useEditor()
	const currentTool = editor.getCurrentToolId()

	const [pos, setPos] = useState({ x: 320, y: 180 })
	const drag = useRef<{ startX: number; startY: number; origX: number; origY: number } | null>(
		null
	)

	const onHandlePointerDown = useCallback(
		(e: React.PointerEvent<HTMLDivElement>) => {
			e.currentTarget.setPointerCapture(e.pointerId)
			drag.current = {
				startX: e.clientX,
				startY: e.clientY,
				origX: pos.x,
				origY: pos.y,
			}
		},
		[pos.x, pos.y]
	)

	const onHandlePointerMove = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
		if (!drag.current) return
		setPos({
			x: drag.current.origX + (e.clientX - drag.current.startX),
			y: drag.current.origY + (e.clientY - drag.current.startY),
		})
	}, [])

	const onHandlePointerUp = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
		drag.current = null
		if (e.currentTarget.hasPointerCapture(e.pointerId)) {
			e.currentTarget.releasePointerCapture(e.pointerId)
		}
	}, [])

	const insertDesmos = useCallback(() => {
		const id = createShapeId()
		const viewport = editor.getViewportPageBounds()
		const w = 560
		const h = 360
		editor.createShape({
			id,
			type: 'embed',
			x: viewport.center.x - w / 2,
			y: viewport.center.y - h / 2,
			props: {
				w,
				h,
				url: 'https://www.desmos.com/calculator/auubsajefh',
			},
		})
		editor.setCurrentTool('select')
		editor.select(id)
	}, [editor])

	const resetAnnotations = useCallback(() => {
		const ids = Array.from(editor.getCurrentPageShapeIds())
		if (ids.length) editor.deleteShapes(ids)
	}, [editor])

	return (
		<div
			className="mh-toolbar"
			style={{ left: pos.x, top: pos.y }}
			onPointerDown={editor.markEventAsHandled}
		>
			<div
				className="mh-toolbar__handle"
				onPointerDown={onHandlePointerDown}
				onPointerMove={onHandlePointerMove}
				onPointerUp={onHandlePointerUp}
				onPointerCancel={onHandlePointerUp}
				aria-label="Drag toolbar"
			>
				<span className="mh-toolbar__grip" />
				<span className="mh-toolbar__grip" />
				<span className="mh-toolbar__grip" />
			</div>
			<div className="mh-toolbar__group">
				<ToolButton
					label="Eraser"
					isActive={currentTool === 'eraser'}
					onClick={() => editor.setCurrentTool('eraser')}
				>
					<EraserIcon />
				</ToolButton>
				<ToolButton
					label="Pencil"
					isActive={currentTool === 'draw'}
					onClick={() => editor.setCurrentTool('draw')}
				>
					<PencilIcon />
				</ToolButton>
				<ToolButton
					label="Line"
					isActive={currentTool === 'line'}
					onClick={() => editor.setCurrentTool('line')}
				>
					<LineIcon />
				</ToolButton>
			</div>
			<div className="mh-toolbar__group mh-toolbar__group--secondary">
				<ToolButton label="Clear annotations" onClick={resetAnnotations}>
					<XIcon />
				</ToolButton>
				<ToolButton label="Undo" onClick={() => editor.undo()}>
					<UndoIcon />
				</ToolButton>
			</div>
			{/* [5] Desmos button – inserts a live Desmos graph as an embed shape */}
			<button className="mh-desmos-button" onClick={insertDesmos}>
				<DesmosIcon />
				<span>Insert Desmos graph</span>
			</button>
		</div>
	)
})

function ToolButton({
	label,
	isActive,
	onClick,
	children,
}: {
	label: string
	isActive?: boolean
	onClick(): void
	children: React.ReactNode
}) {
	return (
		<button
			className="mh-tool-button"
			data-active={isActive ? 'true' : undefined}
			onClick={onClick}
			title={label}
			aria-label={label}
		>
			{children}
		</button>
	)
}

function EraserIcon() {
	return (
		<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
			<path d="M15.5 4.5l4 4a2 2 0 0 1 0 2.83l-7.17 7.17a2 2 0 0 1-2.83 0L5.5 14.5a2 2 0 0 1 0-2.83l7.17-7.17a2 2 0 0 1 2.83 0Z" />
			<path d="M9 8l7 7" />
			<path d="M4 20h10" strokeLinecap="round" />
		</svg>
	)
}

function PencilIcon() {
	return (
		<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
			<path d="M3 21l4-1 12-12-3-3L4 17l-1 4Z" strokeLinejoin="round" />
			<path d="M14 6l3 3" />
			<path d="M16 4l3 3" />
		</svg>
	)
}

function LineIcon() {
	return (
		<svg
			viewBox="0 0 24 24"
			fill="none"
			stroke="currentColor"
			strokeWidth="1.6"
			strokeLinecap="round"
		>
			<path d="M5 19L19 5" />
			<path d="M3 18l4 2" />
			<path d="M4 16l3 5" />
			<path d="M17 3l4 2" />
			<path d="M18 2l3 5" />
		</svg>
	)
}

function XIcon() {
	return (
		<svg
			viewBox="0 0 24 24"
			fill="none"
			stroke="currentColor"
			strokeWidth="1.8"
			strokeLinecap="round"
		>
			<path d="M6 6l12 12" />
			<path d="M18 6L6 18" />
		</svg>
	)
}

function UndoIcon() {
	return (
		<svg
			viewBox="0 0 24 24"
			fill="none"
			stroke="currentColor"
			strokeWidth="1.6"
			strokeLinecap="round"
			strokeLinejoin="round"
		>
			<path d="M9 14L4 9l5-5" />
			<path d="M4 9h9a7 7 0 0 1 7 7v0a7 7 0 0 1-7 7h-3" />
		</svg>
	)
}

function DesmosIcon() {
	return (
		<svg
			viewBox="0 0 24 24"
			fill="none"
			stroke="currentColor"
			strokeWidth="1.6"
			strokeLinecap="round"
			strokeLinejoin="round"
		>
			<rect x="3" y="3" width="18" height="18" rx="3" />
			<path d="M3 15c3 0 4-8 7-8s4 11 7 11" />
		</svg>
	)
}

/*
This example demonstrates how to use tldraw as an annotation layer on top of an
existing web page. It loads the McGraw-Hill ALEKS assignment preview (a full
static HTML page) inside an iframe and layers a transparent tldraw editor on
top so that students can mark up the question with drawing tools.

[1] / [3]
We put the iframe inside an `OnTheCanvas` component. `OnTheCanvas` components
render inside tldraw's camera-transformed layer (between the background and
the shapes), so they pan and zoom in lockstep with the editor camera. That
means the McGraw-Hill page scales with tldraw's zoom and moves with the pan -
the annotations on top stay perfectly aligned with the content beneath.

[2]
Because the iframe is same-origin (served by Vite from this example folder)
we can reach into its document once it loads to hide its own drawing toolbar.
Our custom toolbar drives the tldraw editor underneath.

[4]
`hideUi` removes tldraw's default toolbar and menus; `Background: null` in
`components` makes tldraw's background transparent so the iframe beneath
shows through. Children passed to `<Tldraw>` render inside its context and
get access to the editor via `useEditor`. The toolbar is positioned in
screen space (so it never zooms) and is draggable via a small grip handle
along the top.

[5]
`editor.createShape` with `type: 'embed'` and a Desmos URL inserts a live,
interactive Desmos graph on the canvas. tldraw ships with a built-in Desmos
embed definition so the URL is handled automatically – see
`defaultEmbedDefinitions` in the tldraw package.
*/
