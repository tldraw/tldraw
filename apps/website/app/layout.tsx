import { cn } from '@/lib/utils'
import { GeistSans } from 'geist/font/sans'
import { Metadata, Viewport } from 'next'
import './globals.css'

export const metadata: Metadata = {
	metadataBase: new URL('https://tldraw.dev'),
	title: {
		default: 'tldraw: The infinite canvas SDK for React',
		template: `%s • tldraw`,
	},
	description:
		'Build whiteboards, design tools, and infinite canvas applications with the tldraw SDK. Real-time collaboration, powerful React-based canvas, and a complete set of tools.',
	twitter: {
		creator: '@tldraw',
	},
	applicationName: 'tldraw',
	icons: [
		{ rel: 'shortcut icon', url: '/favicon.svg' },
		{ rel: 'icon', url: '/favicon-32x32.svg', sizes: '32x32' },
		{ rel: 'icon', url: '/favicon-16x16.svg', sizes: '16x16' },
		{ rel: 'apple-touch-icon', url: '/apple-touch-icon.png' },
	],
}

export const viewport: Viewport = {
	initialScale: 1,
	maximumScale: 1,
	width: 'device-width',
	themeColor: '#ffffff',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
	return (
		<html lang="en" className={cn(GeistSans.variable, 'font-sans antialiased')}>
			<body className="overflow-x-hidden bg-white text-zinc-800 dark:bg-zinc-950 dark:text-zinc-300">
				{children}
			</body>
		</html>
	)
}
