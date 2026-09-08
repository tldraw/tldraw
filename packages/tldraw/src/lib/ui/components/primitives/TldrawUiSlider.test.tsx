import { fireEvent, render } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { TldrawUiSlider, TLUiSliderChangeInfo } from './TldrawUiSlider'

function renderSlider() {
	const calls: string[] = []
	const onValueChange = vi.fn((value: number, info: TLUiSliderChangeInfo) => {
		calls.push(`change:${value}:${info.mark ? 'mark' : 'continue'}`)
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
			// oxlint-disable-next-line typescript/no-deprecated -- covers the compatibility path
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

	it('flags a keyboard change as the start of an undo step', () => {
		const { thumb, calls } = renderSlider()

		fireEvent.keyDown(thumb, { key: 'ArrowLeft' })

		expect(calls).toEqual(['mark:keyboard slider', 'change:1:mark'])
	})

	it.each(['ArrowRight', 'ArrowUp', 'ArrowDown', 'PageUp', 'PageDown', 'Home', 'End'])(
		'flags the change for %s',
		(key) => {
			const { thumb, onValueChange } = renderSlider()

			fireEvent.keyDown(thumb, { key })

			expect(onValueChange).toHaveBeenCalledTimes(1)
			expect(onValueChange.mock.calls[0][1]).toEqual({ mark: true })
		}
	)

	it('flags only the first change of a held key so the repeat run is a single undo step', () => {
		const { thumb, onValueChange } = renderSlider()

		fireEvent.keyDown(thumb, { key: 'ArrowLeft' })
		fireEvent.keyDown(thumb, { key: 'ArrowLeft', repeat: true })
		fireEvent.keyDown(thumb, { key: 'ArrowLeft', repeat: true })

		expect(onValueChange.mock.calls.map((call) => call[1].mark)).toEqual([true, false, false])
	})

	it('flags each separate key press', () => {
		const { thumb, onValueChange } = renderSlider()

		fireEvent.keyDown(thumb, { key: 'ArrowLeft' })
		fireEvent.keyDown(thumb, { key: 'ArrowLeft' })
		fireEvent.keyDown(thumb, { key: 'ArrowLeft' })

		expect(onValueChange.mock.calls.map((call) => call[1].mark)).toEqual([true, true, true])
	})

	it('does not change the value for keys that do not move the slider', () => {
		const { thumb, onHistoryMark, onValueChange } = renderSlider()

		fireEvent.keyDown(thumb, { key: 'Tab' })
		fireEvent.keyDown(thumb, { key: 'a' })
		fireEvent.keyDown(thumb, { key: 'Enter' })

		expect(onHistoryMark).not.toHaveBeenCalled()
		expect(onValueChange).not.toHaveBeenCalled()
	})

	it('still calls the deprecated onHistoryMark on pointer down', () => {
		const { getByTestId, onHistoryMark } = renderSlider()

		fireEvent.pointerDown(getByTestId('slider'))

		expect(onHistoryMark).toHaveBeenCalledWith('click slider')
	})
})
