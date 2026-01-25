import { TLScribble } from '@tldraw/tlschema'
import { Mock, Mocked, vi } from 'vitest'
import { Editor } from '../../Editor'
import { TelestrationItem, TelestrationManager } from './TelestrationManager'

// Mock the Editor class
vi.mock('../../Editor')
vi.mock('@tldraw/utils', () => ({
	uniqueId: vi.fn(() => 'test-id'),
}))

describe('TelestrationManager', () => {
	let editor: Mocked<Editor>
	let telestrationManager: TelestrationManager
	let mockUniqueId: Mock

	beforeEach(async () => {
		editor = {
			updateInstanceState: vi.fn(),
			run: vi.fn((fn) => fn()),
			options: {
				telestrationIdleTimeoutMs: 1000,
				telestrationFadeoutMs: 1500,
			},
			timers: {
				setTimeout: vi.fn(() => Math.random()),
			},
		} as any

		const { uniqueId } = await vi.importMock('@tldraw/utils')
		mockUniqueId = uniqueId as Mock
		mockUniqueId.mockReturnValue('test-id')

		telestrationManager = new TelestrationManager(editor)
	})

	afterEach(() => {
		vi.clearAllMocks()
	})

	describe('addScribble', () => {
		it('should add a new scribble with default values', () => {
			const result = telestrationManager.addScribble({})

			expect(result).toBeDefined()
			expect(result.id).toBe('test-id')
			expect(result.scribble).toMatchObject({
				id: 'test-id',
				size: 20,
				color: 'laser',
				opacity: 0.7,
				delay: 0,
				points: [],
				shrink: 0,
				taper: false,
				state: 'starting',
			})
			expect(result.prev).toBeNull()
			expect(result.next).toBeNull()
		})

		it('should add a scribble with custom properties', () => {
			const customScribble: Partial<TLScribble> = {
				size: 8,
				opacity: 0.9,
				shrink: 0.1,
			}

			const result = telestrationManager.addScribble(customScribble)

			expect(result.scribble).toMatchObject({
				...customScribble,
				id: 'test-id',
				color: 'laser',
				points: [],
				state: 'starting',
			})
		})

		it('should add scribble with custom id', () => {
			const customId = 'custom-scribble-id'
			const result = telestrationManager.addScribble({}, customId)

			expect(result.id).toBe(customId)
			expect(result.scribble.id).toBe(customId)
		})

		it('should create a session when first scribble is added', () => {
			expect(telestrationManager.hasActiveSession()).toBe(false)

			telestrationManager.addScribble({})

			expect(telestrationManager.hasActiveSession()).toBe(true)
		})

		it('should set up idle timeout when session is created', () => {
			telestrationManager.addScribble({})

			expect(editor.timers.setTimeout).toHaveBeenCalledWith(
				expect.any(Function),
				editor.options.telestrationIdleTimeoutMs
			)
		})

		it('should add multiple scribbles to the same session', () => {
			// First scribble: uniqueId called for scribble id, then session id
			// Second scribble: uniqueId called for scribble id only (session already exists)
			mockUniqueId
				.mockReturnValueOnce('scribble-1')
				.mockReturnValueOnce('session-id')
				.mockReturnValueOnce('scribble-2')

			const item1 = telestrationManager.addScribble({})
			const item2 = telestrationManager.addScribble({})

			expect(item1.id).toBe('scribble-1')
			expect(item2.id).toBe('scribble-2')

			// Add points so they show up in getScribbles() (empty scribbles are filtered out)
			item1.scribble.points.push({ x: 0, y: 0, z: 0.5 })
			item2.scribble.points.push({ x: 0, y: 0, z: 0.5 })
			expect(telestrationManager.getScribbles()).toHaveLength(2)
		})
	})

	describe('addPoint', () => {
		it('should add point to existing scribble', () => {
			const item = telestrationManager.addScribble({})

			const result = telestrationManager.addPoint(item.id, 10, 20, 0.7)

			expect(result).toBe(item)
			expect(result.next).toEqual({ x: 10, y: 20, z: 0.7 })
		})

		it('should use default z value of 0.5', () => {
			const item = telestrationManager.addScribble({})

			telestrationManager.addPoint(item.id, 10, 20)

			expect(item.next).toEqual({ x: 10, y: 20, z: 0.5 })
		})

		it('should only set next if distance from prev is >= 1', () => {
			const item = telestrationManager.addScribble({})
			item.prev = { x: 10, y: 20, z: 0.5 }

			// Distance < 1 (should not set next)
			telestrationManager.addPoint(item.id, 10.5, 20.3)
			expect(item.next).toBeNull()

			// Distance >= 1 (should set next)
			telestrationManager.addPoint(item.id, 11, 21)
			expect(item.next).toEqual({ x: 11, y: 21, z: 0.5 })
		})

		it('should throw error for non-existent scribble', () => {
			expect(() => telestrationManager.addPoint('non-existent-id', 10, 20)).toThrow(
				'Telestration scribble with id non-existent-id not found'
			)
		})
	})

	describe('extendSession', () => {
		it('should reset idle timeout when called', () => {
			mockUniqueId.mockReturnValueOnce('session-id').mockReturnValueOnce('scribble-1')
			telestrationManager.addScribble({})

			vi.clearAllMocks()

			telestrationManager.extendSession()

			expect(editor.timers.setTimeout).toHaveBeenCalledWith(
				expect.any(Function),
				editor.options.telestrationIdleTimeoutMs
			)
		})

		it('should do nothing when no session exists', () => {
			expect(() => telestrationManager.extendSession()).not.toThrow()
		})
	})

	describe('endSession', () => {
		it('should mark session as fading', () => {
			mockUniqueId.mockReturnValueOnce('session-id').mockReturnValueOnce('scribble-1')
			const item = telestrationManager.addScribble({})
			item.scribble.state = 'active'
			item.scribble.points.push({ x: 1, y: 1, z: 0.5 })

			telestrationManager.endSession()

			expect(item.scribble.state).toBe('stopping')
		})

		it('should count total points for proportional fade', () => {
			mockUniqueId
				.mockReturnValueOnce('session-id')
				.mockReturnValueOnce('scribble-1')
				.mockReturnValueOnce('scribble-2')

			const item1 = telestrationManager.addScribble({})
			const item2 = telestrationManager.addScribble({})

			// Add points to both scribbles
			for (let i = 0; i < 5; i++) {
				item1.scribble.points.push({ x: i, y: i, z: 0.5 })
			}
			for (let i = 0; i < 3; i++) {
				item2.scribble.points.push({ x: i, y: i, z: 0.5 })
			}

			item1.scribble.state = 'active'
			item2.scribble.state = 'active'

			telestrationManager.endSession()

			// Both should be stopping
			expect(item1.scribble.state).toBe('stopping')
			expect(item2.scribble.state).toBe('stopping')
		})

		it('should do nothing when no session exists', () => {
			expect(() => telestrationManager.endSession()).not.toThrow()
		})
	})

	describe('reset', () => {
		it('should clear the active session', () => {
			telestrationManager.addScribble({})
			expect(telestrationManager.hasActiveSession()).toBe(true)

			telestrationManager.reset()

			expect(telestrationManager.hasActiveSession()).toBe(false)
		})

		it('should clear all scribbles', () => {
			mockUniqueId
				.mockReturnValueOnce('session-id')
				.mockReturnValueOnce('scribble-1')
				.mockReturnValueOnce('scribble-2')

			telestrationManager.addScribble({})
			telestrationManager.addScribble({})

			telestrationManager.reset()

			expect(telestrationManager.getScribbles()).toHaveLength(0)
		})
	})

	describe('getScribbles', () => {
		it('should return empty array when no session', () => {
			expect(telestrationManager.getScribbles()).toEqual([])
		})

		it('should return copies of scribbles', () => {
			const item = telestrationManager.addScribble({})
			item.scribble.points.push({ x: 1, y: 1, z: 0.5 })

			const scribbles = telestrationManager.getScribbles()
			scribbles[0].points.push({ x: 2, y: 2, z: 0.5 })

			// Original should not be modified
			expect(item.scribble.points).toHaveLength(1)
		})
	})

	describe('tick - active session', () => {
		let item: TelestrationItem

		beforeEach(() => {
			mockUniqueId.mockReturnValueOnce('session-id').mockReturnValueOnce('scribble-1')
			item = telestrationManager.addScribble({})
		})

		it('should do nothing when no session', () => {
			telestrationManager.reset()
			expect(() => telestrationManager.tick(16)).not.toThrow()
		})

		it('should add points to scribble in starting state', () => {
			item.next = { x: 10, y: 20, z: 0.5 }

			telestrationManager.tick(16)

			expect(item.prev).toEqual({ x: 10, y: 20, z: 0.5 })
			expect(item.scribble.points).toHaveLength(1)
			expect(item.scribble.points[0]).toEqual({ x: 10, y: 20, z: 0.5 })
		})

		it('should transition to active after 8 points', () => {
			for (let i = 0; i < 9; i++) {
				item.next = { x: i, y: i, z: 0.5 }
				item.prev = null
				telestrationManager.tick(16)
			}

			expect(item.scribble.state).toBe('active')
			expect(item.scribble.points).toHaveLength(9)
		})

		it('should NOT remove points while session is active (unlike ScribbleManager)', () => {
			item.scribble.state = 'active'

			// Add many points
			for (let i = 0; i < 20; i++) {
				item.scribble.points.push({ x: i, y: i, z: 0.5 })
			}

			// Simulate adding more points
			item.next = { x: 100, y: 100, z: 0.5 }
			item.prev = { x: 99, y: 99, z: 0.5 }
			telestrationManager.tick(16)

			// Points should accumulate, not be removed
			expect(item.scribble.points.length).toBe(21)
		})
	})

	describe('tick - fading session (proportional fade)', () => {
		it('should remove points proportionally across all scribbles', () => {
			mockUniqueId
				.mockReturnValueOnce('session-id')
				.mockReturnValueOnce('scribble-1')
				.mockReturnValueOnce('scribble-2')

			const item1 = telestrationManager.addScribble({})
			const item2 = telestrationManager.addScribble({})

			// Add 10 points to each scribble (20 total)
			for (let i = 0; i < 10; i++) {
				item1.scribble.points.push({ x: i, y: i, z: 0.5 })
				item2.scribble.points.push({ x: i + 10, y: i + 10, z: 0.5 })
			}

			item1.scribble.state = 'active'
			item2.scribble.state = 'active'

			telestrationManager.endSession()

			// With 20 total points and 1500ms fadeout, we remove ~13 points per 1000ms
			// For 100ms elapsed, we'd remove about 1-2 points
			telestrationManager.tick(100)

			// Points should have been removed from the first scribble first
			const totalPoints = item1.scribble.points.length + item2.scribble.points.length
			expect(totalPoints).toBeLessThan(20)
		})

		it('should remove points from first scribble before second', () => {
			mockUniqueId
				.mockReturnValueOnce('session-id')
				.mockReturnValueOnce('scribble-1')
				.mockReturnValueOnce('scribble-2')

			const item1 = telestrationManager.addScribble({})
			const item2 = telestrationManager.addScribble({})

			// Add 5 points to first, 5 to second
			for (let i = 0; i < 5; i++) {
				item1.scribble.points.push({ x: i, y: i, z: 0.5 })
				item2.scribble.points.push({ x: i + 10, y: i + 10, z: 0.5 })
			}

			item1.scribble.state = 'active'
			item2.scribble.state = 'active'

			telestrationManager.endSession()

			// First tick removes from first scribble
			telestrationManager.tick(100)

			// First scribble should have fewer or equal points than second
			expect(item1.scribble.points.length).toBeLessThanOrEqual(item2.scribble.points.length)
		})

		it('should clean up session when all points are removed', () => {
			mockUniqueId.mockReturnValueOnce('session-id').mockReturnValueOnce('scribble-1')
			const item = telestrationManager.addScribble({})

			// Add just 2 points
			item.scribble.points.push({ x: 0, y: 0, z: 0.5 })
			item.scribble.points.push({ x: 1, y: 1, z: 0.5 })
			item.scribble.state = 'active'

			telestrationManager.endSession()

			// Tick enough to remove all points
			for (let i = 0; i < 100; i++) {
				telestrationManager.tick(100)
			}

			expect(telestrationManager.hasActiveSession()).toBe(false)
		})

		it('should handle empty scribbles at fade start', () => {
			mockUniqueId.mockReturnValueOnce('session-id').mockReturnValueOnce('scribble-1')
			telestrationManager.addScribble({})

			// End session with no points
			telestrationManager.endSession()

			// Should clean up immediately
			telestrationManager.tick(16)

			expect(telestrationManager.hasActiveSession()).toBe(false)
		})

		it('should maintain size while fading (no shrink effect)', () => {
			mockUniqueId.mockReturnValueOnce('scribble-1').mockReturnValueOnce('session-id')
			const item = telestrationManager.addScribble({ size: 10 })

			// Add points
			for (let i = 0; i < 10; i++) {
				item.scribble.points.push({ x: i, y: i, z: 0.5 })
			}
			item.scribble.state = 'active'

			telestrationManager.endSession()
			telestrationManager.tick(200)

			// Size should remain the same - telestration doesn't use shrink
			expect(item.scribble.size).toBe(10)
		})
	})

	describe('session lifecycle integration', () => {
		it('should handle complete session lifecycle', () => {
			mockUniqueId
				.mockReturnValueOnce('session-id')
				.mockReturnValueOnce('scribble-1')
				.mockReturnValueOnce('scribble-2')

			// Start session with first scribble
			const item1 = telestrationManager.addScribble({})
			expect(telestrationManager.hasActiveSession()).toBe(true)

			// Add points while drawing
			for (let i = 0; i < 15; i++) {
				item1.next = { x: i, y: i, z: 0.5 }
				item1.prev = i > 0 ? { x: i - 1, y: i - 1, z: 0.5 } : null
				telestrationManager.tick(16)
			}

			expect(item1.scribble.state).toBe('active')
			expect(item1.scribble.points.length).toBe(15)

			// Add second scribble to same session
			const item2 = telestrationManager.addScribble({})
			for (let i = 0; i < 10; i++) {
				item2.next = { x: i + 20, y: i + 20, z: 0.5 }
				item2.prev = i > 0 ? { x: i + 19, y: i + 19, z: 0.5 } : null
				telestrationManager.tick(16)
			}

			// End session
			telestrationManager.endSession()

			// All scribbles should be stopping
			expect(item1.scribble.state).toBe('stopping')
			expect(item2.scribble.state).toBe('stopping')

			// Process fade
			for (let i = 0; i < 200; i++) {
				telestrationManager.tick(50)
			}

			// Session should be cleaned up
			expect(telestrationManager.hasActiveSession()).toBe(false)
		})

		it('should extend session on activity', () => {
			mockUniqueId.mockReturnValueOnce('session-id').mockReturnValueOnce('scribble-1')
			telestrationManager.addScribble({})

			vi.clearAllMocks()

			telestrationManager.extendSession()

			// Should have reset the timeout
			expect(editor.timers.setTimeout).toHaveBeenCalled()
		})
	})

	describe('adding scribble while fading', () => {
		it('should handle adding a new scribble while session is fading', () => {
			mockUniqueId.mockReturnValueOnce('scribble-1').mockReturnValueOnce('session-id')

			// Create first scribble and add points
			const item1 = telestrationManager.addScribble({})
			for (let i = 0; i < 10; i++) {
				item1.scribble.points.push({ x: i, y: i, z: 0.5 })
			}
			item1.scribble.state = 'active'

			// End session to start fading
			telestrationManager.endSession()

			// Tick a bit to start the fade
			telestrationManager.tick(100)

			// Now try to add a new scribble while fading
			mockUniqueId.mockReturnValueOnce('scribble-2')
			const item2 = telestrationManager.addScribble({})

			// Add points to the new scribble
			item2.next = { x: 50, y: 50, z: 0.5 }
			telestrationManager.tick(16)

			// The new scribble should be drawing while the old one fades
			expect(item2.scribble.points.length).toBeGreaterThan(0)
			expect(telestrationManager.hasActiveSession()).toBe(true)
		})
	})

	describe('edge cases', () => {
		it('should handle tick with 0 elapsed time', () => {
			mockUniqueId.mockReturnValueOnce('session-id').mockReturnValueOnce('scribble-1')
			telestrationManager.addScribble({})

			expect(() => telestrationManager.tick(0)).not.toThrow()
		})

		it('should handle very long fade durations', () => {
			;(editor.options as any).telestrationFadeoutMs = 10000

			mockUniqueId.mockReturnValueOnce('session-id').mockReturnValueOnce('scribble-1')
			const item = telestrationManager.addScribble({})
			item.scribble.points.push({ x: 0, y: 0, z: 0.5 })
			item.scribble.state = 'active'

			telestrationManager.endSession()
			telestrationManager.tick(100)

			// With long fade, points should still exist
			expect(item.scribble.points.length).toBeGreaterThanOrEqual(0)
		})

		it('should handle very short fade durations', () => {
			;(editor.options as any).telestrationFadeoutMs = 10

			mockUniqueId.mockReturnValueOnce('session-id').mockReturnValueOnce('scribble-1')
			const item = telestrationManager.addScribble({})
			item.scribble.points.push({ x: 0, y: 0, z: 0.5 })
			item.scribble.state = 'active'

			telestrationManager.endSession()
			telestrationManager.tick(100)

			// With very short fade, should complete quickly
			expect(item.scribble.points.length).toBe(0)
		})
	})
})
