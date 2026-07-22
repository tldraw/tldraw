import { revealThreadRequest } from '@tldraw/commenting'
import { useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useEditor } from 'tldraw'

/**
 * Routes a comment link into the comments overlay. A notification row navigates to the file route
 * with `?comment=<id>`, but the overlay only reads the URL once at mount — a same-file navigation
 * changes the query string without remounting anything, so the link would otherwise do nothing.
 * This watches the param through router state, hands the id to the overlay as a reveal request
 * (the overlay owns waiting for the records to sync in and the cluster-aware reveal), and strips
 * the consumed param so back/refresh doesn't re-open the thread.
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
