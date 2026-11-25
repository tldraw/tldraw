import { EditorAtom, type Editor, type TLLibraryId } from 'tldraw'

/**
 * Whether the libraries panel is open. Scoped per editor, so two editors on one page don't share
 * it.
 * @public
 */
export const librariesPanelOpen = new EditorAtom<boolean>('librariesPanelOpen', () => false)

/**
 * A library to bring into view: the panel unfolds it and scrolls to it, then clears this. Set it
 * with {@link librariesPanelOpen} to show a library, e.g. one just saved to.
 * @public
 */
export const activeLibraryId = new EditorAtom<TLLibraryId | null>('activeLibraryId', () => null)

/** @public */
export function toggleLibrariesPanel(editor: Editor) {
	librariesPanelOpen.update(editor, (open) => !open)
}

/** The library whose name its section header is editing, e.g. straight after creating it. */
export const renamingLibraryId = new EditorAtom<TLLibraryId | null>('renamingLibraryId', () => null)

/**
 * The libraries folded shut in the {@link LibrariesPanel}, kept while the panel is closed. Scoped
 * per editor, like {@link librariesPanelOpen}.
 * @public
 */
export const collapsedLibraryIds = new EditorAtom<TLLibraryId[]>('collapsedLibraryIds', () => [])

/** What the panel's search field holds, kept while the panel is closed. */
export const librariesSearchQuery = new EditorAtom<string>('librariesSearchQuery', () => '')
