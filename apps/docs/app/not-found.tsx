/* eslint-disable react/no-unescaped-entities */
'use client'

import { DiscordIcon } from '@/components/common/icon/discord'
import { DocsSearchBar } from '@/components/docs/docs-search-bar'
import { NavigationLink } from '@/components/navigation/link'
import Handwritten404 from '@/public/images/404.svg'
import { RocketLaunchIcon } from '@heroicons/react/16/solid'
import { AcademicCapIcon, BookOpenIcon, NewspaperIcon, PlayIcon } from '@heroicons/react/20/solid'
import Image from 'next/image'
import Link from 'next/link'

const links = [
	{
		caption: 'Quick Start',
		icon: RocketLaunchIcon,
		href: '/quick-start',
	},
	{
		caption: 'Guides',
		icon: AcademicCapIcon,
		href: '/editor',
	},
	{
		caption: 'Reference',
		icon: BookOpenIcon,
		href: '/reference/editor/Editor',
	},
	{
		caption: 'Examples',
		icon: PlayIcon,
		href: '/examples',
	},
	{
		caption: 'Blog',
		icon: NewspaperIcon,
		href: '/blog',
	},
]

export default function NotFound() {
	return (
		<div className="min-h-screen">
			<DocsSearchBar />
			<section className="flex flex-col items-center justify-center py-16 md:py-32 px-5">
				<Image src={Handwritten404} alt="404 - Page not found" className="w-64" />
				<h1 className="font-hand text-black dark:text-white text-2xl">page not found :(</h1>
				<p className="mt-8 max-w-md text-center text-balance">
					There's nothing here. You may want to look at these pages to find what you're looking for:
				</p>
				<ul className="mt-8 flex flex-wrap justify-center gap-8">
					{links.map((item, index) => (
						<li key={index}>
							<NavigationLink {...item} active={false} />
						</li>
					))}
				</ul>
				<p className="mt-32 max-w-md text-center text-balance text-sm">
					You can always ask for help in our welcoming community on{' '}
					<Link
						href="https://discord.tldraw.com/?utm_source=docs&utm_medium=organic&utm_campaign=sociallink"
						className="text-blue-500 hover:text-blue-600 dark:hover:text-blue-400"
					>
						<DiscordIcon className="h-3.5 mb-0.5 ml-0.5 inline" />
						<span> Discord</span>
					</Link>
					.
				</p>
			</section>
		</div>
	)
}
