import { useLayoutEffect, useRef } from 'react'

export function TlaIcon({
	icon,
	className = '',
	invertIcon,
}: {
	icon: string
	className?: string
	invertIcon?: boolean
}) {
	const ref = useRef<HTMLDivElement>(null)

	useLayoutEffect(() => {
		if (ref?.current) {
			// HACK: Fix for <https://linear.app/tldraw/issue/TLD-1700/dragging-around-with-the-handtool-makes-lots-of-requests-for-icons>
			// It seems that passing `WebkitMask` to react will cause a render on each call, no idea why... but this appears to be the fix.
			// @ts-ignore
			// eslint-disable-next-line deprecation/deprecation
			ref.current.style.webkitMask = `url(/icon=${icon}.svg) center 100% / 100% no-repeat`
		}
	}, [ref, icon])

	if (icon === 'none') {
		return <div className="tla-icon" />
	}

	return (
		<div
			ref={ref}
			className={`tla-icon ${className}`}
			style={{
				mask: `url(/icon=${icon}.svg) center 100% / 100% no-repeat`,
				transform: invertIcon ? 'scale(-1, 1)' : undefined,
			}}
		/>
	)
}
