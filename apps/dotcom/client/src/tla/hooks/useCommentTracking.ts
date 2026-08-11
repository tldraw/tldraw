import {
	commentsHidden,
	openThreadId,
	sidebarFilters,
	SidebarFilters,
	TLCommentRecord,
} from '@tldraw/commenting'
import { useEffect } from 'react'
import { react, TLRecord, useEditor } from 'tldraw'
import { useTldrawAppUiEvents } from '../utils/app-ui-events'

/** A store record reinterpreted as a comment record, or null for any other type. Comment records
 *  live on the editor store but aren't part of the `TLRecord` union — see `TLCommentRecord`. */
function commentRecord(record: TLRecord): TLCommentRecord | null {
	const { typeName } = record as { typeName: string }
	return typeName === 'comment' || typeName === 'comment-thread' || typeName === 'comment-reaction'
		? (record as unknown as TLCommentRecord)
		: null
}

/**
 * Sends this session's comment activity to PostHog. The commenting toolkit owns the UI surfaces,
 * so dotcom can't hook their handlers — instead, mutations (posts, edits, deletes, resolves,
 * reactions) are read off the editor store, filtered to local writes, and UI state (pin
 * visibility, filters, the open thread) is watched on the toolkit's editor atoms. The sidebar
 * toggle is not watched here: its only control is dotcom's own button, which tracks the click —
 * the atom also moves on programmatic closes (opening Share dismisses the sidebar), which
 * shouldn't count.
 */
export function useCommentTracking() {
	const editor = useEditor()
	const trackEvent = useTldrawAppUiEvents()

	useEffect(() => {
		return editor.store.listen(
			({ changes }) => {
				const added = Object.values(changes.added).map(commentRecord)
				// The composer for a new thread writes the thread and its first comment in one
				// batch; a reply writes the comment alone.
				const addedThreadIds = new Set<string>(
					added.flatMap((record) => (record?.typeName === 'comment-thread' ? [record.id] : []))
				)
				for (const record of added) {
					if (record?.typeName === 'comment') {
						trackEvent('post-comment', {
							source: 'comments',
							operation: addedThreadIds.has(record.threadId) ? 'new-thread' : 'reply',
						})
					} else if (record?.typeName === 'comment-reaction') {
						trackEvent('react-to-comment', { source: 'comments', operation: 'add' })
					}
				}
				for (const [prev, next] of Object.values(changes.updated)) {
					const from = commentRecord(prev)
					const to = commentRecord(next)
					if (from?.typeName === 'comment' && to?.typeName === 'comment') {
						if (!from.isDeleted && to.isDeleted) {
							trackEvent('delete-comment', { source: 'comments' })
						} else if (from.editedAt !== to.editedAt) {
							trackEvent('edit-comment', { source: 'comments' })
						}
					} else if (from?.typeName === 'comment-thread' && to?.typeName === 'comment-thread') {
						if (!from.isDeleted && to.isDeleted) {
							trackEvent('delete-comment-thread', { source: 'comments' })
						} else if ((from.resolved == null) !== (to.resolved == null)) {
							trackEvent('resolve-comment-thread', {
								source: 'comments',
								operation: to.resolved ? 'resolve' : 'reopen',
							})
						}
					}
				}
				for (const record of Object.values(changes.removed)) {
					// The one hard delete in the comment model — comments and threads soft-delete
					// (isDeleted above) for the server to prune.
					if (commentRecord(record)?.typeName === 'comment-reaction') {
						trackEvent('react-to-comment', { source: 'comments', operation: 'remove' })
					}
				}
			},
			{ scope: 'document', source: 'user' }
		)
	}, [editor, trackEvent])

	useEffect(() => {
		let prevHidden = commentsHidden.get(editor)
		let prevFilters = sidebarFilters.get(editor)
		let prevThreadId = openThreadId.get(editor)
		return react('track comment ui events', () => {
			const hidden = commentsHidden.get(editor)
			const filters = sidebarFilters.get(editor)
			const threadId = openThreadId.get(editor)
			if (hidden !== prevHidden) {
				prevHidden = hidden
				trackEvent('toggle-comments-visibility', { source: 'comments', hidden })
			}
			if (filters !== prevFilters) {
				for (const key of Object.keys(filters) as (keyof SidebarFilters)[]) {
					if (filters[key] !== prevFilters[key]) {
						trackEvent('set-comments-filter', {
							source: 'comments',
							filter: key,
							value: filters[key],
						})
					}
				}
				prevFilters = filters
			}
			if (threadId !== prevThreadId) {
				prevThreadId = threadId
				if (threadId !== null) {
					trackEvent('open-comment-thread', { source: 'comments' })
				}
			}
		})
	}, [editor, trackEvent])
}
