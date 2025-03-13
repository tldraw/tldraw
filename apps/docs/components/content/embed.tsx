'use client'
import { cn } from '@/utils/cn'
import { useState } from 'react'
import { Button } from '../common/button'

export function Embed(props: any) {
	const [isExampleFocused, setIsExampleFocused] = useState(false)
	function handleClick() {
		setIsExampleFocused(true)
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
						className="iframe"
						src={props.src}
						width="100%"
						height={600}
						allow="autoplay; clipboard-read; clipboard-write"
					/>
					{!isExampleFocused && (
						<div
							className="absolute inset-0 bg-[#FBFCFE]/50 dark:bg-[#101011]/50 flex items-center justify-center cursor-pointer"
							onClick={handleClick}
						>
							<Button onClick={handleClick} caption="Try example" icon="play" className="shadow" />
						</div>
					)}
				</div>
			</div>
			{props.caption && <span className="block text-xs text-zinc-500 mt-3">{props.caption}</span>}
		</div>
	)
}
