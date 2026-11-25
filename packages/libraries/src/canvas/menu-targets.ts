import type { TLLibrary } from 'tldraw'
import type { LibrarySource } from '../lib/LibrarySource'
import { flattenLibraryTree, getLibraryTree } from '../lib/libraryTree'
import type { LibraryMenuTarget } from '../ui/menu-items'
import { getPanelSections } from './panel-sections'

/**
 * Libraries as menu targets, in the panel's order: the user's default and the document's own first,
 * then the rest, each followed by the libraries inside it. One of the rest is named with its owner when another listed library has its name,
 * or when the rest belong to two or more owners.
 */
export function getLibraryMenuTargets(
	source: LibrarySource,
	libraries: TLLibrary[]
): LibraryMenuTarget[] {
	const included = new Set(libraries.map((library) => library.id))
	const ordered = flattenLibraryTree(getLibraryTree(source.getLibraries()))
		.map((node) => node.library)
		.filter((library) => included.has(library.id))
	const sections = getPanelSections(source, ordered)
	const first = sections ? [...sections.defaults, ...sections.document] : []
	const rest = sections ? sections.thisFile : ordered
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
