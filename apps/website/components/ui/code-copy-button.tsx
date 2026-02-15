'use client'

import { cn } from '@/lib/utils'
import { useCallback, useState } from 'react'

interface CodeCopyButtonProps {
	code: string
	children?: React.ReactNode
	className?: string
}

export function CodeCopyButton({ code, children, className }: CodeCopyButtonProps) {
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
			className={cn(
				'inline-flex items-center gap-2 rounded-md bg-black px-6 py-3 font-mono text-sm text-white transition-colors hover:bg-zinc-800',
				className
			)}
		>
			{children ?? (
				<>
					<span className="text-zinc-400">$</span> {code}
				</>
			)}
			<svg
				className="h-4 w-4 text-zinc-400"
				fill="none"
				viewBox="0 0 24 24"
				strokeWidth="1.5"
				stroke="currentColor"
			>
				{copied ? (
					<path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
				) : (
					<path
						strokeLinecap="round"
						strokeLinejoin="round"
						d="M15.666 3.888A2.25 2.25 0 0013.5 2.25h-3c-1.03 0-1.9.693-2.166 1.638m7.332 0c.055.194.084.4.084.612v0a.75.75 0 01-.75.75H9.75a.75.75 0 01-.75-.75v0c0-.212.03-.418.084-.612m7.332 0c.646.049 1.288.11 1.927.184 1.1.128 1.907 1.077 1.907 2.185V19.5a2.25 2.25 0 01-2.25 2.25H6.75A2.25 2.25 0 014.5 19.5V6.257c0-1.108.806-2.057 1.907-2.185a48.208 48.208 0 011.927-.184"
					/>
				)}
			</svg>
		</button>
	)
}
