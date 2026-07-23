import { revealThreadRequest } from '@tldraw/commenting'
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

	// A request that outlives the file load points at deleted records: comments arrive with the
	// document snapshot, so once the file is ready (plus a short grace for ordering) an unserved
	// request will never be served. Explain the dead end instead of doing nothing, and mark the
	// comment's notification read so it doesn't keep dead-ending on every click.
	const pendingRevealId = useValue('pending reveal', () => revealThreadRequest.get(editor), [
		editor,
	])
	useEffect(() => {
		if (!isReady || !pendingRevealId) return
		const timer = setTimeout(() => {
			if (revealThreadRequest.get(editor) !== pendingRevealId) return
			revealThreadRequest.set(editor, null)
			addToast({ id: 'comment-deep-link-deleted', severity: 'info', title: deletedMsg })
			if (app?.getComments().some((c) => c.id === pendingRevealId)) {
				app.markCommentRead(pendingRevealId)
			}
		}, 2000)
		return () => clearTimeout(timer)
	}, [isReady, pendingRevealId, editor, app, addToast, deletedMsg])

	return null
}
