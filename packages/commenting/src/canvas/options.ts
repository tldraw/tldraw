import { useMemo, type ComponentType } from 'react'
import {
	type Editor,
	type TLComment,
	type TLCommentThread,
	type TLHistoryBatchOptions,
	type TLShapeId,
	type VecLike,
	useEditor,
} from 'tldraw'
import { isAllowedReactionEmoji, type EmojiPickerProps } from '../ui/emoji-picker'

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

	// ── Clustering tuning ─────────────────────────────────────────────────────────────────────
	/** Screen-pixel margin by which the viewport is inflated when culling cluster badges. */
	readonly clusterCullMargin: number
	/** How far past a cluster's split zoom to land when expanding it (1.05 = 5% overshoot). */
	readonly clusterSplitZoomFactor: number

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
	impreciseShapeAnchor: { x: 1, y: 0 },
	shouldBePrecise: () => true,
	clusterCullMargin: 120,
	clusterSplitZoomFactor: 1.05,
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
