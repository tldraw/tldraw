import { Mocked, vi } from 'vitest'
import { Editor } from '../../Editor'
import { TLClickEventInfo, TLPointerEventInfo } from '../../types/event-types'
import { ClickManager } from './ClickManager'

// Mock the Editor class
vi.mock('../../Editor')

describe('ClickManager', () => {
	let editor: Mocked<Editor>
	let clickManager: ClickManager
	let mockTimers: any

	const createPointerEvent = (
		name: 'pointer_down' | 'pointer_up' | 'pointer_move',
		point: { x: number; y: number } = { x: 0, y: 0 }
	): TLPointerEventInfo => ({
		type: 'pointer',
		name,
		point,
		pointerId: 1,
		button: 0,
		isPen: false,
		target: 'canvas',
		shiftKey: false,
		altKey: false,
		ctrlKey: false,
		metaKey: false,
		accelKey: false,
	})

	beforeEach(() => {
		vi.useFakeTimers()
		mockTimers = {
			setTimeout: vi.fn((fn, delay) => setTimeout(fn, delay)),
		}

		editor = {
			timers: mockTimers,
			dispatch: vi.fn(),
			options: {
				doubleClickDurationMs: 300,
				multiClickDurationMs: 300,
				dragDistanceSquared: 16,
				coarseDragDistanceSquared: 36,
			},
			inputs: {
				currentScreenPoint: { x: 0, y: 0 },
			},
			getInstanceState: vi.fn(() => ({
				isCoarsePointer: false,
			})),
		} as any

		clickManager = new ClickManager(editor)
	})

	afterEach(() => {
		vi.useRealTimers()
		vi.clearAllMocks()
	})

	describe('constructor and initial state', () => {
		it('should initialize with idle state', () => {
			expect(clickManager.clickState).toBe('idle')
		})

		it('should store reference to editor', () => {
			expect(clickManager.editor).toBe(editor)
		})

		it('should initialize lastPointerInfo as empty object', () => {
			expect(clickManager.lastPointerInfo).toEqual({})
		})
	})

	describe('single click behavior', () => {
		it('should handle pointer_down in idle state', () => {
			const pointerEvent = createPointerEvent('pointer_down', { x: 100, y: 100 })

			const result = clickManager.handlePointerEvent(pointerEvent)

			expect(result).toBe(pointerEvent)
			expect(clickManager.clickState).toBe('pendingDouble')
			expect(clickManager.lastPointerInfo).toBe(pointerEvent)
		})

		it('should handle pointer_up without generating click events in pending state', () => {
			const downEvent = createPointerEvent('pointer_down', { x: 100, y: 100 })
			const upEvent = createPointerEvent('pointer_up', { x: 100, y: 100 })

			clickManager.handlePointerEvent(downEvent)
			clickManager.handlePointerEvent(upEvent)

			expect(clickManager.clickState).toBe('pendingDouble')
		})

		it('should return to idle state after timeout in pendingDouble', () => {
			const pointerEvent = createPointerEvent('pointer_down', { x: 100, y: 100 })

			clickManager.handlePointerEvent(pointerEvent)
			expect(clickManager.clickState).toBe('pendingDouble')

			vi.advanceTimersByTime(350)

			expect(clickManager.clickState).toBe('idle')
		})
	})

	describe('double click detection', () => {
		it('should detect double click on second pointer_down', () => {
			const firstDown = createPointerEvent('pointer_down', { x: 100, y: 100 })
			const secondDown = createPointerEvent('pointer_down', { x: 100, y: 100 })

			clickManager.handlePointerEvent(firstDown)
			const result = clickManager.handlePointerEvent(secondDown) as TLClickEventInfo

			expect(result.type).toBe('click')
			expect(result.name).toBe('double_click')
			expect(result.phase).toBe('down')
			expect(clickManager.clickState).toBe('pendingTriple')
		})

		it('should generate double_click up event on pointer_up after double_click down', () => {
			const firstDown = createPointerEvent('pointer_down', { x: 100, y: 100 })
			const secondDown = createPointerEvent('pointer_down', { x: 100, y: 100 })
			const secondUp = createPointerEvent('pointer_up', { x: 100, y: 100 })

			clickManager.handlePointerEvent(firstDown)
			clickManager.handlePointerEvent(secondDown)
			const result = clickManager.handlePointerEvent(secondUp) as TLClickEventInfo

			expect(result.type).toBe('click')
			expect(result.name).toBe('double_click')
			expect(result.phase).toBe('up')
		})

		it('should dispatch double_click settle event after timeout in pendingTriple', () => {
			const firstDown = createPointerEvent('pointer_down', { x: 100, y: 100 })
			const secondDown = createPointerEvent('pointer_down', { x: 100, y: 100 })

			clickManager.handlePointerEvent(firstDown)
			clickManager.handlePointerEvent(secondDown)

			vi.advanceTimersByTime(350)

			expect(editor.dispatch).toHaveBeenCalledWith(
				expect.objectContaining({
					type: 'click',
					name: 'double_click',
					phase: 'settle',
				})
			)
			expect(clickManager.clickState).toBe('idle')
		})
	})

	describe('triple and quadruple click detection', () => {
		it('should detect triple click on third pointer_down', () => {
			const firstDown = createPointerEvent('pointer_down', { x: 100, y: 100 })
			const secondDown = createPointerEvent('pointer_down', { x: 100, y: 100 })
			const thirdDown = createPointerEvent('pointer_down', { x: 100, y: 100 })

			clickManager.handlePointerEvent(firstDown)
			clickManager.handlePointerEvent(secondDown)
			const result = clickManager.handlePointerEvent(thirdDown) as TLClickEventInfo

			expect(result.type).toBe('click')
			expect(result.name).toBe('triple_click')
			expect(result.phase).toBe('down')
			expect(clickManager.clickState).toBe('pendingQuadruple')
		})

		it('should detect quadruple click on fourth pointer_down', () => {
			const pointerDown = createPointerEvent('pointer_down', { x: 100, y: 100 })

			clickManager.handlePointerEvent(pointerDown) // first
			clickManager.handlePointerEvent(pointerDown) // second (double_click)
			clickManager.handlePointerEvent(pointerDown) // third (triple_click)
			const result = clickManager.handlePointerEvent(pointerDown) as TLClickEventInfo // fourth

			expect(result.type).toBe('click')
			expect(result.name).toBe('quadruple_click')
			expect(result.phase).toBe('down')
			expect(clickManager.clickState).toBe('pendingOverflow')
		})

		it('should handle overflow state after quadruple click', () => {
			const pointerDown = createPointerEvent('pointer_down', { x: 100, y: 100 })

			clickManager.handlePointerEvent(pointerDown) // first
			clickManager.handlePointerEvent(pointerDown) // second
			clickManager.handlePointerEvent(pointerDown) // third
			clickManager.handlePointerEvent(pointerDown) // fourth
			const result = clickManager.handlePointerEvent(pointerDown) // fifth

			expect(result).toBe(pointerDown)
			expect(clickManager.clickState).toBe('overflow')
		})

		it('should generate triple_click up event on pointer_up after triple_click down', () => {
			const pointerDown = createPointerEvent('pointer_down', { x: 100, y: 100 })
			const pointerUp = createPointerEvent('pointer_up', { x: 100, y: 100 })

			clickManager.handlePointerEvent(pointerDown) // first
			clickManager.handlePointerEvent(pointerDown) // second
			clickManager.handlePointerEvent(pointerDown) // third
			const result = clickManager.handlePointerEvent(pointerUp) as TLClickEventInfo

			expect(result.type).toBe('click')
			expect(result.name).toBe('triple_click')
			expect(result.phase).toBe('up')
		})

		it('should generate quadruple_click up event on pointer_up after quadruple_click down', () => {
			const pointerDown = createPointerEvent('pointer_down', { x: 100, y: 100 })
			const pointerUp = createPointerEvent('pointer_up', { x: 100, y: 100 })

			clickManager.handlePointerEvent(pointerDown) // first
			clickManager.handlePointerEvent(pointerDown) // second
			clickManager.handlePointerEvent(pointerDown) // third
			clickManager.handlePointerEvent(pointerDown) // fourth
			const result = clickManager.handlePointerEvent(pointerUp) as TLClickEventInfo

			expect(result.type).toBe('click')
			expect(result.name).toBe('quadruple_click')
			expect(result.phase).toBe('up')
		})
	})

	describe('timeout behavior and settle events', () => {
		it('should dispatch triple_click settle event after timeout in pendingQuadruple', () => {
			const pointerDown = createPointerEvent('pointer_down', { x: 100, y: 100 })

			clickManager.handlePointerEvent(pointerDown) // first
			clickManager.handlePointerEvent(pointerDown) // second
			clickManager.handlePointerEvent(pointerDown) // third

			vi.advanceTimersByTime(350)

			expect(editor.dispatch).toHaveBeenCalledWith(
				expect.objectContaining({
					type: 'click',
					name: 'triple_click',
					phase: 'settle',
				})
			)
			expect(clickManager.clickState).toBe('idle')
		})

		it('should dispatch quadruple_click settle event after timeout in pendingOverflow', () => {
			const pointerDown = createPointerEvent('pointer_down', { x: 100, y: 100 })

			clickManager.handlePointerEvent(pointerDown) // first
			clickManager.handlePointerEvent(pointerDown) // second
			clickManager.handlePointerEvent(pointerDown) // third
			clickManager.handlePointerEvent(pointerDown) // fourth

			vi.advanceTimersByTime(350)

			expect(editor.dispatch).toHaveBeenCalledWith(
				expect.objectContaining({
					type: 'click',
					name: 'quadruple_click',
					phase: 'settle',
				})
			)
			expect(clickManager.clickState).toBe('idle')
		})

		it('should use different timeout durations for different states', () => {
			const pointerDown = createPointerEvent('pointer_down', { x: 100, y: 100 })

			// First click - should use doubleClickDurationMs
			clickManager.handlePointerEvent(pointerDown)
			expect(mockTimers.setTimeout).toHaveBeenCalledWith(
				expect.any(Function),
				editor.options.doubleClickDurationMs
			)

			vi.clearAllMocks()

			// Second click - should use multiClickDurationMs
			clickManager.handlePointerEvent(pointerDown)
			expect(mockTimers.setTimeout).toHaveBeenCalledWith(
				expect.any(Function),
				editor.options.multiClickDurationMs
			)
		})
	})

	describe('distance-based click cancellation', () => {
		it('should reset to idle if clicks are too far apart', () => {
			const firstDown = createPointerEvent('pointer_down', { x: 0, y: 0 })
			const secondDown = createPointerEvent('pointer_down', { x: 50, y: 50 }) // > 40px distance

			clickManager.handlePointerEvent(firstDown)
			expect(clickManager.clickState).toBe('pendingDouble')

			const result = clickManager.handlePointerEvent(secondDown)

			expect(result).toBe(secondDown)
			expect(clickManager.clickState).toBe('pendingDouble') // Reset and started new sequence
		})

		it('should continue sequence if clicks are close enough', () => {
			const firstDown = createPointerEvent('pointer_down', { x: 0, y: 0 })
			const secondDown = createPointerEvent('pointer_down', { x: 5, y: 5 }) // < 40px distance

			clickManager.handlePointerEvent(firstDown)
			const result = clickManager.handlePointerEvent(secondDown) as TLClickEventInfo

			expect(result.type).toBe('click')
			expect(result.name).toBe('double_click')
			expect(clickManager.clickState).toBe('pendingTriple')
		})
	})

	describe('pointer move cancellation behavior', () => {
		it('should cancel click sequence on significant pointer move', () => {
			const downEvent = createPointerEvent('pointer_down', { x: 0, y: 0 })
			const moveEvent = createPointerEvent('pointer_move', { x: 10, y: 10 })

			editor.inputs.currentScreenPoint.x = 10
			editor.inputs.currentScreenPoint.y = 10

			clickManager.handlePointerEvent(downEvent)
			expect(clickManager.clickState).toBe('pendingDouble')

			const result = clickManager.handlePointerEvent(moveEvent)

			expect(result).toBe(moveEvent)
			expect(clickManager.clickState).toBe('idle')
		})

		it('should use coarse drag distance for coarse pointers', () => {
			editor.getInstanceState.mockReturnValue({
				...editor.getInstanceState(),
				isCoarsePointer: true,
			})

			const downEvent = createPointerEvent('pointer_down', { x: 0, y: 0 })
			const moveEvent1 = createPointerEvent('pointer_move', { x: 1, y: 1 })
			const moveEvent2 = createPointerEvent('pointer_move', { x: 5, y: 5 }) // 50

			clickManager.handlePointerEvent(downEvent)
			expect(clickManager.clickState).toBe('pendingDouble')

			// Should not cancel for coarse pointer with small movement
			editor.inputs.currentScreenPoint.x = 1
			editor.inputs.currentScreenPoint.y = 1
			clickManager.handlePointerEvent(moveEvent1)
			expect(clickManager.clickState).toBe('pendingDouble')

			editor.inputs.currentScreenPoint.x = 5
			editor.inputs.currentScreenPoint.y = 5
			clickManager.handlePointerEvent(moveEvent2)

			expect(clickManager.clickState).toBe('idle')
		})

		it('should not cancel in idle state', () => {
			const moveEvent = createPointerEvent('pointer_move', { x: 100, y: 100 })

			editor.inputs.currentScreenPoint.x = 100
			editor.inputs.currentScreenPoint.y = 100

			clickManager.handlePointerEvent(moveEvent)

			expect(clickManager.clickState).toBe('idle')
		})
	})

	describe('cancelDoubleClickTimeout method', () => {
		it('should clear timeout and reset state to idle', () => {
			const pointerDown = createPointerEvent('pointer_down', { x: 100, y: 100 })

			clickManager.handlePointerEvent(pointerDown)
			expect(clickManager.clickState).toBe('pendingDouble')

			clickManager.cancelDoubleClickTimeout()

			expect(clickManager.clickState).toBe('idle')
		})

		it('should prevent timeout callback from executing after cancellation', () => {
			const pointerDown = createPointerEvent('pointer_down', { x: 100, y: 100 })

			clickManager.handlePointerEvent(pointerDown)
			clickManager.handlePointerEvent(pointerDown) // double click
			expect(clickManager.clickState).toBe('pendingTriple')

			clickManager.cancelDoubleClickTimeout()

			// Advance time - should not dispatch settle event
			vi.advanceTimersByTime(350)

			expect(editor.dispatch).not.toHaveBeenCalled()
			expect(clickManager.clickState).toBe('idle')
		})
	})

	describe('edge cases', () => {
		it('should handle null click state gracefully', () => {
			// Force null state
			;(clickManager as any)._clickState = null

			const pointerEvent = createPointerEvent('pointer_down', { x: 100, y: 100 })
			const result = clickManager.handlePointerEvent(pointerEvent)

			expect(result).toBe(pointerEvent)
		})

		it('should handle missing previous screen point', () => {
			const firstDown = createPointerEvent('pointer_down', { x: 0, y: 0 })

			// Clear previous point
			;(clickManager as any)._previousScreenPoint = undefined

			const result = clickManager.handlePointerEvent(firstDown)

			expect(result).toBe(firstDown)
			expect(clickManager.clickState).toBe('pendingDouble')
		})

		it('should handle overflow state correctly', () => {
			const pointerDown = createPointerEvent('pointer_down', { x: 100, y: 100 })
			const pointerUp = createPointerEvent('pointer_up', { x: 100, y: 100 })

			// Get to overflow state
			clickManager.handlePointerEvent(pointerDown) // 1
			clickManager.handlePointerEvent(pointerDown) // 2
			clickManager.handlePointerEvent(pointerDown) // 3
			clickManager.handlePointerEvent(pointerDown) // 4
			clickManager.handlePointerEvent(pointerDown) // 5 -> overflow

			expect(clickManager.clickState).toBe('overflow')

			// pointer_up in overflow should just return the event
			clickManager.handlePointerEvent(pointerUp)
		})
	})
})
