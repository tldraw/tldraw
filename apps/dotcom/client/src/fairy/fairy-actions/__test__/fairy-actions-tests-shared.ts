import {
	Editor,
	atom,
	createTLStore,
	defaultAddFontsFromNode,
	defaultBindingUtils,
	defaultShapeUtils,
	tipTapDefaultExtensions,
} from 'tldraw'
import { vi } from 'vitest'
import { FairyAgent } from '../../fairy-agent/FairyAgent'

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

export function createTestAgent(editor: Editor) {
	return {
		id: 'test-fairy',
		editor,
		app: {} as any,
		$fairyEntity: atom('test-entity', {
			position: { x: 0, y: 0 },
			flipX: false,
			isSelected: false,
			pose: 'idle',
			gesture: null,
			currentPageId: editor.getCurrentPageId(),
		}),
		positionManager: {
			moveTo: vi.fn(),
		},
		chatOriginManager: {
			getOrigin: vi.fn(() => ({ x: 0, y: 0 })),
		},
		interrupt: vi.fn(),
		schedule: vi.fn(),
		onError: vi.fn(),
	} as unknown as FairyAgent
}
