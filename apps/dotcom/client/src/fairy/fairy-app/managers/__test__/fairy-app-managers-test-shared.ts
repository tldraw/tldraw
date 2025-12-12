import { FairyConfig, FairyProject, toProjectId } from '@tldraw/fairy-shared'
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

export function getDefaultFairyConfig(config: Partial<FairyConfig> = {}): FairyConfig {
	return {
		name: 'Test',
		outfit: { body: 'plain' as any, hat: 'ears' as any, wings: 'plain' as any },
		sign: { sun: 'aries', moon: 'aries', rising: 'aries' },
		hat: 'default',
		hatColor: 'pink',
		legLength: 0.5,
		version: 2,
		...config,
	}
}

export function getFairyProject(project: Partial<FairyProject> = {}): FairyProject {
	return {
		id: toProjectId('project-1'),
		title: 'Test Project',
		description: 'Test description',
		color: 'blue',
		members: [],
		plan: 'Test plan',
		softDeleted: false,
		...project,
	}
}
