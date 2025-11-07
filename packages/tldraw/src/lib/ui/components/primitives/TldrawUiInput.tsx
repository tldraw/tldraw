import { tlenv, tltime, useMaybeEditor } from '@tldraw/editor'
import classNames from 'classnames'
import * as React from 'react'
import { TLUiTranslationKey } from '../../hooks/useTranslation/TLUiTranslationKey'
import { useTranslation } from '../../hooks/useTranslation/useTranslation'
import { TLUiIconType } from '../../icon-types'
import { TldrawUiIcon } from './TldrawUiIcon'

/** @public */
export interface TLUiInputProps {
	/** Whether the input is disabled. */
	disabled?: boolean
	/** The label text for the input, can be a translation key or a string. */
	label?: TLUiTranslationKey | Exclude<string, TLUiTranslationKey>
	/** Icon to display on the right side of the input. */
	icon?: TLUiIconType | Exclude<string, TLUiIconType>
	/** Icon to display on the left side of the input. */
	iconLeft?: TLUiIconType | Exclude<string, TLUiIconType>
	/** Label for the icon (used for accessibility), can be a translation key or a string. */
	iconLabel?: TLUiTranslationKey | Exclude<string, TLUiTranslationKey>
	/** Whether the input should automatically receive focus when mounted. */
	autoFocus?: boolean
	/** Whether to automatically select all text when the input receives focus. */
	autoSelect?: boolean
	/** Child elements to render inside the input wrapper. */
	children?: React.ReactNode
	/** The default value for an uncontrolled input. */
	defaultValue?: string
	/** Placeholder text to display when the input is empty. */
	placeholder?: string
	/** Callback fired when the user presses Enter to complete editing. */
	onComplete?(value: string): void
	/** Callback fired whenever the input value changes. */
	onValueChange?(value: string): void
	/** Callback fired when the user presses Escape to cancel editing. */
	onCancel?(value: string): void
	/** Callback fired when the input loses focus. */
	onBlur?(value: string): void
	/** Callback fired when the input gains focus. */
	onFocus?(): void
	/** Additional CSS class names to apply to the input element. */
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
	/** The controlled value of the input. */
	value?: string
	/** Test ID for the input element. */
	'data-testid'?: string
	/** Accessibility label for the input element. */
	'aria-label'?: string
}

/** @public @react */
export const TldrawUiInput = React.forwardRef<HTMLInputElement, TLUiInputProps>(
	function TldrawUiInput(
		{
			className,
			label,
			icon,
			iconLeft,
			iconLabel,
			autoSelect = false,
			autoFocus = false,
			defaultValue,
			placeholder,
			onComplete,
			onValueChange,
			onCancel,
			onFocus,
			onBlur,
			shouldManuallyMaintainScrollPositionWhenFocused = false,
			children,
			value,
			'data-testid': dataTestId,
			disabled,
			'aria-label': ariaLabel,
		},
		ref
	) {
		const editor = useMaybeEditor()
		const rInputRef = React.useRef<HTMLInputElement>(null)

		// combine rInputRef and ref
		React.useImperativeHandle(ref, () => rInputRef.current as HTMLInputElement)

		const msg = useTranslation()
		const rInitialValue = React.useRef<string>(defaultValue ?? '')
		const rCurrentValue = React.useRef<string>(defaultValue ?? '')

		const isComposing = React.useRef(false)

		const [isFocused, setIsFocused] = React.useState(false)
		const handleFocus = React.useCallback(
			(e: React.FocusEvent<HTMLInputElement>) => {
				setIsFocused(true)
				const elm = e.currentTarget as HTMLInputElement
				rCurrentValue.current = elm.value
				if (editor) {
					editor.timers.requestAnimationFrame(() => {
						if (autoSelect) {
							elm.select()
						}
					})
				} else {
					tltime.requestAnimationFrame('anon', () => {
						if (autoSelect) {
							elm.select()
						}
					})
				}
				onFocus?.()
			},
			[autoSelect, editor, onFocus]
		)

		const handleChange = React.useCallback(
			(e: React.ChangeEvent<HTMLInputElement>) => {
				const value = e.currentTarget.value
				rCurrentValue.current = value
				onValueChange?.(value)
			},
			[onValueChange]
		)

		// We use keydown capture, because we want to get the escape key event.
		const handleKeyDownCapture = React.useCallback(
			(e: React.KeyboardEvent<HTMLInputElement>) => {
				switch (e.key) {
					case 'Enter': {
						// In Chrome, if the user presses the Enter key while using the IME and calls
						// `e.currentTarget.blur()` in the event callback here, it will trigger an
						// `onChange` with a duplicated text value.
						if (isComposing.current) return
						e.currentTarget.blur()
						e.stopPropagation()
						onComplete?.(e.currentTarget.value)
						break
					}
					case 'Escape': {
						e.currentTarget.value = rInitialValue.current
						onCancel?.(e.currentTarget.value)
						e.currentTarget.blur()
						e.stopPropagation()
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

		const handleCompositionStart = React.useCallback(() => (isComposing.current = true), [])
		const handleCompositionEnd = React.useCallback(() => (isComposing.current = false), [])

		React.useEffect(() => {
			if (!tlenv.isIos) return

			const visualViewport = window.visualViewport
			if (isFocused && shouldManuallyMaintainScrollPositionWhenFocused && visualViewport) {
				const onViewportChange = () => {
					rInputRef.current?.scrollIntoView({ block: 'center' })
				}
				visualViewport.addEventListener('resize', onViewportChange)
				visualViewport.addEventListener('scroll', onViewportChange)

				if (editor) {
					editor.timers.requestAnimationFrame(() => {
						rInputRef.current?.scrollIntoView({ block: 'center' })
					})
				} else {
					tltime.requestAnimationFrame('anon', () => {
						rInputRef.current?.scrollIntoView({ block: 'center' })
					})
				}

				return () => {
					visualViewport.removeEventListener('resize', onViewportChange)
					visualViewport.removeEventListener('scroll', onViewportChange)
				}
			}
		}, [isFocused, editor, shouldManuallyMaintainScrollPositionWhenFocused])

		return (
			<div draggable={false} className="tlui-input__wrapper">
				{children}
				{label && <label>{msg(label)}</label>}
				{iconLeft && (
					<TldrawUiIcon
						label={iconLabel ? msg(iconLabel) : ''}
						icon={iconLeft}
						className="tlui-icon-left"
						small
					/>
				)}
				<input
					ref={rInputRef}
					className={classNames('tlui-input', className)}
					type="text"
					defaultValue={defaultValue}
					onKeyDownCapture={handleKeyDownCapture}
					onChange={handleChange}
					onFocus={handleFocus}
					onBlur={handleBlur}
					onCompositionStart={handleCompositionStart}
					onCompositionEnd={handleCompositionEnd}
					autoFocus={autoFocus}
					aria-label={ariaLabel}
					placeholder={placeholder}
					value={value}
					data-testid={dataTestId}
					disabled={disabled}
				/>
				{icon && (
					<TldrawUiIcon label={iconLabel ? msg(iconLabel) : ''} icon={icon} small={!!label} />
				)}
			</div>
		)
	}
)
