import { useCallback, useEffect, useRef, useState } from 'react'
import {
	Editor,
	TLComment,
	TLCommentAnchor,
	TLCommentThread,
	TLShapeId,
	Tldraw,
	createShapeId,
	toRichText,
} from 'tldraw'
import { AnchoredComment } from '../comments/anchored-comment'
import './anchor-scene.css'

const SENTENCE = 'The quick brown fox jumps over the lazy dog.'

interface Frac {
	left: number
	top: number
	width: number
	height: number
}

interface Target {
	pin: { left: number; top: number }
	textHighlights: Frac[]
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
 * coordinates through the camera, `text-range` measures a DOM range over the shape's text.
 * Every result becomes a fraction of the container so it survives the board's scale-to-fit.
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
			{target?.textHighlights.map((f, i) => (
				<div key={i} className="anchor-scene__text-hl" style={fracStyle(f)} />
			))}
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
	if (anchor.type === 'text-range') {
		const id = createShapeId()
		editor.createShape({
			id,
			type: 'text',
			x: 24,
			y: 76,
			props: { richText: toRichText(SENTENCE), w: 220, autoSize: false, size: 's' },
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
			return { pin: { left: f.left + f.width, top: f.top }, textHighlights: [], region: null }
		}
		case 'point': {
			const f = pageBoxToFrac(editor, c, anchor.x, anchor.y, 0, 0)
			return { pin: { left: f.left, top: f.top }, textHighlights: [], region: null }
		}
		case 'region': {
			const f = pageBoxToFrac(editor, c, anchor.x, anchor.y, anchor.w, anchor.h)
			return { pin: { left: f.left + f.width, top: f.top }, textHighlights: [], region: f }
		}
		case 'page':
			return { pin: { left: 0.05, top: 0.06 }, textHighlights: [], region: null }
		case 'text-range': {
			const richText = findRenderedText(editor)
			if (!richText) return null
			const range = rangeForOffsets(richText, anchor.from, anchor.to)
			if (!range) return null
			const frags = [...range.getClientRects()].map((r) => screenRectToFrac(c, r))
			if (frags.length === 0) return null
			const last = frags[frags.length - 1]
			return {
				pin: { left: last.left + last.width, top: last.top },
				textHighlights: frags,
				region: null,
			}
		}
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

/** A window-absolute DOM rect to a container fraction. */
function screenRectToFrac(c: DOMRect, r: DOMRect): Frac {
	return {
		left: (r.left - c.left) / c.width,
		top: (r.top - c.top) / c.height,
		width: r.width / c.width,
		height: r.height / c.height,
	}
}

/** The visible text shape's rich-text element, excluding the hidden `.tl-text-measure` copy. */
function findRenderedText(editor: Editor): Element | null {
	const nodes = [...editor.getContainer().querySelectorAll('.tl-rich-text')]
	return (
		nodes.find(
			(el) => el.textContent?.includes('quick brown') && !el.closest('.tl-text-measure')
		) ?? null
	)
}

function rangeForOffsets(root: Element, from: number, to: number): Range | null {
	const start = locate(root, from)
	const end = locate(root, to)
	if (!start || !end) return null
	const range = document.createRange()
	range.setStart(start.node, start.offset)
	range.setEnd(end.node, end.offset)
	return range
}

/** Map a character offset within `root` to the text node and in-node offset holding it. */
function locate(root: Element, offset: number): { node: Node; offset: number } | null {
	const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT)
	let acc = 0
	let node = walker.nextNode()
	while (node) {
		const len = node.textContent?.length ?? 0
		if (acc + len >= offset) return { node, offset: offset - acc }
		acc += len
		node = walker.nextNode()
	}
	return null
}
