import { HeroCtas } from './hero-ctas'

export function HeroSection() {
	return (
		<>
			<div className="max-w-screen-xl w-full mx-auto md:px-5 flex flex-col items-center text-center px-4">
				<div className="relative max-w-[100%] lg:max-w-[80%]">
					<div className="h-20" />
					<h1 className="w-full font-black text-black dark:text-white text-balance leading-tight text-4xl md:text-5xl px-4">
						Build infinite canvas apps in React with the tldraw SDK
					</h1>
					<p className="pt-6 text-balance">
						Make whiteboards and more with tldraw&apos;s high-performance web canvas.
					</p>
					<div className="h-12" />
					<HeroCtas />
				</div>
			</div>
			<div className="h-[64px] md:h-[64px]" />
		</>
	)
}
