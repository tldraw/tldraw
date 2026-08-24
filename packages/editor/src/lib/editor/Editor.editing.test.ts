import { vi } from 'vitest'
import {
	Geometry2d,
	RecordProps,
	Rectangle2d,
	ShapeUtil,
	T,
	TLEditStartInfo,
	TLShape,
	TLShapeId,
	TLUserPreferences,
	atom,
	createShapeId,
	createTLCurrentUser,
	createTLStore,
} from '../..'
import { Editor, TLEditorOptions } from './Editor'

const MY_CUSTOM_SHAPE_TYPE = 'my-custom-shape'

declare module '@tldraw/tlschema' {
	export interface TLGlobalShapePropsMap {
		[MY_CUSTOM_SHAPE_TYPE]: { w: number; h: number; text: string | undefined; isFilled: boolean }
	}
}

type TestBox = TLShape<typeof MY_CUSTOM_SHAPE_TYPE>

const onEditStart = vi.fn()
const onEditEnd = vi.fn()
const editInfos: TLEditStartInfo[] = []

// Editability is driven by shape meta so one util can cover every branch.
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
	override canEdit(shape: TestBox, info: TLEditStartInfo) {
		editInfos.push(info)
		return shape.meta.editable !== false
	}
	override canEditInReadonly(shape: TestBox) {
		return shape.meta.editableInReadonly === true
	}
	override canEditWhileLocked(shape: TestBox) {
		return shape.meta.editableWhileLocked === true
	}
	override canCrop(shape: TestBox) {
		return shape.meta.croppable === true
	}
	override onEditStart(shape: TestBox) {
		onEditStart(shape.id)
	}
	override onEditEnd(shape: TestBox) {
		onEditEnd(shape.id)
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

const ids = {
	a: createShapeId('a'),
	b: createShapeId('b'),
	locked: createShapeId('locked'),
	group: createShapeId('group'),
	inLockedGroup: createShapeId('inLockedGroup'),
	inLockedGroup2: createShapeId('inLockedGroup2'),
}

let editor: Editor

beforeEach(() => {
	onEditStart.mockClear()
	onEditEnd.mockClear()
	editInfos.length = 0
	editor = createEditor()
	editor.createShapes([
		{ id: ids.a, type: MY_CUSTOM_SHAPE_TYPE, x: 0, y: 0 },
		{ id: ids.b, type: MY_CUSTOM_SHAPE_TYPE, x: 200, y: 0 },
		{ id: ids.locked, type: MY_CUSTOM_SHAPE_TYPE, x: 400, y: 0, isLocked: true },
		{ id: ids.group, type: 'group', x: 0, y: 300, isLocked: true },
		// groups with a single child are dissolved, so give the group two children
		{ id: ids.inLockedGroup, type: MY_CUSTOM_SHAPE_TYPE, x: 0, y: 0, parentId: ids.group },
		{ id: ids.inLockedGroup2, type: MY_CUSTOM_SHAPE_TYPE, x: 200, y: 0, parentId: ids.group },
	])
	editor.clearHistory()
})

afterEach(() => {
	editor.dispose()
})

function setMeta(id: TLShapeId, meta: Record<string, boolean>) {
	editor.run(
		() =>
			editor.updateShape({
				id,
				type: MY_CUSTOM_SHAPE_TYPE,
				meta: { ...editor.getShape(id)!.meta, ...meta },
			}),
		{ ignoreShapeLock: true }
	)
}

describe('canEditShape', () => {
	it('is false for null, missing, and non-editable shapes', () => {
		expect(editor.canEditShape(null)).toBe(false)
		expect(editor.canEditShape(createShapeId('missing'))).toBe(false)
		setMeta(ids.a, { editable: false })
		expect(editor.canEditShape(ids.a)).toBe(false)
	})

	it('accepts a shape or id and passes edit start info to the util', () => {
		expect(editor.canEditShape(ids.a)).toBe(true)
		expect(editor.canEditShape(editor.getShape(ids.a)!, { type: 'click' })).toBe(true)
		expect(editInfos).toEqual([{ type: 'unknown' }, { type: 'click' }])
	})

	it('is false for the shape already being edited', () => {
		editor.setEditingShape(ids.a)
		expect(editor.canEditShape(ids.a)).toBe(false)
		expect(editor.canEditShape(ids.b)).toBe(true)
	})

	it('respects readonly mode unless the util allows editing in readonly', () => {
		setMeta(ids.b, { editableInReadonly: true })
		editor.updateInstanceState({ isReadonly: true })
		expect(editor.canEditShape(ids.a)).toBe(false)
		expect(editor.canEditShape(ids.b)).toBe(true)
	})

	it('respects locked shapes and locked ancestors unless the util allows it', () => {
		expect(editor.canEditShape(ids.locked)).toBe(false)
		expect(editor.canEditShape(ids.inLockedGroup)).toBe(false)
		setMeta(ids.locked, { editableWhileLocked: true })
		setMeta(ids.inLockedGroup, { editableWhileLocked: true })
		expect(editor.canEditShape(ids.locked)).toBe(true)
		expect(editor.canEditShape(ids.inLockedGroup)).toBe(true)
	})
})

describe('setEditingShape', () => {
	it('sets, selects, and notifies the util', () => {
		expect(editor.setEditingShape(ids.a)).toBe(editor)
		expect(editor.getEditingShapeId()).toBe(ids.a)
		expect(editor.getEditingShape()?.id).toBe(ids.a)
		expect(editor.getSelectedShapeIds()).toEqual([ids.a])
		expect(onEditStart).toHaveBeenCalledWith(ids.a)
		expect(onEditEnd).not.toHaveBeenCalled()
	})

	it('accepts a shape object', () => {
		editor.setEditingShape(editor.getShape(ids.b)!)
		expect(editor.getEditingShapeId()).toBe(ids.b)
	})

	it('ends the previous edit before starting the next', () => {
		editor.setEditingShape(ids.a)
		editor.setEditingShape(ids.b)
		expect(onEditEnd).toHaveBeenCalledWith(ids.a)
		expect(onEditStart).toHaveBeenLastCalledWith(ids.b)
		expect(editor.getEditingShapeId()).toBe(ids.b)
		expect(editor.getSelectedShapeIds()).toEqual([ids.b])
	})

	it('null clears the editing shape, the rich text editor, and calls onEditEnd', () => {
		editor.setEditingShape(ids.a)
		const richTextEditor = {} as any
		editor.setRichTextEditor(richTextEditor)
		editor.setEditingShape(null)
		expect(editor.getEditingShapeId()).toBeNull()
		expect(editor.getEditingShape()).toBeUndefined()
		expect(editor.getRichTextEditor()).toBeNull()
		expect(onEditEnd).toHaveBeenCalledWith(ids.a)
		// the selection is left alone
		expect(editor.getSelectedShapeIds()).toEqual([ids.a])
	})

	it('ignores shapes that cannot be edited', () => {
		editor.setEditingShape(ids.a)
		editor.setEditingShape(ids.locked)
		editor.setEditingShape(createShapeId('missing'))
		expect(editor.getEditingShapeId()).toBe(ids.a)
		expect(onEditEnd).not.toHaveBeenCalled()
	})

	it('entering edit mode is not undoable', () => {
		editor.setEditingShape(ids.a)
		editor.undo()
		expect(editor.getEditingShapeId()).toBe(ids.a)
	})

	it('document changes made by onEditEnd are undoable', () => {
		onEditEnd.mockImplementation((id: TLShapeId) => editor.deleteShape(id))
		editor.setEditingShape(ids.a)
		editor.markHistoryStoppingPoint()
		editor.setEditingShape(null)
		expect(editor.getShape(ids.a)).toBeUndefined()
		editor.undo()
		expect(editor.getShape(ids.a)).toBeDefined()
	})
})

describe('setRichTextEditor', () => {
	it('stores and clears the editor instance', () => {
		expect(editor.getRichTextEditor()).toBeNull()
		const textEditor = { name: 'tiptap' } as any
		expect(editor.setRichTextEditor(textEditor)).toBe(editor)
		expect(editor.getRichTextEditor()).toBe(textEditor)
		editor.setRichTextEditor(null)
		expect(editor.getRichTextEditor()).toBeNull()
	})
})

describe('setHoveredShape', () => {
	it('sets by id, by shape, and clears with null', () => {
		expect(editor.setHoveredShape(ids.a)).toBe(editor)
		expect(editor.getHoveredShapeId()).toBe(ids.a)
		expect(editor.getHoveredShape()?.id).toBe(ids.a)

		editor.setHoveredShape(editor.getShape(ids.b)!)
		expect(editor.getHoveredShapeId()).toBe(ids.b)

		editor.setHoveredShape(null)
		expect(editor.getHoveredShapeId()).toBeNull()
		expect(editor.getHoveredShape()).toBeUndefined()
	})

	it('does not write when the hovered shape is unchanged', () => {
		editor.setHoveredShape(ids.a)
		const before = editor.getCurrentPageState()
		editor.setHoveredShape(ids.a)
		expect(editor.getCurrentPageState()).toBe(before)
	})

	it('is not recorded in history', () => {
		editor.setHoveredShape(ids.a)
		expect(editor.getCanUndo()).toBe(false)
	})
})

describe('setHintingShapes', () => {
	it('accepts ids or shapes and dedupes', () => {
		expect(editor.setHintingShapes([ids.a, ids.b, ids.a])).toBe(editor)
		expect(editor.getHintingShapeIds()).toEqual([ids.a, ids.b])

		editor.setHintingShapes([editor.getShape(ids.b)!])
		expect(editor.getHintingShapeIds()).toEqual([ids.b])
		expect(editor.getHintingShape().map((s) => s.id)).toEqual([ids.b])

		editor.setHintingShapes([])
		expect(editor.getHintingShapeIds()).toEqual([])
	})

	it('drops ids for shapes that no longer exist when resolving shapes', () => {
		editor.setHintingShapes([ids.a, createShapeId('missing')])
		expect(editor.getHintingShape().map((s) => s.id)).toEqual([ids.a])
	})

	it('is not recorded in history', () => {
		editor.setHintingShapes([ids.a])
		expect(editor.getCanUndo()).toBe(false)
	})
})

describe('setErasingShapes', () => {
	it('stores the ids sorted, from ids or shapes', () => {
		expect(editor.setErasingShapes([ids.b, ids.a])).toBe(editor)
		expect(editor.getErasingShapeIds()).toEqual([ids.a, ids.b])

		editor.setErasingShapes([editor.getShape(ids.b)!])
		expect(editor.getErasingShapeIds()).toEqual([ids.b])
		expect(editor.getErasingShapes().map((s) => s.id)).toEqual([ids.b])

		editor.setErasingShapes([])
		expect(editor.getErasingShapeIds()).toEqual([])
	})

	it('does not write when the same set is provided in a different order', () => {
		editor.setErasingShapes([ids.a, ids.b])
		const before = editor.getCurrentPageState()
		editor.setErasingShapes([ids.b, ids.a])
		expect(editor.getCurrentPageState()).toBe(before)
	})

	it('accepts the frozen array it previously stored', () => {
		editor.setErasingShapes([ids.b, ids.a])
		const stored = editor.getErasingShapeIds()
		expect(() => editor.setErasingShapes(stored)).not.toThrow()
		expect(editor.getErasingShapeIds()).toEqual([ids.a, ids.b])
	})

	it('is not recorded in history', () => {
		editor.setErasingShapes([ids.a])
		expect(editor.getCanUndo()).toBe(false)
	})
})

describe('cropping', () => {
	it('canCropShape requires a croppable, unlocked shape in a writable editor', () => {
		expect(editor.canCropShape(null)).toBe(false)
		expect(editor.canCropShape(createShapeId('missing'))).toBe(false)
		expect(editor.canCropShape(ids.a)).toBe(false)

		setMeta(ids.a, { croppable: true })
		expect(editor.canCropShape(ids.a)).toBe(true)
		expect(editor.canCropShape(editor.getShape(ids.a)!)).toBe(true)

		setMeta(ids.locked, { croppable: true })
		setMeta(ids.inLockedGroup, { croppable: true })
		expect(editor.canCropShape(ids.locked)).toBe(false)
		expect(editor.canCropShape(ids.inLockedGroup)).toBe(false)

		editor.updateInstanceState({ isReadonly: true })
		expect(editor.canCropShape(ids.a)).toBe(false)
	})

	it('setCroppingShape sets croppable shapes and ignores others', () => {
		setMeta(ids.a, { croppable: true })
		expect(editor.getCroppingShapeId()).toBeNull()

		expect(editor.setCroppingShape(ids.a)).toBe(editor)
		expect(editor.getCroppingShapeId()).toBe(ids.a)

		editor.setCroppingShape(ids.b)
		expect(editor.getCroppingShapeId()).toBe(ids.a)

		editor.setCroppingShape(null)
		expect(editor.getCroppingShapeId()).toBeNull()

		editor.setCroppingShape(editor.getShape(ids.a)!)
		expect(editor.getCroppingShapeId()).toBe(ids.a)
	})

	it('setCroppingShape does not write when unchanged', () => {
		setMeta(ids.a, { croppable: true })
		editor.setCroppingShape(ids.a)
		const before = editor.getCurrentPageState()
		editor.setCroppingShape(ids.a)
		expect(editor.getCurrentPageState()).toBe(before)
	})

	it('setCroppingShape is not recorded in history', () => {
		setMeta(ids.a, { croppable: true })
		editor.clearHistory()
		editor.setCroppingShape(ids.a)
		expect(editor.getCanUndo()).toBe(false)
	})
})

describe('getTextOptions', () => {
	it('throws when no text options were configured', () => {
		expect(() => editor.getTextOptions()).toThrow('Cannot use text without setting textOptions')
	})

	it('returns the options passed via options.text', () => {
		editor.dispose()
		const text = { tipTapConfig: { extensions: [] } }
		editor = createEditor({ options: { text } })
		expect(editor.getTextOptions()).toBe(text)
	})

	it('prefers options.text over the deprecated textOptions prop', () => {
		editor.dispose()
		const text = { tipTapConfig: { extensions: [] } }
		const legacy = { tipTapConfig: { extensions: [] } }
		editor = createEditor({ options: { text }, textOptions: legacy })
		expect(editor.getTextOptions()).toBe(text)

		editor.dispose()
		editor = createEditor({ textOptions: legacy })
		expect(editor.getTextOptions()).toBe(legacy)
	})
})
