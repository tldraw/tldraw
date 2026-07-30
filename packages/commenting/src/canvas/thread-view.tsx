import { ReactNode, useCallback, useEffect, useRef, useState, type CSSProperties } from 'react'
import { createPortal } from 'react-dom'
import {
	createComment,
	Editor,
	TLComment,
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
import {
	commitCommentMutation,
	deleteComment,
	deleteThread,
	editComment,
	putRecordsInCommit,
	reopenThread,
	resolveThread,
} from './comment-mutations'
import { CommentReactionPicker, CommentReactions } from './comment-reactions'
import { UNKNOWN_AUTHOR, UNKNOWN_COMMENT_AUTHOR } from './comment-render'
import { type CommentingContext } from './context'
import { useThreadComments } from './hooks'
import { type CommentingComponents, useCanComment, useCommentingOptions } from './options'
import { openThreadId } from './state'

const stop = (e: { stopPropagation(): void }) => e.stopPropagation()

/**
 * A name-only view of an author resolver, for the mention/rich-text paths. Stable identity, so
 * `CommentBody`'s memoized render doesn't recompute on every render of its host.
 */
export function useResolveName(resolveAuthor: CommentingContext['resolveAuthor']) {
	return useCallback((id: string) => resolveAuthor(id)?.name, [resolveAuthor])
}

export function toCardProps(
	comment: TLComment,
	props: Pick<CommentingContext, 'currentUserId' | 'resolveAuthor'>,
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

/** A pin is this square (mirrors `--tlui-cmt-pin-size`). Needed because the two marker kinds are
 *  different sizes *and* anchor at different points, and lining their previews up means
 *  correcting for that. Keep in sync with the stylesheet. */
const PIN_SIZE = 28

/** A coincident stack's / cluster's card list, whose first card sits flush with the popover top.
 *  x = half the 34px badge (it's centred on its point) + the same 6px gap the pin's preview uses. */
const LIST_OFFSET = { x: 23, y: -28 } as const

/**
 * Where a marker's popover sits relative to the marker's anchor point.
 *
 * The hover preview places itself at these same origins, so the two views of a thread differ only
 * by the header the popover has — which its own stylesheet then compensates for. Moving a popover
 * here moves its preview with it.
 *
 * The two marker kinds don't anchor alike, which the vertical offsets have to correct for. A
 * badge is centred on its point (`translate(-50%, -50%)`), so `LIST_OFFSET.y` is measured from its
 * middle. A pin hangs off its point (`translate(0, -100%)`), so its point is the pin's *bottom*.
 * Measuring a raw offset from there would drop the pin's preview half a pin below a badge's; the
 * terms below re-base it so the two previews' top cards land on the same line.
 */
export const POPOVER_OFFSET = {
	/**
	 * A single pin's thread popover. Its preview should read level with a cluster/stack preview's
	 * top card, so start from the list offset and re-base it from the pin's bottom anchor to the
	 * pin's middle — where a badge measures from — with `- PIN_SIZE / 2`. The opened popover shares
	 * the offset and opens from there.
	 */
	thread: { x: PIN_SIZE + 6, y: LIST_OFFSET.y - PIN_SIZE / 2 },
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
}: CommentingContext & { editor: Editor; thread: TLCommentThread }) {
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
	// Where focus goes when the edit composer closes, resolved at that moment rather than held as an
	// element: the card (and its edit button with it) unmounts while the composer stands in its
	// place, so the node captured on the way in is gone by the way out.
	const editReturnFocus = useRef<(() => HTMLElement | null) | null>(null)

	// Tab from the canvas drops the caret in the reply box. Clicking a pin opens the thread but
	// leaves focus on the editor container, so the first Tab would otherwise walk the app's own UI
	// instead of the panel the click just opened. Capture phase, ahead of the editor's own handling.
	// Fires once per open thread, so Tab inside the thread stays plain tab-through.
	const [focusReply, setFocusReply] = useState(false)
	const tabTaken = useRef(false)
	const swallowTabUp = useRef(false)
	useEffect(() => {
		if (!canReply) {
			// Resolving unmounts the reply box under an open thread. Reopening it should feel like a
			// freshly opened thread: no autoFocus left armed from the last Tab, and Tab available again.
			setFocusReply(false)
			tabTaken.current = false
			return
		}
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

	// Leaving the edit composer — Escape, or a save — unmounts it while it holds focus, and the
	// browser drops focus on the editor container. That's outside the thread, so a Tab from there
	// walks the app's UI instead of carrying on from where the edit left off (the thread's one
	// Tab-into-the-reply-box has usually been spent by then). Hand focus back to whatever opened the
	// composer instead: the card's edit button, or the reply box when the edit came from arrow-up.
	// The card's actions row reveals itself on `:focus-within`, so the button focus is visible.
	useEffect(() => {
		if (editingId !== null) return
		const resolve = editReturnFocus.current
		editReturnFocus.current = null
		// Runs after React has swapped the card back in, so the target is mounted again by now.
		resolve?.()?.focus()
	}, [editingId])

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
			putRecordsInCommit(editor, [comment])
			if (onPostComment) onPostComment(comment)
		})
		setReply(EMPTY_COMMENT)
		clearCommentDraft(replyDraftSlot(thread.id))
	}

	const toggleResolve = () => {
		if (!currentUserId) return
		if (thread.resolved) reopenThread(editor, thread)
		else resolveThread(editor, thread, currentUserId)
	}

	const removeThread = () => {
		if (!currentUserId) return
		deleteThread(editor, thread)
	}

	const startEdit = (comment: TLComment, { fromMoreMenu = false } = {}) => {
		// The ⋯ menu's button is the thing to come back to when Edit opened the composer — looked up
		// again on the way out, since the menu item that was clicked (and the card) unmount while the
		// composer stands in their place. Otherwise come back to whatever held focus: arrow-up-to-edit
		// comes straight from the reply box, which stays put. The document body and the editor
		// container are where focus falls when nothing holds it, so neither is somewhere to return to.
		const active = container.ownerDocument.activeElement
		editReturnFocus.current = fromMoreMenu
			? () => container.querySelector<HTMLElement>(`[data-cmt-more-for="${comment.id}"]`)
			: active instanceof HTMLElement && active !== container && active !== document.body
				? () => (active.isConnected ? active : null)
				: null
		setEditingId(comment.id)
		setEditText(comment.body)
	}

	const saveEdit = () => {
		const comment = comments.find((c) => c.id === editingId)
		if (!comment || isCommentEmpty(editText)) return
		editComment(editor, comment, editText)
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
						// Reacting is a commenting write: without `canComment` the tally renders
						// read-only (no identity → pills aren't clickable).
						currentUserId={canComment ? currentUserId : null}
						resolveName={resolveName}
					/>
				}
				actions={
					canComment && (
						<>
							<CommentReactionPicker comment={comment} currentUserId={currentUserId} />
							{comment.authorId === currentUserId && (
								<TldrawUiDropdownMenuRoot id={`comment-actions-${comment.id}`}>
									<TldrawUiDropdownMenuTrigger>
										<TooltipButton
											tooltip={msg('comments.more-options')}
											className="tlui-cmt-thread__action"
											data-cmt-more-for={comment.id}
										>
											<TldrawUiIcon
												icon="dots-vertical"
												label={msg('comments.more-options')}
												small
											/>
										</TooltipButton>
									</TldrawUiDropdownMenuTrigger>
									<TldrawUiDropdownMenuContent
										className="tlui-cmt-menu"
										side="bottom"
										align="start"
										alignOffset={0}
										sideOffset={4}
									>
										<TldrawUiDropdownMenuGroup>
											<TldrawUiDropdownMenuItem>
												<button
													type="button"
													className="tlui-cmt-menu-item"
													onClick={() => startEdit(comment, { fromMoreMenu: true })}
												>
													<span>{msg('comments.edit')}</span>
												</button>
											</TldrawUiDropdownMenuItem>
											<TldrawUiDropdownMenuItem>
												<button
													type="button"
													className="tlui-cmt-menu-item tlui-cmt-menu-item--danger"
													onClick={() => deleteComment(editor, comment)}
												>
													<span>{msg('action.delete')}</span>
												</button>
											</TldrawUiDropdownMenuItem>
										</TldrawUiDropdownMenuGroup>
									</TldrawUiDropdownMenuContent>
								</TldrawUiDropdownMenuRoot>
							)}
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
						align="start"
						alignOffset={0}
						sideOffset={4}
					>
						<TldrawUiDropdownMenuGroup>
							<TldrawUiDropdownMenuItem>
								<button
									type="button"
									className="tlui-cmt-menu-item tlui-cmt-menu-item--danger"
									onClick={removeThread}
								>
									<span>{msg('comments.delete')}</span>
								</button>
							</TldrawUiDropdownMenuItem>
						</TldrawUiDropdownMenuGroup>
					</TldrawUiDropdownMenuContent>
				</TldrawUiDropdownMenuRoot>
			)}
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
			<TooltipButton
				tooltip={msg('comments.dismiss')}
				className="tlui-cmt-thread__action"
				onClick={() => openThreadId.set(editor, null)}
			>
				<TldrawUiIcon icon="cross-2" label={msg('comments.dismiss')} small />
			</TooltipButton>
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
