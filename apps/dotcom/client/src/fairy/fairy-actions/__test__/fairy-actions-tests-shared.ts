import {
	atom,
	createTLStore,
	defaultAddFontsFromNode,
	defaultBindingUtils,
	defaultShapeUtils,
	Editor,
	tipTapDefaultExtensions,
	VecModel,
} from 'tldraw'
import { vi } from 'vitest'
import { AgentHelpers } from '../../fairy-agent/AgentHelpers'
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
	const $fairyEntity = atom('test-entity', {
		position: { x: 0, y: 0 },
		flipX: false,
		isSelected: false,
		pose: 'idle' as const,
		gesture: null,
		currentPageId: editor.getCurrentPageId(),
	})

	const moveToSpy = vi.fn((position: VecModel) => {
		$fairyEntity.update((fairy) => {
			return {
				...fairy,
				position: AgentHelpers.RoundVec(position),
				flipX: false,
			}
		})
	})

	return {
		id: 'test-fairy',
		editor,
		app: {} as any,
		$fairyEntity,
		positionManager: {
			moveTo: moveToSpy,
		},
		chatOriginManager: {
			getOrigin: vi.fn(() => ({ x: 0, y: 0 })),
		},
		interrupt: vi.fn(),
		schedule: vi.fn(),
		onError: vi.fn(),
	} as unknown as FairyAgent
}
