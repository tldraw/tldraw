import { Slider as _Slider } from 'radix-ui'
import React, { useCallback, useEffect, useState } from 'react'
import { TLUiTranslationKey } from '../../hooks/useTranslation/TLUiTranslationKey'
import { useTranslation } from '../../hooks/useTranslation/useTranslation'

/** @public */
export interface TLUiSliderProps {
	min?: number
	steps: number
	value: number | null
	label: string
	title: string
	onPointerUp?(): void
	onValueChange(value: number): void
	onHistoryMark(id: string): void
	'data-testid'?: string
}

/** @public @react */
export const TldrawUiSlider = React.forwardRef<HTMLDivElement, TLUiSliderProps>(function Slider(
	{
		onHistoryMark,
		title,
		min,
		steps,
		value,
		label,
		onValueChange,
		onPointerUp,
		['data-testid']: testId,
	}: TLUiSliderProps,
	ref
) {
	const msg = useTranslation()

	// XXX: Radix starts out our slider with a tabIndex of 0
	// This causes some tab focusing issues, most prevelant in MobileStylePanel,
	// where it grabs the focus. This works around it.
	const [tabIndex, setTabIndex] = useState(-1)
	useEffect(() => {
		setTabIndex(0)
	}, [])

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
		onPointerUp?.()
	}, [onPointerUp])

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
			<_Slider.Root
				data-testid={testId}
				className="tlui-slider"
				dir="ltr"
				min={min ?? 0}
				max={steps}
				step={1}
				value={value !== null ? [value] : undefined}
				onPointerDown={handlePointerDown}
				onPointerUp={handlePointerUp}
				onValueChange={handleValueChange}
				onKeyDownCapture={handleKeyEvent}
				onKeyUpCapture={handleKeyEvent}
				title={title + ' — ' + msg(label as TLUiTranslationKey)}
			>
				<_Slider.Track className="tlui-slider__track" dir="ltr">
					{value !== null && <_Slider.Range className="tlui-slider__range" dir="ltr" />}
				</_Slider.Track>
				{value !== null && (
					<_Slider.Thumb
						aria-label={msg('style-panel.opacity')}
						className="tlui-slider__thumb"
						dir="ltr"
						ref={ref}
						tabIndex={tabIndex}
					/>
				)}
			</_Slider.Root>
		</div>
	)
})
