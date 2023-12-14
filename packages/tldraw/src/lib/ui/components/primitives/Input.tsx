import { stopEventPropagation, useEditor } from '@tldraw/editor'
import classNames from 'classnames'
import * as React from 'react'
import { TLUiTranslationKey } from '../../hooks/useTranslation/TLUiTranslationKey'
import { useTranslation } from '../../hooks/useTranslation/useTranslation'
import { TLUiIconType } from '../../icon-types'
import { Icon } from './Icon'

/** @public */
export interface TLUiInputProps {
	disabled?: boolean
	label?: TLUiTranslationKey | Exclude<string, TLUiTranslationKey>
	icon?: TLUiIconType | Exclude<string, TLUiIconType>
	iconLeft?: TLUiIconType | Exclude<string, TLUiIconType>
	autofocus?: boolean
	autoselect?: boolean
	children?: any
	defaultValue?: string
	placeholder?: string
	onComplete?: (value: string) => void
	onValueChange?: (value: string) => void
	onCancel?: (value: string) => void
	onBlur?: (value: string) => void
	className?: string
	/**
	 * Usually on iOS when you focus an input, the browser will adjust the viewport to bring the input
	 * into view. Sometimes this doesn't work properly though - for example, if the input is newly
	 * created, iOS seems to have a hard time adjusting the viewport for it. This prop allows you to
	 * opt-in to some extra code to manually bring the input into view when the visual viewport of the
	 * browser changes, but we don't want to use it everywhere because generally the native behavior
	 * looks nicer in scenarios where it's sufficient.
	 */
	shouldManuallyMaintainScrollPositionWhenFocused?: boolean
	value?: string
}

/** @public */
export const Input = React.forwardRef<HTMLInputElement, TLUiInputProps>(function Input(
	{
		className,
		label,
		icon,
		iconLeft,
		autoselect = false,
		autofocus = false,
		defaultValue,
		placeholder,
		onComplete,
		onValueChange,
		onCancel,
		onBlur,
		shouldManuallyMaintainScrollPositionWhenFocused = false,
		children,
		value,
	},
	ref
) {
	const editor = useEditor()
	const rInputRef = React.useRef<HTMLInputElement>(null)

	// combine rInputRef and ref
	React.useImperativeHandle(ref, () => rInputRef.current as HTMLInputElement)

	const msg = useTranslation()
	const rInitialValue = React.useRef<string>(defaultValue ?? '')
	const rCurrentValue = React.useRef<string>(defaultValue ?? '')

	const [isFocused, setIsFocused] = React.useState(false)
	const handleFocus = React.useCallback(
		(e: React.FocusEvent<HTMLInputElement>) => {
			setIsFocused(true)
			const elm = e.currentTarget as HTMLInputElement
			rCurrentValue.current = elm.value
			requestAnimationFrame(() => {
				if (autoselect) {
					elm.select()
				}
			})
		},
		[autoselect]
	)

	const handleChange = React.useCallback(
		(e: React.ChangeEvent<HTMLInputElement>) => {
			const value = e.currentTarget.value
			rCurrentValue.current = value
			onValueChange?.(value)
		},
		[onValueChange]
	)

	const handleKeyUp = React.useCallback(
		(e: React.KeyboardEvent<HTMLInputElement>) => {
			switch (e.key) {
				case 'Enter': {
					e.currentTarget.blur()
					stopEventPropagation(e)
					onComplete?.(e.currentTarget.value)
					break
				}
				case 'Escape': {
					e.currentTarget.value = rInitialValue.current
					e.currentTarget.blur()
					stopEventPropagation(e)
					onCancel?.(e.currentTarget.value)
					break
				}
			}
		},
		[onComplete, onCancel]
	)

	const handleBlur = React.useCallback(
		(e: React.FocusEvent<HTMLInputElement>) => {
			setIsFocused(false)
			const value = e.currentTarget.value
			onBlur?.(value)
		},
		[onBlur]
	)

	React.useEffect(() => {
		if (!editor.environment.isIos) return

		const visualViewport = window.visualViewport
		if (isFocused && shouldManuallyMaintainScrollPositionWhenFocused && visualViewport) {
			const onViewportChange = () => {
				rInputRef.current?.scrollIntoView({ block: 'center' })
			}
			visualViewport.addEventListener('resize', onViewportChange)
			visualViewport.addEventListener('scroll', onViewportChange)

			requestAnimationFrame(() => {
				rInputRef.current?.scrollIntoView({ block: 'center' })
			})

			return () => {
				visualViewport.removeEventListener('resize', onViewportChange)
				visualViewport.removeEventListener('scroll', onViewportChange)
			}
		}
	}, [editor, isFocused, shouldManuallyMaintainScrollPositionWhenFocused])

	return (
		<div draggable={false} className="tlui-input__wrapper">
			{children}
			{label && <label>{msg(label)}</label>}
			{iconLeft && <Icon icon={iconLeft} className="tlui-icon-left" small />}
			<input
				ref={rInputRef}
				className={classNames('tlui-input', className)}
				type="text"
				defaultValue={defaultValue}
				onKeyUp={handleKeyUp}
				onChange={handleChange}
				onFocus={handleFocus}
				onBlur={handleBlur}
				autoFocus={autofocus}
				placeholder={placeholder}
				value={value}
			/>
			{icon && <Icon icon={icon} small={!!label} />}
		</div>
	)
})
