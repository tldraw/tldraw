import classNames from 'classnames'
import * as React from 'react'
import { useTlTranslation } from '../context/translation'
import { TlIcon } from './TlIcon'

function isIos(): boolean {
	if (typeof navigator === 'undefined') return false
	return !!navigator.userAgent.match(/iPad/i) || !!navigator.userAgent.match(/iPhone/i)
}

/** @public */
export interface TlInputProps {
	disabled?: boolean
	label?: string
	icon?: string
	iconLeft?: string
	iconLabel?: string
	wrapperClassName?: string
	iconClassName?: string
	iconLeftClassName?: string
	autoFocus?: boolean
	autoSelect?: boolean
	children?: React.ReactNode
	defaultValue?: string
	/** Maximum number of characters the input will accept. */
	maxLength?: number
	placeholder?: string
	onComplete?(value: string): void
	onValueChange?(value: string): void
	onCancel?(value: string): void
	onBlur?(value: string): void
	onFocus?(): void
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
	'data-testid'?: string
	'aria-label'?: string
}

/** @public @react */
export const TlInput = React.forwardRef<HTMLInputElement, TlInputProps>(function TlInput(
	{
		className,
		label,
		icon,
		iconLeft,
		iconLabel,
		wrapperClassName,
		iconClassName,
		iconLeftClassName,
		autoSelect = false,
		autoFocus = false,
		defaultValue,
		maxLength,
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
	const rInputRef = React.useRef<HTMLInputElement>(null)
	const { msg } = useTlTranslation()

	React.useImperativeHandle(ref, () => rInputRef.current as HTMLInputElement)

	const rInitialValue = React.useRef<string>(defaultValue ?? '')
	const rCurrentValue = React.useRef<string>(defaultValue ?? '')

	const isComposing = React.useRef(false)

	const [isFocused, setIsFocused] = React.useState(false)
	const handleFocus = React.useCallback(
		(e: React.FocusEvent<HTMLInputElement>) => {
			setIsFocused(true)
			const elm = e.currentTarget as HTMLInputElement
			rCurrentValue.current = elm.value
			requestAnimationFrame(() => {
				if (autoSelect) {
					elm.select()
				}
			})
			onFocus?.()
		},
		[autoSelect, onFocus]
	)

	const handleChange = React.useCallback(
		(e: React.ChangeEvent<HTMLInputElement>) => {
			const nextValue = e.currentTarget.value
			rCurrentValue.current = nextValue
			onValueChange?.(nextValue)
		},
		[onValueChange]
	)

	const handleKeyDownCapture = React.useCallback(
		(e: React.KeyboardEvent<HTMLInputElement>) => {
			switch (e.key) {
				case 'Enter': {
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
			const nextValue = e.currentTarget.value
			onBlur?.(nextValue)
		},
		[onBlur]
	)

	const handleCompositionStart = React.useCallback(() => (isComposing.current = true), [])
	const handleCompositionEnd = React.useCallback(() => (isComposing.current = false), [])

	React.useEffect(() => {
		if (!isIos()) return undefined

		const win = rInputRef.current?.ownerDocument.defaultView ?? window
		const visualViewport = win.visualViewport
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

		return undefined
	}, [isFocused, shouldManuallyMaintainScrollPositionWhenFocused])

	const resolvedIconLabel = iconLabel ? msg(iconLabel, iconLabel) : ''

	return (
		<div draggable={false} className={classNames('tl-input__wrapper', wrapperClassName)}>
			{children}
			{label && <label>{msg(label, label)}</label>}
			{iconLeft && (
				<TlIcon
					label={resolvedIconLabel}
					icon={iconLeft}
					className={classNames('tl-input__icon-left', iconLeftClassName, iconClassName)}
					small
				/>
			)}
			<input
				ref={rInputRef}
				className={classNames('tl-input', className)}
				type="text"
				{...(value !== undefined ? { value } : { defaultValue })}
				maxLength={maxLength}
				onKeyDownCapture={handleKeyDownCapture}
				onChange={handleChange}
				onFocus={handleFocus}
				onBlur={handleBlur}
				onCompositionStart={handleCompositionStart}
				onCompositionEnd={handleCompositionEnd}
				autoFocus={autoFocus}
				aria-label={ariaLabel}
				placeholder={placeholder}
				data-testid={dataTestId}
				disabled={disabled}
			/>
			{icon && (
				<TlIcon label={resolvedIconLabel} icon={icon} className={iconClassName} small={!!label} />
			)}
		</div>
	)
})
