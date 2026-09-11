import { fireEvent, render } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { TldrawUiSlider } from './TldrawUiSlider'

function renderSlider() {
	const calls: string[] = []
	const onValueChange = vi.fn((value: number) => {
		calls.push(`change:${value}`)
	})
	const onHistoryMark = vi.fn((id: string) => {
		calls.push(`mark:${id}`)
	})
	const result = render(
		<TldrawUiSlider
			data-testid="slider"
			value={2}
			steps={4}
			label="style-panel.opacity"
			title="Opacity"
			onValueChange={onValueChange}
			onHistoryMark={onHistoryMark}
		/>
	)
	const thumb = result.getByRole('slider')
	return { ...result, thumb, calls, onValueChange, onHistoryMark }
}

describe('TldrawUiSlider', () => {
	afterEach(() => {
		vi.clearAllMocks()
	})

	it('marks a history stopping point before a keyboard change', () => {
		const { thumb, calls } = renderSlider()

		fireEvent.keyDown(thumb, { key: 'ArrowLeft' })

		expect(calls).toEqual(['mark:keyboard slider', 'change:1'])
	})

	it.each(['ArrowRight', 'ArrowUp', 'ArrowDown', 'PageUp', 'PageDown', 'Home', 'End'])(
		'marks a history stopping point for %s',
		(key) => {
			const { thumb, onHistoryMark, onValueChange } = renderSlider()

			fireEvent.keyDown(thumb, { key })

			expect(onHistoryMark).toHaveBeenCalledTimes(1)
			expect(onValueChange).toHaveBeenCalledTimes(1)
		}
	)

	it('marks once for a held key so the repeat run is a single undo step', () => {
		const { thumb, onHistoryMark, onValueChange } = renderSlider()

		fireEvent.keyDown(thumb, { key: 'ArrowLeft' })
		fireEvent.keyDown(thumb, { key: 'ArrowLeft', repeat: true })
		fireEvent.keyDown(thumb, { key: 'ArrowLeft', repeat: true })

		expect(onHistoryMark).toHaveBeenCalledTimes(1)
		expect(onValueChange).toHaveBeenCalledTimes(3)
	})

	it('marks each separate key press', () => {
		const { thumb, onHistoryMark } = renderSlider()

		fireEvent.keyDown(thumb, { key: 'ArrowLeft' })
		fireEvent.keyDown(thumb, { key: 'ArrowLeft' })
		fireEvent.keyDown(thumb, { key: 'ArrowLeft' })

		expect(onHistoryMark).toHaveBeenCalledTimes(3)
	})

	it('does not mark for keys that do not change the value', () => {
		const { thumb, onHistoryMark, onValueChange } = renderSlider()

		fireEvent.keyDown(thumb, { key: 'Tab' })
		fireEvent.keyDown(thumb, { key: 'a' })
		fireEvent.keyDown(thumb, { key: 'Enter' })

		expect(onHistoryMark).not.toHaveBeenCalled()
		expect(onValueChange).not.toHaveBeenCalled()
	})

	it('still marks a history stopping point on pointer down', () => {
		const { getByTestId, onHistoryMark } = renderSlider()

		fireEvent.pointerDown(getByTestId('slider'))

		expect(onHistoryMark).toHaveBeenCalledWith('click slider')
	})
})
