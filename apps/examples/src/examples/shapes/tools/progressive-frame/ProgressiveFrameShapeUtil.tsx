import { useEffect } from 'react'
import {
	atom,
	BaseFrameLikeShapeUtil,
	Editor,
	Geometry2d,
	Group2d,
	HTMLContainer,
	RecordProps,
	Rectangle2d,
	SVGContainer,
	T,
	TLBaseShape,
	TLShape,
	TLShapeId,
	useEditor,
	useUniqueSafeId,
	useValue,
} from 'tldraw'

export const PROGRESSIVE_FRAME_TYPE = 'progressive-frame'

// Module-level signal tracking which progressive frame is currently "focused"
// (zoomed-in with the camera locked), plus the camera position to restore when
// the user exits focus. Null when no frame is focused.
export const focusedFrame$ = atom<{
	id: TLShapeId
	camera: { x: number; y: number; z: number }
} | null>('focused progressive frame', null)

export type IProgressiveFrameShape = TLBaseShape<
	typeof PROGRESSIVE_FRAME_TYPE,
	{
		w: number
		h: number
		title: string
	}
>

declare module 'tldraw' {
	interface TLGlobalShapePropsMap {
		[PROGRESSIVE_FRAME_TYPE]: IProgressiveFrameShape['props']
	}
}

const progressiveFrameProps: RecordProps<IProgressiveFrameShape> = {
	w: T.number,
	h: T.number,
	title: T.string,
}

// Zooms in to a frame, locks the camera, and stores the prior camera so we
// can restore it on exit. Shared between the shape util's onDoubleClick and the
// title input's onDoubleClick (so double-clicking the title text also zooms,
// rather than just selecting the word).
export function zoomToFocusFrame(editor: Editor, shape: IProgressiveFrameShape) {
	const bounds = editor.getShapePageBounds(shape)
	if (!bounds) return
	const prev = editor.getCamera()
	// The expanded title sits above the frame's top edge (top: -32, ~20px tall),
	// so extend the zoom bounds upward to keep it inside the viewport.
	const TITLE_HEADROOM = 40
	editor.zoomToBounds(
		{ x: bounds.x, y: bounds.y - TITLE_HEADROOM, w: bounds.w, h: bounds.h + TITLE_HEADROOM },
		{
			inset: 50,
			animation: { duration: 192 },
		}
	)
	editor.setCameraOptions({ isLocked: true })
	editor.selectNone()
	editor.updateInstanceState({ isFocusMode: true })
	focusedFrame$.set({
		id: shape.id,
		camera: { x: prev.x, y: prev.y, z: prev.z },
	})
}

// Inverse of zoomToFocusFrame: unlocks the camera, clears focus, and restores
// the saved viewport so the user lands back exactly where they were on the
// overview.
export function exitFocusFrame(editor: Editor) {
	const focused = focusedFrame$.get()
	if (!focused) return
	editor.setCameraOptions({ isLocked: false })
	editor.updateInstanceState({ isFocusMode: false })
	focusedFrame$.set(null)
	editor.setCamera(focused.camera, { animation: { duration: 192 } })
}

export class ProgressiveFrameShapeUtil extends BaseFrameLikeShapeUtil<IProgressiveFrameShape> {
	static override type = PROGRESSIVE_FRAME_TYPE
	static override props = progressiveFrameProps

	override getDefaultProps(): IProgressiveFrameShape['props'] {
		return {
			w: 720,
			h: 380,
			title: 'Untitled topic',
		}
	}

	override canResize() {
		return true
	}

	// Suppress the selection rectangle / resize handles so the brief selection
	// that fires before our onDoubleClick (zoom-in) isn't visible. Functionally
	// the frame may still be selected for a moment, but visually nothing happens.
	override hideSelectionBoundsBg() {
		return true
	}
	override hideSelectionBoundsFg() {
		return true
	}
	override hideResizeHandles() {
		return true
	}
	override hideRotateHandle() {
		return true
	}

	override canReceiveNewChildrenOfType(shape: IProgressiveFrameShape, type: TLShape['type']) {
		if (type === PROGRESSIVE_FRAME_TYPE) return false
		return !shape.isLocked
	}

	// While focused (expanded), keep the default frame-like behavior so the body
	// is hollow for hit-testing and clicks pass through to children. While
	// collapsed, return false so the body is solid and interior clicks reach
	// onDoubleClick (which zooms in and focuses the frame).
	override isFrameLike(shape: IProgressiveFrameShape) {
		return focusedFrame$.get()?.id === shape.id
	}

	// Wrapped in a Group2d because the editor's hit-test code has a frame-like
	// branch that expects geometry.children to be iterable for shapes that opt
	// in to special label handling.
	override getGeometry(shape: IProgressiveFrameShape): Geometry2d {
		return new Group2d({
			children: [
				new Rectangle2d({
					width: shape.props.w,
					height: shape.props.h,
					isFilled: true,
				}),
			],
		})
	}

	override onDoubleClick(shape: IProgressiveFrameShape) {
		zoomToFocusFrame(this.editor, shape)
	}

	override getIndicatorPath(shape: IProgressiveFrameShape) {
		const path = new Path2D()
		path.rect(0, 0, shape.props.w, shape.props.h)
		return path
	}

	override component(shape: IProgressiveFrameShape) {
		return <ProgressiveFrameComponent shape={shape} />
	}
}

function ProgressiveFrameComponent({ shape }: { shape: IProgressiveFrameShape }) {
	const editor = useEditor()
	const focusedId = useValue('focused progressive frame id', () => focusedFrame$.get()?.id, [])
	const isCollapsed = focusedId !== shape.id

	// Show a pointer cursor while hovering a collapsed frame to signal that it's
	// clickable / drillable. When focused the frame is hollow for hit-testing, so
	// hover never targets us anyway.
	const isHovered = useValue(
		'progressive frame hover',
		() => editor.getHoveredShapeId() === shape.id,
		[editor, shape.id]
	)
	useEffect(() => {
		if (!isHovered || !isCollapsed) return
		editor.setCursor({ type: 'pointer', rotation: 0 })
		return () => {
			editor.setCursor({ type: 'default', rotation: 0 })
		}
	}, [editor, isHovered, isCollapsed])

	const updateProp = (patch: Partial<IProgressiveFrameShape['props']>) => {
		editor.updateShape<IProgressiveFrameShape>({
			id: shape.id,
			type: PROGRESSIVE_FRAME_TYPE,
			props: patch,
		})
	}

	const shadowId = useUniqueSafeId('progressive-frame-shadow')
	return (
		<>
			<SVGContainer>
				<defs>
					<filter id={shadowId} x="-10%" y="-10%" width="120%" height="130%">
						<feDropShadow dx="0" dy="6" stdDeviation="8" floodColor="#000" floodOpacity="0.12" />
					</filter>
				</defs>
				<rect
					width={shape.props.w}
					height={shape.props.h}
					rx={12}
					ry={12}
					fill="var(--tl-color-panel)"
					stroke="var(--tl-color-divider)"
					strokeWidth={1}
					filter={`url(#${shadowId})`}
				/>
			</SVGContainer>
			<HTMLContainer
				style={{
					width: shape.props.w,
					height: shape.props.h,
				}}
			>
				<FrameTitle shape={shape} isCollapsed={isCollapsed} onChange={updateProp} />
			</HTMLContainer>
		</>
	)
}

// Single animated title element. The same input slides + scales between the
// centered "collapsed" position (big, vertically centered inside the frame) and
// the "expanded" position (small, sitting just above the frame's top edge).
// Using pixel values for `top` in both states lets CSS transition smoothly.
function FrameTitle({
	shape,
	isCollapsed,
	onChange,
}: {
	shape: IProgressiveFrameShape
	isCollapsed: boolean
	onChange(patch: Partial<IProgressiveFrameShape['props']>): void
}) {
	const editor = useEditor()
	const COLLAPSED_INPUT_HEIGHT = 72
	const EXPANDED_TOP = -32

	return (
		<input
			type="text"
			value={shape.props.title}
			onChange={(e) => onChange({ title: e.currentTarget.value })}
			onMouseDown={(e) => {
				// Native double-click word-selection happens on the SECOND mousedown,
				// not on the dblclick event — preventing it there is too late. Block
				// it here when this is the second (or later) click of a sequence.
				if (e.detail >= 2) e.preventDefault()
				e.stopPropagation()
			}}
			onPointerDown={(e) => e.stopPropagation()}
			onPointerUp={(e) => e.stopPropagation()}
			onDoubleClick={(e) => {
				e.preventDefault()
				e.stopPropagation()
				// Belt-and-braces: clear any selection that slipped through and
				// blur the input so it doesn't capture caret state.
				window.getSelection()?.removeAllRanges()
				e.currentTarget.blur()
				if (isCollapsed) zoomToFocusFrame(editor, shape)
			}}
			placeholder="Title"
			style={{
				position: 'absolute',
				left: 0,
				width: '100%',
				top: isCollapsed ? (shape.props.h - COLLAPSED_INPUT_HEIGHT) / 2 : EXPANDED_TOP,
				fontSize: isCollapsed ? 56 : 18,
				fontWeight: 700,
				textAlign: 'center',
				color: 'var(--tl-color-text)',
				background: 'transparent',
				border: 'none',
				outline: 'none',
				padding: 0,
				margin: 0,
				pointerEvents: 'all',
				fontFamily: 'var(--tl-font-sans, system-ui, sans-serif)',
				transition: 'top 220ms ease, font-size 220ms ease',
			}}
		/>
	)
}
