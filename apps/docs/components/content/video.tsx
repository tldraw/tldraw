export function Video({
	src,
	thumbnail,
	caption,
	lazy = false,
	autoplay = false,
}: {
	src: string
	thumbnail?: string
	caption?: string
	autoplay?: boolean
	lazy?: boolean
}) {
	return (
		<span className="block mb-5">
			<span className="block bg-zinc-100 dark:bg-zinc-800 py-1 md:rounded-2xl -mx-5 md:mx-0 md:px-1">
				<video
					className="w-full md:rounded-xl overflow-hidden !my-0 shadow"
					src={src}
					poster={thumbnail}
					controls
					preload={lazy ? 'metadata' : 'auto'}
					autoPlay={autoplay}
					muted={autoplay}
					loop={autoplay}
				/>
			</span>
			{caption && <span className="block text-xs text-zinc-500 mt-3 text-center">{caption}</span>}
		</span>
	)
}
