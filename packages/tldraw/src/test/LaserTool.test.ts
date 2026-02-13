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

describe('LaserTool', () => {
	describe('State chart', () => {
		it('starts in idle state', () => {
			editor.setCurrentTool('laser')
			editor.expectToBeIn('laser.idle')
		})

		it('sets cursor to cross on enter', () => {
			editor.setCurrentTool('laser')
			expect(editor.getInstanceState().cursor.type).toBe('cross')
		})

		it('transitions to lasering on pointer down', () => {
			editor.setCurrentTool('laser')
			editor.expectToBeIn('laser.idle')

			editor.pointerDown(0, 0)
			editor.expectToBeIn('laser.lasering')
		})

		it('transitions back to idle on pointer up', () => {
			editor.setCurrentTool('laser')
			editor.pointerDown(0, 0)
			editor.expectToBeIn('laser.lasering')

			editor.pointerUp()
			editor.expectToBeIn('laser.idle')
		})

		it('transitions to idle on cancel while lasering', () => {
			editor.setCurrentTool('laser')
			editor.pointerDown(0, 0)
			editor.expectToBeIn('laser.lasering')

			editor.cancel()
			editor.expectToBeIn('laser.idle')
		})

		it('switches to select tool on cancel from idle without session', () => {
			editor.setCurrentTool('laser')
			editor.expectToBeIn('laser.idle')

			// Cancel without ever drawing - should switch to select
			editor.cancel()
			editor.expectToBeIn('select.idle')
		})

		it('clears scribbles and stays in idle on cancel with active session', () => {
			editor.setCurrentTool('laser')

			// Draw to create a session
			editor.pointerDown(0, 0)
			editor.pointerMove(10, 10)
			vi.advanceTimersByTime(16)
			editor.pointerUp()

			editor.expectToBeIn('laser.idle')

			// Verify we have scribbles
			let scribbles = editor.getInstanceState().scribbles
			expect(scribbles.length).toBeGreaterThan(0)

			// Cancel should clear scribbles and stay in idle
			editor.cancel()
			editor.expectToBeIn('laser.idle')

			vi.advanceTimersByTime(16)
			scribbles = editor.getInstanceState().scribbles
			expect(scribbles.length).toBe(0)
		})

		it('handles complete event from lasering state', () => {
			editor.setCurrentTool('laser')
			editor.pointerDown(0, 0)
			editor.expectToBeIn('laser.lasering')

			// Send complete event
			editor.complete()
			editor.expectToBeIn('laser.idle')
		})
	})

	describe('Scribble creation', () => {
		it('creates a scribble when drawing', () => {
			editor.setCurrentTool('laser')
			editor.pointerDown(0, 0)
			editor.pointerMove(10, 10)
			vi.advanceTimersByTime(16)

			const scribbles = editor.getInstanceState().scribbles
			expect(scribbles.length).toBeGreaterThan(0)
		})

		it('creates scribble with laser color', () => {
			editor.setCurrentTool('laser')
			editor.pointerDown(0, 0)
			editor.pointerMove(10, 10)
			vi.advanceTimersByTime(16)

			const scribbles = editor.getInstanceState().scribbles
			expect(scribbles[0].color).toBe('laser')
		})

		it('creates scribble with correct properties', () => {
			editor.setCurrentTool('laser')
			editor.pointerDown(0, 0)
			editor.pointerMove(10, 10)
			vi.advanceTimersByTime(16)

			const scribbles = editor.getInstanceState().scribbles
			expect(scribbles[0]).toMatchObject({
				color: 'laser',
				opacity: 0.7,
				size: 4,
				taper: false,
			})
		})

		it('adds points to scribble on pointer move', () => {
			editor.setCurrentTool('laser')
			editor.pointerDown(0, 0)

			for (let i = 1; i <= 10; i++) {
				editor.pointerMove(i * 5, i * 5)
				vi.advanceTimersByTime(16)
			}

			const scribbles = editor.getInstanceState().scribbles
			expect(scribbles[0].points.length).toBeGreaterThan(1)
		})
	})

	describe('Session behavior', () => {
		it('handles multiple strokes in a single session', () => {
			editor.setCurrentTool('laser')

			// First stroke
			editor.pointerDown(0, 0)
			for (let i = 1; i <= 5; i++) {
				editor.pointerMove(i * 5, 0)
				vi.advanceTimersByTime(16)
			}
			editor.pointerUp()

			// Second stroke (within idle timeout)
			vi.advanceTimersByTime(100)
			editor.pointerDown(0, 50)
			for (let i = 1; i <= 5; i++) {
				editor.pointerMove(i * 5, 50)
				vi.advanceTimersByTime(16)
			}
			editor.pointerUp()

			// Both strokes should be visible
			const scribbles = editor.getInstanceState().scribbles
			expect(scribbles.length).toBe(2)
		})

		it('extends session on tick while lasering', () => {
			editor.setCurrentTool('laser')
			editor.pointerDown(0, 0)

			// Simulate drawing for longer than idle timeout
			const drawDuration = editor.options.laserDelayMs + 500
			for (let elapsed = 0; elapsed < drawDuration; elapsed += 16) {
				editor.pointerMove(elapsed / 10, elapsed / 10)
				vi.advanceTimersByTime(16)
			}

			// Should still have scribbles because session was extended
			const scribbles = editor.getInstanceState().scribbles
			expect(scribbles.length).toBeGreaterThan(0)
			expect(scribbles[0].points.length).toBeGreaterThan(0)
		})

		it('fades out scribbles after idle timeout', () => {
			editor.setCurrentTool('laser')

			// Draw a stroke
			editor.pointerDown(0, 0)
			for (let i = 1; i <= 10; i++) {
				editor.pointerMove(i * 5, i * 5)
				vi.advanceTimersByTime(16)
			}
			editor.pointerUp()

			// Verify scribbles exist
			let scribbles = editor.getInstanceState().scribbles
			expect(scribbles.length).toBeGreaterThan(0)

			// Wait for idle timeout to trigger fade
			vi.advanceTimersByTime(editor.options.laserDelayMs + 100)

			// Wait for fade to complete
			vi.advanceTimersByTime(editor.options.laserFadeoutMs + 100)

			// Scribbles should be completely gone
			scribbles = editor.getInstanceState().scribbles
			expect(scribbles.length).toBe(0)
		})

		it('allows creating a new session while previous session is fading', () => {
			editor.setCurrentTool('laser')

			// First session
			editor.pointerDown(0, 0)
			for (let i = 1; i <= 5; i++) {
				editor.pointerMove(i * 5, 0)
				vi.advanceTimersByTime(16)
			}
			editor.pointerUp()

			// Wait for idle timeout to start fading
			vi.advanceTimersByTime(editor.options.laserDelayMs + 100)

			// Partially through fade
			vi.advanceTimersByTime(editor.options.laserFadeoutMs / 2)

			// Start a new stroke while first is still fading
			editor.pointerDown(0, 100)
			for (let i = 1; i <= 5; i++) {
				editor.pointerMove(i * 5, 100)
				vi.advanceTimersByTime(16)
			}
			editor.pointerUp()

			// Should have scribbles from the new session
			let scribbles = editor.getInstanceState().scribbles
			expect(scribbles.length).toBeGreaterThan(0)

			// Wait for everything to complete
			vi.advanceTimersByTime(editor.options.laserDelayMs + 100)
			vi.advanceTimersByTime(editor.options.laserFadeoutMs + 200)

			// All should be cleared
			scribbles = editor.getInstanceState().scribbles
			expect(scribbles.length).toBe(0)
		})
	})

	describe('Cancel behavior', () => {
		it('canceling while lasering clears scribbles and returns to idle', () => {
			editor.setCurrentTool('laser')

			// Start drawing
			editor.pointerDown(0, 0)
			for (let i = 1; i <= 5; i++) {
				editor.pointerMove(i * 5, i * 5)
				vi.advanceTimersByTime(16)
			}

			// Verify scribbles exist before cancel
			expect(editor.getInstanceState().scribbles.length).toBeGreaterThan(0)

			// Cancel mid-stroke - child state completes stroke, then parent clears session
			editor.cancel()
			editor.expectToBeIn('laser.idle')

			// Scribbles should be cleared (parent's onCancel clears the session)
			vi.advanceTimersByTime(16)
			const scribbles = editor.getInstanceState().scribbles
			expect(scribbles.length).toBe(0)
		})

		it('canceling from idle with session clears all scribbles immediately', () => {
			editor.setCurrentTool('laser')

			// Draw multiple strokes
			editor.pointerDown(0, 0)
			for (let i = 1; i <= 5; i++) {
				editor.pointerMove(i * 5, 0)
				vi.advanceTimersByTime(16)
			}
			editor.pointerUp()

			vi.advanceTimersByTime(100)

			editor.pointerDown(0, 50)
			for (let i = 1; i <= 5; i++) {
				editor.pointerMove(i * 5, 50)
				vi.advanceTimersByTime(16)
			}
			editor.pointerUp()

			// Verify multiple scribbles exist
			let scribbles = editor.getInstanceState().scribbles
			expect(scribbles.length).toBe(2)

			// Cancel from idle should clear all
			editor.cancel()
			editor.expectToBeIn('laser.idle')

			vi.advanceTimersByTime(16)
			scribbles = editor.getInstanceState().scribbles
			expect(scribbles.length).toBe(0)
		})

		it('second cancel from idle without session switches to select', () => {
			editor.setCurrentTool('laser')

			// Draw and cancel once (clears session)
			editor.pointerDown(0, 0)
			editor.pointerMove(10, 10)
			vi.advanceTimersByTime(16)
			editor.pointerUp()

			editor.cancel() // First cancel - clears scribbles
			editor.expectToBeIn('laser.idle')

			vi.advanceTimersByTime(16)
			expect(editor.getInstanceState().scribbles.length).toBe(0)

			// Second cancel - no session, switch to select
			editor.cancel()
			editor.expectToBeIn('select.idle')
		})
	})

	describe('Tool exit', () => {
		it('clears session reference on tool exit', () => {
			editor.setCurrentTool('laser')

			// Draw a stroke
			editor.pointerDown(0, 0)
			for (let i = 1; i <= 5; i++) {
				editor.pointerMove(i * 5, i * 5)
				vi.advanceTimersByTime(16)
			}
			editor.pointerUp()

			// Scribbles should exist
			expect(editor.getInstanceState().scribbles.length).toBeGreaterThan(0)

			// Switch tools
			editor.setCurrentTool('select')

			// Scribbles should still be visible (fading naturally)
			expect(editor.getInstanceState().scribbles.length).toBeGreaterThan(0)

			// Wait for fade
			vi.advanceTimersByTime(editor.options.laserDelayMs + 100)
			vi.advanceTimersByTime(editor.options.laserFadeoutMs + 200)

			expect(editor.getInstanceState().scribbles.length).toBe(0)
		})

		it('re-entering laser tool creates fresh session', () => {
			editor.setCurrentTool('laser')

			// Draw first stroke
			editor.pointerDown(0, 0)
			editor.pointerMove(10, 10)
			vi.advanceTimersByTime(16)
			editor.pointerUp()

			const initialScribbleCount = editor.getInstanceState().scribbles.length

			// Switch away and back
			editor.setCurrentTool('select')
			editor.setCurrentTool('laser')

			// Draw second stroke
			editor.pointerDown(0, 50)
			editor.pointerMove(10, 60)
			vi.advanceTimersByTime(16)
			editor.pointerUp()

			// Should have scribbles from both (before first fades)
			expect(editor.getInstanceState().scribbles.length).toBeGreaterThan(initialScribbleCount)
		})
	})

	describe('Edge cases', () => {
		it('handles rapid pointer up/down', () => {
			editor.setCurrentTool('laser')

			// Rapid clicks
			for (let i = 0; i < 5; i++) {
				editor.pointerDown(i * 20, 0)
				editor.pointerMove(i * 20 + 10, 10)
				vi.advanceTimersByTime(16)
				editor.pointerUp()
				vi.advanceTimersByTime(16)
			}

			// Should have multiple scribbles
			const scribbles = editor.getInstanceState().scribbles
			expect(scribbles.length).toBeGreaterThan(0)
		})

		it('handles pointer move without pointer down', () => {
			editor.setCurrentTool('laser')
			editor.expectToBeIn('laser.idle')

			// Move without pressing - should stay in idle
			editor.pointerMove(10, 10)
			editor.pointerMove(20, 20)

			editor.expectToBeIn('laser.idle')
			expect(editor.getInstanceState().scribbles.length).toBe(0)
		})

		it('handles interrupt event', () => {
			editor.setCurrentTool('laser')
			editor.pointerDown(0, 0)
			editor.pointerMove(10, 10)
			vi.advanceTimersByTime(16)

			// Interrupt (e.g., from pinch gesture)
			editor.interrupt()

			// Should still be in lasering - interrupt doesn't cancel
			// (This matches eraser behavior where interrupt allows pinch)
			editor.expectToBeIn('laser.lasering')
		})
	})
})
