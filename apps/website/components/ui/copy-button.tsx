'use client'

import { useCallback, useState } from 'react'

interface CopyButtonProps {
	code: string
}

export function CopyButton({ code }: CopyButtonProps) {
	const [copied, setCopied] = useState(false)

	const handleCopy = useCallback(() => {
		navigator.clipboard.writeText(code)
		setCopied(true)
		setTimeout(() => setCopied(false), 2000)
	}, [code])

	return (
		<button
			type="button"
			onClick={handleCopy}
			className="flex items-center gap-1.5 rounded-md px-2 py-1 font-mono text-xs text-zinc-400 transition-colors hover:bg-zinc-200/50 hover:text-zinc-600 dark:text-zinc-500 dark:hover:bg-zinc-700/50 dark:hover:text-zinc-300"
		>
			{copied ? (
				<>
					<CopyCheckIcon />
					<span>Copied</span>
				</>
			) : (
				<>
					<CopyIcon />
					<span>Copy</span>
				</>
			)}
		</button>
	)
}

function CopyIcon() {
	return (
		<svg
			width="14"
			height="14"
			viewBox="0 0 24 24"
			fill="none"
			stroke="currentColor"
			strokeWidth="2"
			strokeLinecap="round"
			strokeLinejoin="round"
		>
			<rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
			<path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
		</svg>
	)
}

function CopyCheckIcon() {
	return (
		<svg
			width="14"
			height="14"
			viewBox="0 0 24 24"
			fill="none"
			stroke="currentColor"
			strokeWidth="2"
			strokeLinecap="round"
			strokeLinejoin="round"
		>
			<path d="M20 6 9 17l-5-5" />
		</svg>
	)
}
