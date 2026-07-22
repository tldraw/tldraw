import {
	commentsHidden,
	focusThread,
	getCommentingOptions,
	getCommentRecord,
} from '@tldraw/commenting'
import { useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useEditor, useValue } from 'tldraw'

/**
 * Opens the comment thread a notification links to. A notification row navigates to the file
 * route with `?comment=<id>`; this watches that param from inside the editor, waits for the
 * linked comment and its thread to be present in the store (on a cross-file navigation they
 * sync in after the editor mounts), then opens the thread popover via `focusThread` and strips
 * the consumed param so back/refresh doesn't re-open it.
 */
export function SneakyCommentDeepLink() {
	const editor = useEditor()
	const [searchParams, setSearchParams] = useSearchParams()
	const commentId = searchParams.get('comment')

	const thread = useValue(
		'linked comment thread',
		() => {
			if (!commentId) return null
			const comment = getCommentRecord(editor, commentId)
			if (comment?.typeName !== 'comment') return null
			const thread = getCommentRecord(editor, comment.threadId)
			return thread?.typeName === 'comment-thread' ? thread : null
		},
		[editor, commentId]
	)

	useEffect(() => {
		if (!thread) return
		// Following the link is an explicit ask to see this comment — override hidden pins,
		// or the opened popover would be invisible.
		commentsHidden.set(editor, false)
		focusThread(editor, thread, getCommentingOptions(editor).impreciseShapeAnchor)
		setSearchParams(
			(params) => {
				params.delete('comment')
				return params
			},
			{ replace: true }
		)
	}, [editor, thread, setSearchParams])

	return null
}
