import { LibraryNotFoundError, LibraryPermissionError } from '../lib/LibrarySource'
import { LibraryItemContentTooNewError } from '../lib/schema'

/**
 * The UI events the libraries UI reports through tldraw's `onUiEvent`, each with
 * `source: 'libraries'`, or `source: 'command-palette'` from {@link CommandPaletteLibrariesGroup}.
 * Importing `@tldraw/libraries` adds them to `TLUiEventMap`. Writes to a library aren't among them:
 * a host sees those through its {@link LibrarySource}.
 *
 * @public
 */
export interface TLLibrariesUiEventMap {
	/** A libraries panel button, or the command palette, opened or closed the panel. */
	'toggle-libraries-panel': { open: boolean }
	/**
	 * An item was placed on the canvas, by clicking its tile or dragging it out of the panel. Picking
	 * it in the command palette counts as a click.
	 */
	'place-library-item': { method: 'click' | 'drag' }
	/** A dialog for browsing libraries to add was opened. */
	'open-browse-libraries': null
	/** An item couldn't be placed. */
	'library-error': { action: 'place-library-item'; reason: TLLibraryErrorReason }
}

/**
 * Why a library operation failed: the content was made by a newer version of tldraw, the library
 * or item is gone, the user isn't allowed to, or anything else.
 *
 * @public
 */
export type TLLibraryErrorReason = 'too-new' | 'not-found' | 'rejected' | 'failed'

declare module 'tldraw' {
	// eslint-disable-next-line @typescript-eslint/no-empty-object-type
	interface TLUiEventMap extends TLLibrariesUiEventMap {}
}

/**
 * The {@link TLLibraryErrorReason} for an error thrown by a {@link LibrarySource} or while placing
 * an item.
 *
 * @public
 */
export function getLibraryErrorReason(error: unknown): TLLibraryErrorReason {
	if (error instanceof LibraryItemContentTooNewError) return 'too-new'
	if (error instanceof LibraryNotFoundError) return 'not-found'
	if (error instanceof LibraryPermissionError) return 'rejected'
	return 'failed'
}
