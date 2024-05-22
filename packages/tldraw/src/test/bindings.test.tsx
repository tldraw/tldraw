import {
	BindingOnUnbindOptions,
	BindingUtil,
	TLShapeId,
	TLUnknownBinding,
	createBindingId,
	createShapeId,
} from '@tldraw/editor'
import { TestEditor } from './TestEditor'
import { TL } from './test-jsx'

let editor: TestEditor

const ids = {
	box1: createShapeId('box1'),
	box2: createShapeId('box2'),
	box3: createShapeId('box3'),
	box4: createShapeId('box4'),
}

const mockOnBeforeUnbind = jest.fn() as jest.Mock<void, [BindingOnUnbindOptions<TLUnknownBinding>]>
const mockOnAfterUnbind = jest.fn() as jest.Mock<void, [BindingOnUnbindOptions<TLUnknownBinding>]>

class TestBindingUtil extends BindingUtil {
	static override type = 'test'

	static override props = {}

	override getDefaultProps(): object {
		return {}
	}

	override onBeforeUnbind(options: BindingOnUnbindOptions<TLUnknownBinding>): void {
		mockOnBeforeUnbind(options)
	}

	override onAfterUnbind(options: BindingOnUnbindOptions<TLUnknownBinding>): void {
		mockOnAfterUnbind(options)
	}
}

beforeEach(() => {
	editor = new TestEditor({ bindingUtils: [TestBindingUtil] })

	editor.createShapesFromJsx([
		<TL.geo id={ids.box1} x={0} y={0} />,
		<TL.geo id={ids.box2} x={0} y={0} />,
		<TL.geo id={ids.box3} x={0} y={0} />,
		<TL.geo id={ids.box4} x={0} y={0} />,
	])

	mockOnBeforeUnbind.mockClear()
	mockOnAfterUnbind.mockClear()
})

function bindShapes(fromId: TLShapeId, toId: TLShapeId) {
	const bindingId = createBindingId()
	editor.createBinding({
		id: bindingId,
		type: 'test',
		fromId,
		toId,
	})
	return bindingId
}

test('deleting the from shape causes the reason to be "delete_from_shape"', () => {
	bindShapes(ids.box1, ids.box2)
	editor.deleteShape(ids.box1)
	expect(mockOnBeforeUnbind).toHaveBeenCalledTimes(1)
	expect(mockOnBeforeUnbind).toHaveBeenCalledWith(
		expect.objectContaining({ reason: 'delete_from_shape' })
	)
	expect(mockOnAfterUnbind).toHaveBeenCalledTimes(1)
	expect(mockOnAfterUnbind).toHaveBeenCalledWith(
		expect.objectContaining({ reason: 'delete_from_shape' })
	)
})

test('deleting the to shape causes the reason to be "delete_to_shape"', () => {
	bindShapes(ids.box1, ids.box2)
	editor.deleteShape(ids.box2)
	expect(mockOnBeforeUnbind).toHaveBeenCalledTimes(1)
	expect(mockOnBeforeUnbind).toHaveBeenCalledWith(
		expect.objectContaining({ reason: 'delete_to_shape' })
	)
	expect(mockOnAfterUnbind).toHaveBeenCalledTimes(1)
	expect(mockOnAfterUnbind).toHaveBeenCalledWith(
		expect.objectContaining({ reason: 'delete_to_shape' })
	)
})

test('deleting the binding itself causes the reason to be "delete_binding"', () => {
	const bindingId = bindShapes(ids.box1, ids.box2)
	editor.deleteBinding(bindingId)

	expect(mockOnBeforeUnbind).toHaveBeenCalledTimes(1)
	expect(mockOnBeforeUnbind).toHaveBeenCalledWith(
		expect.objectContaining({ reason: 'delete_binding' })
	)
	expect(mockOnAfterUnbind).toHaveBeenCalledTimes(1)
	expect(mockOnAfterUnbind).toHaveBeenCalledWith(
		expect.objectContaining({ reason: 'delete_binding' })
	)
})

test('copying both bound shapes does not trigger the unbind operation', () => {
	bindShapes(ids.box1, ids.box2)
	editor.select(ids.box1, ids.box2)
	editor.copy()
	expect(mockOnBeforeUnbind).not.toHaveBeenCalled()
	expect(mockOnAfterUnbind).not.toHaveBeenCalled()
})

test('copying the from shape on its own does trigger the unbind operation', () => {
	bindShapes(ids.box1, ids.box2)
	editor.select(ids.box1)
	editor.copy()
	expect(mockOnBeforeUnbind).toHaveBeenCalledTimes(1)
	expect(mockOnBeforeUnbind).toHaveBeenCalledWith(
		expect.objectContaining({ reason: 'delete_binding' })
	)
	expect(mockOnAfterUnbind).toHaveBeenCalledTimes(1)
	expect(mockOnAfterUnbind).toHaveBeenCalledWith(
		expect.objectContaining({ reason: 'delete_binding' })
	)
})

test('copying the to shape on its own does trigger the unbind operation', () => {
	bindShapes(ids.box1, ids.box2)
	editor.select(ids.box2)
	editor.copy()
	expect(mockOnBeforeUnbind).toHaveBeenCalledTimes(1)
	expect(mockOnBeforeUnbind).toHaveBeenCalledWith(
		expect.objectContaining({ reason: 'delete_binding' })
	)
	expect(mockOnAfterUnbind).toHaveBeenCalledTimes(1)
	expect(mockOnAfterUnbind).toHaveBeenCalledWith(
		expect.objectContaining({ reason: 'delete_binding' })
	)
})

test('cascading deletes in afterUnbind are handled correctly', () => {
	mockOnAfterUnbind.mockImplementation((options) => {
		if (options.reason === 'delete_from_shape') {
			editor.deleteShape(options.binding.toId)
		}
	})

	bindShapes(ids.box1, ids.box2)
	bindShapes(ids.box2, ids.box3)
	bindShapes(ids.box3, ids.box4)

	editor.deleteShape(ids.box1)

	expect(editor.getShape(ids.box1)).toBeUndefined()
	expect(editor.getShape(ids.box2)).toBeUndefined()
	expect(editor.getShape(ids.box3)).toBeUndefined()
	expect(editor.getShape(ids.box4)).toBeUndefined()

	expect(mockOnBeforeUnbind).toHaveBeenCalledTimes(3)
	expect(mockOnAfterUnbind).toHaveBeenCalledTimes(3)
})

test('cascading deletes in beforeUnbind are handled correctly', () => {
	mockOnBeforeUnbind.mockImplementation((options) => {
		if (options.reason === 'delete_from_shape') {
			editor.deleteShape(options.binding.toId)
		}
	})

	bindShapes(ids.box1, ids.box2)
	bindShapes(ids.box2, ids.box3)
	bindShapes(ids.box3, ids.box4)

	editor.deleteShape(ids.box1)

	expect(editor.getShape(ids.box1)).toBeUndefined()
	expect(editor.getShape(ids.box2)).toBeUndefined()
	expect(editor.getShape(ids.box3)).toBeUndefined()
	expect(editor.getShape(ids.box4)).toBeUndefined()

	expect(mockOnBeforeUnbind).toHaveBeenCalledTimes(3)
	expect(mockOnAfterUnbind).toHaveBeenCalledTimes(3)
})

test('beforeUnbind is called before the from shape is deleted or the binding is deleted', () => {
	mockOnBeforeUnbind.mockImplementationOnce(() => {
		expect(editor.getShape(ids.box1)).toBeDefined()
		expect(editor.getShape(ids.box2)).toBeDefined()
		expect(editor.getBindingsFromShape(ids.box1, 'test')).toHaveLength(1)
	})
	bindShapes(ids.box1, ids.box2)
	editor.deleteShape(ids.box1)

	expect.assertions(3)
})

test('beforeUnbind is called before the to shape is deleted or the binding is deleted', () => {
	mockOnBeforeUnbind.mockImplementationOnce(() => {
		expect(editor.getShape(ids.box1)).toBeDefined()
		expect(editor.getShape(ids.box2)).toBeDefined()
		expect(editor.getBindingsToShape(ids.box2, 'test')).toHaveLength(1)
	})
	bindShapes(ids.box1, ids.box2)
	editor.deleteShape(ids.box2)

	expect.assertions(3)
})
