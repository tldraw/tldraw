import * as utils from '@tldraw/utils'
import { afterEach, beforeEach, describe, expect, it, Mock, Mocked, vi } from 'vitest'
import { Editor } from '../../Editor'
import { ScribbleManager } from './ScribbleManager'

vi.mock('@tldraw/utils', async (importOriginal) => {
	const actual = await importOriginal<typeof import('@tldraw/utils')>()
	return {
		...actual,
		uniqueId: vi.fn(() => 'test-id'),
	}
})

const mockUniqueId = utils.uniqueId as Mock

describe('ScribbleManager', () => {
	let editor: Mocked<Editor>
	let scribbleManager: ScribbleManager

	beforeEach(() => {
		editor = {
			updateInstanceState: vi.fn(),
			getInstanceState: vi.fn(() => ({ scribbles: [] })),
			run: vi.fn((fn) => fn()),
			options: {
				laserDelayMs: 1500,
				laserFadeoutMs: 1500,
			},
			timers: {
				setTimeout: vi.fn((fn, ms) => setTimeout(fn, ms)),
			},
		} as any

		mockUniqueId.mockReturnValue('test-id')

		scribbleManager = new ScribbleManager(editor)
	})

	afterEach(() => {
		vi.clearAllMocks()
	})

	describe('startSession', () => {
		it('should create a new session with default options', () => {
			mockUniqueId.mockReturnValueOnce('session-1')
			const session = scribbleManager.startSession()

			expect(session.id).toBe('session-1')
			expect(session.isActive()).toBe(true)
		})

		it('should create a session with custom id', () => {
			const session = scribbleManager.startSession({ id: 'my-session' })

			expect(session.id).toBe('my-session')
		})

		it('should be retrievable via getSession', () => {
			const session = scribbleManager.startSession({ id: 'my-session' })

			expect(scribbleManager.getSession('my-session')).toBe(session)
		})
	})

	describe('addScribble (convenience method)', () => {
		it('should create a session and add a scribble', () => {
			mockUniqueId.mockReturnValueOnce('session-1').mockReturnValueOnce('scribble-1')
			const result = scribbleManager.addScribble({ color: 'accent' })

			expect(result.id).toBe('scribble-1')
			expect(result.session).toBeDefined()
			expect(result.session.id).toBe('session-1')
		})

		it('should add scribble with custom id', () => {
			mockUniqueId.mockReturnValueOnce('session-1')
			const result = scribbleManager.addScribble({ color: 'accent' }, 'my-scribble')

			expect(result.id).toBe('my-scribble')
		})

		it('should set default scribble values', () => {
			mockUniqueId.mockReturnValueOnce('session-1').mockReturnValueOnce('scribble-1')
			const result = scribbleManager.addScribble({})

			expect(result.scribble.size).toBe(20)
			expect(result.scribble.color).toBe('accent')
			expect(result.scribble.opacity).toBe(0.8)
			expect(result.scribble.shrink).toBe(0.1)
			expect(result.scribble.taper).toBe(true)
			expect(result.scribble.state).toBe('starting')
		})
	})

	describe('addPoint', () => {
		it('should add point to existing scribble', () => {
			mockUniqueId.mockReturnValueOnce('session-1').mockReturnValueOnce('scribble-1')
			const result = scribbleManager.addScribble({})

			scribbleManager.addPoint('scribble-1', 10, 20, 0.8)

			expect(result.next).toEqual({ x: 10, y: 20, z: 0.8 })
		})

		it('should use default z value of 0.5', () => {
			mockUniqueId.mockReturnValueOnce('session-1').mockReturnValueOnce('scribble-1')
			const result = scribbleManager.addScribble({})

			scribbleManager.addPoint('scribble-1', 10, 20)

			expect(result.next).toEqual({ x: 10, y: 20, z: 0.5 })
		})

		it('should throw error for non-existent scribble', () => {
			expect(() => scribbleManager.addPoint('non-existent', 10, 20)).toThrow()
		})
	})

	describe('stop', () => {
		it('should stop an existing scribble', () => {
			mockUniqueId.mockReturnValueOnce('session-1').mockReturnValueOnce('scribble-1')
			const result = scribbleManager.addScribble({})

			scribbleManager.stop('scribble-1')

			expect(result.scribble.state).toBe('stopping')
		})

		it('should throw error for non-existent scribble', () => {
			expect(() => scribbleManager.stop('non-existent')).toThrow()
		})
	})

	describe('reset', () => {
		it('should clear all sessions and update instance state', () => {
			scribbleManager.startSession({ id: 'session-1' })
			scribbleManager.startSession({ id: 'session-2' })

			scribbleManager.reset()

			expect(scribbleManager.getSession('session-1')).toBeUndefined()
			expect(scribbleManager.getSession('session-2')).toBeUndefined()
			expect(editor.updateInstanceState).toHaveBeenCalledWith({ scribbles: [] })
		})
	})

	describe('tick', () => {
		it('should return early when no sessions exist', () => {
			scribbleManager.tick(16)

			expect(editor.run).not.toHaveBeenCalled()
		})

		it('should wrap tick operations in editor.run', () => {
			mockUniqueId.mockReturnValueOnce('session-1').mockReturnValueOnce('scribble-1')
			const result = scribbleManager.addScribble({})
			result.scribble.points.push({ x: 0, y: 0, z: 0.5 })

			scribbleManager.tick(16)

			expect(editor.run).toHaveBeenCalled()
		})

		describe('self-consuming behavior (default)', () => {
			it('should add points to scribble in starting state', () => {
				mockUniqueId.mockReturnValueOnce('session-1').mockReturnValueOnce('scribble-1')
				const result = scribbleManager.addScribble({})
				result.next = { x: 10, y: 10, z: 0.5 }

				scribbleManager.tick(16)

				expect(result.scribble.points).toHaveLength(1)
				expect(result.prev).toEqual({ x: 10, y: 10, z: 0.5 })
			})

			it('should transition to active after 8 points', () => {
				mockUniqueId.mockReturnValueOnce('session-1').mockReturnValueOnce('scribble-1')
				const result = scribbleManager.addScribble({})

				for (let i = 0; i < 9; i++) {
					result.next = { x: i * 10, y: i * 10, z: 0.5 }
					scribbleManager.tick(16)
				}

				expect(result.scribble.state).toBe('active')
			})

			it('should shrink from start when delay is finished and points > 8', () => {
				mockUniqueId.mockReturnValueOnce('session-1').mockReturnValueOnce('scribble-1')
				const result = scribbleManager.addScribble({ delay: 0 })

				// Add 10 points to get into active state
				for (let i = 0; i < 10; i++) {
					result.next = { x: i * 10, y: i * 10, z: 0.5 }
					scribbleManager.tick(16)
				}

				const pointsBefore = result.scribble.points.length

				// Add another point - should trigger shrink
				result.next = { x: 100, y: 100, z: 0.5 }
				scribbleManager.tick(16)

				// Should have same length (one added, one removed)
				expect(result.scribble.points.length).toBe(pointsBefore)
			})
		})

		describe('persistent behavior (selfConsume: false)', () => {
			it('should not shrink while session is active', () => {
				mockUniqueId.mockReturnValueOnce('session-1').mockReturnValueOnce('scribble-1')
				const session = scribbleManager.startSession({ selfConsume: false })
				const scribble = session.addScribble({ delay: 0 })

				// Add 15 points
				for (let i = 0; i < 15; i++) {
					scribble.next = { x: i * 10, y: i * 10, z: 0.5 }
					scribbleManager.tick(16)
				}

				// All points should be preserved
				expect(scribble.scribble.points.length).toBe(15)
			})

			it('should shrink a stopped scribble', () => {
				mockUniqueId.mockReturnValueOnce('session-1').mockReturnValueOnce('scribble-1')
				const session = scribbleManager.startSession({ selfConsume: false })
				const scribble = session.addScribble({ delay: 0 })
				scribble.scribble.points.push({ x: 0, y: 0, z: 0.5 })
				scribble.scribble.points.push({ x: 1, y: 1, z: 0.5 })

				session.stopScribble(scribble.id)
				const before = scribble.scribble.points.length

				scribbleManager.tick(16)

				expect(scribble.scribble.points.length).toBeLessThan(before)
			})
		})

		describe('grouped fade behavior', () => {
			it('should fade all scribbles together when session stops', () => {
				mockUniqueId
					.mockReturnValueOnce('session-1')
					.mockReturnValueOnce('scribble-1')
					.mockReturnValueOnce('scribble-2')

				const session = scribbleManager.startSession({
					selfConsume: false,
					fadeMode: 'grouped',
					fadeDurationMs: 1000,
				})

				const s1 = session.addScribble({})
				const s2 = session.addScribble({})

				// Add points directly
				for (let i = 0; i < 10; i++) {
					s1.scribble.points.push({ x: i, y: i, z: 0.5 })
					s2.scribble.points.push({ x: i + 10, y: i + 10, z: 0.5 })
				}

				session.stop()

				// Tick through the fade
				for (let i = 0; i < 100; i++) {
					scribbleManager.tick(16)
				}

				// Both should have fewer points
				const totalPoints = s1.scribble.points.length + s2.scribble.points.length
				expect(totalPoints).toBeLessThan(20)
			})
		})

		describe('instance state updates', () => {
			it('should update instance state with scribbles', () => {
				mockUniqueId
					.mockReturnValueOnce('session-1')
					.mockReturnValueOnce('scribble-1')
					.mockReturnValueOnce('session-2')
					.mockReturnValueOnce('scribble-2')

				const result1 = scribbleManager.addScribble({ color: 'black' })
				const result2 = scribbleManager.addScribble({ color: 'white' })
				result1.scribble.points.push({ x: 0, y: 0, z: 0.5 })
				result2.scribble.points.push({ x: 0, y: 0, z: 0.5 })

				scribbleManager.tick(16)

				expect(editor.updateInstanceState).toHaveBeenCalledWith({
					scribbles: expect.arrayContaining([
						expect.objectContaining({ color: 'black' }),
						expect.objectContaining({ color: 'white' }),
					]),
				})
			})

			it('should include all scribbles', () => {
				// Add 7 scribbles with points
				for (let i = 0; i < 7; i++) {
					mockUniqueId.mockReturnValueOnce(`session-${i}`).mockReturnValueOnce(`scribble-${i}`)
					const result = scribbleManager.addScribble({ color: 'accent' })
					result.scribble.points.push({ x: i, y: i, z: 0.5 })
				}

				scribbleManager.tick(16)

				const call = editor.updateInstanceState.mock.calls[0][0]
				expect(call.scribbles).toHaveLength(7)
			})

			it('should not include empty scribbles', () => {
				mockUniqueId.mockReturnValueOnce('session-1').mockReturnValueOnce('scribble-1')
				scribbleManager.addScribble({ color: 'accent' })
				// Don't add any points

				scribbleManager.tick(16)

				const call = editor.updateInstanceState.mock.calls[0][0]
				expect(call.scribbles).toHaveLength(0)
			})
		})

		describe('session cleanup', () => {
			it('should remove completed sessions', () => {
				mockUniqueId.mockReturnValueOnce('session-1').mockReturnValueOnce('scribble-1')
				const session = scribbleManager.startSession({ fadeMode: 'individual' })
				const scribble = session.addScribble({})
				scribble.scribble.points.push({ x: 0, y: 0, z: 0.5 })
				scribble.scribble.state = 'stopping'
				scribble.delayRemaining = 0

				// Tick until scribble is removed
				for (let i = 0; i < 20; i++) {
					scribbleManager.tick(16)
				}

				expect(scribbleManager.getSession('session-1')).toBeUndefined()
			})
		})
	})

	describe('ScribbleSession', () => {
		describe('addScribble', () => {
			it('should add scribble to session', () => {
				mockUniqueId.mockReturnValueOnce('session-1').mockReturnValueOnce('scribble-1')
				const session = scribbleManager.startSession()
				const scribble = session.addScribble({ color: 'laser' })

				expect(session.items).toContain(scribble)
				expect(scribble.scribble.color).toBe('laser')
			})
		})

		describe('stop', () => {
			it('should mark session as stopping', () => {
				mockUniqueId.mockReturnValueOnce('session-1')
				const session = scribbleManager.startSession()

				session.stop()

				expect(session.isActive()).toBe(false)
			})
		})

		describe('extend', () => {
			it('should reset idle timeout', () => {
				mockUniqueId.mockReturnValueOnce('session-1')
				const session = scribbleManager.startSession({ idleTimeoutMs: 1000 })

				session.extend()

				// Should have called setTimeout again
				expect(editor.timers.setTimeout).toHaveBeenCalledTimes(2)
			})
		})

		describe('getScribbles', () => {
			it('should return copies of scribbles', () => {
				mockUniqueId.mockReturnValueOnce('session-1').mockReturnValueOnce('scribble-1')
				const session = scribbleManager.startSession()
				const scribble = session.addScribble({})
				scribble.scribble.points.push({ x: 1, y: 1, z: 0.5 })

				const result = session.getScribbles()

				// Modify original
				scribble.scribble.points.push({ x: 2, y: 2, z: 0.5 })

				// Copy should be unaffected
				expect(result[0].points).toHaveLength(1)
			})

			it('should not include empty scribbles', () => {
				mockUniqueId.mockReturnValueOnce('session-1').mockReturnValueOnce('scribble-1')
				const session = scribbleManager.startSession()
				session.addScribble({})
				// Don't add points

				const result = session.getScribbles()

				expect(result).toHaveLength(0)
			})
		})
	})
})
