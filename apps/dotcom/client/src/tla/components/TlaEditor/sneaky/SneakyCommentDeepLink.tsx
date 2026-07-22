import { revealThreadRequest } from '@tldraw/commenting'
import { useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useEditor } from 'tldraw'

/**
 * dotcom's comment deep-link handler: `?comment=<thread or comment id>` (a shared link, or a
 * notification row's navigation) becomes a reveal request served by the comments overlay, which
 * owns waiting for the records to sync in and the cluster-aware reveal. Watches router state, so
 * it fires on same-file navigations too, and strips the consumed param so back/refresh doesn't
 * re-open the thread.
 */
export function SneakyCommentDeepLink() {
	const editor = useEditor()
	const [searchParams, setSearchParams] = useSearchParams()
	const commentId = searchParams.get('comment')

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

	return null
}
