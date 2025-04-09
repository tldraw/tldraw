import { ArrowRightIcon } from '@heroicons/react/24/solid'
import Link from 'next/link'
import { HeroCtas } from './hero-ctas'
import { LogoSection } from './logo-section'

export function HeroSection() {
	return (
		<>
			<div className="max-w-screen-xl w-full mx-auto md:px-5 flex flex-col items-center text-center ">
				<div className="relative max-w-[100%] lg:max-w-[80%]">
					<Link
						className="px-4 py-2 bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 rounded-full text-sm font-semibold"
						href="/blog/announcements/announcing-tldraw-series-a"
					>
						tldraw announces its $10M Series A.{' '}
						<ArrowRightIcon className="relative bottom-[1px] h-[12px] inline-block" />
					</Link>
					<div className="h-20" />
					<h1 className="w-full font-black text-black dark:text-white text-balance leading-tight text-4xl md:text-5xl px-4">
						Incredible things are happening on the canvas
					</h1>
					<div className="h-8" />
					<LogoSection />
					<div className="h-20" />
					<HeroCtas />
				</div>
			</div>
			<div className="h-[64px] md:h-[64px]" />
		</>
	)
}
