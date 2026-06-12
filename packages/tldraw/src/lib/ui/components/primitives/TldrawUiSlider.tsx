import { Slider as _Slider } from '@base-ui/react/slider'
import { tltime } from '@tldraw/editor'
import React, { useCallback, useEffect, useState } from 'react'
import { TLUiTranslationKey } from '../../hooks/useTranslation/TLUiTranslationKey'
import { useTranslation } from '../../hooks/useTranslation/useTranslation'
import { hideAllTooltips, TldrawUiTooltip } from './TldrawUiTooltip'

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

	const handleValueChange = useCallback(
		(value: number | number[]) => {
			onValueChange(Array.isArray(value) ? value[0] : value)
		},
		[onValueChange]
	)

	const handlePointerDown = useCallback(() => {
		hideAllTooltips()
		onHistoryMark?.('click slider')
	}, [onHistoryMark])

	// N.B. This is a bit silly. The slider auto-focuses which
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

	return (
		<div className="tlui-slider__container">
			<TldrawUiTooltip content={titleAndLabel}>
				<_Slider.Root
					data-testid={testId}
					className="tlui-slider"
					min={min ?? 0}
					max={steps}
					step={1}
					value={value !== null ? value : undefined}
					onPointerDown={handlePointerDown}
					onValueChange={handleValueChange}
				>
					<_Slider.Control className="tlui-slider__control">
						<_Slider.Track className="tlui-slider__track">
							{value !== null && <_Slider.Indicator className="tlui-slider__range" />}
							{value !== null && (
								<_Slider.Thumb
									getAriaValueText={(_formattedValue, value) => String(value * ariaValueModifier)}
									aria-label={titleAndLabel}
									className="tlui-slider__thumb"
									ref={ref}
								/>
							)}
						</_Slider.Track>
					</_Slider.Control>
				</_Slider.Root>
			</TldrawUiTooltip>
		</div>
	)
})
