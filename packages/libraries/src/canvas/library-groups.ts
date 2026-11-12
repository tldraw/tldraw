import { useMemo } from 'react'
import { useValue } from 'tldraw'
import type { LibrarySource, TLLibraryOwner } from '../lib/LibrarySource'
import type { TLLibrary } from '../lib/schema'

export interface LibraryGroup {
	/** The owner's id. Libraries without a known owner go in a group with none. */
	key?: string
	/** The owner's name. */
	label?: string
	libraries: TLLibrary[]
}

export interface LibraryGrouping {
	keyOf(library: TLLibrary): string | undefined
	labelOf(key: string): string | undefined
	/** Owner ids in the order their groups go. */
	order: string[]
}

/** Groups by the owner each library names, in the owners' order. Fewer than two owners: none. */
export function getLibraryGrouping(owners: TLLibraryOwner[]): LibraryGrouping | undefined {
	if (owners.length < 2) return undefined
	const names = new Map(owners.map((owner) => [owner.id, owner.name]))
	return {
		keyOf: (library) =>
			library.ownerId !== undefined && names.has(library.ownerId) ? library.ownerId : undefined,
		labelOf: (key) => names.get(key),
		order: owners.map((owner) => owner.id),
	}
}

export function useLibraryGrouping(source: LibrarySource) {
	const owners = useValue(
		'library owners',
		() => (source.getLibraryOwners ? source.getLibraryOwners() : []),
		[source]
	)
	return useMemo(() => getLibraryGrouping(owners), [owners])
}

/**
 * Libraries gathered into a group per owner, each keeping the libraries' order. Groups go in the
 * grouping's order, owners without libraries included; libraries without a known owner come last.
 * Without a grouping, one unnamed group.
 */
export function groupLibraryList(
	libraries: TLLibrary[],
	grouping?: LibraryGrouping
): LibraryGroup[] {
	if (!grouping) return [{ libraries }]
	const groups = new Map<string | undefined, LibraryGroup>(
		grouping.order.map((key) => [key, { key, label: grouping.labelOf(key), libraries: [] }])
	)
	for (const library of libraries) {
		const key = grouping.keyOf(library)
		const group = groups.get(key)
		if (group) group.libraries.push(library)
		else groups.set(key, { key, libraries: [library] })
	}
	return [...groups.values()]
}
