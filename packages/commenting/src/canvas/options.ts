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
	 * A reaction's visual, given its token. The default renders the token string for the OS emoji
	 * font to draw (so the token is the emoji glyph). Override this to render your own palette —
	 * return an `<img>` for custom emoji, an SVG, or anything. The token is whatever your picker
	 * emits and is what gets stored/synced; this only controls how it's drawn.
	 */
	ReactionContent?: ComponentType<{ token: string }>
	/**
	 * What the add-reaction button opens: the thing that produces a reaction token. Replaces the
	 * default `<EmojiPicker>` grid. Pairs with `ReactionContent` (which draws whatever tokens this
	 * emits) and with `isAllowedReaction` (which has to accept them).
	 */
	ReactionPalette?: ComponentType<EmojiPickerProps>
	/**
	 * The hover affordance naming who reacted with an emoji. It receives the reactors and the pill
	 * (as `children`) and returns the whole thing — so it owns the tooltip, its box, size, shape, and
	 * position. Replaces the default (`DefaultReactionTooltip`). For a simple wording change, translate
	 * the `comments.reacted-*` strings instead; reach for this to change the structure — a different
	 * box, avatars, a banner anywhere on screen.
	 */
	ReactionTooltip?: ComponentType<ReactionTooltipProps>
	/** Shown where a composer would sit when the viewer can't compose (see
	 *  {@link CommentingOptions.canComment} — a signed-out viewer, a viewer role, a host that
	 *  turns commenting off). `context` says which surface is rendering it: the bottom of an open
	 *  thread popover (`'thread'`) or the placement popover the comment tool opens (`'pending'`).
	 *  Unset, those surfaces render nothing. */
	ComposerFallback?: ComponentType<{ context: 'pending' | 'thread' }>
}

/**
 * Configuration for the commenting layer. Static config only — pass it once via
 * `CommentTool.configure({ ... })`, mirroring `ShapeUtil.configure`. Live, reactive values
 * (`currentUserId`, `resolveName`, read-status callbacks) stay as props on `<CanvasComments>`.
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
	 * How comment mutations (post, reply, edit, resolve, delete) interact with the editor undo
	 * stack. Defaults to `'ignore'` — comments are deliberately not undoable (see `TLComment`).
	 * `'record'` is a multiplayer footgun: undoing a delete resurrects a thread a collaborator
	 * already removed, and undoing a resolve/edit reverts their newer state. Safe only single-player
	 * or on a non-synced local comment store.
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
	 * Whether a token may be added as a reaction. Defaults to {@link isAllowedReactionEmoji} against
	 * the built-in emoji palette, which is what keeps a scripted client from writing junk `emoji`
	 * values the picker would never offer. Override it alongside a custom `ReactionPalette` so the
	 * tokens that palette emits get through. Removals aren't checked — a reaction carrying an
	 * off-palette token must still be clearable.
	 */
	isAllowedReaction(token: string): boolean
	/**
	 * Whether dragging the comment tool out creates a region anchor — a comment attached to a
	 * rectangular area of the page, drawn as a dashed box with the thread's pin on the corner the
	 * drag released on. Off by default: comments attach to points and shapes only, and a drag just
	 * trails the composer. A region reveals its box while the pointer is inside it, moves by its
	 * pin, and resizes from its corners.
	 */
	readonly enableRegions: boolean

	// ── Permissions ──────────────────────────────────────────────────────────────────────────
	/**
	 * Whether the viewer may participate in commenting: composing new threads and replies, editing
	 * and deleting comments, resolving threads, and moving pins or regions. Composers render when
	 * it returns true; when it returns false, the {@link CommentingComponents.ComposerFallback}
	 * slot renders in their place (or nothing, if that slot is unset) and the action affordances
	 * are hidden. Unset, participation is allowed exactly when `currentUserId` is set.
	 *
	 * Called during render via {@link useCanComment}, so reactive reads (signals) are tracked.
	 * The comment tool itself stays registered and selectable — hosts that want its toolbar button
	 * to do something else (e.g. open a sign-in dialog) can override the tool item's `onSelect`.
	 * Note posting still requires a `currentUserId` to author the records, so a callback that
	 * returns true for a signed-out viewer yields a composer whose send button stays disabled.
	 */
	readonly canComment:
		| ((ctx: { editor: Editor; currentUserId: string | null }) => boolean)
		| undefined

	// ── Anchoring ────────────────────────────────────────────────────────────────────────────
	/** Normalized (0–1) spot within a shape where imprecise shape pins sit. Default top-right. */
	readonly impreciseShapeAnchor: { readonly x: number; readonly y: number }
	/**
	 * Whether a comment landing on a shape anchors precisely — pinned to the exact clicked spot
	 * within the shape — or imprecisely — pinned to the shape as a whole, rendered at
	 * `impreciseShapeAnchor`. Called wherever a shape anchor is created (placing with the comment
	 * tool, dropping a dragged pin onto a shape). Always precise by default. Return `false` for
	 * shape-level anchoring, or decide from the context — the Alt key's state, or the shape itself,
	 * e.g. precise only on notes. Governs new placements only; existing anchors render as stored.
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
 * (defaulting to `currentUserId != null` when unset). Where this is false, composers give way to
 * the {@link CommentingComponents.ComposerFallback} slot and action affordances are hidden.
 *
 * This is a plain, untracked read — a `canComment` callback that reads signals is not observed.
 * In React, use {@link useCanComment} instead.
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
