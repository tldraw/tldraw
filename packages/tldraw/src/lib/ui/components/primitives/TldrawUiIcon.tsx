import classNames from 'classnames'
import { cloneElement, memo, ReactElement, useLayoutEffect, useRef } from 'react'
import { useAssetUrls } from '../../context/asset-urls'
import { TLUiIconType } from '../../icon-types'

/** @public */
export type TLUiIconJsx = ReactElement<React.HTMLAttributes<HTMLDivElement>>

/** @public */
export interface TLUiIconProps extends React.HTMLAttributes<HTMLDivElement> {
	icon: TLUiIconType | Exclude<string, TLUiIconType> | TLUiIconJsx
	label: string
	small?: boolean
	color?: string
	children?: undefined
	invertIcon?: boolean
	crossOrigin?: 'anonymous' | 'use-credentials'
}

/** @public @react */
export const TldrawUiIcon = memo(function TldrawUiIcon({
	label,
	small,
	invertIcon,
	icon,
	color,
	className,
	...props
}: TLUiIconProps) {
	if (typeof icon === 'string') {
		return (
			<TldrawUIIconInner
				label={label}
				small={small}
				invertIcon={invertIcon}
				icon={icon}
				color={color}
				className={className}
				{...props}
			/>
		)
	}

	return cloneElement(icon, {
		...props,
		className: classNames({ 'tlui-icon__small': small }, className, icon.props.className),
		'aria-label': label,
		style: {
			color,
			transform: invertIcon ? 'scale(-1, 1)' : undefined,
			...icon.props.style,
		},
	})
})

function TldrawUIIconInner({
	label,
	small,
	invertIcon,
	icon,
	color,
	className,
	...props
}: TLUiIconProps & { icon: TLUiIconType | Exclude<string, TLUiIconType> }) {
	const assetUrls = useAssetUrls()
	const asset = assetUrls.icons[icon as TLUiIconType] ?? assetUrls.icons['question-mark-circle']
	const ref = useRef<HTMLDivElement>(null)

	useLayoutEffect(() => {
		if (!asset) {
			console.error(`Icon not found: ${icon}. Add it to the assetUrls.icons object.`)
		}

		if (ref?.current) {
			// HACK: Fix for <https://linear.app/tldraw/issue/TLD-1700/dragging-around-with-the-handtool-makes-lots-of-requests-for-icons>
			// It seems that passing `WebkitMask` to react will cause a render on each call, no idea why... but this appears to be the fix.
			// @ts-ignore
			// eslint-disable-next-line @typescript-eslint/no-deprecated
			ref.current.style.webkitMask = `url(${asset}) center 100% / 100% no-repeat`
		}
	}, [ref, asset, icon])

	if (icon === 'none') {
		return (
			<div
				className={classNames(
					'tlui-icon tlui-icon__placeholder',
					{ 'tlui-icon__small': small },
					className
				)}
				{...props}
			/>
		)
	}

	return (
		<div
			{...props}
			ref={ref}
			aria-label={label}
			role="img"
			className={classNames('tlui-icon', { 'tlui-icon__small': small }, className)}
			style={{
				color,
				mask: `url(${asset}) center 100% / 100% no-repeat`,
				transform: invertIcon ? 'scale(-1, 1)' : undefined,
			}}
		/>
	)
}
