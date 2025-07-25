import AutoRefresh from '@/components/common/autorefresh'
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

function Wrapper({ children }: { children: React.ReactNode }) {
	if (process.env.NODE_ENV === 'development') {
		return <AutoRefresh>{children}</AutoRefresh>
	}

	return children
}

export const metadata: Metadata = {
	metadataBase: new URL('https://tldraw.dev'),
	title: {
		default: 'tldraw: Build whiteboards in React with the tldraw SDK',
		template: `%s • tldraw`,
	},
	description:
		'The tldraw SDK provides tools, services, and APIs to build beautiful whiteboards and infinite canvas applications with real-time collaboration and a powerful React-based canvas.',
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
		<Wrapper>
			<html
				lang="en"
				className={cn(GeistSans.variable, ShantellSans.variable, 'font-sans antialiased')}
			>
				<body className="overflow-x-hidden bg-white text-zinc-800 dark:bg-zinc-950 dark:text-zinc-300">
					<ThemeProvider attribute="class" defaultTheme="light" enableSystem={false}>
						<Header />
						{children}
						<Footer />
						<Analytics />
					</ThemeProvider>
				</body>
			</html>
		</Wrapper>
	)
}
