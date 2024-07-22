import { Footer } from '@/components/footer'
import { Header } from '@/components/header'
import { cn } from '@/utils/cn'
import { Analytics } from '@vercel/analytics/react'
import { GeistMono } from 'geist/font/mono'
import { GeistSans } from 'geist/font/sans'
import { Metadata, Viewport } from 'next'
import './github-dark.css'
import './github-light.css'
import './globals.css'

export const metadata: Metadata = {
	metadataBase: new URL('https://tldraw.dev'),
	title: {
		default: 'tldraw SDK',
		template: `%s • tldraw SDK`,
	},
	description:
		'Infinite canvas SDK from tldraw. Build whiteboards, design tools, and canvas experiences for the web.',
	twitter: {
		creator: '@tldraw',
	},
	applicationName: 'tldraw SDK',
	appleWebApp: {
		capable: true,
		title: 'tldraw SDK',
		statusBarStyle: 'black',
	},
	icons: [
		{ rel: 'shortcut icon', url: '/favicon.svg' },
		{ rel: 'icon', url: '/favicon-32x32.svg', sizes: '32x32' },
		{ rel: 'icon', url: '/favicon-16x16.svg', sizes: '16x16' },
		{ rel: 'apple-touch-icon', url: '/apple-touch-icon.png' },
		{ rel: 'apple-touch-icon', url: '/apple-touch-icon-152x152.svg', sizes: '152x152' },
		{ rel: 'apple-touch-icon', url: '/apple-touch-icon-180x180.svg', sizes: '180x180' },
		{ rel: 'apple-touch-icon', url: '/apple-touch-icon-167x167.svg', sizes: '167x167' },
	],
}

export const viewport: Viewport = {
	initialScale: 1,
	maximumScale: 1,
	width: 'device-width',
	height: 'device-height',
	themeColor: '#ffffff',
}

export default async function Layout({ children }: { children: React.ReactNode }) {
	return (
		<html
			lang="en"
			className={cn(
				GeistSans.variable,
				GeistMono.variable,
				'font-sans bg-white antialiased text-zinc-600'
			)}
		>
			<body className="pt-14 md:pt-[4.5rem]">
				<Header />
				{children}
				<Footer />
				<Analytics />
			</body>
		</html>
	)
}
