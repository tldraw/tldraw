'use client'

import { type IconName } from '@/components/icon'
import { Logo } from '@/components/logo'
import { NavigationLink } from '@/components/navigation/link'
import { MobileMenu } from '@/components/navigation/mobile-menu'
import { SocialLink } from '@/components/navigation/social-link'
import { motion, useScroll, useTransform } from 'framer-motion'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

const mainLinks = [
	{
		caption: 'Documentation',
		href: '/quick-start',
		active: (pathname: string) =>
			[
				'/quick-start',
				'/installation',
				'/releases',
				'/docs',
				'/community',
				'/reference',
				'/examples',
			].some((e) => pathname.startsWith(e)),
	},
	{
		caption: 'Blog',
		href: '/blog',
		active: (pathname: string) => pathname.startsWith('/blog'),
	},
	{ caption: 'Pricing', href: '/pricing', active: (pathname: string) => pathname === '/pricing' },
]

const socialLinks = [
	{
		caption: 'Twitter',
		icon: 'twitter' as IconName,
		href: 'https://x.com/tldraw/',
	},
	{
		caption: 'Discord',
		icon: 'discord' as IconName,
		href: 'https://discord.com/invite/SBBEVCA4PG',
	},
	{
		caption: 'GitHub',
		icon: 'github' as IconName,
		href: 'https://github.com/tldraw/tldraw',
	},
]

export const Header = () => {
	const pathname = usePathname()
	const { scrollY } = useScroll()
	const navOpacity = useTransform(scrollY, [0, 32], [1, 0])

	return (
		<header className="sticky top-0 bg-white/90 backdrop-blur z-10">
			<nav className="border w-full max-w-screen-xl mx-auto px-5 h-14 sm:h-[4.5rem] flex justify-between items-center text-zinc-800 border-b border-zinc-100 sm:border-transparent">
				<Link href="/" className="w-28">
					<Logo className="h-6" />
				</Link>
				<motion.ul style={{ opacity: navOpacity }} className="hidden sm:flex gap-8">
					{mainLinks.map((item, index) => (
						<li key={index}>
							<NavigationLink {...item} pathname={pathname} />
						</li>
					))}
				</motion.ul>
				<ul className="hidden sm:flex w-28 gap-4 justify-end">
					{socialLinks.map((item, index) => (
						<li key={index}>
							<SocialLink {...item} />
						</li>
					))}
				</ul>
				<div className="flex items-center gap-4 sm:hidden -mr-2">
					<MobileMenu main={mainLinks} social={socialLinks} pathname={pathname} />
				</div>
			</nav>
		</header>
	)
}
