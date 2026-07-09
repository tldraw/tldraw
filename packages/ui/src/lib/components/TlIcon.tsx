import classNames from 'classnames'
import { cloneElement, memo, ReactElement, useEffect, useRef, type HTMLAttributes } from 'react'
import { useTlIconUrl } from '../context/icons'

/** @public */
export type TlIconJsx = ReactElement<HTMLAttributes<HTMLDivElement>>

/** @public */
export interface TlIconProps extends HTMLAttributes<HTMLDivElement> {
	icon: string | TlIconJsx
	label?: string
	small?: boolean
	tiny?: boolean
	color?: string
	invertIcon?: boolean
	crossOrigin?: 'anonymous' | 'use-credentials'
}

/** @public @react */
export const TlIcon = memo(function TlIcon({
	label,
	small,
	icon,
	tiny,
	color,
	invertIcon,
	className,
	style,
	crossOrigin,
	...props
}: TlIconProps) {
	if (typeof icon !== 'string') {
		return cloneElement(icon, {
			...props,
			className: classNames(
				{ 'tl-icon--small': small, 'tl-icon--tiny': tiny },
				className,
				icon.props.className
			),
			'aria-label': label,
			style: {
				color,
				transform: invertIcon ? 'scale(-1, 1)' : undefined,
				...style,
				...icon.props.style,
			},
		})
	}

	return (
		<TlIconInner
			label={label}
			small={small}
			tiny={tiny}
			icon={icon}
			color={color}
			invertIcon={invertIcon}
			className={className}
			style={style}
			crossOrigin={crossOrigin}
			{...props}
		/>
	)
})

function TlIconInner({
	label,
	small,
	tiny,
	icon,
	color,
	invertIcon,
	className,
	style,
	crossOrigin: _crossOrigin,
	...props
}: TlIconProps & { icon: string }) {
	const asset = useTlIconUrl(icon)
	const ref = useRef<HTMLDivElement>(null)

	useEffect(() => {
		if (!asset || !ref.current) return

		// HACK: Fix for <https://linear.app/tldraw/issue/TLD-1700/dragging-around-with-the-handtool-makes-lots-of-requests-for-icons>
		// It seems that passing `WebkitMask` to react will cause a render on each call, no idea why... but this appears to be the fix.
		// @ts-ignore
		// eslint-disable-next-line @typescript-eslint/no-deprecated
		ref.current.style.webkitMask = `url(${asset}) center 100% / 100% no-repeat`
	}, [asset, icon])

	if (icon === 'none' || !asset) {
		return (
			<div
				className={classNames(
					'tl-icon',
					'tl-icon--placeholder',
					{ 'tl-icon--small': small, 'tl-icon--tiny': tiny },
					className
				)}
				style={{
					color,
					transform: invertIcon ? 'scale(-1, 1)' : undefined,
					...style,
				}}
				{...props}
			/>
		)
	}

	return (
		<div
			{...props}
			ref={ref}
			aria-label={label}
			role={label ? 'img' : undefined}
			className={classNames(
				'tl-icon',
				{ 'tl-icon--small': small, 'tl-icon--tiny': tiny },
				className
			)}
			style={{
				color,
				mask: `url(${asset}) center 100% / 100% no-repeat`,
				transform: invertIcon ? 'scale(-1, 1)' : undefined,
				...style,
			}}
		/>
	)
}
