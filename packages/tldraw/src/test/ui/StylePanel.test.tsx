import { act, fireEvent, screen, waitFor } from '@testing-library/react'
import {
	ArrowShapeArrowheadEndStyle,
	ArrowShapeArrowheadStartStyle,
	createShapeId,
	DefaultColorStyle,
	Editor,
} from '@tldraw/editor'
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

	describe('arrowhead double-click toggle', () => {
		async function setupArrow() {
			const id = createShapeId()
			act(() => {
				editor.createShape({
					id,
					type: 'arrow',
					props: {
						start: { x: 0, y: 0 },
						end: { x: 100, y: 100 },
						arrowheadStart: 'none',
						arrowheadEnd: 'arrow',
					},
				})
				editor.setSelectedShapes([id])
			})
			await screen.findByTestId('style.arrowheadStart')
			await screen.findByTestId('style.arrowheadEnd')
			return id
		}

		function getArrowheads(id: ReturnType<typeof createShapeId>) {
			const shape = editor.getShape(id) as any
			return {
				start: shape.props.arrowheadStart as string,
				end: shape.props.arrowheadEnd as string,
			}
		}

		it('toggles arrowhead end to none on double-click', async () => {
			const id = await setupArrow()
			expect(getArrowheads(id).end).toBe('arrow')

			fireEvent.doubleClick(screen.getByTestId('style.arrowheadEnd'))

			expect(getArrowheads(id).end).toBe('none')
		})

		it('restores the previous arrowhead end value on a second double-click', async () => {
			const id = await setupArrow()
			act(() => {
				editor.updateShape({ id, type: 'arrow', props: { arrowheadEnd: 'triangle' } })
			})
			expect(getArrowheads(id).end).toBe('triangle')

			fireEvent.doubleClick(screen.getByTestId('style.arrowheadEnd'))
			expect(getArrowheads(id).end).toBe('none')

			fireEvent.doubleClick(screen.getByTestId('style.arrowheadEnd'))
			expect(getArrowheads(id).end).toBe('triangle')
		})

		it('restores arrowhead end to a default when no previous value is remembered', async () => {
			const id = await setupArrow()
			act(() => {
				editor.updateShape({ id, type: 'arrow', props: { arrowheadEnd: 'none' } })
			})
			expect(getArrowheads(id).end).toBe('none')

			fireEvent.doubleClick(screen.getByTestId('style.arrowheadEnd'))

			expect(getArrowheads(id).end).toBe('arrow')
		})

		it('toggles arrowhead start independently of arrowhead end', async () => {
			const id = await setupArrow()
			act(() => {
				editor.updateShape({ id, type: 'arrow', props: { arrowheadStart: 'triangle' } })
			})
			expect(getArrowheads(id)).toEqual({ start: 'triangle', end: 'arrow' })

			fireEvent.doubleClick(screen.getByTestId('style.arrowheadStart'))

			expect(getArrowheads(id)).toEqual({ start: 'none', end: 'arrow' })
		})

		it('uses the editor style props after toggling', async () => {
			const id = await setupArrow()
			fireEvent.doubleClick(screen.getByTestId('style.arrowheadEnd'))
			expect(editor.getStyleForNextShape(ArrowShapeArrowheadEndStyle)).toBe('none')

			fireEvent.doubleClick(screen.getByTestId('style.arrowheadStart'))
			expect(editor.getStyleForNextShape(ArrowShapeArrowheadStartStyle)).toBe('arrow')

			// Reads the shape state too
			expect(getArrowheads(id)).toEqual({ start: 'arrow', end: 'none' })
		})
	})
})
