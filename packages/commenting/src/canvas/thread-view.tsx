import { ReactNode, useCallback, useEffect, useRef, useState, type CSSProperties } from 'react'
import { createPortal } from 'react-dom'
import {
	createComment,
	Editor,
	TLComment,
	TLCommentThread,
	TLRichText,
	TldrawUiButton,
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

/** How long the copy-link item reads "Link copied" before reverting. */
const LINK_COPIED_MS = 2000

/**
 * What a thread's `getThreadHref` should put on the clipboard. Hosts hand back an href, which is
 * allowed to be relative (`/file/abc?comment=…`) — that works as a link target but is meaningless
 * once it's pasted into a chat window, so it's resolved against the current document first. An href
 * the URL parser can't make sense of is copied as-is rather than dropped.
 *
 * @internal
 */
export function absoluteThreadLink(href: string, base = window.location.href): string {
	try {
		return new URL(href, base).toString()
	} catch {
		return href
	}
}

/**
 * Copy a thread's link, with a flag that stays set briefly afterwards so the control can confirm.
 * The flag only sets once the write actually resolves — a clipboard the browser withholds
 * (an insecure context, a denied permission) leaves the label alone rather than claiming a copy
 * that didn't happen.
 */
function useCopyLink(href: string | undefined) {
	const [copied, setCopied] = useState(false)
	useEffect(() => {
		if (!copied) return
		const timeout = window.setTimeout(() => setCopied(false), LINK_COPIED_MS)
		return () => window.clearTimeout(timeout)
	}, [copied])
	const copy = useCallback(() => {
		if (href === undefined) return
		navigator.clipboard?.writeText(absoluteThreadLink(href)).then(
			() => setCopied(true),
			() => setCopied(false)
		)
	}, [href])
	return [copied, copy] as const
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

/** A cluster/stack badge is this square (`--tlui-cmt-marker-size`) — pin-sized, so the marker
 *  kinds read as one family. Keep in sync with the stylesheet. */
const MARKER_SIZE = PIN_SIZE

/** Where a popover's top card sits vertically, measured from the marker visual's middle. */
const CARD_TOP_Y = -28

/** The horizontal gap between a marker visual's right edge and its popover/preview panel. The
 *  preview's hover bridge spans exactly this (see `--tlui-cmt-preview-bridge`). */
const PREVIEW_GAP = 6

/**
 * Where a marker's popover sits relative to the marker's anchor point.
 *
 * The hover preview places itself at these same origins, so the two views of a thread differ only
 * by the header the popover has — which its own stylesheet then compensates for. Moving a popover
 * here moves its preview with it.
 *
 * Both marker kinds hang off their point the same way (`translate(0, -100%)`): the anchor is the
 * visual's bottom-left corner. They differ only in size, so each offset clears its own width plus
 * the shared gap, and re-bases the shared card-top measure from its bottom anchor to its middle —
 * keeping the two previews' top cards on the same line.
 */
export const POPOVER_OFFSET = {
	thread: { x: PIN_SIZE + PREVIEW_GAP, y: CARD_TOP_Y - PIN_SIZE / 2 },
	list: { x: MARKER_SIZE + PREVIEW_GAP, y: CARD_TOP_Y - MARKER_SIZE / 2 },
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
		getThreadHref,
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

	const ThreadActions = options.components.ThreadActions
	// The host's URL for this thread, when it supplies one. Its presence is what puts "copy link" in
	// the header menu — a host that has per-thread URLs shouldn't have to rebuild the thread view to
	// offer the one affordance every commenting product has.
	const threadHref = getThreadHref?.(thread.id)
	const [linkCopied, copyThreadLink] = useCopyLink(threadHref)
	const canDeleteThread = canComment && currentUserId != null && currentUserId === thread.createdBy

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
										<TldrawUiButton
											type="icon"
											tooltip={msg('comments.more-options')}
											title={msg('comments.more-options')}
											className="tlui-cmt-thread__action"
											data-cmt-more-for={comment.id}
										>
											<TldrawUiIcon
												icon="dots-vertical"
												label={msg('comments.more-options')}
												small
											/>
										</TldrawUiButton>
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
	const resolveLabel = msg(thread.resolved ? 'comments.reopen' : 'comments.resolve')
	const headerActions = (
		<>
			{/* Host verbs — assign, link a ticket — sit ahead of the built-in actions. */}
			{ThreadActions && <ThreadActions thread={thread} comments={comments} />}
			{(threadHref !== undefined || canDeleteThread) && (
				<TldrawUiDropdownMenuRoot id={`comment-thread-actions-${thread.id}`}>
					<TldrawUiDropdownMenuTrigger>
						<TldrawUiButton
							type="icon"
							tooltip={msg('comments.more-options')}
							title={msg('comments.more-options')}
							className="tlui-cmt-thread__action"
						>
							<TldrawUiIcon icon="dots-vertical" label={msg('comments.more-options')} small />
						</TldrawUiButton>
					</TldrawUiDropdownMenuTrigger>
					<TldrawUiDropdownMenuContent
						className="tlui-cmt-menu"
						side="bottom"
						align="start"
						alignOffset={0}
						sideOffset={4}
					>
						<TldrawUiDropdownMenuGroup>
							{/* A link is a read affordance: offered to anyone who can see the thread,
							    including a viewer who can't comment. `noClose` keeps the menu up so the
							    item can confirm the copy in place. */}
							{threadHref !== undefined && (
								<TldrawUiDropdownMenuItem noClose>
									<button type="button" className="tlui-cmt-menu-item" onClick={copyThreadLink}>
										<span>{msg(linkCopied ? 'comments.link-copied' : 'comments.copy-link')}</span>
									</button>
								</TldrawUiDropdownMenuItem>
							)}
							{/* Deleting a thread is creator-only (server-enforced). */}
							{canDeleteThread && (
								<TldrawUiDropdownMenuItem>
									<button
										type="button"
										className="tlui-cmt-menu-item tlui-cmt-menu-item--danger"
										onClick={removeThread}
									>
										<span>{msg('comments.delete')}</span>
									</button>
								</TldrawUiDropdownMenuItem>
							)}
						</TldrawUiDropdownMenuGroup>
					</TldrawUiDropdownMenuContent>
				</TldrawUiDropdownMenuRoot>
			)}
			{canComment && currentUserId && (
				<TldrawUiButton
					type="icon"
					tooltip={resolveLabel}
					title={resolveLabel}
					className="tlui-cmt-thread__action"
					onClick={toggleResolve}
				>
					<TldrawUiIcon icon="check" label={resolveLabel} small />
				</TldrawUiButton>
			)}
			<TldrawUiButton
				type="icon"
				tooltip={msg('comments.dismiss')}
				title={msg('comments.dismiss')}
				className="tlui-cmt-thread__action"
				onClick={() => openThreadId.set(editor, null)}
			>
				<TldrawUiIcon icon="cross-2" label={msg('comments.dismiss')} small />
			</TldrawUiButton>
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
