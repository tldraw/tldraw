import { TlIcon } from '@tldraw/ui'
import classNames from 'classnames'
import { CSSProperties } from 'react'
import mergedSpriteUrl from '../../../assets/0_merged_tla.svg'
import styles from './icon.module.css'

const TLA_ICON_NAMES = [
	'avatar',
	'check',
	'chevron-down',
	'chevron-up-down',
	'close',
	'comment',
	'copy',
	'dots-vertical-strong',
	'edit',
	'edit-strong',
	'export',
	'external',
	'feedback',
	'group',
	'help-circle',
	'manual',
	'none',
	'pin',
	'plus',
	'search',
	'settings',
	'share',
	'sidebar-strong',
	'sign-in',
	'spinner',
	'update',
] as const

export const TLA_ICON_ASSET_URLS = Object.fromEntries(
	TLA_ICON_NAMES.map((icon) => [icon, `${mergedSpriteUrl}#icon-${icon}`])
)

export function TlaIcon({
	icon,
	className = '',
	invertIcon,
	inline,
	ariaLabel,
	style,
}: {
	icon: string
	className?: string
	invertIcon?: boolean
	inline?: boolean
	ariaLabel?: string
	style?: CSSProperties
}) {
	const _className = classNames({
		[styles.icon]: true,
		[styles.inline]: inline,
		[className]: true,
	})

	return (
		<TlIcon
			className={_className}
			aria-hidden={ariaLabel ? undefined : true}
			label={ariaLabel}
			icon={icon}
			invertIcon={invertIcon}
			small
			style={{
				...style,
			}}
		/>
	)
}
