import {
	LibraryItemRecordType,
	LibraryMenuItem,
	type LibraryPack,
	LibraryRecordType,
	type LibrarySource,
	CompositeLibrarySource,
	copyPack,
	InMemoryLibrarySource,
	type TLLibraryItemContent,
	type TLLibraryItemId,
} from '@tldraw/libraries'
import { Editor, useValue } from 'tldraw'
import type { Showing } from './libraries-example'
import { LocalStorageLibrarySource } from './libraries-local-storage-source'
import diagramming from './libraries-pack-diagramming.json'
import doodles from './libraries-pack-doodles.json'
import { addedPackIds, PackReferencesSource, setPackAdded } from './libraries-pack-references'
import tldrawCharacters from './libraries-pack-tldraw-characters.json'
import wireframing from './libraries-pack-wireframing.json'
import { saveSamples, WIREFRAMES } from './libraries-samples'

export const PAGES = [
	'InMemoryLibrarySource',
	'CompositeLibrarySource',
	'LocalStorageLibrarySource',
	'PackReferences',
	'PackPublisher',
] as const
export type PageName = (typeof PAGES)[number]

const PACKS = [wireframing, diagramming, tldrawCharacters, doodles] as unknown as LibraryPack[]

// Packs the app ships as data, listed as they are: their items can be placed but nothing changed.
function shippedPacks(packs: LibraryPack[], { editable = false } = {}) {
	const libraries = packs.map((pack) =>
		LibraryRecordType.create({
			name: pack.name,
			meta: { packId: pack.id, packVersion: pack.version },
		})
	)
	const entries = packs.flatMap((pack, i) =>
		pack.items.map((item) => ({
			record: LibraryItemRecordType.create({
				libraryId: libraries[i].id,
				name: item.name,
				thumbnail: item.thumbnail,
			}),
			content: item.content,
		}))
	)
	const contents: Record<TLLibraryItemId, TLLibraryItemContent> = Object.fromEntries(
		entries.map(({ record, content }) => [record.id, content])
	)
	return new InMemoryLibrarySource({
		id: editable ? 'libraries-packs-published' : 'libraries-packs',
		can: () => editable,
		initial: { libraries, items: entries.map(({ record }) => record), contents },
	})
}

const packs = shippedPacks(PACKS)

// Stands in for tldraw's copy of its packs: the publisher page edits it, and everyone who added a
// pack sees the edit. Held in memory, so a reload goes back to the shipped packs.
const publishedPacks = shippedPacks(PACKS, { editable: true })

const shared = new InMemoryLibrarySource({ id: 'libraries-shared' })

const local = new LocalStorageLibrarySource('libraries-local', 'libraries-example-local')

function AddPackMenuItems({ source }: { source: LibrarySource }) {
	const addPack = (pack: LibraryPack) =>
		copyPack(source, pack).catch((error) =>
			console.error(`[libraries] adding the ${pack.name} pack failed`, error)
		)
	return PACKS.map((pack) => (
		<LibraryMenuItem key={pack.id} label={`Add ${pack.name}`} onClick={() => addPack(pack)} />
	))
}

function AddPackReferenceMenuItems() {
	const added = useValue('added packs', () => addedPackIds.get(), [])
	return PACKS.map((pack) => {
		const isAdded = added.includes(pack.id)
		return (
			<LibraryMenuItem
				key={pack.id}
				label={`${isAdded ? 'Remove' : 'Add'} ${pack.name}`}
				onClick={() => setPackAdded(pack.id, !isAdded)}
			/>
		)
	})
}

const SHOWINGS: Record<PageName, Showing> = {
	InMemoryLibrarySource: { source: packs },
	CompositeLibrarySource: {
		source: new CompositeLibrarySource({
			id: 'libraries-composite',
			parts: [
				{ owner: { id: 'shared', name: 'Shared' }, source: shared },
				{ owner: { id: 'packs', name: 'Packs' }, source: packs },
			],
		}),
		seed: async (editor) => {
			const wireframes = await shared.createLibrary('Wireframes')
			await saveSamples(editor, shared, wireframes.id, WIREFRAMES)
		},
	},
	LocalStorageLibrarySource: {
		source: local,
		menuItems: <AddPackMenuItems source={local} />,
	},
	PackReferences: {
		source: new CompositeLibrarySource({
			id: 'libraries-pack-references-composite',
			parts: [
				{ owner: { id: 'yours', name: 'Yours' }, source: local },
				{
					owner: { id: 'tldraw', name: 'tldraw' },
					source: new PackReferencesSource(publishedPacks),
				},
			],
		}),
		menuItems: <AddPackReferenceMenuItems />,
	},
	PackPublisher: { source: publishedPacks },
}

/** What the current page shows. Reactive: it changes with the page. */
export function getShowing(editor: Editor): Showing {
	return SHOWINGS[editor.getCurrentPage().name as PageName] ?? SHOWINGS.InMemoryLibrarySource
}
