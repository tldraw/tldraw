import {
	CanvasComments,
	CommentAuthor,
	CommentTool,
	commentToolOverrides,
	type CommentingOptions,
} from '@tldraw/commenting'
import { useCallback, useMemo } from 'react'
import {
	commentSchemaRecords,
	createComment,
	createCommentThread,
	createTLSchema,
	createTLStore,
	Editor,
	TLComponents,
	Tldraw,
	toRichText,
} from 'tldraw'
import './region-comments.css'

// A tiny local user directory so the flow shows names and colors instead of ids.
const AUTHORS: Record<string, CommentAuthor> = {
	me: { name: 'You', color: '#EC5E41' },
	ada: { name: 'Ada Lovelace', color: '#0E9F6E' },
}
const resolveAuthor = (id: string): CommentAuthor => AUTHORS[id] ?? { name: id }

export interface RegionCommentsFlowProps {
	/** The region behaviour to showcase, as commenting options layered over the flow's baseline
	 *  (region enabled). Each sketch overrides the `region*` dimension(s) it's demonstrating. */
	options?: Partial<CommentingOptions>
	/** Seed a region comment so the variant can be exercised without drawing one first. Default true;
	 *  the creation-flow sketch turns it off to start from an empty canvas. */
	seeded?: boolean
}

const components: TLComponents = {
	InFrontOfTheCanvas: () => <CanvasComments currentUserId="me" resolveAuthor={resolveAuthor} />,
}

/**
 * The region-comment flow on a live editor: the comment tool configured with region enabled (drag
 * out an area), plus the `CanvasComments` overlay. Runs on an in-memory store, so each sketch is an
 * isolated playground for one interaction variant.
 */
export function RegionCommentsFlow({ options, seeded = true }: RegionCommentsFlowProps) {
	const store = useMemo(
		() => createTLStore({ schema: createTLSchema({ records: commentSchemaRecords }) }),
		[]
	)
	// Options are fixed at tool registration, and each sketch is its own mount — so a configured
	// tool per sketch is all a variant needs.
	const tools = useMemo(
		() => [CommentTool.configure({ enableRegions: true, ...options })],
		[options]
	)
	// Seed one region comment so hover/move/resize variants have something to act on immediately.
	const handleMount = useCallback(
		(editor: Editor) => {
			if (!seeded) return
			// Idempotent — React strict mode mounts twice in dev; a second seed would duplicate the
			// thread and cluster the pair into a count badge instead of showing one region.
			if (editor.store.allRecords().some((r) => (r.typeName as string) === 'comment-thread')) {
				return
			}
			const pageId = editor.getCurrentPageId()
			const thread = createCommentThread({
				pageId,
				// Upper-left of the canvas, clear of the floating toolbar (lower-centre) so the region and
				// its bottom-right pin are visible without scrolling.
				anchor: { type: 'region', x: 90, y: 60, w: 300, h: 150 },
				createdBy: 'ada',
			})
			const comment = createComment({
				threadId: thread.id,
				pageId,
				authorId: 'ada',
				body: toRichText('Should this area use the brand palette?'),
			})
			editor.store.put([thread as any, comment as any])
		},
		[seeded]
	)
	return (
		<div className="region-comments-flow">
			<Tldraw
				store={store}
				tools={tools}
				overrides={[commentToolOverrides]}
				components={components}
				onMount={handleMount}
			/>
		</div>
	)
}
