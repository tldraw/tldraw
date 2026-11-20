import { LibraryRecordType } from 'tldraw'
import { InMemoryLibrarySource } from '../lib/InMemoryLibrarySource'
import type { LibraryBrowseEntry } from './browse-libraries-dialog'
import { getEmptyThisFileOffers, getPanelSections } from './panel-sections'

const library = (id: string) =>
	LibraryRecordType.create({ id: LibraryRecordType.createId(id), name: id })
const names = (list: { name: string }[]) => list.map((l) => l.name)

it("lists a source that doesn't place its libraries as it comes", () => {
	const source = new InMemoryLibrarySource({
		initial: { libraries: [library('a'), library('b')], items: [], contents: {} },
	})
	expect(getPanelSections(source, source.getLibraries())).toBeUndefined()
})

it('puts housed and added libraries under this file, and the default after them', () => {
	const libraries = ['housed', 'mine', 'added', 'available'].map(library)
	const source = new InMemoryLibrarySource({
		initial: { libraries, items: [], contents: {} },
		shownInDocument: [
			{ libraryId: libraries[0].id, placement: 'housed' },
			{ libraryId: libraries[1].id, placement: 'default' },
			{ libraryId: libraries[2].id, placement: 'added' },
		],
	})
	const sections = getPanelSections(source, source.getLibraries())
	expect(
		sections && { thisFile: names(sections.thisFile), defaults: names(sections.defaults) }
	).toEqual({ thisFile: ['housed', 'added'], defaults: ['mine'] })
})

describe('the offers in an empty "This file"', () => {
	const entry = (id: string, state: Partial<LibraryBrowseEntry> = {}): LibraryBrowseEntry => ({
		id,
		name: id,
		itemCount: 1,
		previews: [],
		added: false,
		canAdd: true,
		add: async () => LibraryRecordType.createId(id),
		...state,
	})
	const groups = [
		{ id: 'public', label: 'Public', entries: [entry('added', { added: true }), entry('a')] },
		{
			id: 'more',
			label: 'More',
			entries: [entry('locked', { canAdd: false }), entry('b'), entry('c'), entry('d')],
		},
	]
	const empty = { thisFile: [], defaults: [library('mine')] }

	it('offers the first few entries that can still be added', () => {
		expect(getEmptyThisFileOffers(empty, groups).map((e) => e.id)).toEqual(['a', 'b', 'c'])
	})

	it('offers nothing once "This file" has a library, or without "This file"', () => {
		expect(getEmptyThisFileOffers({ ...empty, thisFile: [library('kit')] }, groups)).toEqual([])
		expect(getEmptyThisFileOffers(undefined, groups)).toEqual([])
	})
})
