import { ReactNode, useEffect, useRef, useState, type CSSProperties } from 'react'
import { createPortal } from 'react-dom'
import {
	createComment,
	Editor,
	TLComment,
	TLCommentId,
	TLCommentThread,
	TLRichText,
	TldrawUiIcon,
	usePassThroughMouseOverEvents,
	usePassThroughWheelEvents,
	useTranslation,
} from 'tldraw'
import { CommentCard, CommentCardProps } from '../ui/comment-card'
import { CommentComposer } from '../ui/comment-composer'
import { EMPTY_COMMENT, isCommentEmpty } from '../ui/comment-extensions'
import { CommentThread } from '../ui/comment-thread'
import { MentionMember } from '../ui/mention-list'
import { CommentBody } from './comment-body'
import { UNKNOWN_AUTHOR } from './comment-render'
import { putCommentRecords, removeCommentRecords } from './comment-store'
import { useThreadComments } from './hooks'
import { type CommentingComponents, useCommentingOptions } from './options'
import { commitCommentMutation, openThreadId } from './state'

/** The identity/callback props a thread view needs from the host — the same contract
 *  `CanvasComments` takes, minus the pin-placement concerns. */
export interface ThreadViewHostProps {
	currentUserId: string | null
	resolveName(id: string): string | undefined
	onPostComment?(comment: TLComment): void
	isCommentUnread?(commentId: TLCommentId): boolean
	onCommentRead?(commentId: TLCommentId): void
	getMentionSuggestions?(query: string): MentionMember[] | Promise<MentionMember[]>
	renderMentionSuggestion?(member: MentionMember): ReactNode
}

export function toCardProps(
	comment: TLComment,
	props: Pick<ThreadViewHostProps, 'currentUserId' | 'resolveName'>,
	components: CommentingComponents
): CommentCardProps {
	const Body = components.CommentBody
	// The `CommentBody` component slot overrides the built-in rich-text default (which resolves
	// mention ids to names).
	const body = Body ? (
		<Body comment={comment} />
	) : (
		<CommentBody richText={comment.body} resolveName={props.resolveName} />
	)
	return {
		author: props.resolveName(comment.authorId) ?? UNKNOWN_AUTHOR,
		body,
		date: new Date(comment.createdAt).toISOString(),
		you: comment.authorId === props.currentUserId,
		edited: comment.editedAt != null,
	}
}

/** The open thread's popover container, portaled above the UI panels. Over it, wheel and hover
 *  events pass through to the canvas (unless it scrolls its own content), like tldraw's panels. */
export function ThreadPopover({
	container,
	style,
	children,
}: {
	container: HTMLElement
	style: CSSProperties
	children: ReactNode
}) {
	const ref = useRef<HTMLDivElement>(null)
	usePassThroughWheelEvents(ref)
	usePassThroughMouseOverEvents(ref)
	return createPortal(
		<div
			ref={ref}
			className="tlui-cmt-canvas-popover"
			style={style}
			onPointerDown={(e) => e.stopPropagation()}
		>
			{children}
		</div>,
		container
	)
}

/**
 * One thread's interactive view: its comments, the reply composer, edit-in-place on your own
 * comments, and the resolve/delete/dismiss actions. Reads and writes comment records via the
 * editor's store; read receipts are reported for every unread comment while mounted, so only
 * mount it where the thread is actually being shown.
 */
export function ThreadView({
	editor,
	thread,
	...props
}: ThreadViewHostProps & { editor: Editor; thread: TLCommentThread }) {
	const {
		currentUserId,
		resolveName,
		onPostComment,
		isCommentUnread,
		onCommentRead,
		getMentionSuggestions,
		renderMentionSuggestion,
	} = props
	const options = useCommentingOptions()
	const comments = useThreadComments(editor, thread.id)
	const msg = useTranslation()
	const [reply, setReply] = useState<TLRichText>(EMPTY_COMMENT)
	const [editingId, setEditingId] = useState<string | null>(null)
	const [editText, setEditText] = useState<TLRichText>(EMPTY_COMMENT)

	// Every unread comment on display gets reported read — including replies that arrive while
	// the view stays mounted, since the effect re-runs as `comments` changes. The host's receipt
	// write flips isCommentUnread to false, so re-runs find nothing to report.
	useEffect(() => {
		if (!isCommentUnread || !onCommentRead) return
		for (const comment of comments) {
			if (isCommentUnread(comment.id)) {
				onCommentRead(comment.id)
			}
		}
	}, [comments, isCommentUnread, onCommentRead])

	const postReply = () => {
		if (isCommentEmpty(reply) || !currentUserId) return
		commitCommentMutation(editor, () => {
			const comment = createComment({
				threadId: thread.id,
				pageId: thread.pageId,
				authorId: currentUserId,
				body: reply,
			})
			putCommentRecords(editor, [comment])
			if (onPostComment) onPostComment(comment)
		})
		setReply(EMPTY_COMMENT)
	}

	const toggleResolve = () => {
		if (!currentUserId) return
		commitCommentMutation(editor, () => {
			putCommentRecords(editor, [
				{
					...thread,
					resolved: thread.resolved ? null : { at: Date.now(), by: currentUserId },
				},
			])
		})
	}

	const deleteThread = () => {
		openThreadId.set(editor, null)
		commitCommentMutation(editor, () =>
			removeCommentRecords(editor, [thread.id, ...comments.map((c) => c.id)])
		)
	}

	const startEdit = (comment: TLComment) => {
		setEditingId(comment.id)
		setEditText(comment.body)
	}

	const saveEdit = () => {
		const comment = comments.find((c) => c.id === editingId)
		if (!comment || isCommentEmpty(editText)) return
		commitCommentMutation(editor, () => {
			putCommentRecords(editor, [{ ...comment, body: editText, editedAt: Date.now() }])
		})
		setEditingId(null)
	}

	// Swap a comment for a pre-filled composer while it's being edited; otherwise show the card,
	// with an edit affordance on your own comments.
	const renderComment = (card: CommentCardProps, index: number): ReactNode => {
		const comment = comments[index]
		if (editingId === comment.id) {
			return (
				<div
					className="tlui-cmt-editing"
					onKeyDown={(e) => {
						if (e.key === 'Escape') {
							setEditingId(null)
							e.stopPropagation()
						}
					}}
				>
					<CommentComposer
						author={card.author}
						placeholder={msg('comments.edit-placeholder')}
						value={editText}
						onChange={setEditText}
						onSubmit={saveEdit}
						sendLabel={msg('comments.save')}
						disabled={isCommentEmpty(editText)}
						getMentionSuggestions={getMentionSuggestions}
						renderMentionSuggestion={renderMentionSuggestion}
						autoFocus
					/>
				</div>
			)
		}
		return (
			<CommentCard
				{...card}
				actions={
					comment.authorId === currentUserId ? (
						<button
							className="tlui-cmt-thread__action"
							title={msg('comments.edit')}
							onClick={() => startEdit(comment)}
						>
							<TldrawUiIcon icon="dots-horizontal" label={msg('comments.edit')} small />
						</button>
					) : undefined
				}
			/>
		)
	}

	const headerActions = (
		<>
			{currentUserId && (
				<button
					className="tlui-cmt-thread__action"
					title={msg(thread.resolved ? 'comments.reopen' : 'comments.resolve')}
					onClick={toggleResolve}
				>
					<TldrawUiIcon
						icon="check"
						label={msg(thread.resolved ? 'comments.reopen' : 'comments.resolve')}
						small
					/>
				</button>
			)}
			{currentUserId && (
				<button
					className="tlui-cmt-thread__action"
					title={msg('comments.delete')}
					onClick={deleteThread}
				>
					<TldrawUiIcon icon="trash" label={msg('comments.delete')} small />
				</button>
			)}
			<button
				className="tlui-cmt-thread__action"
				title={msg('comments.dismiss')}
				onClick={() => openThreadId.set(editor, null)}
			>
				<TldrawUiIcon icon="cross-2" label={msg('comments.dismiss')} small />
			</button>
		</>
	)

	return (
		<CommentThread
			header={msg('comments.thread-title')}
			headerActions={headerActions}
			renderComment={renderComment}
			comments={comments.map((c) => toCardProps(c, props, options.components))}
			resolvedBanner={
				thread.resolved
					? msg('comments.resolved-by').replace(
							'{name}',
							resolveName(thread.resolved.by) ?? UNKNOWN_AUTHOR
						)
					: undefined
			}
			composer={
				currentUserId && !thread.resolved
					? {
							author: resolveName(currentUserId) ?? UNKNOWN_AUTHOR,
							placeholder: msg('comments.reply-placeholder'),
							sendLabel: msg('comments.send'),
							value: reply,
							onChange: setReply,
							onSubmit: postReply,
							disabled: isCommentEmpty(reply),
							getMentionSuggestions,
							renderMentionSuggestion,
						}
					: undefined
			}
		/>
	)
}
