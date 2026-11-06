import {
	BoardCollectionSource,
	CollectionItemRecordType,
	CollectionMenuItem,
	type CollectionPack,
	CollectionRecordType,
	type CollectionSource,
	CompositeCollectionSource,
	copyPack,
	InMemoryCollectionSource,
	type TLCollectionItemContent,
	type TLCollectionItemId,
} from '@tldraw/collections'
import type { ReactNode } from 'react'
import { atom, Editor } from 'tldraw'
import { LocalStorageCollectionSource } from './collections-local-storage-source'
import tldrawCharacters from './collections-pack-tldraw-characters.json'
import { BOARD_KIT, saveSamples, shapeSample, WIREFRAMES } from './collections-samples'
import { STARTER_PACKS } from './collections-starter-packs'

export const PAGES = [
	'BoardCollectionSource',
	'InMemoryCollectionSource',
	'CompositeCollectionSource',
	'LocalStorageCollectionSource',
	'Stress',
] as const
export type PageName = (typeof PAGES)[number]

export const STRESS_MODES = ['Empty', 'Many items', 'Many collections'] as const
export type StressMode = (typeof STRESS_MODES)[number]
export const stressMode = atom<StressMode>('stress mode', 'Many items')

export interface Showing {
	source: CollectionSource
	/** Fills the source the first time it shows. */
	seed?(editor: Editor): Promise<void>
	menuItems?: ReactNode
}

// A set the app ships as data, listed as it is: its items can be placed but nothing in it changed.
const shippedSet = (pack: CollectionPack) => {
	const collection = CollectionRecordType.create({ name: pack.name })
	const items = pack.items.map((item) =>
		CollectionItemRecordType.create({
			collectionId: collection.id,
			name: item.name,
			thumbnail: item.thumbnail,
		})
	)
	const contents: Record<TLCollectionItemId, TLCollectionItemContent> = Object.fromEntries(
		items.map((item, i) => [item.id, pack.items[i].content])
	)
	return new InMemoryCollectionSource({
		id: 'collections-shipped',
		readOnly: true,
		initial: { collections: [collection], items, contents },
	})
}

const shipped: Showing = {
	source: shippedSet(tldrawCharacters as unknown as CollectionPack),
}

const local = new LocalStorageCollectionSource('collections-local', 'collections-example-local')

function AddStarterCollectionsMenuItem({ source }: { source: CollectionSource }) {
	const addStarterCollections = async () => {
		for (const pack of STARTER_PACKS) await copyPack(source, pack)
	}
	return (
		<CollectionMenuItem
			label="Add starter collections"
			onClick={() =>
				addStarterCollections().catch((error) =>
					console.error('[collections] adding starter collections failed', error)
				)
			}
		/>
	)
}

const custom: Showing = {
	source: local,
	menuItems: <AddStarterCollectionsMenuItem source={local} />,
}

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

const STRESS: Record<StressMode, Showing> = {
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

// A board's collections are records in its editor's document, so these are made per editor.
const editorShowings = new WeakMap<Editor, Record<Exclude<PageName, 'Stress'>, Showing>>()

function getEditorShowings(editor: Editor) {
	let showings = editorShowings.get(editor)
	if (!showings) {
		const board = new BoardCollectionSource(editor, { id: 'collections-board' })
		const library = new InMemoryCollectionSource({ id: 'collections-library' })
		showings = {
			BoardCollectionSource: { source: board },
			InMemoryCollectionSource: shipped,
			CompositeCollectionSource: {
				source: new CompositeCollectionSource({
					id: 'collections-composite',
					parts: [
						{ owner: { id: 'board', name: 'This board' }, source: board },
						{ owner: { id: 'library', name: 'Shared library' }, source: library },
					],
				}),
				seed: async (editor) => {
					const wireframes = await library.createCollection('Wireframes')
					await saveSamples(editor, library, wireframes.id, WIREFRAMES)
				},
			},
			LocalStorageCollectionSource: custom,
		}
		editorShowings.set(editor, showings)
	}
	return showings
}

/** What the current page shows. Reactive: it changes with the page and the stress mode. */
export function getShowing(editor: Editor): Showing {
	const page = editor.getCurrentPage().name as PageName
	if (page === 'Stress') return STRESS[stressMode.get()]
	return getEditorShowings(editor)[page] ?? getEditorShowings(editor).BoardCollectionSource
}

// The board kit is saved into the document, so it is seeded once per document, not on every load.
export async function seedBoard(editor: Editor) {
	if (editor.getDocumentSettings().meta.collectionsExampleSeeded) return
	editor.run(() => editor.updateDocumentSettings({ meta: { collectionsExampleSeeded: true } }), {
		history: 'ignore',
	})
	const { source } = getEditorShowings(editor).BoardCollectionSource
	const kit = await source.createCollection('Board kit')
	await saveSamples(editor, source, kit.id, BOARD_KIT)
}
