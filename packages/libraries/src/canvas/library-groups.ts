import { useMemo } from 'react'
import { useValue } from 'tldraw'
import type { TLLibrary } from 'tldraw'
import type { LibrarySource, TLLibraryOwner } from '../lib/LibrarySource'

export interface LibraryGroup {
	/** The owner's id. Libraries without a known owner go in a group with none. */
	key?: string
	/** The owner's name. */
	label?: string
	icon?: TLLibraryOwner['icon']
	libraries: TLLibrary[]
}

/** The owner a group is for. Undefined for libraries without a known owner. */
export function getGroupOwner({ key, label, icon }: LibraryGroup): TLLibraryOwner | undefined {
	return key === undefined || label === undefined ? undefined : { id: key, name: label, icon }
}

export interface LibraryGrouping {
	keyOf(library: TLLibrary): string | undefined
	labelOf(key: string): string | undefined
	iconOf(key: string): TLLibraryOwner['icon']
	/** Owner ids in the order their groups go. */
	order: string[]
}

/** Groups by the owner each library names, in the owners' order. Fewer than two owners: none. */
export function getLibraryGrouping(owners: TLLibraryOwner[]): LibraryGrouping | undefined {
	if (owners.length < 2) return undefined
	const byId = new Map(owners.map((owner) => [owner.id, owner]))
	return {
		keyOf: (library) =>
			library.ownerId !== undefined && byId.has(library.ownerId) ? library.ownerId : undefined,
		labelOf: (key) => byId.get(key)?.name,
		iconOf: (key) => byId.get(key)?.icon,
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
		grouping.order.map((key) => [
			key,
			{ key, label: grouping.labelOf(key), icon: grouping.iconOf(key), libraries: [] },
		])
	)
	for (const library of libraries) {
		const key = grouping.keyOf(library)
		const group = groups.get(key)
		if (group) group.libraries.push(library)
		else groups.set(key, { key, libraries: [library] })
	}
	return [...groups.values()]
}

/** Libraries as menu targets, in their owners' order and named with their owners when grouped. */
export function toMenuTargets(libraries: TLLibrary[], grouping: LibraryGrouping | undefined) {
	return groupLibraryList(libraries, grouping).flatMap(({ key, label, icon, libraries: list }) =>
		list.map(({ id, name }) => ({
			id,
			name,
			owner: key === undefined || label === undefined ? undefined : { id: key, name: label, icon },
		}))
	)
}
