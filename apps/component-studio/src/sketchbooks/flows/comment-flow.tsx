import {
	CanvasComments,
	commentSchemaRecords,
	commentToolComponents,
	commentToolOverrides,
	commentTools,
} from '@tldraw/comments'
import { useMemo } from 'react'
import { createTLSchema, createTLStore, TLComponents, Tldraw } from 'tldraw'
import './comment-flow.css'

// A tiny local user directory so the flow shows names instead of ids.
const NAMES: Record<string, string> = { me: 'You', ada: 'Ada Lovelace' }
const resolveName = (id: string): string => NAMES[id] ?? id

/**
 * The whole commenting flow on a live editor: the comment tool in the toolbar, click-to-place a
 * thread, compose and post, pins, and thread popovers with replies. It runs on an in-memory store
 * (the comment record types registered via the schema) — no sync server — so the exact
 * `@tldraw/comments` flow dotcom ships can be exercised in isolation.
 */
export function CommentFlow() {
	const store = useMemo(
		() => createTLStore({ schema: createTLSchema({ records: commentSchemaRecords }) }),
		[]
	)
	const components: TLComponents = useMemo(
		() => ({
			...commentToolComponents,
			InFrontOfTheCanvas: () => <CanvasComments currentUserId="me" resolveName={resolveName} />,
		}),
		[]
	)
	return (
		<div className="comment-flow">
			<Tldraw
				store={store}
				tools={commentTools}
				overrides={[commentToolOverrides]}
				components={components}
			/>
		</div>
	)
}
