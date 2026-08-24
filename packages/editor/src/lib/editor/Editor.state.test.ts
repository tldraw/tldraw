import { vi } from 'vitest'
import {
	Geometry2d,
	RecordProps,
	Rectangle2d,
	ShapeUtil,
	T,
	TLShape,
	TLUserPreferences,
	atom,
	createShapeId,
	createTLCurrentUser,
	createTLStore,
} from '../..'
import { Editor } from './Editor'
import { StateNode } from './tools/StateNode'

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

class Idle extends StateNode {
	static override id = 'idle'
}

class Busy extends StateNode {
	static override id = 'busy'
}

class ToolA extends StateNode {
	static override id = 'a'
	static override initial = 'idle'
	static override children() {
		return [Idle, Busy]
	}
}

class ToolB extends StateNode {
	static override id = 'b'
}

function createIsolatedUser() {
	const userPreferences = atom<TLUserPreferences>('prefs', { id: 'me' })
	return createTLCurrentUser({
		userPreferences,
		setUserPreferences: (prefs) => userPreferences.set(prefs),
	})
}

let editor: Editor

beforeEach(() => {
	editor = new Editor({
		shapeUtils: [TestBoxUtil],
		bindingUtils: [],
		tools: [ToolA, ToolB],
		initialState: 'a',
		store: createTLStore({ shapeUtils: [TestBoxUtil], bindingUtils: [] }),
		getContainer: () => document.body,
		user: createIsolatedUser(),
	})
})

afterEach(() => {
	editor.dispose()
})

describe('state chart', () => {
	it('reports the active path below the root', () => {
		expect(editor.getPath()).toBe('a.idle')
		expect(editor.getCurrentToolId()).toBe('a')
	})

	it('isIn matches prefixes of the active path only', () => {
		expect(editor.isIn('a')).toBe(true)
		expect(editor.isIn('a.idle')).toBe(true)
		expect(editor.isIn('a.busy')).toBe(false)
		expect(editor.isIn('b')).toBe(false)
		expect(editor.isIn('idle')).toBe(false)
		expect(editor.isIn('a.idle.deeper')).toBe(false)
	})

	it('isInAny is true when any path matches', () => {
		expect(editor.isInAny('b', 'a.idle')).toBe(true)
		expect(editor.isInAny('b', 'a.busy')).toBe(false)
		expect(editor.isInAny()).toBe(false)
	})

	it('tracks transitions between tools and child states', () => {
		editor.getStateDescendant<ToolA>('a')!.transition('busy')
		expect(editor.getPath()).toBe('a.busy')
		expect(editor.isIn('a.busy')).toBe(true)
		expect(editor.isIn('a.idle')).toBe(false)

		editor.setCurrentTool('b')
		expect(editor.getPath()).toBe('b')
		expect(editor.isIn('b')).toBe(true)
		expect(editor.isIn('a')).toBe(false)
		expect(editor.getCurrentTool()).toBeInstanceOf(ToolB)
	})

	it('getStateDescendant walks the tree by path', () => {
		expect(editor.getStateDescendant('a')).toBeInstanceOf(ToolA)
		expect(editor.getStateDescendant('b')).toBeInstanceOf(ToolB)
		expect(editor.getStateDescendant('a.idle')).toBeInstanceOf(Idle)
		expect(editor.getStateDescendant('a.busy')).toBeInstanceOf(Busy)
	})

	it('getStateDescendant returns undefined for unknown paths', () => {
		expect(editor.getStateDescendant('c')).toBeUndefined()
		expect(editor.getStateDescendant('a.nope')).toBeUndefined()
		expect(editor.getStateDescendant('b.idle')).toBeUndefined()
		expect(editor.getStateDescendant('idle')).toBeUndefined()
	})

	it('getStateDescendant finds inactive states too', () => {
		editor.setCurrentTool('b')
		expect(editor.getStateDescendant('a.idle')).toBeInstanceOf(Idle)
		expect(editor.isIn('a.idle')).toBe(false)
	})
})

describe('updateDocumentSettings', () => {
	it('merges the partial into the document record', () => {
		const prev = editor.getDocumentSettings()
		expect(editor.updateDocumentSettings({ gridSize: 25, name: 'My doc' })).toBe(editor)
		expect(editor.getDocumentSettings()).toEqual({ ...prev, gridSize: 25, name: 'My doc' })

		editor.updateDocumentSettings({ meta: { owner: 'me' } })
		expect(editor.getDocumentSettings()).toEqual({
			...prev,
			gridSize: 25,
			name: 'My doc',
			meta: { owner: 'me' },
		})
	})

	it('is not recorded in history', () => {
		editor.updateDocumentSettings({ gridSize: 40 })
		expect(editor.getCanUndo()).toBe(false)
		editor.undo()
		expect(editor.getDocumentSettings().gridSize).toBe(40)
	})
})

describe('setCursor', () => {
	it('updates the cursor type and rotation', () => {
		expect(editor.setCursor({ type: 'grab', rotation: 0 })).toBe(editor)
		expect(editor.getInstanceState().cursor).toEqual({ type: 'grab', rotation: 0 })

		editor.setCursor({ rotation: Math.PI / 2 })
		expect(editor.getInstanceState().cursor).toEqual({ type: 'grab', rotation: Math.PI / 2 })

		editor.setCursor({ type: 'cross' })
		expect(editor.getInstanceState().cursor).toEqual({ type: 'cross', rotation: Math.PI / 2 })
	})

	it('does not write to the store when nothing would change', () => {
		editor.setCursor({ type: 'grab', rotation: 1 })
		const before = editor.getInstanceState()
		editor.setCursor({ type: 'grab' })
		editor.setCursor({ rotation: 1 })
		editor.setCursor({ type: 'grab', rotation: 1 })
		editor.setCursor({})
		expect(editor.getInstanceState()).toBe(before)
	})

	it('is not recorded in history', () => {
		editor.setCursor({ type: 'grab' })
		expect(editor.getCanUndo()).toBe(false)
	})
})

describe('crash', () => {
	it('stores the error, marks the store corrupted and emits a crash event', () => {
		const onCrash = vi.fn()
		editor.on('crash', onCrash)
		const error = new Error('boom')

		expect(editor.getCrashingError()).toBeNull()
		expect(editor.store.isPossiblyCorrupted()).toBe(false)

		expect(editor.crash(error)).toBe(editor)
		expect(editor.getCrashingError()).toBe(error)
		expect(editor.store.isPossiblyCorrupted()).toBe(true)
		expect(onCrash).toHaveBeenCalledTimes(1)
		expect(onCrash).toHaveBeenCalledWith({ error })
	})
})

describe('createErrorAnnotations', () => {
	it('captures editor state with text stripped from selected shapes', () => {
		const id = createShapeId('box')
		editor.createShape({ id, type: MY_CUSTOM_SHAPE_TYPE, x: 5 })
		editor.select(id)
		editor.getStateDescendant<ToolA>('a')!.transition('busy')

		const annotations = editor.createErrorAnnotations('test', true)
		const shape = editor.getShape(id)!
		expect(annotations.tags).toEqual({ origin: 'test', willCrashApp: true })
		expect(annotations.extras).toMatchObject({
			activeStateNode: 'root.a.busy',
			selectedShapes: [{ ...shape, props: { w: 100, h: 100, isFilled: false } }],
			selectionCount: 1,
			editingShape: undefined,
			collaboratorCount: 0,
			pageState: editor.getCurrentPageState(),
			instanceState: editor.getInstanceState(),
		})
		expect(annotations.extras.inputs).toEqual(editor.inputs.toJson())
	})

	it('strips text and richText props from selected shapes', () => {
		const id = createShapeId('box')
		editor.createShape({ id, type: MY_CUSTOM_SHAPE_TYPE })
		editor.select(id)
		const spy = vi.spyOn(editor, 'getSelectedShapes').mockReturnValue([
			{
				...editor.getShape(id)!,
				props: { w: 1, h: 1, text: 'secret', richText: { type: 'doc' } },
			} as unknown as TLShape,
		])
		try {
			const { selectedShapes } = editor.createErrorAnnotations('test', 'unknown').extras
			expect(selectedShapes).toEqual([{ ...editor.getShape(id)!, props: { w: 1, h: 1 } }])
		} finally {
			spy.mockRestore()
		}
	})

	it('falls back to empty extras when gathering state throws', () => {
		const spy = vi.spyOn(editor, 'getSelectedShapes').mockImplementation(() => {
			throw new Error('broken')
		})
		try {
			expect(editor.createErrorAnnotations('origin', false)).toEqual({
				tags: { origin: 'origin', willCrashApp: false },
				extras: {},
			})
		} finally {
			spy.mockRestore()
		}
	})
})

describe('annotateError', () => {
	it('marks the store as possibly corrupted only when the app will crash', () => {
		editor.annotateError(new Error('soft'), { origin: 'test', willCrashApp: false })
		expect(editor.store.isPossiblyCorrupted()).toBe(false)

		editor.annotateError(new Error('hard'), { origin: 'test', willCrashApp: true })
		expect(editor.store.isPossiblyCorrupted()).toBe(true)
	})
})
