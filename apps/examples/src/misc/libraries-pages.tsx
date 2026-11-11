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
import { Editor } from 'tldraw'
import type { Showing } from './libraries-example'
import { LocalStorageLibrarySource } from './libraries-local-storage-source'
import diagramming from './libraries-pack-diagramming.json'
import doodles from './libraries-pack-doodles.json'
import tldrawCharacters from './libraries-pack-tldraw-characters.json'
import wireframing from './libraries-pack-wireframing.json'
import { saveSamples, WIREFRAMES } from './libraries-samples'

export const PAGES = [
	'InMemoryLibrarySource',
	'CompositeLibrarySource',
	'LocalStorageLibrarySource',
] as const
export type PageName = (typeof PAGES)[number]

const PACKS = [wireframing, diagramming, tldrawCharacters, doodles] as unknown as LibraryPack[]

// Packs the app ships as data, listed as they are: their items can be placed but nothing changed.
function shippedPacks(packs: LibraryPack[]) {
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
		id: 'collections-packs',
		can: () => false,
		initial: { libraries, items: entries.map(({ record }) => record), contents },
	})
}

const packs = shippedPacks(PACKS)

const library = new InMemoryLibrarySource({ id: 'collections-library' })

const local = new LocalStorageLibrarySource('collections-local', 'collections-example-local')

function AddPackMenuItems({ source }: { source: LibrarySource }) {
	const addPack = (pack: LibraryPack) =>
		copyPack(source, pack).catch((error) =>
			console.error(`[libraries] adding the ${pack.name} pack failed`, error)
		)
	return PACKS.map((pack) => (
		<LibraryMenuItem key={pack.id} label={`Add ${pack.name}`} onClick={() => addPack(pack)} />
	))
}

const SHOWINGS: Record<PageName, Showing> = {
	InMemoryLibrarySource: { source: packs },
	CompositeLibrarySource: {
		source: new CompositeLibrarySource({
			id: 'collections-composite',
			parts: [
				{ owner: { id: 'library', name: 'Library' }, source: library },
				{ owner: { id: 'packs', name: 'Packs' }, source: packs },
			],
		}),
		seed: async (editor) => {
			const wireframes = await library.createLibrary('Wireframes')
			await saveSamples(editor, library, wireframes.id, WIREFRAMES)
		},
	},
	LocalStorageLibrarySource: {
		source: local,
		menuItems: <AddPackMenuItems source={local} />,
	},
}

/** What the current page shows. Reactive: it changes with the page. */
export function getShowing(editor: Editor): Showing {
	return SHOWINGS[editor.getCurrentPage().name as PageName] ?? SHOWINGS.InMemoryLibrarySource
}
