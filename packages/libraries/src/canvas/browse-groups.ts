import type { TLLibrary } from 'tldraw'
import type { LibrarySource } from '../lib/LibrarySource'
import type { LibraryBrowseEntry, LibraryBrowseGroup } from './browse-libraries-dialog'
import { getDefaultOwnerId } from './new-library'

export interface BrowseOwnerGroup {
	/** Undefined for libraries without a known owner. */
	ownerId?: string
	ownerName?: string
	/** By name. */
	libraries: TLLibrary[]
}

/** A library listed under "In this file": the source's own, or a host's entry. */
export type BrowseAddedLibrary =
	| { kind: 'source'; library: TLLibrary }
	| { kind: 'host'; entry: LibraryBrowseEntry }

export interface BrowseSections {
	/** What the document already has added, by name. */
	thisFile: BrowseAddedLibrary[]
	/** The source's libraries available to add, a group per owner. */
	owners: BrowseOwnerGroup[]
	/** The host's groups, with only the entries not yet added. */
	hosts: LibraryBrowseGroup[]
}

/**
 * The libraries to browse, by whether the document has them: first those it has added, from the
 * source and the host alike, then the source's libraries available to add, a group per owner, then
 * the host's groups' entries not yet added. A host entry and the source's library it was added as
 * are listed once, as the entry. The user's default isn't listed: it's shown in every document,
 * never added or removed. The default owner's group comes first, then the others in the owners'
 * order, then libraries without a known owner. Empty groups are left out, and so are the source's
 * libraries for a source without `getAvailableLibraries`.
 */
export function getBrowseSections(
	source: LibrarySource,
	hostGroups: LibraryBrowseGroup[] = []
): BrowseSections {
	const addedEntries = hostGroups.flatMap((group) => group.entries.filter((entry) => entry.added))
	const listedAsEntry = new Set(addedEntries.map((entry) => entry.libraryId))
	const addedLibraries = source.getAvailableLibraries
		? source
				.getLibraries()
				.filter(
					(library) =>
						!listedAsEntry.has(library.id) &&
						source.getLibraryPlacement !== undefined &&
						source.getLibraryPlacement(library.id) === 'added'
				)
		: []
	const thisFile: BrowseAddedLibrary[] = [
		...addedLibraries.map((library) => ({ kind: 'source' as const, library })),
		...addedEntries.map((entry) => ({ kind: 'host' as const, entry })),
	].sort((a, b) => nameOf(a).localeCompare(nameOf(b)))
	return {
		thisFile,
		owners: getOwnerGroups(source),
		hosts: hostGroups.flatMap((group) => {
			const entries = group.entries.filter((entry) => !entry.added)
			return entries.length === 0 ? [] : [{ ...group, entries }]
		}),
	}
}

const nameOf = (added: BrowseAddedLibrary) =>
	added.kind === 'source' ? added.library.name : added.entry.name

function getOwnerGroups(source: LibrarySource): BrowseOwnerGroup[] {
	if (!source.getAvailableLibraries) return []
	const owners = source.getLibraryOwners ? source.getLibraryOwners() : []
	const defaultOwnerId = getDefaultOwnerId(source)
	const groups = new Map<string | undefined, BrowseOwnerGroup>()
	const ordered = [
		...owners.filter((owner) => owner.id === defaultOwnerId),
		...owners.filter((owner) => owner.id !== defaultOwnerId),
	]
	for (const owner of ordered) {
		groups.set(owner.id, { ownerId: owner.id, ownerName: owner.name, libraries: [] })
	}
	for (const library of source.getAvailableLibraries()) {
		const key =
			library.ownerId !== undefined && groups.has(library.ownerId) ? library.ownerId : undefined
		let group = groups.get(key)
		if (!group) {
			group = { libraries: [] }
			groups.set(key, group)
		}
		group.libraries.push(library)
	}
	return [...groups.values()].flatMap((group) =>
		group.libraries.length === 0
			? []
			: [{ ...group, libraries: group.libraries.sort((a, b) => a.name.localeCompare(b.name)) }]
	)
}
