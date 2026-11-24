import { LibraryRecordType } from 'tldraw'
import { InMemoryLibrarySource } from '../lib/InMemoryLibrarySource'
import { type BrowseSections, getBrowseSections, keepBrowsePlacement } from './browse-groups'
import type { LibraryBrowseEntry, LibraryBrowseGroup } from './browse-libraries-dialog'

const library = (name: string, ownerId: string) =>
	LibraryRecordType.create({ id: LibraryRecordType.createId(name), name, ownerId })

const owners = [
	{ id: 'acme', name: 'Acme' },
	{ id: 'home', name: 'Home' },
	{ id: 'board', name: 'This board' },
]

function setUp() {
	const libraries = [
		library('Wireframes', 'acme'),
		library('Icons', 'home'),
		library('My stash', 'home'),
		library('Diagrams', 'acme'),
		library('Sketches', 'board'),
		library('Arrows', 'home'),
	]
	const id = (name: string) => libraries.find((l) => l.name === name)!.id
	const source = new InMemoryLibrarySource({
		owners,
		defaultOwnerId: 'home',
		initial: { libraries, items: [], contents: {} },
		shownInDocument: [
			{ libraryId: id('My stash'), placement: 'default' },
			{ libraryId: id('Arrows'), placement: 'added' },
			{ libraryId: id('Sketches'), placement: 'housed' },
		],
	})
	return { source, id }
}

const summary = (source: InMemoryLibrarySource, hostGroups: LibraryBrowseGroup[] = []) =>
	summarize(getBrowseSections(source, hostGroups))

const summarize = ({ thisFile, owners, hosts }: BrowseSections) => {
	return {
		thisFile: thisFile.map((listed) =>
			listed.kind === 'source' ? listed.library.name : `${listed.entry.name} (host)`
		),
		owners: owners.map((group) => [group.ownerName, group.libraries.map((l) => l.name)]),
		hosts: hosts.map((group) => [group.label, group.entries.map((entry) => entry.name)]),
	}
}

const entry = (name: string, state: Partial<LibraryBrowseEntry> = {}): LibraryBrowseEntry => ({
	id: name,
	name,
	itemCount: 0,
	previews: [],
	added: false,
	canAdd: true,
	add: async () => LibraryRecordType.createId(name),
	...state,
})

it("lists what the file has added first, then the default owner's libraries to add, then the rest by owner, by name, without the user's default library", () => {
	const { source } = setUp()
	expect(summary(source)).toEqual({
		thisFile: ['Arrows'],
		owners: [
			['Home', ['Icons']],
			['Acme', ['Diagrams', 'Wireframes']],
		],
		hosts: [],
	})
})

it('moves a library to "In this file" once added, and leaves out those housed in the document', async () => {
	const { source, id } = setUp()
	await source.addLibraryToDocument!(id('Diagrams'))
	expect(summary(source)).toMatchObject({
		thisFile: ['Arrows', 'Diagrams'],
		owners: [
			['Home', ['Icons']],
			['Acme', ['Wireframes']],
		],
	})
	await source.removeLibraryFromDocument!(id('Diagrams'))
	expect(summary(source).owners[1]).toEqual(['Acme', ['Diagrams', 'Wireframes']])
})

it("lists a host's added entries in this file, once, and leaves the group the rest", () => {
	const { source, id } = setUp()
	const packs = {
		id: 'packs',
		label: 'Public libraries',
		entries: [
			entry('Doodles'),
			entry('Arrows pack', { added: true, libraryId: id('Arrows') }),
			entry('Badges', { added: true }),
		],
	}
	const empty = { id: 'empty', label: 'Shipped', entries: [entry('Kit', { added: true })] }
	expect(summary(source, [packs, empty])).toEqual({
		thisFile: ['Arrows pack (host)', 'Badges (host)', 'Kit (host)'],
		owners: [
			['Home', ['Icons']],
			['Acme', ['Diagrams', 'Wireframes']],
		],
		hosts: [['Public libraries', ['Doodles']]],
	})
})

it("lists only a host's entries for a source that doesn't add libraries to documents", () => {
	const source = new InMemoryLibrarySource({
		initial: { libraries: [library('Icons', 'home')], items: [], contents: {} },
		owners,
	})
	expect(summary(source)).toEqual({ thisFile: [], owners: [], hosts: [] })
	expect(summary(source, [{ id: 'packs', label: 'Packs', entries: [entry('Doodles')] }])).toEqual({
		thisFile: [],
		owners: [],
		hosts: [['Packs', ['Doodles']]],
	})
})

describe('keepBrowsePlacement', () => {
	it('keeps a library added or removed while browsing in the group it was shown in', async () => {
		const { source, id } = setUp()
		const shown = getBrowseSections(source)
		await source.addLibraryToDocument!(id('Diagrams'))
		await source.removeLibraryFromDocument!(id('Arrows'))
		expect(summarize(keepBrowsePlacement(shown, getBrowseSections(source)))).toEqual(
			summarize(shown)
		)
	})

	it("keeps a host's entry in its group once added, with the entry as it is now", () => {
		const { source } = setUp()
		const packs = (added: boolean) => ({
			id: 'packs',
			label: 'Public libraries',
			entries: [entry('Doodles', { added }), entry('Badges')],
		})
		const kept = keepBrowsePlacement(
			getBrowseSections(source, [packs(false)]),
			getBrowseSections(source, [packs(true)])
		)
		expect(summarize(kept).hosts).toEqual([['Public libraries', ['Doodles', 'Badges']]])
		expect(kept.hosts[0].entries[0].added).toBe(true)
	})

	it('puts a library first listed while browsing where it belongs, and drops one no longer listed', async () => {
		const { source, id } = setUp()
		const shown = getBrowseSections(source)
		const added = await source.createLibrary('Badges', { ownerId: 'acme' })
		await source.deleteLibrary(id('Icons'))
		const kept = summarize(keepBrowsePlacement(shown, getBrowseSections(source)))
		expect(kept).toMatchObject({
			thisFile: ['Arrows', added.name],
			owners: [['Acme', ['Diagrams', 'Wireframes']]],
		})
	})

	it('groups as usual when nothing has been shown yet', () => {
		const { source } = setUp()
		const next = getBrowseSections(source)
		expect(keepBrowsePlacement(undefined, next)).toBe(next)
	})
})
