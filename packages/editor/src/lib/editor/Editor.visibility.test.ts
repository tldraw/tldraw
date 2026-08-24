import {
	Geometry2d,
	RecordProps,
	Rectangle2d,
	ShapeUtil,
	T,
	TLShape,
	TLShapeId,
	TLUserPreferences,
	atom,
	createShapeId,
	createTLCurrentUser,
	createTLStore,
	react,
} from '../..'
import { Editor, TLEditorOptions } from './Editor'

const MY_CUSTOM_SHAPE_TYPE = 'my-custom-shape'

declare module '@tldraw/tlschema' {
	export interface TLGlobalShapePropsMap {
		[MY_CUSTOM_SHAPE_TYPE]: { w: number; h: number; text: string | undefined; isFilled: boolean }
	}
}

type TestBox = TLShape<typeof MY_CUSTOM_SHAPE_TYPE>

class TestBoxUtil extends ShapeUtil<TestBox> {
	static override type = MY_CUSTOM_SHAPE_TYPE
	static override props: RecordProps<TestBox> = {
		w: T.number,
		h: T.number,
		text: T.string.optional(),
		isFilled: T.boolean,
	}
	getDefaultProps(): TestBox['props'] {
		return { w: 100, h: 100, text: '', isFilled: false }
	}
	getGeometry(shape: TestBox): Geometry2d {
		return new Rectangle2d({ width: shape.props.w, height: shape.props.h, isFilled: true })
	}
	getIndicatorPath() {
		return undefined
	}
	component() {}
}

function createIsolatedUser() {
	const userPreferences = atom<TLUserPreferences>('prefs', { id: 'me' })
	return createTLCurrentUser({
		userPreferences,
		setUserPreferences: (prefs) => userPreferences.set(prefs),
	})
}

function createEditor(opts: Partial<TLEditorOptions> = {}) {
	return new Editor({
		shapeUtils: [TestBoxUtil],
		bindingUtils: [],
		tools: [],
		store: createTLStore({ shapeUtils: [TestBoxUtil], bindingUtils: [] }),
		getContainer: () => document.body,
		user: createIsolatedUser(),
		...opts,
	})
}

// outer group > inner group > leaf, plus a top-level sibling
const ids = {
	outer: createShapeId('outer'),
	inner: createShapeId('inner'),
	leaf: createShapeId('leaf'),
	leaf2: createShapeId('leaf2'),
	sibling: createShapeId('sibling'),
	top: createShapeId('top'),
}

let editor: Editor

function setVisibility(id: TLShapeId, visibility: string | null | undefined) {
	// meta must be json, so "undefined" means leaving the key out
	const meta = visibility === undefined ? {} : { visibility }
	editor.updateShape({ ...editor.getShape(id)!, meta })
}

beforeEach(() => {
	editor = createEditor({
		getShapeVisibility: (shape) => shape.meta.visibility as any,
	})
	editor.createShapes([
		{ id: ids.outer, type: 'group' },
		{ id: ids.inner, type: 'group', parentId: ids.outer },
		{ id: ids.sibling, type: MY_CUSTOM_SHAPE_TYPE, parentId: ids.outer, x: 300 },
		{ id: ids.leaf, type: MY_CUSTOM_SHAPE_TYPE, parentId: ids.inner },
		{ id: ids.leaf2, type: MY_CUSTOM_SHAPE_TYPE, parentId: ids.inner, x: 150 },
		{ id: ids.top, type: MY_CUSTOM_SHAPE_TYPE, x: 600 },
	])
})

afterEach(() => {
	editor.dispose()
})

describe('isShapeHidden', () => {
	it('is always false when no getShapeVisibility option is provided', () => {
		editor.dispose()
		editor = createEditor()
		editor.createShape({ id: ids.top, type: MY_CUSTOM_SHAPE_TYPE, meta: { visibility: 'hidden' } })
		expect(editor.isShapeHidden(ids.top)).toBe(false)
	})

	it('only hides shapes whose visibility resolves to hidden', () => {
		expect(editor.isShapeHidden(ids.top)).toBe(false)
		for (const value of ['inherit', 'visible', undefined, null]) {
			setVisibility(ids.top, value)
			expect(editor.isShapeHidden(ids.top)).toBe(false)
		}
		setVisibility(ids.top, 'hidden')
		expect(editor.isShapeHidden(ids.top)).toBe(true)
		expect(editor.isShapeHidden(editor.getShape(ids.top)!)).toBe(true)
	})

	it('hides descendants of a hidden ancestor', () => {
		setVisibility(ids.outer, 'hidden')
		expect(editor.isShapeHidden(ids.outer)).toBe(true)
		expect(editor.isShapeHidden(ids.inner)).toBe(true)
		expect(editor.isShapeHidden(ids.sibling)).toBe(true)
		expect(editor.isShapeHidden(ids.leaf)).toBe(true)
		expect(editor.isShapeHidden(ids.top)).toBe(false)
	})

	it('lets a descendant opt back in with visible', () => {
		setVisibility(ids.outer, 'hidden')
		setVisibility(ids.inner, 'visible')
		expect(editor.isShapeHidden(ids.inner)).toBe(false)
		// the leaf inherits from its visible parent, not the hidden grandparent
		expect(editor.isShapeHidden(ids.leaf)).toBe(false)
		expect(editor.isShapeHidden(ids.sibling)).toBe(true)

		setVisibility(ids.leaf, 'hidden')
		expect(editor.isShapeHidden(ids.leaf)).toBe(true)
		expect(editor.isShapeHidden(ids.leaf2)).toBe(false)
	})

	it('a hidden child does not hide its parent or siblings', () => {
		setVisibility(ids.leaf, 'hidden')
		expect(editor.isShapeHidden(ids.inner)).toBe(false)
		expect(editor.isShapeHidden(ids.outer)).toBe(false)
		expect(editor.isShapeHidden(ids.leaf2)).toBe(false)
	})

	it('is reactive to the callback inputs', () => {
		const hiddenIds = atom('hidden ids', new Set<TLShapeId>())
		editor.dispose()
		editor = createEditor({
			getShapeVisibility: (shape) => (hiddenIds.get().has(shape.id) ? 'hidden' : 'inherit'),
		})
		editor.createShapes([
			{ id: ids.outer, type: 'group' },
			{ id: ids.leaf, type: MY_CUSTOM_SHAPE_TYPE, parentId: ids.outer },
			{ id: ids.leaf2, type: MY_CUSTOM_SHAPE_TYPE, parentId: ids.outer, x: 150 },
		])

		let leafHidden: boolean | null = null
		const stop = react('track leaf', () => {
			leafHidden = editor.isShapeHidden(ids.leaf)
		})
		try {
			expect(leafHidden).toBe(false)
			hiddenIds.set(new Set([ids.outer]))
			expect(leafHidden).toBe(true)
			hiddenIds.set(new Set())
			expect(leafHidden).toBe(false)
		} finally {
			stop()
		}
	})

	it('hidden shapes are excluded from rendering and hit testing but stay selectable', () => {
		setVisibility(ids.top, 'hidden')
		expect(editor.getRenderingShapes().map((s) => s.id)).not.toContain(ids.top)
		expect(editor.getShapeAtPoint({ x: 650, y: 50 })).toBeUndefined()
		editor.select(ids.top)
		expect(editor.getSelectedShapeIds()).toEqual([ids.top])
	})
})
