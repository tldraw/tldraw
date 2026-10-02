import { createShapeId } from '@tldraw/editor'
import { TestEditor } from '../../../test/TestEditor'
import { GestureShapeChangeTracker } from './GestureShapeChangeTracker'

const trackedId = createShapeId('tracked')
const untrackedId = createShapeId('untracked')

let editor: TestEditor
let tracker: GestureShapeChangeTracker

beforeEach(() => {
	editor = new TestEditor()
	editor.createShapes([
		{ id: trackedId, type: 'geo' },
		{ id: untrackedId, type: 'geo' },
	])
	tracker = new GestureShapeChangeTracker(editor)
	tracker.start([trackedId])
})

afterEach(() => {
	tracker.stop()
	editor.dispose()
})

it('only tracks external changes to the specified shapes', () => {
	editor.updateShape({ id: untrackedId, type: 'geo', x: 1 })
	expect(tracker.getAndClearChanged()).toBe(false)

	tracker.ignoreChanges(() => editor.updateShape({ id: trackedId, type: 'geo', x: 1 }))
	expect(tracker.getAndClearChanged()).toBe(false)

	editor.updateShape({ id: trackedId, type: 'geo', x: 2 })
	expect(tracker.getAndClearChanged()).toBe(true)
})

it('replaces the tracked shape IDs', () => {
	tracker.setTrackedShapeIds([untrackedId])

	editor.updateShape({ id: trackedId, type: 'geo', x: 1 })
	expect(tracker.getAndClearChanged()).toBe(false)

	editor.updateShape({ id: untrackedId, type: 'geo', x: 1 })
	expect(tracker.getAndClearChanged()).toBe(true)
})
