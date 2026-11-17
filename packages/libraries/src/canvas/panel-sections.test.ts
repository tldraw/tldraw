import { LibraryRecordType } from 'tldraw'
import { InMemoryLibrarySource } from '../lib/InMemoryLibrarySource'
import { getPanelSections } from './panel-sections'

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
