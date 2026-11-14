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
import { ArchiveIcon, HomeIcon, PeopleIcon } from './libraries-owner-icons'
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
		id: 'libraries-packs',
		can: () => false,
		initial: { libraries, items: entries.map(({ record }) => record), contents },
	})
}

const packs = shippedPacks(PACKS)

const board = new InMemoryLibrarySource({ id: 'libraries-board' })

const personal = new InMemoryLibrarySource({ id: 'libraries-personal' })

const shared = new InMemoryLibrarySource({ id: 'libraries-shared' })

const designTeam = new InMemoryLibrarySource({ id: 'libraries-design-team' })

const marketing = new InMemoryLibrarySource({ id: 'libraries-marketing' })

const engineering = new InMemoryLibrarySource({ id: 'libraries-engineering' })

const sales = new InMemoryLibrarySource({ id: 'libraries-sales' })

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

const SHOWINGS: Record<PageName, Showing> = {
	InMemoryLibrarySource: { source: packs },
	CompositeLibrarySource: {
		source: new CompositeLibrarySource({
			id: 'libraries-composite',
			defaultOwnerId: 'personal',
			parts: [
				{ owner: { id: 'board', name: 'This board', icon: 'file' }, source: board },
				{ owner: { id: 'personal', name: 'Private to you', icon: <HomeIcon /> }, source: personal },
				{ owner: { id: 'shared', name: 'Shared', icon: <PeopleIcon /> }, source: shared },
				{
					owner: { id: 'design-team', name: 'Design team', icon: <PeopleIcon /> },
					source: designTeam,
				},
				{ owner: { id: 'marketing', name: 'Marketing', icon: <PeopleIcon /> }, source: marketing },
				{
					owner: { id: 'engineering', name: 'Engineering', icon: <PeopleIcon /> },
					source: engineering,
				},
				{ owner: { id: 'sales', name: 'Sales', icon: <PeopleIcon /> }, source: sales },
				{ owner: { id: 'packs', name: 'Packs', icon: <ArchiveIcon /> }, source: packs },
			],
		}),
		seed: async (editor) => {
			const sketches = await board.createLibrary('Sketches')
			await saveSamples(editor, board, sketches.id, WIREFRAMES.slice(0, 2))
			const wireframes = await shared.createLibrary('Wireframes')
			await saveSamples(editor, shared, wireframes.id, WIREFRAMES)
			const components = await designTeam.createLibrary('Components')
			await saveSamples(editor, designTeam, components.id, WIREFRAMES)
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
