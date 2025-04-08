import { HeroCtas } from './hero-ctas'
import { LogoSection } from './logo-section'

export function HeroSection() {
	return (
		<>
			<div className="max-w-screen-xl w-full mx-auto md:px-5 flex flex-col items-center text-center ">
				<div className="relative max-w-[100%] lg:max-w-[80%]">
					<h1 className="w-full font-black text-black dark:text-white text-balance leading-tight text-4xl md:text-5xl px-4">
						Incredible things are happening on the canvas
					</h1>
					<div className="h-12" />
					<LogoSection />
					<div className="h-20" />
					<HeroCtas />
				</div>
			</div>
			<div className="h-[64px] md:h-[64px]" />
		</>
	)
}
