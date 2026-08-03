import { useMemo, type ComponentType } from 'react'
import {
	type Editor,
	type TLComment,
	type TLCommentThread,
	type TLHistoryBatchOptions,
	type TLShapeId,
	type VecLike,
	useEditor,
	useValue,
} from 'tldraw'
import { type CommentListItemRenderProps } from '../ui/comments-list'
import { isAllowedReactionEmoji, type EmojiPickerProps } from '../ui/emoji-picker'
import { type ReactionTooltipProps } from '../ui/reaction'

/**
 * The gesture that's creating a shape anchor, passed to
 * {@link CommentingOptions.shouldBePrecise}: the target shape, the page point of the release, and
 * whether Alt was held.
 *
 * @public
 */
export interface ShapeCommentPrecisionContext {
	readonly shapeId: TLShapeId
	readonly point: VecLike
	readonly altKey: boolean
}

/**
 * A commenting write that belongs to someone in particular, and the record it targets — the
 * argument to {@link CommentingOptions.canModifyComment}.
 *
 * Resolving, reopening, reacting, and moving a pin aren't here: none of them is anyone's in
 * particular, so {@link CommentingOptions.canComment} is the only gate on them.
 *
 * @public
 */
export type CommentModification =
	| { readonly action: 'edit-comment'; readonly comment: TLComment }
	| { readonly action: 'delete-comment'; readonly comment: TLComment }
	| { readonly action: 'delete-thread'; readonly thread: TLCommentThread }

/**
 * The argument to {@link CommentingOptions.canModifyComment}: which write, against which record,
 * and by whom.
 *
 * @public
 */
export type CommentModificationContext = {
	readonly editor: Editor
	readonly currentUserId: string | null
} & CommentModification

/**
 * Component overrides for the batteries-included comments layer. Each slot replaces a built-in
 * piece; leave a slot unset to keep its default.
 *
 * @public
 */
export interface CommentingComponents {
	/** A comment's body. Replaces the default rich-text `<CommentBody>`. */
	CommentBody?: ComponentType<{ comment: TLComment }>
	/** A pin's inner content. Replaces the author-initial default. */
	PinContent?: ComponentType<{ thread: TLCommentThread; comments: TLComment[] }>
	/** A sidebar row's preview. Replaces the plaintext default. */
	ThreadPreview?: ComponentType<{ comment: TLComment }>
	/**
	 * A whole sidebar row. Replaces the default `<CommentListItem>`, which is exported — so a row
	 * that only adds an unread dot or a status chip can spread these props into it. Use
	 * `ThreadPreview` instead when only the preview text is changing.
	 */
	ThreadRow?: ComponentType<CommentListItemRenderProps & { thread: TLCommentThread }>
	/**
	 * Extra controls in an open thread's header, added ahead of the built-in resolve and dismiss
	 * buttons rather than replacing them. "Copy link" is already built in whenever the host supplies
	 * `getThreadHref`.
	 */
	ThreadActions?: ComponentType<{ thread: TLCommentThread; comments: TLComment[] }>
	/**
	 * A reaction's visual, given its token. The default renders the token string for the OS emoji
	 * font. Override to draw a custom palette — an `<img>`, an SVG, anything. The token is what gets
	 * stored and synced; this only controls how it's drawn.
	 */
	ReactionContent?: ComponentType<{ token: string }>
	/**
	 * What the add-reaction button opens. Replaces the default `<EmojiPicker>` grid. Pairs with
	 * `ReactionContent` (which draws the tokens this emits) and `isAllowedReaction` (which must
	 * accept them).
	 */
	ReactionPalette?: ComponentType<EmojiPickerProps>
	/**
	 * The hover affordance naming who reacted with an emoji. Receives the reactors and the pill (as
	 * `children`) and owns the whole thing — box, size, shape, position. For a wording change,
	 * translate the `comments.reacted-*` strings instead.
	 */
	ReactionTooltip?: ComponentType<ReactionTooltipProps>
	/**
	 * Shown where a composer would sit when the viewer can't compose (see
	 * {@link CommentingOptions.canComment}). `context` is the surface rendering it: an open thread
	 * popover (`'thread'`) or the comment tool's placement popover (`'pending'`). Unset, those
	 * surfaces render nothing.
	 */
	ComposerFallback?: ComponentType<{ context: 'pending' | 'thread' }>
}

/**
 * Configuration for the commenting layer. Static config only — pass it once via
 * `CommentTool.configure({ ... })`, mirroring `ShapeUtil.configure`. Live, reactive values
 * (`currentUserId`, author resolution, read-status callbacks) are the `CommentingContext`, passed as
 * props to each commenting surface.
 *
 * For defaults, see {@link defaultCommentingOptions}.
 *
 * @example
 * ```tsx
 * <Tldraw tools={[CommentTool.configure({ history: 'ignore', enableClustering: false })]} />
 * ```
 *
 * @public
 */
export interface CommentingOptions {
	// History / undo
	/**
	 * How comment mutations interact with the editor undo stack. Defaults to `'ignore'` — comments
	 * are deliberately not undoable (see `TLComment`). `'record'` is a multiplayer footgun: undoing
	 * a delete resurrects a thread a collaborator already removed. Safe only single-player.
	 */
	readonly history: TLHistoryBatchOptions['history']
	/**
	 * History mode for the pin drag-to-move re-anchor specifically. Unlike posts/edits this is a
	 * spatial edit that may reasonably be undoable alongside a shape move. Defaults to `history`.
	 */
	readonly dragHistory: TLHistoryBatchOptions['history'] | undefined

	// Feature toggles
	/** Fold nearby pins into count badges as the camera zooms out. */
	readonly enableClustering: boolean
	/**
	 * Whether a user may hold several emoji reactions on one comment. `true` (the default) is the
	 * Slack model: each emoji toggles independently. `false` is single-select: picking a new emoji
	 * replaces the user's existing reaction. Note this is enforced client-side; the server accepts
	 * per-emoji records either way.
	 */
	readonly allowMultipleReactions: boolean
	/**
	 * Whether a token may be added as a reaction. Defaults to {@link isAllowedReactionEmoji}, which
	 * keeps a scripted client from writing junk values the picker would never offer. Override
	 * alongside a custom `ReactionPalette`. Removals aren't checked — an off-palette reaction must
	 * still be clearable.
	 */
	isAllowedReaction(token: string): boolean
	/**
	 * Whether dragging the comment tool out creates a region anchor — a comment attached to a
	 * rectangular area, drawn as a dashed box with the pin on the corner the drag released on. Off
	 * by default, where comments attach to points and shapes only and a drag trails the composer.
	 */
	readonly enableRegions: boolean

	// Permissions
	/**
	 * Whether the viewer may participate in commenting: composing, editing, deleting, resolving, and
	 * moving pins. When false, {@link CommentingComponents.ComposerFallback} renders in the
	 * composer's place and action affordances are hidden. Unset, participation is allowed exactly
	 * when `currentUserId` is set.
	 *
	 * Called during render via {@link useCanComment}, so signal reads are tracked. Posting still
	 * needs a `currentUserId`, so returning true for a signed-out viewer yields a composer whose
	 * send button stays disabled. A callback that throws is logged and read as false, rather than
	 * taking the comments layer down with it.
	 */
	readonly canComment:
		| ((ctx: { editor: Editor; currentUserId: string | null }) => boolean)
		| undefined
	/**
	 * Whether the viewer may make a particular write against a particular record: editing or
	 * deleting a comment, or deleting a thread. Unset, each is its record's owner's to make
	 * ({@link defaultCanModifyComment}) — you edit and delete your own comments, and delete threads
	 * you started. Override it to widen that (a workspace admin or moderator who may remove
	 * anyone's comment) or to narrow it (no edits after an hour). Where it returns false the
	 * affordance isn't rendered.
	 *
	 * Checked after {@link CommentingOptions.canComment}, which gates commenting as a whole: a
	 * viewer who may not participate gets no action affordances at all, whatever this returns.
	 *
	 * Called during render via {@link useCanModifyComment}, so reactive reads (signals) are tracked.
	 * A callback that throws is logged and read as false: an affordance is withheld rather than the
	 * comments layer lost, and a denial is what a server enforcing the same rule would have said.
	 *
	 * @example
	 * ```tsx
	 * CommentTool.configure({
	 * 	canModifyComment: (ctx) =>
	 * 		// Moderators may delete anything; everything else stays the owner's to do.
	 * 		(ctx.action !== 'edit-comment' && isModerator(ctx.currentUserId)) ||
	 * 		defaultCanModifyComment(ctx),
	 * })
	 * ```
	 */
	readonly canModifyComment: ((ctx: CommentModificationContext) => boolean) | undefined

	// Anchoring
	/** Normalized (0–1) spot within a shape where imprecise shape pins sit. Default top-right. */
	readonly impreciseShapeAnchor: { readonly x: number; readonly y: number }
	/**
	 * Whether a comment landing on a shape pins to the exact clicked spot, or to the shape as a
	 * whole (rendered at `impreciseShapeAnchor`). Always precise by default; return `false`, or
	 * decide from the context. Governs new placements only — existing anchors render as stored.
	 */
	shouldBePrecise(editor: Editor, context: ShapeCommentPrecisionContext): boolean

	// Components
	/** Component overrides. See {@link CommentingComponents}. */
	readonly components: CommentingComponents
}

/**
 * The default {@link CommentingOptions}. Override via `CommentTool.configure({ ... })`.
 *
 * @public
 */
export const defaultCommentingOptions = {
	history: 'ignore',
	dragHistory: undefined,
	enableClustering: true,
	allowMultipleReactions: true,
	isAllowedReaction: isAllowedReactionEmoji,
	enableRegions: false,
	canComment: undefined,
	canModifyComment: undefined,
	impreciseShapeAnchor: { x: 1, y: 0 },
	shouldBePrecise: () => true,
	components: {},
} as const satisfies CommentingOptions

/**
 * The merged {@link CommentingOptions} for an editor, read off the registered comment tool (which
 * carries them via `CommentTool.configure`). Falls back to {@link defaultCommentingOptions} when
 * the comment tool isn't registered. Usable from anywhere with an `Editor` — including the tool's
 * own state, which has no React context.
 *
 * @public
 */
export function getCommentingOptions(editor: Editor): CommentingOptions {
	const tool = editor.getStateDescendant('comment') as { options?: CommentingOptions } | undefined
	return tool?.options ?? defaultCommentingOptions
}

/**
 * React hook for {@link getCommentingOptions}. Options are fixed per editor (set at tool
 * registration), so this doesn't need to be reactive.
 *
 * @public
 */
export function useCommentingOptions(): CommentingOptions {
	const editor = useEditor()
	return useMemo(() => getCommentingOptions(editor), [editor])
}

/**
 * Ask a host's permission callback, denying the write if it throws.
 *
 * These are called during render, so an exception in one would take the comments layer down with
 * the answer. Denying costs an affordance, which is what a `false` would have cost anyway, and it
 * can't offer a write a server enforcing the same rule would then reject.
 */
function permits(option: string, check: () => boolean): boolean {
	try {
		return check()
	} catch (error) {
		console.error(`[tldraw] \`${option}\` threw, so the write is denied:`, error)
		return false
	}
}

/**
 * Whether the viewer may participate in commenting, per {@link CommentingOptions.canComment}
 * (defaulting to `currentUserId != null` when unset). A callback that throws denies.
 *
 * This is a plain, untracked read — in React, use {@link useCanComment} instead.
 *
 * @public
 */
export function getCanComment(editor: Editor, currentUserId: string | null | undefined): boolean {
	const { canComment } = getCommentingOptions(editor)
	if (!canComment) return currentUserId != null
	return permits('canComment', () => canComment({ editor, currentUserId: currentUserId ?? null }))
}

/**
 * Reactive React hook for {@link getCanComment}: a `canComment` callback that reads signals
 * re-evaluates when they change.
 *
 * @public
 */
export function useCanComment(currentUserId: string | null | undefined): boolean {
	const editor = useEditor()
	return useValue('can comment', () => getCanComment(editor, currentUserId), [
		editor,
		currentUserId,
	])
}

/**
 * The default {@link CommentingOptions.canModifyComment}: a write is its record's owner's to make —
 * a comment's author edits and deletes it, a thread's creator deletes the thread — and a viewer
 * with no identity may make none of them.
 *
 * Exported so a callback can widen the default rather than restate it:
 * `(ctx) => isModerator(ctx.currentUserId) || defaultCanModifyComment(ctx)`.
 *
 * @public
 */
export function defaultCanModifyComment(ctx: CommentModificationContext): boolean {
	const { currentUserId } = ctx
	if (!currentUserId) return false
	const owner = ctx.action === 'delete-thread' ? ctx.thread.createdBy : ctx.comment.authorId
	return owner === currentUserId
}

/**
 * Whether the viewer may make a given write against a given record, per
 * {@link CommentingOptions.canModifyComment} (defaulting to {@link defaultCanModifyComment} when
 * unset). Where this is false the affordance isn't rendered.
 *
 * This is the per-record rule alone: the built-in UI additionally requires
 * {@link CommentingOptions.canComment}, since a viewer who may not participate gets no action
 * affordances at all.
 *
 * A plain, untracked read — a `canModifyComment` callback that reads signals is not observed. In
 * React, use {@link useCanModifyComment} instead.
 *
 * @public
 */
export function getCanModifyComment(
	editor: Editor,
	currentUserId: string | null | undefined,
	modification: CommentModification
): boolean {
	const { canModifyComment } = getCommentingOptions(editor)
	const ctx: CommentModificationContext = {
		editor,
		currentUserId: currentUserId ?? null,
		...modification,
	}
	if (!canModifyComment) return defaultCanModifyComment(ctx)
	return permits('canModifyComment', () => canModifyComment(ctx))
}

/**
 * Reactive React hook for {@link getCanModifyComment}: a `canModifyComment` callback that reads
 * signals re-evaluates when they change.
 *
 * @public
 */
export function useCanModifyComment(
	currentUserId: string | null | undefined,
	modification: CommentModification
): boolean {
	const editor = useEditor()
	// Comment records are immutable, so the record itself is what changes when the thing being
	// checked changes — `modification` is a fresh object on every render and can't be a dep.
	const record =
		modification.action === 'delete-thread' ? modification.thread : modification.comment
	return useValue(
		'can modify comment',
		() => getCanModifyComment(editor, currentUserId, modification),
		[editor, currentUserId, modification.action, record]
	)
}
