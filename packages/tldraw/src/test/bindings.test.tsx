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
import { vi } from 'vitest'
import { TestEditor } from './TestEditor'
import { TL } from './test-jsx'

let editor: TestEditor

const ids = {
	box1: createShapeId('box1'),
	box2: createShapeId('box2'),
	box3: createShapeId('box3'),
	box4: createShapeId('box4'),
}

const mockOnOperationComplete = vi.fn()
const mockOnBeforeDelete = vi.fn()
const mockOnAfterDelete = vi.fn()
const mockOnBeforeFromShapeDelete = vi.fn()
const mockOnBeforeToShapeDelete = vi.fn()
const mockOnBeforeFromShapeIsolate = vi.fn()
const mockOnBeforeToShapeIsolate = vi.fn()
const mockOnBeforeCreate = vi.fn()
const mockOnAfterCreate = vi.fn()
const mockOnBeforeChange = vi.fn()
const mockOnAfterChange = vi.fn()
const mockOnAfterChangeFromShape = vi.fn()
const mockOnAfterChangeToShape = vi.fn()

const calls: string[] = []

const registerCall = (method: string, binding: TLUnknownBinding) => {
	calls.push(
		`${method}: ${binding.fromId.slice('shape:'.length)}->${binding.toId.slice('shape:'.length)}`
	)
}

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
		registerCall('onBeforeDelete', options.binding)
		mockOnBeforeDelete(options)
	}

	override onAfterDelete(options: BindingOnDeleteOptions<TLUnknownBinding>): void {
		registerCall('onAfterDelete', options.binding)
		mockOnAfterDelete(options)
	}

	override onBeforeDeleteFromShape(options: BindingOnShapeDeleteOptions<TLUnknownBinding>): void {
		registerCall('onBeforeDeleteFromShape', options.binding)
		mockOnBeforeFromShapeDelete(options)
	}

	override onBeforeDeleteToShape(options: BindingOnShapeDeleteOptions<TLUnknownBinding>): void {
		registerCall('onBeforeDeleteToShape', options.binding)
		mockOnBeforeToShapeDelete(options)
	}

	override onBeforeIsolateFromShape(options: BindingOnShapeIsolateOptions<TLUnknownBinding>): void {
		registerCall('onBeforeIsolateFromShape', options.binding)
		mockOnBeforeFromShapeIsolate(options)
	}

	override onBeforeIsolateToShape(options: BindingOnShapeIsolateOptions<TLUnknownBinding>): void {
		registerCall('onBeforeIsolateToShape', options.binding)
		mockOnBeforeToShapeIsolate(options)
	}

	override onBeforeCreate(options: BindingOnCreateOptions<TLUnknownBinding>): void {
		registerCall('onBeforeCreate', options.binding)
		mockOnBeforeCreate(options)
	}

	override onAfterCreate(options: BindingOnCreateOptions<TLUnknownBinding>): void {
		registerCall('onAfterCreate', options.binding)
		mockOnAfterCreate(options)
	}

	override onBeforeChange(options: BindingOnChangeOptions<TLUnknownBinding>): void {
		registerCall('onBeforeChange', options.bindingAfter)
		mockOnBeforeChange(options)
	}

	override onAfterChange(options: BindingOnChangeOptions<TLUnknownBinding>): void {
		registerCall('onAfterChange', options.bindingAfter)
		mockOnAfterChange(options)
	}

	override onAfterChangeFromShape(options: BindingOnShapeChangeOptions<TLUnknownBinding>): void {
		registerCall('onAfterChangeFromShape', options.binding)
		mockOnAfterChangeFromShape(options)
	}

	override onAfterChangeToShape(options: BindingOnShapeChangeOptions<TLUnknownBinding>): void {
		registerCall('onAfterChangeToShape', options.binding)
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
		  "onBeforeIsolateToShape: box1->box2",
		  "onBeforeDeleteFromShape: box1->box2",
		  "onBeforeDelete: box1->box2",
		  "onAfterDelete: box1->box2",
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
		  "onBeforeIsolateFromShape: box1->box2",
		  "onBeforeDeleteToShape: box1->box2",
		  "onBeforeDelete: box1->box2",
		  "onAfterDelete: box1->box2",
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
		  "onBeforeDelete: box1->box2",
		  "onAfterDelete: box1->box2",
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
		  "onBeforeIsolateFromShape: box1->box2",
		  "onBeforeIsolateToShape: box1->box2",
		  "onBeforeDelete: box1->box2",
		  "onAfterDelete: box1->box2",
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
		  "onBeforeIsolateFromShape: box1->box2",
		  "onBeforeIsolateToShape: box1->box2",
		  "onBeforeDelete: box1->box2",
		  "onAfterDelete: box1->box2",
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
		  "onBeforeIsolateFromShape: box1->box2",
		  "onBeforeIsolateToShape: box1->box2",
		  "onBeforeDelete: box1->box2",
		  "onAfterDelete: box1->box2",
		  "onOperationComplete",
		]
	`)
})

test('cascading deletes in beforeFromShapeDelete are handled correctly', () => {
	mockOnBeforeFromShapeDelete.mockImplementation(
		(options: BindingOnShapeDeleteOptions<TLUnknownBinding>) => {
			editor.deleteShape(options.binding.toId)
		}
	)

	bindShapes(ids.box1, ids.box2)
	bindShapes(ids.box2, ids.box3)
	bindShapes(ids.box3, ids.box4)

	calls.length = 0
	editor.deleteShape(ids.box1)

	expect(editor.getShape(ids.box1)).toBeUndefined()
	expect(editor.getShape(ids.box2)).toBeUndefined()
	expect(editor.getShape(ids.box3)).toBeUndefined()
	expect(editor.getShape(ids.box4)).toBeUndefined()

	expect(calls.at(-1)).toBe('onOperationComplete')

	expect(
		[
			'onBeforeIsolateToShape: box1->box2',
			'onBeforeDeleteFromShape: box1->box2',
			'onBeforeIsolateFromShape: box1->box2',
			'onBeforeDeleteToShape: box1->box2',
			'onBeforeIsolateToShape: box2->box3',
			'onBeforeDeleteFromShape: box2->box3',
			'onBeforeIsolateToShape: box3->box4',
			'onBeforeDeleteFromShape: box3->box4',
			'onBeforeIsolateFromShape: box3->box4',
			'onBeforeDeleteToShape: box3->box4',
			'onBeforeDelete: box3->box4',
			'onBeforeIsolateFromShape: box2->box3',
			'onBeforeDeleteToShape: box2->box3',
			'onBeforeDelete: box2->box3',
			'onBeforeDelete: box1->box2',
			'onAfterDelete: box3->box4',
			'onAfterDelete: box2->box3',
			'onAfterDelete: box1->box2',
		].every((call) => calls.includes(call))
	).toBe(true)
})

test('cascading deletes in beforeToShapeDelete are handled correctly', () => {
	mockOnBeforeToShapeDelete.mockImplementation(
		(options: BindingOnShapeDeleteOptions<TLUnknownBinding>) => {
			editor.deleteShape(options.binding.fromId)
		}
	)

	bindShapes(ids.box1, ids.box2)
	bindShapes(ids.box2, ids.box3)
	bindShapes(ids.box3, ids.box4)

	calls.length = 0
	editor.deleteShape(ids.box4)

	expect(editor.getShape(ids.box1)).toBeUndefined()
	expect(editor.getShape(ids.box2)).toBeUndefined()
	expect(editor.getShape(ids.box3)).toBeUndefined()
	expect(editor.getShape(ids.box4)).toBeUndefined()

	expect(calls.at(-1)).toBe('onOperationComplete')

	expect(
		[
			'onBeforeIsolateFromShape: box3->box4',
			'onBeforeDeleteToShape: box3->box4',
			'onBeforeIsolateFromShape: box2->box3',
			'onBeforeDeleteToShape: box2->box3',
			'onBeforeIsolateFromShape: box1->box2',
			'onBeforeDeleteToShape: box1->box2',
			'onBeforeIsolateToShape: box1->box2',
			'onBeforeDeleteFromShape: box1->box2',
			'onBeforeDelete: box1->box2',
			'onBeforeIsolateToShape: box2->box3',
			'onBeforeDeleteFromShape: box2->box3',
			'onBeforeDelete: box2->box3',
			'onBeforeIsolateToShape: box3->box4',
			'onBeforeDeleteFromShape: box3->box4',
			'onBeforeDelete: box3->box4',
			'onAfterDelete: box1->box2',
			'onAfterDelete: box2->box3',
			'onAfterDelete: box3->box4',
			'onOperationComplete',
		].every((call) => calls.includes(call))
	).toBe(true)
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
