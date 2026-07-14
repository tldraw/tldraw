import {
	CanvasComments,
	commentToolOverrides,
	commentTools,
	RegionCommentOptions,
} from '@tldraw/commenting/canvas'
import { useMemo } from 'react'
import { commentSchemaRecords, createTLSchema, createTLStore, TLComponents, Tldraw } from 'tldraw'
import './region-comments.css'

// A tiny local user directory so the flow shows names instead of ids.
const NAMES: Record<string, string> = { me: 'You', ada: 'Ada Lovelace' }
const resolveName = (id: string): string => NAMES[id] ?? id

export interface RegionCommentsFlowProps {
	/** The region behaviour to showcase. Region is always enabled in this flow; each sketch overrides
	 *  the dimension(s) it's demonstrating. */
	regionOptions?: Partial<RegionCommentOptions>
}

/**
 * The region-comment flow on a live editor: the comment tool with region enabled (drag out an area),
 * plus the `CanvasComments` overlay driven by a chosen `RegionCommentOptions`. Runs on an in-memory
 * store, so each sketch is an isolated playground for one interaction variant.
 */
export function RegionCommentsFlow({ regionOptions }: RegionCommentsFlowProps) {
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
	return (
		<div className="region-comments-flow">
			<Tldraw
				store={store}
				tools={commentTools}
				overrides={[commentToolOverrides]}
				components={components}
			/>
		</div>
	)
}
