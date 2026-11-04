import {
	AddToCollectionMenuItem,
	type AddToCollectionOrder,
	CollectionsPanel,
	type CollectionsPanelNavigation,
	CollectionRecordType,
	CollectionsPanelButton,
	collectionsPanelOpen,
	defaultItemOrderings,
	InMemoryCollectionSource,
	saveShapesToCollection,
	sourceItemOrder,
	type TLCollectionAction,
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

type Permissions = Record<TLCollectionAction, boolean>

const permissions = atom<Permissions>('collections playground permissions', {
	createCollection: true,
	renameCollection: true,
	deleteCollection: true,
	addItem: true,
	renameItem: true,
	deleteItem: true,
})

// The in-memory source, with each action switchable from the Permissions page.
class PlaygroundSource extends InMemoryCollectionSource {
	override can(action: TLCollectionAction, collectionId?: TLCollectionId) {
		return permissions.get()[action] && super.can(action, collectionId)
	}
}

const samples = new PlaygroundSource({
	initial: {
		collections: [
			CollectionRecordType.create({ id: WIREFRAMES, name: 'Wireframes' }),
			CollectionRecordType.create({ id: ICONS, name: 'Icons' }),
		],
		items: [],
		contents: {},
	},
})

const SOURCES = {
	samples,
	empty: new PlaygroundSource({ id: 'playground-empty' }),
	'one-empty': new PlaygroundSource({
		id: 'playground-one-empty',
		initial: {
			collections: [CollectionRecordType.create({ name: 'Untitled' })],
			items: [],
			contents: {},
		},
	}),
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
			await saveShapesToCollection(editor, samples, sample.collectionId, ids, sample.name)
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
	sorting: 'built-in' | 'source-only'
	data: keyof typeof SOURCES
}

const settings = atom<PlaygroundSettings>('collections playground', {
	navigation: 'picker',
	order: 'source',
	sorting: 'built-in',
	data: 'samples',
})

type Choice = {
	[K in keyof PlaygroundSettings]: {
		key: K
		label: string
		options: { value: PlaygroundSettings[K]; label: string }[]
	}
}[keyof PlaygroundSettings]

interface Surface {
	page: string
	hint: string
	choices?: Choice[]
	toggles?: { action: TLCollectionAction; label: string }[]
	/** Whether the page gets shapes to select and save. */
	shapes?: boolean
}

const SURFACES: Surface[] = [
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
					{ value: 'sections', label: 'Sections' },
				],
			},
		],
	},
	{
		page: 'Save menu',
		hint: 'Select shapes, right-click, then Add to collection.',
		shapes: true,
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
	{
		page: 'Sorting',
		hint: "Sort a collection's items from the panel's ⋯ menu.",
		choices: [
			{
				key: 'sorting',
				label: 'Orderings offered',
				options: [
					{ value: 'built-in', label: 'Default, Newest, Name' },
					{ value: 'source-only', label: "The source's order only" },
				],
			},
		],
	},
	{
		page: 'Permissions',
		hint: 'Turn actions off and see what the panel, its menus and the save menu offer.',
		shapes: true,
		toggles: [
			{ action: 'createCollection', label: 'Create collections' },
			{ action: 'renameCollection', label: 'Rename collections' },
			{ action: 'deleteCollection', label: 'Delete collections' },
			{ action: 'addItem', label: 'Add items' },
			{ action: 'renameItem', label: 'Rename items' },
			{ action: 'deleteItem', label: 'Delete items' },
		],
	},
	{
		page: 'Empty states',
		hint: 'Swap in a source with nothing in it, then save something.',
		shapes: true,
		choices: [
			{
				key: 'data',
				label: 'Source',
				options: [
					{ value: 'samples', label: 'Samples' },
					{ value: 'empty', label: 'No collections' },
					{ value: 'one-empty', label: 'One empty collection' },
				],
			},
		],
	},
]

const rowStyle = { display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' } as const

function PlaygroundControls() {
	const editor = useEditor()
	const pageName = useValue('page name', () => editor.getCurrentPage().name, [editor])
	const current = useValue('playground settings', () => settings.get(), [])
	const allowed = useValue('playground permissions', () => permissions.get(), [])
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
				maxWidth: 560,
			}}
		>
			<div>
				<strong>{surface.page}</strong> · {surface.hint}
			</div>
			{surface.choices?.map((choice) => (
				<div key={choice.key} style={rowStyle}>
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
			{surface.toggles && (
				<div style={rowStyle}>
					{surface.toggles.map((toggle) => (
						<label key={toggle.action} style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
							<input
								type="checkbox"
								checked={allowed[toggle.action]}
								onChange={(e) => {
									const checked = e.currentTarget.checked
									permissions.update((prev) => ({ ...prev, [toggle.action]: checked }))
								}}
							/>
							{toggle.label}
						</label>
					))}
				</div>
			)}
		</div>
	)
}

function usePlaygroundSource() {
	return useValue('playground source', () => SOURCES[settings.get().data], [])
}

function PlaygroundPanel() {
	const source = usePlaygroundSource()
	const navigation = useValue('navigation', () => settings.get().navigation, [])
	const sorting = useValue('sorting', () => settings.get().sorting, [])
	return (
		<CollectionsPanel
			source={source}
			navigation={navigation}
			itemOrderings={sorting === 'built-in' ? defaultItemOrderings : [sourceItemOrder]}
		/>
	)
}

function PlaygroundSaveMenu() {
	const source = usePlaygroundSource()
	const order = useValue('order', () => settings.get().order, [])
	return <AddToCollectionMenuItem source={source} order={order} />
}

// One page per surface. A fresh, empty first page becomes the first surface, missing pages are
// added, and pages for saving get shapes to select.
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
		const page = pages().find((p) => p.name === surface.page)
		if (surface.shapes && page && editor.getPageShapeIds(page.id).size === 0) {
			editor.createShapes([
				{ type: 'geo', parentId: page.id, x: 200, y: 200, props: { w: 160, h: 100 } },
				{
					type: 'geo',
					parentId: page.id,
					x: 420,
					y: 220,
					props: { geo: 'ellipse', w: 120, h: 80, color: 'blue', fill: 'semi' },
				},
			])
		}
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
