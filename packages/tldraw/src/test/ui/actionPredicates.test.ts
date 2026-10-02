import { createShapeId, TLShapeId } from '@tldraw/editor'
import {
	canApplySelectionAction,
	canApplyToUnlockedSelection,
	canFlatten,
	hasLockedShapesOnPage,
	hasThreeStackableShapes,
	isGroupAllowed,
	isOnlyFlippableShapeSelected,
	isUngroupAllowed,
} from '../../lib/ui/context/action-predicates'
import { TestEditor } from '../TestEditor'

let editor: TestEditor
const a = createShapeId('a')
const b = createShapeId('b')
const c = createShapeId('c')
const arrow = createShapeId('arrow')

beforeEach(() => {
	editor = new TestEditor()
	editor.createShapes([
		{ id: a, type: 'geo', x: 0, y: 0 },
		{ id: b, type: 'geo', x: 200, y: 0 },
		{ id: c, type: 'geo', x: 400, y: 0 },
	])
})

const lock = (...ids: TLShapeId[]) =>
	editor.updateShapes(ids.map((id) => ({ id, type: 'geo', isLocked: true })))

function bindArrow(from: TLShapeId, to: TLShapeId) {
	editor.createShape({ id: arrow, type: 'arrow', x: 100, y: 50 })
	for (const [terminal, toId] of [
		['start', from],
		['end', to],
	] as const) {
		editor.createBinding({
			type: 'arrow',
			fromId: arrow,
			toId,
			props: {
				terminal,
				isExact: false,
				isPrecise: false,
				normalizedAnchor: { x: 0.5, y: 0.5 },
				snap: 'none',
			},
		})
	}
}

describe('action predicates', () => {
	it('selection actions need the select tool', () => {
		editor.select(a)
		expect(canApplySelectionAction(editor)).toBe(true)
		editor.setCurrentTool('hand')
		expect(canApplySelectionAction(editor)).toBe(false)
		expect(canApplyToUnlockedSelection(editor, 1)).toBe(false)
	})

	it('counts only unlocked shapes, including ancestor locks', () => {
		const group = createShapeId('group')
		editor.groupShapes([a, b], { groupId: group })
		editor.updateShape({ id: group, type: 'group', isLocked: true })
		editor.select(a, c)
		expect(canApplyToUnlockedSelection(editor, 2)).toBe(false)
		expect(canApplyToUnlockedSelection(editor, 1)).toBe(true)
	})

	it('group needs 2 unlocked shapes and no arrow bound outside the selection', () => {
		editor.select(a, b)
		expect(isGroupAllowed(editor)).toBe(true)
		lock(a)
		expect(isGroupAllowed(editor)).toBe(false)
		editor.updateShape({ id: a, type: 'geo', isLocked: false })
		bindArrow(a, b)
		editor.select(arrow, a, c)
		expect(isGroupAllowed(editor)).toBe(false)
		editor.select(arrow, a, b)
		expect(isGroupAllowed(editor)).toBe(true)
	})

	it('ungroup needs an unlocked selected group', () => {
		const group = createShapeId('group')
		editor.groupShapes([a, b], { groupId: group })
		editor.select(group)
		expect(isUngroupAllowed(editor)).toBe(true)
		editor.updateShape({ id: group, type: 'group', isLocked: true })
		expect(isUngroupAllowed(editor)).toBe(false)
	})

	it('flip on a single shape needs a flippable, unlocked shape', () => {
		editor.select(a)
		expect(isOnlyFlippableShapeSelected(editor)).toBe(true)
		lock(a)
		expect(isOnlyFlippableShapeSelected(editor)).toBe(false)
		const text = createShapeId('text')
		editor.createShape({ id: text, type: 'text', x: 0, y: 300 })
		editor.select(text)
		expect(isOnlyFlippableShapeSelected(editor)).toBe(false)
	})

	it('stack needs 3 unlocked shapes not counting bound arrows', () => {
		editor.select(a, b, c)
		expect(hasThreeStackableShapes(editor)).toBe(true)
		lock(c)
		expect(hasThreeStackableShapes(editor)).toBe(false)
		editor.updateShape({ id: c, type: 'geo', isLocked: false })
		bindArrow(a, b)
		editor.select(arrow, a, b)
		expect(hasThreeStackableShapes(editor)).toBe(false)
	})

	it('flatten is off for a lone image and on otherwise', () => {
		expect(canFlatten(editor)).toBe(false)
		editor.select(a)
		expect(canFlatten(editor)).toBe(true)
	})

	it('unlock all needs a locked shape on the page', () => {
		expect(hasLockedShapesOnPage(editor)).toBe(false)
		lock(b)
		expect(hasLockedShapesOnPage(editor)).toBe(true)
	})
})
