import {
	CanvasComments,
	CommentAuthor,
	commentToolOverrides,
	commentTools,
} from '@tldraw/commenting'
import { useMemo } from 'react'
import { commentSchemaRecords, createTLSchema, createTLStore, TLComponents, Tldraw } from 'tldraw'
import './comment-flow.css'

// A tiny local user directory so the flow shows names and colors instead of ids.
const AUTHORS: Record<string, CommentAuthor> = {
	me: { name: 'You', color: '#EC5E41' },
	ada: { name: 'Ada Lovelace', color: '#0E9F6E' },
}
const resolveAuthor = (id: string): CommentAuthor => AUTHORS[id] ?? { name: id }

/**
 * The whole commenting flow on a live editor: the comment tool in the toolbar, click-to-place a
 * thread, compose and post, pins, and thread popovers with replies. It runs on an in-memory store
 * (the comment record types registered via the schema) — no sync server — so the exact
 * `@tldraw/commenting` flow dotcom ships can be exercised in isolation.
 */
export function CommentFlow() {
	const store = useMemo(
		() => createTLStore({ schema: createTLSchema({ records: commentSchemaRecords }) }),
		[]
	)
	const components: TLComponents = useMemo(
		() => ({
			InFrontOfTheCanvas: () => <CanvasComments currentUserId="me" resolveAuthor={resolveAuthor} />,
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
