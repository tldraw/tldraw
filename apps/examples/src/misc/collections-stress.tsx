import { CollectionRecordType, InMemoryCollectionSource } from '@tldraw/collections'
import { Editor } from 'tldraw'
import { CollectionsExample, type Showing } from './collections-example'
import { saveSamples, shapeSample } from './collections-samples'

// Unlisted, like /develop: @tldraw/collections is unreleased. Each page of the document loads the
// panel with no items, many items, or many collections. /collections shows each CollectionSource.

const PAGES = ['Empty', 'Many items', 'Many collections'] as const
type PageName = (typeof PAGES)[number]

const MANY_ITEMS = 40
const MANY_COLLECTIONS = 24

const manyItems = new InMemoryCollectionSource({
	id: 'collections-many-items',
	initial: {
		collections: [CollectionRecordType.create({ name: 'Shapes' })],
		items: [],
		contents: {},
	},
})

const manyCollections = new InMemoryCollectionSource({
	id: 'collections-many-collections',
	initial: {
		collections: Array.from({ length: MANY_COLLECTIONS }, (_, i) =>
			CollectionRecordType.create({ name: `Collection ${i + 1}` })
		),
		items: [],
		contents: {},
	},
})

const SHOWINGS: Record<PageName, Showing> = {
	Empty: { source: new InMemoryCollectionSource({ id: 'collections-empty' }) },
	'Many items': {
		source: manyItems,
		seed: async (editor) => {
			const [shapes] = manyItems.getCollections()
			const samples = Array.from({ length: MANY_ITEMS }, (_, i) => shapeSample(i))
			await saveSamples(editor, manyItems, shapes.id, samples)
		},
	},
	'Many collections': {
		source: manyCollections,
		seed: async (editor) => {
			for (const [i, collection] of manyCollections.getCollections().entries()) {
				const samples = Array.from({ length: (i % 3) + 1 }, (_, j) => shapeSample(i * 3 + j))
				await saveSamples(editor, manyCollections, collection.id, samples)
			}
		},
	},
}

const getShowing = (editor: Editor): Showing =>
	SHOWINGS[editor.getCurrentPage().name as PageName] ?? SHOWINGS.Empty

export default function CollectionsStress() {
	return (
		<CollectionsExample persistenceKey="collections-stress" pages={PAGES} getShowing={getShowing} />
	)
}
