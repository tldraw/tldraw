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

/** Whether the document has the source's library added, as listed under "In this file". */
export function isAddedToDocument(source: LibrarySource, libraryId: TLLibrary['id']) {
	return (
		source.getLibraryPlacement !== undefined && source.getLibraryPlacement(libraryId) === 'added'
	)
}

type Listed =
	| { key: string; slot: string; kind: 'source'; library: TLLibrary }
	| { key: string; slot: string; kind: 'host'; entry: LibraryBrowseEntry }

const THIS_FILE = 'this-file'
const ownerSlot = (ownerId: string | undefined) => `owner:${ownerId ?? ''}`
const hostSlot = (groupId: string) => `host:${groupId}`

/** Every library `sections` lists, in the order it lists them, with the group it's in. */
function listAll(sections: BrowseSections): Listed[] {
	return [
		...sections.thisFile.map(
			(added): Listed =>
				added.kind === 'source'
					? { key: `source:${added.library.id}`, slot: THIS_FILE, ...added }
					: { key: `host:${added.entry.id}`, slot: THIS_FILE, ...added }
		),
		...sections.owners.flatMap((group) =>
			group.libraries.map(
				(library): Listed => ({
					key: `source:${library.id}`,
					slot: ownerSlot(group.ownerId),
					kind: 'source',
					library,
				})
			)
		),
		...sections.hosts.flatMap((group) =>
			group.entries.map(
				(entry): Listed => ({
					key: `host:${entry.id}`,
					slot: hostSlot(group.id),
					kind: 'host',
					entry,
				})
			)
		),
	]
}

/**
 * `next`, with each library where `shown` lists it and in the same order: one added or removed
 * while Browse is open stays in its group rather than moving between "In this file" and the rest.
 * Libraries `shown` doesn't list go where `next` puts them, after those it does; ones `next`
 * doesn't list are left out.
 */
export function keepBrowsePlacement(
	shown: BrowseSections | undefined,
	next: BrowseSections
): BrowseSections {
	if (!shown) return next
	const shownListed = listAll(shown)
	const shownAt = new Map(shownListed.map((listed, i) => [listed.key, { i, slot: listed.slot }]))
	const nextListed = listAll(next)
	const rank = (listed: Listed) =>
		shownAt.get(listed.key)?.i ?? shownListed.length + nextListed.indexOf(listed)
	const placed = nextListed
		.map((listed) => ({ ...listed, slot: shownAt.get(listed.key)?.slot ?? listed.slot }))
		.sort((a, b) => rank(a) - rank(b))
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
		thisFile: inSlot(THIS_FILE).map((listed) =>
			listed.kind === 'source'
				? { kind: 'source' as const, library: listed.library }
				: { kind: 'host' as const, entry: listed.entry }
		),
		owners: ownerGroups.flatMap((group) => {
			const libraries = inSlot(ownerSlot(group.ownerId)).flatMap((listed) =>
				listed.kind === 'source' ? [listed.library] : []
			)
			return libraries.length === 0 ? [] : [{ ...group, libraries }]
		}),
		hosts: hostGroups.flatMap((group) => {
			const entries = inSlot(hostSlot(group.id)).flatMap((listed) =>
				listed.kind === 'host' ? [listed.entry] : []
			)
			return entries.length === 0 ? [] : [{ ...group, entries }]
		}),
	}
}
