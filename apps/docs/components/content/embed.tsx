import { cn } from '@/utils/cn'

export function Embed(props: any) {
	return (
		<div>
			<div className="bg-zinc-100 dark:bg-zinc-700 py-1 md:rounded-2xl -mx-5 md:-mx-1 md:px-1">
				<div
					className={cn(
						props.className,
						'md:rounded-xl overflow-hidden shadow bg-white dark:bg-zinc-950'
					)}
				>
					<iframe
						className="iframe"
						src={props.src}
						width="100%"
						height={600}
						allow="autoplay; clipboard-read; clipboard-write"
					/>
				</div>
			</div>
			{props.caption && <span className="block text-xs text-zinc-500 mt-3">{props.caption}</span>}
		</div>
	)
}
