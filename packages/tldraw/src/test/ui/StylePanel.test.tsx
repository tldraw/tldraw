import { act, fireEvent, screen, waitFor } from '@testing-library/react'
import { createShapeId, DefaultColorStyle, Editor, TLArrowShape, TLGeoShape } from '@tldraw/editor'
import { Tldraw } from '../../lib/Tldraw'
import { renderTldrawComponentWithEditor } from '../testutils/renderTldrawComponent'

let editor: Editor

beforeEach(async () => {
	const result = await renderTldrawComponentWithEditor((onMount) => <Tldraw onMount={onMount} />, {
		waitForPatterns: false,
	})
	editor = result.editor

	act(() => {
		editor.user.updateUserPreferences({ colorScheme: 'light' })
		editor.setStyleForNextShapes(DefaultColorStyle, 'black')
	})
})

function getBlackColorSwatch() {
	return screen.getByTestId('style.color.black') as HTMLElement
}

describe('StylePanel', () => {
	it('updates the black color swatch when switching color modes', async () => {
		await screen.findByTestId('style.color.black')

		expect(getBlackColorSwatch().style.color).toBe('rgb(29, 29, 29)')

		act(() => {
			editor.user.updateUserPreferences({ colorScheme: 'dark' })
		})

		await waitFor(() => {
			expect(getBlackColorSwatch().style.color).toBe('rgb(242, 242, 242)')
		})

		act(() => {
			editor.user.updateUserPreferences({ colorScheme: 'light' })
		})

		await waitFor(() => {
			expect(getBlackColorSwatch().style.color).toBe('rgb(29, 29, 29)')
		})
	})

	it('marks an undo step when changing an arrowhead', async () => {
		const id = createShapeId()
		act(() => {
			editor
				.createShapes<TLArrowShape>([
					{
						id,
						type: 'arrow',
						x: 100,
						y: 100,
						props: { start: { x: 0, y: 0 }, end: { x: 100, y: 100 } },
					},
				])
				.selectNone()
			editor.markHistoryStoppingPoint('before selecting arrow')
			editor.select(id)
		})

		fireEvent.click(await screen.findByTestId('style.arrowheadEnd'))
		fireEvent.click(await screen.findByTestId('style.arrowheadEnd.none'))

		expect(editor.getShape<TLArrowShape>(id)!.props.arrowheadEnd).toBe('none')

		act(() => {
			editor.undo()
		})

		expect(editor.getShape<TLArrowShape>(id)!.props.arrowheadEnd).toBe('arrow')
		expect(editor.getSelectedShapeIds()).toEqual([id])
	})

	it('undoes a scrub across swatches as one step and a click as another', async () => {
		const id = createShapeId()
		act(() => {
			editor.createShapes([{ id, type: 'geo', x: 0, y: 0 }]).selectNone()
			editor.markHistoryStoppingPoint('before selecting')
			editor.select(id)
		})
		const getColor = () => editor.getShape<TLGeoShape>(id)!.props.color

		// pointer down on one swatch, then scrub over two more before releasing
		fireEvent.pointerDown(await screen.findByTestId('style.color.red'))
		fireEvent.pointerEnter(screen.getByTestId('style.color.green'))
		fireEvent.pointerEnter(screen.getByTestId('style.color.blue'))
		fireEvent.pointerUp(screen.getByTestId('style.color.blue'))
		expect(getColor()).toBe('blue')

		fireEvent.click(screen.getByTestId('style.color.orange'))
		expect(getColor()).toBe('orange')

		act(() => {
			editor.undo()
		})
		expect(getColor()).toBe('blue')

		act(() => {
			editor.undo()
		})
		expect(getColor()).toBe('black')
		expect(editor.getSelectedShapeIds()).toEqual([id])
	})
})
