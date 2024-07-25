import { cn } from '@/utils/cn'
import Image from 'next/image'
import { Button } from '../common/button'
import { ArrowDown } from './arrow-down'
import { Underline } from './underline'

const avatars = [
	'https://i.pravatar.cc/300?img=1',
	'https://i.pravatar.cc/300?img=2',
	'https://i.pravatar.cc/300?img=3',
	'https://i.pravatar.cc/300?img=4',
	'https://i.pravatar.cc/300?img=5',
]

export const HeroSection = () => {
	return (
		<section className="w-full max-w-screen-xl mx-auto md:px-5 flex flex-col items-center pt-8 sm:pt-16">
			<div className="relative">
				<h1 className="relative font-black text-black text-center text-3xl max-w-xs leading-tight sm:text-4xl sm:max-w-xl sm:leading-tight md:text-5xl md:max-w-3xl md:leading-tight">
					A Very Good Whiteboard SDK for React Developers
				</h1>
				<Underline
					className={cn(
						'pointer-events-none text-blue-500 absolute',
						'w-64 left-2 top-[4.1rem]',
						'sm:w-80 sm:left-auto sm:right-2 sm:top-8',
						'md:w-[26rem] md:right-4 md:top-11'
					)}
				/>
			</div>
			<div className="mt-5 sm:mt-8 flex items-center gap-3">
				<ul className="flex">
					{avatars.map((avatar, index) => (
						<li
							key={index}
							className="relative size-8 sm:size-10 border-2 border-white rounded-full overflow-hidden -ml-2 first-of-type:ml-0"
						>
							<Image
								src={avatar}
								alt={`Tldraw user ${index}`}
								fill
								className="object-cover object-center"
							/>
						</li>
					))}
				</ul>
				<div className="max-w-32 leading-tight text-xs sm:max-w-40 sm:text-sm sm:leading-tight">
					Loved by <span className="text-black font-semibold">5000+</span> developers and users.
				</div>
			</div>
			<p className="mt-5 sm:mt-8 px-5 text-center max-w-md text-zinc-800 sm:text-lg sm:max-w-lg">
				Tldraw is an open source, multiplayer-ready toolkit with easy-to-use APIs for control and
				customization.
			</p>
			<div className="flex flex-col items-center sm:flex-row gap-x-4 gap-y-2 mt-6 sm:mt-9">
				<Button href="/quick-start" caption="Get started" type="black" size="lg" />
				<div className="pt-2">
					<div className="font-hand text-blue-500 text-lg">or try here</div>
					<ArrowDown className="h-14 text-blue-500 ml-auto -mt-2 -mr-6" animationDelay={1} />
				</div>
			</div>
			<div className="w-full bg-blue-500 py-1 md:rounded-2xl -mx-5 md:-mx-1 md:px-1 mt-1">
				<div className="md:rounded-xl overflow-hidden shadow bg-white">
					<iframe
						className="iframe"
						src="https://examples.tldraw.com/develop"
						width="100%"
						height={600}
					/>
				</div>
			</div>
		</section>
	)
}
