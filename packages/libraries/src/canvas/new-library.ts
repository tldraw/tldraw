import type { LibrarySource } from '../lib/LibrarySource'

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
