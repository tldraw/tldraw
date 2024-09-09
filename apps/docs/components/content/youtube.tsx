export function YouTube({ src, caption }: { src: string; caption?: string }) {
	return (
		<span className="block mb-5">
			<span className="block bg-zinc-100 dark:bg-zinc-800 py-1 md:rounded-2xl -mx-5 md:mx-0 md:px-1">
				<iframe
					src={src}
					title={caption}
					allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
					referrerPolicy="strict-origin-when-cross-origin"
					allowFullScreen
					className="w-full aspect-video md:rounded-xl overflow-hidden !my-0 shadow"
				></iframe>
			</span>
			{caption && <span className="block text-xs text-zinc-500 mt-3 text-center">{caption}</span>}
		</span>
	)
}
