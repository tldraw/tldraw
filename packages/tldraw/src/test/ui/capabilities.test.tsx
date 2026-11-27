import { act } from '@testing-library/react'
import { createShapeId } from '@tldraw/editor'
import { useEffect } from 'react'
import { Tldraw } from '../../lib/Tldraw'
import { getActionState } from '../../lib/ui/context/action-state'
import { TLUiActionsContextType, useActions } from '../../lib/ui/context/actions'
import { onDragFromToolbarToCreateShape } from '../../lib/ui/hooks/useTools'
import { renderTldrawComponentWithEditor } from '../testutils/renderTldrawComponent'

const id = createShapeId('a')

describe('the default actions ask capabilities', () => {
	function ActionCapturer({ onCapture }: { onCapture(actions: TLUiActionsContextType): void }) {
		const actions = useActions()
		useEffect(() => onCapture(actions), [actions, onCapture])
		return null
	}

	it('disables delete, duplicate and align by capability', async () => {
		let actions: TLUiActionsContextType = {}
		const { editor } = await renderTldrawComponentWithEditor(
			(onMount) => (
				<Tldraw onMount={onMount}>
					<ActionCapturer
						onCapture={(a) => {
							actions = a
						}}
					/>
				</Tldraw>
			),
			{ waitForPatterns: false }
		)
		const other = createShapeId('b')
		act(() => {
			editor.createShapes([
				{ id, type: 'geo', x: 0, y: 0 },
				{ id: other, type: 'geo', x: 200, y: 0 },
			])
			editor.select(id, other)
		})
		const isEnabled = (actionId: string) => getActionState(editor, actions[actionId]).enabled
		expect([isEnabled('delete'), isEnabled('duplicate'), isEnabled('align-left')]).toEqual([
			true,
			true,
			true,
		])

		const seen: unknown[] = []
		editor.registerCapabilityCheck('delete-shapes', (data) => {
			seen.push(data)
			return false
		})
		editor.registerCapabilityCheck('create-shapes', () => false)
		editor.registerCapabilityCheck('edit-shapes', () => false)
		expect([isEnabled('delete'), isEnabled('duplicate'), isEnabled('align-left')]).toEqual([
			false,
			false,
			false,
		])
		expect(seen).toContainEqual({ shapes: editor.getSelectedShapes() })
	})
})

describe('the default tools ask capabilities', () => {
	it('disables a toolbar tool, and its shortcut does nothing, while a capability is rejected', async () => {
		const { editor } = await renderTldrawComponentWithEditor(
			(onMount) => <Tldraw onMount={onMount} />,
			{
				waitForPatterns: false,
			}
		)
		const drawButton = () =>
			document.querySelector('[data-testid="tools.draw"]') as HTMLButtonElement
		expect(drawButton().disabled).toBe(false)
		const pressD = () =>
			act(() => {
				document.body.dispatchEvent(
					new KeyboardEvent('keydown', { key: 'd', code: 'KeyD', bubbles: true })
				)
			})
		pressD()
		expect(editor.getCurrentToolId()).toBe('draw')
		editor.setCurrentTool('select')

		act(() => {
			editor.registerCapabilityCheck('create-shapes', () => false)
		})
		expect(drawButton().disabled).toBe(true)
		expect(
			(document.querySelector('[data-testid="tools.select"]') as HTMLButtonElement).disabled
		).toBe(false)

		pressD()
		expect(editor.getCurrentToolId()).toBe('select')
	})

	it('disables only the tools whose shape type create-shapes rejects', async () => {
		const { editor } = await renderTldrawComponentWithEditor(
			(onMount) => <Tldraw onMount={onMount} />,
			{
				waitForPatterns: false,
			}
		)
		act(() => {
			editor.registerCapabilityCheck('create-shapes', (data) =>
				data?.shapes.every((shape) => shape.type !== 'geo' || shape.props?.geo !== 'rectangle')
			)
		})
		const button = (tool: string) =>
			document.querySelector(`[data-testid="tools.${tool}"]`) as HTMLButtonElement
		expect([button('rectangle').disabled, button('draw').disabled]).toEqual([true, false])
	})

	it('does not drag a shape out of the toolbar without create-shapes', async () => {
		const { editor } = await renderTldrawComponentWithEditor(
			(onMount) => <Tldraw onMount={onMount} />,
			{
				waitForPatterns: false,
			}
		)
		editor.registerCapabilityCheck('create-shapes', () => false)
		onDragFromToolbarToCreateShape(editor, editor.inputs as any, {
			createShape: (shapeId) => editor.createShape({ id: shapeId, type: 'geo' }),
		})
		expect(editor.getCurrentPageShapeIds().size).toBe(0)
	})
})
