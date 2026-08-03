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
	// ── History / undo ───────────────────────────────────────────────────────────────────────
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

	// ── Feature toggles ──────────────────────────────────────────────────────────────────────
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

	// ── Permissions ──────────────────────────────────────────────────────────────────────────
	/**
	 * Whether the viewer may participate in commenting: composing, editing, deleting, resolving, and
	 * moving pins. When false, {@link CommentingComponents.ComposerFallback} renders in the
	 * composer's place and action affordances are hidden. Unset, participation is allowed exactly
	 * when `currentUserId` is set.
	 *
	 * Called during render via {@link useCanComment}, so signal reads are tracked. Posting still
	 * needs a `currentUserId`, so returning true for a signed-out viewer yields a composer whose
	 * send button stays disabled.
	 */
	readonly canComment:
		| ((ctx: { editor: Editor; currentUserId: string | null }) => boolean)
		| undefined

	// ── Anchoring ────────────────────────────────────────────────────────────────────────────
	/** Normalized (0–1) spot within a shape where imprecise shape pins sit. Default top-right. */
	readonly impreciseShapeAnchor: { readonly x: number; readonly y: number }
	/**
	 * Whether a comment landing on a shape pins to the exact clicked spot, or to the shape as a
	 * whole (rendered at `impreciseShapeAnchor`). Always precise by default; return `false`, or
	 * decide from the context. Governs new placements only — existing anchors render as stored.
	 */
	shouldBePrecise(editor: Editor, context: ShapeCommentPrecisionContext): boolean

	// ── Components ────────────────────────────────────────────────────────────────────────────
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
 * Whether the viewer may participate in commenting, per {@link CommentingOptions.canComment}
 * (defaulting to `currentUserId != null` when unset).
 *
 * This is a plain, untracked read — in React, use {@link useCanComment} instead.
 *
 * @public
 */
export function getCanComment(editor: Editor, currentUserId: string | null | undefined): boolean {
	const { canComment } = getCommentingOptions(editor)
	return canComment
		? canComment({ editor, currentUserId: currentUserId ?? null })
		: currentUserId != null
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
