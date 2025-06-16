import classNames from 'classnames'
import { HtmlHTMLAttributes, useLayoutEffect, useRef } from 'react'
import styles from './icon.module.css'

import mergedSpriteUrl from '../../../assets/0_merged_tla.svg'

function getMaskStyle(icon: string): string {
	return `url(${mergedSpriteUrl}#icon-${icon}) center 100% / 100% no-repeat`
}

export function TlaIcon({
	icon,
	className = '',
	invertIcon,
	inline,
	ariaLabel,
}: {
	icon: string
	className?: string
	invertIcon?: boolean
	inline?: boolean
	ariaLabel?: string
}) {
	const ref = useRef<HTMLDivElement>(null)

	useLayoutEffect(() => {
		if (!ref.current) return
		// HACK: Fix for <https://linear.app/tldraw/issue/TLD-1700/dragging-around-with-the-handtool-makes-lots-of-requests-for-icons>
		// It seems that passing `WebkitMask` to react will cause a render on each call, no idea why... but this appears to be the fix.
		// @ts-ignore
		// eslint-disable-next-line @typescript-eslint/no-deprecated
		ref.current.style.webkitMask = getMaskStyle(icon)
	}, [ref, icon])

	const _className = classNames({
		[styles.icon]: true,
		[styles.inline]: inline,
		[className]: true,
	})

	if (icon === 'none') {
		return <span className={_className} />
	}

	return (
		<span
			ref={ref}
			className={_className}
			aria-hidden="true"
			role="img"
			aria-label={ariaLabel}
			style={{
				mask: getMaskStyle(icon),
				transform: invertIcon ? 'scale(-1, 1)' : undefined,
			}}
		/>
	)
}

export function TlaIconWrapper(props: HtmlHTMLAttributes<HTMLDivElement>) {
	return <span {...props} className={classNames(styles.iconWrapper, props.className)} />
}
