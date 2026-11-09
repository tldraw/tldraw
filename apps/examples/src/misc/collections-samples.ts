import {
	type CollectionSource,
	saveShapesToCollection,
	type TLCollectionId,
} from '@tldraw/collections'
import { createShapeId, Editor, TLGeoShape, TLShapePartial, toRichText } from 'tldraw'

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

export interface Sample {
	name?: string
	shapes: TLShapePartial<TLGeoShape>[]
}

export const BOARD_KIT: Sample[] = [
	{
		name: 'Arrow',
		shapes: [geo(0, 0, { geo: 'arrow-right', w: 120, h: 72, fill: 'solid', color: 'green' })],
	},
	{
		name: 'Cloud',
		shapes: [geo(0, 0, { geo: 'cloud', w: 140, h: 96, fill: 'semi', color: 'light-blue' })],
	},
]

export const WIREFRAMES: Sample[] = [
	{
		name: 'Button',
		shapes: [geo(0, 0, { w: 160, h: 48, richText: toRichText('Button'), fill: 'solid' })],
	},
	{
		name: 'Card',
		shapes: [
			geo(0, 0, { w: 200, h: 140 }),
			geo(16, 16, { w: 168, h: 60, fill: 'semi', color: 'grey' }),
			geo(16, 92, { w: 120, h: 32, richText: toRichText('Title'), size: 's' }),
		],
	},
	{
		shapes: [
			geo(0, 0, { geo: 'ellipse', w: 64, h: 64, fill: 'semi', color: 'blue' }),
			geo(80, 12, { w: 140, h: 40, richText: toRichText('Name'), size: 's' }),
		],
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

export function shapeSample(i: number): Sample {
	return {
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
	}
}

export async function saveSamples(
	editor: Editor,
	source: CollectionSource,
	collectionId: TLCollectionId,
	samples: Sample[]
) {
	for (const sample of samples) {
		const ids = sample.shapes.map((shape) => shape.id)
		editor.run(() => editor.createShapes(sample.shapes), { history: 'ignore' })
		try {
			await saveShapesToCollection(editor, source, collectionId, ids, sample.name)
		} finally {
			editor.run(() => editor.deleteShapes(ids), { history: 'ignore' })
		}
	}
}
