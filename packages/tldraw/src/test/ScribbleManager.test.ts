import { vi } from 'vitest'
import { TestEditor } from './TestEditor'

vi.useFakeTimers()

let editor: TestEditor

beforeEach(() => {
	editor = new TestEditor()
})

afterEach(() => {
	editor?.dispose()
})

describe('ScribbleManager', () => {
	describe('startSession', () => {
		it('creates a new session and returns an id', () => {
			const sessionId = editor.scribbles.startSession()

			expect(typeof sessionId).toBe('string')
			expect(sessionId.length).toBeGreaterThan(0)
		})

		it('creates a session with custom id', () => {
			const sessionId = editor.scribbles.startSession({ id: 'my-session' })

			expect(sessionId).toBe('my-session')
		})

		it('session is active after creation', () => {
			const sessionId = editor.scribbles.startSession()

			expect(editor.scribbles.isSessionActive(sessionId)).toBe(true)
		})
	})

	describe('addScribble (simple API)', () => {
		it('creates a scribble with default values', () => {
			const item = editor.scribbles.addScribble({})

			expect(item.scribble.size).toBe(20)
			expect(item.scribble.color).toBe('accent')
			expect(item.scribble.opacity).toBe(0.8)
			expect(item.scribble.shrink).toBe(0.1)
			expect(item.scribble.taper).toBe(true)
			expect(item.scribble.state).toBe('starting')
		})

		it('creates a scribble with custom values', () => {
			const item = editor.scribbles.addScribble({
				color: 'laser',
				size: 4,
				opacity: 0.7,
			})

			expect(item.scribble.color).toBe('laser')
			expect(item.scribble.size).toBe(4)
			expect(item.scribble.opacity).toBe(0.7)
		})

		it('creates a scribble with custom id', () => {
			const item = editor.scribbles.addScribble({}, 'my-scribble')

			expect(item.id).toBe('my-scribble')
		})
	})

	describe('addScribbleToSession', () => {
		it('adds scribble to an existing session', () => {
			const sessionId = editor.scribbles.startSession()
			const item = editor.scribbles.addScribbleToSession(sessionId, { color: 'laser' })

			expect(item.scribble.color).toBe('laser')
		})

		it('throws for non-existent session', () => {
			expect(() => {
				editor.scribbles.addScribbleToSession('non-existent', {})
			}).toThrow()
		})
	})

	describe('addPoint', () => {
		it('adds point to existing scribble', () => {
			const item = editor.scribbles.addScribble({})

			editor.scribbles.addPoint(item.id, 10, 20, 0.8)

			expect(item.next).toEqual({ x: 10, y: 20, z: 0.8 })
		})

		it('uses default z value of 0.5', () => {
			const item = editor.scribbles.addScribble({})

			editor.scribbles.addPoint(item.id, 10, 20)

			expect(item.next).toEqual({ x: 10, y: 20, z: 0.5 })
		})

		it('throws for non-existent scribble', () => {
			expect(() => {
				editor.scribbles.addPoint('non-existent', 10, 20)
			}).toThrow()
		})
	})

	describe('addPointToSession', () => {
		it('adds point to scribble in session', () => {
			const sessionId = editor.scribbles.startSession()
			const item = editor.scribbles.addScribbleToSession(sessionId, {})

			editor.scribbles.addPointToSession(sessionId, item.id, 10, 20, 0.8)

			expect(item.next).toEqual({ x: 10, y: 20, z: 0.8 })
		})

		it('throws for non-existent session', () => {
			expect(() => {
				editor.scribbles.addPointToSession('non-existent', 'scribble', 10, 20)
			}).toThrow()
		})

		it('throws for non-existent scribble in session', () => {
			const sessionId = editor.scribbles.startSession()

			expect(() => {
				editor.scribbles.addPointToSession(sessionId, 'non-existent', 10, 20)
			}).toThrow()
		})
	})

	describe('stop', () => {
		it('stops an existing scribble', () => {
			const item = editor.scribbles.addScribble({})

			editor.scribbles.stop(item.id)

			expect(item.scribble.state).toBe('stopping')
		})

		it('throws for non-existent scribble', () => {
			expect(() => {
				editor.scribbles.stop('non-existent')
			}).toThrow()
		})
	})

	describe('reset', () => {
		it('clears all sessions and updates instance state', () => {
			const sessionId1 = editor.scribbles.startSession()
			const sessionId2 = editor.scribbles.startSession()
			editor.scribbles.addScribbleToSession(sessionId1, {})
			editor.scribbles.addScribbleToSession(sessionId2, {})

			editor.scribbles.reset()

			expect(editor.scribbles.isSessionActive(sessionId1)).toBe(false)
			expect(editor.scribbles.isSessionActive(sessionId2)).toBe(false)
			expect(editor.getInstanceState().scribbles).toEqual([])
		})
	})

	describe('tick', () => {
		describe('self-consuming behavior (default)', () => {
			it('adds points to scribble in starting state', () => {
				const item = editor.scribbles.addScribble({})
				item.next = { x: 10, y: 10, z: 0.5 }

				editor.scribbles.tick(16)

				expect(item.scribble.points).toHaveLength(1)
				expect(item.prev).toEqual({ x: 10, y: 10, z: 0.5 })
			})

			it('transitions to active after 8 points', () => {
				const item = editor.scribbles.addScribble({})

				for (let i = 0; i < 9; i++) {
					item.next = { x: i * 10, y: i * 10, z: 0.5 }
					editor.scribbles.tick(16)
				}

				expect(item.scribble.state).toBe('active')
			})

			it('shrinks from start when delay is finished and points > 8', () => {
				const item = editor.scribbles.addScribble({ delay: 0 })

				// Add 10 points to get into active state
				for (let i = 0; i < 10; i++) {
					item.next = { x: i * 10, y: i * 10, z: 0.5 }
					editor.scribbles.tick(16)
				}

				const pointsBefore = item.scribble.points.length

				// Add another point - should trigger shrink
				item.next = { x: 100, y: 100, z: 0.5 }
				editor.scribbles.tick(16)

				// Should have same length (one added, one removed)
				expect(item.scribble.points.length).toBe(pointsBefore)
			})
		})

		describe('persistent behavior (selfConsume: false)', () => {
			it('does not shrink while session is active', () => {
				const sessionId = editor.scribbles.startSession({ selfConsume: false })
				const item = editor.scribbles.addScribbleToSession(sessionId, { delay: 0 })

				// Add 15 points
				for (let i = 0; i < 15; i++) {
					item.next = { x: i * 10, y: i * 10, z: 0.5 }
					editor.scribbles.tick(16)
				}

				// All points should be preserved
				expect(item.scribble.points.length).toBe(15)
			})

			it('shrinks after session is stopped', () => {
				const sessionId = editor.scribbles.startSession({ selfConsume: false })
				const item = editor.scribbles.addScribbleToSession(sessionId, { delay: 0 })

				// Add points
				for (let i = 0; i < 5; i++) {
					item.next = { x: i * 10, y: i * 10, z: 0.5 }
					editor.scribbles.tick(16)
				}

				const pointsBefore = item.scribble.points.length

				// Stop the session
				editor.scribbles.stopSession(sessionId)

				// Tick to process shrinking
				for (let i = 0; i < 10; i++) {
					editor.scribbles.tick(16)
				}

				expect(item.scribble.points.length).toBeLessThan(pointsBefore)
			})
		})

		describe('grouped fade behavior', () => {
			it('fades all scribbles together when session stops', () => {
				const sessionId = editor.scribbles.startSession({
					selfConsume: false,
					fadeMode: 'grouped',
					fadeDurationMs: 1000,
				})

				const s1 = editor.scribbles.addScribbleToSession(sessionId, {})
				const s2 = editor.scribbles.addScribbleToSession(sessionId, {})

				// Add points to both
				for (let i = 0; i < 10; i++) {
					s1.next = { x: i, y: i, z: 0.5 }
					s2.next = { x: i + 10, y: i + 10, z: 0.5 }
					editor.scribbles.tick(16)
				}

				const totalBefore = s1.scribble.points.length + s2.scribble.points.length

				// Stop session to trigger grouped fade
				editor.scribbles.stopSession(sessionId)

				// Tick through the fade
				for (let i = 0; i < 100; i++) {
					editor.scribbles.tick(16)
				}

				// Both should have fewer points
				const totalAfter = s1.scribble.points.length + s2.scribble.points.length
				expect(totalAfter).toBeLessThan(totalBefore)
			})

			it('clears all points when fade duration is exceeded', () => {
				const sessionId = editor.scribbles.startSession({
					selfConsume: false,
					fadeMode: 'grouped',
					fadeDurationMs: 100,
				})

				const item = editor.scribbles.addScribbleToSession(sessionId, {})

				// Add points
				for (let i = 0; i < 10; i++) {
					item.next = { x: i, y: i, z: 0.5 }
					editor.scribbles.tick(16)
				}

				editor.scribbles.stopSession(sessionId)

				// Tick past fade duration
				editor.scribbles.tick(150)

				expect(item.scribble.points.length).toBe(0)
			})
		})

		describe('instance state updates', () => {
			it('updates instance state with scribbles', () => {
				const item1 = editor.scribbles.addScribble({ color: 'black' })
				const item2 = editor.scribbles.addScribble({ color: 'white' })
				item1.next = { x: 0, y: 0, z: 0.5 }
				item2.next = { x: 10, y: 10, z: 0.5 }

				editor.scribbles.tick(16)

				const scribbles = editor.getInstanceState().scribbles
				expect(scribbles.length).toBe(2)
				expect(scribbles.some((s) => s.color === 'black')).toBe(true)
				expect(scribbles.some((s) => s.color === 'white')).toBe(true)
			})

			it('does not include empty scribbles in instance state', () => {
				editor.scribbles.addScribble({ color: 'accent' })
				// Don't add any points

				editor.scribbles.tick(16)

				const scribbles = editor.getInstanceState().scribbles
				expect(scribbles.length).toBe(0)
			})
		})

		describe('session cleanup', () => {
			it('removes completed sessions', () => {
				const sessionId = editor.scribbles.startSession({ fadeMode: 'individual' })
				const item = editor.scribbles.addScribbleToSession(sessionId, {})
				item.scribble.points.push({ x: 0, y: 0, z: 0.5 })
				item.scribble.state = 'stopping'
				item.delayRemaining = 0

				// Tick until scribble is removed
				for (let i = 0; i < 20; i++) {
					editor.scribbles.tick(16)
				}

				expect(editor.scribbles.isSessionActive(sessionId)).toBe(false)
			})
		})
	})

	describe('session idle timeout', () => {
		it('auto-stops session after idle timeout', () => {
			const sessionId = editor.scribbles.startSession({
				selfConsume: false,
				idleTimeoutMs: editor.options.laserDelayMs,
			})

			expect(editor.scribbles.isSessionActive(sessionId)).toBe(true)

			// Wait for idle timeout
			vi.advanceTimersByTime(editor.options.laserDelayMs + 100)

			expect(editor.scribbles.isSessionActive(sessionId)).toBe(false)
		})

		it('extendSession can be called on active session', () => {
			const sessionId = editor.scribbles.startSession({
				selfConsume: false,
				idleTimeoutMs: editor.options.laserDelayMs,
			})

			expect(editor.scribbles.isSessionActive(sessionId)).toBe(true)

			// Should not throw
			editor.scribbles.extendSession(sessionId)

			expect(editor.scribbles.isSessionActive(sessionId)).toBe(true)
		})

		it('extendSession is no-op for non-existent session', () => {
			// Should not throw
			editor.scribbles.extendSession('non-existent')
		})
	})

	describe('clearSession', () => {
		it('immediately clears all scribbles in session', () => {
			const sessionId = editor.scribbles.startSession({ selfConsume: false })
			const item = editor.scribbles.addScribbleToSession(sessionId, {})

			// Add points
			for (let i = 0; i < 10; i++) {
				item.next = { x: i, y: i, z: 0.5 }
				editor.scribbles.tick(16)
			}

			expect(item.scribble.points.length).toBe(10)

			editor.scribbles.clearSession(sessionId)
			editor.scribbles.tick(16)

			expect(item.scribble.points.length).toBe(0)
			expect(editor.scribbles.isSessionActive(sessionId)).toBe(false)
		})
	})

	describe('stopSession', () => {
		it('triggers fade-out of all scribbles', () => {
			const sessionId = editor.scribbles.startSession({ selfConsume: false })
			const item = editor.scribbles.addScribbleToSession(sessionId, {})

			// Add enough points to get to active state (needs > 8)
			for (let i = 0; i < 10; i++) {
				item.next = { x: i, y: i, z: 0.5 }
				editor.scribbles.tick(16)
			}

			expect(item.scribble.state).toBe('active')

			editor.scribbles.stopSession(sessionId)

			expect(item.scribble.state).toBe('stopping')
			expect(editor.scribbles.isSessionActive(sessionId)).toBe(false)
		})
	})
})
