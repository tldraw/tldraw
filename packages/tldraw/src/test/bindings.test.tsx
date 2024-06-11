import {
	BindingOnChangeOptions,
	BindingOnCreateOptions,
	BindingOnDeleteOptions,
	BindingOnShapeChangeOptions,
	BindingOnShapeDeleteOptions,
	BindingOnShapeIsolateOptions,
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
const mockOnBeforeDelete = jest.fn() as jest.Mock<void, [BindingOnDeleteOptions<TLUnknownBinding>]>
const mockOnAfterDelete = jest.fn() as jest.Mock<void, [BindingOnDeleteOptions<TLUnknownBinding>]>
const mockOnBeforeFromShapeDelete = jest.fn() as jest.Mock<
	void,
	[BindingOnShapeDeleteOptions<TLUnknownBinding>]
>
const mockOnBeforeToShapeDelete = jest.fn() as jest.Mock<
	void,
	[BindingOnShapeDeleteOptions<TLUnknownBinding>]
>
const mockOnBeforeFromShapeIsolate = jest.fn() as jest.Mock<
	void,
	[BindingOnShapeIsolateOptions<TLUnknownBinding>]
>
const mockOnBeforeToShapeIsolate = jest.fn() as jest.Mock<
	void,
	[BindingOnShapeIsolateOptions<TLUnknownBinding>]
>
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

const calls: string[] = []

class TestBindingUtil extends BindingUtil {
	static override type = 'test'

	static override props = {}

	override getDefaultProps(): object {
		return {}
	}

	override onOperationComplete(): void {
		calls.push('onOperationComplete')
		mockOnOperationComplete()
	}

	override onBeforeDelete(options: BindingOnDeleteOptions<TLUnknownBinding>): void {
		calls.push('onBeforeDelete')
		mockOnBeforeDelete(options)
	}

	override onAfterDelete(options: BindingOnDeleteOptions<TLUnknownBinding>): void {
		calls.push('onAfterDelete')
		mockOnAfterDelete(options)
	}

	override onBeforeDeleteFromShape(options: BindingOnShapeDeleteOptions<TLUnknownBinding>): void {
		calls.push('onBeforeDeleteFromShape')
		mockOnBeforeFromShapeDelete(options)
	}

	override onBeforeDeleteToShape(options: BindingOnShapeDeleteOptions<TLUnknownBinding>): void {
		calls.push('onBeforeDeleteToShape')
		mockOnBeforeToShapeDelete(options)
	}

	override onBeforeIsolateFromShape(options: BindingOnShapeIsolateOptions<TLUnknownBinding>): void {
		calls.push('onBeforeIsolateFromShape')
		mockOnBeforeFromShapeIsolate(options)
	}

	override onBeforeIsolateToShape(options: BindingOnShapeIsolateOptions<TLUnknownBinding>): void {
		calls.push('onBeforeIsolateToShape')
		mockOnBeforeToShapeIsolate(options)
	}

	override onBeforeCreate(options: BindingOnCreateOptions<TLUnknownBinding>): void {
		calls.push('onBeforeCreate')
		mockOnBeforeCreate(options)
	}

	override onAfterCreate(options: BindingOnCreateOptions<TLUnknownBinding>): void {
		calls.push('onAfterCreate')
		mockOnAfterCreate(options)
	}

	override onBeforeChange(options: BindingOnChangeOptions<TLUnknownBinding>): void {
		calls.push('onBeforeChange')
		mockOnBeforeChange(options)
	}

	override onAfterChange(options: BindingOnChangeOptions<TLUnknownBinding>): void {
		calls.push('onAfterChange')
		mockOnAfterChange(options)
	}

	override onAfterChangeFromShape(options: BindingOnShapeChangeOptions<TLUnknownBinding>): void {
		calls.push('onAfterChangeFromShape')
		mockOnAfterChangeFromShape(options)
	}

	override onAfterChangeToShape(options: BindingOnShapeChangeOptions<TLUnknownBinding>): void {
		calls.push('onAfterChangeToShape')
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

	mockOnOperationComplete.mockReset()
	mockOnBeforeDelete.mockReset()
	mockOnAfterDelete.mockReset()
	mockOnBeforeFromShapeDelete.mockReset()
	mockOnBeforeToShapeDelete.mockReset()
	mockOnBeforeFromShapeIsolate.mockReset()
	mockOnBeforeToShapeIsolate.mockReset()
	mockOnBeforeCreate.mockReset()
	mockOnAfterCreate.mockReset()
	mockOnBeforeChange.mockReset()
	mockOnAfterChange.mockReset()
	mockOnAfterChangeFromShape.mockReset()
	mockOnAfterChangeToShape.mockReset()
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

test('deleting the from shape', () => {
	bindShapes(ids.box1, ids.box2)
	calls.length = 0
	editor.deleteShape(ids.box1)
	expect(calls).toMatchInlineSnapshot(`
		[
		  "onBeforeIsolateToShape",
		  "onBeforeDeleteFromShape",
		  "onBeforeDelete",
		  "onAfterDelete",
		  "onOperationComplete",
		]
	`)
})

test('deleting the to shape', () => {
	bindShapes(ids.box1, ids.box2)
	calls.length = 0
	editor.deleteShape(ids.box2)
	expect(calls).toMatchInlineSnapshot(`
		[
		  "onBeforeIsolateFromShape",
		  "onBeforeDeleteToShape",
		  "onBeforeDelete",
		  "onAfterDelete",
		  "onOperationComplete",
		]
	`)
})

test('deleting the binding', () => {
	const bindingId = bindShapes(ids.box1, ids.box2)
	calls.length = 0
	editor.deleteBinding(bindingId)
	expect(calls).toMatchInlineSnapshot(`
		[
		  "onBeforeDelete",
		  "onAfterDelete",
		  "onOperationComplete",
		]
	`)
})

test('deleting the binding while isolating', () => {
	const bindingId = bindShapes(ids.box1, ids.box2)
	calls.length = 0
	editor.deleteBinding(bindingId, { isolateShapes: true })
	expect(calls).toMatchInlineSnapshot(`
		[
		  "onBeforeIsolateFromShape",
		  "onBeforeIsolateToShape",
		  "onBeforeDelete",
		  "onAfterDelete",
		  "onOperationComplete",
		]
	`)
})

test('copying both bound shapes does not trigger the isolation operations', () => {
	bindShapes(ids.box1, ids.box2)
	editor.select(ids.box1, ids.box2)
	calls.length = 0
	editor.copy()
	expect(calls).toMatchInlineSnapshot(`[]`)
})

test('copying the from shape on its own does trigger isolation operations', () => {
	bindShapes(ids.box1, ids.box2)
	editor.select(ids.box1)
	calls.length = 0
	editor.copy()
	expect(calls).toMatchInlineSnapshot(`
		[
		  "onBeforeIsolateFromShape",
		  "onBeforeIsolateToShape",
		  "onBeforeDelete",
		  "onAfterDelete",
		  "onOperationComplete",
		  "onBeforeCreate",
		  "onAfterCreate",
		  "onOperationComplete",
		]
	`)
})

test('copying the to shape on its own does trigger the unbind operation', () => {
	bindShapes(ids.box1, ids.box2)
	editor.select(ids.box2)
	calls.length = 0
	editor.copy()
	expect(calls).toMatchInlineSnapshot(`
		[
		  "onBeforeIsolateFromShape",
		  "onBeforeIsolateToShape",
		  "onBeforeDelete",
		  "onAfterDelete",
		  "onOperationComplete",
		  "onBeforeCreate",
		  "onAfterCreate",
		  "onOperationComplete",
		]
	`)
})

test('cascading deletes in beforeFromShapeDelete are handled correctly', () => {
	mockOnBeforeFromShapeDelete.mockImplementation((options) => {
		editor.deleteShape(options.binding.toId)
	})

	bindShapes(ids.box1, ids.box2)
	bindShapes(ids.box2, ids.box3)
	bindShapes(ids.box3, ids.box4)

	calls.length = 0
	editor.deleteShape(ids.box1)

	expect(editor.getShape(ids.box1)).toBeUndefined()
	expect(editor.getShape(ids.box2)).toBeUndefined()
	expect(editor.getShape(ids.box3)).toBeUndefined()
	expect(editor.getShape(ids.box4)).toBeUndefined()

	expect(calls).toMatchInlineSnapshot(`
		[
		  "onBeforeIsolateToShape",
		  "onBeforeDeleteFromShape",
		  "onBeforeIsolateFromShape",
		  "onBeforeDeleteToShape",
		  "onBeforeIsolateToShape",
		  "onBeforeDeleteFromShape",
		  "onBeforeIsolateFromShape",
		  "onBeforeDeleteToShape",
		  "onBeforeIsolateToShape",
		  "onBeforeDeleteFromShape",
		  "onBeforeIsolateFromShape",
		  "onBeforeDeleteToShape",
		  "onBeforeDelete",
		  "onBeforeDelete",
		  "onBeforeDelete",
		  "onAfterDelete",
		  "onAfterDelete",
		  "onAfterDelete",
		  "onOperationComplete",
		]
	`)
})

test('cascading deletes in beforeToShapeDelete are handled correctly', () => {
	mockOnBeforeToShapeDelete.mockImplementation((options) => {
		editor.deleteShape(options.binding.fromId)
	})

	bindShapes(ids.box1, ids.box2)
	bindShapes(ids.box2, ids.box3)
	bindShapes(ids.box3, ids.box4)

	calls.length = 0
	editor.deleteShape(ids.box4)

	expect(editor.getShape(ids.box1)).toBeUndefined()
	expect(editor.getShape(ids.box2)).toBeUndefined()
	expect(editor.getShape(ids.box3)).toBeUndefined()
	expect(editor.getShape(ids.box4)).toBeUndefined()

	expect(calls).toMatchInlineSnapshot(`
		[
		  "onBeforeIsolateFromShape",
		  "onBeforeDeleteToShape",
		  "onBeforeIsolateFromShape",
		  "onBeforeDeleteToShape",
		  "onBeforeIsolateFromShape",
		  "onBeforeDeleteToShape",
		  "onBeforeIsolateToShape",
		  "onBeforeDeleteFromShape",
		  "onBeforeDelete",
		  "onBeforeIsolateToShape",
		  "onBeforeDeleteFromShape",
		  "onBeforeDelete",
		  "onBeforeIsolateToShape",
		  "onBeforeDeleteFromShape",
		  "onBeforeDelete",
		  "onAfterDelete",
		  "onAfterDelete",
		  "onAfterDelete",
		  "onOperationComplete",
		]
	`)
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
