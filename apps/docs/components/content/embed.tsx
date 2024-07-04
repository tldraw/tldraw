import { cn } from '@/utils/cn'

export const Embed = (props: any) => {
	return (
		<div>
			<div className="bg-zinc-100 py-1 md:rounded-2xl -mx-5 md:mx-0 md:px-1">
				<div
					className={cn(
						props.className || 'article__embed',
						'md:rounded-xl overflow-hidden shadow'
					)}
				>
					<iframe className="iframe" src={props.src} width="100%" height={600} />
				</div>
			</div>
			{props.caption && <span className="block text-xs text-zinc-500 mt-3">{props.caption}</span>}
		</div>
	)
}
