import { memo, useMemo, useRef } from 'react'
import {
	Editor,
	TLCommentThread,
	useContainer,
	usePassThroughWheelEvents,
	useTranslation,
	useValue,
} from 'tldraw'
import type { ClusterNode } from '../clustering/types'
import { CountBadge } from '../ui/count-badge'
import { forwardPointerEventToCanvas, isCanvasPanGesture } from './canvas-events'
import { type CommentingContext } from './context'
import { sortThreadsForPreview, ThreadPreview, useMarkerPreview } from './thread-preview'
import { impreciseShapePinInset, isInInflatedViewport } from './thread-state'

/**
 * The count badge standing in for several threads folded together at the current zoom. Hovering it
 * previews its threads as a list; clicking zooms to the zoom level at which the cluster splits.
 *
 * Memoized: cluster nodes and thread records are identity-stable while unchanged, so pins and
 * badges skip re-rendering when the parent re-renders for reasons that don't concern them
 * (leaf recomputes during shape drags, partition changes elsewhere). Camera tracking still
 * works — each component subscribes to its own viewport position via signals, not via props.
 */
export const ClusterBadge = memo(function ClusterBadge({
	editor,
	node,
	onExpand,
	onSelectThread,
	threadsById,
	...props
}: Pick<CommentingContext, 'currentUserId' | 'resolveAuthor'> & {
	editor: Editor
	node: ClusterNode
	onExpand(node: ClusterNode): void
	onSelectThread(thread: TLCommentThread): void
	threadsById: ReadonlyMap<string, TLCommentThread>
}) {
	const container = useContainer()
	const msg = useTranslation()
	const badgeRef = useRef<HTMLButtonElement>(null)
	const { previewShown, previewHandlers } = useMarkerPreview(editor, `cluster:${node.id}`)
	// Wheel pass-through sits on the badge (never scrollable), not the layer root — see the
	// note on the layer.
	usePassThroughWheelEvents(badgeRef)
	// The mean of the members' render offsets, in screen px. Imprecise members' pins draw tucked
	// into their shape (see impreciseShapePinInset), and the merge thresholds are priced at those
	// visual positions — so the badge draws at the centroid of the pins as drawn, which (screen
	// mapping being affine) is the anchor centroid plus this mean. Camera-independent: its own
	// computed so the per-frame point below only adds two numbers, and a cluster of precise
	// members tracks nothing and adds zero.
	const meanInset = useValue(
		'cluster badge inset',
		() => {
			let x = 0
			let y = 0
			for (const id of node.members) {
				const thread = threadsById.get(id)
				if (!thread) continue
				const inset = impreciseShapePinInset(editor, thread.anchor)
				if (inset) {
					x += inset.x
					y += inset.y
				}
			}
			return { x: x / node.count, y: y / node.count }
		},
		[editor, node, threadsById]
	)
	const point = useValue(
		'cluster badge point',
		() => {
			const pagePoint = editor.pageToViewport(node.centroid)
			if (!isInInflatedViewport(editor, pagePoint)) return null
			return { x: pagePoint.x + meanInset.x, y: pagePoint.y + meanInset.y }
		},
		[editor, node, meanInset]
	)

	// `node.members` is sorted by id (the clustering table's ordering); the preview wants them in
	// the order a reader would expect. Only computed while the preview is up.
	const previewThreads = useMemo(() => {
		if (!previewShown) return []
		const threads: TLCommentThread[] = []
		for (const id of node.members) {
			const thread = threadsById.get(id)
			if (thread) threads.push(thread)
		}
		return sortThreadsForPreview(threads)
	}, [previewShown, node.members, threadsById])

	if (!point) return null

	return (
		<>
			<button
				ref={badgeRef}
				type="button"
				className="tlui-cmt-button tlui-cmt-canvas-cluster"
				style={{ left: point.x, top: point.y }}
				aria-label={msg('comments.cluster-label').replace('{count}', String(node.count))}
				onPointerDown={(e) => {
					if (isCanvasPanGesture(editor, e)) {
						forwardPointerEventToCanvas(container, e)
						return
					}
					e.stopPropagation()
				}}
				onClick={(e) => {
					e.stopPropagation()
					onExpand(node)
				}}
				{...previewHandlers}
				onFocus={previewHandlers.onPointerEnter}
				onBlur={previewHandlers.onPointerLeave}
			>
				<CountBadge count={node.count} />
			</button>
			{previewShown && previewThreads.length > 0 && (
				<ThreadPreview
					editor={editor}
					threads={previewThreads}
					variant="list"
					point={point}
					onSelectThread={onSelectThread}
					{...previewHandlers}
					{...props}
				/>
			)}
		</>
	)
})
