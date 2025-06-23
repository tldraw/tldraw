import { TLArrowShape, createShapeId } from '@tldraw/editor'
import { TestEditor } from '../../../test/TestEditor'
import { ArrowShapeUtil } from './ArrowShapeUtil'
import { updateArrowTargetState } from './arrowTargetState'
import { getArrowBindings } from './shared'

let editor: TestEditor

const ids = {
	box1: createShapeId('box1'),
	box2: createShapeId('box2'),
	arrow1: createShapeId('arrow1'),
}

jest.useFakeTimers()

window.requestAnimationFrame = function requestAnimationFrame(cb) {
	return setTimeout(cb, 1000 / 60)
}

window.cancelAnimationFrame = function cancelAnimationFrame(id) {
	clearTimeout(id)
}

function arrow(id = ids.arrow1) {
	return editor.getShape(id) as TLArrowShape
}

function _bindings(id = ids.arrow1) {
	return getArrowBindings(editor, arrow(id))
}

beforeEach(() => {
	editor = new TestEditor()
	editor
		.selectAll()
		.deleteShapes(editor.getSelectedShapeIds())
		.createShapes([
			{ id: ids.box1, type: 'geo', x: 100, y: 100, props: { w: 100, h: 100 } },
			{ id: ids.box2, type: 'geo', x: 300, y: 300, props: { w: 100, h: 100 } },
		])
})

describe('ArrowShapeOptions', () => {
	describe('Default options', () => {
		it('should have correct default shouldBeExact behavior (alt key)', () => {
			const util = editor.getShapeUtil<ArrowShapeUtil>('arrow')

			// Test without alt key
			editor.inputs.altKey = false
			expect(util.options.shouldBeExact(editor)).toBe(false)

			// Test with alt key
			editor.inputs.altKey = true
			expect(util.options.shouldBeExact(editor)).toBe(true)
		})

		it('should have correct default shouldIgnoreTargets behavior (ctrl key)', () => {
			const util = editor.getShapeUtil<ArrowShapeUtil>('arrow')

			// Test without ctrl key
			editor.inputs.ctrlKey = false
			expect(util.options.shouldIgnoreTargets(editor)).toBe(false)

			// Test with ctrl key
			editor.inputs.ctrlKey = true
			expect(util.options.shouldIgnoreTargets(editor)).toBe(true)
		})
	})

	describe('shouldIgnoreTargets option', () => {
		it('should not bind to shapes when shouldIgnoreTargets returns true', () => {
			editor.setCurrentTool('arrow')

			// Simulate ctrl key held (default shouldIgnoreTargets behavior)
			editor.inputs.ctrlKey = true

			editor.pointerDown(50, 50) // Start outside any shape
			editor.pointerMove(150, 150) // Move to center of box1
			editor.pointerUp()

			const createdArrow = editor
				.getCurrentPageShapes()
				.find((s) => s.type === 'arrow') as TLArrowShape
			expect(createdArrow).toBeDefined()

			const arrowBindings = getArrowBindings(editor, createdArrow)
			expect(arrowBindings.start).toBeUndefined()
			expect(arrowBindings.end).toBeUndefined()
		})

		it('should bind to shapes when shouldIgnoreTargets returns false', () => {
			editor.setCurrentTool('arrow')

			// Simulate no ctrl key (default shouldIgnoreTargets behavior)
			editor.inputs.ctrlKey = false

			editor.pointerDown(50, 50) // Start outside any shape
			editor.pointerMove(150, 150) // Move to center of box1
			editor.pointerUp()

			const createdArrow = editor
				.getCurrentPageShapes()
				.find((s) => s.type === 'arrow') as TLArrowShape
			expect(createdArrow).toBeDefined()

			const arrowBindings = getArrowBindings(editor, createdArrow)
			expect(arrowBindings.end).toBeDefined()
			expect(arrowBindings.end?.toId).toBe(ids.box1)
		})

		it('should work with updateArrowTargetState function', () => {
			// Test that updateArrowTargetState returns null when shouldIgnoreTargets is true
			editor.inputs.ctrlKey = true

			const targetState = updateArrowTargetState({
				editor,
				pointInPageSpace: { x: 150, y: 150 }, // Center of box1
				arrow: undefined,
				isPrecise: false,
				currentBinding: undefined,
				oppositeBinding: undefined,
			})

			expect(targetState).toBeNull()
		})

		it('should return valid target state when shouldIgnoreTargets is false', () => {
			editor.inputs.ctrlKey = false

			const targetState = updateArrowTargetState({
				editor,
				pointInPageSpace: { x: 150, y: 150 }, // Center of box1
				arrow: undefined,
				isPrecise: false,
				currentBinding: undefined,
				oppositeBinding: undefined,
			})

			expect(targetState).toBeDefined()
			expect(targetState?.target.id).toBe(ids.box1)
		})
	})

	describe('shouldBeExact option', () => {
		it('should affect arrow targeting behavior when true', () => {
			editor.inputs.altKey = true // shouldBeExact = true
			editor.inputs.ctrlKey = false // shouldIgnoreTargets = false

			const targetState = updateArrowTargetState({
				editor,
				pointInPageSpace: { x: 150, y: 150 }, // Center of box1
				arrow: undefined,
				isPrecise: true,
				currentBinding: undefined,
				oppositeBinding: undefined,
			})

			expect(targetState).toBeDefined()
			expect(targetState?.isExact).toBe(true)
		})

		it('should affect arrow targeting behavior when false', () => {
			editor.inputs.altKey = false // shouldBeExact = false
			editor.inputs.ctrlKey = false // shouldIgnoreTargets = false

			const targetState = updateArrowTargetState({
				editor,
				pointInPageSpace: { x: 150, y: 150 }, // Center of box1
				arrow: undefined,
				isPrecise: true,
				currentBinding: undefined,
				oppositeBinding: undefined,
			})

			expect(targetState).toBeDefined()
			expect(targetState?.isExact).toBe(false)
		})
	})

	describe('Custom options', () => {
		it('should allow customizing shouldBeExact behavior', () => {
			// Create a custom ArrowShapeUtil with different shouldBeExact behavior
			const baseUtil = editor.getShapeUtil<ArrowShapeUtil>('arrow')
			class CustomArrowShapeUtil extends ArrowShapeUtil {
				override options = {
					...baseUtil.options,
					shouldBeExact: (editor: any) => editor.inputs.shiftKey, // Use shift instead of alt
				}
			}

			const customUtil = new CustomArrowShapeUtil(editor)

			// Test with shift key
			editor.inputs.shiftKey = true
			editor.inputs.altKey = false
			expect(customUtil.options.shouldBeExact(editor)).toBe(true)

			// Test without shift key
			editor.inputs.shiftKey = false
			editor.inputs.altKey = true // Alt key should not matter for custom implementation
			expect(customUtil.options.shouldBeExact(editor)).toBe(false)
		})

		it('should allow customizing shouldIgnoreTargets behavior', () => {
			// Create a custom ArrowShapeUtil with different shouldIgnoreTargets behavior
			const baseUtil = editor.getShapeUtil<ArrowShapeUtil>('arrow')
			class CustomArrowShapeUtil extends ArrowShapeUtil {
				override options = {
					...baseUtil.options,
					shouldIgnoreTargets: (editor: any) => editor.inputs.shiftKey, // Use shift instead of ctrl
				}
			}

			const customUtil = new CustomArrowShapeUtil(editor)

			// Test with shift key
			editor.inputs.shiftKey = true
			editor.inputs.ctrlKey = false
			expect(customUtil.options.shouldIgnoreTargets(editor)).toBe(true)

			// Test without shift key
			editor.inputs.shiftKey = false
			editor.inputs.ctrlKey = true // Ctrl key should not matter for custom implementation
			expect(customUtil.options.shouldIgnoreTargets(editor)).toBe(false)
		})

		it('should allow completely custom logic for options', () => {
			// Create a custom ArrowShapeUtil with complex custom logic
			const baseUtil = editor.getShapeUtil<ArrowShapeUtil>('arrow')
			class CustomArrowShapeUtil extends ArrowShapeUtil {
				override options = {
					...baseUtil.options,
					shouldBeExact: (editor: any) => {
						// Custom logic: exact when both alt and shift are pressed
						return editor.inputs.altKey && editor.inputs.shiftKey
					},
					shouldIgnoreTargets: (editor: any) => {
						// Custom logic: ignore targets when any modifier key is pressed
						return editor.inputs.altKey || editor.inputs.ctrlKey || editor.inputs.shiftKey
					},
				}
			}

			const customUtil = new CustomArrowShapeUtil(editor)

			// Test shouldBeExact with both keys
			editor.inputs.altKey = true
			editor.inputs.shiftKey = true
			expect(customUtil.options.shouldBeExact(editor)).toBe(true)

			// Test shouldBeExact with only one key
			editor.inputs.altKey = true
			editor.inputs.shiftKey = false
			expect(customUtil.options.shouldBeExact(editor)).toBe(false)

			// Test shouldIgnoreTargets with any key
			editor.inputs.altKey = false
			editor.inputs.ctrlKey = false
			editor.inputs.shiftKey = true
			expect(customUtil.options.shouldIgnoreTargets(editor)).toBe(true)

			// Test shouldIgnoreTargets with no keys
			editor.inputs.altKey = false
			editor.inputs.ctrlKey = false
			editor.inputs.shiftKey = false
			expect(customUtil.options.shouldIgnoreTargets(editor)).toBe(false)
		})
	})

	describe('Integration with arrow tool states', () => {
		it('should respect shouldIgnoreTargets in idle state', () => {
			editor.setCurrentTool('arrow')
			editor.expectToBeIn('arrow.idle')

			// Move to a position over box1
			editor.inputs.ctrlKey = true // shouldIgnoreTargets = true
			editor.pointerMove(150, 150)

			// The arrow tool should not show any target highlighting
			// (This is more of an integration test - exact assertions would depend on internal state)
			expect(editor.getCurrentToolId()).toBe('arrow')
		})

		it('should respect shouldIgnoreTargets when starting arrow creation', () => {
			editor.setCurrentTool('arrow')

			// Start creating arrow with ctrl held (shouldIgnoreTargets = true)
			editor.inputs.ctrlKey = true
			editor.pointerDown(150, 150) // Start in center of box1

			// Even though we're starting in a shape, no binding should be created
			editor.pointerMove(200, 200)
			editor.pointerUp()

			const createdArrow = editor
				.getCurrentPageShapes()
				.find((s) => s.type === 'arrow') as TLArrowShape
			expect(createdArrow).toBeDefined()

			const arrowBindings = getArrowBindings(editor, createdArrow)
			expect(arrowBindings.start).toBeUndefined()
			expect(arrowBindings.end).toBeUndefined()
		})

		it('should respect shouldBeExact during arrow creation', () => {
			editor.setCurrentTool('arrow')

			// Create arrow with alt held (shouldBeExact = true)
			editor.inputs.altKey = true
			editor.inputs.ctrlKey = false // Allow binding

			editor.pointerDown(50, 50) // Start outside shapes
			editor.pointerMove(150, 150) // Move to center of box1
			editor.pointerUp()

			const createdArrow = editor
				.getCurrentPageShapes()
				.find((s) => s.type === 'arrow') as TLArrowShape
			expect(createdArrow).toBeDefined()

			const arrowBindings = getArrowBindings(editor, createdArrow)
			expect(arrowBindings.end).toBeDefined()
			expect(arrowBindings.end?.props.isExact).toBe(true)
		})
	})
})
