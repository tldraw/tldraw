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

	const getOriginSpy = vi.fn(() => ({ x: 0, y: 0 }))

	return {
		id: 'test-fairy',
		editor,
		fairyApp: {} as any,
		$fairyEntity,
		getEntity: () => $fairyEntity.get(),
		updateEntity: (next: any) => {
			if (typeof next === 'function') {
				$fairyEntity.update(next)
			} else {
				$fairyEntity.set(next)
			}
		},
		position: {
			moveTo: moveToSpy,
		},
		chatOrigin: {
			getOrigin: getOriginSpy,
		},
		interrupt: vi.fn(),
		schedule: vi.fn(),
		onError: vi.fn(),
	} as unknown as FairyAgent
}
