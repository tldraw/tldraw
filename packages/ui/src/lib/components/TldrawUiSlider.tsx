import classNames from 'classnames'
import { Slider as _Slider } from 'radix-ui'
import React, { useCallback, useEffect, useState } from 'react'
import { useTldrawUiTranslation } from '../context/translation'
import { hideAllTldrawUiTooltips, TldrawUiTooltip } from './TldrawUiTooltip'

/** @public */
export interface TldrawUiSliderProps {
	min?: number
	steps: number
	value: number | null
	/** English label shown in the tooltip after the title. */
	label: string
	title: string
	onValueChange(value: number): void
	onHistoryMark?(id: string): void
	'data-testid'?: string
	ariaValueModifier?: number
	classNames?: {
		container?: string
		root?: string
		track?: string
		range?: string
		thumb?: string
	}
}

/** @public @react */
export const TldrawUiSlider = React.forwardRef<HTMLDivElement, TldrawUiSliderProps>(
	function TldrawUiSlider(
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
			classNames: classNamesProp,
		}: TldrawUiSliderProps,
		ref
	) {
		const { dir } = useTldrawUiTranslation()
		const [titleAndLabel, setTitleAndLabel] = useState('')

		const [tabIndex, setTabIndex] = useState(-1)
		useEffect(() => {
			setTabIndex(0)
		}, [])

		const handleValueChange = useCallback(
			(nextValue: number[]) => {
				onValueChange(nextValue[0])
			},
			[onValueChange]
		)

		const handlePointerDown = useCallback(() => {
			hideAllTldrawUiTooltips()
			onHistoryMark?.('click slider')
		}, [onHistoryMark])

		useEffect(() => {
			const timeout = setTimeout(() => {
				setTitleAndLabel(title + ' — ' + label)
			}, 0)
			return () => clearTimeout(timeout)
		}, [label, title])

		const handleKeyEvent = useCallback((event: React.KeyboardEvent) => {
			if (event.key === 'Tab') {
				event.stopPropagation()
			}
		}, [])

		return (
			<div className={classNames('tl-slider__container', classNamesProp?.container)}>
				<TldrawUiTooltip content={titleAndLabel}>
					<_Slider.Root
						data-testid={testId}
						className={classNames('tl-slider', classNamesProp?.root)}
						dir={dir}
						min={min ?? 0}
						max={steps}
						step={1}
						value={value !== null ? [value] : undefined}
						onPointerDown={handlePointerDown}
						onValueChange={handleValueChange}
						onKeyDownCapture={handleKeyEvent}
						onKeyUpCapture={handleKeyEvent}
					>
						<_Slider.Track
							className={classNames('tl-slider__track', classNamesProp?.track)}
							dir={dir}
						>
							{value !== null && (
								<_Slider.Range
									className={classNames('tl-slider__range', classNamesProp?.range)}
									dir={dir}
								/>
							)}
						</_Slider.Track>
						{value !== null && (
							<_Slider.Thumb
								aria-valuemin={(min ?? 0) * ariaValueModifier}
								aria-valuenow={value * ariaValueModifier}
								aria-valuemax={steps * ariaValueModifier}
								aria-label={titleAndLabel}
								className={classNames('tl-slider__thumb', classNamesProp?.thumb)}
								dir={dir}
								ref={ref}
								tabIndex={tabIndex}
							/>
						)}
					</_Slider.Root>
				</TldrawUiTooltip>
			</div>
		)
	}
)
