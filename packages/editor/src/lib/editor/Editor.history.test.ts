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

const ids = {
	a: createShapeId('a'),
	b: createShapeId('b'),
}

let editor: Editor

beforeEach(() => {
	editor = new Editor({
		shapeUtils: [TestBoxUtil],
		bindingUtils: [],
		tools: [],
		store: createTLStore({ shapeUtils: [TestBoxUtil], bindingUtils: [] }),
		getContainer: () => document.body,
		user: createIsolatedUser(),
	})
})

afterEach(() => {
	editor.dispose()
})

function shapeX(id = ids.a) {
	return editor.getShape(id)?.x
}

describe('undo and redo', () => {
	it('starts with nothing to undo or redo', () => {
		expect(editor.getCanUndo()).toBe(false)
		expect(editor.getCanRedo()).toBe(false)
	})

	it('undoes and redoes a recorded change', () => {
		editor.markHistoryStoppingPoint()
		editor.createShape({ id: ids.a, type: MY_CUSTOM_SHAPE_TYPE, x: 10 })
		expect(editor.getCanUndo()).toBe(true)
		expect(editor.getCanRedo()).toBe(false)

		expect(editor.undo()).toBe(editor)
		expect(editor.getShape(ids.a)).toBeUndefined()
		expect(editor.getCanRedo()).toBe(true)

		expect(editor.redo()).toBe(editor)
		expect(editor.getShape(ids.a)).toMatchObject({ id: ids.a, x: 10 })
		expect(editor.getCanRedo()).toBe(false)
	})

	it('undoes back to the previous stopping point, not one change at a time', () => {
		editor.markHistoryStoppingPoint()
		editor.createShape({ id: ids.a, type: MY_CUSTOM_SHAPE_TYPE, x: 0 })
		editor.updateShape({ id: ids.a, type: MY_CUSTOM_SHAPE_TYPE, x: 50 })
		editor.updateShape({ id: ids.a, type: MY_CUSTOM_SHAPE_TYPE, x: 100 })
		editor.markHistoryStoppingPoint()
		editor.updateShape({ id: ids.a, type: MY_CUSTOM_SHAPE_TYPE, x: 200 })

		editor.undo()
		expect(shapeX()).toBe(100)
		editor.undo()
		expect(editor.getShape(ids.a)).toBeUndefined()
	})

	it('a new change after undo clears the redo stack', () => {
		editor.markHistoryStoppingPoint()
		editor.createShape({ id: ids.a, type: MY_CUSTOM_SHAPE_TYPE, x: 0 })
		editor.undo()
		expect(editor.getCanRedo()).toBe(true)

		editor.markHistoryStoppingPoint()
		editor.createShape({ id: ids.b, type: MY_CUSTOM_SHAPE_TYPE })
		expect(editor.getCanRedo()).toBe(false)
		editor.redo()
		expect(editor.getShape(ids.a)).toBeUndefined()
	})

	it('ignored changes are not undoable', () => {
		editor.run(() => editor.createShape({ id: ids.a, type: MY_CUSTOM_SHAPE_TYPE }), {
			history: 'ignore',
		})
		expect(editor.getCanUndo()).toBe(false)
		editor.undo()
		expect(editor.getShape(ids.a)).toBeDefined()
	})

	it('clearHistory drops both stacks', () => {
		editor.markHistoryStoppingPoint()
		editor.createShape({ id: ids.a, type: MY_CUSTOM_SHAPE_TYPE })
		editor.markHistoryStoppingPoint()
		editor.createShape({ id: ids.b, type: MY_CUSTOM_SHAPE_TYPE })
		editor.undo()
		expect(editor.getCanUndo()).toBe(true)
		expect(editor.getCanRedo()).toBe(true)

		expect(editor.clearHistory()).toBe(editor)
		expect(editor.getCanUndo()).toBe(false)
		expect(editor.getCanRedo()).toBe(false)
		editor.undo()
		editor.redo()
		expect(editor.getShape(ids.a)).toBeDefined()
		expect(editor.getShape(ids.b)).toBeUndefined()
	})

	it('reports replaying only while an undo or redo is being applied', () => {
		const seen: boolean[] = []
		const cleanup = editor.sideEffects.registerAfterChangeHandler('shape', () => {
			seen.push(editor.isReplayingHistory())
		})
		try {
			editor.createShape({ id: ids.a, type: MY_CUSTOM_SHAPE_TYPE, x: 0 })
			editor.markHistoryStoppingPoint()
			editor.updateShape({ id: ids.a, type: MY_CUSTOM_SHAPE_TYPE, x: 1 })
			expect(seen).toEqual([false])
			expect(editor.isReplayingHistory()).toBe(false)

			editor.undo()
			expect(seen).toEqual([false, true])
			editor.redo()
			expect(seen).toEqual([false, true, true])
			expect(editor.isReplayingHistory()).toBe(false)
		} finally {
			cleanup()
		}
	})
})

describe('marks', () => {
	it('markHistoryStoppingPoint returns an id containing the name', () => {
		const id = editor.markHistoryStoppingPoint('rotating')
		expect(id).toMatch(/^\[rotating\]_/)
		expect(editor.markHistoryStoppingPoint()).toMatch(/^\[stop\]_/)
	})

	it('getMarkIdMatching finds the most recent mark containing the substring', () => {
		const first = editor.markHistoryStoppingPoint('drag')
		editor.createShape({ id: ids.a, type: MY_CUSTOM_SHAPE_TYPE })
		const second = editor.markHistoryStoppingPoint('drag')
		editor.createShape({ id: ids.b, type: MY_CUSTOM_SHAPE_TYPE })

		expect(editor.getMarkIdMatching('drag')).toBe(second)
		expect(editor.getMarkIdMatching(first)).toBe(first)
		expect(editor.getMarkIdMatching('nope')).toBeNull()
	})

	it('bail reverts to the latest mark and discards the redo', () => {
		editor.markHistoryStoppingPoint()
		editor.createShape({ id: ids.a, type: MY_CUSTOM_SHAPE_TYPE, x: 0 })
		editor.markHistoryStoppingPoint()
		editor.updateShape({ id: ids.a, type: MY_CUSTOM_SHAPE_TYPE, x: 100 })

		expect(editor.bail()).toBe(editor)
		expect(shapeX()).toBe(0)
		expect(editor.getCanRedo()).toBe(false)
		expect(editor.getCanUndo()).toBe(true)
	})

	it('bailToMark reverts everything since the named mark', () => {
		editor.markHistoryStoppingPoint()
		editor.createShape({ id: ids.a, type: MY_CUSTOM_SHAPE_TYPE, x: 0 })
		const mark = editor.markHistoryStoppingPoint('start')
		editor.updateShape({ id: ids.a, type: MY_CUSTOM_SHAPE_TYPE, x: 100 })
		editor.markHistoryStoppingPoint()
		editor.updateShape({ id: ids.a, type: MY_CUSTOM_SHAPE_TYPE, x: 200 })
		editor.markHistoryStoppingPoint()
		editor.createShape({ id: ids.b, type: MY_CUSTOM_SHAPE_TYPE })

		expect(editor.bailToMark(mark)).toBe(editor)
		expect(shapeX()).toBe(0)
		expect(editor.getShape(ids.b)).toBeUndefined()
		expect(editor.getCanRedo()).toBe(false)

		// the changes before the mark remain undoable
		editor.undo()
		expect(editor.getShape(ids.a)).toBeUndefined()
	})

	it('bailToMark with an empty id is a no-op', () => {
		editor.markHistoryStoppingPoint()
		editor.createShape({ id: ids.a, type: MY_CUSTOM_SHAPE_TYPE, x: 0 })
		editor.bailToMark('')
		expect(shapeX()).toBe(0)
	})

	it('squashToMark collapses intermediate marks into a single undo', () => {
		editor.markHistoryStoppingPoint()
		editor.createShape({ id: ids.a, type: MY_CUSTOM_SHAPE_TYPE, x: 0 })
		const mark = editor.markHistoryStoppingPoint('squash')
		editor.updateShape({ id: ids.a, type: MY_CUSTOM_SHAPE_TYPE, x: 100 })
		editor.markHistoryStoppingPoint()
		editor.updateShape({ id: ids.a, type: MY_CUSTOM_SHAPE_TYPE, x: 200 })
		editor.markHistoryStoppingPoint()
		editor.updateShape({ id: ids.a, type: MY_CUSTOM_SHAPE_TYPE, x: 300 })

		expect(editor.squashToMark(mark)).toBe(editor)
		expect(shapeX()).toBe(300)

		editor.undo()
		expect(shapeX()).toBe(0)
		editor.redo()
		expect(shapeX()).toBe(300)
	})

	it('squashToMark logs an error and leaves history alone for an unknown mark', () => {
		const error = vi.spyOn(console, 'error').mockImplementation(() => {})
		try {
			editor.markHistoryStoppingPoint()
			editor.createShape({ id: ids.a, type: MY_CUSTOM_SHAPE_TYPE, x: 0 })
			editor.markHistoryStoppingPoint()
			editor.updateShape({ id: ids.a, type: MY_CUSTOM_SHAPE_TYPE, x: 100 })

			editor.squashToMark('[missing]_mark')
			expect(error).toHaveBeenCalledWith('Could not find mark to squash to: ', '[missing]_mark')

			editor.undo()
			expect(shapeX()).toBe(0)
		} finally {
			error.mockRestore()
		}
	})
})
