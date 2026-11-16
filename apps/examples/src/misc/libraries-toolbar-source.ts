import {
	InMemoryLibrarySource,
	LibraryRecordType,
	type TLLibraryItemId,
	type TLLibraryItemTool,
} from '@tldraw/libraries'
import { type Editor, GeoShapeGeoStyle, type TLGeoShape, toRichText } from 'tldraw'
import { geo, saveSamples, type Sample, shapeSample, WIREFRAMES } from './libraries-samples'

// Fixed ids, so the libraries a user puts in their toolbar are still there after a reload, when
// the in-memory source is filled again.
export const BASIC_SHAPES_ID = LibraryRecordType.createId('basic-shapes')
export const STAMPS_ID = LibraryRecordType.createId('stamps')

const GEO_TYPES: TLGeoShape['props']['geo'][] = [
	'rectangle',
	'ellipse',
	'triangle',
	'diamond',
	'hexagon',
	'oval',
	'rhombus',
	'star',
	'cloud',
	'heart',
	'x-box',
	'check-box',
]

const label = (type: string) => type[0].toUpperCase() + type.slice(1).replaceAll('-', ' ')

const basicShapes = (): Sample[] =>
	GEO_TYPES.map((type) => ({
		name: label(type),
		shapes: [geo(0, 0, { geo: type, w: 96, h: 96 })],
	}))

const stamps = (): Sample[] => [
	...WIREFRAMES,
	{
		name: 'Sticky',
		shapes: [
			geo(0, 0, {
				w: 160,
				h: 160,
				color: 'yellow',
				fill: 'solid',
				richText: toRichText('To do'),
			}),
		],
	},
	shapeSample(7),
	shapeSample(9),
]

/**
 * Two libraries: "Basic shapes", whose items stand for the geo tool armed with each geo type, and
 * "Stamps", whose items are placed as they are. Only this source's own Basic shapes items are tools:
 * one copied to another library is plain content there.
 */
export class ToolbarExampleLibrarySource extends InMemoryLibrarySource {
	private readonly geoByItem = new Map<TLLibraryItemId, string>()

	constructor() {
		super({
			id: 'libraries-toolbar-example',
			initial: {
				libraries: [
					LibraryRecordType.create({ id: BASIC_SHAPES_ID, name: 'Basic shapes' }),
					LibraryRecordType.create({ id: STAMPS_ID, name: 'Stamps' }),
				],
				items: [],
				contents: {},
			},
		})
	}

	async seed(editor: Editor) {
		const shapes = await saveSamples(editor, this, BASIC_SHAPES_ID, basicShapes())
		shapes.forEach((item, i) => this.geoByItem.set(item.id, GEO_TYPES[i]))
		await saveSamples(editor, this, STAMPS_ID, stamps())
	}

	getItemTool(itemId: TLLibraryItemId): TLLibraryItemTool | undefined {
		const type = this.geoByItem.get(itemId)
		if (!type) return undefined
		return { toolId: 'geo', styles: { [GeoShapeGeoStyle.id]: type }, icon: `geo-${type}` }
	}
}
