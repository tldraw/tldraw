import {
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
import { Editor } from 'tldraw'
import type { Showing } from './collections-example'
import { LocalStorageCollectionSource } from './collections-local-storage-source'
import diagramming from './collections-pack-diagramming.json'
import doodles from './collections-pack-doodles.json'
import tldrawCharacters from './collections-pack-tldraw-characters.json'
import wireframing from './collections-pack-wireframing.json'
import { saveSamples, WIREFRAMES } from './collections-samples'

export const PAGES = [
	'InMemoryCollectionSource',
	'CompositeCollectionSource',
	'LocalStorageCollectionSource',
] as const
export type PageName = (typeof PAGES)[number]

const PACKS = [wireframing, diagramming, tldrawCharacters, doodles] as unknown as CollectionPack[]

// Packs the app ships as data, listed as they are: their items can be placed but nothing changed.
function shippedPacks(packs: CollectionPack[]) {
	const collections = packs.map((pack) =>
		CollectionRecordType.create({
			name: pack.name,
			meta: { packId: pack.id, packVersion: pack.version },
		})
	)
	const entries = packs.flatMap((pack, i) =>
		pack.items.map((item) => ({
			record: CollectionItemRecordType.create({
				collectionId: collections[i].id,
				name: item.name,
				thumbnail: item.thumbnail,
			}),
			content: item.content,
		}))
	)
	const contents: Record<TLCollectionItemId, TLCollectionItemContent> = Object.fromEntries(
		entries.map(({ record, content }) => [record.id, content])
	)
	return new InMemoryCollectionSource({
		id: 'collections-packs',
		can: () => false,
		initial: { collections, items: entries.map(({ record }) => record), contents },
	})
}

const packs = shippedPacks(PACKS)

const library = new InMemoryCollectionSource({ id: 'collections-library' })

const local = new LocalStorageCollectionSource('collections-local', 'collections-example-local')

function AddPackMenuItems({ source }: { source: CollectionSource }) {
	const addPack = (pack: CollectionPack) =>
		copyPack(source, pack).catch((error) =>
			console.error(`[collections] adding the ${pack.name} pack failed`, error)
		)
	return PACKS.map((pack) => (
		<CollectionMenuItem key={pack.id} label={`Add ${pack.name}`} onClick={() => addPack(pack)} />
	))
}

const SHOWINGS: Record<PageName, Showing> = {
	InMemoryCollectionSource: { source: packs },
	CompositeCollectionSource: {
		source: new CompositeCollectionSource({
			id: 'collections-composite',
			parts: [
				{ owner: { id: 'library', name: 'Library' }, source: library },
				{ owner: { id: 'packs', name: 'Packs' }, source: packs },
			],
		}),
		seed: async (editor) => {
			const wireframes = await library.createCollection('Wireframes')
			await saveSamples(editor, library, wireframes.id, WIREFRAMES)
		},
	},
	LocalStorageCollectionSource: {
		source: local,
		menuItems: <AddPackMenuItems source={local} />,
	},
}

/** What the current page shows. Reactive: it changes with the page. */
export function getShowing(editor: Editor): Showing {
	return SHOWINGS[editor.getCurrentPage().name as PageName] ?? SHOWINGS.InMemoryCollectionSource
}
