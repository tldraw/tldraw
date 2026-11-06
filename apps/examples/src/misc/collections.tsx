import {
	AddToCollectionMenuItem,
	CollectionsPanel,
	CollectionRecordType,
	CollectionsQuickActions,
	collectionsPanelOpen,
	InMemoryCollectionSource,
	saveShapesToCollection,
	type TLCollectionId,
} from '@tldraw/collections'
import {
	createShapeId,
	DefaultContextMenu,
	DefaultContextMenuContent,
	Editor,
	PageRecordType,
	react,
	TLComponents,
	TLDefaultColorStyle,
	Tldraw,
	TLGeoShape,
	TLGeoShapeGeoStyle,
	TLPageId,
	TLShapePartial,
	toRichText,
	useEditor,
	useValue,
} from 'tldraw'
import '@tldraw/collections/collections.css'
import 'tldraw/tldraw.css'

// Unlisted, like /develop: @tldraw/collections is unreleased, so this page is for building its UI
// against an in-memory source without the tldraw.com stack.
const WIREFRAMES = CollectionRecordType.createId('wireframes')
const ICONS = CollectionRecordType.createId('icons')

const source = new InMemoryCollectionSource({
	initial: {
		collections: [
			CollectionRecordType.create({ id: WIREFRAMES, name: 'Wireframes' }),
			CollectionRecordType.create({ id: ICONS, name: 'Icons' }),
		],
		items: [],
		contents: {},
	},
})

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
	collectionId: TLCollectionId
	name?: string
	shapes: TLShapePartial<TLGeoShape>[]
}

const SAMPLES: Sample[] = [
	{
		collectionId: WIREFRAMES,
		name: 'Button',
		shapes: [geo(0, 0, { w: 160, h: 48, richText: toRichText('Button'), fill: 'solid' })],
	},
	{
		collectionId: WIREFRAMES,
		name: 'Card',
		shapes: [
			geo(0, 0, { w: 200, h: 140 }),
			geo(16, 16, { w: 168, h: 60, fill: 'semi', color: 'grey' }),
			geo(16, 92, { w: 120, h: 32, richText: toRichText('Title'), size: 's' }),
		],
	},
	{
		collectionId: WIREFRAMES,
		shapes: [
			geo(0, 0, { geo: 'ellipse', w: 64, h: 64, fill: 'semi', color: 'blue' }),
			geo(80, 12, { w: 140, h: 40, richText: toRichText('Name'), size: 's' }),
		],
	},
	{
		collectionId: WIREFRAMES,
		name: 'Input',
		shapes: [
			geo(0, 0, { w: 200, h: 40 }),
			geo(12, 8, { w: 120, h: 24, richText: toRichText('Email'), size: 's', color: 'grey' }),
		],
	},
	{
		collectionId: WIREFRAMES,
		name: 'Toggle',
		shapes: [
			geo(0, 0, { w: 72, h: 36, fill: 'solid', color: 'green' }),
			geo(40, 4, { geo: 'ellipse', w: 28, h: 28, fill: 'solid', color: 'white' }),
		],
	},
	{
		collectionId: ICONS,
		name: 'Star',
		shapes: [geo(0, 0, { geo: 'star', w: 96, h: 96, fill: 'solid', color: 'yellow' })],
	},
	{
		collectionId: ICONS,
		name: 'Heart',
		shapes: [geo(0, 0, { geo: 'heart', w: 96, h: 96, fill: 'solid', color: 'red' })],
	},
]

const GEOS: TLGeoShapeGeoStyle[] = [
	'rectangle',
	'ellipse',
	'triangle',
	'diamond',
	'pentagon',
	'hexagon',
	'star',
	'heart',
	'cloud',
	'oval',
	'trapezoid',
	'x-box',
]

const COLORS: TLDefaultColorStyle[] = [
	'black',
	'blue',
	'green',
	'orange',
	'red',
	'violet',
	'yellow',
	'light-blue',
]

// One shape per item, varied by its position in the run.
const shapeSample = (collectionId: TLCollectionId, index: number, name?: string): Sample => ({
	collectionId,
	name,
	shapes: [
		geo(0, 0, {
			geo: GEOS[index % GEOS.length],
			w: 96,
			h: 96,
			fill: 'semi',
			color: COLORS[index % COLORS.length],
		}),
	],
})

interface Scenario {
	source: InMemoryCollectionSource
	samples: Sample[]
}

interface PageScenario extends Scenario {
	pageId: TLPageId
	pageName: string
}

const DEFAULT_SCENARIO: Scenario = { source, samples: SAMPLES }

const SHAPES = CollectionRecordType.createId('shapes')
const FAVOURITES = CollectionRecordType.createId('favourites')
const DRAFTS = CollectionRecordType.createId('drafts')

const LOTS_OF_ITEMS: PageScenario = {
	pageId: PageRecordType.createId('lots-of-items'),
	pageName: 'Lots of items',
	source: new InMemoryCollectionSource({
		id: 'examples-lots-of-items',
		initial: {
			collections: [
				CollectionRecordType.create({ id: SHAPES, name: 'Shapes' }),
				CollectionRecordType.create({ id: FAVOURITES, name: 'Favourites' }),
				CollectionRecordType.create({ id: DRAFTS, name: 'Drafts' }),
			],
			items: [],
			contents: {},
		},
	}),
	samples: [
		...Array.from({ length: 40 }, (_, i) => shapeSample(SHAPES, i, `Shape ${i + 1}`)),
		...Array.from({ length: 3 }, (_, i) => shapeSample(FAVOURITES, i + 3)),
		...Array.from({ length: 2 }, (_, i) => shapeSample(DRAFTS, i + 6)),
	],
}

// Some collections are left empty.
const ITEMS_PER_COLLECTION = [3, 0, 2, 4, 1, 0, 3, 2, 0, 5, 1, 2, 0, 3, 2]
const MANY_COLLECTION_IDS = ITEMS_PER_COLLECTION.map((_, i) =>
	CollectionRecordType.createId(`collection-${i + 1}`)
)

const LOTS_OF_COLLECTIONS: PageScenario = {
	pageId: PageRecordType.createId('lots-of-collections'),
	pageName: 'Lots of collections',
	source: new InMemoryCollectionSource({
		id: 'examples-lots-of-collections',
		initial: {
			collections: MANY_COLLECTION_IDS.map((id, i) =>
				CollectionRecordType.create({ id, name: `Collection ${i + 1}` })
			),
			items: [],
			contents: {},
		},
	}),
	samples: ITEMS_PER_COLLECTION.flatMap((count, i) =>
		Array.from({ length: count }, (_, j) => shapeSample(MANY_COLLECTION_IDS[i], i + j))
	),
}

const EMPTY: PageScenario = {
	pageId: PageRecordType.createId('empty'),
	pageName: 'Empty',
	source: new InMemoryCollectionSource({ id: 'examples-empty' }),
	samples: [],
}

// The first page shows the default scenario; each of these gets a page after it.
const PAGE_SCENARIOS = [LOTS_OF_ITEMS, LOTS_OF_COLLECTIONS, EMPTY]

const scenarioFor = (pageId: TLPageId): Scenario =>
	PAGE_SCENARIOS.find((scenario) => scenario.pageId === pageId) ?? DEFAULT_SCENARIO

async function seedSamples(editor: Editor, { source, samples }: Scenario) {
	for (const sample of samples) {
		const ids = sample.shapes.map((shape) => shape.id)
		editor.run(() => editor.createShapes(sample.shapes), { history: 'ignore' })
		try {
			await saveShapesToCollection(editor, source, sample.collectionId, ids, sample.name)
		} finally {
			editor.run(() => editor.deleteShapes(ids), { history: 'ignore' })
		}
	}
}

// Sources outlive the editor, so each is seeded once, the first time its page is shown. Seeding
// runs one scenario at a time.
const seeded = new Set<Scenario>()
let seeding = Promise.resolve()

function seedScenario(editor: Editor, scenario: Scenario) {
	if (seeded.has(scenario)) return
	seeded.add(scenario)
	seeding = seeding
		.then(() => seedSamples(editor, scenario))
		.catch((error) => console.error('[collections example] seeding failed', error))
}

const useScenario = () => {
	const editor = useEditor()
	return useValue('collections scenario', () => scenarioFor(editor.getCurrentPageId()), [editor])
}

function ScenarioPanel() {
	const { source } = useScenario()
	return <CollectionsPanel key={source.id} source={source} />
}

function ScenarioAddToCollectionMenuItem() {
	const { source } = useScenario()
	return <AddToCollectionMenuItem source={source} />
}

const components: TLComponents = {
	InFrontOfTheCanvas: ScenarioPanel,
	ContextMenu: (props) => (
		<DefaultContextMenu {...props}>
			<ScenarioAddToCollectionMenuItem />
			<DefaultContextMenuContent />
		</DefaultContextMenu>
	),
	QuickActions: CollectionsQuickActions,
}

const handleMount = (editor: Editor) => {
	editor.run(
		() => {
			for (const { pageId, pageName } of PAGE_SCENARIOS) {
				if (!editor.getPage(pageId)) editor.createPage({ id: pageId, name: pageName })
			}
		},
		{ history: 'ignore' }
	)
	// Opens the panel on each page change only, so closing it on a page keeps it closed.
	let shownPageId: TLPageId | undefined
	return react('show the page scenario', () => {
		const pageId = editor.getCurrentPageId()
		if (pageId === shownPageId) return
		shownPageId = pageId
		collectionsPanelOpen.set(editor, true)
		seedScenario(editor, scenarioFor(pageId))
	})
}

export default function Collections() {
	return (
		<div className="tldraw__editor">
			<Tldraw persistenceKey="collections" components={components} onMount={handleMount} />
		</div>
	)
}
