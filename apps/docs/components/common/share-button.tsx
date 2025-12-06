'use client'

import { cn } from '@/utils/cn'
import { CheckIcon, ShareIcon } from '@heroicons/react/20/solid'
import { useState } from 'react'

export function ShareButton({
	url,
	size = 'small',
	className,
}: {
	url: string
	size?: 'small' | 'base'
	className?: string
}) {
	const [copied, setCopied] = useState<boolean>(false)

	return (
		<button
			onClick={() => {
				navigator.clipboard.writeText(url)
				setCopied(true)
				setTimeout(() => setCopied(false), 1500)
			}}
			className={cn(
				'flex items-center gap-1.5 text-blue-500 hover:text-blue-600 dark:hover:text-blue-400 mb-4',
				size === 'small' && 'text-xs',
				className
			)}
		>
			{copied ? (
				<CheckIcon className={size === 'small' ? 'h-3.5' : 'h-4'} />
			) : (
				<ShareIcon className={size === 'small' ? 'h-3.5' : 'h-4'} />
			)}
			<span>{copied ? 'Link copied to clipboard' : 'Share this article'}</span>
		</button>
	)
}
