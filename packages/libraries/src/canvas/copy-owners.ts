import type { LibrarySource } from '../lib/LibrarySource'

/**
 * The owners a library can be copied to: those other than its own that the source allows creating
 * a library for.
 */
export function getCopyOwners(source: LibrarySource, ownerId: string | undefined) {
	const owners = source.getLibraryOwners ? source.getLibraryOwners() : []
	return owners.filter(
		(owner) => owner.id !== ownerId && source.can('createLibrary', { ownerId: owner.id })
	)
}
