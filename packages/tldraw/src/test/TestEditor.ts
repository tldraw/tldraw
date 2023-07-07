import { TLEditorOptions, TLShapeId, TLShapePartial, createShapeId } from '@tldraw/editor'
import { TestEditor as _TestEditor } from '@tldraw/editor/src/lib/test/TestEditor'
import { TAU } from '@tldraw/primitives'
import { defaultShapeTools } from '../lib/defaultShapeTools'
import { defaultShapeUtils } from '../lib/defaultShapeUtils'
import { shapesFromJsx } from './test-jsx'

export class TestEditor extends _TestEditor {
	constructor(opts = {} as Partial<Omit<TLEditorOptions, 'store'>>) {
		super({
			...opts,
			shapeUtils: [...(opts.shapeUtils ?? []), ...defaultShapeUtils],
			tools: [...(opts.tools ?? []), ...defaultShapeTools],
		})
	}

	createShapesFromJsx(shapesJsx: JSX.Element | JSX.Element[]): Record<string, TLShapeId> {
		const { shapes, ids } = shapesFromJsx(shapesJsx)
		this.createShapes(shapes)
		return ids
	}
}

export const defaultShapesIds = {
	box1: createShapeId('box1'),
	box2: createShapeId('box2'),
	ellipse1: createShapeId('ellipse1'),
}

export const createDefaultShapes = (): TLShapePartial[] => [
	{
		id: defaultShapesIds.box1,
		type: 'geo',
		x: 100,
		y: 100,
		props: {
			w: 100,
			h: 100,
			geo: 'rectangle',
		},
	},
	{
		id: defaultShapesIds.box2,
		type: 'geo',
		x: 200,
		y: 200,
		rotation: TAU / 2,
		props: {
			w: 100,
			h: 100,
			color: 'black',
			fill: 'none',
			dash: 'draw',
			size: 'm',
			geo: 'rectangle',
		},
	},
	{
		id: defaultShapesIds.ellipse1,
		type: 'geo',
		parentId: defaultShapesIds.box2,
		x: 200,
		y: 200,
		props: {
			w: 50,
			h: 50,
			color: 'black',
			fill: 'none',
			dash: 'draw',
			size: 'm',
			geo: 'ellipse',
		},
	},
]
