import { StyleProp } from '@tldraw/tlschema'
import {
	Geometry2d,
	RecordProps,
	Rectangle2d,
	ShapeUtil,
	T,
	TLShape,
	TLStateNodeConstructor,
	createShapeId,
} from '../../..'
import { TestEditor } from '../../test/TestEditor'
import { StateNode } from '../tools/StateNode'

const BOX_TYPE = 'st-box'
import { TEST_BOX_TYPE as PLAIN_TYPE } from '../../test/testShapeTypes'

const ColorStyle = StyleProp.define('st:color', { defaultValue: 'black', type: T.string })
const SizeStyle = StyleProp.defineEnum('st:size', { defaultValue: 'm', values: ['s', 'm', 'l'] })

declare module '@tldraw/tlschema' {
	export interface TLGlobalShapePropsMap {
		[BOX_TYPE]: { w: number; h: number; color: string; size: 's' | 'm' | 'l' }
	}
}

type IBoxShape = TLShape<typeof BOX_TYPE>
type IPlainShape = TLShape<typeof PLAIN_TYPE>

class BoxShapeUtil extends ShapeUtil<IBoxShape> {
	static override type = BOX_TYPE
	static override props: RecordProps<IBoxShape> = {
		w: T.number,
		h: T.number,
		color: ColorStyle,
		size: SizeStyle,
	}
	getDefaultProps(): IBoxShape['props'] {
		return { w: 100, h: 100, color: 'black', size: 'm' }
	}
	getGeometry(shape: IBoxShape): Geometry2d {
		return new Rectangle2d({ width: shape.props.w, height: shape.props.h, isFilled: true })
	}
	getIndicatorPath() {
		return undefined
	}
	component() {}
}

class PlainShapeUtil extends ShapeUtil<IPlainShape> {
	static override type = PLAIN_TYPE
	static override props: RecordProps<IPlainShape> = { w: T.number, h: T.number }
	getDefaultProps(): IPlainShape['props'] {
		return { w: 100, h: 100 }
	}
	getGeometry(shape: IPlainShape): Geometry2d {
		return new Rectangle2d({ width: shape.props.w, height: shape.props.h, isFilled: true })
	}
	getIndicatorPath() {
		return undefined
	}
	component() {}
}

class SelectIdle extends StateNode {
	static override id = 'idle'
}

class SelectTool extends StateNode {
	static override id = 'select'
	static override initial = 'idle'
	static override children(): TLStateNodeConstructor[] {
		return [SelectIdle]
	}
}

class BoxTool extends StateNode {
	static override id = 'box'
	override shapeType = BOX_TYPE
}

class OtherTool extends StateNode {
	static override id = 'other'
}

let editor: TestEditor

const ids = {
	red: createShapeId('red'),
	blue: createShapeId('blue'),
	red2: createShapeId('red2'),
	plain: createShapeId('plain'),
	group: createShapeId('group'),
}

function props(id = ids.red) {
	return (editor.getShape(id) as IBoxShape).props
}

beforeEach(() => {
	editor = new TestEditor({
		shapeUtils: [BoxShapeUtil, PlainShapeUtil],
		tools: [SelectTool, BoxTool, OtherTool],
		initialState: 'select',
	})
	editor.createShapes([
		{ id: ids.red, type: BOX_TYPE, x: 0, y: 0, props: { color: 'red', size: 's' } },
		{ id: ids.blue, type: BOX_TYPE, x: 200, y: 0, props: { color: 'blue', size: 's' } },
		{ id: ids.red2, type: BOX_TYPE, x: 400, y: 0, props: { color: 'red', size: 'l' } },
		{ id: ids.plain, type: PLAIN_TYPE, x: 600, y: 0 },
	])
})

afterEach(() => {
	editor.dispose()
})

describe('getStyleForNextShape', () => {
	it('falls back to the default value of the style', () => {
		expect(editor.getStyleForNextShape(ColorStyle)).toBe('black')
		expect(editor.getStyleForNextShape(SizeStyle)).toBe('m')
	})

	it('returns the value set for the next shapes', () => {
		editor.setStyleForNextShapes(ColorStyle, 'green')
		expect(editor.getStyleForNextShape(ColorStyle)).toBe('green')
		expect(editor.getStyleForNextShape(SizeStyle)).toBe('m')
	})

	it('is applied to newly created shapes unless the shape sets the prop itself', () => {
		editor.setStyleForNextShapes(ColorStyle, 'green')
		editor.setStyleForNextShapes(SizeStyle, 'l')
		const a = createShapeId('a')
		const b = createShapeId('b')
		editor.createShapes([
			{ id: a, type: BOX_TYPE },
			{ id: b, type: BOX_TYPE, props: { color: 'pink' } },
		])
		expect(props(a)).toEqual({ w: 100, h: 100, color: 'green', size: 'l' })
		expect(props(b)).toEqual({ w: 100, h: 100, color: 'pink', size: 'l' })
	})
})

describe('getShapeStyleIfExists', () => {
	it('returns the value of the style prop on the shape', () => {
		expect(editor.getShapeStyleIfExists(editor.getShape(ids.red)!, ColorStyle)).toBe('red')
		expect(editor.getShapeStyleIfExists(editor.getShape(ids.red2)!, SizeStyle)).toBe('l')
	})

	it('returns undefined for shapes without the style', () => {
		expect(editor.getShapeStyleIfExists(editor.getShape(ids.plain)!, ColorStyle)).toBeUndefined()
	})
})

describe('getSharedStyles', () => {
	it('returns the styles of the selected shapes, marking differing values as mixed', () => {
		editor.select(ids.red)
		expect(editor.getSharedStyles().get(ColorStyle)).toEqual({ type: 'shared', value: 'red' })
		expect(editor.getSharedStyles().get(SizeStyle)).toEqual({ type: 'shared', value: 's' })

		editor.select(ids.red, ids.blue)
		expect(editor.getSharedStyles().get(ColorStyle)).toEqual({ type: 'mixed' })
		expect(editor.getSharedStyles().get(SizeStyle)).toEqual({ type: 'shared', value: 's' })

		editor.select(ids.red, ids.red2)
		expect(editor.getSharedStyles().get(ColorStyle)).toEqual({ type: 'shared', value: 'red' })
		expect(editor.getSharedStyles().get(SizeStyle)).toEqual({ type: 'mixed' })
	})

	it('ignores shapes without styles', () => {
		editor.select(ids.plain)
		expect(editor.getSharedStyles().size).toBe(0)
		editor.select(ids.plain, ids.red)
		expect(editor.getSharedStyles().get(ColorStyle)).toEqual({ type: 'shared', value: 'red' })
	})

	it('looks through groups to the shapes inside them', () => {
		editor.groupShapes([ids.red, ids.red2], { groupId: ids.group })
		editor.select(ids.group)
		expect(editor.getSharedStyles().get(ColorStyle)).toEqual({ type: 'shared', value: 'red' })
		expect(editor.getSharedStyles().get(SizeStyle)).toEqual({ type: 'mixed' })
	})

	it('is empty in the select tool with nothing selected', () => {
		editor.selectNone()
		expect(editor.getSharedStyles().size).toBe(0)
	})

	it('returns the styles for the next shape when the current tool creates a shape type', () => {
		editor.setStyleForNextShapes(ColorStyle, 'green')
		editor.setCurrentTool('box')
		expect(editor.getSharedStyles().get(ColorStyle)).toEqual({ type: 'shared', value: 'green' })
		expect(editor.getSharedStyles().get(SizeStyle)).toEqual({ type: 'shared', value: 'm' })
	})

	it('ignores the selection when a shape tool is active', () => {
		editor.select(ids.red)
		editor.setCurrentTool('box')
		expect(editor.getSharedStyles().get(ColorStyle)).toEqual({ type: 'shared', value: 'black' })
	})

	it('is empty when the current tool has no shape type', () => {
		editor.select(ids.red)
		editor.setCurrentTool('other')
		expect(editor.getSharedStyles().size).toBe(0)
	})
})

describe('setStyleForSelectedShapes', () => {
	it('updates the style prop on every selected shape that has it', () => {
		editor.select(ids.red, ids.blue, ids.plain)
		expect(editor.setStyleForSelectedShapes(ColorStyle, 'green')).toBe(editor)
		expect(props(ids.red).color).toBe('green')
		expect(props(ids.blue).color).toBe('green')
		expect(props(ids.red2).color).toBe('red')
		expect(editor.getShape(ids.plain)!.props).toEqual({ w: 100, h: 100 })
		expect(editor.getSharedStyles().get(ColorStyle)).toEqual({ type: 'shared', value: 'green' })
	})

	it('updates the shapes inside selected groups', () => {
		editor.groupShapes([ids.red, ids.blue], { groupId: ids.group })
		editor.select(ids.group)
		editor.setStyleForSelectedShapes(SizeStyle, 'l')
		expect(props(ids.red).size).toBe('l')
		expect(props(ids.blue).size).toBe('l')
		expect(editor.getShape(ids.group)!.props).toEqual({})
	})

	it('does nothing with no selection', () => {
		editor.selectNone()
		editor.setStyleForSelectedShapes(ColorStyle, 'green')
		expect(props(ids.red).color).toBe('red')
	})
})

describe('opacity', () => {
	it('reports the opacity for the next shape when nothing is selected', () => {
		expect(editor.getSharedOpacity()).toEqual({ type: 'shared', value: 1 })
		expect(editor.setOpacityForNextShapes(0.5)).toBe(editor)
		expect(editor.getSharedOpacity()).toEqual({ type: 'shared', value: 0.5 })
	})

	it('applies the next shape opacity to new shapes', () => {
		editor.setOpacityForNextShapes(0.25)
		const a = createShapeId('a')
		const b = createShapeId('b')
		editor.createShapes([
			{ id: a, type: BOX_TYPE },
			{ id: b, type: BOX_TYPE, opacity: 0.75 },
		])
		expect(editor.getShape(a)!.opacity).toBe(0.25)
		expect(editor.getShape(b)!.opacity).toBe(0.75)
	})

	it('reports the shared or mixed opacity of the selection', () => {
		editor.updateShape({ id: ids.blue, type: BOX_TYPE, opacity: 0.5 })
		editor.select(ids.red, ids.red2)
		expect(editor.getSharedOpacity()).toEqual({ type: 'shared', value: 1 })
		editor.select(ids.red, ids.blue)
		expect(editor.getSharedOpacity()).toEqual({ type: 'mixed' })
	})

	it('sets the opacity of the selected shapes and the shapes inside selected groups', () => {
		editor.groupShapes([ids.red, ids.blue], { groupId: ids.group })
		editor.select(ids.group, ids.plain)
		expect(editor.setOpacityForSelectedShapes(0.3)).toBe(editor)
		expect(editor.getShape(ids.red)!.opacity).toBe(0.3)
		expect(editor.getShape(ids.blue)!.opacity).toBe(0.3)
		expect(editor.getShape(ids.plain)!.opacity).toBe(0.3)
		expect(editor.getShape(ids.group)!.opacity).toBe(1)
		expect(editor.getShape(ids.red2)!.opacity).toBe(1)
		expect(editor.getSharedOpacity()).toEqual({ type: 'shared', value: 0.3 })
	})

	it('does nothing with no selection', () => {
		editor.selectNone()
		editor.setOpacityForSelectedShapes(0.3)
		expect(editor.getShape(ids.red)!.opacity).toBe(1)
	})
})
