import { Avatar, isMentionPickerOpen } from '@tldraw/mentions'
import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import {
	createComment,
	createCommentThread,
	Editor,
	TLRichText,
	useContainer,
	usePassThroughMouseOverEvents,
	usePassThroughWheelEvents,
	useTranslation,
	useValue,
} from 'tldraw'
import { CommentComposer } from '../ui/comment-composer'
import { EMPTY_COMMENT, isCommentEmpty } from '../ui/comment-extensions'
import { CommentPin } from '../ui/comment-pin'
import {
	clearCommentDraft,
	getCommentDraft,
	NEW_COMMENT_DRAFT,
	saveCommentDraft,
} from './comment-drafts'
import { commitCommentMutation, putRecordsInCommit } from './comment-mutations'
import { UNKNOWN_COMMENT_AUTHOR } from './comment-render'
import { PendingComment } from './comment-tool'
import { type CommentingContext } from './context'
import { useCanComment, useCommentingOptions } from './options'
import { pendingComment } from './state'

const stop = (e: { stopPropagation(): void }) => e.stopPropagation()

/**
 * The composer for a thread that doesn't exist yet: the comment tool has placed a point (or
 * region) and is waiting on a first comment. Submitting creates the thread and its comment
 * together; clicking away keeps the draft for the next placement.
 */
export function PendingComposer({
	editor,
	pending,
	currentUserId,
	resolveAuthor,
	onPostComment,
	getMentionSuggestions,
	renderMentionSuggestion,
}: CommentingContext & { editor: Editor; pending: PendingComment }) {
	const ComposerFallback = useCommentingOptions().components.ComposerFallback
	const canComment = useCanComment(currentUserId)
	const me = currentUserId ? resolveAuthor(currentUserId) : undefined
	// The leading pin previews the pin this draft becomes: a white pin holding the author's avatar.
	const draftAvatar = (
		<CommentPin>
			<Avatar author={me ?? UNKNOWN_COMMENT_AUTHOR} />
		</CommentPin>
	)
	// Click-away keeps the draft (saved on every change) and the next placement composer
	// restores it — the flip side of dismissing without a discard warning.
	const [text, setText] = useState<TLRichText>(
		() => getCommentDraft(NEW_COMMENT_DRAFT) ?? EMPTY_COMMENT
	)
	const ref = useRef<HTMLDivElement>(null)
	const msg = useTranslation()
	const container = useContainer()
	// Over this floating panel, scroll and hover reach the canvas (except where it scrolls itself).
	usePassThroughWheelEvents(ref)
	usePassThroughMouseOverEvents(ref)

	const point = useValue('composer point', () => editor.pageToViewport(pending.point), [
		editor,
		pending.point,
	])

	// Dismiss on a click anywhere outside the composer (capture-phase, ahead of stopPropagation).
	useEffect(() => {
		const onPointerDown = (e: PointerEvent) => {
			const el = ref.current
			const target = e.target as HTMLElement | null
			if (!el || !target) return
			// A click in the composer, or in the mention picker it spawns (portaled elsewhere), is
			// not "outside" — keep the draft open so the pick can insert.
			if (el.contains(target) || target.closest('.tlui-cmt-mention-popup')) return
			pendingComment.set(editor, null)
		}
		document.addEventListener('pointerdown', onPointerDown, true)
		return () => document.removeEventListener('pointerdown', onPointerDown, true)
	}, [editor])

	const submit = () => {
		if (isCommentEmpty(text) || !currentUserId) return
		commitCommentMutation(editor, () => {
			const pageId = editor.getCurrentPageId()
			const thread = createCommentThread({
				pageId,
				anchor: pending.anchor,
				createdBy: currentUserId,
			})
			const comment = createComment({
				threadId: thread.id,
				pageId,
				authorId: currentUserId,
				body: text,
			})
			putRecordsInCommit(editor, [thread, comment])
			if (onPostComment) onPostComment(comment)
		})
		setText(EMPTY_COMMENT)
		clearCommentDraft(NEW_COMMENT_DRAFT)
		pendingComment.set(editor, null)
	}

	return createPortal(
		<div
			ref={ref}
			className={[
				'tlui-cmt-canvas-composer',
				pending.anchor.type === 'region' && 'tlui-cmt-canvas-composer--region',
				!canComment && 'tlui-cmt-canvas-composer--fallback',
			]
				.filter(Boolean)
				.join(' ')}
			style={{ left: point.x, top: point.y }}
			onPointerDown={stop}
			onContextMenu={stop}
			onKeyDown={(e) => {
				if (e.key === 'Escape' && !isMentionPickerOpen()) pendingComment.set(editor, null)
			}}
		>
			{canComment ? (
				<CommentComposer
					author={me ?? UNKNOWN_COMMENT_AUTHOR}
					placeholder={msg('comments.add-placeholder')}
					sendLabel={msg('comments.send')}
					value={text}
					onChange={(value) => {
						setText(value)
						saveCommentDraft(NEW_COMMENT_DRAFT, value)
					}}
					onSubmit={submit}
					// No user, no author for the record — dead send button.
					disabled={isCommentEmpty(text) || !currentUserId}
					getMentionSuggestions={getMentionSuggestions}
					renderMentionSuggestion={renderMentionSuggestion}
					autoFocus
					leading={draftAvatar}
				/>
			) : (
				ComposerFallback && <ComposerFallback context="pending" />
			)}
		</div>,
		container
	)
}
