import { LibraryRecordType, type TLLibrary } from 'tldraw'
import { InMemoryLibrarySource } from '../lib/InMemoryLibrarySource'
import type { TLLibraryPlacement } from '../lib/LibrarySource'
import { getLibraryMenuTargets } from './menu-targets'

const owners = [
	{ id: 'home', name: 'My workspace' },
	{ id: 'board', name: 'This file' },
	{ id: 'team', name: 'Team' },
]

const library = (key: string, name: string, ownerId?: string) =>
	LibraryRecordType.create({ id: LibraryRecordType.createId(key), name, ownerId })

function sourceWith(shown: [TLLibrary, TLLibraryPlacement][]) {
	return new InMemoryLibrarySource({
		owners,
		initial: { libraries: shown.map(([l]) => l), items: [], contents: {} },
		shownInDocument: shown.map(([l, placement]) => ({ libraryId: l.id, placement })),
	})
}

const rows = (source: InMemoryLibrarySource) =>
	getLibraryMenuTargets(source, source.getLibraries()).map(({ name, detail }) =>
		detail ? `${name} · ${detail}` : name
	)

const stash = library('stash', 'My stash', 'home')
const board = library('board', 'This file', 'board')

it("puts the user's default and the document's own first, without their owners", () => {
	const kit = library('kit', 'Kit', 'team')
	const source = sourceWith([
		[kit, 'added'],
		[board, 'document'],
		[stash, 'default'],
	])
	expect(rows(source)).toEqual(['My stash', 'This file', 'Kit'])
})

it('keeps the rest in the order the source lists them', () => {
	const source = sourceWith([
		[library('b', 'B', 'team'), 'added'],
		[stash, 'default'],
		[library('a', 'A', 'team'), 'housed'],
		[board, 'document'],
	])
	expect(rows(source)).toEqual(['My stash', 'This file', 'B', 'A'])
})

it('names the owner of each of the rest when they belong to two or more owners', () => {
	const source = sourceWith([
		[stash, 'default'],
		[board, 'document'],
		[library('kit', 'Kit', 'team'), 'added'],
		[library('icons', 'Icons', 'home'), 'added'],
	])
	expect(rows(source)).toEqual(['My stash', 'This file', 'Kit · Team', 'Icons · My workspace'])
})

it('names the owner of a library that shares its name with another listed one', () => {
	const source = sourceWith([
		[stash, 'default'],
		[board, 'document'],
		[library('their-stash', 'My stash', 'team'), 'added'],
		[library('kit', 'Kit', 'team'), 'added'],
	])
	expect(rows(source)).toEqual(['My stash', 'This file', 'My stash · Team', 'Kit'])
})

it("lists a source that doesn't place its libraries as it comes, naming owners when there are two or more", () => {
	const mixed = new InMemoryLibrarySource({
		owners,
		initial: {
			libraries: [library('a', 'A', 'team'), library('b', 'B', 'home')],
			items: [],
			contents: {},
		},
	})
	expect(rows(mixed)).toEqual(['A · Team', 'B · My workspace'])

	const single = new InMemoryLibrarySource({
		owners,
		initial: {
			libraries: [library('a', 'A', 'team'), library('b', 'B', 'team')],
			items: [],
			contents: {},
		},
	})
	expect(rows(single)).toEqual(['A', 'B'])
})

it('lists a library inside another after it, by its own name', () => {
	const kit = library('kit', 'Kit', 'team')
	const icons = LibraryRecordType.create({
		id: LibraryRecordType.createId('icons'),
		name: 'Icons',
		ownerId: 'team',
		parentId: kit.id,
	})
	const loose = library('loose', 'Loose', 'team')
	const source = new InMemoryLibrarySource({
		owners,
		initial: { libraries: [icons, loose, kit], items: [], contents: {} },
	})
	expect(rows(source)).toEqual(['Loose', 'Kit', 'Icons'])
	expect(getLibraryMenuTargets(source, [loose, icons]).map(({ name }) => name)).toEqual([
		'Loose',
		'Icons',
	])
})
