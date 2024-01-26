import { useEditor } from '@tldraw/editor'
import classnames from 'classnames'
import * as React from 'react'
import { TLUiTranslationKey } from '../../hooks/useTranslation/TLUiTranslationKey'
import { useTranslation } from '../../hooks/useTranslation/useTranslation'
import { TLUiIconType } from '../../icon-types'
import { Spinner } from '../Spinner'
import { Icon } from './Icon'
import { Kbd } from './Kbd'

/** @public */
export interface TLUiButtonProps extends React.HTMLAttributes<HTMLButtonElement> {
	loading?: boolean // TODO: loading spinner
	disabled?: boolean
	label?: TLUiTranslationKey | Exclude<string, TLUiTranslationKey>
	icon?: TLUiIconType | Exclude<string, TLUiIconType>
	spinner?: boolean
	iconLeft?: TLUiIconType | Exclude<string, TLUiIconType>
	smallIcon?: boolean
	kbd?: string
	isChecked?: boolean
	invertIcon?: boolean
	type: 'normal' | 'primary' | 'danger' | 'low' | 'icon' | 'tool' | 'menu' | 'help'
}

/** @public */
export const Button = React.forwardRef<HTMLButtonElement, TLUiButtonProps>(function Button(
	{
		label,
		icon,
		invertIcon,
		iconLeft,
		smallIcon,
		kbd,
		isChecked = false,
		type,
		children,
		spinner,
		disabled,
		...props
	},
	ref
) {
	const msg = useTranslation()
	const labelStr = label ? msg(label) : ''
	const editor = useEditor()

	// If the button is getting disabled while it's focused, move focus to the editor
	// so that the user can continue using keyboard shortcuts
	const current = (ref as React.MutableRefObject<HTMLButtonElement | null>)?.current
	if (disabled && current === document.activeElement) {
		editor.getContainer().focus()
	}

	return (
		<button
			ref={ref}
			draggable={false}
			type="button"
			disabled={disabled}
			{...props}
			title={props.title ?? labelStr}
			className={classnames('tlui-button', `tlui-button__${type}`, props.className)}
		>
			{iconLeft && <Icon icon={iconLeft} className="tlui-button__icon-left" small />}
			{children}
			{label && (
				<span className="tlui-button__label" draggable={false}>
					{labelStr}
					{isChecked && <Icon icon="check" />}
				</span>
			)}
			{kbd && <Kbd>{kbd}</Kbd>}
			{icon && !spinner && (
				<Icon icon={icon} small={!!label || smallIcon} invertIcon={invertIcon} />
			)}
			{spinner && <Spinner />}
		</button>
	)
})
