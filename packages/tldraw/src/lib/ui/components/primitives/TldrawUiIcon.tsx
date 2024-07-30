import classNames from 'classnames'
import { memo, useLayoutEffect, useRef } from 'react'
import { useAssetUrls } from '../../context/asset-urls'
import { TLUiIconType } from '../../icon-types'

/** @public */
export interface TLUiIconProps extends React.HTMLProps<HTMLDivElement> {
	icon: TLUiIconType
	small?: boolean
	color?: string
	children?: undefined
	invertIcon?: boolean
}

/** @public @react */
export const TldrawUiIcon = memo(function TldrawUiIcon(props: TLUiIconProps) {
	if (typeof props.icon === 'string') {
		return <AssetIcon {...props} icon={props.icon} />
	} else {
		return <CustomIcon {...props} icon={props.icon} />
	}
})

function AssetIcon({
	icon,
	small,
	color,
	invertIcon,
	className,
	style,
	...props
}: TLUiIconProps & { icon: Extract<TLUiIconType, string> }) {
	const assetUrls = useAssetUrls()
	const asset = assetUrls.icons[icon] ?? assetUrls.icons['question-mark-circle']
	const ref = useRef<HTMLDivElement>(null)

	useLayoutEffect(() => {
		if (!asset) {
			console.error(`Icon not found: ${icon}. Add it to the assetUrls.icons object.`)
		}

		if (ref?.current) {
			// HACK: Fix for <https://linear.app/tldraw/issue/TLD-1700/dragging-around-with-the-handtool-makes-lots-of-requests-for-icons>
			// It seems that passing `WebkitMask` to react will cause a render on each call, no idea why... but this appears to be the fix.
			// @ts-ignore
			// eslint-disable-next-line deprecation/deprecation
			ref.current.style.webkitMask = `url(${asset}) center 100% / 100% no-repeat`
		}
	}, [ref, asset, icon])

	if (icon === 'none') {
		return <div className={classNames('tlui-icon', { 'tlui-icon__small': small }, className)} />
	}

	return (
		<div
			{...props}
			ref={ref}
			className={classNames('tlui-icon tlui-icon__asset', { 'tlui-icon__small': small }, className)}
			style={{
				color,
				mask: `url(${asset}) center 100% / 100% no-repeat`,
				transform: invertIcon ? 'scale(-1, 1)' : undefined,
				...style,
			}}
		/>
	)
}

function CustomIcon({
	icon,
	small,
	color,
	invertIcon,
	className,
	style,
	...props
}: TLUiIconProps & { icon: React.ReactElement }) {
	return (
		<div
			{...props}
			className={classNames(
				'tlui-icon tlui-icon__custom',
				{ 'tlui-icon__small': small },
				className
			)}
			style={{
				color,
				transform: invertIcon ? 'scale(-1, 1)' : undefined,
				...style,
			}}
		>
			{icon}
		</div>
	)
}
