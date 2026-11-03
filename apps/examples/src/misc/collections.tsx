import {
	AddToCollectionMenuItem,
	CollectionsPanel,
	CollectionRecordType,
	CollectionsPanelButton,
	collectionsPanelOpen,
	InMemoryCollectionSource,
	saveShapesToCollection,
	type TLCollectionId,
} from '@tldraw/collections'
import {
	createShapeId,
	DefaultContextMenu,
	DefaultContextMenuContent,
	DefaultMenuPanel,
	Editor,
	TLComponents,
	Tldraw,
	TLGeoShape,
	TLShapePartial,
	toRichText,
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
			await saveShapesToCollection(editor, source, sample.collectionId, ids, { name: sample.name })
		} finally {
			editor.run(() => editor.deleteShapes(ids), { history: 'ignore' })
		}
	}
}

let seeding: Promise<void> | undefined

const components: TLComponents = {
	InFrontOfTheCanvas: () => <CollectionsPanel source={source} />,
	ContextMenu: (props) => (
		<DefaultContextMenu {...props}>
			<AddToCollectionMenuItem source={source} />
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
