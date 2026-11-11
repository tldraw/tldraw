import type { LibrarySource } from '../lib/LibrarySource'

/**
 * The owners a library can be moved or copied to: those the source allows creating a library
 * for. Moving also lists the library's own owner, so the menu can mark it. Each list is empty
 * when there is no other owner to pick.
 */
export function getOwnerChoices(source: LibrarySource, ownerId: string | undefined) {
	const owners = source.getLibraryOwners ? source.getLibraryOwners() : []
	const copy = owners.filter(
		(owner) => owner.id !== ownerId && source.can('createLibrary', { ownerId: owner.id })
	)
	const move =
		copy.length === 0 ? [] : owners.filter((owner) => owner.id === ownerId || copy.includes(owner))
	return { move, copy }
}
