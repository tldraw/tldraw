import {
	AddToCollectionMenuItem,
	type AddToCollectionOrder,
	CollectionsPanel,
	type CollectionsPanelNavigation,
	CollectionRecordType,
	CollectionsPanelButton,
	collectionsPanelOpen,
	InMemoryCollectionSource,
	saveShapesToCollection,
	type TLCollectionId,
} from '@tldraw/collections'
import {
	atom,
	createShapeId,
	DefaultContextMenu,
	DefaultContextMenuContent,
	DefaultMenuPanel,
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

const SAMPLES: {
	collectionId: TLCollectionId
	name?: string
	shapes: TLShapePartial<TLGeoShape>[]
}[] = [
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

async function seedSamples(editor: Editor) {
	for (const sample of SAMPLES) {
		const ids = sample.shapes.map((shape) => shape.id)
		editor.run(() => editor.createShapes(sample.shapes), { history: 'ignore' })
		try {
			await saveShapesToCollection(editor, source, sample.collectionId, ids, sample.name)
		} finally {
			editor.run(() => editor.deleteShapes(ids), { history: 'ignore' })
		}
	}
}

let seeding: Promise<void> | undefined

// A UI playground: each design surface is a page, and the controls at the top offer that surface's
// choices. Choices stay in effect on every page.
interface PlaygroundSettings {
	navigation: CollectionsPanelNavigation
	order: AddToCollectionOrder
}

const settings = atom<PlaygroundSettings>('collections playground', {
	navigation: 'picker',
	order: 'source',
})

type Choice = {
	[K in keyof PlaygroundSettings]: {
		key: K
		label: string
		options: { value: PlaygroundSettings[K]; label: string }[]
	}
}[keyof PlaygroundSettings]

const SURFACES: { page: string; hint: string; choices: Choice[] }[] = [
	{
		page: 'Panel',
		hint: 'Open the panel with the button beside the main menu.',
		choices: [
			{
				key: 'navigation',
				label: 'Moving between collections',
				options: [
					{ value: 'picker', label: 'Picker' },
					{ value: 'list', label: 'List with counts' },
				],
			},
		],
	},
	{
		page: 'Save menu',
		hint: 'Select shapes, right-click, then Add to collection.',
		choices: [
			{
				key: 'order',
				label: 'Collection order',
				options: [
					{ value: 'source', label: "The source's order" },
					{ value: 'recent', label: 'Recently saved to first' },
				],
			},
		],
	},
]

function PlaygroundControls() {
	const editor = useEditor()
	const pageName = useValue('page name', () => editor.getCurrentPage().name, [editor])
	const current = useValue('playground settings', () => settings.get(), [])
	const surface = SURFACES.find((s) => s.page === pageName)
	if (!surface) return null

	return (
		<div
			style={{
				pointerEvents: 'all',
				margin: 8,
				padding: '8px 12px',
				borderRadius: 'var(--tl-radius-3)',
				background: 'var(--tl-color-panel)',
				boxShadow: 'var(--tl-shadow-2)',
				fontSize: 12,
				display: 'flex',
				flexDirection: 'column',
				gap: 6,
			}}
		>
			<div>
				<strong>{surface.page}</strong> · {surface.hint}
			</div>
			{surface.choices.map((choice) => (
				<div key={choice.key} style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
					<span style={{ color: 'var(--tl-color-text-3)' }}>{choice.label}</span>
					{choice.options.map((option) => (
						<label key={option.value} style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
							<input
								type="radio"
								name={choice.key}
								checked={current[choice.key] === option.value}
								onChange={() =>
									settings.update((prev) => ({ ...prev, [choice.key]: option.value }))
								}
							/>
							{option.label}
						</label>
					))}
				</div>
			))}
		</div>
	)
}

function PlaygroundPanel() {
	const navigation = useValue('navigation', () => settings.get().navigation, [])
	return <CollectionsPanel source={source} navigation={navigation} />
}

function PlaygroundSaveMenu() {
	const order = useValue('order', () => settings.get().order, [])
	return <AddToCollectionMenuItem source={source} order={order} />
}

// One page per surface. A fresh, empty first page becomes the first surface; missing pages are
// added, and the save menu's page gets shapes to select.
function setUpSurfaces(editor: Editor) {
	const pages = () => editor.getPages()
	const first = pages()[0]
	const hasSurface = (name: string) => pages().some((page) => page.name === name)
	if (!hasSurface(SURFACES[0].page) && first && editor.getPageShapeIds(first.id).size === 0) {
		editor.renamePage(first.id, SURFACES[0].page)
	}
	for (const surface of SURFACES) {
		if (!hasSurface(surface.page)) {
			editor.createPage({ id: PageRecordType.createId(), name: surface.page })
		}
	}
	const saveMenuPage = pages().find((page) => page.name === 'Save menu')
	if (saveMenuPage && editor.getPageShapeIds(saveMenuPage.id).size === 0) {
		editor.createShapes([
			{ type: 'geo', parentId: saveMenuPage.id, x: 200, y: 200, props: { w: 160, h: 100 } },
			{
				type: 'geo',
				parentId: saveMenuPage.id,
				x: 420,
				y: 220,
				props: { geo: 'ellipse', w: 120, h: 80, color: 'blue', fill: 'semi' },
			},
		])
	}
}

const components: TLComponents = {
	InFrontOfTheCanvas: PlaygroundPanel,
	TopPanel: PlaygroundControls,
	ContextMenu: (props) => (
		<DefaultContextMenu {...props}>
			<PlaygroundSaveMenu />
			<DefaultContextMenuContent />
		</DefaultContextMenu>
	),
	MenuPanel: () => (
		<div style={{ display: 'flex', alignItems: 'flex-start' }}>
			<DefaultMenuPanel />
			<div style={{ paddingTop: 2, paddingLeft: 4, pointerEvents: 'all' }}>
				<CollectionsPanelButton />
			</div>
		</div>
	),
}

const handleMount = (editor: Editor) => {
	editor.run(() => setUpSurfaces(editor), { history: 'ignore' })
	collectionsPanelOpen.set(editor, true)
	seeding ??= seedSamples(editor)
}

export default function Collections() {
	return (
		<div className="tldraw__editor">
			<Tldraw persistenceKey="collections" components={components} onMount={handleMount} />
		</div>
	)
}
