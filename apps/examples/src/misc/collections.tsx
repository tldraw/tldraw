import {
	AddToCollectionMenuItem,
	type AddToCollectionOrder,
	CollectionsPanel,
	type CollectionsPanelNavigation,
	CollectionRecordType,
	CollectionsPanelButton,
	collectionsPanelOpen,
	defaultItemOrderings,
	type GroupCollections,
	InMemoryCollectionSource,
	saveShapesToCollection,
	sourceItemOrder,
	type TLCollection,
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

type Scope = 'personal' | 'workspace'

interface ScopeSettings {
	showPersonal: 'shown' | 'hidden'
	layout: 'mixed' | 'grouped'
	newScope: Scope
	workspaceEditors: 'everyone' | 'admins'
	role: 'admin' | 'member'
}

const scopeSettings = atom<ScopeSettings>('collections playground scope', {
	showPersonal: 'shown',
	layout: 'mixed',
	newScope: 'personal',
	workspaceEditors: 'everyone',
	role: 'admin',
})

// Which scope each collection belongs to. A real source would know from where it stores the
// collection, e.g. the workspace (group) it belongs to.
const scopes = atom<Record<string, Scope>>('collections playground scopes', {
	[WIREFRAMES]: 'workspace',
	[ICONS]: 'personal',
})

const scopeOf = (collection: TLCollection): Scope => scopes.get()[collection.id] ?? 'personal'

const WORKSPACE_CHANGES: TLCollectionAction[] = [
	'renameCollection',
	'deleteCollection',
	'addItem',
	'renameItem',
	'deleteItem',
]

// The in-memory source, with each action switchable from the Permissions page, and scopes from the
// Scope page: personal collections can be hidden, new ones go to the chosen scope, and a member
// may be kept from changing workspace collections.
class PlaygroundSource extends InMemoryCollectionSource {
	override getCollections() {
		const all = super.getCollections()
		if (scopeSettings.get().showPersonal === 'shown') return all
		return all.filter((collection) => scopeOf(collection) !== 'personal')
	}

	override async createCollection(name: string) {
		const collection = await super.createCollection(name)
		scopes.update((prev) => ({ ...prev, [collection.id]: scopeSettings.get().newScope }))
		return collection
	}

	override can(action: TLCollectionAction, collectionId?: TLCollectionId) {
		if (!permissions.get()[action] || !super.can(action, collectionId)) return false
		const { workspaceEditors, role } = scopeSettings.get()
		const isWorkspace = collectionId !== undefined && scopes.get()[collectionId] === 'workspace'
		if (isWorkspace && workspaceEditors === 'admins' && role === 'member') {
			return !WORKSPACE_CHANGES.includes(action)
		}
		return true
	}
}

const groupByScope: GroupCollections = (collection) =>
	scopeOf(collection) === 'workspace' ? 'Acme workspace' : 'Personal'

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
	tileStyle: 'well' | 'card' | 'plain'
	tileColumns: '2' | '3' | '4'
	tileLabel: 'below' | 'hover' | 'hidden'
	tileFit: 'contain' | 'cover'
	panelSide: 'left' | 'right'
	panelWidth: '200' | '240' | '320'
	smallScreen: 'panel' | 'sheet'
	viewport: 'desktop' | 'phone'
	savingNaming: 'none' | 'auto' | 'dialog' | 'inline'
	savingConfirmation: 'toast' | 'panel' | 'highlight'
	savingUndo: 'none' | 'toast'
	placeAt: 'center' | 'pointer'
	placeRepeat: 'stack' | 'cascade'
	placeIntoFrame: 'yes' | 'no'
	firstUse: 'message' | 'hint' | 'create'
	readOnlyAdd: 'disable' | 'hide'
	readOnlyMarker: 'none' | 'lock'
	search: 'none' | 'collection' | 'everywhere'
	data: keyof typeof SOURCES
}

const settings = atom<PlaygroundSettings>('collections playground', {
	navigation: 'picker',
	order: 'source',
	sorting: 'built-in',
	tileStyle: 'well',
	tileColumns: '2',
	tileLabel: 'below',
	tileFit: 'contain',
	panelSide: 'left',
	panelWidth: '240',
	smallScreen: 'panel',
	viewport: 'desktop',
	savingNaming: 'none',
	savingConfirmation: 'toast',
	savingUndo: 'none',
	placeAt: 'center',
	placeRepeat: 'stack',
	placeIntoFrame: 'no',
	firstUse: 'message',
	readOnlyAdd: 'disable',
	readOnlyMarker: 'none',
	search: 'none',
	data: 'samples',
})

type AllSettings = PlaygroundSettings & ScopeSettings

type Choice = {
	[K in keyof AllSettings]: {
		key: K
		label: string
		options: { value: AllSettings[K]; label: string }[]
	}
}[keyof AllSettings]

const SCOPE_KEYS: (keyof ScopeSettings)[] = [
	'showPersonal',
	'layout',
	'newScope',
	'workspaceEditors',
	'role',
]

const isScopeKey = (key: keyof AllSettings): key is keyof ScopeSettings =>
	(SCOPE_KEYS as string[]).includes(key)

interface Surface {
	page: string
	hint: string
	choices?: Choice[]
	toggles?: { action: TLCollectionAction; label: string }[]
	/** Whether the page gets shapes to select and save. */
	shapes?: boolean
	/** Whether the page gets a frame to place into. */
	frame?: boolean
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
					{ value: 'previews', label: 'Rows with previews' },
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
		page: 'Placing',
		hint: 'Click an item in the panel to place it. Select the frame first to try placing into it.',
		frame: true,
		choices: [
			{
				key: 'placeAt',
				label: 'A click places it',
				options: [
					{ value: 'center', label: 'At the centre of the view' },
					{ value: 'pointer', label: 'Where the pointer last was' },
				],
			},
			{
				key: 'placeRepeat',
				label: 'Repeated clicks',
				options: [
					{ value: 'stack', label: 'Stack on the same spot' },
					{ value: 'cascade', label: 'Cascade' },
				],
			},
			{
				key: 'placeIntoFrame',
				label: 'With a frame selected',
				options: [
					{ value: 'no', label: 'Place as usual' },
					{ value: 'yes', label: 'Place inside it' },
				],
			},
		],
	},
	{
		page: 'Search',
		hint: "Type part of an item's name. Unnamed items never match.",
		choices: [
			{
				key: 'search',
				label: 'Search',
				options: [
					{ value: 'none', label: 'None' },
					{ value: 'collection', label: 'Within the collection showing' },
					{ value: 'everywhere', label: 'Across all collections' },
				],
			},
		],
	},
	{
		page: 'Saving',
		hint: "What happens when you save. ⌘Z can't undo a save: items live in the source, outside the document's history.",
		shapes: true,
		choices: [
			{
				key: 'savingNaming',
				label: 'Name',
				options: [
					{ value: 'none', label: 'Unnamed' },
					{ value: 'auto', label: 'Automatic ("Drawing 2")' },
					{ value: 'dialog', label: 'Ask in a dialog' },
					{ value: 'inline', label: 'Edit on the new tile' },
				],
			},
			{
				key: 'savingConfirmation',
				label: 'Confirmation',
				options: [
					{ value: 'toast', label: 'Toast when the panel is closed' },
					{ value: 'panel', label: 'Open the panel' },
					{ value: 'highlight', label: 'Open, scroll to and flash the item' },
				],
			},
			{
				key: 'savingUndo',
				label: 'Undo',
				options: [
					{ value: 'none', label: 'None' },
					{ value: 'toast', label: 'Undo in the toast' },
				],
			},
		],
	},
	{
		page: 'Panel layout',
		hint: 'Where the panel sits and how wide it is; on a phone, a panel or a sheet.',
		shapes: true,
		choices: [
			{
				key: 'panelSide',
				label: 'Side',
				options: [
					{ value: 'left', label: 'Left' },
					{ value: 'right', label: 'Right' },
				],
			},
			{
				key: 'panelWidth',
				label: 'Width',
				options: [
					{ value: '200', label: '200 px' },
					{ value: '240', label: '240 px' },
					{ value: '320', label: '320 px' },
				],
			},
			{
				key: 'smallScreen',
				label: 'On a phone',
				options: [
					{ value: 'panel', label: 'Panel' },
					{ value: 'sheet', label: 'Sheet that closes after placing' },
				],
			},
			{
				key: 'viewport',
				label: 'Viewport',
				options: [
					{ value: 'desktop', label: 'Desktop' },
					{ value: 'phone', label: 'Phone (390 px)' },
				],
			},
		],
	},
	{
		page: 'Tiles',
		hint: 'How an item is drawn in the panel. Hover a tile to see its hover states.',
		choices: [
			{
				key: 'tileStyle',
				label: 'Style',
				options: [
					{ value: 'well', label: 'Grey well' },
					{ value: 'card', label: 'Card' },
					{ value: 'plain', label: 'Plain' },
				],
			},
			{
				key: 'tileColumns',
				label: 'Columns',
				options: [
					{ value: '2', label: '2' },
					{ value: '3', label: '3' },
					{ value: '4', label: '4' },
				],
			},
			{
				key: 'tileLabel',
				label: 'Name',
				options: [
					{ value: 'below', label: 'Below' },
					{ value: 'hover', label: 'On hover' },
					{ value: 'hidden', label: 'Hidden' },
				],
			},
			{
				key: 'tileFit',
				label: 'Fit',
				options: [
					{ value: 'contain', label: 'Contain' },
					{ value: 'cover', label: 'Fill and crop' },
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
		choices: [
			{
				key: 'readOnlyAdd',
				label: 'Without Add items, the "+"',
				options: [
					{ value: 'disable', label: 'Is disabled' },
					{ value: 'hide', label: 'Is hidden' },
				],
			},
			{
				key: 'readOnlyMarker',
				label: 'Marker',
				options: [
					{ value: 'none', label: 'None' },
					{ value: 'lock', label: 'Lock beside the name' },
				],
			},
		],
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
		page: 'Scope',
		hint: 'Personal and workspace collections, as seen in a team file.',
		shapes: true,
		choices: [
			{
				key: 'showPersonal',
				label: 'Personal collections here',
				options: [
					{ value: 'shown', label: 'Shown' },
					{ value: 'hidden', label: 'Hidden' },
				],
			},
			{
				key: 'layout',
				label: 'Layout',
				options: [
					{ value: 'grouped', label: 'Grouped by scope' },
					{ value: 'mixed', label: 'Mixed' },
				],
			},
			{
				key: 'newScope',
				label: 'New collections go to',
				options: [
					{ value: 'personal', label: 'Personal' },
					{ value: 'workspace', label: 'The workspace' },
				],
			},
			{
				key: 'workspaceEditors',
				label: 'Who can change workspace collections',
				options: [
					{ value: 'everyone', label: 'Every member' },
					{ value: 'admins', label: 'Admins only' },
				],
			},
			{
				key: 'role',
				label: 'You are',
				options: [
					{ value: 'admin', label: 'An admin' },
					{ value: 'member', label: 'A member' },
				],
			},
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
			{
				key: 'firstUse',
				label: 'With no collections',
				options: [
					{ value: 'message', label: 'Say so' },
					{ value: 'hint', label: 'Say how to start one' },
					{ value: 'create', label: 'Offer a New collection button' },
				],
			},
		],
	},
]

const rowStyle = { display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' } as const

function PlaygroundControls({ editor }: { editor: Editor }) {
	const pageName = useValue('page name', () => editor.getCurrentPage().name, [editor])
	const current = useValue(
		'playground settings',
		(): AllSettings => ({ ...settings.get(), ...scopeSettings.get() }),
		[]
	)
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
									isScopeKey(choice.key)
										? scopeSettings.update((prev) => ({ ...prev, [choice.key]: option.value }))
										: settings.update((prev) => ({ ...prev, [choice.key]: option.value }))
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
	const grouped = useValue('grouped', () => scopeSettings.get().layout === 'grouped', [])
	const {
		panelSide: side,
		panelWidth,
		smallScreen,
	} = useValue(
		'panel layout',
		() => {
			const { panelSide, panelWidth, smallScreen } = settings.get()
			return { panelSide, panelWidth, smallScreen }
		},
		[]
	)
	const saving = useValue(
		'saving',
		() => {
			const { savingNaming, savingConfirmation, savingUndo } = settings.get()
			return { naming: savingNaming, confirmation: savingConfirmation, undo: savingUndo }
		},
		[]
	)
	const placement = useValue(
		'placement',
		() => {
			const { placeAt, placeRepeat, placeIntoFrame } = settings.get()
			return { at: placeAt, repeat: placeRepeat, intoFrame: placeIntoFrame === 'yes' }
		},
		[]
	)
	const firstUse = useValue('first use', () => settings.get().firstUse, [])
	const search = useValue('search', () => settings.get().search, [])
	const readOnly = useValue(
		'read only',
		() => {
			const { readOnlyAdd, readOnlyMarker } = settings.get()
			return { addButton: readOnlyAdd, marker: readOnlyMarker }
		},
		[]
	)
	const tileAppearance = useValue(
		'tile appearance',
		() => {
			const { tileStyle, tileColumns, tileLabel, tileFit } = settings.get()
			return {
				style: tileStyle,
				columns: Number(tileColumns) as 2 | 3 | 4,
				label: tileLabel,
				fit: tileFit,
			}
		},
		[]
	)
	return (
		<CollectionsPanel
			source={source}
			navigation={navigation}
			itemOrderings={sorting === 'built-in' ? defaultItemOrderings : [sourceItemOrder]}
			groupCollections={grouped ? groupByScope : undefined}
			tileAppearance={tileAppearance}
			side={side}
			width={Number(panelWidth)}
			smallScreen={smallScreen}
			saving={saving}
			placement={placement}
			firstUse={firstUse}
			readOnly={readOnly}
			search={search}
		/>
	)
}

function PlaygroundSaveMenu() {
	const source = usePlaygroundSource()
	const order = useValue('order', () => settings.get().order, [])
	const saving = useValue(
		'saving',
		() => {
			const { savingNaming, savingConfirmation, savingUndo } = settings.get()
			return { naming: savingNaming, confirmation: savingConfirmation, undo: savingUndo }
		},
		[]
	)
	const grouped = useValue('grouped', () => scopeSettings.get().layout === 'grouped', [])
	return (
		<AddToCollectionMenuItem
			source={source}
			order={order}
			groupCollections={grouped ? groupByScope : undefined}
			saving={saving}
		/>
	)
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
		if (surface.frame && page && editor.getPageShapeIds(page.id).size === 0) {
			editor.createShapes([
				{
					type: 'frame',
					parentId: page.id,
					x: 520,
					y: 140,
					props: { w: 420, h: 300, name: 'Drop zone' },
				},
			])
		}
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
	// In the phone viewport the controls sit beside the frame instead, clear of the panel.
	TopPanel: function PlaygroundTopPanel() {
		const editor = useEditor()
		const viewport = useValue('viewport', () => settings.get().viewport, [])
		return viewport === 'desktop' ? <PlaygroundControls editor={editor} /> : null
	},
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

const mountedEditor = atom<Editor | null>('collections playground editor', null)

const handleMount = (editor: Editor) => {
	mountedEditor.set(editor)
	editor.run(() => setUpSurfaces(editor), { history: 'ignore' })
	collectionsPanelOpen.set(editor, true)
	seeding ??= seedSamples(editor)
}

// The Panel layout page can shrink the editor to a phone's width, so tldraw's breakpoints treat
// it as a phone.
export default function Collections() {
	const viewport = useValue('viewport', () => settings.get().viewport, [])
	const mounted = useValue('mounted editor', () => mountedEditor.get(), [])
	const editor = (
		<Tldraw persistenceKey="collections" components={components} onMount={handleMount} />
	)
	if (viewport === 'desktop') return <div className="tldraw__editor">{editor}</div>
	return (
		<div
			className="tldraw__editor"
			style={{ display: 'flex', justifyContent: 'center', gap: 16, background: '#ddd' }}
		>
			{mounted && (
				<div style={{ alignSelf: 'flex-start', paddingTop: 8 }}>
					<PlaygroundControls editor={mounted} />
				</div>
			)}
			<div
				style={{
					position: 'relative',
					width: 390,
					height: '100%',
					maxHeight: 844,
					alignSelf: 'center',
				}}
			>
				{editor}
			</div>
		</div>
	)
}
