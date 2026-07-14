import { EditorAtom, type Editor, type TLHistoryBatchOptions, useEditor, useValue } from 'tldraw'
import type { PendingComment } from './comment-tool'
import { getCommentingOptions } from './options'
import type { SidebarFilters } from './sidebar-filters'

/**
 * Transient commenting UI state, scoped per editor via {@link EditorAtom}. Editor-scoping (rather
 * than module-global atoms) keeps two editors on one page — or an editor and a second instance —
 * from sharing open-thread, visibility, and filter state. Reachable from both React (`useEditor()`)
 * and the comment tool (`this.editor`).
 */

/** The id of the one open thread (only one popover is open at a time), or null when all closed. */
export const openThreadId = new EditorAtom<string | null>('openThreadId', () => null)

/** The comment currently being placed (composer open, not yet posted), or null. */
export const pendingComment = new EditorAtom<PendingComment | null>('pendingComment', () => null)

/**
 * Whether comment pins are hidden on the canvas. Governs the on-canvas layer (pins + open popover)
 * only — the sidebar is unaffected. Seeded from `options.initiallyHidden`.
 */
export const commentsHidden = new EditorAtom<boolean>(
	'commentsHidden',
	(editor) => getCommentingOptions(editor).initiallyHidden
)

/** Which threads the comments sidebar shows. Seeded from `options.defaultSidebarFilters`. */
export const sidebarFilters = new EditorAtom<SidebarFilters>(
	'sidebarFilters',
	(editor) => getCommentingOptions(editor).defaultSidebarFilters
)

/** Toggle comment-pin visibility for an editor. */
export function toggleCommentsHidden(editor: Editor): void {
	commentsHidden.update(editor, (hidden) => !hidden)
}

/** React hook for the open thread id. */
export function useOpenThreadId(): string | null {
	const editor = useEditor()
	return useValue('open thread id', () => openThreadId.get(editor), [editor])
}

/** React hook for the pending (being-placed) comment. */
export function usePendingComment(): PendingComment | null {
	const editor = useEditor()
	return useValue('pending comment', () => pendingComment.get(editor), [editor])
}

/** React hook for whether comment pins are hidden. */
export function useCommentsHidden(): boolean {
	const editor = useEditor()
	return useValue('comments hidden', () => commentsHidden.get(editor), [editor])
}

/** React hook for the current sidebar filters. */
export function useSidebarFilters(): SidebarFilters {
	const editor = useEditor()
	return useValue('sidebar filters', () => sidebarFilters.get(editor), [editor])
}

/**
 * Run a comment mutation with the configured undo/redo behavior. All comment writes go through
 * here so the {@link CommentingOptions.history} option (and {@link CommentingOptions.dragHistory}
 * for pin re-anchors) governs whether they land on the undo stack. Defaults to `'ignore'`.
 */
export function runComment<T>(
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
