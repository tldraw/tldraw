import { Avatar, isMentionPickerOpen } from '@tldraw/mentions'
import { useEffect, useRef, useState } from 'react'
import {
	createComment,
	createCommentThread,
	Editor,
	EditorPortal,
	TLRichText,
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
import { commitCommentMutation } from './comment-mutations'
import { UNKNOWN_COMMENT_AUTHOR } from './comment-render'
import { PendingComment } from './comment-tool'
import { type CommentingContext } from './context'
import { useIsMobileCommenting, useMobilePlacement } from './mobile-placement'
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
	// Over this floating panel, a scroll reaches the canvas (except where it scrolls itself).
	usePassThroughWheelEvents(ref)

	const point = useValue('composer point', () => editor.pageToViewport(pending.point), [
		editor,
		pending.point,
	])
	// On mobile the composer floats free of the pin so it can clear the software keyboard; desktop
	// keeps it pinned to the point.
	const isMobile = useIsMobileCommenting()
	const placed = useMobilePlacement(ref, point, isMobile)

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
		const comment = commitCommentMutation(editor, ({ put }) => {
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
			put([thread, comment])
			return comment
		})
		setText(EMPTY_COMMENT)
		clearCommentDraft(NEW_COMMENT_DRAFT)
		pendingComment.set(editor, null)
		// Posting ends the placement interaction — hand the comment tool back to select. Only from
		// the settled idle state: Enter can land while a fresh press is mid-gesture (the composer
		// trails the pointer), and switching tools under a held pointer would strand the gesture.
		if (editor.isIn('comment.idle')) editor.setCurrentTool('select')
		// The host's callback is its own operation, not part of the post's history scope. It runs
		// last so a throwing host can't strand the composer holding a draft of a posted comment.
		onPostComment?.(comment)
	}

	return (
		<EditorPortal>
			<div
				ref={ref}
				className={[
					'tlui-cmt-canvas-composer',
					pending.anchor.type === 'region' && 'tlui-cmt-canvas-composer--region',
					!canComment && 'tlui-cmt-canvas-composer--fallback',
				]
					.filter(Boolean)
					.join(' ')}
				style={{ left: placed.left, top: placed.top }}
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
			</div>
		</EditorPortal>
	)
}
