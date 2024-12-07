'use client'

import clsx from 'clsx'
import Link from 'next/link'
import { useLayoutEffect, useRef } from 'react'

function getMaskStyle(url: string): string {
	return `url(${url}) center 100% / 100% no-repeat`
}

export function MaskedLogo({
	src,
	url,
	alt,
	small,
}: {
	src: string
	url: string
	alt: string
	small?: boolean
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
		<Link
			ref={ref}
			href={url}
			title={alt}
			target="_blank"
			className="text-black-0 dark:text-white masked-logo"
			style={{
				mask: getMaskStyle(src),
			}}
		>
			<img
				src={src}
				className={clsx(
					small ? 'xl:h-[48px] h-[40px]' : 'lg:h-[56px] h-[48px]',
					'w-auto invisible'
				)}
			/>
		</Link>
	)
}
