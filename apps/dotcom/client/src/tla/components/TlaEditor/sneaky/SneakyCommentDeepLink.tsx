import { getCommentRecord, revealThreadRequest, useCommentingEnabled } from '@tldraw/commenting'
import { useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useEditor, useToasts, useValue } from 'tldraw'
import { useMaybeApp } from '../../../hooks/useAppState'
import { useIsReady } from '../../../hooks/useIsReady'
import { defineMessages, useMsg } from '../../../utils/i18n'

const messages = defineMessages({
	commentDeleted: { defaultMessage: 'This comment was deleted.' },
})

/**
 * dotcom's comment deep-link handler: `?comment=<thread or comment id>` (a shared link, or a
 * notification row's navigation) becomes a reveal request served by the comments overlay, which
 * owns waiting for the records to sync in and the cluster-aware reveal. Watches router state, so
 * it fires on same-file navigations too, and strips the consumed param so back/refresh doesn't
 * re-open the thread.
 */
export function SneakyCommentDeepLink() {
	const editor = useEditor()
	const app = useMaybeApp()
	const isReady = useIsReady()
	const commentingEnabled = useCommentingEnabled()
	const { addToast } = useToasts()
	const [searchParams, setSearchParams] = useSearchParams()
	const commentId = searchParams.get('comment')
	const deletedMsg = useMsg(messages.commentDeleted)

	useEffect(() => {
		if (!commentId) return
		revealThreadRequest.set(editor, commentId)
		setSearchParams(
			(params) => {
				params.delete('comment')
				return params
			},
			{ replace: true }
		)
	}, [editor, commentId, setSearchParams])

	// A request that stays unserved once the file is loaded, the overlay is serving (the license
	// gate has resolved), and the comment records are absent almost certainly points at a deleted
	// comment — explain the dead end instead of doing nothing, and mark the comment's notification
	// read so it doesn't keep dead-ending on every click. "Absent" is still a heuristic (the sync
	// layer has no records-settled signal), so the request is left pending: if the records are
	// merely late, the overlay still serves them when they land, and an unserved request is inert.
	const pendingRevealId = useValue('pending reveal', () => revealThreadRequest.get(editor), [
		editor,
	])
	useEffect(() => {
		if (!isReady || !commentingEnabled || !pendingRevealId) return
		const timer = setTimeout(() => {
			if (revealThreadRequest.get(editor) !== pendingRevealId) return
			if (getCommentRecord(editor, pendingRevealId)) return
			addToast({ id: 'comment-deep-link-deleted', severity: 'info', title: deletedMsg })
			if (app?.getComments().some((c) => c.id === pendingRevealId)) {
				app.markCommentRead(pendingRevealId)
			}
		}, 2000)
		return () => clearTimeout(timer)
	}, [isReady, commentingEnabled, pendingRevealId, editor, app, addToast, deletedMsg])

	return null
}
