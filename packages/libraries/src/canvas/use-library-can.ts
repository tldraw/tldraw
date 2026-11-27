import { useValue } from 'tldraw'
import type { LibrarySource, TLLibraryAction, TLLibraryTarget } from '../lib/LibrarySource'

/**
 * Whether the current user may do `action`, as {@link LibrarySource.can} answers. Updates when
 * the source's answer changes.
 * @public
 */
export function useLibraryCan(
	source: LibrarySource,
	action: TLLibraryAction,
	target?: TLLibraryTarget
): boolean {
	const targetKey = typeof target === 'object' ? `owner:${target.ownerId}` : target
	return useValue('library can', () => source.can(action, target), [source, action, targetKey])
}
