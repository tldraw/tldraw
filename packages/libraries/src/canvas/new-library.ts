import type { LibrarySource, TLLibraryDestination } from '../lib/LibrarySource'

export function getDefaultOwnerId(source: LibrarySource) {
	return source.getDefaultOwnerId ? source.getDefaultOwnerId() : undefined
}

/** Left without a parent or an owner, the library goes to the source's default owner. */
export function createNewLibrary(
	source: LibrarySource,
	name: string,
	to: TLLibraryDestination = {}
) {
	if (to.parentId !== undefined) return source.createLibrary(name, { parentId: to.parentId })
	const owner = to.ownerId ?? getDefaultOwnerId(source)
	return source.createLibrary(name, owner === undefined ? {} : { ownerId: owner })
}

/** Whether {@link createNewLibrary}, left without an `ownerId`, is allowed. */
export function canCreateNewLibrary(source: LibrarySource) {
	const ownerId = getDefaultOwnerId(source)
	if (ownerId === undefined) return source.can('createLibrary')
	return source.can('createLibrary', { ownerId })
}
