import { type CommentAuthor, type MentionMember } from '@tldraw/mentions'
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
	useContainer,
	usePassThroughMouseOverEvents,
	usePassThroughWheelEvents,
	useTranslation,
} from 'tldraw'
import { CommentCard, CommentCardProps } from '../ui/comment-card'
import { CommentComposer } from '../ui/comment-composer'
import { EMPTY_COMMENT, isCommentEmpty } from '../ui/comment-extensions'
import { CommentThread } from '../ui/comment-thread'
import { TooltipButton } from '../ui/tooltip-button'
import { CommentBody } from './comment-body'
import {
	clearCommentDraft,
	getCommentDraft,
	replyDraftSlot,
	saveCommentDraft,
} from './comment-drafts'
import { CommentReactionPicker, CommentReactions } from './comment-reactions'
import { UNKNOWN_AUTHOR, UNKNOWN_COMMENT_AUTHOR } from './comment-render'
import { putCommentRecords } from './comment-store'
import { useThreadComments } from './hooks'
import { type CommentingComponents, useCanComment, useCommentingOptions } from './options'
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
	// Composing, editing, deleting, and resolving are all commenting writes: gated on the viewer's
	// permission. Where it's withheld the composer gives way to the ComposerFallback slot (a
	// sign-in prompt, say) and the action affordances are hidden.
	const canComment = useCanComment(currentUserId)
	const ComposerFallback = options.components.ComposerFallback
	// An unsent reply survives closing the thread (saved on every change, keyed by thread id) —
	// the flip side of dismissing without a discard warning.
	const [reply, setReply] = useState<TLRichText>(
		() => getCommentDraft(replyDraftSlot(thread.id)) ?? EMPTY_COMMENT
	)
	const [editingId, setEditingId] = useState<string | null>(null)
	const [editText, setEditText] = useState<TLRichText>(EMPTY_COMMENT)
	const canReply = canComment && !thread.resolved
	const container = useContainer()

	// Tab from the canvas drops the caret in the reply box. Clicking a pin opens the thread but
	// leaves focus on the editor container, so the first Tab would otherwise walk the app's own UI
	// instead of the panel the click just opened. Capture phase, ahead of the editor's own handling.
	// Fires once per open thread, so Tab inside the thread stays plain tab-through.
	const [focusReply, setFocusReply] = useState(false)
	const tabTaken = useRef(false)
	const swallowTabUp = useRef(false)
	useEffect(() => {
		if (!canReply) return
		const doc = container.ownerDocument
		const onKeyDown = (e: KeyboardEvent) => {
			if (e.key !== 'Tab' || e.shiftKey || e.metaKey || e.ctrlKey || e.altKey) return
			if (e.defaultPrevented || tabTaken.current) return
			// Focus rests on the container (or nothing at all) after a pin click. Anywhere else means
			// it's already somewhere deliberate — the thread's own controls, the sidebar, a panel —
			// and Tab belongs to whatever holds it.
			if (e.target !== container && e.target !== doc.body) return
			tabTaken.current = true
			swallowTabUp.current = true
			setFocusReply(true)
			e.preventDefault()
			e.stopPropagation()
		}
		// The select tool navigates shapes on Tab's *keyup*, and the composer isn't focused until the
		// next frame — so a quick tap with shapes selected would both focus the reply and step the
		// selection. Swallow the release of the press we took, and only that one.
		const onKeyUp = (e: KeyboardEvent) => {
			if (e.key !== 'Tab' || !swallowTabUp.current) return
			swallowTabUp.current = false
			e.preventDefault()
			e.stopPropagation()
		}
		doc.addEventListener('keydown', onKeyDown, true)
		doc.addEventListener('keyup', onKeyUp, true)
		return () => {
			doc.removeEventListener('keydown', onKeyDown, true)
			doc.removeEventListener('keyup', onKeyUp, true)
		}
	}, [canReply, container])

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
		if (!currentUserId) return
		openThreadId.set(editor, null)
		// Soft delete: set the flag rather than removing records — the server prunes the thread,
		// its comments, and their reactions once the flag is persisted, so no client ever deletes
		// records it doesn't own (reactions belong to whoever reacted). Creator-only; the server
		// vetoes anyone else (and any hard delete). Never on the undo stack, even with
		// `history: 'record'`: the flag is write-once server-side, so an undo clearing it would
		// always be vetoed and rebased.
		editor.run(() => putCommentRecords(editor, [{ ...thread, isDeleted: true }]), {
			history: 'ignore',
		})
	}

	const startEdit = (comment: TLComment) => {
		setEditingId(comment.id)
		setEditText(comment.body)
	}

	const deleteComment = (comment: TLComment) => {
		// Soft delete, same model as threads: set the flag, the server prunes the record (and its
		// reactions, which belong to whoever reacted) once it's persisted. Author-only; the server
		// vetoes anyone else (and any hard delete). Never on the undo stack: the flag is write-once
		// server-side, so an undo clearing it would always be vetoed and rebased.
		editor.run(
			() => {
				// Deleting a thread's only comment hides the thread — an empty thread has no surface
				// (see useCommentThreads). The thread record is left for the server: the deleter may
				// not be its creator (only creators may delete threads), so the drain prunes a thread
				// its last comment leaves emptied.
				if (comments.length === 1) {
					openThreadId.set(editor, null)
				}
				putCommentRecords(editor, [{ ...comment, isDeleted: true }])
			},
			{ history: 'ignore' }
		)
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
				footer={
					<CommentReactions
						comment={comment}
						currentUserId={currentUserId}
						resolveName={resolveName}
					/>
				}
				actions={
					canComment && (
						<>
							{comment.authorId === currentUserId && (
								<>
									<TooltipButton
										tooltip={msg('comments.edit')}
										className="tlui-cmt-thread__action tlui-cmt-thread__action--edit"
										onClick={() => startEdit(comment)}
									>
										<svg
											width="15"
											height="15"
											viewBox="0 0 15 15"
											fill="none"
											xmlns="http://www.w3.org/2000/svg"
										>
											<path
												d="M12.1464 1.14645C12.3417 0.951184 12.6583 0.951184 12.8535 1.14645L14.8535 3.14645C15.0488 3.34171 15.0488 3.65829 14.8535 3.85355L10.9109 7.79618C10.8349 7.87218 10.7471 7.93543 10.651 7.9835L6.72359 9.94721C6.53109 10.0435 6.29861 10.0057 6.14643 9.85355C5.99425 9.70137 5.95652 9.46889 6.05277 9.27639L8.01648 5.34897C8.06455 5.25283 8.1278 5.16507 8.2038 5.08907L12.1464 1.14645ZM12.5 2.20711L8.91091 5.79618L7.87266 7.87267L8.12731 8.12732L10.2038 7.08907L13.7929 3.5L12.5 2.20711ZM9.99998 2L8.99998 3H4.9C4.47171 3 4.18056 3.00039 3.95552 3.01877C3.73631 3.03668 3.62421 3.06915 3.54601 3.10899C3.35785 3.20487 3.20487 3.35785 3.10899 3.54601C3.06915 3.62421 3.03669 3.73631 3.01878 3.95552C3.00039 4.18056 3 4.47171 3 4.9V11.1C3 11.5283 3.00039 11.8194 3.01878 12.0445C3.03669 12.2637 3.06915 12.3758 3.10899 12.454C3.20487 12.6422 3.35785 12.7951 3.54601 12.891C3.62421 12.9309 3.73631 12.9633 3.95552 12.9812C4.18056 12.9996 4.47171 13 4.9 13H11.1C11.5283 13 11.8194 12.9996 12.0445 12.9812C12.2637 12.9633 12.3758 12.9309 12.454 12.891C12.6422 12.7951 12.7951 12.6422 12.891 12.454C12.9309 12.3758 12.9633 12.2637 12.9812 12.0445C12.9996 11.8194 13 11.5283 13 11.1V6.99998L14 5.99998V11.1V11.1207C14 11.5231 14 11.8553 13.9779 12.1259C13.9549 12.407 13.9057 12.6653 13.782 12.908C13.5903 13.2843 13.2843 13.5903 12.908 13.782C12.6653 13.9057 12.407 13.9549 12.1259 13.9779C11.8553 14 11.5231 14 11.1207 14H11.1H4.9H4.87934C4.47686 14 4.14468 14 3.87409 13.9779C3.59304 13.9549 3.33469 13.9057 3.09202 13.782C2.7157 13.5903 2.40973 13.2843 2.21799 12.908C2.09434 12.6653 2.04506 12.407 2.0221 12.1259C1.99999 11.8553 1.99999 11.5231 2 11.1207V11.1206V11.1V4.9V4.87935V4.87932V4.87931C1.99999 4.47685 1.99999 4.14468 2.0221 3.87409C2.04506 3.59304 2.09434 3.33469 2.21799 3.09202C2.40973 2.71569 2.7157 2.40973 3.09202 2.21799C3.33469 2.09434 3.59304 2.04506 3.87409 2.0221C4.14468 1.99999 4.47685 1.99999 4.87932 2H4.87935H4.9H9.99998Z"
												fill="currentColor"
												fillRule="evenodd"
												clipRule="evenodd"
											/>
										</svg>
									</TooltipButton>
									<TooltipButton
										tooltip={msg('action.delete')}
										className="tlui-cmt-thread__action tlui-cmt-thread__action--danger"
										onClick={() => deleteComment(comment)}
									>
										<svg
											width="15"
											height="15"
											viewBox="0 0 15 15"
											fill="none"
											xmlns="http://www.w3.org/2000/svg"
										>
											<path
												d="M5.5 1C5.22386 1 5 1.22386 5 1.5C5 1.77614 5.22386 2 5.5 2H9.5C9.77614 2 10 1.77614 10 1.5C10 1.22386 9.77614 1 9.5 1H5.5ZM3 3.5C3 3.22386 3.22386 3 3.5 3H5H10H11.5C11.7761 3 12 3.22386 12 3.5C12 3.77614 11.7761 4 11.5 4H11V12C11 12.5523 10.5523 13 10 13H5C4.44772 13 4 12.5523 4 12V4L3.5 4C3.22386 4 3 3.77614 3 3.5ZM5 4H10V12H5V4Z"
												fill="currentColor"
												fillRule="evenodd"
												clipRule="evenodd"
											/>
										</svg>
									</TooltipButton>
								</>
							)}
							<CommentReactionPicker comment={comment} currentUserId={currentUserId} />
						</>
					)
				}
			/>
		)
	}

	// Resolve and delete are commenting writes: behind `canComment`, plus the `currentUserId` a
	// resolve stamps into `resolved.by`.
	const headerActions = (
		<>
			{canComment && currentUserId && (
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
			{/* Deleting a thread is creator-only (server-enforced), and it's the menu's only item. */}
			{canComment && currentUserId && currentUserId === thread.createdBy && (
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
				canReply
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
							// Up in the empty reply box edits the comment directly above it, chat-style —
							// only when that comment is yours (the same gate as the Edit link).
							onArrowUpWhenEmpty: () => {
								const last = comments[comments.length - 1]
								if (last && last.authorId === currentUserId) startEdit(last)
							},
							// No user, no author for the record — dead send button.
							disabled: isCommentEmpty(reply) || !currentUserId,
							getMentionSuggestions,
							renderMentionSuggestion,
							// Reuses the composer's own focus path, so the caret lands at the end of a
							// restored draft rather than in front of it.
							autoFocus: focusReply,
						}
					: undefined
			}
			footer={
				!canComment && !thread.resolved && ComposerFallback ? (
					<ComposerFallback context="thread" />
				) : undefined
			}
		/>
	)
}
