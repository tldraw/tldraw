import type { TLLibrary } from 'tldraw'
import type { LibrarySource, TLLibraryDestination, TLLibraryOwner } from '../lib/LibrarySource'
import { flattenLibraryTree, getLibraryTree, isLibraryWithin } from '../lib/libraryTree'

/** A place a library can be moved or copied to, as a menu lists it. */
export interface LibraryDestinationChoice {
	/** Unique in the list: the library's id, or the owner's. */
	key: string
	/** The library's name; the owner's at an owner's top level, or none for a source without owners. */
	label?: string
	icon?: TLLibraryOwner['icon']
	/** 0 for an owner's top level, 1 for a library at it, and so on. */
	depth: number
	destination: TLLibraryDestination
	/** Where the library is now. */
	current: boolean
}

/**
 * Where a library can go: each owner's top level, followed by that owner's libraries as a tree,
 * keeping those the source allows creating a library in. Moving leaves out the library and
 * everything inside it, keeps where it is now so the menu can mark it, and lists nothing when that
 * is the only place left. Copying can go anywhere allowed, where it is now included, as a copy
 * beside it.
 */
export function getLibraryDestinations(
	source: LibrarySource,
	library: TLLibrary,
	purpose: 'move' | 'copy'
): LibraryDestinationChoice[] {
	const libraries = source.getLibraries()
	const owners = source.getLibraryOwners ? source.getLibraryOwners() : []
	const groups: { owner?: TLLibraryOwner; libraries: TLLibrary[] }[] =
		owners.length === 0
			? [{ libraries }]
			: owners.map((owner) => ({
					owner,
					libraries: libraries.filter((c) => c.ownerId === owner.id),
				}))
	const choices = groups.flatMap(({ owner, libraries: list }) => {
		const topLevel: LibraryDestinationChoice = {
			key: owner?.id ?? '',
			label: owner?.name,
			icon: owner?.icon,
			depth: 0,
			destination: owner ? { ownerId: owner.id } : {},
			current: library.parentId === undefined && library.ownerId === owner?.id,
		}
		const inside = flattenLibraryTree(getLibraryTree(list))
			.filter(
				(node) => !(purpose === 'move' && isLibraryWithin(libraries, node.library.id, library.id))
			)
			.map(
				(node): LibraryDestinationChoice => ({
					key: node.library.id,
					label: node.library.name,
					depth: node.depth + 1,
					destination: { parentId: node.library.id },
					current: library.parentId === node.library.id,
				})
			)
		const allowed = (choice: LibraryDestinationChoice) =>
			choice.destination.parentId !== undefined
				? source.can('createLibrary', choice.destination.parentId)
				: source.can('createLibrary', owner ? { ownerId: owner.id } : undefined)
		return [topLevel, ...inside].filter((choice) =>
			purpose === 'move' && choice.current ? true : allowed(choice)
		)
	})
	if (purpose === 'move' && choices.every((choice) => choice.current)) return []
	return choices
}
