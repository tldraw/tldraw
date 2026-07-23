import {
	EditorAtom,
	type BoxModel,
	type Editor,
	type TLHistoryBatchOptions,
	useEditor,
	useValue,
} from 'tldraw'
import type { PendingComment } from './comment-tool'
import { getCommentingOptions } from './options'
import { DEFAULT_SIDEBAR_FILTERS, type SidebarFilters } from './sidebar-filters'

/**
 * Transient commenting UI state, scoped per editor via {@link EditorAtom}. Editor-scoping (rather
 * than module-global atoms) keeps two editors on one page — or an editor and a second instance —
 * from sharing open-thread, visibility, and filter state. Reachable from both React (`useEditor()`)
 * and the comment tool (`this.editor`).
 */

/** The id of the one open thread (only one popover is open at a time), or null when all closed.
 * @public */
export const openThreadId = new EditorAtom<string | null>('openThreadId', () => null)

/** The comment currently being placed (composer open, not yet posted), or null.
 * @public */
export const pendingComment = new EditorAtom<PendingComment | null>('pendingComment', () => null)

/** The region rectangle being dragged out right now (page coords), or null when not dragging. The
 *  comment tool writes it on each move; the overlay reads it to draw the live dashed box. */
export const regionDraft = new EditorAtom<BoxModel | null>('regionDraft', () => null)

/**
 * Whether comment pins are hidden on the canvas. Governs the on-canvas layer (pins + open popover)
 * only — the sidebar is unaffected.
 * @public
 */
export const commentsHidden = new EditorAtom<boolean>('commentsHidden', () => false)

/**
 * Whether the comments sidebar (the thread list) is open. Driven by an explicit control — a button
 * next to Share on dotcom — rather than by which tool is active, so browsing threads is separate
 * from placing them. The comment tool additionally closes it on enter, keeping placement
 * canvas-focused.
 * @public
 */
export const commentsSidebarOpen = new EditorAtom<boolean>('commentsSidebarOpen', () => false)

/** Which threads the comments sidebar shows.
 * @public */
export const sidebarFilters = new EditorAtom<SidebarFilters>(
	'sidebarFilters',
	() => DEFAULT_SIDEBAR_FILTERS
)

/** Toggle comment-pin visibility for an editor.
 * @public */
export function toggleCommentsHidden(editor: Editor): void {
	commentsHidden.update(editor, (hidden) => !hidden)
}

/** Open or close the comments sidebar for an editor.
 * @public */
export function toggleCommentsSidebar(editor: Editor): void {
	commentsSidebarOpen.update(editor, (open) => !open)
}

/** React hook for the open thread id.
 * @public */
export function useOpenThreadId(): string | null {
	const editor = useEditor()
	return useValue('open thread id', () => openThreadId.get(editor), [editor])
}

/** React hook for the pending (being-placed) comment.
 * @public */
export function usePendingComment(): PendingComment | null {
	const editor = useEditor()
	return useValue('pending comment', () => pendingComment.get(editor), [editor])
}

/** React hook for whether comment pins are hidden.
 * @public */
export function useCommentsHidden(): boolean {
	const editor = useEditor()
	return useValue('comments hidden', () => commentsHidden.get(editor), [editor])
}

/** React hook for whether the comments sidebar is open.
 * @public */
export function useCommentsSidebarOpen(): boolean {
	const editor = useEditor()
	return useValue('comments sidebar open', () => commentsSidebarOpen.get(editor), [editor])
}

/** React hook for the current sidebar filters.
 * @public */
export function useSidebarFilters(): SidebarFilters {
	const editor = useEditor()
	return useValue('sidebar filters', () => sidebarFilters.get(editor), [editor])
}

/**
 * Commit a comment mutation with the configured undo/redo behavior. All comment writes go through
 * here so the {@link CommentingOptions.history} option (and {@link CommentingOptions.dragHistory}
 * for pin re-anchors) governs whether they land on the undo stack. Defaults to `'ignore'`.
 * @public
 */
export function commitCommentMutation<T>(
	editor: Editor,
	fn: () => T,
	kind: 'mutation' | 'drag' = 'mutation'
): T {
	const options = getCommentingOptions(editor)
	const history: TLHistoryBatchOptions['history'] =
		kind === 'drag' ? (options.dragHistory ?? options.history) : options.history
	let result: T
	editor.run(
		() => {
			result = fn()
		},
		{ history }
	)
	return result!
}
