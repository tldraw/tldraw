'use client'

import { RefObject, useState } from 'react'
import { Button } from '../common/button'

export function CopyButton({
	copy,
	className,
}: {
	copy: string | RefObject<HTMLElement | null>
	className?: string
}) {
	const [copied, setCopied] = useState<boolean>(false)
	const handleClick = async () => {
		const page_url = window.location.href
		const code: string = typeof copy === 'string' ? copy : (copy.current?.innerText ?? '')

		try {
			await navigator.clipboard.writeText(code)
		} catch {
			return
		}

		try {
			window.tlanalytics?.trackCopyCode?.({
				page_category: 'docs',
				page_url,
				copy_kind: 'code_snippet',
				method: 'button',
				text_snippet: code,
			})
		} catch {
			/* Analytics must not interrupt a successful copy. */
		}

		setCopied(true)
		setTimeout(() => setCopied(false), 1500)
	}

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
