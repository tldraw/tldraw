import { tltime } from '@tldraw/editor'
import { Slider as _Slider } from 'radix-ui'
import React, { useCallback, useEffect, useRef, useState } from 'react'
import { TLUiTranslationKey } from '../../hooks/useTranslation/TLUiTranslationKey'
import { useDirection, useTranslation } from '../../hooks/useTranslation/useTranslation'
import { hideAllTooltips, TldrawUiTooltip } from './TldrawUiTooltip'

const SLIDER_VALUE_KEYS = new Set([
	'ArrowUp',
	'ArrowDown',
	'ArrowLeft',
	'ArrowRight',
	'PageUp',
	'PageDown',
	'Home',
	'End',
])

/** @public */
export interface TLUiSliderChangeInfo {
	/**
	 * `true` when the change begins a gesture (a pointer down or a fresh key press), `false` when
	 * it continues one (a drag, or a held key repeating). Start a new undo step when it is `true`
	 * so a whole drag undoes as one step.
	 */
	mark: boolean
}

/** @public */
export interface TLUiSliderProps {
	min?: number
	steps: number
	value: number | null
	label: string
	title: string
	onValueChange(value: number, info: TLUiSliderChangeInfo): void
	/** @deprecated Use the `mark` flag passed to `onValueChange` instead. */
	onHistoryMark?(id: string): void
	'data-testid'?: string
	ariaValueModifier?: number
}

/** @public @react */
export const TldrawUiSlider = React.forwardRef<HTMLDivElement, TLUiSliderProps>(function Slider(
	{
		// oxlint-disable-next-line typescript/no-deprecated -- still honored for existing consumers
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
	const dir = useDirection()
	const [titleAndLabel, setTitleAndLabel] = useState('')

	// XXX: Radix starts out our slider with a tabIndex of 0
	// This causes some tab focusing issues, most prevelant in MobileStylePanel,
	// where it grabs the focus. This works around it.
	const [tabIndex, setTabIndex] = useState(-1)
	useEffect(() => {
		setTabIndex(0)
	}, [])

	// Set on pointer down and on a fresh key press, consumed by the next value change. Radix
	// reports drags and key repeats through the same onValueChange, so this is how the consumer
	// tells the start of a gesture from its continuation.
	const rNextChangeStartsGesture = useRef(false)

	const handleValueChange = useCallback(
		(value: number[]) => {
			onValueChange(value[0], { mark: rNextChangeStartsGesture.current })
			rNextChangeStartsGesture.current = false
		},
		[onValueChange]
	)

	const handlePointerDown = useCallback(() => {
		hideAllTooltips()
		rNextChangeStartsGesture.current = true
		// oxlint-disable-next-line typescript/no-deprecated
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

	// Capture phase so this runs before Radix's bubble-phase onKeyDown changes the value;
	// otherwise keyboard changes squash into the preceding history entry and undo skips past them.
	// Repeats from a held key are skipped so the run is one undo step, like a pointer drag.
	const handleKeyDown = useCallback(
		(event: React.KeyboardEvent) => {
			handleKeyEvent(event)
			if (SLIDER_VALUE_KEYS.has(event.key) && !event.repeat) {
				rNextChangeStartsGesture.current = true
				// oxlint-disable-next-line typescript/no-deprecated
				onHistoryMark?.('keyboard slider')
			}
		},
		[handleKeyEvent, onHistoryMark]
	)

	return (
		<div className="tlui-slider__container">
			<TldrawUiTooltip content={titleAndLabel}>
				<_Slider.Root
					data-testid={testId}
					className="tlui-slider"
					dir={dir}
					min={min ?? 0}
					max={steps}
					step={1}
					value={value !== null ? [value] : undefined}
					onPointerDown={handlePointerDown}
					onValueChange={handleValueChange}
					onKeyDownCapture={handleKeyDown}
					onKeyUpCapture={handleKeyEvent}
				>
					<_Slider.Track className="tlui-slider__track" dir={dir}>
						{value !== null && <_Slider.Range className="tlui-slider__range" dir={dir} />}
					</_Slider.Track>
					{value !== null && (
						<_Slider.Thumb
							aria-valuemin={(min ?? 0) * ariaValueModifier}
							aria-valuenow={value * ariaValueModifier}
							aria-valuemax={steps * ariaValueModifier}
							aria-label={titleAndLabel}
							className="tlui-slider__thumb"
							dir={dir}
							ref={ref}
							tabIndex={tabIndex}
						/>
					)}
				</_Slider.Root>
			</TldrawUiTooltip>
		</div>
	)
})
