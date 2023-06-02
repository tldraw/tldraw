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
	label?: TLUiTranslationKey
	icon?: TLUiIconType
	spinner?: boolean
	iconLeft?: TLUiIconType
	smallIcon?: boolean
	kbd?: string
	isChecked?: boolean
	invertIcon?: boolean
	type?: 'primary' | 'danger' | 'normal'
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
		type = 'normal',
		children,
		spinner,
		...props
	},
	ref
) {
	const msg = useTranslation()
	const labelStr = label ? msg(label) : ''

	return (
		<button
			ref={ref}
			draggable={false}
			type="button"
			{...props}
			title={props.title ?? labelStr}
			className={classnames('tlui-button', `tlui-button__${type}`, props.className)}
		>
			{iconLeft && <Icon icon={iconLeft} className="tlui-icon-left" small />}
			{children}
			{label && (
				<span draggable={false}>
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
