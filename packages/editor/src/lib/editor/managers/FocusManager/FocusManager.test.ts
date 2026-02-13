import { Mock, Mocked, vi } from 'vitest'
import { Editor } from '../../Editor'
import { FocusManager } from './FocusManager'

// Mock the Editor class
vi.mock('../../Editor')

describe('FocusManager', () => {
	let editor: Mocked<
		Editor & {
			sideEffects: {
				registerAfterChangeHandler: Mock
			}
			getInstanceState: Mock
			updateInstanceState: Mock
			getContainer: Mock
			isIn: Mock
			getSelectedShapeIds: Mock
			complete: Mock
		}
	>
	let focusManager: FocusManager
	let mockContainer: HTMLElement
	let mockDispose: Mock
	let originalAddEventListener: typeof document.body.addEventListener
	let originalRemoveEventListener: typeof document.body.removeEventListener

	beforeEach(() => {
		// Create mock container element
		mockContainer = document.createElement('div')
		mockContainer.focus = vi.fn()
		mockContainer.blur = vi.fn()
		vi.spyOn(mockContainer.classList, 'add')
		vi.spyOn(mockContainer.classList, 'remove')

		// Create mock dispose function
		mockDispose = vi.fn()

		// Mock editor
		editor = {
			sideEffects: {
				registerAfterChangeHandler: vi.fn(() => mockDispose),
			},
			getInstanceState: vi.fn(() => ({ isFocused: false })),
			updateInstanceState: vi.fn(),
			getContainer: vi.fn(() => mockContainer),
			isIn: vi.fn(() => false),
			getSelectedShapeIds: vi.fn(() => []),
			complete: vi.fn(),
		} as any

		// Mock document.body event listeners
		originalAddEventListener = document.body.addEventListener
		originalRemoveEventListener = document.body.removeEventListener
		document.body.addEventListener = vi.fn()
		document.body.removeEventListener = vi.fn()
	})

	afterEach(() => {
		// Restore original event listeners
		document.body.addEventListener = originalAddEventListener
		document.body.removeEventListener = originalRemoveEventListener

		// Clean up any existing focus manager
		if (focusManager) {
			focusManager.dispose()
		}

		vi.clearAllMocks()
	})

	describe('constructor', () => {
		it('should initialize with editor reference', () => {
			focusManager = new FocusManager(editor)
			expect(focusManager.editor).toBe(editor)
		})

		it('should register side effect listener for instance state changes', () => {
			focusManager = new FocusManager(editor)
			expect(editor.sideEffects.registerAfterChangeHandler).toHaveBeenCalledWith(
				'instance',
				expect.any(Function)
			)
		})

		it('should update container class on initialization', () => {
			focusManager = new FocusManager(editor)
			expect(mockContainer.classList.add).toHaveBeenCalledWith('tl-container__no-focus-ring')
		})

		it('should set up keyboard event listener', () => {
			focusManager = new FocusManager(editor)
			expect(document.body.addEventListener).toHaveBeenCalledWith('keydown', expect.any(Function))
		})

		it('should set up mouse event listener', () => {
			focusManager = new FocusManager(editor)
			expect(document.body.addEventListener).toHaveBeenCalledWith('mousedown', expect.any(Function))
		})

		it('should set focus state to true when autoFocus is true', () => {
			editor.getInstanceState.mockReturnValue({ isFocused: false })
			focusManager = new FocusManager(editor, true)
			expect(editor.updateInstanceState).toHaveBeenCalledWith({ isFocused: true })
		})

		it('should set focus state to false when autoFocus is false', () => {
			editor.getInstanceState.mockReturnValue({ isFocused: true })
			focusManager = new FocusManager(editor, false)
			expect(editor.updateInstanceState).toHaveBeenCalledWith({ isFocused: false })
		})

		it('should not change focus state when autoFocus matches current state', () => {
			editor.getInstanceState.mockReturnValue({ isFocused: true })
			focusManager = new FocusManager(editor, true)
			expect(editor.updateInstanceState).not.toHaveBeenCalled()
		})

		it('should handle undefined autoFocus parameter', () => {
			editor.getInstanceState.mockReturnValue({ isFocused: true })
			focusManager = new FocusManager(editor)
			expect(editor.updateInstanceState).toHaveBeenCalledWith({ isFocused: false })
		})
	})

	describe('side effect handler', () => {
		it('should update container class when focus state changes', () => {
			focusManager = new FocusManager(editor)

			// Get the registered handler function
			const handlerCall = editor.sideEffects.registerAfterChangeHandler.mock.calls[0]
			const handler = handlerCall[1]

			// Clear previous calls
			vi.clearAllMocks()

			// Simulate focus state change
			const prev = { isFocused: false }
			const next = { isFocused: true }
			editor.getInstanceState.mockReturnValue(next)

			handler(prev, next)

			expect(mockContainer.classList.add).toHaveBeenCalledWith('tl-container__focused')
		})

		it('should not update container class when focus state does not change', () => {
			focusManager = new FocusManager(editor)

			const handlerCall = editor.sideEffects.registerAfterChangeHandler.mock.calls[0]
			const handler = handlerCall[1]

			vi.clearAllMocks()

			// Simulate no focus state change
			const prev = { isFocused: true }
			const next = { isFocused: true }

			handler(prev, next)

			expect(mockContainer.classList.add).not.toHaveBeenCalled()
			expect(mockContainer.classList.remove).not.toHaveBeenCalled()
		})
	})

	describe('updateContainerClass', () => {
		let handler: (prev: any, next: any) => void

		beforeEach(() => {
			focusManager = new FocusManager(editor)
			// Get the handler before clearing mocks
			const handlerCall = editor.sideEffects.registerAfterChangeHandler.mock.calls[0]
			handler = handlerCall[1]
			vi.clearAllMocks()
		})

		it('should add focused class when editor is focused', () => {
			editor.getInstanceState.mockReturnValue({ isFocused: true })

			handler({ isFocused: false }, { isFocused: true })

			expect(mockContainer.classList.add).toHaveBeenCalledWith('tl-container__focused')
		})

		it('should remove focused class when editor is not focused', () => {
			editor.getInstanceState.mockReturnValue({ isFocused: false })

			handler({ isFocused: true }, { isFocused: false })

			expect(mockContainer.classList.remove).toHaveBeenCalledWith('tl-container__focused')
		})

		it('should always add no-focus-ring class', () => {
			editor.getInstanceState.mockReturnValue({ isFocused: true })

			handler({ isFocused: false }, { isFocused: true })

			expect(mockContainer.classList.add).toHaveBeenCalledWith('tl-container__no-focus-ring')
		})
	})

	describe('handleKeyDown', () => {
		let keydownHandler: (event: KeyboardEvent) => void

		beforeEach(() => {
			focusManager = new FocusManager(editor)

			// Get the keydown handler that was registered
			const addEventListenerCalls = (document.body.addEventListener as Mock).mock.calls
			const keydownCall = addEventListenerCalls.find((call: any) => call[0] === 'keydown')
			keydownHandler = keydownCall![1]

			vi.clearAllMocks()
		})

		it('should remove no-focus-ring class on Tab key', () => {
			const event = new KeyboardEvent('keydown', { key: 'Tab' })
			keydownHandler(event)

			expect(mockContainer.classList.remove).toHaveBeenCalledWith('tl-container__no-focus-ring')
		})

		it('should remove no-focus-ring class on ArrowUp key', () => {
			const event = new KeyboardEvent('keydown', { key: 'ArrowUp' })
			keydownHandler(event)

			expect(mockContainer.classList.remove).toHaveBeenCalledWith('tl-container__no-focus-ring')
		})

		it('should remove no-focus-ring class on ArrowDown key', () => {
			const event = new KeyboardEvent('keydown', { key: 'ArrowDown' })
			keydownHandler(event)

			expect(mockContainer.classList.remove).toHaveBeenCalledWith('tl-container__no-focus-ring')
		})

		it('should not remove no-focus-ring class on other keys', () => {
			const event = new KeyboardEvent('keydown', { key: 'Enter' })
			keydownHandler(event)

			expect(mockContainer.classList.remove).not.toHaveBeenCalled()
		})

		it('should return early when editor is in editing mode', () => {
			editor.isIn.mockReturnValue(true)
			const event = new KeyboardEvent('keydown', { key: 'Tab' })

			keydownHandler(event)

			expect(mockContainer.classList.remove).not.toHaveBeenCalled()
		})

		it('should return early when container is active element and shapes are selected', () => {
			Object.defineProperty(document, 'activeElement', {
				value: mockContainer,
				configurable: true,
			})
			editor.getSelectedShapeIds.mockReturnValue(['shape1'])

			const event = new KeyboardEvent('keydown', { key: 'Tab' })
			keydownHandler(event)

			expect(mockContainer.classList.remove).not.toHaveBeenCalled()
		})

		it('should process key when container is active but no shapes selected', () => {
			Object.defineProperty(document, 'activeElement', {
				value: mockContainer,
				configurable: true,
			})
			editor.getSelectedShapeIds.mockReturnValue([])

			const event = new KeyboardEvent('keydown', { key: 'Tab' })
			keydownHandler(event)

			expect(mockContainer.classList.remove).toHaveBeenCalledWith('tl-container__no-focus-ring')
		})
	})

	describe('handleMouseDown', () => {
		let mousedownHandler: () => void

		beforeEach(() => {
			focusManager = new FocusManager(editor)

			// Get the mousedown handler that was registered
			const addEventListenerCalls = (document.body.addEventListener as Mock).mock.calls
			const mousedownCall = addEventListenerCalls.find((call: any) => call[0] === 'mousedown')
			mousedownHandler = mousedownCall![1]

			vi.clearAllMocks()
		})

		it('should add no-focus-ring class on mouse down', () => {
			mousedownHandler()

			expect(mockContainer.classList.add).toHaveBeenCalledWith('tl-container__no-focus-ring')
		})
	})

	describe('focus', () => {
		beforeEach(() => {
			focusManager = new FocusManager(editor)
		})

		it('should focus the container', () => {
			focusManager.focus()
			expect(mockContainer.focus).toHaveBeenCalled()
		})
	})

	describe('blur', () => {
		beforeEach(() => {
			focusManager = new FocusManager(editor)
		})

		it('should complete editor interactions', () => {
			focusManager.blur()
			expect(editor.complete).toHaveBeenCalled()
		})

		it('should blur the container', () => {
			focusManager.blur()
			expect(mockContainer.blur).toHaveBeenCalled()
		})

		it('should complete before bluring', () => {
			const callOrder: string[] = []
			editor.complete.mockImplementation(() => callOrder.push('complete'))
			mockContainer.blur = vi.fn(() => callOrder.push('blur'))

			focusManager.blur()

			expect(callOrder).toEqual(['complete', 'blur'])
		})
	})

	describe('dispose', () => {
		beforeEach(() => {
			focusManager = new FocusManager(editor)
			vi.clearAllMocks()
		})

		it('should remove keyboard event listener', () => {
			focusManager.dispose()
			expect(document.body.removeEventListener).toHaveBeenCalledWith(
				'keydown',
				expect.any(Function)
			)
		})

		it('should remove mouse event listener', () => {
			focusManager.dispose()
			expect(document.body.removeEventListener).toHaveBeenCalledWith(
				'mousedown',
				expect.any(Function)
			)
		})

		it('should dispose side effect listener', () => {
			focusManager.dispose()
			expect(mockDispose).toHaveBeenCalled()
		})

		it('should handle missing side effect disposal gracefully', () => {
			// Create a focus manager where the side effect registration returns undefined
			editor.sideEffects.registerAfterChangeHandler.mockReturnValue(undefined)
			const focusManagerWithoutDispose = new FocusManager(editor)

			expect(() => focusManagerWithoutDispose.dispose()).not.toThrow()
		})
	})

	describe('integration scenarios', () => {
		it('should handle rapid focus state changes', () => {
			focusManager = new FocusManager(editor)
			const handlerCall = editor.sideEffects.registerAfterChangeHandler.mock.calls[0]
			const handler = handlerCall[1]

			vi.clearAllMocks()

			// Rapid focus changes
			editor.getInstanceState.mockReturnValue({ isFocused: true })
			handler({ isFocused: false }, { isFocused: true })

			editor.getInstanceState.mockReturnValue({ isFocused: false })
			handler({ isFocused: true }, { isFocused: false })

			editor.getInstanceState.mockReturnValue({ isFocused: true })
			handler({ isFocused: false }, { isFocused: true })

			expect(mockContainer.classList.add).toHaveBeenCalledWith('tl-container__focused')
			expect(mockContainer.classList.remove).toHaveBeenCalledWith('tl-container__focused')
		})

		it('should handle keyboard navigation while editing', () => {
			focusManager = new FocusManager(editor)
			const addEventListenerCalls = (document.body.addEventListener as Mock).mock.calls
			const keydownCall = addEventListenerCalls.find((call: any) => call[0] === 'keydown')
			const keydownHandler = keydownCall![1]

			editor.isIn.mockReturnValue(true) // Editing mode

			const event = new KeyboardEvent('keydown', { key: 'Tab' })
			keydownHandler(event)

			// Should not remove focus ring when editing
			expect(mockContainer.classList.remove).not.toHaveBeenCalledWith('tl-container__no-focus-ring')
		})

		it('should handle mouse and keyboard interaction sequence', () => {
			focusManager = new FocusManager(editor)
			const addEventListenerCalls = (document.body.addEventListener as Mock).mock.calls

			const mousedownCall = addEventListenerCalls.find((call: any) => call[0] === 'mousedown')
			const keydownCall = addEventListenerCalls.find((call: any) => call[0] === 'keydown')

			const mousedownHandler = mousedownCall![1]
			const keydownHandler = keydownCall![1]

			vi.clearAllMocks()

			// Mouse down adds no-focus-ring
			mousedownHandler()
			expect(mockContainer.classList.add).toHaveBeenCalledWith('tl-container__no-focus-ring')

			// Keyboard navigation removes no-focus-ring
			const event = new KeyboardEvent('keydown', { key: 'Tab' })
			keydownHandler(event)
			expect(mockContainer.classList.remove).toHaveBeenCalledWith('tl-container__no-focus-ring')
		})
	})

	describe('edge cases', () => {
		it('should handle container being null', () => {
			editor.getContainer.mockReturnValue(null as any)

			expect(() => new FocusManager(editor)).toThrow()
		})

		it('should handle missing instance state', () => {
			editor.getInstanceState.mockReturnValue(null as any)

			expect(() => new FocusManager(editor)).toThrow()
		})

		it('should handle disposed manager gracefully', () => {
			focusManager = new FocusManager(editor)
			focusManager.dispose()

			// Should not throw when calling methods after disposal
			expect(() => focusManager.focus()).not.toThrow()
			expect(() => focusManager.blur()).not.toThrow()
		})
	})
})
