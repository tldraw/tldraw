'use client'

import { ShareIcon } from '@heroicons/react/20/solid'
import React, { useState } from 'react'

export const ShareButton: React.FC<{ url: string }> = ({ url }) => {
	const [copied, setCopied] = useState<boolean>(false)

	return (
		<button
			onClick={() => {
				navigator.clipboard.writeText(url)
				setCopied(true)
				setTimeout(() => setCopied(false), 1500)
			}}
			className="text-xs flex items-center gap-1.5 text-blue-500 hover:text-blue-600"
		>
			<ShareIcon className="h-3.5" />
			<span>{copied ? 'Link copied to clipboard' : 'Share this article'}</span>
		</button>
	)
}
