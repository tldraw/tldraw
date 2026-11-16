import { LibraryRecordType, createShapeId, createTLSchema, type TLLibrary } from '@tldraw/tlschema'
import { describe, expect, it } from 'vitest'
import { CompositeLibrarySource } from './CompositeLibrarySource'
import { copyLibrary } from './copyLibrary'
import { InMemoryLibrarySource } from './InMemoryLibrarySource'
import {
	LibraryNestingError,
	LibraryNotFoundError,
	LibraryPermissionError,
	type LibrarySource,
} from './LibrarySource'
import { flattenLibraryTree, getLibraryTree } from './libraryTree'
import type { TLLibraryItemContent } from './schema'
import { whenItemsStored } from './whenItemsStored'

const shapeId = createShapeId('box')
const owners = [
	{ id: 'home', name: 'Personal' },
	{ id: 'acme', name: 'Acme workspace' },
]

function content(): TLLibraryItemContent {
	return {
		formatVersion: 1,
		content: {
			shapes: [{ id: shapeId, type: 'geo', x: 0, y: 0, props: {} }] as any,
			bindings: [],
			rootShapeIds: [shapeId],
			assets: [],
			schema: createTLSchema().serialize(),
		},
	}
}

// Each library as `owner/path/to/name`, with its item names, in outline order.
function outline(source: LibrarySource) {
	const list = source.getLibraries()
	const byId = new Map(list.map((library) => [library.id, library]))
	const path = (library: TLLibrary): string => {
		const parent = library.parentId && byId.get(library.parentId)
		return parent ? `${path(parent)}/${library.name}` : `${library.ownerId ?? ''}/${library.name}`
	}
	return flattenLibraryTree(getLibraryTree(list)).map(({ library }) => [
		path(library),
		source.getItems(library.id).map((item) => item.name),
	])
}

// architecture (acme)
// ├─ compute: Lambda
// │  └─ serverless: Function
// └─ data: Database
async function seed(source: LibrarySource, ownerId = 'acme') {
	const architecture = await source.createLibrary('architecture', { ownerId })
	const compute = await source.createLibrary('compute', { parentId: architecture.id })
	const serverless = await source.createLibrary('serverless', { parentId: compute.id })
	const data = await source.createLibrary('data', { parentId: architecture.id })
	await source.addItem(compute.id, { name: 'Lambda', content: content() })
	await source.addItem(serverless.id, { name: 'Function', content: content() })
	await source.addItem(data.id, { name: 'Database', content: content() })
	return { architecture, compute, serverless, data }
}

describe('InMemoryLibrarySource nesting', () => {
	it("creates a library inside another, with the parent's owner", async () => {
		const source = new InMemoryLibrarySource({ owners })
		const { compute, serverless } = await seed(source)
		expect(serverless).toMatchObject({ parentId: compute.id, ownerId: 'acme' })
		expect(outline(source)).toEqual([
			['acme/architecture', []],
			['acme/architecture/compute', ['Lambda']],
			['acme/architecture/compute/serverless', ['Function']],
			['acme/architecture/data', ['Database']],
		])
	})

	it('refuses a parent that is missing or of another owner than the one named', async () => {
		const source = new InMemoryLibrarySource({ owners })
		const { compute } = await seed(source)
		await expect(
			source.createLibrary('x', { parentId: LibraryRecordType.createId('nope') })
		).rejects.toThrow(LibraryNotFoundError)
		await expect(
			source.createLibrary('x', { parentId: compute.id, ownerId: 'home' })
		).rejects.toThrow(LibraryNestingError)
	})

	it('deletes a library with everything inside it', async () => {
		const source = new InMemoryLibrarySource({ owners })
		const { architecture, serverless } = await seed(source)
		const icons = await source.createLibrary('icons', { ownerId: 'acme' })
		const fn = source.getItems(serverless.id)[0]
		await source.deleteLibrary(architecture.id)
		expect(outline(source)).toEqual([['acme/icons', []]])
		await expect(source.getItemContent(fn.id)).rejects.toThrow(LibraryNotFoundError)
		expect(icons.parentId).toBeUndefined()
	})

	it('moves a library, with everything inside it, into another library', async () => {
		const source = new InMemoryLibrarySource({ owners })
		const { compute, data } = await seed(source)
		await source.moveLibrary(compute.id, { parentId: data.id })
		expect(outline(source)).toEqual([
			['acme/architecture', []],
			['acme/architecture/data', ['Database']],
			['acme/architecture/data/compute', ['Lambda']],
			['acme/architecture/data/compute/serverless', ['Function']],
		])
	})

	it('moves a library out to the top level, keeping its owner', async () => {
		const source = new InMemoryLibrarySource({ owners })
		const { compute } = await seed(source)
		const moved = await source.moveLibrary(compute.id, {})
		expect(moved).toMatchObject({ ownerId: 'acme' })
		expect(moved.parentId).toBeUndefined()
	})

	it('gives a moved library and everything inside it the new owner', async () => {
		const source = new InMemoryLibrarySource({ owners })
		const { compute } = await seed(source)
		await source.moveLibrary(compute.id, { ownerId: 'home' })
		expect(outline(source)).toEqual([
			['acme/architecture', []],
			['acme/architecture/data', ['Database']],
			['home/compute', ['Lambda']],
			['home/compute/serverless', ['Function']],
		])
	})

	it('refuses moving a library into itself or anything inside it', async () => {
		const source = new InMemoryLibrarySource({ owners })
		const { architecture, compute, serverless } = await seed(source)
		const before = outline(source)
		for (const into of [architecture, compute, serverless]) {
			await expect(source.moveLibrary(architecture.id, { parentId: into.id })).rejects.toThrow(
				LibraryNestingError
			)
		}
		expect(outline(source)).toEqual(before)
	})

	it('answers for a nested library as for its root, whose permissions it has', async () => {
		const pack = LibraryRecordType.create({ name: 'pack' })
		const inside = LibraryRecordType.create({ name: 'inside', parentId: pack.id })
		const source = new InMemoryLibrarySource({
			can: (_, target) => target !== pack.id,
			initial: { libraries: [pack, inside], items: [], contents: {} },
		})
		expect(source.can('addItem', inside.id)).toBe(false)
		expect(source.can('createLibrary', inside.id)).toBe(false)
		await expect(source.createLibrary('deeper', { parentId: inside.id })).rejects.toThrow(
			LibraryPermissionError
		)
	})

	it('refuses starting data with a missing parent, mixed owners or a loop', () => {
		const a = LibraryRecordType.createId('a')
		const b = LibraryRecordType.createId('b')
		const start = (libraries: TLLibrary[]) => () =>
			new InMemoryLibrarySource({ owners, initial: { libraries, items: [], contents: {} } })
		expect(
			start([LibraryRecordType.create({ id: a, name: 'a', parentId: b, ownerId: 'acme' })])
		).toThrow('missing')
		expect(
			start([
				LibraryRecordType.create({ id: a, name: 'a', ownerId: 'acme' }),
				LibraryRecordType.create({ id: b, name: 'b', parentId: a, ownerId: 'home' }),
			])
		).toThrow('another owner')
		expect(
			start([
				LibraryRecordType.create({ id: a, name: 'a', parentId: b, ownerId: 'acme' }),
				LibraryRecordType.create({ id: b, name: 'b', parentId: a, ownerId: 'acme' }),
			])
		).toThrow('inside itself')
	})
})

describe('copyLibrary nesting', () => {
	it('copies a library with everything inside it', async () => {
		const source = new InMemoryLibrarySource({ owners })
		const { architecture } = await seed(source)
		const copy = await copyLibrary(source, architecture.id, { ownerId: 'home' })
		await whenItemsStored(source.getItems(copy.id).map((item) => item.id))
		expect(outline(source).filter(([path]) => (path as string).startsWith('home'))).toEqual([
			['home/architecture', []],
			['home/architecture/compute', ['Lambda']],
			['home/architecture/compute/serverless', ['Function']],
			['home/architecture/data', ['Database']],
		])
	})

	it('copies a library into one inside it once, as it was', async () => {
		const source = new InMemoryLibrarySource({ owners })
		const { compute, serverless } = await seed(source)
		await copyLibrary(source, compute.id, { parentId: serverless.id })
		expect(outline(source)).toEqual([
			['acme/architecture', []],
			['acme/architecture/compute', ['Lambda']],
			['acme/architecture/compute/serverless', ['Function']],
			['acme/architecture/compute/serverless/compute', ['Lambda']],
			['acme/architecture/compute/serverless/compute/serverless', ['Function']],
			['acme/architecture/data', ['Database']],
		])
	})
})

describe('CompositeLibrarySource nesting', () => {
	function setUp() {
		const workspaces = new InMemoryLibrarySource({ id: 'workspaces', owners })
		const board = new InMemoryLibrarySource({ id: 'board' })
		const source = new CompositeLibrarySource({
			parts: [
				{ owner: { id: 'board', name: 'This board' }, source: board },
				{ source: workspaces },
			],
		})
		return { source, workspaces, board }
	}

	it("creates inside a library in the parent's part", async () => {
		const { source, board } = setUp()
		const kit = await source.createLibrary('kit', { ownerId: 'board' })
		const inner = await source.createLibrary('inner', { parentId: kit.id })
		expect(inner).toMatchObject({ ownerId: 'board', parentId: kit.id })
		expect(board.getLibraries().map((c) => c.name)).toEqual(['kit', 'inner'])
	})

	it('moves within a part through the part', async () => {
		const { source } = setUp()
		const { compute, data } = await seed(source)
		await source.moveLibrary(compute.id, { parentId: data.id })
		expect(outline(source).map(([path]) => path)).toEqual([
			'acme/architecture',
			'acme/architecture/data',
			'acme/architecture/data/compute',
			'acme/architecture/data/compute/serverless',
		])
	})

	it('moves a library with everything inside it to another part by copying it', async () => {
		const { source, board } = setUp()
		const { compute } = await seed(source)
		const kit = await source.createLibrary('kit', { ownerId: 'board' })
		const moved = await source.moveLibrary(compute.id, { parentId: kit.id })
		await whenItemsStored(
			board.getLibraries().flatMap((library) => board.getItems(library.id).map((item) => item.id))
		)
		// The original is deleted once the copy is saved.
		await new Promise((resolve) => setTimeout(resolve, 0))
		expect(moved).toMatchObject({ ownerId: 'board', parentId: kit.id })
		expect(outline(source)).toEqual([
			['board/kit', []],
			['board/kit/compute', ['Lambda']],
			['board/kit/compute/serverless', ['Function']],
			['acme/architecture', []],
			['acme/architecture/data', ['Database']],
		])
	})
})
