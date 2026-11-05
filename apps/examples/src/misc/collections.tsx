import {
	AddToCollectionMenuItem,
	type AddToCollectionOrder,
	BoardCollectionSource,
	CollectionsPanel,
	type CollectionsPanelNavigation,
	CollectionRecordType,
	CollectionsQuickActions,
	collectionSchemaRecords,
	collectionsPanelOpen,
	type CollectionSource,
	CompositeCollectionSource,
	defaultItemOrderings,
	InMemoryCollectionSource,
	type InMemoryCollectionSourceOptions,
	PackCollectionSource,
	saveShapesToCollection,
	sourceItemOrder,
	type TLCollectionAction,
	type TLCollectionId,
} from '@tldraw/collections'
import { useEffect } from 'react'
import {
	atom,
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
// against an in-memory source without the tldraw.com stack.
const WIREFRAMES = CollectionRecordType.createId('wireframes')
const ICONS = CollectionRecordType.createId('icons')
const BOARD_KIT = CollectionRecordType.createId('board-kit')
const SHAPES = CollectionRecordType.createId('shapes')

type Permissions = Record<TLCollectionAction, boolean>

const permissions = atom<Permissions>('collections playground permissions', {
	createCollection: true,
	renameCollection: true,
	deleteCollection: true,
	addItem: true,
	renameItem: true,
	deleteItem: true,
})

type NewCollectionOwner = 'board' | 'personal' | 'workspace'

interface ScopeSettings {
	showPersonal: 'shown' | 'hidden'
	layout: 'mixed' | 'grouped'
	newCollectionOwner: NewCollectionOwner
	workspaceEditors: 'everyone' | 'admins'
	role: 'admin' | 'member'
}

const DEFAULT_SCOPE_SETTINGS: ScopeSettings = {
	showPersonal: 'shown',
	layout: 'grouped',
	newCollectionOwner: 'personal',
	workspaceEditors: 'everyone',
	role: 'admin',
}

const scopeSettings = atom<ScopeSettings>('collections playground scope', DEFAULT_SCOPE_SETTINGS)

// Owners as tldraw.com has them: the open file, the user's home workspace, then a workspace they
// belong to.
const BOARD = 'board'
const PERSONAL = 'home'
const ACME = 'acme'

const BOARD_OWNER = { id: BOARD, name: 'This board' }

// The board's own collections are records in its document, kept by a BoardCollectionSource; these
// are the rest.
const OWNERS = [
	{ id: PERSONAL, name: 'Personal' },
	{ id: ACME, name: 'Acme workspace' },
]

const OWNER_IDS: Record<NewCollectionOwner, string> = {
	board: BOARD,
	personal: PERSONAL,
	workspace: ACME,
}

const WORKSPACE_CHANGES: TLCollectionAction[] = [
	'renameCollection',
	'deleteCollection',
	'addItem',
	'renameItem',
	'deleteItem',
]

// The in-memory source, with each action switchable from the Permissions page, and scopes from the
// Scope page: personal collections can be hidden, new ones go to the chosen owner, and a member
// may be kept from changing workspace collections.
class PlaygroundSource extends InMemoryCollectionSource {
	constructor(options: InMemoryCollectionSourceOptions = {}) {
		super({ ...options, owners: OWNERS })
	}

	override getCollections() {
		const showsShapes = settings.get().manyItems === 'shown'
		const all = super
			.getCollections()
			.filter((collection) => showsShapes || collection.id !== SHAPES)
		if (scopeSettings.get().showPersonal === 'shown') return all
		return all.filter((collection) => collection.ownerId !== PERSONAL)
	}

	override getDefaultOwnerId() {
		const ownerId = OWNER_IDS[scopeSettings.get().newCollectionOwner]
		return OWNERS.some((owner) => owner.id === ownerId) ? ownerId : PERSONAL
	}

	override can(action: TLCollectionAction, collectionId?: TLCollectionId) {
		if (!permissions.get()[action] || !super.can(action, collectionId)) return false
		const { workspaceEditors, role } = scopeSettings.get()
		const isWorkspace =
			collectionId !== undefined &&
			super.getCollections().find((c) => c.id === collectionId)?.ownerId === ACME
		if (isWorkspace && workspaceEditors === 'admins' && role === 'member') {
			return !WORKSPACE_CHANGES.includes(action)
		}
		return true
	}
}

// The board's collections, switchable from the Permissions page like the rest.
class PlaygroundBoardSource extends BoardCollectionSource {
	override can(action: TLCollectionAction, collectionId?: TLCollectionId) {
		return permissions.get()[action] && super.can(action, collectionId)
	}
}

// New collections go to the owner chosen on the Scope page, when this source has it.
class PlaygroundCompositeSource extends CompositeCollectionSource {
	override getDefaultOwnerId() {
		const ownerId = OWNER_IDS[scopeSettings.get().newCollectionOwner]
		const owner = this.getCollectionOwners().find((o) => o.id === ownerId)
		return owner && !owner.readOnly ? ownerId : super.getDefaultOwnerId()
	}
}

const samples = new PlaygroundSource({
	initial: {
		collections: [
			CollectionRecordType.create({ id: WIREFRAMES, name: 'Wireframes', ownerId: ACME }),
			CollectionRecordType.create({ id: ICONS, name: 'Icons', ownerId: PERSONAL }),
			CollectionRecordType.create({ id: SHAPES, name: 'Shapes', ownerId: PERSONAL }),
		],
		items: [],
		contents: {},
	},
})

// Packs shipped with the app, listed under their own owner once added from "Browse collections…".
const starterPacks = new PackCollectionSource({ id: 'playground-packs', packs: STARTER_PACKS })

const PACKS_PART = { owner: { id: 'tldraw', name: 'tldraw' }, source: starterPacks }

const empty = new PlaygroundSource({ id: 'playground-empty-own' })
const oneEmpty = new PlaygroundSource({
	id: 'playground-one-empty-own',
	initial: {
		collections: [CollectionRecordType.create({ name: 'Untitled', ownerId: PERSONAL })],
		items: [],
		contents: {},
	},
})

type SourceName = 'samples' | 'empty' | 'one-empty'

// The same source without moveCollection, for the playground's toggle: the panel then offers no
// "Move to". It shares the source's collections, so turning moving back on loses nothing.
const withoutMoving = (source: CollectionSource): CollectionSource =>
	Object.assign(Object.create(source), { moveCollection: undefined })

interface EditorSources {
	board: BoardCollectionSource
	movable: Record<SourceName, CollectionSource>
	fixed: Record<SourceName, CollectionSource>
}

// The board's collections come from the editor's document, so the sources are made per editor.
// The empty sources leave the board out, so the Empty states page shows what a first visit does.
const editorSources = new WeakMap<Editor, EditorSources>()

function getEditorSources(editor: Editor): EditorSources {
	let sources = editorSources.get(editor)
	if (!sources) {
		const board = new PlaygroundBoardSource(editor, { id: 'playground-board' })
		const movable: Record<SourceName, CollectionSource> = {
			samples: new PlaygroundCompositeSource({
				id: 'playground-with-packs',
				parts: [{ owner: BOARD_OWNER, source: board }, { source: samples }, PACKS_PART],
			}),
			empty: new PlaygroundCompositeSource({
				id: 'playground-empty',
				parts: [{ source: empty }, PACKS_PART],
			}),
			'one-empty': new PlaygroundCompositeSource({
				id: 'playground-one-empty',
				parts: [{ source: oneEmpty }, PACKS_PART],
			}),
		}
		sources = {
			board,
			movable,
			fixed: {
				samples: withoutMoving(movable.samples),
				empty: withoutMoving(movable.empty),
				'one-empty': withoutMoving(movable['one-empty']),
			},
		}
		editorSources.set(editor, sources)
	}
	return sources
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
		collectionId: BOARD_KIT,
		name: 'Arrow',
		shapes: [geo(0, 0, { geo: 'arrow-right', w: 120, h: 72, fill: 'solid', color: 'green' })],
	},
	{
		collectionId: BOARD_KIT,
		name: 'Cloud',
		shapes: [geo(0, 0, { geo: 'cloud', w: 140, h: 96, fill: 'semi', color: 'light-blue' })],
	},
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

async function saveSample(
	editor: Editor,
	source: CollectionSource,
	collectionId: TLCollectionId,
	sample: (typeof SAMPLES)[number]
) {
	const ids = sample.shapes.map((shape) => shape.id)
	editor.run(() => editor.createShapes(sample.shapes), { history: 'ignore' })
	try {
		await saveShapesToCollection(editor, source, collectionId, ids, sample.name)
	} finally {
		editor.run(() => editor.deleteShapes(ids), { history: 'ignore' })
	}
}

async function seedSamples(editor: Editor) {
	for (const sample of SAMPLES) {
		if (sample.collectionId === BOARD_KIT) continue
		await saveSample(editor, samples, sample.collectionId, sample)
	}
}

// The board kit is saved into the document, so it is seeded once per document, not on every load.
async function seedBoardKit(editor: Editor) {
	if (editor.getDocumentSettings().meta.collectionsPlaygroundSeeded) return
	editor.run(() => editor.updateDocumentSettings({ meta: { collectionsPlaygroundSeeded: true } }), {
		history: 'ignore',
	})
	const { board } = getEditorSources(editor)
	const kit = await board.createCollection('Board kit')
	for (const sample of SAMPLES) {
		if (sample.collectionId === BOARD_KIT) await saveSample(editor, board, kit.id, sample)
	}
}

let seeding: Promise<void> | undefined

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

const MANY_ITEMS = 40

// A big collection, to see how sections and the panel cap a long list. Saved on first use only.
async function seedShapes(editor: Editor) {
	for (let i = 0; i < MANY_ITEMS; i++) {
		const shape = geo(0, 0, {
			geo: SHAPE_KINDS[i % SHAPE_KINDS.length],
			color: SHAPE_COLORS[i % SHAPE_COLORS.length],
			fill: 'semi',
			w: 96,
			h: 96,
		})
		editor.run(() => editor.createShapes([shape]), { history: 'ignore' })
		try {
			await saveShapesToCollection(editor, samples, SHAPES, [shape.id], `Shape ${i + 1}`)
		} finally {
			editor.run(() => editor.deleteShapes([shape.id]), { history: 'ignore' })
		}
	}
}

let seedingShapes: Promise<void> | undefined

// A UI playground: each design surface is a page, and the controls at the top offer that surface's
// choices. Choices stay in effect on every page.
interface PlaygroundSettings {
	navigation: CollectionsPanelNavigation
	sectionRows: '1' | '2' | '3' | 'all'
	manyItems: 'hidden' | 'shown'
	moveCollections: 'yes' | 'no'
	order: AddToCollectionOrder
	sorting: 'built-in' | 'source-only'
	tileStyle: 'well' | 'card' | 'plain'
	tileColumns: '2' | '3' | '4'
	tileLabel: 'hidden' | 'below' | 'hover'
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
	header: 'picker' | 'title'
	addControl: 'none' | 'header' | 'footer'
	emptyCollection: 'message' | 'add'
	data: SourceName
}

const DEFAULT_SETTINGS: PlaygroundSettings = {
	navigation: 'sections',
	sectionRows: '2',
	manyItems: 'hidden',
	moveCollections: 'yes',
	order: 'source',
	sorting: 'built-in',
	tileStyle: 'well',
	tileColumns: '2',
	tileLabel: 'hidden',
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
	header: 'picker',
	addControl: 'none',
	emptyCollection: 'message',
	data: 'samples',
}

const settings = atom<PlaygroundSettings>('collections playground', DEFAULT_SETTINGS)

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
	'newCollectionOwner',
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
		hint: 'Open the panel with the bookmark button in the menu panel. Add packs from its ⋯ menu, under Browse collections…',
		choices: [
			{
				key: 'navigation',
				label: 'Moving between collections',
				options: [
					{ value: 'sections', label: 'Sections' },
					{ value: 'picker', label: 'Picker' },
					{ value: 'list', label: 'List with counts' },
					{ value: 'previews', label: 'Rows with previews' },
					{ value: 'tabs', label: 'Tabs' },
				],
			},
			{
				key: 'sectionRows',
				label: 'Rows per section',
				options: [
					{ value: '1', label: '1' },
					{ value: '2', label: '2' },
					{ value: '3', label: '3' },
					{ value: 'all', label: 'All' },
				],
			},
			{
				key: 'manyItems',
				label: `A collection of ${MANY_ITEMS} items`,
				options: [
					{ value: 'hidden', label: 'Hidden' },
					{ value: 'shown', label: 'Shown' },
				],
			},
			{
				key: 'moveCollections',
				label: 'Collections can move between owners',
				options: [
					{ value: 'yes', label: 'Yes' },
					{ value: 'no', label: 'No' },
				],
			},
		],
	},
	{
		page: 'Panel chrome',
		hint: "Select shapes to add them. For an empty collection, make one from the panel's ⋯ menu.",
		shapes: true,
		choices: [
			{
				key: 'header',
				label: 'Header',
				options: [
					{ value: 'picker', label: 'Collection picker' },
					{ value: 'title', label: 'Title and close button' },
				],
			},
			{
				key: 'navigation',
				label: 'Moving between collections',
				options: [
					{ value: 'sections', label: 'Sections' },
					{ value: 'picker', label: 'Picker' },
					{ value: 'tabs', label: 'Tabs' },
				],
			},
			{
				key: 'addControl',
				label: 'Add the selection from',
				options: [
					{ value: 'none', label: 'Only the "+" tiles' },
					{ value: 'header', label: 'A "+" in the header' },
					{ value: 'footer', label: 'A bar along the bottom' },
				],
			},
			{
				key: 'emptyCollection',
				label: 'An empty collection',
				options: [
					{ value: 'message', label: 'Says so' },
					{ value: 'add', label: 'Offers to add the selection' },
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
		hint: "What happens when you save. ⌘Z can't undo a save: saving isn't an edit to the canvas, so it stays out of the undo history.",
		shapes: true,
		choices: [
			{
				key: 'savingNaming',
				label: 'Name',
				options: [
					{ value: 'none', label: 'Unnamed' },
					{ value: 'auto', label: 'Automatic ("Drawing 2")' },
					{ value: 'dialog', label: 'Ask in a dialog' },
					{ value: 'inline', label: "Rename in the new item's menu" },
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
					{ value: 'well', label: 'Canvas colour' },
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
					{ value: 'hidden', label: 'In the menu only' },
					{ value: 'below', label: 'Below' },
					{ value: 'hover', label: 'On hover' },
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
		hint: 'Board, personal and workspace collections, as seen in a team file. Move one from its ⋯ menu.',
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
					{ value: 'grouped', label: 'Grouped by owner' },
					{ value: 'mixed', label: 'Mixed' },
				],
			},
			{
				key: 'moveCollections',
				label: 'Collections can move between owners',
				options: [
					{ value: 'yes', label: 'Yes' },
					{ value: 'no', label: 'No' },
				],
			},
			{
				key: 'newCollectionOwner',
				label: 'New collections go to',
				options: [
					{ value: 'personal', label: 'Personal' },
					{ value: 'board', label: 'This board' },
					{ value: 'workspace', label: 'Acme workspace' },
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

const DEFAULTS: AllSettings = { ...DEFAULT_SETTINGS, ...DEFAULT_SCOPE_SETTINGS }

const isDefault = (key: keyof AllSettings, value: string) => DEFAULTS[key] === value

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
							{isDefault(choice.key, option.value) && (
								<span style={{ color: 'var(--tl-color-text-3)' }}>(default)</span>
							)}
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
	const editor = useEditor()
	return useValue(
		'playground source',
		() => {
			const { data, moveCollections } = settings.get()
			const sources = getEditorSources(editor)
			return moveCollections === 'yes' ? sources.movable[data] : sources.fixed[data]
		},
		[editor]
	)
}

function PlaygroundPanel() {
	const editor = useEditor()
	const source = usePlaygroundSource()
	const navigation = useValue('navigation', () => settings.get().navigation, [])
	const sectionRows = useValue('section rows', () => settings.get().sectionRows, [])
	const showsShapes = useValue('many items', () => settings.get().manyItems === 'shown', [])
	useEffect(() => {
		if (showsShapes) seedingShapes ??= seedShapes(editor)
	}, [editor, showsShapes])
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
	const header = useValue('header', () => settings.get().header, [])
	const addControl = useValue('add control', () => settings.get().addControl, [])
	const order = useValue('order', () => settings.get().order, [])
	const emptyCollection = useValue('empty collection', () => settings.get().emptyCollection, [])
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
			groupCollections={grouped ? 'owner' : 'none'}
			tileAppearance={tileAppearance}
			side={side}
			width={Number(panelWidth)}
			smallScreen={smallScreen}
			saving={saving}
			placement={placement}
			firstUse={firstUse}
			readOnly={readOnly}
			search={search}
			header={header}
			addControl={addControl}
			addMenuOrder={order}
			emptyCollection={emptyCollection}
			sectionRows={sectionRows === 'all' ? Infinity : Number(sectionRows)}
			catalogue={starterPacks}
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
	return <AddToCollectionMenuItem source={source} order={order} saving={saving} />
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
	QuickActions: CollectionsQuickActions,
}

const mountedEditor = atom<Editor | null>('collections playground editor', null)

const handleMount = (editor: Editor) => {
	mountedEditor.set(editor)
	editor.run(() => setUpSurfaces(editor), { history: 'ignore' })
	collectionsPanelOpen.set(editor, true)
	seeding ??= seedSamples(editor)
	seedBoardKit(editor).catch((error) =>
		console.error('[collections] seeding the board failed', error)
	)
}

// The Panel layout page can shrink the editor to a phone's width, so tldraw's breakpoints treat
// it as a phone.
export default function Collections() {
	const viewport = useValue('viewport', () => settings.get().viewport, [])
	const mounted = useValue('mounted editor', () => mountedEditor.get(), [])
	const editor = (
		<Tldraw
			persistenceKey="collections"
			records={collectionSchemaRecords}
			components={components}
			onMount={handleMount}
		/>
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
