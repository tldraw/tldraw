'use client'
import { cn } from '@/utils/cn'
import { useRef, useState } from 'react'
import { Button } from '../common/button'

export function Embed(props: {
	className?: string
	src: string
	caption?: string
	tryButton?: string
}) {
	const [isExampleFocused, setIsExampleFocused] = useState(false)
	const iframeRef = useRef<HTMLIFrameElement>(null)
	function handleClick() {
		setIsExampleFocused(true)
		iframeRef.current?.focus()
	}
	function handleBlur() {
		setIsExampleFocused(false)
	}
	return (
		<div>
			<div className="bg-zinc-100 dark:bg-zinc-700 py-1 md:rounded-2xl -mx-5 md:-mx-1 md:px-1">
				<div
					className={cn(
						props.className,
						'md:rounded-xl overflow-hidden shadow bg-white dark:bg-zinc-950 relative'
					)}
				>
					<iframe
						ref={iframeRef}
						className="iframe"
						src={props.src}
						width="100%"
						height={550}
						allow="autoplay; clipboard-read; clipboard-write"
						onBlur={handleBlur}
					/>
					{!isExampleFocused && (
						<div
							className="absolute inset-0 bg-[#FBFCFE]/50 dark:bg-[#101011]/50 flex items-center justify-center cursor-pointer"
							onClick={handleClick}
						>
							<Button
								onClick={handleClick}
								caption={props.tryButton ?? 'Try example'}
								icon="play"
								className="shadow"
							/>
						</div>
					)}
				</div>
			</div>
			{props.caption && <span className="block text-xs text-zinc-500 mt-3">{props.caption}</span>}
		</div>
	)
}

export function StarterKitEmbed(props: { id: string }) {
	return (
		<Embed
			src={`https://${props.id}.templates.tldraw.dev/?utm_source=docs-embed`}
			tryButton="Try starter kit"
		/>
	)
}
