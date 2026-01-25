import { vi } from 'vitest'
import { TestEditor } from './TestEditor'

vi.useFakeTimers()

let editor: TestEditor

afterEach(() => {
	editor?.dispose()
})

beforeEach(() => {
	editor = new TestEditor()
})

describe('Laser tool and telestration', () => {
	it('creates scribbles when drawing with the laser tool', () => {
		editor.setCurrentTool('laser')
		editor.pointerDown(0, 0)
		editor.pointerMove(10, 10)
		editor.pointerMove(20, 20)
		editor.pointerMove(30, 30)

		// Tick to process points
		vi.advanceTimersByTime(16)

		const scribbles = editor.getInstanceState().scribbles
		expect(scribbles.length).toBeGreaterThan(0)
		expect(scribbles[0].color).toBe('laser')
	})

	it('removes all scribbles after fade duration', () => {
		editor.setCurrentTool('laser')

		// Draw a line
		editor.pointerDown(0, 0)
		for (let i = 1; i <= 20; i++) {
			editor.pointerMove(i * 5, i * 5)
			vi.advanceTimersByTime(16)
		}
		editor.pointerUp()

		// Verify scribbles exist
		let scribbles = editor.getInstanceState().scribbles
		expect(scribbles.length).toBeGreaterThan(0)

		// End the session (switch tools triggers onExit)
		editor.setCurrentTool('select')

		// Wait for idle timeout to end the session
		vi.advanceTimersByTime(editor.options.telestrationIdleTimeoutMs + 100)

		// Wait for fade to complete
		vi.advanceTimersByTime(editor.options.telestrationFadeoutMs + 100)

		// Scribbles should be completely cleared from instance state
		scribbles = editor.getInstanceState().scribbles
		expect(scribbles.length).toBe(0)
	})

	it('clears scribbles from instance state when all points are removed', () => {
		editor.setCurrentTool('laser')

		// Draw a short line
		editor.pointerDown(0, 0)
		editor.pointerMove(10, 10)
		editor.pointerMove(20, 20)
		vi.advanceTimersByTime(16)
		editor.pointerUp()

		// End the session
		editor.setCurrentTool('select')

		// Wait for idle timeout
		vi.advanceTimersByTime(editor.options.telestrationIdleTimeoutMs + 100)

		// Advance through fade duration in small increments
		const fadeMs = editor.options.telestrationFadeoutMs
		for (let elapsed = 0; elapsed < fadeMs + 200; elapsed += 16) {
			vi.advanceTimersByTime(16)
		}

		// Instance state should have no scribbles
		const scribbles = editor.getInstanceState().scribbles
		expect(scribbles.length).toBe(0)
	})

	it('handles multiple strokes in a single session', () => {
		editor.setCurrentTool('laser')

		// First stroke
		editor.pointerDown(0, 0)
		for (let i = 1; i <= 10; i++) {
			editor.pointerMove(i * 5, 0)
			vi.advanceTimersByTime(16)
		}
		editor.pointerUp()

		// Second stroke (within idle timeout)
		vi.advanceTimersByTime(100)
		editor.pointerDown(0, 50)
		for (let i = 1; i <= 10; i++) {
			editor.pointerMove(i * 5, 50)
			vi.advanceTimersByTime(16)
		}
		editor.pointerUp()

		// Both strokes should be visible
		let scribbles = editor.getInstanceState().scribbles
		expect(scribbles.length).toBe(2)

		// End session and fade
		editor.setCurrentTool('select')
		vi.advanceTimersByTime(editor.options.telestrationIdleTimeoutMs + 100)
		vi.advanceTimersByTime(editor.options.telestrationFadeoutMs + 200)

		// All scribbles should be cleared
		scribbles = editor.getInstanceState().scribbles
		expect(scribbles.length).toBe(0)
	})

	it('allows creating a new session while previous session is fading', () => {
		editor.setCurrentTool('laser')

		// First session
		editor.pointerDown(0, 0)
		for (let i = 1; i <= 10; i++) {
			editor.pointerMove(i * 5, 0)
			vi.advanceTimersByTime(16)
		}
		editor.pointerUp()

		// Wait for idle timeout to start fading
		vi.advanceTimersByTime(editor.options.telestrationIdleTimeoutMs + 100)

		// Start a new stroke while first is fading
		editor.pointerDown(0, 100)
		for (let i = 1; i <= 10; i++) {
			editor.pointerMove(i * 5, 100)
			vi.advanceTimersByTime(16)
		}
		editor.pointerUp()

		// Should have scribbles from both sessions
		let scribbles = editor.getInstanceState().scribbles
		expect(scribbles.length).toBeGreaterThan(0)

		// End everything and wait for all fades
		editor.setCurrentTool('select')
		vi.advanceTimersByTime(editor.options.telestrationIdleTimeoutMs + 100)
		vi.advanceTimersByTime(editor.options.telestrationFadeoutMs + 200)

		// All should be cleared
		scribbles = editor.getInstanceState().scribbles
		expect(scribbles.length).toBe(0)
	})
})
