import {
	openThreadId,
	useCommentsHidden,
	useCommentThreads,
	usePendingComment,
} from '@tldraw/commenting'
import { useLayoutEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { Editor, TLShapeId, useContainer, useEditor, useValue } from 'tldraw'

interface HighlightRect {
	left: number
	top: number
	width: number
	height: number
}

/**
 * The rendered rich-text element for a shape — the on-canvas one, not the hidden measurement clone
 * (`.tl-text-measure`) tldraw keeps around for autosizing. Returns null while the shape's text DOM
 * isn't mounted (e.g. the shape is culled, or it's being edited through the tiptap overlay).
 */
function findRenderedText(container: HTMLElement, shapeId: TLShapeId): Element | null {
	const shapeEl = container.querySelector(`[data-shape-id="${shapeId}"]`)
	if (!shapeEl) return null
	const nodes = [...shapeEl.querySelectorAll('.tl-rich-text')]
	return nodes.find((el) => !el.closest('.tl-text-measure')) ?? null
}

/** Map a plaintext character offset to a DOM text node + local offset, walking the text nodes in
 *  order. Clamps past-the-end offsets to the end of the last text node. */
function locate(root: Element, offset: number): { node: Node; offset: number } | null {
	const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT)
	let acc = 0
	let node = walker.nextNode()
	let last: Node | null = null
	while (node) {
		const len = node.textContent?.length ?? 0
		if (acc + len >= offset) return { node, offset: offset - acc }
		acc += len
		last = node
		node = walker.nextNode()
	}
	if (last) return { node: last, offset: last.textContent?.length ?? 0 }
	return null
}

/** The client rects (relative to the container) covering a plaintext `[from, to)` range in a
 *  shape's rendered text. Empty when the text isn't measurable this frame. */
function measureRange(
	container: HTMLElement,
	shapeId: TLShapeId,
	from: number,
	to: number
): HighlightRect[] {
	const root = findRenderedText(container, shapeId)
	if (!root) return []
	const start = locate(root, from)
	const end = locate(root, to)
	if (!start || !end) return []
	const range = document.createRange()
	try {
		range.setStart(start.node, start.offset)
		range.setEnd(end.node, end.offset)
	} catch {
		return []
	}
	const c = container.getBoundingClientRect()
	return [...range.getClientRects()].map((r) => ({
		left: r.left - c.left,
		top: r.top - c.top,
		width: r.width,
		height: r.height,
	}))
}

interface TextRangeHighlightProps {
	editor: Editor
	container: HTMLElement
	shapeId: TLShapeId
	from: number
	to: number
	/** A draft highlight (no thread yet) is non-interactive; a committed one opens its thread. */
	onSelect?(): void
}

/**
 * The highlight over a commented character range, kept aligned with the shape's rendered text as
 * the camera and shape move. `from`/`to` are plaintext offsets into the shape's text.
 */
function TextRangeHighlight({
	editor,
	container,
	shapeId,
	from,
	to,
	onSelect,
}: TextRangeHighlightProps) {
	// A token that changes whenever the range's on-screen position could have — the camera, the
	// shape's page transform (which covers parent groups/frames too), and its props (size, text,
	// font — anything that reflows the text). Reading these subscribes the effect below.
	const token = useValue(
		'text-range highlight token',
		() => {
			const cam = editor.getCamera()
			const shape = editor.getShape(shapeId)
			if (!shape) return null
			const transform = editor.getShapePageTransform(shapeId)
			const vsb = editor.getViewportScreenBounds()
			// Editing state matters: the static `.tl-rich-text` we measure only mounts once the shape
			// leaves edit mode, so re-measure when editing ends (e.g. the composer takes focus).
			const editing = editor.getEditingShapeId() === shapeId
			return `${cam.x},${cam.y},${cam.z}|${transform.toCssString()}|${JSON.stringify(shape.props)}|${vsb.w},${vsb.h}|${editing}`
		},
		[editor, shapeId]
	)

	const [rects, setRects] = useState<HighlightRect[]>([])

	// Measure after commit (getClientRects reflects the current layout), then again on the next frame
	// to catch the canvas transform tldraw applies out of band during camera changes. Also re-measure
	// when fonts finish loading — a font swap reflows the text without touching camera or shape.
	useLayoutEffect(() => {
		if (token === null) {
			setRects([])
			return
		}
		const measure = () => setRects(measureRange(container, shapeId, from, to))
		measure()
		const raf = requestAnimationFrame(measure)
		document.fonts.addEventListener('loadingdone', measure)
		return () => {
			cancelAnimationFrame(raf)
			document.fonts.removeEventListener('loadingdone', measure)
		}
	}, [container, shapeId, from, to, token])

	if (rects.length === 0) return null

	return (
		<>
			{rects.map((r, i) => (
				<div
					key={i}
					className="comment-text-range-highlight"
					data-interactive={onSelect ? true : undefined}
					style={{ left: r.left, top: r.top, width: r.width, height: r.height }}
					onPointerDown={
						onSelect
							? (e) => {
									e.stopPropagation()
									onSelect()
								}
							: undefined
					}
				/>
			))}
		</>
	)
}

/**
 * Renders the highlight for every text-range thread and the pending text-range draft. Portaled
 * into the editor container so the container-relative rects from `measureRange` line up.
 */
export function TextRangeHighlights() {
	const editor = useEditor()
	const container = useContainer()
	const threads = useCommentThreads(editor)
	const pending = usePendingComment()

	// Respect the Shift+C "hide comments" toggle, matching CanvasComments — otherwise highlights
	// would stay visible and clickable while the pins and popovers are hidden.
	const commentsHidden = useCommentsHidden()
	if (commentsHidden) return null

	return createPortal(
		<div className="comment-text-ranges-layer">
			{threads.map((thread) => {
				if (thread.anchor.type !== 'text-range') return null
				const { shapeId, from, to } = thread.anchor
				return (
					<TextRangeHighlight
						key={thread.id}
						editor={editor}
						container={container}
						shapeId={shapeId as TLShapeId}
						from={from}
						to={to}
						onSelect={() => openThreadId.set(editor, thread.id)}
					/>
				)
			})}
			{pending?.anchor.type === 'text-range' && (
				<TextRangeHighlight
					key="pending"
					editor={editor}
					container={container}
					shapeId={pending.anchor.shapeId as TLShapeId}
					from={pending.anchor.from}
					to={pending.anchor.to}
				/>
			)}
		</div>,
		container
	)
}
