import { useMemo, type ComponentType } from 'react'
import {
	type Editor,
	type TLComment,
	type TLCommentThread,
	type TLHistoryBatchOptions,
	useEditor,
} from 'tldraw'
import { DEFAULT_SIDEBAR_FILTERS, type SidebarFilters } from './sidebar-filters'

/**
 * Component overrides for the batteries-included comments layer. Each slot replaces a built-in
 * piece. Generalizes the older `renderBody` / `renderPinContent` / `renderPreview` render props
 * into one map — those props still win when both are provided, so this is additive.
 *
 * @public
 */
export interface CommentingComponents {
	/** A comment's body. Replaces the default rich-text `<CommentBody>`. Supersedes `renderBody`. */
	CommentBody?: ComponentType<{ comment: TLComment }>
	/** A pin's inner content. Replaces the author-initial default. Supersedes `renderPinContent`. */
	PinContent?: ComponentType<{ thread: TLCommentThread; comments: TLComment[] }>
	/** A sidebar row's preview. Replaces the plaintext default. Supersedes `renderPreview`. */
	ThreadPreview?: ComponentType<{ comment: TLComment }>
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
 * <Tldraw tools={[CommentTool.configure({ history: 'ignore', enableDelete: false })]} />
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
	/** Show the resolve/reopen affordance in the thread header. */
	readonly enableResolve: boolean
	/** Show the delete-thread affordance. */
	readonly enableDelete: boolean
	/** Allow editing your own comments. */
	readonly enableEdit: boolean
	/** Allow dragging a pin to re-anchor its thread. */
	readonly enableDragToMove: boolean
	/** Fold nearby pins into count badges as the camera zooms out. */
	readonly enableClustering: boolean
	/** Open the thread named by a `?comment=<id>` deep link on mount. */
	readonly enableDeepLinks: boolean

	// ── Anchoring ────────────────────────────────────────────────────────────────────────────
	/** Normalized (0–1) spot within a shape where imprecise shape pins sit. Default top-right. */
	readonly impreciseShapeAnchor: { readonly x: number; readonly y: number }
	/** Pixels a pin-drag must travel before it counts as a move rather than a click. */
	readonly dragThreshold: number

	// ── Clustering / animation tuning ─────────────────────────────────────────────────────────
	/** Screen-pixel margin by which the viewport is inflated when culling cluster badges. */
	readonly clusterCullMargin: number
	/** Cross-fade duration (ms) when cluster nodes enter/exit. */
	readonly clusterFadeMs: number
	/** Duration (ms) of the click-a-badge zoom-to-split animation. */
	readonly clusterExpandZoomMs: number
	/** How far past a cluster's split zoom to land when expanding it (1.05 = 5% overshoot). */
	readonly clusterSplitZoomFactor: number
	/** Duration (ms) of the center-on-thread camera animation (focus, deep link). */
	readonly focusAnimationMs: number

	// ── Shortcuts ────────────────────────────────────────────────────────────────────────────
	/** Whether Shift+C toggles comment-pin visibility (matching Figma). */
	readonly enableVisibilityShortcut: boolean
	/** Close the open thread on Escape. */
	readonly closeThreadOnEscape: boolean

	// ── Deep links / sidebar ──────────────────────────────────────────────────────────────────
	/** URL search param read for deep links. Default `'comment'`. */
	readonly deepLinkParam: string
	/** Tool ids that reveal the comments sidebar. Default `['comment']`. */
	readonly sidebarTools: readonly string[]
	/** Initial sidebar filter state. */
	readonly defaultSidebarFilters: SidebarFilters
	/** Whether comment pins start hidden. */
	readonly initiallyHidden: boolean

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
	enableResolve: true,
	enableDelete: true,
	enableEdit: true,
	enableDragToMove: true,
	enableClustering: true,
	enableDeepLinks: true,
	impreciseShapeAnchor: { x: 1, y: 0 },
	dragThreshold: 4,
	clusterCullMargin: 120,
	clusterFadeMs: 150,
	clusterExpandZoomMs: 450,
	clusterSplitZoomFactor: 1.05,
	focusAnimationMs: 200,
	enableVisibilityShortcut: true,
	closeThreadOnEscape: true,
	deepLinkParam: 'comment',
	sidebarTools: ['comment'],
	defaultSidebarFilters: DEFAULT_SIDEBAR_FILTERS,
	initiallyHidden: false,
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
