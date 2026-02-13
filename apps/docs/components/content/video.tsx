import { TldrawLink } from '../common/tldraw-link'

export function Video({
	src,
	href,
	thumbnail,
	caption,
	lazy = false,
	autoplay = false,
}: {
	src: string
	thumbnail?: string
	caption?: string
	autoplay?: boolean
	href?: string
	lazy?: boolean
}) {
	return (
		<span className="block">
			<TldrawLink
				href={href ?? src}
				target="_blank"
				rel="noreferrer"
				className="block bg-zinc-100 dark:bg-zinc-800 py-1 sm:rounded-2xl sm:px-1"
			>
				<video
					className="w-full sm:rounded-xl !my-0 shadow"
					src={src}
					poster={thumbnail}
					controls={false}
					preload={lazy ? 'metadata' : 'auto'}
					autoPlay={autoplay}
					muted={autoplay}
					loop={autoplay}
				/>
			</TldrawLink>
			{caption && <span className="block text-xs text-zinc-500 mt-3 text-center">{caption}</span>}
		</span>
	)
}
