import { LibraryRecordType, type TLLibrary } from '@tldraw/tlschema'
import { describe, expect, it } from 'vitest'
import { LibraryNestingError, LibraryNotFoundError } from './LibrarySource'
import {
	flattenLibraryTree,
	getLibraryDescendants,
	getLibraryTree,
	getRootLibraryIds,
	resolveLibraryParent,
} from './libraryTree'

const id = (name: string) => LibraryRecordType.createId(name)
const library = (name: string, parent?: string, ownerId = 'acme'): TLLibrary =>
	LibraryRecordType.create({
		id: id(name),
		name,
		ownerId,
		...(parent === undefined ? {} : { parentId: id(parent) }),
	})

// architecture
// ├─ compute
// │  └─ serverless
// └─ data
// icons
const libraries = [
	library('architecture'),
	library('compute', 'architecture'),
	library('icons'),
	library('serverless', 'compute'),
	library('data', 'architecture'),
]

const outline = (list: TLLibrary[]) =>
	flattenLibraryTree(getLibraryTree(list)).map((node) => [node.library.name, node.depth])

describe('getLibraryTree', () => {
	it('nests libraries under their parents, each level in listed order', () => {
		expect(outline(libraries)).toEqual([
			['architecture', 0],
			['compute', 1],
			['serverless', 2],
			['data', 1],
			['icons', 0],
		])
	})

	it("puts a library whose parent isn't listed at the top level", () => {
		expect(outline([library('compute', 'architecture'), library('serverless', 'compute')])).toEqual(
			[
				['compute', 0],
				['serverless', 1],
			]
		)
	})

	it('puts libraries in a loop of parents at the top level, losing none', () => {
		const loop = [library('a', 'b'), library('b', 'a'), library('c', 'a')]
		expect(outline(loop)).toEqual([
			['a', 0],
			['c', 1],
			['b', 0],
		])
	})
})

describe('tree lookups', () => {
	it('lists everything inside a library, each before what is inside it', () => {
		expect(getLibraryDescendants(libraries, id('architecture')).map((c) => c.name)).toEqual([
			'compute',
			'serverless',
			'data',
		])
		expect(getLibraryDescendants(libraries, id('icons'))).toEqual([])
	})

	it('maps each library to the top of its tree, whose owner and permissions it has', () => {
		const roots = getRootLibraryIds(libraries)
		expect(roots.get(id('serverless'))).toBe(id('architecture'))
		expect(roots.get(id('architecture'))).toBe(id('architecture'))
		expect(roots.get(id('icons'))).toBe(id('icons'))
	})
})

describe('resolveLibraryParent', () => {
	it('gives the parent, checking its owner against the one named', () => {
		expect(resolveLibraryParent(libraries, id('data'), undefined).name).toBe('data')
		expect(resolveLibraryParent(libraries, id('data'), 'acme').name).toBe('data')
		expect(() => resolveLibraryParent(libraries, id('data'), 'home')).toThrow(LibraryNestingError)
		expect(() => resolveLibraryParent(libraries, id('missing'), undefined)).toThrow(
			LibraryNotFoundError
		)
	})
})
