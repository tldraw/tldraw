import type { TLLibrary, TLLibraryId } from '@tldraw/tlschema'
import { LibraryNestingError, LibraryNotFoundError } from './LibrarySource'

/** A library and the libraries inside it, as {@link getLibraryTree} arranges them. */
export interface TLLibraryTreeNode {
	library: TLLibrary
	/** 0 at the top level. */
	depth: number
	children: TLLibraryTreeNode[]
}

/**
 * Libraries, listed flat as sources list them, arranged as trees: each library under the one its
 * `parentId` names, each level in the order they are listed. A library whose parent isn't listed is
 * at the top level, as is one in a loop of parents, which a source should never list: nothing
 * listed goes missing.
 * @public
 */
export function getLibraryTree(libraries: TLLibrary[]): TLLibraryTreeNode[] {
	const parents = getAttachedParents(libraries)
	const childrenOf = new Map<TLLibraryId | undefined, TLLibrary[]>()
	for (const library of libraries) {
		const parentId = parents.get(library.id)
		const siblings = childrenOf.get(parentId)
		if (siblings) siblings.push(library)
		else childrenOf.set(parentId, [library])
	}
	const build = (library: TLLibrary, depth: number): TLLibraryTreeNode => ({
		library,
		depth,
		children: (childrenOf.get(library.id) ?? []).map((child) => build(child, depth + 1)),
	})
	return (childrenOf.get(undefined) ?? []).map((library) => build(library, 0))
}

/** The nodes of `trees`, each followed by everything inside it, as an outline lists them. */
export function flattenLibraryTree(trees: TLLibraryTreeNode[]): TLLibraryTreeNode[] {
	return trees.flatMap((node) => [node, ...flattenLibraryTree(node.children)])
}

/** A library's node in {@link getLibraryTree}, with everything inside it, if it is listed. */
export function getLibrarySubtree(
	libraries: TLLibrary[],
	libraryId: TLLibraryId
): TLLibraryTreeNode | undefined {
	return flattenLibraryTree(getLibraryTree(libraries)).find((node) => node.library.id === libraryId)
}

/** Every library inside `libraryId`, at any depth, each before the libraries inside it. */
export function getLibraryDescendants(libraries: TLLibrary[], libraryId: TLLibraryId): TLLibrary[] {
	const node = getLibrarySubtree(libraries, libraryId)
	return node ? flattenLibraryTree(node.children).map((child) => child.library) : []
}

/**
 * The top-level library of each library's tree, by the library's id: the library itself at the top
 * level. Everything inside a library shares its top-level library's owner and permissions, and
 * comes with it when it's added to a document.
 */
export function getRootLibraryIds(libraries: TLLibrary[]): Map<TLLibraryId, TLLibraryId> {
	const parents = getAttachedParents(libraries)
	const roots = new Map<TLLibraryId, TLLibraryId>()
	const rootOf = (id: TLLibraryId): TLLibraryId => {
		const known = roots.get(id)
		if (known !== undefined) return known
		const parentId = parents.get(id)
		const root = parentId === undefined ? id : rootOf(parentId)
		roots.set(id, root)
		return root
	}
	for (const library of libraries) rootOf(library.id)
	return roots
}

/**
 * The parent a library created or copied inside `parentId` goes in, checking that it is listed and
 * that it belongs to `ownerId` when one is named.
 */
export function resolveLibraryParent(
	libraries: TLLibrary[],
	parentId: TLLibraryId,
	ownerId: string | undefined
): TLLibrary {
	const parent = libraries.find((library) => library.id === parentId)
	if (!parent) throw new LibraryNotFoundError(parentId)
	if (ownerId !== undefined && ownerId !== parent.ownerId) {
		throw new LibraryNestingError(`Library ${parentId} doesn't belong to ${ownerId}`)
	}
	return parent
}

/**
 * Each library's parent, by its id, where that parent is listed and not in a loop of parents with
 * it. A library in a loop loses its parent, so the loop is reached from the top level.
 */
function getAttachedParents(libraries: TLLibrary[]): Map<TLLibraryId, TLLibraryId> {
	const byId = new Map(libraries.map((library) => [library.id, library]))
	const parents = new Map<TLLibraryId, TLLibraryId>()
	for (const library of libraries) {
		if (library.parentId === undefined || !byId.has(library.parentId)) continue
		const seen = new Set<TLLibraryId>()
		let inLoop = false
		for (
			let id: TLLibraryId | undefined = library.parentId;
			id !== undefined && !seen.has(id);
			id = byId.get(id)?.parentId
		) {
			if (id === library.id) {
				inLoop = true
				break
			}
			seen.add(id)
		}
		if (!inLoop) parents.set(library.id, library.parentId)
	}
	return parents
}
