export const Image = (props: any) => {
	return (
		<div>
			<div className="bg-zinc-100 dark:bg-zinc-800 py-1 md:rounded-2xl -mx-5 md:mx-0 md:px-1">
				<img alt={props.title} {...props} className="w-full md:rounded-xl !my-0 shadow" />
			</div>
			{props.caption && (
				<span className="block text-xs text-zinc-500 mt-3 text-center">{props.caption}</span>
			)}
			{!props.caption && props.title && (
				<span className="block text-xs text-zinc-500 mt-3 text-center">{props.title}</span>
			)}
		</div>
	)
}
