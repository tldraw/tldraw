'use client'

import { CheckIcon, PaperClipIcon } from '@heroicons/react/16/solid'
import { DetailedHTMLProps, HTMLAttributes, useRef, useState } from 'react'

export const Pre = (props: DetailedHTMLProps<HTMLAttributes<HTMLPreElement>, HTMLPreElement>) => {
	const container = useRef<HTMLPreElement>(null)
	const [copied, setCopied] = useState<boolean>(false)

	const copy = () => {
		const code: string = container.current?.innerText ?? ''
		navigator.clipboard.writeText(code)
		setCopied(true)
		setTimeout(() => setCopied(false), 1500)
	}

	return (
		<div className="not-prose bg-zinc-100 py-1 md:rounded-2xl -mx-5 md:mx-0 md:px-1">
			<div className="flex justify-end bg-zinc-900 border-b border-zinc-700/50 md:rounded-t-xl">
				<button
					onClick={copy}
					className="h-8 text-blue-400 flex items-center gap-1.5 px-5 md:px-4 focus:outline-none text-sm font-semibold"
				>
					{copied ? <CheckIcon className="h-4" /> : <PaperClipIcon className="h-4" />}
					<span>{copied ? 'Copied' : 'Copy'}</span>
				</button>
			</div>
			<pre
				ref={container}
				className="bg-zinc-900 text-sm text-white shadow md:rounded-b-xl overflow-x-auto px-5 md:px-4 py-4"
			>
				{props.children}
			</pre>
		</div>
	)
}
