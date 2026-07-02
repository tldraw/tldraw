import { act, fireEvent } from '@testing-library/react'
import { createShapeId, Editor, TLRichText, toRichText } from '@tldraw/editor'
import { useEffect } from 'react'
import { Tldraw } from '../../lib/Tldraw'
import { TLUiActionsContextType, useActions } from '../../lib/ui/context/actions'
import { richTextHasMarkEverywhere } from '../../lib/utils/text/richText'
import { renderTldrawComponentWithEditor } from '../testutils/renderTldrawComponent'

function ActionsCapturer({ onCapture }: { onCapture(actions: TLUiActionsContextType): void }) {
	const actions = useActions()
	useEffect(() => {
		onCapture(actions)
	}, [actions, onCapture])
	return null
}

async function setup() {
	let actions: TLUiActionsContextType = {}
	const { editor, rendered } = await renderTldrawComponentWithEditor(
		(onMount) => (
			<Tldraw onMount={onMount}>
				<ActionsCapturer onCapture={(a) => (actions = a)} />
			</Tldraw>
		),
		{ waitForPatterns: false }
	)
	act(() => {
		editor.updateInstanceState({ isFocused: true })
	})
	return { editor, rendered, getActions: () => actions }
}

function createTextShape(editor: Editor, text: string) {
	const id = createShapeId()
	editor.createShape({ id, type: 'text', props: { richText: toRichText(text) } })
	return id
}

function getRichText(editor: Editor, id: ReturnType<typeof createShapeId>): TLRichText {
	return (editor.getShape(id)!.props as any).richText
}

describe('format shortcuts on selected shapes', () => {
	it('toggles bold on a selected text shape', async () => {
		const { editor, getActions } = await setup()
		const id = createTextShape(editor, 'hello')
		editor.select(id)

		act(() => getActions()['format-bold'].onSelect('kbd'))
		expect(richTextHasMarkEverywhere(getRichText(editor, id), 'bold')).toBe(true)

		act(() => getActions()['format-bold'].onSelect('kbd'))
		expect(richTextHasMarkEverywhere(getRichText(editor, id), 'bold')).toBe(false)
	})

	it('toggles bold across a multi-selection, only unbolding when all are bold', async () => {
		const { editor, getActions } = await setup()
		const a = createTextShape(editor, 'a')
		const b = createTextShape(editor, 'b')
		editor.select(a, b)

		// One already bold, the other not: pressing bold marks both.
		act(() => getActions()['format-bold'].onSelect('kbd'))
		expect(richTextHasMarkEverywhere(getRichText(editor, a), 'bold')).toBe(true)
		expect(richTextHasMarkEverywhere(getRichText(editor, b), 'bold')).toBe(true)

		// Now all bold: pressing bold removes it from both.
		act(() => getActions()['format-bold'].onSelect('kbd'))
		expect(richTextHasMarkEverywhere(getRichText(editor, a), 'bold')).toBe(false)
		expect(richTextHasMarkEverywhere(getRichText(editor, b), 'bold')).toBe(false)
	})

	it('does nothing when no shape is selected', async () => {
		const { editor, getActions } = await setup()
		const id = createTextShape(editor, 'hello')
		editor.selectNone()

		act(() => getActions()['format-bold'].onSelect('kbd'))
		expect(richTextHasMarkEverywhere(getRichText(editor, id), 'bold')).toBe(false)
	})

	it('toggles italic on a selected text shape', async () => {
		const { editor, getActions } = await setup()
		const id = createTextShape(editor, 'hello')
		editor.select(id)

		act(() => getActions()['format-italic'].onSelect('kbd'))
		expect(richTextHasMarkEverywhere(getRichText(editor, id), 'italic')).toBe(true)

		act(() => getActions()['format-italic'].onSelect('kbd'))
		expect(richTextHasMarkEverywhere(getRichText(editor, id), 'italic')).toBe(false)
	})

	it('toggles underline on a selected text shape', async () => {
		const { editor, getActions } = await setup()
		const id = createTextShape(editor, 'hello')
		editor.select(id)

		act(() => getActions()['format-underline'].onSelect('kbd'))
		expect(richTextHasMarkEverywhere(getRichText(editor, id), 'underline')).toBe(true)

		act(() => getActions()['format-underline'].onSelect('kbd'))
		expect(richTextHasMarkEverywhere(getRichText(editor, id), 'underline')).toBe(false)
	})

	it('does not bold a locked shape', async () => {
		const { editor, getActions } = await setup()
		const id = createTextShape(editor, 'hello')
		editor.updateShape({ id, type: 'text', isLocked: true })
		editor.setSelectedShapes([id])

		act(() => getActions()['format-bold'].onSelect('kbd'))
		expect(richTextHasMarkEverywhere(getRichText(editor, id), 'bold')).toBe(false)
	})

	it('adds a link to selected shapes through the link dialog', async () => {
		const { editor, getActions, rendered } = await setup()
		const id = createTextShape(editor, 'hello')
		editor.select(id)

		act(() => getActions()['format-link'].onSelect('kbd'))

		const input = await rendered.findByTestId('rich-text-link-dialog.input')
		fireEvent.change(input, { target: { value: 'https://example.com' } })
		act(() => {
			fireEvent.click(rendered.getByTestId('rich-text-link-dialog.save'))
		})

		expect(richTextHasMarkEverywhere(getRichText(editor, id), 'link')).toBe(true)
	})

	it('does not open the link dialog when no formattable shape is selected', async () => {
		const { editor, getActions, rendered } = await setup()
		createTextShape(editor, 'hello')
		editor.selectNone()

		act(() => getActions()['format-link'].onSelect('kbd'))
		expect(rendered.queryByTestId('rich-text-link-dialog.input')).toBeNull()
	})
})
