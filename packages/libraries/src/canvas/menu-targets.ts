import type { TLLibrary } from 'tldraw'
import type { LibrarySource } from '../lib/LibrarySource'
import type { LibraryMenuTarget } from '../ui/menu-items'
import { getPanelSections } from './panel-sections'

/**
 * Libraries as menu targets, in the panel's order: the user's default and the document's own first,
 * then the rest. One of the rest is named with its owner when another listed library has its name,
 * or when the rest belong to two or more owners.
 */
export function getLibraryMenuTargets(
	source: LibrarySource,
	libraries: TLLibrary[]
): LibraryMenuTarget[] {
	const sections = getPanelSections(source, libraries)
	const first = sections ? [...sections.defaults, ...sections.document] : []
	const rest = sections ? sections.thisFile : libraries
	const owners = new Map(
		(source.getLibraryOwners ? source.getLibraryOwners() : []).map((owner) => [
			owner.id,
			owner.name,
		])
	)
	const ownerIdOf = (library: TLLibrary) =>
		library.ownerId !== undefined && owners.has(library.ownerId) ? library.ownerId : undefined
	const severalOwners = new Set(rest.map(ownerIdOf)).size > 1
	const nameCounts = new Map<string, number>()
	for (const { name } of [...first, ...rest]) nameCounts.set(name, (nameCounts.get(name) ?? 0) + 1)
	return [
		...first.map(({ id, name }) => ({ id, name })),
		...rest.map((library) => {
			const ownerId = ownerIdOf(library)
			const ambiguous = severalOwners || (nameCounts.get(library.name) ?? 0) > 1
			return {
				id: library.id,
				name: library.name,
				detail: ambiguous && ownerId !== undefined ? owners.get(ownerId) : undefined,
			}
		}),
	]
}
