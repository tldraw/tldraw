'use client'

import { cn } from '@/utils/cn'
import clsx from 'clsx'
import { useLayoutEffect, useRef } from 'react'

function getMaskStyle(url: string): string {
	return `url(${url}) center 100% / 100% no-repeat`
}

export function MaskedLogo({
	src,
	small,
	hover,
}: {
	src: string
	small?: boolean
	hover?: boolean
}) {
	const ref = useRef<HTMLAnchorElement>(null)

	useLayoutEffect(() => {
		if (!ref.current) return
		// HACK: Fix for <https://linear.app/tldraw/issue/TLD-1700/dragging-around-with-the-handtool-makes-lots-of-requests-for-icons>
		// It seems that passing `WebkitMask` to react will cause a render on each call, no idea why... but this appears to be the fix.
		// @ts-ignore
		// eslint-disable-next-line @typescript-eslint/no-deprecated
		ref.current.style.webkitMask = getMaskStyle(src)
	}, [ref, src])

	return (
		<div
			className={cn(
				'text-black-0 dark:text-white masked-logo',
				hover ? 'opacity-[.5] hover:opacity-[1]' : ''
			)}
			style={{
				mask: getMaskStyle(src),
			}}
		>
			<img src={src} className={clsx(small ? 'h-[32px]' : 'h-[96px]', 'w-auto invisible')} />
		</div>
	)
}
