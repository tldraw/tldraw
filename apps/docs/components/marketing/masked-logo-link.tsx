'use client'

import Link from 'next/link'
import { useLayoutEffect, useRef } from 'react'
import { MaskedLogo } from './masked-logo'

function getMaskStyle(url: string): string {
	return `url(${url}) center 100% / 100% no-repeat`
}

export function MaskedLogoLink({
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
		<Link ref={ref} href={url} title={alt} target="_blank">
			<MaskedLogo src={src} small={small} />
		</Link>
	)
}
