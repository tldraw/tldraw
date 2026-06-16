import { vi } from 'vitest'
import { FocusManager } from './FocusManager'

vi.mock('../../Editor')

/**
 * These tests live in their own file because they assert on real DOM focus
 * (`document.activeElement`), which the heavily-stubbed FocusManager.test.ts
 * suite leaves in an unusable state (containers with stubbed focus/blur hold
 * jsdom's focus hostage).
 */
describe('FocusManager autoFocus DOM focus', () => {
	let container: HTMLElement
	let focusManager: FocusManager | undefined

	function createMockEditor() {
		return {
			sideEffects: { registerAfterChangeHandler: vi.fn(() => vi.fn()) },
			getInstanceState: vi.fn(() => ({ isFocused: false })),
			updateInstanceState: vi.fn(),
			getContainer: vi.fn(() => container),
			getContainerDocument: vi.fn(() => document),
			getEditingShapeId: vi.fn(() => null),
			getSelectedShapeIds: vi.fn(() => []),
			complete: vi.fn(),
		} as any
	}

	beforeEach(() => {
		container = document.createElement('div')
		document.body.appendChild(container)
	})

	afterEach(() => {
		focusManager?.dispose()
		focusManager = undefined
		container.remove()
	})

	it('takes DOM focus on mount when nothing else is focused', () => {
		expect(document.activeElement).toBe(document.body)

		focusManager = new FocusManager(createMockEditor(), true)

		const active = document.activeElement as HTMLElement
		expect(active.hasAttribute('data-tl-keyboard-sink')).toBe(true)
	})

	it('does not steal DOM focus from an element the app already focused', () => {
		const input = document.createElement('input')
		document.body.appendChild(input)
		input.focus()
		expect(document.activeElement).toBe(input)

		focusManager = new FocusManager(createMockEditor(), true)

		expect(document.activeElement).toBe(input)
		input.remove()
	})

	it('does not take DOM focus on mount without autoFocus', () => {
		focusManager = new FocusManager(createMockEditor(), false)

		expect(document.activeElement).toBe(document.body)
	})
})
