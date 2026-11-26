import type { LibrarySource, TLLibraryOwner } from '../lib/LibrarySource'

export function getDefaultOwnerId(source: LibrarySource) {
	return source.getDefaultOwnerId ? source.getDefaultOwnerId() : undefined
}

/** Left without an `ownerId`, the library goes to the source's default owner. */
export function createNewLibrary(source: LibrarySource, name: string, ownerId?: string) {
	const owner = ownerId ?? getDefaultOwnerId(source)
	return source.createLibrary(name, owner === undefined ? {} : { ownerId: owner })
}

/** Whether {@link createNewLibrary}, left without an `ownerId`, is allowed. */
export function canCreateNewLibrary(source: LibrarySource) {
	const ownerId = getDefaultOwnerId(source)
	if (ownerId === undefined) return source.can('createLibrary')
	return source.can('createLibrary', { ownerId })
}

/**
 * The owners to offer creating a library for: those the source offers for new libraries, or all
 * its owners, that the user may create a library for. Empty for a source without owners.
 */
export function getNewLibraryOwners(source: LibrarySource): TLLibraryOwner[] {
	const owners = source.getLibraryOwners ? source.getLibraryOwners() : []
	const offered = source.getNewLibraryOwnerIds
		? source.getNewLibraryOwnerIds().flatMap((id) => owners.filter((owner) => owner.id === id))
		: owners
	return offered.filter((owner) => source.can('createLibrary', { ownerId: owner.id }))
}
