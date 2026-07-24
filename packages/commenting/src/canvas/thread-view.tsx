import { ReactNode, useCallback, useEffect, useRef, useState, type CSSProperties } from 'react'
import { createPortal } from 'react-dom'
import {
	createComment,
	Editor,
	TLComment,
	TLCommentId,
	TLCommentThread,
	TLRichText,
	TldrawUiDropdownMenuContent,
	TldrawUiDropdownMenuGroup,
	TldrawUiDropdownMenuItem,
	TldrawUiDropdownMenuRoot,
	TldrawUiDropdownMenuTrigger,
	TldrawUiIcon,
	usePassThroughMouseOverEvents,
	usePassThroughWheelEvents,
	useTranslation,
} from 'tldraw'
import { CommentAuthor } from '../ui/comment-author'
import { CommentCard, CommentCardProps } from '../ui/comment-card'
import { CommentComposer } from '../ui/comment-composer'
import { EMPTY_COMMENT, isCommentEmpty } from '../ui/comment-extensions'
import { CommentThread } from '../ui/comment-thread'
import { MentionMember } from '../ui/mention-list'
import { TooltipButton } from '../ui/tooltip-button'
import { CommentBody } from './comment-body'
import {
	clearCommentDraft,
	getCommentDraft,
	replyDraftSlot,
	saveCommentDraft,
} from './comment-drafts'
import { UNKNOWN_AUTHOR, UNKNOWN_COMMENT_AUTHOR } from './comment-render'
import { putCommentRecords, removeCommentRecords } from './comment-store'
import { useThreadComments } from './hooks'
import { type CommentingComponents, useCommentingOptions } from './options'
import { commitCommentMutation, openThreadId } from './state'

const stop = (e: { stopPropagation(): void }) => e.stopPropagation()

/** The identity/callback props a thread view needs from the host — the same contract
 *  `CanvasComments` takes, minus the pin-placement concerns. */
export interface ThreadViewHostProps {
	currentUserId: string | null
	resolveAuthor(id: string): CommentAuthor | undefined
	onPostComment?(comment: TLComment): void
	isCommentUnread?(commentId: TLCommentId): boolean
	onCommentRead?(commentId: TLCommentId): void
	getMentionSuggestions?(query: string): MentionMember[] | Promise<MentionMember[]>
	renderMentionSuggestion?(member: MentionMember): ReactNode
}

/**
 * A name-only view of an author resolver, for the mention/rich-text paths. Stable identity, so
 * `CommentBody`'s memoized render doesn't recompute on every render of its host.
 */
export function useResolveName(resolveAuthor: ThreadViewHostProps['resolveAuthor']) {
	return useCallback((id: string) => resolveAuthor(id)?.name, [resolveAuthor])
}

export function toCardProps(
	comment: TLComment,
	props: Pick<ThreadViewHostProps, 'currentUserId' | 'resolveAuthor'>,
	components: CommentingComponents,
	resolveName: (id: string) => string | undefined
): CommentCardProps {
	const Body = components.CommentBody
	// The `CommentBody` component slot overrides the built-in rich-text default (which resolves
	// mention ids to names).
	const body = Body ? (
		<Body comment={comment} />
	) : (
		<CommentBody richText={comment.body} resolveName={resolveName} />
	)
	return {
		author: props.resolveAuthor(comment.authorId) ?? UNKNOWN_COMMENT_AUTHOR,
		body,
		date: new Date(comment.createdAt).toISOString(),
		you: comment.authorId === props.currentUserId,
		edited: comment.editedAt != null,
	}
}

/**
 * The header block a thread popover carries and a header-less preview (a stack or cluster list)
 * does not: an action-row-tall header plus the column gap beneath it. The single-pin preview's
 * root is shifted down by exactly this in CSS (`--tlui-cmt-thread-header-height` +
 * `--tlui-cmt-thread-gap`) so its comment lands where the opened popover's does; this JS copy lets
 * the pin popover offset be derived from the list offset. Keep the two in sync — same pixels.
 */
const THREAD_HEADER_SHIFT = 32

/** Every marker is this square (mirrors `--tlui-cmt-marker-size`). Needed because the two marker
 *  kinds anchor at different points, and lining their previews up means correcting for that. */
const MARKER_SIZE = 34

/** A coincident stack's / cluster's card list, whose first card sits flush with the popover top. */
const LIST_OFFSET = { x: 36, y: -28 } as const

/**
 * Where a marker's popover sits relative to the marker's anchor point.
 *
 * The hover preview places itself at these same origins, so the two views of a thread differ only
 * by the header the popover has — which its own stylesheet then compensates for. Moving a popover
 * here moves its preview with it.
 *
 * The two marker kinds don't anchor alike, which the vertical offsets have to correct for. A
 * badge is centred on its point (`translate(-50%, -50%)`), so `LIST_OFFSET.y` is measured from its
 * middle. A pin hangs off its point (`translate(0, -100%)`), so its point is the pin's *bottom* —
 * a full marker lower than a badge's. Measuring a raw offset from there would drop the pin's
 * preview half a marker below a badge's; the terms below re-base it so the two previews' top cards
 * land on the same line.
 */
export const POPOVER_OFFSET = {
	/**
	 * A single pin's thread popover. Its preview should read level with a cluster/stack preview's
	 * top card, so start from the list offset and re-base it to the pin's bottom anchor:
	 * `- MARKER_SIZE / 2` accounts for the pin's point sitting half a marker below a badge's, and
	 * `- THREAD_HEADER_SHIFT` cancels the downward shift the preview's own stylesheet applies to
	 * make room for the missing header. The opened popover shares the offset and opens from there.
	 */
	thread: { x: 48, y: LIST_OFFSET.y - MARKER_SIZE / 2 - THREAD_HEADER_SHIFT },
	list: LIST_OFFSET,
} as const

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
		// contextmenu also stops here: portals bubble React events to the canvas's context-menu
		// trigger (the layer mounts inside it), which would open the canvas menu over this panel.
		<div
			ref={ref}
			className="tlui-cmt-canvas-popover"
			style={style}
			onPointerDown={stop}
			onContextMenu={stop}
		>
			{children}
		</div>,
		container
	)
}

/**
 * One thread's interactive view: its comments, the reply composer, edit-in-place on your own
 * comments, and the resolve/delete actions. Reads and writes comment records via the editor's
 * store; read receipts are reported for every unread comment while mounted, so only mount it
 * where the thread is actually being shown.
 */
export function ThreadView({
	editor,
	thread,
	...props
}: ThreadViewHostProps & { editor: Editor; thread: TLCommentThread }) {
	const {
		currentUserId,
		resolveAuthor,
		onPostComment,
		isCommentUnread,
		onCommentRead,
		getMentionSuggestions,
		renderMentionSuggestion,
	} = props
	const options = useCommentingOptions()
	const comments = useThreadComments(editor, thread.id)
	const msg = useTranslation()
	const resolveName = useResolveName(resolveAuthor)
	const me = currentUserId ? resolveAuthor(currentUserId) : undefined
	// An unsent reply survives closing the thread (saved on every change, keyed by thread id) —
	// the flip side of dismissing without a discard warning.
	const [reply, setReply] = useState<TLRichText>(
		() => getCommentDraft(replyDraftSlot(thread.id)) ?? EMPTY_COMMENT
	)
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
		clearCommentDraft(replyDraftSlot(thread.id))
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

	const deleteComment = (comment: TLComment) => {
		commitCommentMutation(editor, () => {
			// Deleting a thread's only comment deletes the thread — an empty thread has no surface.
			if (comments.length === 1) {
				openThreadId.set(editor, null)
				removeCommentRecords(editor, [thread.id, comment.id])
			} else {
				removeCommentRecords(editor, [comment.id])
			}
		})
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
						<TldrawUiDropdownMenuRoot id={`comment-actions-${comment.id}`}>
							<TldrawUiDropdownMenuTrigger>
								<TooltipButton
									tooltip={msg('comments.more-options')}
									className="tlui-cmt-thread__action"
								>
									<TldrawUiIcon icon="dots-vertical" label={msg('comments.more-options')} small />
								</TooltipButton>
							</TldrawUiDropdownMenuTrigger>
							<TldrawUiDropdownMenuContent
								className="tlui-cmt-menu"
								side="bottom"
								align="end"
								alignOffset={0}
							>
								<TldrawUiDropdownMenuGroup>
									<TldrawUiDropdownMenuItem>
										<button
											type="button"
											className="tlui-cmt-menu-item"
											onClick={() => startEdit(comment)}
										>
											<span>{msg('comments.edit-comment')}</span>
										</button>
									</TldrawUiDropdownMenuItem>
									<TldrawUiDropdownMenuItem>
										<button
											type="button"
											className="tlui-cmt-menu-item tlui-cmt-menu-item--danger"
											onClick={() => deleteComment(comment)}
										>
											<span>{msg('comments.delete-comment')}</span>
										</button>
									</TldrawUiDropdownMenuItem>
								</TldrawUiDropdownMenuGroup>
							</TldrawUiDropdownMenuContent>
						</TldrawUiDropdownMenuRoot>
					) : undefined
				}
			/>
		)
	}

	const headerActions = (
		<>
			{currentUserId && (
				<TooltipButton
					tooltip={msg(thread.resolved ? 'comments.reopen' : 'comments.resolve')}
					className="tlui-cmt-thread__action"
					onClick={toggleResolve}
				>
					<TldrawUiIcon
						icon="check"
						label={msg(thread.resolved ? 'comments.reopen' : 'comments.resolve')}
						small
					/>
				</TooltipButton>
			)}
			{currentUserId && (
				<TldrawUiDropdownMenuRoot id={`comment-thread-actions-${thread.id}`}>
					<TldrawUiDropdownMenuTrigger>
						<TooltipButton
							tooltip={msg('comments.more-options')}
							className="tlui-cmt-thread__action"
						>
							<TldrawUiIcon icon="dots-vertical" label={msg('comments.more-options')} small />
						</TooltipButton>
					</TldrawUiDropdownMenuTrigger>
					<TldrawUiDropdownMenuContent
						className="tlui-cmt-menu"
						side="bottom"
						align="end"
						alignOffset={0}
					>
						<TldrawUiDropdownMenuGroup>
							<TldrawUiDropdownMenuItem>
								<button
									type="button"
									className="tlui-cmt-menu-item tlui-cmt-menu-item--danger"
									onClick={deleteThread}
								>
									<span>{msg('comments.delete')}</span>
								</button>
							</TldrawUiDropdownMenuItem>
						</TldrawUiDropdownMenuGroup>
					</TldrawUiDropdownMenuContent>
				</TldrawUiDropdownMenuRoot>
			)}
		</>
	)

	return (
		<CommentThread
			header={msg('comments.thread-title')}
			headerActions={headerActions}
			renderComment={renderComment}
			comments={comments.map((c) => toCardProps(c, props, options.components, resolveName))}
			resolvedBanner={
				thread.resolved
					? msg('comments.resolved-by').replace(
							'{name}',
							resolveAuthor(thread.resolved.by)?.name ?? UNKNOWN_AUTHOR
						)
					: undefined
			}
			composer={
				currentUserId && !thread.resolved
					? {
							author: me ?? UNKNOWN_COMMENT_AUTHOR,
							placeholder: msg('comments.reply-placeholder'),
							sendLabel: msg('comments.send'),
							value: reply,
							onChange: (value: TLRichText) => {
								setReply(value)
								saveCommentDraft(replyDraftSlot(thread.id), value)
							},
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
