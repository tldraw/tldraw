import { useValue, type TLLibrary } from 'tldraw'
import type { LibrarySource } from '../lib/LibrarySource'

/**
 * The libraries a source lists, in its order. Updates when the source changes.
 * @public
 */
export function useLibraries(source: LibrarySource): TLLibrary[] {
	return useValue('libraries', () => source.getLibraries(), [source])
}
