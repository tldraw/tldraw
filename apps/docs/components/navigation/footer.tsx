import { PrivacySettingsLink } from '@/app/analytics'
import { Logo } from '@/components/common/logo'
import { TldrawLink } from '../common/tldraw-link'
import { SocialLink } from './social-link'

const menus = [
	{
		heading: 'Product',
		items: [
			{ caption: 'Whiteboard', href: '/features/out-of-the-box-whiteboard' },
			{ caption: 'Starter kits', href: '/starter-kits' },
			{ caption: 'Pricing', href: '/pricing' },
			{ caption: 'FAQ', href: '/faq' },
		],
	},
	{
		heading: 'Developers',
		items: [
			{ caption: 'Quick start guide', href: '/quick-start' },
			{ caption: 'Starter kits', href: '/starter-kits' },
			{ caption: 'Examples', href: '/examples/basic' },
			{ caption: 'Releases', href: '/releases-versioning' },
			{ caption: 'Docs', href: '/quick-start' },
		],
	},
	{
		heading: 'Community',
		items: [
			{ caption: 'GitHub', href: 'https://github.com/tldraw/tldraw' },
			{
				caption: 'Discord',
				href: 'https://discord.tldraw.com/?utm_source=docs&utm_medium=organic&utm_campaign=sociallink',
			},
			{ caption: 'X/Twitter', href: 'https://x.com/tldraw/' },
			{ caption: 'LinkedIn', href: 'https://www.linkedin.com/company/tldraw/' },
			{ caption: 'Bluesky', href: 'https://bsky.app/profile/tldraw.com' },
			{ caption: 'Mastodon', href: 'https://mas.to/@tldraw' },
		],
	},
	{
		heading: 'Company',
		items: [
			{ caption: 'Events', href: '/events' },
			{ caption: 'Careers', href: '/careers' },
			{ caption: 'License', href: '/legal/tldraw-license' },
			{ caption: 'Trademarks', href: '/legal/trademark-guidelines' },
			{ caption: 'CLA', href: '/legal/contributor-license-agreement' },
			{ caption: 'Privacy settings', href: '#', isCookieSetting: true },
		],
	},
]

export function Footer() {
	return (
		<footer className="pt-16 pb-36 bg-zinc-950 text-white">
			<div className="flex flex-col w-full max-w-screen-xl gap-12 px-5 mx-auto sm:flex-row sm:justify-between">
				<div className="flex-[2]">
					<TldrawLink href="/" className="w-28">
						<Logo className="h-6" forceWhite />
					</TldrawLink>
					<p className="mt-2 text-sm">The infinite canvas SDK</p>
					<div className="mt-4 flex gap-5">
						<SocialLink caption="GitHub" icon="github" href="https://github.com/tldraw/tldraw" />
						<SocialLink caption="X/Twitter" icon="twitter" href="https://x.com/tldraw/" />
						<SocialLink caption="Discord" icon="discord" href="https://discord.tldraw.com/" />
						<SocialLink
							caption="LinkedIn"
							icon="linkedin"
							href="https://www.linkedin.com/company/tldraw/"
						/>
					</div>
				</div>
				{menus.map(({ heading, items }, index) => (
					<div key={index} className="flex-1">
						<h4 className="font-medium text-sm text-zinc-400">{heading}</h4>
						<ul className="flex flex-col gap-4 mt-4 text-sm">
							{items.map(({ caption, href, isCookieSetting }, index) => (
								<li key={index}>
									{isCookieSetting ? (
										<PrivacySettingsLink />
									) : (
										<TldrawLink href={href}>{caption}</TldrawLink>
									)}
								</li>
							))}
						</ul>
					</div>
				))}
			</div>
			<p className="mt-8 px-5 text-xs">&copy; {new Date().getFullYear()} tldraw</p>
		</footer>
	)
}
