import { useCallback, useEffect, useRef, useState } from 'react'
import {
	Editor,
	TLComment,
	TLCommentAnchor,
	TLCommentThread,
	TLShapeId,
	Tldraw,
	createShapeId,
} from 'tldraw'
import { AnchoredComment } from '../comments/anchored-comment'
import './anchor-scene.css'

interface Frac {
	left: number
	top: number
	width: number
	height: number
}

interface Target {
	pin: { left: number; top: number }
	region: Frac | null
}

export interface AnchorSceneProps {
	anchor: TLCommentAnchor
	thread: TLCommentThread
	comments: TLComment[]
	open: boolean
}

/**
 * Renders a comment thread anchored via each TLCommentAnchor kind against a real tldraw
 * editor: `shape` creates a geo shape and reads its page bounds, `point`/`region` map page
 * coordinates through the camera. Every result becomes a fraction of the container so it
 * survives the board's scale-to-fit.
 */
export function AnchorScene({ anchor, thread, comments, open }: AnchorSceneProps) {
	const containerRef = useRef<HTMLDivElement>(null)
	const editorRef = useRef<Editor | null>(null)
	const shapeIdRef = useRef<TLShapeId | null>(null)
	const observerRef = useRef<ResizeObserver | null>(null)
	const [target, setTarget] = useState<Target | null>(null)

	const measure = useCallback(() => {
		const editor = editorRef.current
		const container = containerRef.current
		if (!editor || !container) return
		const next = measureAnchor(editor, container, anchor, shapeIdRef.current)
		if (next) setTarget(next)
	}, [anchor])

	const handleMount = useCallback(
		(editor: Editor) => {
			editorRef.current = editor
			shapeIdRef.current = setupAnchor(editor, anchor)
			const container = containerRef.current
			if (container) {
				const observer = new ResizeObserver(() => measure())
				observer.observe(container)
				observerRef.current = observer
			}
			if (document.fonts) void document.fonts.ready.then(() => measure())
			// A few frames to catch async layout (container sizing, font-load reflow).
			let n = 0
			const tick = () => {
				measure()
				if (++n < 8) requestAnimationFrame(tick)
			}
			requestAnimationFrame(tick)
		},
		[anchor, measure]
	)

	useEffect(() => {
		return () => {
			const observer = observerRef.current
			if (observer) observer.disconnect()
		}
	}, [])

	return (
		<div className="anchor-scene" ref={containerRef}>
			<Tldraw hideUi onMount={handleMount} />
			{target?.region && <div className="anchor-scene__region" style={fracStyle(target.region)} />}
			{target && (
				<div
					className="anchor-scene__pin"
					style={{ left: `${target.pin.left * 100}%`, top: `${target.pin.top * 100}%` }}
				>
					<AnchoredComment thread={thread} comments={comments} open={open} />
				</div>
			)}
		</div>
	)
}

function fracStyle(f: Frac) {
	return {
		left: `${f.left * 100}%`,
		top: `${f.top * 100}%`,
		width: `${f.width * 100}%`,
		height: `${f.height * 100}%`,
	}
}

/** Create the anchor's target shape (if any) and frame the camera. Returns the shape id. */
function setupAnchor(editor: Editor, anchor: TLCommentAnchor): TLShapeId | null {
	editor.setCamera({ x: 0, y: 0, z: 1 }, { immediate: true })
	if (anchor.type === 'shape') {
		const id = createShapeId()
		editor.createShape({
			id,
			type: 'geo',
			x: 40,
			y: 96,
			props: { geo: 'rectangle', w: 120, h: 96 },
		})
		return id
	}
	return null
}

function measureAnchor(
	editor: Editor,
	container: HTMLElement,
	anchor: TLCommentAnchor,
	shapeId: TLShapeId | null
): Target | null {
	const c = container.getBoundingClientRect()
	if (c.width === 0) return null
	switch (anchor.type) {
		case 'shape': {
			if (!shapeId) return null
			const b = editor.getShapePageBounds(shapeId)
			if (!b) return null
			const f = pageBoxToFrac(editor, c, b.x, b.y, b.w, b.h)
			// precise pins sit at the stored normalized x/y; imprecise ones at the top-right badge
			const { x, y } = anchor.isPrecise ? anchor : { x: 1, y: 0 }
			return {
				pin: { left: f.left + x * f.width, top: f.top + y * f.height },
				region: null,
			}
		}
		case 'point': {
			const f = pageBoxToFrac(editor, c, anchor.x, anchor.y, 0, 0)
			return { pin: { left: f.left, top: f.top }, region: null }
		}
		case 'region': {
			const f = pageBoxToFrac(editor, c, anchor.x, anchor.y, anchor.w, anchor.h)
			return { pin: { left: f.left + f.width, top: f.top }, region: f }
		}
		case 'page':
			return { pin: { left: 0.05, top: 0.06 }, region: null }
	}
}

/** A page-space box to a container fraction. `pageToScreen` returns window-absolute
 * coordinates (it adds the component's on-screen offset), so subtract the container's
 * origin — same space as the DOM rects. */
function pageBoxToFrac(
	editor: Editor,
	c: DOMRect,
	x: number,
	y: number,
	w: number,
	h: number
): Frac {
	const tl = editor.pageToScreen({ x, y })
	const br = editor.pageToScreen({ x: x + w, y: y + h })
	return {
		left: (tl.x - c.left) / c.width,
		top: (tl.y - c.top) / c.height,
		width: (br.x - tl.x) / c.width,
		height: (br.y - tl.y) / c.height,
	}
}
