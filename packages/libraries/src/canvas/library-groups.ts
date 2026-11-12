import { useMemo } from 'react'
import { useValue } from 'tldraw'
import type { TLLibrary } from 'tldraw'
import type { LibrarySource, TLLibraryOwner } from '../lib/LibrarySource'

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
 * Libraries gathered into their groups, each keeping the libraries' order. Groups go in the
 * grouping's order; libraries without a known owner come last. Without a grouping, one unnamed
 * group.
 */
export function groupLibraryList(
	libraries: TLLibrary[],
	grouping?: LibraryGrouping
): LibraryGroup[] {
	if (!grouping) return [{ libraries }]
	const groups = new Map<string | undefined, LibraryGroup>()
	for (const library of libraries) {
		const key = grouping.keyOf(library)
		const group = groups.get(key)
		if (group) group.libraries.push(library)
		else {
			const label = key === undefined ? undefined : grouping.labelOf(key)
			groups.set(key, { key, label, libraries: [library] })
		}
	}
	const rank = (key?: string) => {
		const index = key === undefined ? -1 : grouping.order.indexOf(key)
		return index === -1 ? grouping.order.length : index
	}
	return [...groups.values()].sort((a, b) => rank(a.key) - rank(b.key))
}
