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
function outline(source: LibrarySource, libraries = source.getLibraries()) {
	const byId = new Map(libraries.map((library) => [library.id, library]))
	const path = (library: TLLibrary): string => {
		const parent = library.parentId && byId.get(library.parentId)
		return parent ? `${path(parent)}/${library.name}` : `${library.ownerId ?? ''}/${library.name}`
	}
	return flattenLibraryTree(getLibraryTree(libraries)).map(({ library }) => [
		path(library),
		source.getItems(library.id).map((item) => item.name),
	])
}

// architecture
// ├─ compute: Lambda
// │  └─ serverless: Function
// └─ data: Database
async function seed(source: LibrarySource, ownerId: string | undefined = 'acme') {
	const architecture = await source.createLibrary(
		'architecture',
		ownerId === undefined ? {} : { ownerId }
	)
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
		await source.createLibrary('icons', { ownerId: 'acme' })
		const fn = source.getItems(serverless.id)[0]
		await source.deleteLibrary(architecture.id)
		expect(outline(source)).toEqual([['acme/icons', []]])
		await expect(source.getItemContent(fn.id)).rejects.toThrow(LibraryNotFoundError)
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
		).toThrow('loop')
	})
})

describe('InMemoryLibrarySource nesting in a document', () => {
	const kit = LibraryRecordType.create({ name: 'kit', ownerId: 'acme' })
	const icons = LibraryRecordType.create({ name: 'icons', ownerId: 'acme', parentId: kit.id })
	const other = LibraryRecordType.create({ name: 'other', ownerId: 'acme' })
	const inOther = LibraryRecordType.create({
		name: 'in other',
		ownerId: 'acme',
		parentId: other.id,
	})
	const setUp = () =>
		new InMemoryLibrarySource({
			owners,
			initial: { libraries: [kit, icons, other, inOther], items: [], contents: {} },
			shownInDocument: [{ libraryId: kit.id, placement: 'added' }],
		})

	it('shows the libraries inside a shown library, for its reason, and offers whole trees', () => {
		const source = setUp()
		expect(source.getLibraries().map((c) => c.name)).toEqual(['kit', 'icons'])
		expect(source.getLibraryPlacement!(icons.id)).toBe('added')
		expect(source.getAvailableLibraries!().map((c) => c.name)).toEqual(['other', 'in other'])
	})

	it('adds and removes only top-level libraries, the rest coming with them', async () => {
		const source = setUp()
		expect(source.can('addLibraryToDocument', inOther.id)).toBe(false)
		expect(source.can('removeLibraryFromDocument', icons.id)).toBe(false)
		await expect(source.addLibraryToDocument!(inOther.id)).rejects.toThrow(LibraryPermissionError)
		await source.addLibraryToDocument!(other.id)
		expect(source.getLibraries().map((c) => c.name)).toEqual(['kit', 'icons', 'other', 'in other'])
		await source.removeLibraryFromDocument!(kit.id)
		expect(source.getLibraries().map((c) => c.name)).toEqual(['other', 'in other'])
	})

	it('refuses shown libraries that are inside another', () => {
		expect(
			() =>
				new InMemoryLibrarySource({
					owners,
					initial: { libraries: [kit, icons], items: [], contents: {} },
					shownInDocument: [{ libraryId: icons.id, placement: 'added' }],
				})
		).toThrow('inside another')
	})
})

describe('copyLibrary nesting', () => {
	it('copies a library with everything inside it, naming only the copy', async () => {
		const source = new InMemoryLibrarySource({ owners })
		const { architecture } = await seed(source)
		await copyLibrary(source, architecture.id, 'home', { getName: (name) => `${name} (Copy)` })
		expect(outline(source).filter(([path]) => (path as string).startsWith('home'))).toEqual([
			['home/architecture (Copy)', []],
			['home/architecture (Copy)/compute', ['Lambda']],
			['home/architecture (Copy)/compute/serverless', ['Function']],
			['home/architecture (Copy)/data', ['Database']],
		])
	})

	it('copies a library into one inside it once, as it was', async () => {
		const source = new InMemoryLibrarySource({ owners })
		const { compute, serverless } = await seed(source)
		await copyLibrary(source, compute.id, undefined, { parentId: serverless.id })
		expect(outline(source)).toEqual([
			['acme/architecture', []],
			['acme/architecture/compute', ['Lambda']],
			['acme/architecture/compute/serverless', ['Function']],
			['acme/architecture/compute/serverless/compute', ['Lambda']],
			['acme/architecture/compute/serverless/compute/serverless', ['Function']],
			['acme/architecture/data', ['Database']],
		])
	})

	it('deletes the whole copy when part of it fails', async () => {
		const source = new InMemoryLibrarySource({ owners })
		const { architecture, serverless } = await seed(source)
		const fn = source.getItems(serverless.id)[0]
		const getItemContent = source.getItemContent.bind(source)
		source.getItemContent = async (itemId) => {
			if (itemId === fn.id) throw new Error('gone')
			return getItemContent(itemId)
		}
		await expect(copyLibrary(source, architecture.id, 'home')).rejects.toThrow('gone')
		expect(outline(source).some(([path]) => (path as string).startsWith('home'))).toBe(false)
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

	it("creates inside a library in the parent's part, with the parent's owner", async () => {
		const { source, board } = setUp()
		const kit = await source.createLibrary('kit', { ownerId: 'board' })
		const inner = await source.createLibrary('inner', { parentId: kit.id })
		expect(inner).toMatchObject({ ownerId: 'board', parentId: kit.id })
		expect(board.getLibraries().map((c) => c.name)).toEqual(['kit', 'inner'])
		await expect(source.createLibrary('x', { parentId: kit.id, ownerId: 'acme' })).rejects.toThrow(
			LibraryNestingError
		)
	})

	it('copies a tree inside a library of another part', async () => {
		const { source } = setUp()
		const { compute } = await seed(source)
		const kit = await source.createLibrary('kit', { ownerId: 'board' })
		await source.copyLibrary(compute.id, undefined, { parentId: kit.id })
		expect(outline(source).slice(0, 3)).toEqual([
			['board/kit', []],
			['board/kit/compute', ['Lambda']],
			['board/kit/compute/serverless', ['Function']],
		])
	})
})
