import Link from 'next/link'
import { Logo } from './logo'

const menus = [
	{
		heading: 'Product',
		items: [
			{ caption: 'Overview', href: '/' },
			{ caption: 'Playground', href: 'https://tldraw.com' },
			{ caption: 'Pricing', href: '/pricing' },
			{ caption: 'Terms of Use', href: '/terms' },
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
			{ caption: 'Discord', href: 'https://discord.com/invite/SBBEVCA4PG' },
			{ caption: 'GitHub', href: 'https://github.com/tldraw/tldraw' },
		],
	},
]

export const Footer = () => {
	return (
		<footer className="bg-zinc-50 py-12 md:py-16">
			<div className="w-full max-w-screen-xl mx-auto px-5 flex flex-col sm:flex-row sm:justify-between gap-12">
				<div>
					<Link href="/" className="w-28">
						<Logo className="h-6" />
					</Link>
					<p className="text-sm mt-4">&copy; tldraw {new Date().getFullYear()}</p>
				</div>
				<div className="flex gap-12 flex-wrap">
					{menus.map(({ heading, items }, index) => (
						<div key={index}>
							<h4 className="text-black uppercase text-xs font-semibold">{heading}</h4>
							<ul className="flex flex-col mt-2 gap-2 text-sm">
								{items.map(({ caption, href }, index) => (
									<li key={index}>
										<Link href={href} className="hover:text-zinc-800">
											{caption}
										</Link>
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
