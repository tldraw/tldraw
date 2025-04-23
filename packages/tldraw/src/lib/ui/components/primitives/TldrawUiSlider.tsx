import { Range, Root, Thumb, Track } from '@radix-ui/react-slider'
import { memo, useCallback } from 'react'
import { TLUiTranslationKey } from '../../hooks/useTranslation/TLUiTranslationKey'
import { useTranslation } from '../../hooks/useTranslation/useTranslation'

/** @public */
export interface TLUiSliderProps {
	min?: number
	steps: number
	value: number | null
	label: string
	title: string
	onValueChange(value: number): void
	onHistoryMark(id: string): void
	'data-testid'?: string
}

/** @public @react */
export const TldrawUiSlider = memo(function Slider({
	onHistoryMark,
	title,
	min,
	steps,
	value,
	label,
	onValueChange,
	['data-testid']: testId,
}: TLUiSliderProps) {
	const msg = useTranslation()

	const handleValueChange = useCallback(
		(value: number[]) => {
			onValueChange(value[0])
		},
		[onValueChange]
	)

	const handlePointerDown = useCallback(() => {
		onHistoryMark('click slider')
	}, [onHistoryMark])

	// N.B. Annoying. For a11y purposes, we need Tab to work.
	// For some reason, Radix has some custom behavior here
	// that interferes with tabbing past the slider and then
	// you get stuck in the slider.
	const handleKeyEvent = useCallback((event: React.KeyboardEvent) => {
		if (event.key === 'Tab') {
			event.stopPropagation()
		}
	}, [])

	return (
		<div className="tlui-slider__container">
			<Root
				data-testid={testId}
				className="tlui-slider"
				dir="ltr"
				min={min ?? 0}
				max={steps}
				step={1}
				value={value ? [value] : undefined}
				onPointerDown={handlePointerDown}
				onValueChange={handleValueChange}
				onKeyDownCapture={handleKeyEvent}
				onKeyUpCapture={handleKeyEvent}
				title={title + ' — ' + msg(label as TLUiTranslationKey)}
			>
				<Track className="tlui-slider__track" dir="ltr">
					{value !== null && <Range className="tlui-slider__range" dir="ltr" />}
				</Track>
				{value !== null && (
					<Thumb aria-label={msg('style-panel.opacity')} className="tlui-slider__thumb" dir="ltr" />
				)}
			</Root>
		</div>
	)
})
