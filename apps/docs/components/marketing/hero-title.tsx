export function HeroTitle() {
	return (
		<div className="max-w-screen-xl w-full mx-auto md:px-5 flex items-center justify-center">
			<div className="relative max-w-[100%] lg:max-w-[80%]">
				<h1 className="hidden sm:block relative text-center font-black text-black dark:text-white text-balance leading-tight text-4xl md:text-5xl md:leading-tight px-[8px]">
					Build <mark>perfect</mark> whiteboards in React with the{' '}
					<span className="whitespace-nowrap">tldraw SDK</span>
				</h1>
				<h1 className="block text-center text-balance sm:hidden relative font-black text-black dark:text-white text-center text-3xl leading-tight px-[8px]">
					Build <mark>perfect</mark>
					<br />
					whiteboards in React
					<br />
					with the <span className="whitespace-nowrap">tldraw SDK</span>
				</h1>
			</div>
		</div>
	)
}
