import {
	createTLStore,
	defaultAddFontsFromNode,
	defaultBindingUtils,
	defaultShapeUtils,
	Editor,
	tipTapDefaultExtensions,
} from 'tldraw'
import { vi } from 'vitest'
import { TldrawApp } from '../../../../tla/app/TldrawApp'
import { FairyApp } from '../../FairyApp'

export function createTestEditor() {
	return new Editor({
		shapeUtils: defaultShapeUtils,
		bindingUtils: defaultBindingUtils,
		tools: [],
		store: createTLStore({ shapeUtils: defaultShapeUtils, bindingUtils: defaultBindingUtils }),
		getContainer: () => document.body,
		textOptions: {
			addFontsFromNode: defaultAddFontsFromNode,
			tipTapConfig: {
				extensions: tipTapDefaultExtensions,
			},
		},
	})
}

export function createMockTldrawApp(): TldrawApp {
	return {
		z: {
			mutate: {
				user: {
					updateFairyConfig: vi.fn(),
				},
			},
		},
		onFairyStateUpdate: vi.fn(),
	} as unknown as TldrawApp
}

export function createTestFairyApp(editor?: Editor, tldrawApp?: TldrawApp): FairyApp {
	const testEditor = editor || createTestEditor()
	const testTldrawApp = tldrawApp || createMockTldrawApp()
	return new FairyApp(testEditor, testTldrawApp)
}
