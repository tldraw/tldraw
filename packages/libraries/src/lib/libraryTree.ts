import type { TLLibrary, TLLibraryId } from '@tldraw/tlschema'
import {
	LibraryNestingError,
	LibraryNotFoundError,
	type TLLibraryDestination,
} from './LibrarySource'

/** A library and the libraries inside it, as {@link getLibraryTree} arranges them. */
export interface TLLibraryTreeNode {
	library: TLLibrary
	/** 0 at the top level. */
	depth: number
	children: TLLibraryTreeNode[]
}

/**
 * The libraries as trees, each level in the order they are listed. A library whose parent isn't
 * listed, e.g. one the user may not see, is at the top level, as is any library in a loop of
 * parents, which a source should never list: nothing listed goes missing.
 * @public
 */
export function getLibraryTree(libraries: TLLibrary[]): TLLibraryTreeNode[] {
	const byId = new Map(libraries.map((library) => [library.id, library]))
	// A library in a loop of parents loses its parent, so the loop is reached from the top level; one
	// below a loop keeps it.
	const attachedParent = (library: TLLibrary) => {
		if (library.parentId === undefined || !byId.has(library.parentId)) return undefined
		const seen = new Set<TLLibraryId>()
		for (
			let id: TLLibraryId | undefined = library.parentId;
			id !== undefined && !seen.has(id);
			id = byId.get(id)?.parentId
		) {
			if (id === library.id) return undefined
			seen.add(id)
		}
		return library.parentId
	}
	const childrenOf = new Map<TLLibraryId | undefined, TLLibrary[]>()
	for (const library of libraries) {
		const parentId = attachedParent(library)
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
 * The library at the top of `libraryId`'s tree: the library itself when it is at the top level.
 * A nested library has its root's permissions, so sources answer `can` for the root.
 */
export function getRootLibrary(
	libraries: TLLibrary[],
	libraryId: TLLibraryId
): TLLibrary | undefined {
	const byId = new Map(libraries.map((library) => [library.id, library]))
	let library = byId.get(libraryId)
	const seen = new Set<TLLibraryId>()
	while (library?.parentId !== undefined && byId.has(library.parentId)) {
		if (seen.has(library.id)) break
		seen.add(library.id)
		library = byId.get(library.parentId)
	}
	return library
}

/** Whether `libraryId` is `ancestorId` or anywhere inside it. */
export function isLibraryWithin(
	libraries: TLLibrary[],
	libraryId: TLLibraryId,
	ancestorId: TLLibraryId
): boolean {
	return (
		libraryId === ancestorId ||
		getLibraryDescendants(libraries, ancestorId).some((library) => library.id === libraryId)
	)
}

/**
 * Where a library created, moved or copied to `to` goes: inside a listed parent, taking its owner,
 * or at the top level of the owner named, if any. Refuses an owner that isn't the parent's, and,
 * for a library being moved, a parent that is the library or inside it.
 */
export function resolveLibraryDestination(
	libraries: TLLibrary[],
	to: TLLibraryDestination,
	movingId?: TLLibraryId
): { ownerId?: string; parentId?: TLLibraryId } {
	if (to.parentId === undefined) return to.ownerId === undefined ? {} : { ownerId: to.ownerId }
	const parent = libraries.find((library) => library.id === to.parentId)
	if (!parent) throw new LibraryNotFoundError(to.parentId)
	if (to.ownerId !== undefined && to.ownerId !== parent.ownerId) {
		throw new LibraryNestingError(`Library ${parent.id} doesn't belong to ${to.ownerId}`)
	}
	if (movingId !== undefined && isLibraryWithin(libraries, parent.id, movingId)) {
		throw new LibraryNestingError(`Library ${movingId} can't go inside itself`)
	}
	return {
		...(parent.ownerId === undefined ? {} : { ownerId: parent.ownerId }),
		parentId: parent.id,
	}
}
