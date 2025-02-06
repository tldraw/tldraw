import { Footer } from '@/components/navigation/footer'
import { Header } from '@/components/navigation/header'
import { cn } from '@/utils/cn'
import { GeistSans } from 'geist/font/sans'
import { Metadata, Viewport } from 'next'
import { ThemeProvider } from 'next-themes'
import localFont from 'next/font/local'
import Analytics from './analytics'
import './github-dark.css'
import './github-light.css'
import './globals.css'

export const metadata: Metadata = {
	metadataBase: new URL('https://tldraw.dev'),
	title: {
		default: 'The infinite canvas SDK • tldraw',
		template: `%s • tldraw`,
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

const ShantellSans = localFont({
	src: './shantell-sans.woff2',
	weight: '400',
	display: 'swap',
	variable: '--font-shantell-sans',
})

export default async function Layout({ children }: { children: React.ReactNode }) {
	return (
		<html
			lang="en"
			className={cn(GeistSans.variable, ShantellSans.variable, 'font-sans antialiased')}
		>
			<body className="pt-14 md:pt-[4.5rem] overflow-x-hidden bg-white text-zinc-600 dark:bg-zinc-950 dark:text-zinc-400">
				<ThemeProvider attribute="class" defaultTheme="light" enableSystem={false}>
					<Header />
					{children}
					<Footer />
					<Analytics />
				</ThemeProvider>
			</body>
		</html>
	)
}
