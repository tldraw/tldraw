import { act } from '@testing-library/react'
import { createShapeId, Editor } from '@tldraw/editor'
import { useEffect } from 'react'
import { Tldraw } from '../../lib/Tldraw'
import { TLUiActionsContextType, useActions } from '../../lib/ui/context/actions'
import { TLUiOverrides } from '../../lib/ui/overrides'
import { renderTldrawComponentWithEditor } from '../testutils/renderTldrawComponent'

function ActionCapturer({ onCapture }: { onCapture(actions: TLUiActionsContextType): void }) {
	const actions = useActions()
	useEffect(() => {
		onCapture(actions)
	}, [actions, onCapture])
	return null
}

const customId = createShapeId('custom')

// Neither override marks a history stopping point: that is the provider's job.
const overrides: TLUiOverrides = {
	actions(editor, actions) {
		actions['create-custom-shape'] = {
			id: 'create-custom-shape',
			onSelect() {
				editor.createShape({ id: customId, type: 'geo', x: 0, y: 0 })
			},
		}
		actions['create-custom-shape-unmarked'] = {
			id: 'create-custom-shape-unmarked',
			mark: false,
			onSelect() {
				editor.createShape({ id: customId, type: 'geo', x: 0, y: 0 })
			},
		}
		return actions
	},
}

let editor: Editor
let actions: TLUiActionsContextType
const earlierId = createShapeId('earlier')

beforeEach(async () => {
	const result = await renderTldrawComponentWithEditor(
		(onMount) => (
			<Tldraw onMount={onMount} overrides={overrides}>
				<ActionCapturer onCapture={(a) => (actions = a)} />
			</Tldraw>
		),
		{ waitForPatterns: false }
	)
	editor = result.editor
	act(() => {
		editor.createShape({ id: earlierId, type: 'geo', x: 200, y: 0 })
	})
})

describe('actions', () => {
	it('gives an action added through overrides its own undo step', () => {
		act(() => {
			actions['create-custom-shape'].onSelect('menu')
		})
		expect(editor.getShape(customId)).toBeDefined()

		act(() => {
			editor.undo()
		})

		expect(editor.getShape(customId)).toBeUndefined()
		expect(editor.getShape(earlierId)).toBeDefined()
	})

	it('lets an action opt out of marking with mark: false', () => {
		act(() => {
			actions['create-custom-shape-unmarked'].onSelect('menu')
		})

		act(() => {
			editor.undo()
		})

		// without a mark the action joined the previous step, so both shapes are gone
		expect(editor.getShape(customId)).toBeUndefined()
		expect(editor.getShape(earlierId)).toBeUndefined()
	})

	it('does not enable undo after an action that changes nothing undoable', () => {
		act(() => {
			editor.clearHistory()
		})
		expect(editor.getCanUndo()).toBe(false)

		act(() => {
			actions['zoom-in'].onSelect('menu')
			actions['toggle-grid'].onSelect('menu')
		})

		expect(editor.getCanUndo()).toBe(false)
	})

	it('keeps undo and redo from marking on top of the history they walk', () => {
		act(() => {
			editor.clearHistory()
			editor.createShape({ id: customId, type: 'geo', x: 0, y: 0 })
		})

		act(() => {
			actions['undo'].onSelect('kbd')
		})
		expect(editor.getShape(customId)).toBeUndefined()

		act(() => {
			actions['redo'].onSelect('kbd')
		})
		expect(editor.getShape(customId)).toBeDefined()
		expect(editor.getCanRedo()).toBe(false)
	})
})
