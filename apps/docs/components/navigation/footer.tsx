import { PrivacySettingsLink } from '@/app/analytics'
import { Logo } from '@/components/common/logo'
import Link from 'next/link'

const menus = [
	{
		heading: 'Company',
		items: [{ caption: 'Jobs', href: '/jobs' }],
	},
	{
		heading: 'Product',
		items: [
			{ caption: 'Overview', href: '/' },
			{ caption: 'Playground', href: 'https://tldraw.com' },
			{ caption: 'Features', href: '/#features' },
			{ caption: 'Pricing', href: '/#pricing' },
			{ caption: 'FAQ', href: '/#faq' },
		],
	},
	{
		heading: 'Documentation',
		items: [
			{ caption: 'Learn', href: '/quick-start' },
			{ caption: 'Reference', href: '/reference/editor/Editor' },
			{ caption: 'Examples', href: '/examples/basic/basic' },
		],
	},
	{
		heading: 'Community',
		items: [
			{ caption: 'Blog', href: '/blog' },
			{ caption: 'X/Twitter', href: 'https://x.com/tldraw/' },
			{
				caption: 'Discord',
				href: 'https://discord.tldraw.com/?utm_source=docs&utm_medium=organic&utm_campaign=sociallink',
			},
			{ caption: 'GitHub', href: 'https://github.com/tldraw/tldraw' },
			{ caption: 'Bluesky', href: 'https://bsky.app/profile/tldraw.com' },
			{ caption: 'Mastodon', href: 'https://mas.to/@tldraw' },
		],
	},
	{
		heading: 'Legal',
		items: [
			{ caption: 'License', href: '/legal/tldraw-license' },
			{ caption: 'Trademarks', href: '/legal/trademarks' },
			{ caption: 'CLA', href: '/legal/cla' },
			{ caption: 'Privacy settings', href: '#', isCookieSetting: true },
		],
	},
]

export function Footer() {
	return (
		<footer className="py-12 bg-zinc-50 dark:bg-zinc-900 md:py-16">
			<div className="flex flex-col w-full max-w-screen-xl gap-12 px-5 mx-auto sm:flex-row sm:justify-between">
				<div>
					<Link href="/" className="w-28">
						<Logo className="h-6" />
					</Link>
					<p className="mt-4 text-sm">&copy; tldraw {new Date().getFullYear()}</p>
				</div>
				<div className="flex flex-wrap gap-12">
					{menus.map(({ heading, items }, index) => (
						<div key={index}>
							<h4 className="text-xs font-semibold text-black uppercase dark:text-white">
								{heading}
							</h4>
							<ul className="flex flex-col gap-2 mt-2 text-sm">
								{items.map(({ caption, href, isCookieSetting }, index) => (
									<li key={index}>
										{isCookieSetting ? (
											<PrivacySettingsLink />
										) : (
											<Link href={href} className="hover:text-zinc-800 dark:hover:text-zinc-200">
												{caption}
											</Link>
										)}
									</li>
								))}
							</ul>
						</div>
					))}
				</div>
			</div>
		</footer>
	)
}
