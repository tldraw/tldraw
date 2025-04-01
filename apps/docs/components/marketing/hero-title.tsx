export function HeroTitle() {
	return (
		<div className="max-w-screen-xl w-full mx-auto md:px-5 flex flex-col items-center text-center ">
			<div className="relative max-w-[100%] lg:max-w-[80%]">
				<h1 className="w-full font-black text-black dark:text-white text-balance leading-tight text-4xl md:text-5xl px-4">
					Incredible things are happening on the canvas
				</h1>
				<p className="w-full text-xl text-balance text-zinc-600 dark:text-zinc-300 mt-6 px-4">
					Build whiteboards and more with the <span className="whitespace-nowrap">tldraw SDK</span>
				</p>
			</div>
		</div>
	)
}
