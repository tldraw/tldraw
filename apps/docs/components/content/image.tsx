export const Image = (props: any) => {
	return (
		<div>
			<div className="bg-zinc-100 py-1 md:rounded-2xl -mx-5 md:mx-0 md:px-1">
				<img alt={props.title} {...props} className="rounded-xl !my-0 shadow" />
			</div>
			{props.caption && <span className="block text-xs text-zinc-500 mt-3">{props.caption}</span>}
		</div>
	)
}
