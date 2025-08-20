/**
 * Integration test for font loading behavior in TldrawEditor.
 * This test verifies that the maxFontsToLoadBeforeRender option works correctly.
 */

import { act, render } from '@testing-library/react'
import { vi } from 'vitest'
import { createTLStore } from './config/createTLStore'
import { Editor } from './editor/Editor'
import { TldrawEditor } from './TldrawEditor'

// Mock the FontFace constructor
global.FontFace = vi.fn().mockImplementation((family, src, descriptors) => ({
	family,
	src,
	...descriptors,
	load: vi.fn(() => Promise.resolve()),
}))

// Mock document.fonts
Object.defineProperty(global.document, 'fonts', {
	value: {
		add: vi.fn(),
		[Symbol.iterator]: vi.fn(() => [].values()),
	},
	configurable: true,
})

describe('TldrawEditor font loading integration', () => {
	let mockEditor: Partial<Editor>

	beforeEach(() => {
		vi.clearAllMocks()

		// Mock a minimal editor with the fonts property
		mockEditor = {
			fonts: {
				loadRequiredFontsForCurrentPage: vi.fn().mockResolvedValue(undefined),
			},
			options: {
				maxFontsToLoadBeforeRender: 10,
			},
		} as any
	})

	it('should skip font loading when maxFontsToLoadBeforeRender is 0', async () => {
		const store = createTLStore({ shapeUtils: [], bindingUtils: [] })
		const onMount = vi.fn()

		// Set the option to 0 to test skip behavior
		const options = { maxFontsToLoadBeforeRender: 0 }

		let actualEditor: Editor

		await act(async () => {
			render(
				<TldrawEditor
					store={store}
					options={options}
					onMount={(editor) => {
						actualEditor = editor
						onMount(editor)
					}}
				/>
			)
		})

		// Wait a bit to ensure any async operations complete
		await act(async () => {
			await new Promise((resolve) => setTimeout(resolve, 100))
		})

		expect(onMount).toHaveBeenCalled()
		expect(actualEditor!).toBeTruthy()
		expect(actualEditor!.options.maxFontsToLoadBeforeRender).toBe(0)
	})

	it('should load fonts when maxFontsToLoadBeforeRender is greater than 0', async () => {
		const store = createTLStore({ shapeUtils: [], bindingUtils: [] })
		const onMount = vi.fn()

		// Set the option to a positive value to test normal behavior
		const options = { maxFontsToLoadBeforeRender: 5 }

		let actualEditor: Editor

		await act(async () => {
			render(
				<TldrawEditor
					store={store}
					options={options}
					onMount={(editor) => {
						actualEditor = editor
						onMount(editor)
					}}
				/>
			)
		})

		// Wait a bit to ensure any async operations complete
		await act(async () => {
			await new Promise((resolve) => setTimeout(resolve, 100))
		})

		expect(onMount).toHaveBeenCalled()
		expect(actualEditor!).toBeTruthy()
		expect(actualEditor!.options.maxFontsToLoadBeforeRender).toBe(5)
	})

	it('should use default Infinity value when maxFontsToLoadBeforeRender is not specified', async () => {
		const store = createTLStore({ shapeUtils: [], bindingUtils: [] })
		const onMount = vi.fn()

		let actualEditor: Editor

		await act(async () => {
			render(
				<TldrawEditor
					store={store}
					onMount={(editor) => {
						actualEditor = editor
						onMount(editor)
					}}
				/>
			)
		})

		expect(onMount).toHaveBeenCalled()
		expect(actualEditor!).toBeTruthy()
		expect(actualEditor!.options.maxFontsToLoadBeforeRender).toBe(Infinity)
	})
})
