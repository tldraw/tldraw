import { LibraryRecordType, InMemoryLibrarySource } from '@tldraw/libraries'
import { Editor } from 'tldraw'
import { LibrariesExample, type Showing } from './libraries-example'
import { saveSamples, shapeSample } from './libraries-samples'

// Unlisted, like /develop: @tldraw/libraries is unreleased. Each page of the document loads the
// panel with no items, many items, or many libraries. /libraries shows each LibrarySource.

const PAGES = ['Empty', 'Many items', 'Many libraries'] as const
type PageName = (typeof PAGES)[number]

const MANY_ITEMS = 40
const MANY_LIBRARIES = 24

const manyItems = new InMemoryLibrarySource({
	id: 'libraries-many-items',
	initial: {
		libraries: [LibraryRecordType.create({ name: 'Shapes' })],
		items: [],
		contents: {},
	},
})

const manyLibraries = new InMemoryLibrarySource({
	id: 'libraries-many-libraries',
	initial: {
		libraries: Array.from({ length: MANY_LIBRARIES }, (_, i) =>
			LibraryRecordType.create({ name: `Library ${i + 1}` })
		),
		items: [],
		contents: {},
	},
})

const SHOWINGS: Record<PageName, Showing> = {
	Empty: { source: new InMemoryLibrarySource({ id: 'libraries-empty' }) },
	'Many items': {
		source: manyItems,
		seed: async (editor) => {
			const [shapes] = manyItems.getLibraries()
			const samples = Array.from({ length: MANY_ITEMS }, (_, i) => shapeSample(i))
			await saveSamples(editor, manyItems, shapes.id, samples)
		},
	},
	'Many libraries': {
		source: manyLibraries,
		seed: async (editor) => {
			for (const [i, library] of manyLibraries.getLibraries().entries()) {
				const samples = Array.from({ length: (i % 3) + 1 }, (_, j) => shapeSample(i * 3 + j))
				await saveSamples(editor, manyLibraries, library.id, samples)
			}
		},
	},
}

const getShowing = (editor: Editor): Showing =>
	SHOWINGS[editor.getCurrentPage().name as PageName] ?? SHOWINGS.Empty

export default function LibrariesStress() {
	return (
		<LibrariesExample persistenceKey="libraries-stress" pages={PAGES} getShowing={getShowing} />
	)
}
