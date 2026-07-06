import { useCallback, useEffect, useRef, useState } from 'react'
import { Editor, Tldraw, createShapeId, toRichText } from 'tldraw'
import { Comment, CommentThread } from '../../comment-model'
import { AnchoredComment } from '../comments/anchored-comment'
import './text-range-anchor.css'

const SENTENCE = 'The quick brown fox jumps over the lazy dog.'

export interface TextRangeAnchorProps {
	thread: CommentThread
	comments: Comment[]
	open: boolean
	from: number
	to: number
}

interface Frac {
	left: number
	top: number
	width: number
	height: number
}

/**
 * Anchors a comment thread to a character range inside a real tldraw text shape: the
 * highlight and pin are measured from the shape's rendered text (a DOM range over the
 * from/to offsets), not mocked. Positions are stored as fractions of the container so
 * they survive the outer scale-to-fit transform on the board.
 */
export function TextRangeAnchor({ thread, comments, open, from, to }: TextRangeAnchorProps) {
	const containerRef = useRef<HTMLDivElement>(null)
	const editorRef = useRef<Editor | null>(null)
	const observerRef = useRef<ResizeObserver | null>(null)
	// One fraction per line fragment of the range (a wrapped range spans several lines).
	const [rects, setRects] = useState<Frac[] | null>(null)

	const measure = useCallback(() => {
		const editor = editorRef.current
		const container = containerRef.current
		if (!editor || !container) return
		const richText = findRenderedText(editor)
		if (!richText) return
		const range = rangeForOffsets(richText, from, to)
		if (!range) return
		const c = container.getBoundingClientRect()
		const fragments = [...range.getClientRects()]
		if (c.width === 0 || fragments.length === 0) return
		setRects(
			fragments.map((r) => ({
				left: (r.left - c.left) / c.width,
				top: (r.top - c.top) / c.height,
				width: r.width / c.width,
				height: r.height / c.height,
			}))
		)
	}, [from, to])

	const handleMount = useCallback(
		(editor: Editor) => {
			editorRef.current = editor
			editor.createShape({
				id: createShapeId('text-range'),
				type: 'text',
				x: 0,
				y: 0,
				props: { richText: toRichText(SENTENCE), w: 220, autoSize: false, size: 's' },
			})
			editor.setCamera({ x: 40, y: 70, z: 1 }, { immediate: true })
			// Observe the rendered text once it's in the DOM, so we re-measure when it
			// reflows (the draw font loads async and shifts the text).
			const attach = () => {
				const el = findRenderedText(editor)
				const container = containerRef.current
				if (!el || !container) {
					requestAnimationFrame(attach)
					return
				}
				measure()
				const observer = new ResizeObserver(() => measure())
				observer.observe(el)
				observer.observe(container)
				observerRef.current = observer
				if (document.fonts) void document.fonts.ready.then(() => measure())
			}
			requestAnimationFrame(attach)
		},
		[measure]
	)

	useEffect(() => {
		return () => {
			const observer = observerRef.current
			if (observer) observer.disconnect()
		}
	}, [])

	const lastRect = rects?.[rects.length - 1]
	return (
		<div className="tra" ref={containerRef}>
			<Tldraw hideUi onMount={handleMount} />
			{rects?.map((f, i) => (
				<div
					key={i}
					className="tra-highlight"
					style={{
						left: `${f.left * 100}%`,
						top: `${f.top * 100}%`,
						width: `${f.width * 100}%`,
						height: `${f.height * 100}%`,
					}}
				/>
			))}
			{lastRect && (
				<div
					className="tra-pin"
					style={{
						left: `${(lastRect.left + lastRect.width) * 100}%`,
						top: `${lastRect.top * 100}%`,
					}}
				>
					<AnchoredComment thread={thread} comments={comments} open={open} />
				</div>
			)}
		</div>
	)
}

/** The visible text shape's rich-text element. tldraw also renders a hidden copy inside
 * `.tl-text-measure` for sizing, so exclude that (scoping to `.tl-shapes` is ambiguous when
 * this whole editor is itself nested inside another editor's shapes layer). */
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
