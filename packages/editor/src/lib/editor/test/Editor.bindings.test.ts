import {
	TLBinding,
	TLBindingCreate,
	TLBindingId,
	TLBindingUpdate,
	TLShapeId,
	createBindingId,
} from '@tldraw/tlschema'
import { vi } from 'vitest'
import {
	BindingOnDeleteOptions,
	BindingOnShapeIsolateOptions,
	BindingUtil,
	Geometry2d,
	RecordProps,
	Rectangle2d,
	ShapeUtil,
	T,
	TLShape,
	createShapeId,
} from '../../..'
import { TestEditor } from '../../test/TestEditor'

const BOX_TYPE = 'my-custom-shape'
import { TEST_BOX_TYPE as NO_BIND_TYPE } from '../../test/testShapeTypes'
// Augmenting TLGlobalBindingPropsMap from inside the editor package narrows TLBinding['type']
// for Editor.ts itself and breaks its typecheck, so the custom binding is cast instead
const BINDING_TYPE = 'bd-binding' as unknown as TLBinding['type']

declare module '@tldraw/tlschema' {
	export interface TLGlobalShapePropsMap {
		[BOX_TYPE]: { w: number; h: number; text: string | undefined; isFilled: boolean }
	}
}

type IBoxShape = TLShape<typeof BOX_TYPE>
type INoBindShape = TLShape<typeof NO_BIND_TYPE>

interface MyBindingProps {
	label: string
	weight: number
}

function create(partial: {
	id?: TLBindingId
	fromId: TLShapeId
	toId: TLShapeId
	props?: Partial<MyBindingProps>
}): TLBindingCreate {
	return { type: BINDING_TYPE, ...partial } as unknown as TLBindingCreate
}

function update(partial: {
	id: TLBindingId
	fromId?: TLShapeId
	toId?: TLShapeId
	props?: Partial<MyBindingProps>
}): TLBindingUpdate {
	return { type: BINDING_TYPE, ...partial } as unknown as TLBindingUpdate
}

class BoxShapeUtil extends ShapeUtil<IBoxShape> {
	static override type = BOX_TYPE
	static override props: RecordProps<IBoxShape> = {
		w: T.number,
		h: T.number,
		text: T.string.optional(),
		isFilled: T.boolean,
	}
	getDefaultProps(): IBoxShape['props'] {
		return { w: 100, h: 100, text: '', isFilled: true }
	}
	getGeometry(shape: IBoxShape): Geometry2d {
		return new Rectangle2d({ width: shape.props.w, height: shape.props.h, isFilled: true })
	}
	getIndicatorPath() {
		return undefined
	}
	component() {}
}

class NoBindShapeUtil extends ShapeUtil<INoBindShape> {
	static override type = NO_BIND_TYPE
	static override props: RecordProps<INoBindShape> = { w: T.number, h: T.number }
	getDefaultProps(): INoBindShape['props'] {
		return { w: 100, h: 100 }
	}
	getGeometry(shape: INoBindShape): Geometry2d {
		return new Rectangle2d({ width: shape.props.w, height: shape.props.h, isFilled: true })
	}
	override canBind() {
		return false
	}
	getIndicatorPath() {
		return undefined
	}
	component() {}
}

const isolateFromShape = vi.fn<(opts: BindingOnShapeIsolateOptions) => void>()
const isolateToShape = vi.fn<(opts: BindingOnShapeIsolateOptions) => void>()
const afterDelete = vi.fn<(opts: BindingOnDeleteOptions) => void>()

class MyBindingUtil extends BindingUtil<any> {
	static override type = BINDING_TYPE
	static override props = { label: T.string, weight: T.number }
	getDefaultProps(): MyBindingProps {
		return { label: 'default', weight: 1 }
	}
	override onBeforeIsolateFromShape(opts: BindingOnShapeIsolateOptions) {
		isolateFromShape(opts)
	}
	override onBeforeIsolateToShape(opts: BindingOnShapeIsolateOptions) {
		isolateToShape(opts)
	}
	override onAfterDelete(opts: BindingOnDeleteOptions) {
		afterDelete(opts)
	}
}

let editor: TestEditor

const ids = {
	a: createShapeId('a'),
	b: createShapeId('b'),
	c: createShapeId('c'),
	noBind: createShapeId('noBind'),
	binding: createBindingId('binding'),
	binding2: createBindingId('binding2'),
}

function bindingIds(): TLBindingId[] {
	return editor.store
		.allRecords()
		.filter((r) => r.typeName === 'binding')
		.map((r) => r.id) as any
}

beforeEach(() => {
	isolateFromShape.mockClear()
	isolateToShape.mockClear()
	afterDelete.mockClear()
	editor = new TestEditor({
		shapeUtils: [BoxShapeUtil, NoBindShapeUtil],
		bindingUtils: [MyBindingUtil],
	})
	editor.createShapes([
		{ id: ids.a, type: BOX_TYPE, x: 0, y: 0 },
		{ id: ids.b, type: BOX_TYPE, x: 200, y: 0 },
		{ id: ids.c, type: BOX_TYPE, x: 400, y: 0 },
		{ id: ids.noBind, type: NO_BIND_TYPE, x: 600, y: 0 },
	])
})

afterEach(() => {
	editor.dispose()
})

describe('createBinding', () => {
	it('creates a binding with a generated id and default props', () => {
		expect(editor.createBinding(create({ fromId: ids.a, toId: ids.b }))).toBe(editor)
		const [id] = bindingIds()
		expect(editor.getBinding(id)).toEqual({
			id,
			typeName: 'binding',
			type: BINDING_TYPE,
			fromId: ids.a,
			toId: ids.b,
			props: { label: 'default', weight: 1 },
			meta: {},
		})
	})

	it('uses the given id and merges the given props over the defaults', () => {
		editor.createBinding(
			create({ id: ids.binding, fromId: ids.a, toId: ids.b, props: { label: 'custom' } })
		)
		expect(editor.getBinding(ids.binding)).toMatchObject({
			id: ids.binding,
			props: { label: 'custom', weight: 1 },
		})
	})

	it('skips bindings whose shapes do not exist', () => {
		editor.createBindings([
			create({ id: ids.binding, fromId: ids.a, toId: createShapeId('missing') }),
			create({ id: ids.binding2, fromId: createShapeId('missing'), toId: ids.a }),
		])
		expect(bindingIds()).toEqual([])
	})

	it('skips bindings that the shape utils refuse', () => {
		editor.createBindings([
			create({ id: ids.binding, fromId: ids.a, toId: ids.noBind }),
			create({ id: ids.binding2, fromId: ids.noBind, toId: ids.a }),
		])
		expect(bindingIds()).toEqual([])
		expect(
			editor.canBindShapes({ fromShape: BOX_TYPE, toShape: NO_BIND_TYPE, binding: BINDING_TYPE })
		).toBe(false)
		expect(
			editor.canBindShapes({ fromShape: BOX_TYPE, toShape: BOX_TYPE, binding: BINDING_TYPE })
		).toBe(true)
	})

	it('creates several bindings at once', () => {
		editor.createBindings([
			create({ id: ids.binding, fromId: ids.a, toId: ids.b }),
			create({ id: ids.binding2, fromId: ids.a, toId: ids.c }),
		])
		expect(new Set(editor.getBindingsFromShape(ids.a, BINDING_TYPE).map((b) => b.id))).toEqual(
			new Set([ids.binding, ids.binding2])
		)
		expect(editor.getBindingsToShape(ids.b, BINDING_TYPE).map((b) => b.id)).toEqual([ids.binding])
		expect(editor.getBindingsInvolvingShape(ids.c).map((b) => b.id)).toEqual([ids.binding2])
		expect(editor.getBindingsInvolvingShape(ids.noBind)).toEqual([])
	})
})

describe('getBinding', () => {
	it('returns undefined for unknown ids', () => {
		expect(editor.getBinding(createBindingId('missing'))).toBeUndefined()
	})
})

describe('updateBinding', () => {
	beforeEach(() => {
		editor.createBinding(create({ id: ids.binding, fromId: ids.a, toId: ids.b }))
	})

	it('merges partial props into the existing binding', () => {
		expect(editor.updateBinding(update({ id: ids.binding, props: { weight: 5 } }))).toBe(editor)
		expect(editor.getBinding(ids.binding)).toMatchObject({
			fromId: ids.a,
			toId: ids.b,
			props: { label: 'default', weight: 5 },
		})
	})

	it('can re-point a binding at another shape', () => {
		editor.updateBinding(update({ id: ids.binding, toId: ids.c }))
		expect(editor.getBindingsToShape(ids.b, BINDING_TYPE)).toEqual([])
		expect(editor.getBindingsToShape(ids.c, BINDING_TYPE).map((b) => b.id)).toEqual([ids.binding])
	})

	it('skips unknown ids, null partials, and partials that change nothing', () => {
		const listener = vi.fn()
		const unlisten = editor.store.listen(listener, { scope: 'document' })
		editor.updateBindings([
			null,
			undefined,
			update({ id: createBindingId('missing'), props: { weight: 5 } }),
			update({ id: ids.binding, props: { weight: 1 } }),
		])
		unlisten()
		expect(listener).not.toHaveBeenCalled()
		expect(editor.getBinding(ids.binding)!.props).toEqual({ label: 'default', weight: 1 })
	})

	it('skips updates that would bind to a missing shape or one that refuses bindings', () => {
		editor.updateBinding(update({ id: ids.binding, toId: createShapeId('missing') }))
		expect(editor.getBinding(ids.binding)!.toId).toBe(ids.b)
		editor.updateBinding(update({ id: ids.binding, toId: ids.noBind }))
		expect(editor.getBinding(ids.binding)!.toId).toBe(ids.b)
	})
})

describe('deleteBinding', () => {
	beforeEach(() => {
		editor.createBindings([
			create({ id: ids.binding, fromId: ids.a, toId: ids.b }),
			create({ id: ids.binding2, fromId: ids.b, toId: ids.c }),
		])
	})

	it('removes the binding by id or by record', () => {
		expect(editor.deleteBinding(ids.binding)).toBe(editor)
		editor.deleteBinding(editor.getBinding(ids.binding2)!)
		expect(bindingIds()).toEqual([])
		expect(editor.getBindingsInvolvingShape(ids.b)).toEqual([])
		expect(afterDelete).toHaveBeenCalledTimes(2)
	})

	it('ignores unknown ids', () => {
		editor.deleteBindings([createBindingId('missing'), ids.binding])
		expect(bindingIds()).toEqual([ids.binding2])
	})

	it('does not run the isolation callbacks by default', () => {
		editor.deleteBinding(ids.binding)
		expect(isolateFromShape).not.toHaveBeenCalled()
		expect(isolateToShape).not.toHaveBeenCalled()
	})

	it('runs the isolation callbacks with the shape being removed when isolateShapes is set', () => {
		editor.deleteBinding(ids.binding, { isolateShapes: true })
		expect(bindingIds()).toEqual([ids.binding2])
		expect(isolateFromShape).toHaveBeenCalledTimes(1)
		expect(isolateFromShape.mock.calls[0][0]).toMatchObject({
			binding: { id: ids.binding },
			removedShape: { id: ids.b },
		})
		expect(isolateToShape).toHaveBeenCalledTimes(1)
		expect(isolateToShape.mock.calls[0][0]).toMatchObject({
			binding: { id: ids.binding },
			removedShape: { id: ids.a },
		})
	})

	it('removes bindings when either bound shape is deleted', () => {
		editor.deleteShape(ids.b)
		expect(bindingIds()).toEqual([])
	})
})

describe('bindings in content and duplicates', () => {
	beforeEach(() => {
		editor.createBindings([
			create({ id: ids.binding, fromId: ids.a, toId: ids.b }),
			create({ id: ids.binding2, fromId: ids.b, toId: ids.c }),
		])
	})

	it('only exports bindings whose shapes are both included, leaving the store untouched', () => {
		const content = editor.getContentFromCurrentPage([ids.a, ids.b])!
		expect(content.bindings!.map((b) => b.id)).toEqual([ids.binding])
		expect(content.shapes.map((s) => s.id)).toEqual([ids.a, ids.b])
		// the binding to c was isolated for the export, and the store was put back afterwards
		expect(isolateFromShape).toHaveBeenCalledTimes(1)
		expect(isolateFromShape.mock.calls[0][0]).toMatchObject({
			binding: { id: ids.binding2 },
			removedShape: { id: ids.c },
		})
		expect(new Set(bindingIds())).toEqual(new Set([ids.binding, ids.binding2]))
		expect(editor.getBinding(ids.binding2)).toMatchObject({ fromId: ids.b, toId: ids.c })
	})

	it('duplicates bindings between duplicated shapes and drops the others', () => {
		editor.duplicateShapes([ids.a, ids.b], { x: 10, y: 10 })
		const [newA, newB] = editor.getSelectedShapeIds()
		const newBindings = editor.getBindingsInvolvingShape(newA)
		expect(newBindings).toHaveLength(1)
		expect(newBindings[0]).toMatchObject({
			type: BINDING_TYPE,
			fromId: newA,
			toId: newB,
			props: { label: 'default', weight: 1 },
		})
		expect(newBindings[0].id).not.toBe(ids.binding)
		// b's binding to c was not duplicated because c was not duplicated
		expect(editor.getBindingsInvolvingShape(newB)).toHaveLength(1)
		expect(editor.getBindingsInvolvingShape(ids.c).map((b) => b.id)).toEqual([ids.binding2])
	})
})
