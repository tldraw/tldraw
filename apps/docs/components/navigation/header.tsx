'use client'

import { type IconName } from '@/components/common/icon'
import { Logo } from '@/components/common/logo'
import { NavigationLink } from '@/components/navigation/link'
import { MobileMenu } from '@/components/navigation/mobile-menu'
import { SocialLink } from '@/components/navigation/social-link'
import { SearchButton } from '@/components/search/button'
import { motion, useScroll, useTransform } from 'framer-motion'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Suspense } from 'react'

const mainLinks = [
	{
		caption: 'Product',
		active: (pathname: string) => pathname === '/',
		children: [
			{ caption: 'Features', href: '/#features' },
			{ caption: 'Pricing', href: '/#pricing' },
			{ caption: 'FAQ', href: '/#faq' },
		],
	},
	{
		caption: 'Docs',
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
	const opacityEffect = !pathname.startsWith('/blog')

	return (
		<header className="fixed top-0 w-full bg-white z-10">
			<nav className="w-full max-w-screen-xl mx-auto px-5 h-14 md:h-[4.5rem] flex justify-between items-center text-zinc-800 border-b border-zinc-100 md:border-transparent">
				<Link href="/" className="w-28">
					<Logo className="h-6" />
				</Link>
				<ul className="hidden sm:flex md:hidden gap-8">
					{mainLinks.map((item, index) => (
						<li key={index}>
							<NavigationLink {...item} active={item.active(pathname)} />
						</li>
					))}
				</ul>
				<motion.ul
					style={{ opacity: opacityEffect ? navOpacity : 1 }}
					className="hidden md:flex gap-8"
				>
					{mainLinks.map((item, index) => (
						<li key={index}>
							<NavigationLink {...item} active={item.active(pathname)} />
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
				<div className="flex items-center sm:hidden -mr-2">
					<SearchButton type="docs" layout="mobile" />
					<Suspense>
						<MobileMenu main={mainLinks} social={socialLinks} />
					</Suspense>
				</div>
			</nav>
		</header>
	)
}
