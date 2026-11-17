import {
	BoardIcon,
	CompositeLibrarySource,
	copyPack,
	InMemoryLibrarySource,
	LibraryItemRecordType,
	LibraryMenuItem,
	type LibraryPack,
	type LibraryPackLibrary,
	LibraryRecordType,
	type LibrarySource,
	type TLLibrary,
	type TLLibraryId,
	type TLLibraryItem,
	type TLLibraryItemContent,
	type TLLibraryItemId,
} from '@tldraw/libraries'
import { Editor, useEditor } from 'tldraw'
import { packsFromCategorisedFile, pickJsonFile } from './libraries-categorised-file'
import { LibrariesExample, type Showing } from './libraries-example'
import { ArchiveIcon, HomeIcon, PeopleIcon } from './libraries-owner-icons'
import diagramming from './libraries-pack-diagramming.json'
import wireframing from './libraries-pack-wireframing.json'
import { saveSamples, shapeSample, WIREFRAMES } from './libraries-samples'

// Unlisted, like /libraries: libraries inside libraries, to any depth.

const PAGES = ['InMemoryLibrarySource', 'CompositeLibrarySource'] as const
type PageName = (typeof PAGES)[number]

// The shipped packs as libraries inside one pack.
const STARTER_SHAPES: LibraryPack = {
	id: 'starter-shapes',
	name: 'Starter shapes',
	version: 1,
	items: [],
	libraries: ([wireframing, diagramming] as unknown as LibraryPack[]).map((pack) => ({
		id: pack.id,
		name: pack.name,
		items: pack.items,
	})),
}

// A pack listed as it is, with the libraries inside it: its items can be placed but nothing changed.
function shippedPack(pack: LibraryPack) {
	const libraries: TLLibrary[] = []
	const items: TLLibraryItem[] = []
	const contents: Record<TLLibraryItemId, TLLibraryItemContent> = {}
	const add = (library: LibraryPack | LibraryPackLibrary, parentId?: TLLibraryId) => {
		const record = LibraryRecordType.create({
			name: library.name,
			...(parentId ? { parentId } : { meta: { packId: pack.id, packVersion: pack.version } }),
		})
		libraries.push(record)
		for (const item of library.items) {
			const itemRecord = LibraryItemRecordType.create({
				libraryId: record.id,
				name: item.name,
				thumbnail: item.thumbnail,
			})
			items.push(itemRecord)
			contents[itemRecord.id] = item.content
		}
		for (const child of library.libraries ?? []) add(child, record.id)
	}
	add(pack)
	return new InMemoryLibrarySource({
		id: 'nested-packs',
		can: () => false,
		initial: { libraries, items, contents },
	})
}

const solo = new InMemoryLibrarySource({ id: 'nested-solo' })
const board = new InMemoryLibrarySource({ id: 'nested-board' })
const personal = new InMemoryLibrarySource({ id: 'nested-personal' })
const team = new InMemoryLibrarySource({ id: 'nested-team' })
const packs = shippedPack(STARTER_SHAPES)

const composite = new CompositeLibrarySource({
	id: 'nested-composite',
	defaultOwnerId: 'personal',
	parts: [
		{ owner: { id: 'board', name: 'This board', icon: <BoardIcon /> }, source: board },
		{ owner: { id: 'personal', name: 'Private to you', icon: <HomeIcon /> }, source: personal },
		{ owner: { id: 'team', name: 'Design team', icon: <PeopleIcon /> }, source: team },
		{ owner: { id: 'packs', name: 'Packs', icon: <ArchiveIcon /> }, source: packs },
	],
})

function AddPackMenuItems({ source }: { source: LibrarySource }) {
	const editor = useEditor()
	const ownerId = source.getDefaultOwnerId?.()
	const to = ownerId === undefined ? {} : { ownerId }
	const report = (error: unknown) => console.error('[libraries] adding a pack failed', error)
	const addFromFile = async () => {
		const file = await pickJsonFile()
		if (!file) return
		for (const pack of await packsFromCategorisedFile(editor, file)) {
			await copyPack(source, pack, to)
		}
	}
	return (
		<>
			<LibraryMenuItem
				label="Add Starter shapes"
				onClick={() => copyPack(source, STARTER_SHAPES, to).catch(report)}
			/>
			<LibraryMenuItem
				label="Add packs from a categorised file…"
				onClick={() => addFromFile().catch(report)}
			/>
		</>
	)
}

// UI kit ─ Forms ─ Inputs
//        └ Cards
// Shapes ─ Basic
//        └ Fancy
async function seedTree(editor: Editor, source: LibrarySource, ownerId?: string) {
	const to = ownerId === undefined ? {} : { ownerId }
	const kit = await source.createLibrary('UI kit', to)
	const forms = await source.createLibrary('Forms', { parentId: kit.id })
	const inputs = await source.createLibrary('Inputs', { parentId: forms.id })
	const cards = await source.createLibrary('Cards', { parentId: kit.id })
	await saveSamples(editor, source, kit.id, WIREFRAMES.slice(0, 1))
	await saveSamples(editor, source, inputs.id, WIREFRAMES.slice(1, 2))
	await saveSamples(editor, source, cards.id, WIREFRAMES.slice(1, 3))
	const shapes = await source.createLibrary('Shapes', to)
	const basic = await source.createLibrary('Basic', { parentId: shapes.id })
	const fancy = await source.createLibrary('Fancy', { parentId: shapes.id })
	await saveSamples(editor, source, basic.id, [0, 1, 2].map(shapeSample))
	await saveSamples(editor, source, fancy.id, [6, 7, 8, 9].map(shapeSample))
}

const SHOWINGS: Record<PageName, Showing> = {
	InMemoryLibrarySource: {
		source: solo,
		seed: (editor) => seedTree(editor, solo),
		menuItems: <AddPackMenuItems source={solo} />,
	},
	CompositeLibrarySource: {
		source: composite,
		seed: async (editor) => {
			await seedTree(editor, composite, 'team')
			const sketches = await composite.createLibrary('Sketches', { ownerId: 'board' })
			const rough = await composite.createLibrary('Rough', { parentId: sketches.id })
			await saveSamples(editor, composite, rough.id, WIREFRAMES.slice(0, 2))
		},
		menuItems: <AddPackMenuItems source={composite} />,
	},
}

function getShowing(editor: Editor): Showing {
	return SHOWINGS[editor.getCurrentPage().name as PageName] ?? SHOWINGS.InMemoryLibrarySource
}

export default function LibrariesNested() {
	return (
		<LibrariesExample persistenceKey="libraries-nested" pages={PAGES} getShowing={getShowing} />
	)
}
