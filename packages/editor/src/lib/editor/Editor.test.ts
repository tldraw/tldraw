import {
	Box,
	Geometry2d,
	RecordProps,
	Rectangle2d,
	ShapeUtil,
	T,
	TLBaseShape,
	createShapeId,
	createTLStore,
} from '../..'
import { Editor } from './Editor'

type ICustomShape = TLBaseShape<
	'my-custom-shape',
	{
		w: number
		h: number
		text: string | undefined
	}
>

class CustomShape extends ShapeUtil<ICustomShape> {
	static override type = 'my-custom-shape' as const
	static override props: RecordProps<ICustomShape> = {
		w: T.number,
		h: T.number,
		text: T.string.optional(),
	}
	getDefaultProps(): ICustomShape['props'] {
		return {
			w: 200,
			h: 200,
			text: '',
		}
	}
	getGeometry(shape: ICustomShape): Geometry2d {
		return new Rectangle2d({
			width: shape.props.w,
			height: shape.props.h,
			isFilled: true,
		})
	}
	indicator() {}
	component() {}
}

let editor: Editor

beforeEach(() => {
	editor = new Editor({
		shapeUtils: [CustomShape],
		bindingUtils: [],
		tools: [],
		store: createTLStore({ shapeUtils: [CustomShape], bindingUtils: [] }),
		getContainer: () => document.body,
	})
	editor.setCameraOptions({ isLocked: true })
	editor.setCamera = jest.fn()
	editor.user.getAnimationSpeed = jest.fn()
})

describe('centerOnPoint', () => {
	it('no-op when isLocked is set', () => {
		editor.centerOnPoint({ x: 0, y: 0 })
		expect(editor.setCamera).not.toHaveBeenCalled()
	})

	it('sets camera when isLocked is set and force flag is set', () => {
		editor.centerOnPoint({ x: 0, y: 0 }, { force: true })
		expect(editor.setCamera).toHaveBeenCalled()
	})
})

describe('updateShape', () => {
	it('updates shape props to undefined', () => {
		const id = createShapeId('sample')
		editor.createShape({
			id,
			type: 'my-custom-shape',
			props: { w: 100, h: 100, text: 'Hello' },
		})
		const shape = editor.getShape(id) as ICustomShape
		expect(shape.props).toEqual({ w: 100, h: 100, text: 'Hello' })

		editor.updateShape({ ...shape, props: { ...shape.props, text: undefined } })
		const updatedShape = editor.getShape(id) as ICustomShape
		expect(updatedShape.props).toEqual({ w: 100, h: 100, text: undefined })
	})
})

describe('zoomToFit', () => {
	it('no-op when isLocked is set', () => {
		editor.getCurrentPageShapeIds = jest.fn(() => new Set([createShapeId('box1')]))
		editor.zoomToFit()
		expect(editor.setCamera).not.toHaveBeenCalled()
	})

	it('sets camera when isLocked is set and force flag is set', () => {
		editor.getCurrentPageShapeIds = jest.fn(() => new Set([createShapeId('box1')]))
		editor.zoomToFit({ force: true })
		expect(editor.setCamera).toHaveBeenCalled()
	})
})

describe('resetZoom', () => {
	it('no-op when isLocked is set', () => {
		editor.resetZoom()
		expect(editor.setCamera).not.toHaveBeenCalled()
	})

	it('sets camera when isLocked is set and force flag is set', () => {
		editor.resetZoom(undefined, { force: true })
		expect(editor.setCamera).toHaveBeenCalled()
	})
})

describe('zoomIn', () => {
	it('no-op when isLocked is set', () => {
		editor.zoomIn()
		expect(editor.setCamera).not.toHaveBeenCalled()
	})

	it('sets camera when isLocked is set and force flag is set', () => {
		editor.zoomIn(undefined, { force: true })
		expect(editor.setCamera).toHaveBeenCalled()
	})
})

describe('zoomOut', () => {
	it('no-op when isLocked is set', () => {
		editor.zoomOut()
		expect(editor.setCamera).not.toHaveBeenCalled()
	})

	it('sets camera when isLocked is set and force flag is set', () => {
		editor.zoomOut(undefined, { force: true })
		expect(editor.setCamera).toHaveBeenCalled()
	})
})

describe('zoomToSelection', () => {
	it('no-op when isLocked is set', () => {
		editor.getSelectionPageBounds = jest.fn(() => Box.From({ x: 0, y: 0, w: 100, h: 100 }))
		editor.zoomToSelection()
		expect(editor.setCamera).not.toHaveBeenCalled()
	})

	it('sets camera when isLocked is set and force flag is set', () => {
		editor.getSelectionPageBounds = jest.fn(() => Box.From({ x: 0, y: 0, w: 100, h: 100 }))
		editor.zoomToSelection({ force: true })
		expect(editor.setCamera).toHaveBeenCalled()
	})
})

describe('slideCamera', () => {
	it('no-op when isLocked is set', () => {
		editor.slideCamera({ speed: 1, direction: { x: 1, y: 1 } })
		expect(editor.user.getAnimationSpeed).not.toHaveBeenCalled()
	})

	it('performs animation when isLocked is set and force flag is set', () => {
		editor.slideCamera({ speed: 1, direction: { x: 1, y: 1 }, force: true })
		expect(editor.user.getAnimationSpeed).toHaveBeenCalled()
	})
})

describe('zoomToBounds', () => {
	it('no-op when isLocked is set', () => {
		editor.zoomToBounds({ x: 0, y: 0, w: 100, h: 100 })
		expect(editor.setCamera).not.toHaveBeenCalled()
	})

	it('sets camera when isLocked is set and force flag is set', () => {
		editor.zoomToBounds({ x: 0, y: 0, w: 100, h: 100 }, { force: true })
		expect(editor.setCamera).toHaveBeenCalled()
	})
})
