import { react } from '@tldraw/state'
import {
	RecordProps,
	TLBinding,
	TLShape,
	TLShapeId,
	createBindingId,
	createShapeId,
} from '@tldraw/tlschema'
import { T } from '@tldraw/validate'
import { Rectangle2d } from '../../primitives/geometry/Rectangle2d'
import { TestEditor } from '../../test/TestEditor'
import { TEST_BOX_TYPE as BOX } from '../../test/testShapeTypes'
import { BindingUtil } from '../bindings/BindingUtil'
import { ShapeUtil } from '../shapes/ShapeUtil'
import { bindingsIndex } from './bindingsIndex'
// Augmenting TLGlobalBindingPropsMap from inside the editor package narrows
// TLBinding['type'] for Editor.ts itself and breaks its typecheck, so the
// custom binding types are untyped here.
const LINK = 'link' as unknown as TLBinding['type']
const TAG = 'tag' as unknown as TLBinding['type']

type BoxShape = TLShape<typeof BOX>

class BoxShapeUtil extends ShapeUtil<BoxShape> {
	static override type = BOX
	static override props: RecordProps<BoxShape> = { w: T.number, h: T.number }
	getDefaultProps(): BoxShape['props'] {
		return { w: 10, h: 10 }
	}
	getGeometry(shape: BoxShape) {
		return new Rectangle2d({ width: shape.props.w, height: shape.props.h, isFilled: true })
	}
	getIndicatorPath() {
		return undefined
	}
	component() {}
}

class LinkBindingUtil extends BindingUtil {
	static override type = LINK
	static override props = {}
	getDefaultProps(): object {
		return {}
	}
}

class TagBindingUtil extends BindingUtil {
	static override type = TAG
	static override props = {}
	getDefaultProps(): object {
		return {}
	}
}

const ids = {
	a: createShapeId('a'),
	b: createShapeId('b'),
	c: createShapeId('c'),
	d: createShapeId('d'),
	ab: createBindingId('ab'),
	bc: createBindingId('bc'),
	ac: createBindingId('ac'),
}

let editor: TestEditor

beforeEach(() => {
	editor = new TestEditor({
		shapeUtils: [BoxShapeUtil],
		bindingUtils: [LinkBindingUtil, TagBindingUtil],
	})
	editor.createShapes<BoxShape>([
		{ id: ids.a, type: BOX, x: 0, y: 0 },
		{ id: ids.b, type: BOX, x: 100, y: 0 },
		{ id: ids.c, type: BOX, x: 200, y: 0 },
		{ id: ids.d, type: BOX, x: 300, y: 0 },
	])
})

afterEach(() => {
	editor.dispose()
})

function link(id: TLBinding['id'], fromId: TLShapeId, toId: TLShapeId, label = '') {
	editor.createBinding({ id, type: LINK, fromId, toId, meta: { label } })
	return editor.getBinding(id)!
}

function involving(shapeId: TLShapeId) {
	return editor
		.getBindingsInvolvingShape(shapeId)
		.map((b) => b.id)
		.sort()
}

// Serialises the index into something comparable across from-scratch and
// incremental computations.
function snapshot(index: Map<TLShapeId, TLBinding[]>) {
	return Object.fromEntries(
		[...index.entries()]
			.map(([shapeId, bindings]) => [shapeId, bindings.map((b) => b.id).sort()] as const)
			.sort(([x], [y]) => (x < y ? -1 : 1))
	)
}

describe('editor binding lookups', () => {
	it('returns nothing for shapes without bindings', () => {
		expect(editor.getBindingsInvolvingShape(ids.a)).toEqual([])
		expect(editor.getBindingsFromShape(ids.a, LINK)).toEqual([])
		expect(editor.getBindingsToShape(ids.a, LINK)).toEqual([])
	})

	it('indexes a binding under both of its shapes', () => {
		const ab = link(ids.ab, ids.a, ids.b, 'hello')

		expect(editor.getBindingsInvolvingShape(ids.a)).toEqual([ab])
		expect(editor.getBindingsInvolvingShape(editor.getShape(ids.b)!)).toEqual([ab])
		expect(editor.getBindingsInvolvingShape(ids.c)).toEqual([])

		expect(editor.getBindingsFromShape(ids.a, LINK)).toEqual([ab])
		expect(editor.getBindingsToShape(ids.a, LINK)).toEqual([])
		expect(editor.getBindingsFromShape(ids.b, LINK)).toEqual([])
		expect(editor.getBindingsToShape(ids.b, LINK)).toEqual([ab])
	})

	it('filters by binding type', () => {
		link(ids.ab, ids.a, ids.b)
		editor.createBinding({ id: ids.ac, type: TAG, fromId: ids.a, toId: ids.c })

		expect(involving(ids.a)).toEqual([ids.ab, ids.ac])
		expect(editor.getBindingsInvolvingShape(ids.a, LINK).map((b) => b.id)).toEqual([ids.ab])
		expect(editor.getBindingsInvolvingShape(ids.a, TAG).map((b) => b.id)).toEqual([ids.ac])
		expect(editor.getBindingsFromShape(ids.a, TAG).map((b) => b.id)).toEqual([ids.ac])
	})

	it('reflects record updates in the indexed bindings', () => {
		link(ids.ab, ids.a, ids.b, 'before')
		editor.updateBinding({ id: ids.ab, type: LINK, meta: { label: 'after' } })

		expect(editor.getBindingsInvolvingShape(ids.a)).toEqual([editor.getBinding(ids.ab)])
		expect(editor.getBindingsInvolvingShape(ids.a)[0].meta).toEqual({ label: 'after' })
	})

	it('moves a binding when its toId changes', () => {
		link(ids.ab, ids.a, ids.b)
		editor.updateBinding({ id: ids.ab, type: LINK, toId: ids.c })

		expect(involving(ids.a)).toEqual([ids.ab])
		expect(involving(ids.b)).toEqual([])
		expect(involving(ids.c)).toEqual([ids.ab])
		expect(editor.getBindingsToShape(ids.c, LINK).map((b) => b.id)).toEqual([ids.ab])
	})

	it('moves a binding when its fromId changes', () => {
		link(ids.ab, ids.a, ids.b)
		editor.updateBinding({ id: ids.ab, type: LINK, fromId: ids.c })

		expect(involving(ids.a)).toEqual([])
		expect(involving(ids.b)).toEqual([ids.ab])
		expect(involving(ids.c)).toEqual([ids.ab])
	})

	it('moves a binding when both ends change at once', () => {
		link(ids.ab, ids.a, ids.b)
		editor.updateBinding({ id: ids.ab, type: LINK, fromId: ids.c, toId: ids.d })

		expect(involving(ids.a)).toEqual([])
		expect(involving(ids.b)).toEqual([])
		expect(involving(ids.c)).toEqual([ids.ab])
		expect(involving(ids.d)).toEqual([ids.ab])
	})

	it('drops bindings when they are deleted', () => {
		link(ids.ab, ids.a, ids.b)
		link(ids.bc, ids.b, ids.c)
		editor.deleteBinding(ids.ab)

		expect(involving(ids.a)).toEqual([])
		expect(involving(ids.b)).toEqual([ids.bc])
		expect(involving(ids.c)).toEqual([ids.bc])
	})

	it('drops bindings when one of their shapes is deleted', () => {
		link(ids.ab, ids.a, ids.b)
		link(ids.bc, ids.b, ids.c)
		editor.deleteShape(ids.b)

		expect(editor.getBinding(ids.ab)).toBeUndefined()
		expect(editor.getBinding(ids.bc)).toBeUndefined()
		expect(involving(ids.a)).toEqual([])
		expect(involving(ids.c)).toEqual([])
	})

	it('is reactive', () => {
		const seen: string[][] = []
		const stop = react('bindings', () => {
			seen.push(involving(ids.b))
		})

		link(ids.ab, ids.a, ids.b)
		link(ids.bc, ids.b, ids.c)
		editor.updateBinding({ id: ids.bc, type: LINK, fromId: ids.d })
		editor.deleteBinding(ids.ab)

		expect(seen).toEqual([[], [ids.ab], [ids.ab, ids.bc], [ids.ab], []])
		stop()
	})
})

describe('bindingsIndex', () => {
	it('builds the full index from scratch', () => {
		link(ids.ab, ids.a, ids.b)
		link(ids.bc, ids.b, ids.c)

		expect(snapshot(bindingsIndex(editor).get())).toEqual({
			[ids.a]: [ids.ab],
			[ids.b]: [ids.ab, ids.bc],
			[ids.c]: [ids.bc],
		})
	})

	it('is empty when there are no bindings', () => {
		expect(bindingsIndex(editor).get().size).toBe(0)
	})

	describe('incremental updates', () => {
		let index: ReturnType<typeof bindingsIndex>
		let stop: () => void

		// A live reactor keeps the computed subscribed, so each change after
		// the first read goes through the diff-based update rather than a
		// rebuild. Every assertion also cross-checks against a fresh rebuild.
		beforeEach(() => {
			index = bindingsIndex(editor)
			stop = react('keep index alive', () => index.get())
		})

		afterEach(() => {
			stop()
		})

		function expectIndexToMatchFreshBuild() {
			expect(snapshot(index.get())).toEqual(snapshot(bindingsIndex(editor).get()))
		}

		it('adds new bindings', () => {
			link(ids.ab, ids.a, ids.b)
			expect(snapshot(index.get())).toEqual({ [ids.a]: [ids.ab], [ids.b]: [ids.ab] })

			link(ids.bc, ids.b, ids.c)
			expect(snapshot(index.get())).toEqual({
				[ids.a]: [ids.ab],
				[ids.b]: [ids.ab, ids.bc],
				[ids.c]: [ids.bc],
			})
			expectIndexToMatchFreshBuild()
		})

		it('does not mutate arrays from the previous index value', () => {
			link(ids.ab, ids.a, ids.b)
			const before = index.get()
			const beforeB = before.get(ids.b)!

			link(ids.bc, ids.b, ids.c)

			expect(beforeB).toHaveLength(1)
			expect(before.get(ids.c)).toBeUndefined()
			expect(index.get()).not.toBe(before)
			expect(index.get().get(ids.a)).toBe(before.get(ids.a))
		})

		it('removes deleted bindings and prunes empty shape entries', () => {
			link(ids.ab, ids.a, ids.b)
			link(ids.bc, ids.b, ids.c)
			index.get()

			editor.deleteBinding(ids.ab)
			expect(snapshot(index.get())).toEqual({ [ids.b]: [ids.bc], [ids.c]: [ids.bc] })
			expectIndexToMatchFreshBuild()

			editor.deleteBinding(ids.bc)
			expect(index.get().size).toBe(0)
			expectIndexToMatchFreshBuild()
		})

		it('re-homes bindings whose from or to shape changes', () => {
			link(ids.ab, ids.a, ids.b)
			index.get()

			editor.updateBinding({ id: ids.ab, type: LINK, toId: ids.c })
			expect(snapshot(index.get())).toEqual({ [ids.a]: [ids.ab], [ids.c]: [ids.ab] })
			expectIndexToMatchFreshBuild()

			editor.updateBinding({ id: ids.ab, type: LINK, fromId: ids.d })
			expect(snapshot(index.get())).toEqual({ [ids.c]: [ids.ab], [ids.d]: [ids.ab] })
			expectIndexToMatchFreshBuild()
		})

		it('replaces the record on updates that keep both ends', () => {
			link(ids.ab, ids.a, ids.b, 'before')
			index.get()

			editor.updateBinding({ id: ids.ab, type: LINK, meta: { label: 'after' } })

			const entry = index.get().get(ids.a)!
			expect(entry).toHaveLength(1)
			expect(entry[0]).toBe(editor.getBinding(ids.ab))
			expect(entry[0].meta).toEqual({ label: 'after' })
			expectIndexToMatchFreshBuild()
		})

		it('handles a batch of mixed changes in one transaction', () => {
			link(ids.ab, ids.a, ids.b)
			link(ids.bc, ids.b, ids.c)
			index.get()

			editor.run(() => {
				editor.deleteBinding(ids.ab)
				editor.updateBinding({ id: ids.bc, type: LINK, toId: ids.d })
				link(ids.ac, ids.a, ids.c)
			})

			expect(snapshot(index.get())).toEqual({
				[ids.a]: [ids.ac],
				[ids.b]: [ids.bc],
				[ids.c]: [ids.ac],
				[ids.d]: [ids.bc],
			})
			expectIndexToMatchFreshBuild()
		})

		it('follows shape deletion through the binding side effects', () => {
			link(ids.ab, ids.a, ids.b)
			link(ids.bc, ids.b, ids.c)
			index.get()

			editor.deleteShape(ids.b)

			expect(index.get().size).toBe(0)
			expectIndexToMatchFreshBuild()
		})

		it('returns the same map instance when nothing binding-related changed', () => {
			link(ids.ab, ids.a, ids.b)
			const before = index.get()

			editor.updateShape<BoxShape>({ id: ids.a, type: BOX, x: 999 })
			editor.createShape<BoxShape>({ id: createShapeId('e'), type: BOX })

			expect(index.get()).toBe(before)
		})
	})
})
