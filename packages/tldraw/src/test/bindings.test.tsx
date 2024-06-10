import {
	BindingOnChangeOptions,
	BindingOnCreateOptions,
	BindingOnShapeChangeOptions,
	BindingOnUnbindOptions,
	BindingUnbindReason,
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

const mockOnOperationComplete = jest.fn() as jest.Mock<void, []>
const mockOnBeforeUnbind = jest.fn() as jest.Mock<void, [BindingOnUnbindOptions<TLUnknownBinding>]>
const mockOnAfterUnbind = jest.fn() as jest.Mock<void, [BindingOnUnbindOptions<TLUnknownBinding>]>
const mockOnBeforeCreate = jest.fn() as jest.Mock<void, [BindingOnCreateOptions<TLUnknownBinding>]>
const mockOnAfterCreate = jest.fn() as jest.Mock<void, [BindingOnCreateOptions<TLUnknownBinding>]>
const mockOnBeforeChange = jest.fn() as jest.Mock<void, [BindingOnChangeOptions<TLUnknownBinding>]>
const mockOnAfterChange = jest.fn() as jest.Mock<void, [BindingOnChangeOptions<TLUnknownBinding>]>
const mockOnAfterChangeFromShape = jest.fn() as jest.Mock<
	void,
	[BindingOnShapeChangeOptions<TLUnknownBinding>]
>
const mockOnAfterChangeToShape = jest.fn() as jest.Mock<
	void,
	[BindingOnShapeChangeOptions<TLUnknownBinding>]
>

class TestBindingUtil extends BindingUtil {
	static override type = 'test'

	static override props = {}

	override getDefaultProps(): object {
		return {}
	}

	override onOperationComplete(): void {
		mockOnOperationComplete()
	}

	override onBeforeUnbind(options: BindingOnUnbindOptions<TLUnknownBinding>): void {
		mockOnBeforeUnbind(options)
	}

	override onAfterUnbind(options: BindingOnUnbindOptions<TLUnknownBinding>): void {
		mockOnAfterUnbind(options)
	}

	override onBeforeCreate(options: BindingOnCreateOptions<TLUnknownBinding>): void {
		mockOnBeforeCreate(options)
	}

	override onAfterCreate(options: BindingOnCreateOptions<TLUnknownBinding>): void {
		mockOnAfterCreate(options)
	}

	override onBeforeChange(options: BindingOnChangeOptions<TLUnknownBinding>): void {
		mockOnBeforeChange(options)
	}

	override onAfterChange(options: BindingOnChangeOptions<TLUnknownBinding>): void {
		mockOnAfterChange(options)
	}

	override onAfterChangeFromShape(options: BindingOnShapeChangeOptions<TLUnknownBinding>): void {
		mockOnAfterChangeFromShape(options)
	}

	override onAfterChangeToShape(options: BindingOnShapeChangeOptions<TLUnknownBinding>): void {
		mockOnAfterChangeToShape(options)
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
	mockOnBeforeCreate.mockClear()
	mockOnAfterCreate.mockClear()
	mockOnBeforeChange.mockClear()
	mockOnAfterChange.mockClear()
	mockOnAfterChangeFromShape.mockClear()
	mockOnAfterChangeToShape.mockClear()
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

test('deleting the from shape causes the reason to be "deleting_from_shape"', () => {
	bindShapes(ids.box1, ids.box2)
	editor.deleteShape(ids.box1)
	expect(mockOnBeforeUnbind).toHaveBeenCalledTimes(1)
	expect(mockOnBeforeUnbind).toHaveBeenCalledWith(
		expect.objectContaining({ reason: BindingUnbindReason.DeletingFromShape })
	)
	expect(mockOnAfterUnbind).toHaveBeenCalledTimes(1)
	expect(mockOnAfterUnbind).toHaveBeenCalledWith(
		expect.objectContaining({ reason: BindingUnbindReason.DeletingFromShape })
	)
})

test('deleting the to shape causes the reason to be "deleting_to_shape"', () => {
	bindShapes(ids.box1, ids.box2)
	editor.deleteShape(ids.box2)
	expect(mockOnBeforeUnbind).toHaveBeenCalledTimes(1)
	expect(mockOnBeforeUnbind).toHaveBeenCalledWith(
		expect.objectContaining({ reason: BindingUnbindReason.DeletingToShape })
	)
	expect(mockOnAfterUnbind).toHaveBeenCalledTimes(1)
	expect(mockOnAfterUnbind).toHaveBeenCalledWith(
		expect.objectContaining({ reason: BindingUnbindReason.DeletingToShape })
	)
})

test('deleting the binding itself causes the reason to be "deleting_binding"', () => {
	const bindingId = bindShapes(ids.box1, ids.box2)
	editor.deleteBinding(bindingId)

	expect(mockOnBeforeUnbind).toHaveBeenCalledTimes(1)
	expect(mockOnBeforeUnbind).toHaveBeenCalledWith(
		expect.objectContaining({ reason: BindingUnbindReason.DeletingBinding })
	)
	expect(mockOnAfterUnbind).toHaveBeenCalledTimes(1)
	expect(mockOnAfterUnbind).toHaveBeenCalledWith(
		expect.objectContaining({ reason: BindingUnbindReason.DeletingBinding })
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
		expect.objectContaining({ reason: BindingUnbindReason.DeletingBinding })
	)
	expect(mockOnAfterUnbind).toHaveBeenCalledTimes(1)
	expect(mockOnAfterUnbind).toHaveBeenCalledWith(
		expect.objectContaining({ reason: BindingUnbindReason.DeletingBinding })
	)
})

test('copying the to shape on its own does trigger the unbind operation', () => {
	bindShapes(ids.box1, ids.box2)
	editor.select(ids.box2)
	editor.copy()
	expect(mockOnBeforeUnbind).toHaveBeenCalledTimes(1)
	expect(mockOnBeforeUnbind).toHaveBeenCalledWith(
		expect.objectContaining({ reason: BindingUnbindReason.DeletingBinding })
	)
	expect(mockOnAfterUnbind).toHaveBeenCalledTimes(1)
	expect(mockOnAfterUnbind).toHaveBeenCalledWith(
		expect.objectContaining({ reason: BindingUnbindReason.DeletingBinding })
	)
})

test('cascading deletes in afterUnbind are handled correctly', () => {
	mockOnAfterUnbind.mockImplementation((options) => {
		if (options.reason === BindingUnbindReason.DeletingFromShape) {
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
		if (options.reason === BindingUnbindReason.DeletingFromShape) {
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

describe('onOperationComplete', () => {
	const calls = [] as string[]
	beforeEach(() => {
		calls.length = 0

		mockOnOperationComplete.mockImplementation(() => {
			calls.push('onOperationComplete')
		})
	})
	it('is called once after onAfterCreate', () => {
		mockOnAfterCreate.mockImplementation(() => {
			calls.push('onAfterCreate')
		})
		bindShapes(ids.box1, ids.box2)
		bindShapes(ids.box2, ids.box3)
		expect(calls).toEqual([
			'onAfterCreate',
			'onOperationComplete',
			'onAfterCreate',
			'onOperationComplete',
		])
	})
	it('is called once after onAfterChange', () => {
		mockOnAfterChange.mockImplementation(() => {
			calls.push('onAfterChange')
		})
		const bindingAid = bindShapes(ids.box1, ids.box2)
		const bindingBid = bindShapes(ids.box2, ids.box3)
		calls.length = 0

		editor.updateBindings([
			{
				id: bindingAid,
				type: 'test',
				meta: { foo: 'bar' },
			},
			{
				id: bindingBid,
				type: 'test',
				meta: { foo: 'baz' },
			},
		])

		expect(calls).toEqual(['onAfterChange', 'onAfterChange', 'onOperationComplete'])
	})
	it('is called once after onAfterFromShapeChange and onAfterToShapeChange', () => {
		mockOnAfterChangeFromShape.mockImplementation(() => {
			calls.push('onAfterChangeFromShape')
		})
		mockOnAfterChangeToShape.mockImplementation(() => {
			calls.push('onAfterChangeToShape')
		})
		bindShapes(ids.box1, ids.box2)
		bindShapes(ids.box2, ids.box3)
		calls.length = 0

		editor.updateShapes([
			{
				id: ids.box1,
				type: 'geo',
				x: 10,
			},
			{
				id: ids.box2,
				type: 'geo',
				x: 20,
			},
			{
				id: ids.box3,
				type: 'geo',
				x: 30,
			},
		])

		expect(calls).toEqual([
			'onAfterChangeFromShape',
			'onAfterChangeToShape',
			'onAfterChangeFromShape',
			'onAfterChangeToShape',
			'onOperationComplete',
		])
	})
	it('is called once after onAfterUnbind', () => {
		mockOnAfterUnbind.mockImplementation(() => {
			calls.push('onAfterUnbind')
		})
		const bindingAid = bindShapes(ids.box1, ids.box2)
		const bindingBid = bindShapes(ids.box2, ids.box3)
		calls.length = 0

		editor.deleteBindings([bindingAid, bindingBid])

		expect(calls).toEqual(['onAfterUnbind', 'onAfterUnbind', 'onOperationComplete'])
	})
})

test('onBeforeCreate is called before the binding is created', () => {
	mockOnBeforeCreate.mockImplementationOnce(() => {
		expect(editor.getBindingsFromShape(ids.box1, 'test')).toHaveLength(0)
	})
	bindShapes(ids.box1, ids.box2)
	expect(editor.getBindingsFromShape(ids.box1, 'test')).toHaveLength(1)
})

test('onAfterCreate is called after the binding is created', () => {
	mockOnAfterCreate.mockImplementationOnce(() => {
		expect(editor.getBindingsFromShape(ids.box1, 'test')).toHaveLength(1)
	})
	bindShapes(ids.box1, ids.box2)
	expect(editor.getBindingsFromShape(ids.box1, 'test')).toHaveLength(1)
	expect.assertions(2)
})

test('onBeforeChange is called before the binding is updated', () => {
	const bindingId = bindShapes(ids.box1, ids.box2)
	mockOnBeforeChange.mockImplementationOnce(() => {
		expect(editor.getBinding(bindingId)?.meta).toEqual({})
	})
	editor.updateBindings([
		{
			id: bindingId,
			type: 'test',
			meta: { foo: 'bar' },
		},
	])
	expect(editor.getBinding(bindingId)?.meta).toEqual({ foo: 'bar' })
	expect.assertions(2)
})

test('onAfterChange is called after the binding is updated', () => {
	const bindingId = bindShapes(ids.box1, ids.box2)
	expect(editor.getBinding(bindingId)?.meta).toEqual({})
	mockOnAfterChange.mockImplementationOnce(() => {
		expect(editor.getBinding(bindingId)?.meta).toEqual({ foo: 'bar' })
	})
	editor.updateBindings([
		{
			id: bindingId,
			type: 'test',
			meta: { foo: 'bar' },
		},
	])
	expect(editor.getBinding(bindingId)?.meta).toEqual({ foo: 'bar' })
	expect.assertions(3)
})

test('onAfterChangeFromShape is called after the from shape is updated', () => {
	bindShapes(ids.box1, ids.box2)

	expect(editor.getShape(ids.box1)?.meta).toEqual({})
	mockOnAfterChangeFromShape.mockImplementationOnce(() => {
		expect(editor.getShape(ids.box1)?.meta).toEqual({
			foo: 'bar',
		})
	})
	editor.updateShapes([
		{
			id: ids.box1,
			type: 'geo',
			meta: { foo: 'bar' },
		},
	])
	expect(editor.getShape(ids.box1)?.meta).toEqual({
		foo: 'bar',
	})
	expect.assertions(3)
})

test('onAfterChangeToShape is called after the to shape is updated', () => {
	bindShapes(ids.box1, ids.box2)

	expect(editor.getShape(ids.box2)?.meta).toEqual({})
	mockOnAfterChangeToShape.mockImplementationOnce(() => {
		expect(editor.getShape(ids.box2)?.meta).toEqual({
			foo: 'bar',
		})
	})
	editor.updateShapes([
		{
			id: ids.box2,
			type: 'geo',
			meta: { foo: 'bar' },
		},
	])
	expect(editor.getShape(ids.box2)?.meta).toEqual({
		foo: 'bar',
	})
	expect.assertions(3)
})
