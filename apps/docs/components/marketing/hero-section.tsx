import { Button } from '@/components/common/button'
import { Demo } from '@/components/marketing/demo'
import { ArrowRightIcon } from '@heroicons/react/20/solid'
import Link from 'next/link'

export function HeroSection() {
	return (
		<section className="max-w-screen-xl w-full mx-auto md:px-5 flex flex-col items-center py-8 sm:py-16">
			<div className="relative max-w-[100%] lg:max-w-[80%]">
				<h1 className="hidden sm:block relative text-center font-black text-black dark:text-white text-balance leading-tight text-4xl md:text-5xl md:leading-tight px-[8px] pt-12 pb-6">
					Build whiteboards in React with the tldraw <span className="whitespace-nowrap">SDK</span>
				</h1>
				<h1 className="block text-center text-balance sm:hidden relative font-black text-black dark:text-white text-center text-4xl leading-tight px-[8px] pt-12 pb-6">
					Build whiteboards in React with the <br />
					<span className="whitespace-nowrap">tldraw SDK</span>
				</h1>
				{/* <Underline
					className={cn(
						'pointer-events-none text-blue-500 absolute',
						'w-64 right-2 top-8',
						'sm:w-80 sm:left-auto sm:right-2 sm:top-9',
						'md:w-[26rem] md:right-4 md:top-12'
					)}
				/> */}
			</div>
			{/* <div className="mt-5 sm:mt-8 flex items-center gap-3">
                <ul className="flex">
                    {avatars.map((avatar, index) => (
                        <li
                            key={index}
                            className="relative size-8 sm:size-10 border-2 border-white dark:border-zinc-950 rounded-full overflow-hidden -ml-2 first-of-type:ml-0"
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
                    Loved by <span className="text-black dark:text-white font-semibold">5000+</span>{' '}
                    developers and users.
                </div>
            </div> */}
			<p className="mt-0 sm:mt-5 px-5 text-center text-zinc-800 dark:text-zinc-200 sm:text-lg w-full text-balance w-[90%]">
				Have an idea for an infinite canvas? The tldraw SDK has everything you need to build instant
				real-time collaborative whiteboards and more.
			</p>
			<div className="pt-5 flex flex-row items-center sm:items-start sm:flex-row gap-x-4 gap-y-2 mt-6 sm:mt-9 flex-wrap justify-center sm:max-width-xl pb-8 sm:pb-16">
				<Button
					id="hero-quick-start"
					href="/quick-start"
					caption="Get started"
					type="black"
					size="lg"
				/>
				<Button
					id="hero-github"
					href="https://github.com/tldraw/tldraw"
					caption="GitHub"
					type="tertiary"
					size="lg"
					icon="github"
					newTab
				/>
				{/* <div className="pt-2">
                <div className="font-hand text-blue-500 text-lg">or try here</div>
                <ArrowDown className="h-14 text-blue-500 ml-auto -mt-2 -mr-6" animationDelay={1.2} />
            </div> */}
			</div>
			<Demo />
			<div className="w-full flex items-center justify-center md:justify-end text-sm font-semibold pb-4">
				<Link
					href="https://tldraw.com"
					className="flex gap-1 items-center hover:text-black transition-all duration-200"
				>
					<p>
						Try the full demo at <span className="text-blue-500">tldraw.com</span>{' '}
					</p>
					<ArrowRightIcon className="h-[16px]" />
				</Link>
			</div>
		</section>
	)
}

// const avatars = [
// 	'https://i.pravatar.cc/300?img=1',
// 	'https://i.pravatar.cc/300?img=2',
// 	'https://i.pravatar.cc/300?img=3',
// 	'https://i.pravatar.cc/300?img=4',
// 	'https://i.pravatar.cc/300?img=5',
// ]
