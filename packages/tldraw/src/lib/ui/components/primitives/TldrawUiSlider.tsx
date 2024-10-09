import { Range, Root, Thumb, Track } from '@radix-ui/react-slider'
import { memo, useCallback } from 'react'
import { TLUiTranslationKey } from '../../hooks/useTranslation/TLUiTranslationKey'
import { useTranslation } from '../../hooks/useTranslation/useTranslation'

/** @public */
export interface TLUiSliderProps {
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

	const handlePointerUp = useCallback(() => {
		if (!value) return
		onValueChange(value)
	}, [value, onValueChange])

	return (
		<div className="tlui-slider__container">
			<Root
				data-testid={testId}
				className="tlui-slider"
				area-label="Opacity"
				dir="ltr"
				min={0}
				max={steps}
				step={1}
				value={value ? [value] : undefined}
				onPointerDown={handlePointerDown}
				onValueChange={handleValueChange}
				onPointerUp={handlePointerUp}
				title={title + ' — ' + msg(label as TLUiTranslationKey)}
			>
				<Track className="tlui-slider__track" dir="ltr">
					{value !== null && <Range className="tlui-slider__range" dir="ltr" />}
				</Track>
				{value !== null && <Thumb className="tlui-slider__thumb" dir="ltr" />}
			</Root>
		</div>
	)
})
