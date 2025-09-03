'use client'

import { cn } from '@/utils/cn'
import { DetailedHTMLProps, HTMLAttributes, useRef } from 'react'
import { CopyButton } from './copy-button'

export function Pre(props: DetailedHTMLProps<HTMLAttributes<HTMLPreElement>, HTMLPreElement>) {
	const container = useRef<HTMLPreElement>(null)
	return (
		<div
			className={cn(
				'group relative not-prose bg-zinc-100 dark:bg-zinc-800 py-1 md:rounded-2xl -mx-5 md:-mx-1 md:px-1 my-6',
				'[td_&]:m-0 [td_&]:mb-2 [td_&]:p-0 [td_&]:bg-transparent [td_&]:rounded-none dark:[td_&]:rounded-lg'
			)}
		>
			<pre
				ref={container}
				className={cn(
					'bg-zinc-900 text-sm text-white shadow md:rounded-xl overflow-x-auto px-5 md:px-4 py-4 font-medium',
					'[td_&]:bg-zinc-200 dark:[td_&]:bg-zinc-800 [td_&]:shadow-none [td_&]:rounded-lg [td_&]:p-0 [td_&]:px-1.5',
					// this rule enables inverted dark/light mode inside of table cells
					'[&_span]:text-[--shiki-dark]',
					'[td_&_span]:!text-[--shiki-light]',
					'dark:[td_&_span]:!text-[--shiki-dark]'
				)}
			>
				{props.children}
			</pre>
			<CopyButton copy={container} name={'code-block'} />
		</div>
	)
}
