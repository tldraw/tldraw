'use client'

import { RefObject, useCallback, useState } from 'react'
import { Button } from '../common/button'

export function CopyButton({
	name,
	copy,
	className,
}: {
	name: string
	copy: string | RefObject<HTMLElement>
	className?: string
}) {
	const [copied, setCopied] = useState<boolean>(false)
	const handleClick = useCallback(() => {
		const code: string = typeof copy === 'string' ? copy : (copy.current?.innerText ?? '')

		navigator.clipboard.writeText(code)

		const isInstall = code.trim() === 'npm install tldraw'
		track('docs.copy.code-block', { isInstall, codeBlockId: name })

		// Track Google Ads conversion for code block copies
		if (window.tlanalytics?.gtag) {
			window.tlanalytics.gtag('event', 'conversion', {
				send_to: 'AW-17268182782/qIuDCMnhl_EaEP6djqpA',
				value: 1.0,
				currency: 'USD',
			})
		}
		setCopied(true)
		setTimeout(() => setCopied(false), 1500)
	}, [copy, name])

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

export function track(name: string, data?: { [key: string]: any }) {
	window.tlanalytics?.track(name, data)
}
