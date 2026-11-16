import { LibraryRecordType, type TLLibrary } from '@tldraw/tlschema'
import { describe, expect, it } from 'vitest'
import { LibraryNestingError, LibraryNotFoundError } from './LibrarySource'
import {
	flattenLibraryTree,
	getLibraryDescendants,
	getLibraryTree,
	getRootLibrary,
	isLibraryWithin,
	resolveLibraryDestination,
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

describe('tree queries', () => {
	it('finds descendants, depth first', () => {
		expect(getLibraryDescendants(libraries, id('architecture')).map((c) => c.name)).toEqual([
			'compute',
			'serverless',
			'data',
		])
		expect(getLibraryDescendants(libraries, id('icons'))).toEqual([])
	})

	it('finds the root library', () => {
		expect(getRootLibrary(libraries, id('serverless'))?.name).toBe('architecture')
		expect(getRootLibrary(libraries, id('icons'))?.name).toBe('icons')
		expect(getRootLibrary(libraries, id('nope'))).toBeUndefined()
	})

	it('tells whether a library is within another', () => {
		expect(isLibraryWithin(libraries, id('serverless'), id('architecture'))).toBe(true)
		expect(isLibraryWithin(libraries, id('architecture'), id('architecture'))).toBe(true)
		expect(isLibraryWithin(libraries, id('icons'), id('architecture'))).toBe(false)
	})
})

describe('resolveLibraryDestination', () => {
	it("goes inside a parent with the parent's owner", () => {
		expect(resolveLibraryDestination(libraries, { parentId: id('compute') })).toEqual({
			ownerId: 'acme',
			parentId: id('compute'),
		})
	})

	it('goes to the top level of the owner named, if any', () => {
		expect(resolveLibraryDestination(libraries, { ownerId: 'home' })).toEqual({ ownerId: 'home' })
		expect(resolveLibraryDestination(libraries, {})).toEqual({})
	})

	it("refuses a missing parent, and an owner that isn't the parent's", () => {
		expect(() => resolveLibraryDestination(libraries, { parentId: id('nope') })).toThrow(
			LibraryNotFoundError
		)
		expect(() =>
			resolveLibraryDestination(libraries, { parentId: id('compute'), ownerId: 'home' })
		).toThrow(LibraryNestingError)
	})

	it('refuses moving a library into itself or anything inside it', () => {
		for (const into of ['architecture', 'compute', 'serverless']) {
			expect(() =>
				resolveLibraryDestination(libraries, { parentId: id(into) }, id('architecture'))
			).toThrow(LibraryNestingError)
		}
		expect(
			resolveLibraryDestination(libraries, { parentId: id('icons') }, id('architecture'))
		).toEqual({ ownerId: 'acme', parentId: id('icons') })
	})
})
