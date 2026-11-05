import {
	AddToCollectionMenuItem,
	BoardCollectionSource,
	CollectionRecordType,
	CollectionsPanel,
	CollectionsQuickActions,
	collectionSchemaRecords,
	collectionsPanelOpen,
	type CollectionSource,
	CompositeCollectionSource,
	InMemoryCollectionSource,
	saveShapesToCollection,
	type TLCollectionId,
} from '@tldraw/collections'
import { useEffect } from 'react'
import {
	createShapeId,
	DefaultContextMenu,
	DefaultContextMenuContent,
	Editor,
	PageRecordType,
	TLComponents,
	Tldraw,
	TLGeoShape,
	TLShapePartial,
	toRichText,
	useEditor,
	useValue,
} from 'tldraw'
import '@tldraw/collections/collections.css'
import { STARTER_PACKS } from './collections-starter-packs'
import 'tldraw/tldraw.css'

// Unlisted, like /develop: @tldraw/collections is unreleased, so this page is for building its UI
// against in-memory sources without the tldraw.com stack. Each page of the document shows the panel
// over a different source.
const PAGES = ['Collections', 'Lots of items', 'Lots of collections', 'Empty'] as const
type PageName = (typeof PAGES)[number]

// Owners as tldraw.com has them: the open file, the user's home workspace, then a workspace they
// belong to.
const BOARD_OWNER = { id: 'board', name: 'This board' }
const PERSONAL = 'home'
const ACME = 'acme'
const OWNERS = [
	{ id: PERSONAL, name: 'Private to you', private: true },
	{ id: ACME, name: 'Acme workspace' },
]

const WIREFRAMES = CollectionRecordType.createId('wireframes')
const ICONS = CollectionRecordType.createId('icons')
const SHAPES = CollectionRecordType.createId('shapes')

const workspaces = (id: string, collections: ReturnType<typeof CollectionRecordType.create>[]) =>
	new InMemoryCollectionSource({
		id,
		owners: OWNERS,
		defaultOwnerId: PERSONAL,
		initial: { collections, items: [], contents: {} },
	})

const samples = workspaces('collections-samples', [
	CollectionRecordType.create({ id: WIREFRAMES, name: 'Wireframes', ownerId: ACME }),
	CollectionRecordType.create({ id: ICONS, name: 'Icons', ownerId: PERSONAL }),
])

const manyItems = workspaces('collections-many-items', [
	CollectionRecordType.create({ id: SHAPES, name: 'Shapes', ownerId: PERSONAL }),
])

const MANY_COLLECTIONS = 24

const manyCollections = workspaces(
	'collections-many-collections',
	Array.from({ length: MANY_COLLECTIONS }, (_, i) =>
		CollectionRecordType.create({
			id: CollectionRecordType.createId(`collection-${i + 1}`),
			name: `Collection ${i + 1}`,
			ownerId: i % 3 === 2 ? ACME : PERSONAL,
		})
	)
)

const empty = workspaces('collections-empty', [])

// The board's collections are records in the editor's document, so the default page's source is
// made per editor.
const editorSources = new WeakMap<
	Editor,
	{ board: BoardCollectionSource; byPage: Record<PageName, CollectionSource> }
>()

function getEditorSources(editor: Editor) {
	let sources = editorSources.get(editor)
	if (!sources) {
		const board = new BoardCollectionSource(editor, { id: 'collections-board' })
		sources = {
			board,
			byPage: {
				Collections: new CompositeCollectionSource({
					id: 'collections-default',
					defaultOwnerId: PERSONAL,
					parts: [{ owner: BOARD_OWNER, source: board }, { source: samples }],
				}),
				'Lots of items': manyItems,
				'Lots of collections': manyCollections,
				Empty: empty,
			},
		}
		editorSources.set(editor, sources)
	}
	return sources
}

function usePageSource() {
	const editor = useEditor()
	return useValue(
		'page source',
		() => {
			const name = editor.getCurrentPage().name as PageName
			const { byPage } = getEditorSources(editor)
			return byPage[name] ?? byPage.Collections
		},
		[editor]
	)
}

type GeoProps = Partial<TLGeoShape['props']>

// Samples are drawn off-screen, exported, then deleted, so they never flash on the canvas.
const OFF_SCREEN = -100_000

const geo = (x: number, y: number, props: GeoProps): TLShapePartial<TLGeoShape> => ({
	id: createShapeId(),
	type: 'geo',
	x: x + OFF_SCREEN,
	y: y + OFF_SCREEN,
	props,
})

interface Sample {
	name?: string
	shapes: TLShapePartial<TLGeoShape>[]
}

const BOARD_KIT: Sample[] = [
	{
		name: 'Arrow',
		shapes: [geo(0, 0, { geo: 'arrow-right', w: 120, h: 72, fill: 'solid', color: 'green' })],
	},
	{
		name: 'Cloud',
		shapes: [geo(0, 0, { geo: 'cloud', w: 140, h: 96, fill: 'semi', color: 'light-blue' })],
	},
]

const SAMPLES: { collectionId: TLCollectionId; sample: Sample }[] = [
	{
		collectionId: WIREFRAMES,
		sample: {
			name: 'Button',
			shapes: [geo(0, 0, { w: 160, h: 48, richText: toRichText('Button'), fill: 'solid' })],
		},
	},
	{
		collectionId: WIREFRAMES,
		sample: {
			name: 'Card',
			shapes: [
				geo(0, 0, { w: 200, h: 140 }),
				geo(16, 16, { w: 168, h: 60, fill: 'semi', color: 'grey' }),
				geo(16, 92, { w: 120, h: 32, richText: toRichText('Title'), size: 's' }),
			],
		},
	},
	{
		collectionId: WIREFRAMES,
		sample: {
			shapes: [
				geo(0, 0, { geo: 'ellipse', w: 64, h: 64, fill: 'semi', color: 'blue' }),
				geo(80, 12, { w: 140, h: 40, richText: toRichText('Name'), size: 's' }),
			],
		},
	},
	{
		collectionId: ICONS,
		sample: {
			name: 'Star',
			shapes: [geo(0, 0, { geo: 'star', w: 96, h: 96, fill: 'solid', color: 'yellow' })],
		},
	},
	{
		collectionId: ICONS,
		sample: {
			name: 'Heart',
			shapes: [geo(0, 0, { geo: 'heart', w: 96, h: 96, fill: 'solid', color: 'red' })],
		},
	},
]

const SHAPE_KINDS: GeoProps['geo'][] = [
	'rectangle',
	'ellipse',
	'triangle',
	'diamond',
	'pentagon',
	'hexagon',
	'octagon',
	'star',
	'heart',
	'cloud',
]

const SHAPE_COLORS: GeoProps['color'][] = ['black', 'blue', 'green', 'orange', 'red', 'violet']

const shapeSample = (i: number): Sample => ({
	name: `Shape ${i + 1}`,
	shapes: [
		geo(0, 0, {
			geo: SHAPE_KINDS[i % SHAPE_KINDS.length],
			color: SHAPE_COLORS[i % SHAPE_COLORS.length],
			fill: 'semi',
			w: 96,
			h: 96,
		}),
	],
})

async function saveSample(
	editor: Editor,
	source: CollectionSource,
	collectionId: TLCollectionId,
	sample: Sample
) {
	const ids = sample.shapes.map((shape) => shape.id)
	editor.run(() => editor.createShapes(sample.shapes), { history: 'ignore' })
	try {
		await saveShapesToCollection(editor, source, collectionId, ids, sample.name)
	} finally {
		editor.run(() => editor.deleteShapes(ids), { history: 'ignore' })
	}
}

const MANY_ITEMS = 40

// Each page's samples are saved the first time the page shows, so opening one page doesn't wait
// on rendering the others' thumbnails.
const SEEDS: Partial<Record<PageName, (editor: Editor) => Promise<void>>> = {
	Collections: async (editor) => {
		for (const { collectionId, sample } of SAMPLES) {
			await saveSample(editor, samples, collectionId, sample)
		}
	},
	'Lots of items': async (editor) => {
		for (let i = 0; i < MANY_ITEMS; i++) {
			await saveSample(editor, manyItems, SHAPES, shapeSample(i))
		}
	},
	'Lots of collections': async (editor) => {
		const collections = manyCollections.getCollections()
		for (const [i, collection] of collections.entries()) {
			for (let j = 0; j <= i % 3; j++) {
				await saveSample(editor, manyCollections, collection.id, shapeSample(i * 3 + j))
			}
		}
	},
}

const seeded = new Map<PageName, Promise<void>>()

function seedPage(editor: Editor, page: PageName) {
	const seed = SEEDS[page]
	if (!seed || seeded.has(page)) return
	seeded.set(
		page,
		seed(editor).catch((error) => console.error(`[collections] seeding ${page} failed`, error))
	)
}

// The board kit is saved into the document, so it is seeded once per document, not on every load.
async function seedBoardKit(editor: Editor) {
	if (editor.getDocumentSettings().meta.collectionsExampleSeeded) return
	editor.run(() => editor.updateDocumentSettings({ meta: { collectionsExampleSeeded: true } }), {
		history: 'ignore',
	})
	const { board } = getEditorSources(editor)
	const kit = await board.createCollection('Board kit')
	for (const sample of BOARD_KIT) await saveSample(editor, board, kit.id, sample)
}

// One page per source. A fresh, empty first page becomes the first, missing pages are added, and
// each gets shapes to select and save.
function setUpPages(editor: Editor) {
	const pages = () => editor.getPages()
	const first = pages()[0]
	const hasPage = (name: string) => pages().some((page) => page.name === name)
	if (!hasPage(PAGES[0]) && first && editor.getPageShapeIds(first.id).size === 0) {
		editor.renamePage(first.id, PAGES[0])
	}
	for (const name of PAGES) {
		if (!hasPage(name)) editor.createPage({ id: PageRecordType.createId(), name })
		const page = pages().find((p) => p.name === name)
		if (page && editor.getPageShapeIds(page.id).size === 0) {
			editor.createShapes([
				{ type: 'geo', parentId: page.id, x: 400, y: 200, props: { w: 160, h: 100 } },
				{
					type: 'geo',
					parentId: page.id,
					x: 620,
					y: 220,
					props: { geo: 'ellipse', w: 120, h: 80, color: 'blue', fill: 'semi' },
				},
			])
		}
	}
}

function ExamplePanel() {
	const editor = useEditor()
	const source = usePageSource()
	const pageName = useValue('page name', () => editor.getCurrentPage().name as PageName, [editor])
	useEffect(() => seedPage(editor, pageName), [editor, pageName])
	return <CollectionsPanel source={source} catalogue={STARTER_PACKS} />
}

function ExampleSaveMenu() {
	const source = usePageSource()
	return <AddToCollectionMenuItem source={source} />
}

const components: TLComponents = {
	InFrontOfTheCanvas: ExamplePanel,
	ContextMenu: (props) => (
		<DefaultContextMenu {...props}>
			<ExampleSaveMenu />
			<DefaultContextMenuContent />
		</DefaultContextMenu>
	),
	QuickActions: CollectionsQuickActions,
}

const handleMount = (editor: Editor) => {
	editor.run(() => setUpPages(editor), { history: 'ignore' })
	collectionsPanelOpen.set(editor, true)
	seedBoardKit(editor).catch((error) =>
		console.error('[collections] seeding the board failed', error)
	)
}

export default function Collections() {
	return (
		<div className="tldraw__editor">
			<Tldraw
				persistenceKey="collections-examples"
				records={collectionSchemaRecords}
				components={components}
				onMount={handleMount}
			/>
		</div>
	)
}
