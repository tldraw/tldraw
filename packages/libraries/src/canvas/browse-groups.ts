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

/**
 * A library listed in Browse: the source's own, or a host's entry. A host's entry added as one of
 * the source's libraries is listed as that library, with the entry's id.
 */
export type BrowseListedLibrary =
	| { kind: 'source'; library: TLLibrary; entryId?: string }
	| { kind: 'host'; entry: LibraryBrowseEntry }

/** One of the host's groups, as Browse lists it. */
export interface BrowseHostGroup {
	id: string
	label: string
	libraries: BrowseListedLibrary[]
}

export interface BrowseSections {
	/** What the document already has added, by name. */
	thisFile: BrowseListedLibrary[]
	/** The source's libraries available to add, a group per owner. */
	owners: BrowseOwnerGroup[]
	/** The host's groups, with only the entries not yet added. */
	hosts: BrowseHostGroup[]
}

/**
 * The libraries to browse, by whether the document has them: first those it has added, from the
 * source and the host alike, then the source's libraries available to add, a group per owner, then
 * the host's groups' entries not yet added. Only top-level libraries are listed, as only they are
 * added. A host entry added as one of the source's libraries is listed once, as that library, so
 * it has the library's own actions; one whose library the source doesn't list is listed as the
 * entry. The user's default isn't listed: it's shown in every document, never added or removed.
 * The default owner's group comes first, then the others in the owners' order, then libraries
 * without a known owner. Empty groups are left out, and so are the source's libraries for a source
 * without `getAvailableLibraries`.
 */
export function getBrowseSections(
	source: LibrarySource,
	hostGroups: LibraryBrowseGroup[] = []
): BrowseSections {
	const shown = source.getLibraries()
	const addedEntries: BrowseListedLibrary[] = hostGroups.flatMap((group) =>
		group.entries.flatMap((entry): BrowseListedLibrary[] => {
			if (!entry.added) return []
			const library = shown.find((l) => l.id === entry.libraryId)
			return [library ? { kind: 'source', library, entryId: entry.id } : { kind: 'host', entry }]
		})
	)
	const listedAsEntry = new Set(
		hostGroups.flatMap((group) => group.entries.map((entry) => entry.added && entry.libraryId))
	)
	const addedLibraries = source.getAvailableLibraries
		? shown.filter(
				(library) =>
					library.parentId === undefined &&
					!listedAsEntry.has(library.id) &&
					source.getLibraryPlacement !== undefined &&
					source.getLibraryPlacement(library.id) === 'added'
			)
		: []
	const thisFile: BrowseListedLibrary[] = [
		...addedLibraries.map((library) => ({ kind: 'source' as const, library })),
		...addedEntries,
	].sort((a, b) => nameOf(a).localeCompare(nameOf(b)))
	return {
		thisFile,
		owners: getOwnerGroups(source),
		hosts: hostGroups.flatMap((group) => {
			const libraries = group.entries
				.filter((entry) => !entry.added)
				.map((entry) => ({ kind: 'host' as const, entry }))
			return libraries.length === 0 ? [] : [{ id: group.id, label: group.label, libraries }]
		}),
	}
}

const nameOf = (listed: BrowseListedLibrary) =>
	listed.kind === 'source' ? listed.library.name : listed.entry.name

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
		if (library.parentId !== undefined) continue
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

/** Whether the document has the source's library added, as listed under "In this file". */
export function isAddedToDocument(source: LibrarySource, libraryId: TLLibrary['id']) {
	return (
		source.getLibraryPlacement !== undefined && source.getLibraryPlacement(libraryId) === 'added'
	)
}

type Listed = BrowseListedLibrary & { key: string; slot: string }

const THIS_FILE = 'this-file'
const ownerSlot = (ownerId: string | undefined) => `owner:${ownerId ?? ''}`
const hostSlot = (groupId: string) => `host:${groupId}`

const keyOf = (listed: BrowseListedLibrary) =>
	listed.kind === 'source' ? `source:${listed.library.id}` : `host:${listed.entry.id}`

/** The key of the host's entry a library was added as, which it takes the place of. */
const entryKeyOf = (listed: BrowseListedLibrary) =>
	listed.kind === 'source' && listed.entryId !== undefined ? `host:${listed.entryId}` : undefined

/** Every library `sections` lists, in the order it lists them, with the group it's in. */
function listAll(sections: BrowseSections): Listed[] {
	const inSlot = (slot: string) => (listed: BrowseListedLibrary) => ({
		...listed,
		key: keyOf(listed),
		slot,
	})
	return [
		...sections.thisFile.map(inSlot(THIS_FILE)),
		...sections.owners.flatMap((group) =>
			group.libraries.map((library) =>
				inSlot(ownerSlot(group.ownerId))({ kind: 'source', library })
			)
		),
		...sections.hosts.flatMap((group) => group.libraries.map(inSlot(hostSlot(group.id)))),
	]
}

/**
 * `next`, with each library where `shown` lists it and in the same order: one added or removed
 * while Browse is open stays in its group rather than moving between "In this file" and the rest.
 * A host's entry added as one of the source's libraries takes the entry's place, and the entry
 * takes the library's place again once the library is gone. Libraries `shown` doesn't list go
 * where `next` puts them, after those it does; ones `next` doesn't list are left out.
 */
export function keepBrowsePlacement(
	shown: BrowseSections | undefined,
	next: BrowseSections
): BrowseSections {
	if (!shown) return next
	const shownListed = listAll(shown)
	const nextListed = listAll(next)
	const nextKeys = new Set(nextListed.map((listed) => listed.key))
	const shownAt = new Map<string, { i: number; slot: string }>()
	shownListed.forEach((listed, i) => {
		shownAt.set(listed.key, { i, slot: listed.slot })
		const entryKey = entryKeyOf(listed)
		if (entryKey !== undefined && !nextKeys.has(listed.key) && !shownAt.has(entryKey)) {
			shownAt.set(entryKey, { i, slot: listed.slot })
		}
	})
	// The entry's place first: a copy can be listed as available to add for a moment before it's
	// added, and would otherwise stay there.
	const placeOf = (listed: Listed) => {
		const entryKey = entryKeyOf(listed)
		const entryPlace = entryKey === undefined ? undefined : shownAt.get(entryKey)
		return entryPlace ?? shownAt.get(listed.key)
	}
	const placed = nextListed
		.map((listed, i) => {
			const place = placeOf(listed)
			return {
				...listed,
				slot: place ? place.slot : listed.slot,
				rank: place ? place.i : shownListed.length + i,
			}
		})
		.sort((a, b) => a.rank - b.rank)
	const inSlot = (slot: string) => placed.filter((listed) => listed.slot === slot)

	const ownerOrder = [...shown.owners, ...next.owners].map((group) => group.ownerId)
	const ownerGroups = [...next.owners, ...shown.owners]
		.filter((group, i, all) => all.findIndex((g) => g.ownerId === group.ownerId) === i)
		.sort((a, b) => ownerOrder.indexOf(a.ownerId) - ownerOrder.indexOf(b.ownerId))
	const hostOrder = [...shown.hosts, ...next.hosts].map((group) => group.id)
	const hostGroups = [...next.hosts, ...shown.hosts]
		.filter((group, i, all) => all.findIndex((g) => g.id === group.id) === i)
		.sort((a, b) => hostOrder.indexOf(a.id) - hostOrder.indexOf(b.id))
	return {
		thisFile: inSlot(THIS_FILE).map(unslot),
		owners: ownerGroups.flatMap((group) => {
			const libraries = inSlot(ownerSlot(group.ownerId)).flatMap((listed) =>
				listed.kind === 'source' ? [listed.library] : []
			)
			return libraries.length === 0 ? [] : [{ ...group, libraries }]
		}),
		hosts: hostGroups.flatMap((group) => {
			const libraries = inSlot(hostSlot(group.id)).map(unslot)
			return libraries.length === 0 ? [] : [{ ...group, libraries }]
		}),
	}
}

const unslot = ({
	key: _key,
	slot: _slot,
	rank: _rank,
	...listed
}: Listed & { rank?: number }): BrowseListedLibrary => listed
