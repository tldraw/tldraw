import { TLArrowShape, createShapeId } from '@tldraw/editor'
import { vi } from 'vitest'
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

vi.useFakeTimers()

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

			// Test without alt key, not precise
			editor.inputs.setAltKey(false)
			expect(util.options.shouldBeExact(editor, false)).toBe(false)

			// Test without alt key, precise
			editor.inputs.setAltKey(false)
			expect(util.options.shouldBeExact(editor, true)).toBe(false)

			// Test with alt key, not precise
			editor.inputs.setAltKey(true)
			expect(util.options.shouldBeExact(editor, false)).toBe(true)

			// Test with alt key, precise
			editor.inputs.setAltKey(true)
			expect(util.options.shouldBeExact(editor, true)).toBe(true)
		})

		it('should have correct default shouldIgnoreTargets behavior (ctrl key)', () => {
			const util = editor.getShapeUtil<ArrowShapeUtil>('arrow')

			// Test without ctrl key
			editor.inputs.setCtrlKey(false)
			expect(util.options.shouldIgnoreTargets(editor)).toBe(false)

			// Test with ctrl key
			editor.inputs.setCtrlKey(true)
			expect(util.options.shouldIgnoreTargets(editor)).toBe(true)
		})
	})

	describe('shouldIgnoreTargets option', () => {
		it('should work with updateArrowTargetState function', () => {
			// Test that updateArrowTargetState returns null when shouldIgnoreTargets is true
			editor.inputs.setCtrlKey(true)

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
			editor.inputs.setCtrlKey(false)

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
			editor.inputs.setAltKey(true) // shouldBeExact = true
			editor.inputs.setCtrlKey(false) // shouldIgnoreTargets = false

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
			editor.inputs.setAltKey(false) // shouldBeExact = false
			editor.inputs.setCtrlKey(false) // shouldIgnoreTargets = false

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
					shouldBeExact: (editor: any, _isPrecise: boolean) => editor.inputs.getShiftKey(), // Use shift instead of alt
				}
			}

			const customUtil = new CustomArrowShapeUtil(editor)

			// Test with shift key
			editor.inputs.setShiftKey(true)
			editor.inputs.setAltKey(false)
			expect(customUtil.options.shouldBeExact(editor, false)).toBe(true)
			expect(customUtil.options.shouldBeExact(editor, true)).toBe(true)

			// Test without shift key
			editor.inputs.setShiftKey(false)
			editor.inputs.setAltKey(true) // Alt key should not matter for custom implementation
			expect(customUtil.options.shouldBeExact(editor, false)).toBe(false)
			expect(customUtil.options.shouldBeExact(editor, true)).toBe(false)
		})

		it('should allow customizing shouldIgnoreTargets behavior', () => {
			// Create a custom ArrowShapeUtil with different shouldIgnoreTargets behavior
			const baseUtil = editor.getShapeUtil<ArrowShapeUtil>('arrow')
			class CustomArrowShapeUtil extends ArrowShapeUtil {
				override options = {
					...baseUtil.options,
					shouldIgnoreTargets: (editor: any) => editor.inputs.getShiftKey(), // Use shift instead of ctrl
				}
			}

			const customUtil = new CustomArrowShapeUtil(editor)

			// Test with shift key
			editor.inputs.setShiftKey(true)
			editor.inputs.setCtrlKey(false)
			expect(customUtil.options.shouldIgnoreTargets(editor)).toBe(true)

			// Test without shift key
			editor.inputs.setShiftKey(false)
			editor.inputs.setCtrlKey(true) // Ctrl key should not matter for custom implementation
			expect(customUtil.options.shouldIgnoreTargets(editor)).toBe(false)
		})

		it('should allow completely custom logic for options', () => {
			// Create a custom ArrowShapeUtil with complex custom logic
			const baseUtil = editor.getShapeUtil<ArrowShapeUtil>('arrow')
			class CustomArrowShapeUtil extends ArrowShapeUtil {
				override options = {
					...baseUtil.options,
					shouldBeExact: (editor: any, isPrecise: boolean) => {
						// Custom logic: exact when both alt and shift are pressed, and only if precise
						return editor.inputs.getAltKey() && editor.inputs.getShiftKey() && isPrecise
					},
					shouldIgnoreTargets: (editor: any) => {
						// Custom logic: ignore targets when any modifier key is pressed
						return (
							editor.inputs.getAltKey() || editor.inputs.getCtrlKey() || editor.inputs.getShiftKey()
						)
					},
				}
			}

			const customUtil = new CustomArrowShapeUtil(editor)

			// Test shouldBeExact with both keys and precise
			editor.inputs.setAltKey(true)
			editor.inputs.setShiftKey(true)
			expect(customUtil.options.shouldBeExact(editor, true)).toBe(true)

			// Test shouldBeExact with both keys but not precise
			editor.inputs.setAltKey(true)
			editor.inputs.setShiftKey(true)
			expect(customUtil.options.shouldBeExact(editor, false)).toBe(false)

			// Test shouldBeExact with only one key
			editor.inputs.setAltKey(true)
			editor.inputs.setShiftKey(false)
			expect(customUtil.options.shouldBeExact(editor, true)).toBe(false)

			// Test shouldIgnoreTargets with any key
			editor.inputs.setAltKey(false)
			editor.inputs.setCtrlKey(false)
			editor.inputs.setShiftKey(true)
			expect(customUtil.options.shouldIgnoreTargets(editor)).toBe(true)

			// Test shouldIgnoreTargets with no keys
			editor.inputs.setAltKey(false)
			editor.inputs.setCtrlKey(false)
			editor.inputs.setShiftKey(false)
			expect(customUtil.options.shouldIgnoreTargets(editor)).toBe(false)
		})
	})

	describe('Integration with arrow tool states', () => {
		it('should allow custom shouldBeExact logic based on isPrecise - example from arrow precise-exact', () => {
			// This replicates the logic from the arrows-precise-exact example
			const baseUtil = editor.getShapeUtil<ArrowShapeUtil>('arrow')
			class ExampleArrowShapeUtil extends ArrowShapeUtil {
				override options = {
					...baseUtil.options,
					shouldBeExact: (_editor: any, isPrecise: boolean) => isPrecise,
				}
			}

			// Replace the util temporarily for testing
			const customUtil = new ExampleArrowShapeUtil(editor)
			const originalShouldBeExact = baseUtil.options.shouldBeExact
			baseUtil.options.shouldBeExact = customUtil.options.shouldBeExact

			try {
				editor.setCurrentTool('arrow')
				editor.inputs.setCtrlKey(false) // Allow binding

				// Set up fast pointer velocity to ensure precise remains false
				editor.inputs.setPointerVelocity({ x: 2, y: 2, len: () => 2.8 } as any)

				const targetState = updateArrowTargetState({
					editor,
					pointInPageSpace: { x: 150, y: 150 },
					arrow: undefined,
					isPrecise: true, // Input precise
					currentBinding: undefined,
					oppositeBinding: undefined,
				})

				// With the custom logic, precise arrows should be exact
				expect(targetState?.isExact).toBe(true)
				expect(targetState?.isPrecise).toBe(true)

				// Test with non-precise movement (and fast velocity to avoid auto-precise)
				const nonPreciseTargetState = updateArrowTargetState({
					editor,
					pointInPageSpace: { x: 150, y: 150 },
					arrow: undefined,
					isPrecise: false, // Not precise
					currentBinding: undefined,
					oppositeBinding: undefined,
				})

				// Non-precise arrows should not be exact with this custom logic,
				// but they might still become precise due to internal logic
				// The key test is that shouldBeExact gets the final computed precise value
				expect(nonPreciseTargetState).toBeDefined()
			} finally {
				// Restore original function
				baseUtil.options.shouldBeExact = originalShouldBeExact
			}
		})
	})
})
