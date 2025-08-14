import { TLScribble } from '@tldraw/tlschema'
import { Mock, Mocked, vi } from 'vitest'
import { Editor } from '../../Editor'
import { ScribbleItem, ScribbleManager } from './ScribbleManager'

// Mock the Editor class
vi.mock('../../Editor')
vi.mock('@tldraw/utils', () => ({
	uniqueId: vi.fn(() => 'test-id'),
}))

describe('ScribbleManager', () => {
	let editor: Mocked<Editor>
	let scribbleManager: ScribbleManager
	let mockUniqueId: Mock

	beforeEach(async () => {
		editor = {
			updateInstanceState: vi.fn(),
			run: vi.fn((fn) => fn()),
		} as any

		const { uniqueId } = await vi.importMock('@tldraw/utils')
		mockUniqueId = uniqueId as Mock
		mockUniqueId.mockReturnValue('test-id')

		scribbleManager = new ScribbleManager(editor)
	})

	afterEach(() => {
		vi.clearAllMocks()
	})

	describe('constructor and initialization', () => {
		it('should initialize with empty scribble items and paused state', () => {
			expect(scribbleManager.scribbleItems.size).toBe(0)
			expect(scribbleManager.state).toBe('paused')
		})

		it('should store reference to editor', () => {
			expect((scribbleManager as any).editor).toBe(editor)
		})
	})

	describe('addScribble', () => {
		it('should add a new scribble with default values', () => {
			const result = scribbleManager.addScribble({})

			expect(result).toBeDefined()
			expect(result.id).toBe('test-id')
			expect(result.scribble).toMatchObject({
				id: 'test-id',
				size: 20,
				color: 'accent',
				opacity: 0.8,
				delay: 0,
				points: [],
				shrink: 0.1,
				taper: true,
				state: 'starting',
			})
			expect(result.timeoutMs).toBe(0)
			expect(result.delayRemaining).toBe(0)
			expect(result.prev).toBeNull()
			expect(result.next).toBeNull()
		})

		it('should add a scribble with custom properties', () => {
			const customScribble: Partial<TLScribble> = {
				size: 30,
				color: 'black',
				opacity: 0.5,
				delay: 1000,
				shrink: 0.2,
				taper: false,
			}

			const result = scribbleManager.addScribble(customScribble)

			expect(result.scribble).toMatchObject({
				...customScribble,
				id: 'test-id',
				points: [],
				state: 'starting',
			})
			expect(result.delayRemaining).toBe(1000)
		})

		it('should add scribble with custom id', () => {
			const customId = 'custom-scribble-id'
			const result = scribbleManager.addScribble({}, customId)

			expect(result.id).toBe(customId)
			expect(result.scribble.id).toBe(customId)
			expect(scribbleManager.scribbleItems.has(customId)).toBe(true)
		})

		it('should store scribble in scribbleItems map', () => {
			const result = scribbleManager.addScribble({})

			expect(scribbleManager.scribbleItems.size).toBe(1)
			expect(scribbleManager.scribbleItems.get('test-id')).toBe(result)
		})

		it('should handle multiple scribbles', () => {
			mockUniqueId.mockReturnValueOnce('id1').mockReturnValueOnce('id2').mockReturnValueOnce('id3')

			const scribble1 = scribbleManager.addScribble({ color: 'black' })
			const scribble2 = scribbleManager.addScribble({ color: 'white' })
			const scribble3 = scribbleManager.addScribble({ color: 'accent' })

			expect(scribbleManager.scribbleItems.size).toBe(3)
			expect(scribble1.scribble.color).toBe('black')
			expect(scribble2.scribble.color).toBe('white')
			expect(scribble3.scribble.color).toBe('accent')
		})
	})

	describe('reset', () => {
		it('should clear all scribble items and update instance state', () => {
			mockUniqueId.mockReturnValueOnce('id1').mockReturnValueOnce('id2')
			scribbleManager.addScribble({})
			scribbleManager.addScribble({})
			expect(scribbleManager.scribbleItems.size).toBe(2)

			scribbleManager.reset()

			expect(scribbleManager.scribbleItems.size).toBe(0)
			expect(editor.updateInstanceState).toHaveBeenCalledWith({ scribbles: [] })
		})

		it('should work when no scribbles exist', () => {
			expect(() => scribbleManager.reset()).not.toThrow()
			expect(scribbleManager.scribbleItems.size).toBe(0)
			expect(editor.updateInstanceState).toHaveBeenCalledWith({ scribbles: [] })
		})
	})

	describe('stop', () => {
		it('should stop an existing scribble', () => {
			const item = scribbleManager.addScribble({ delay: 1000 })
			item.delayRemaining = 500

			const result = scribbleManager.stop(item.id)

			expect(result).toBe(item)
			expect(result.scribble.state).toBe('stopping')
			expect(result.delayRemaining).toBe(200) // min(500, 200)
		})

		it('should cap delay at 200ms when stopping', () => {
			const item = scribbleManager.addScribble({ delay: 50 })
			item.delayRemaining = 50

			scribbleManager.stop(item.id)

			expect(item.delayRemaining).toBe(50) // min(50, 200)
		})

		it('should throw error for non-existent scribble', () => {
			expect(() => scribbleManager.stop('non-existent-id')).toThrow(
				'Scribble with id non-existent-id not found'
			)
		})

		it('should handle stopping multiple scribbles', () => {
			mockUniqueId.mockReturnValueOnce('id1').mockReturnValueOnce('id2')

			const item1 = scribbleManager.addScribble({})
			const item2 = scribbleManager.addScribble({})

			scribbleManager.stop('id1')
			scribbleManager.stop('id2')

			expect(item1.scribble.state).toBe('stopping')
			expect(item2.scribble.state).toBe('stopping')
		})
	})

	describe('addPoint', () => {
		it('should add point to existing scribble', () => {
			const item = scribbleManager.addScribble({})

			const result = scribbleManager.addPoint(item.id, 10, 20, 0.7)

			expect(result).toBe(item)
			expect(result.next).toEqual({ x: 10, y: 20, z: 0.7 })
		})

		it('should use default z value of 0.5', () => {
			const item = scribbleManager.addScribble({})

			scribbleManager.addPoint(item.id, 10, 20)

			expect(item.next).toEqual({ x: 10, y: 20, z: 0.5 })
		})

		it('should only set next if distance from prev is >= 1', () => {
			const item = scribbleManager.addScribble({})
			item.prev = { x: 10, y: 20, z: 0.5 }

			// Distance < 1 (should not set next)
			scribbleManager.addPoint(item.id, 10.5, 20.3)
			expect(item.next).toBeNull()

			// Distance >= 1 (should set next)
			scribbleManager.addPoint(item.id, 11, 21)
			expect(item.next).toEqual({ x: 11, y: 21, z: 0.5 })
		})

		it('should set next when prev is null', () => {
			const item = scribbleManager.addScribble({})
			expect(item.prev).toBeNull()

			scribbleManager.addPoint(item.id, 5, 5)

			expect(item.next).toEqual({ x: 5, y: 5, z: 0.5 })
		})

		it('should throw error for non-existent scribble', () => {
			expect(() => scribbleManager.addPoint('non-existent-id', 10, 20)).toThrow(
				'Scribble with id non-existent-id not found'
			)
		})

		it('should handle multiple points', () => {
			const item = scribbleManager.addScribble({})

			scribbleManager.addPoint(item.id, 0, 0)
			expect(item.next).toEqual({ x: 0, y: 0, z: 0.5 })

			item.prev = item.next
			scribbleManager.addPoint(item.id, 10, 10)
			expect(item.next).toEqual({ x: 10, y: 10, z: 0.5 })
		})
	})

	describe('tick', () => {
		it('should return early when no scribble items exist', () => {
			scribbleManager.tick(16)

			expect(editor.run).not.toHaveBeenCalled()
		})

		it('should wrap tick operations in editor.run', () => {
			scribbleManager.addScribble({})

			scribbleManager.tick(16)

			expect(editor.run).toHaveBeenCalledWith(expect.any(Function))
		})

		describe('starting state behavior', () => {
			it('should add points to scribble in starting state', () => {
				const item = scribbleManager.addScribble({})
				item.next = { x: 10, y: 20, z: 0.5 }

				scribbleManager.tick(16)

				expect(item.prev).toEqual({ x: 10, y: 20, z: 0.5 })
				expect(item.scribble.points).toHaveLength(1)
				expect(item.scribble.points[0]).toEqual({ x: 10, y: 20, z: 0.5 })
			})

			it('should not add point if next equals prev', () => {
				const item = scribbleManager.addScribble({})
				const point = { x: 10, y: 20, z: 0.5 }
				item.next = point
				item.prev = point

				scribbleManager.tick(16)

				expect(item.scribble.points).toHaveLength(0)
			})

			it('should transition to active after 8 points', () => {
				const item = scribbleManager.addScribble({})

				// Add 9 points to trigger transition
				for (let i = 0; i < 9; i++) {
					item.next = { x: i, y: i, z: 0.5 }
					item.prev = null // Reset prev to ensure point is added
					scribbleManager.tick(16)
				}

				expect(item.scribble.state).toBe('active')
				expect(item.scribble.points).toHaveLength(9)
			})
		})

		describe('active state behavior', () => {
			let item: ScribbleItem

			beforeEach(() => {
				item = scribbleManager.addScribble({})
				item.scribble.state = 'active'
			})

			it('should add new points when next differs from prev', () => {
				item.next = { x: 10, y: 20, z: 0.5 }
				item.prev = { x: 0, y: 0, z: 0.5 }

				scribbleManager.tick(16)

				expect(item.prev).toEqual({ x: 10, y: 20, z: 0.5 })
				expect(item.scribble.points).toContainEqual({ x: 10, y: 20, z: 0.5 })
			})

			it('should shrink from start when delay is finished and points > 8', () => {
				// Set up scribble with > 8 points and no delay
				for (let i = 0; i < 10; i++) {
					item.scribble.points.push({ x: i, y: i, z: 0.5 })
				}
				item.delayRemaining = 0
				item.next = { x: 50, y: 50, z: 0.5 }

				scribbleManager.tick(16)

				expect(item.scribble.points).toHaveLength(10) // Added one, removed one
				expect(item.scribble.points[0]).toEqual({ x: 1, y: 1, z: 0.5 }) // First was removed
			})

			it('should shrink when not moving and timeout reached', () => {
				item.scribble.points.push({ x: 1, y: 1, z: 0.5 })
				item.scribble.points.push({ x: 2, y: 2, z: 0.5 })
				item.timeoutMs = 16 // Will reset to 0, triggering shrink

				scribbleManager.tick(16)

				expect(item.scribble.points).toHaveLength(1)
				expect(item.scribble.points[0]).toEqual({ x: 2, y: 2, z: 0.5 })
			})

			it('should reset delay when down to single point while stationary', () => {
				item.scribble.points.push({ x: 1, y: 1, z: 0.5 })
				item.scribble.delay = 500
				item.delayRemaining = 0
				item.timeoutMs = 16

				scribbleManager.tick(16)

				expect(item.delayRemaining).toBe(500)
			})

			it('should update timeout correctly', () => {
				item.timeoutMs = 10

				scribbleManager.tick(5)
				expect(item.timeoutMs).toBe(15)

				scribbleManager.tick(2)
				expect(item.timeoutMs).toBe(0) // Reset when >= 16 (15 + 2 = 17)
			})

			it('should reduce delay remaining', () => {
				item.delayRemaining = 100

				scribbleManager.tick(30)

				expect(item.delayRemaining).toBeLessThan(100)
			})

			it('should not reduce delay below 0', () => {
				item.delayRemaining = 10

				scribbleManager.tick(30)

				expect(item.delayRemaining).toBe(0)
			})
		})

		describe('stopping state behavior', () => {
			let item: ScribbleItem

			beforeEach(() => {
				item = scribbleManager.addScribble({})
				item.scribble.state = 'stopping'
			})

			it('should remove points when delay is finished and timeout reached', () => {
				item.scribble.points.push({ x: 1, y: 1, z: 0.5 })
				item.scribble.points.push({ x: 2, y: 2, z: 0.5 })
				item.delayRemaining = 0
				item.timeoutMs = 16

				scribbleManager.tick(16)

				expect(item.scribble.points).toHaveLength(1)
				expect(item.scribble.points[0]).toEqual({ x: 2, y: 2, z: 0.5 })
			})

			it('should shrink scribble size when shrink is enabled', () => {
				item.scribble.points.push({ x: 1, y: 1, z: 0.5 })
				item.scribble.points.push({ x: 2, y: 2, z: 0.5 })
				item.scribble.size = 20
				item.scribble.shrink = 0.1
				item.delayRemaining = 0
				item.timeoutMs = 16

				scribbleManager.tick(16)

				expect(item.scribble.size).toBe(18) // 20 * (1 - 0.1)
			})

			it('should not shrink size below 1', () => {
				item.scribble.points.push({ x: 1, y: 1, z: 0.5 })
				item.scribble.points.push({ x: 2, y: 2, z: 0.5 })
				item.scribble.size = 1.5
				item.scribble.shrink = 0.8
				item.delayRemaining = 0
				item.timeoutMs = 16

				scribbleManager.tick(16)

				expect(item.scribble.size).toBe(1) // Math.max(1, 1.5 * 0.2)
			})

			it('should remove scribble when down to one point', () => {
				item.scribble.points.push({ x: 1, y: 1, z: 0.5 })
				item.delayRemaining = 0
				item.timeoutMs = 16

				scribbleManager.tick(16)

				expect(scribbleManager.scribbleItems.has(item.id)).toBe(false)
			})

			it('should not process when delay remaining > 0', () => {
				item.scribble.points.push({ x: 1, y: 1, z: 0.5 })
				item.scribble.points.push({ x: 2, y: 2, z: 0.5 })
				item.delayRemaining = 100
				item.timeoutMs = 16

				scribbleManager.tick(16)

				expect(item.scribble.points).toHaveLength(2) // No change
			})

			it('should not process when timeout < 16', () => {
				item.scribble.points.push({ x: 1, y: 1, z: 0.5 })
				item.scribble.points.push({ x: 2, y: 2, z: 0.5 })
				item.delayRemaining = 0
				item.timeoutMs = 10

				scribbleManager.tick(5)

				expect(item.scribble.points).toHaveLength(2) // No change
				expect(item.timeoutMs).toBe(15)
			})
		})

		describe('paused state behavior', () => {
			it('should do nothing when scribble is paused', () => {
				const item = scribbleManager.addScribble({})
				item.scribble.state = 'paused'
				item.scribble.points.push({ x: 1, y: 1, z: 0.5 })
				const originalPoints = [...item.scribble.points]

				scribbleManager.tick(16)

				expect(item.scribble.points).toEqual(originalPoints)
			})
		})

		describe('instance state updates', () => {
			it('should update instance state with scribbles', () => {
				mockUniqueId.mockReturnValueOnce('id1').mockReturnValueOnce('id2')
				scribbleManager.addScribble({ color: 'black' })
				scribbleManager.addScribble({ color: 'white' })

				scribbleManager.tick(16)

				expect(editor.updateInstanceState).toHaveBeenCalledWith({
					scribbles: expect.arrayContaining([
						expect.objectContaining({
							color: 'black',
							points: expect.any(Array),
						}),
						expect.objectContaining({
							color: 'white',
							points: expect.any(Array),
						}),
					]),
				})
			})

			it('should create copies of scribbles for instance state', () => {
				const item = scribbleManager.addScribble({})
				item.scribble.points.push({ x: 1, y: 1, z: 0.5 })

				scribbleManager.tick(16)

				const call = editor.updateInstanceState.mock.calls[0][0]
				const scribbleInState = call.scribbles![0]

				// Modify the original
				item.scribble.points.push({ x: 2, y: 2, z: 0.5 })

				// State copy should be unaffected
				expect(scribbleInState.points).toHaveLength(1)
			})

			it('should limit scribbles to 5 items', () => {
				// Add 7 scribbles
				const colors = ['accent', 'black', 'white', 'laser', 'muted-1', 'accent', 'black'] as const
				for (let i = 0; i < 7; i++) {
					mockUniqueId.mockReturnValueOnce(`id${i}`)
					scribbleManager.addScribble({ color: colors[i] })
				}

				scribbleManager.tick(16)

				const call = editor.updateInstanceState.mock.calls[0][0]
				expect(call.scribbles).toHaveLength(5)
			})
		})
	})

	describe('edge cases and error handling', () => {
		it('should handle Vec.Dist calculation edge cases', () => {
			const item = scribbleManager.addScribble({})
			item.prev = { x: 0, y: 0, z: 0 }

			// Exactly distance 1
			scribbleManager.addPoint(item.id, 1, 0)
			expect(item.next).toEqual({ x: 1, y: 0, z: 0.5 })

			// Reset and test just under distance 1
			item.next = null
			scribbleManager.addPoint(item.id, 0.9, 0)
			expect(item.next).toBeNull()
		})

		it('should handle multiple scribbles in different states', () => {
			mockUniqueId
				.mockReturnValueOnce('starting')
				.mockReturnValueOnce('active')
				.mockReturnValueOnce('stopping')

			const startingItem = scribbleManager.addScribble({})
			const activeItem = scribbleManager.addScribble({})
			const stoppingItem = scribbleManager.addScribble({})

			activeItem.scribble.state = 'active'
			stoppingItem.scribble.state = 'stopping'

			startingItem.next = { x: 1, y: 1, z: 0.5 }
			activeItem.next = { x: 2, y: 2, z: 0.5 }
			stoppingItem.scribble.points.push({ x: 3, y: 3, z: 0.5 })
			stoppingItem.delayRemaining = 0
			stoppingItem.timeoutMs = 16

			scribbleManager.tick(16)

			expect(startingItem.scribble.points).toHaveLength(1)
			expect(activeItem.scribble.points).toHaveLength(1)
			expect(scribbleManager.scribbleItems.has('stopping')).toBe(false) // Removed
		})

		it('should handle tick with 0 elapsed time', () => {
			const item = scribbleManager.addScribble({})
			item.delayRemaining = 100

			expect(() => scribbleManager.tick(0)).not.toThrow()
			expect(item.delayRemaining).toBe(100) // Should remain unchanged
		})

		it('should handle negative elapsed time', () => {
			const item = scribbleManager.addScribble({})
			item.delayRemaining = 100

			scribbleManager.tick(-50)

			expect(item.delayRemaining).toBe(100) // Should remain unchanged or handle gracefully
		})

		it('should handle empty points array operations', () => {
			const item = scribbleManager.addScribble({})
			item.scribble.state = 'active'
			item.timeoutMs = 16

			expect(() => scribbleManager.tick(16)).not.toThrow()
		})
	})

	describe('integration scenarios', () => {
		it('should handle complete scribble lifecycle', () => {
			const item = scribbleManager.addScribble({ delay: 100 })

			// Starting state - add points
			for (let i = 0; i < 10; i++) {
				item.next = { x: i, y: i, z: 0.5 }
				item.prev = null
				scribbleManager.tick(16)
			}

			expect(item.scribble.state).toBe('active')
			expect(item.scribble.points).toHaveLength(10)

			// Stop the scribble
			scribbleManager.stop(item.id)
			expect(item.scribble.state).toBe('stopping')

			// Process until removed
			let iterations = 0
			while (scribbleManager.scribbleItems.has(item.id) && iterations < 20) {
				scribbleManager.tick(16)
				iterations++
			}

			expect(scribbleManager.scribbleItems.has(item.id)).toBe(false)
		})

		it('should handle rapid point additions', () => {
			const item = scribbleManager.addScribble({})

			// Add many points rapidly
			for (let i = 0; i < 100; i++) {
				scribbleManager.addPoint(item.id, i * 2, i * 2) // Ensure distance > 1
			}

			expect(item.next).toEqual({ x: 198, y: 198, z: 0.5 })
		})
	})
})
