import { tltime } from '@tldraw/editor'
import { Slider as _Slider } from 'radix-ui'
import React, { useCallback, useEffect, useState } from 'react'
import { TLUiTranslationKey } from '../../hooks/useTranslation/TLUiTranslationKey'
import { useTranslation } from '../../hooks/useTranslation/useTranslation'
import { TldrawUiTooltip, tooltipManager } from './TldrawUiTooltip'

/** @public */
export interface TLUiSliderProps {
	min?: number
	steps: number
	value: number | null
	label: string
	title: string
	onValueChange(value: number): void
	onHistoryMark?(id: string): void
	'data-testid'?: string
	ariaValueModifier?: number
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
		['data-testid']: testId,
		ariaValueModifier = 1,
	}: TLUiSliderProps,
	ref
) {
	const msg = useTranslation()
	const [titleAndLabel, setTitleAndLabel] = useState('')

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
		tooltipManager.hideAllTooltips()
		onHistoryMark?.('click slider')
	}, [onHistoryMark])

	// N.B. This is a bit silly. The Radix slider auto-focuses which
	// triggers TldrawUiTooltip handleFocus when we dbl-click to edit an image,
	// which in turn makes the tooltip display prematurely.
	// This makes it wait until we've focused to show the tooltip.
	useEffect(() => {
		const timeout = tltime.setTimeout(
			'set title and label',
			() => {
				setTitleAndLabel(title + ' — ' + msg(label as TLUiTranslationKey))
			},
			0
		)
		return () => clearTimeout(timeout)
	}, [label, msg, title])

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
			<TldrawUiTooltip content={titleAndLabel}>
				<_Slider.Root
					data-testid={testId}
					className="tlui-slider"
					dir="ltr"
					min={min ?? 0}
					max={steps}
					step={1}
					value={value !== null ? [value] : undefined}
					onPointerDown={handlePointerDown}
					onValueChange={handleValueChange}
					onKeyDownCapture={handleKeyEvent}
					onKeyUpCapture={handleKeyEvent}
				>
					<_Slider.Track className="tlui-slider__track" dir="ltr">
						{value !== null && <_Slider.Range className="tlui-slider__range" dir="ltr" />}
					</_Slider.Track>
					{value !== null && (
						<_Slider.Thumb
							aria-valuemin={(min ?? 0) * ariaValueModifier}
							aria-valuenow={value * ariaValueModifier}
							aria-valuemax={steps * ariaValueModifier}
							aria-label={titleAndLabel}
							className="tlui-slider__thumb"
							dir="ltr"
							ref={ref}
							tabIndex={tabIndex}
						/>
					)}
				</_Slider.Root>
			</TldrawUiTooltip>
		</div>
	)
})
