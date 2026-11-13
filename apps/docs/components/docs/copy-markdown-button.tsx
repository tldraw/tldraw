'use client'

import { useState } from 'react'
import { Button } from '../common/button'

export function CopyMarkdownButton({
	markdown,
	className,
}: {
	markdown: string
	className?: string
}) {
	const [copied, setCopied] = useState(false)

	const handleClick = async () => {
		const page_url = window.location.href
		try {
			await navigator.clipboard.writeText(markdown)
		} catch {
			return
		}

		try {
			window.tlanalytics?.trackCopyCode?.({
				page_category: 'docs',
				page_url,
				copy_kind: 'page_markdown',
				method: 'button',
				chars: markdown.length,
				text_snippet: markdown.slice(0, 500),
			})
		} catch {
			/* Analytics must not interrupt a successful copy. */
		}

		setCopied(true)
		setTimeout(() => setCopied(false), 1500)
	}

	return (
		<Button
			id="copy-markdown"
			onClick={handleClick}
			caption={copied ? 'Copy markdown' : 'Copy markdown'}
			icon={copied ? 'check' : 'copy'}
			size="sm"
			type="secondary"
			className={className}
		/>
	)
}
