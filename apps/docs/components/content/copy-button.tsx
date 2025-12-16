'use client'

import { RefObject, useCallback, useState } from 'react'
import { Button } from '../common/button'

export function CopyButton({
	copy,
	className,
}: {
	copy: string | RefObject<HTMLElement | null>
	className?: string
}) {
	const [copied, setCopied] = useState<boolean>(false)
	const handleClick = useCallback(() => {
		const code: string = typeof copy === 'string' ? copy : (copy.current?.innerText ?? '')

		navigator.clipboard.writeText(code)

		if (window.tlanalytics?.trackCopyCode) {
			window.tlanalytics.trackCopyCode({
				page_category: 'docs',
				text_snippet: code,
			})
		}

		setCopied(true)
		setTimeout(() => setCopied(false), 1500)
	}, [copy])

	return (
		<Button
			onClick={handleClick}
			caption={'Copy'}
			icon={copied ? 'check' : 'copy'}
			size="xs"
			className={`absolute transition-all duration-100 translate-y-4 opacity-0 -top-2 right-4 group-hover:opacity-100 group-hover:translate-y-0 ${className}`}
		/>
	)
}
