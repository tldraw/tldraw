'use client'

import { useCallback, useState } from 'react'
import { Button } from '../common/button'

export function CopyMarkdownButton({
	markdown,
	className,
}: {
	markdown: string
	className?: string
}) {
	const [copied, setCopied] = useState(false)

	const handleClick = useCallback(() => {
		navigator.clipboard.writeText(markdown)

		if (window.tlanalytics?.trackCopyCode) {
			window.tlanalytics.trackCopyCode({
				page_category: 'docs',
				text_snippet: markdown.slice(0, 500),
			})
		}

		setCopied(true)
		setTimeout(() => setCopied(false), 1500)
	}, [markdown])

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
