import { TldrawLink } from '../common/tldraw-link'

export function Image(props: any) {
	return (
		<span className="block">
			<TldrawLink
				href={props.href ?? props.src}
				className="block bg-zinc-100 dark:bg-zinc-800 py-1 sm:rounded-2xl -mx-5 sm:mx-0 sm:px-1"
			>
				<img alt={props.title} {...props} className="w-full sm:rounded-xl !my-0 shadow" />
			</TldrawLink>
			{props.caption && (
				<span className="block text-xs text-zinc-500 mt-3 text-center text-balance">
					{props.caption}
				</span>
			)}
			{!props.caption && props.title && (
				<span className="block text-xs text-zinc-500 mt-3 text-center text-balance">
					{props.title}
				</span>
			)}
		</span>
	)
}
