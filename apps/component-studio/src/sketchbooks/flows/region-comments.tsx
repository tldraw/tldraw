import {
	CanvasComments,
	commentToolOverrides,
	commentTools,
	RegionCommentOptions,
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

// A tiny local user directory so the flow shows names instead of ids.
const NAMES: Record<string, string> = { me: 'You', ada: 'Ada Lovelace' }
const resolveName = (id: string): string => NAMES[id] ?? id

export interface RegionCommentsFlowProps {
	/** The region behaviour to showcase. Region is always enabled in this flow; each sketch overrides
	 *  the dimension(s) it's demonstrating. */
	regionOptions?: Partial<RegionCommentOptions>
	/** Seed a region comment so the variant can be exercised without drawing one first. Default true;
	 *  the creation-flow sketch turns it off to start from an empty canvas. */
	seeded?: boolean
}

/**
 * The region-comment flow on a live editor: the comment tool with region enabled (drag out an area),
 * plus the `CanvasComments` overlay driven by a chosen `RegionCommentOptions`. Runs on an in-memory
 * store, so each sketch is an isolated playground for one interaction variant.
 */
export function RegionCommentsFlow({ regionOptions, seeded = true }: RegionCommentsFlowProps) {
	const store = useMemo(
		() => createTLStore({ schema: createTLSchema({ records: commentSchemaRecords }) }),
		[]
	)
	const components: TLComponents = useMemo(
		() => ({
			InFrontOfTheCanvas: () => (
				<CanvasComments
					currentUserId="me"
					resolveName={resolveName}
					regionOptions={{ enabled: true, ...regionOptions }}
				/>
			),
		}),
		[regionOptions]
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
				tools={commentTools}
				overrides={[commentToolOverrides]}
				components={components}
				onMount={handleMount}
			/>
		</div>
	)
}
