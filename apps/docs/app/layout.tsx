import { Analytics } from '@vercel/analytics/react'
import { Metadata, Viewport } from 'next'
import AutoRefresh from '../components/AutoRefresh'
import '../styles/globals.css'
import '../styles/hljs.css'
import '../styles/parameters-table.css'
import { Providers } from './providers'

const TITLE = 'tldraw SDK'
const DESCRIPTION =
	'Infinite canvas SDK from tldraw. Build whiteboards, design tools, and canvas experiences for the web.'
const TWITTER_HANDLE = '@tldraw'
const TWITTER_CARD = 'social-twitter.png'
const FACEBOOK_CARD = 'social-og.png'
const THEME_COLOR = '#FFFFFF'

export const metadata: Metadata = {
	metadataBase: new URL('https://tldraw.dev'),
	title: {
		default: TITLE,
		template: `%s • ${TITLE}`,
	},
	description: DESCRIPTION,
	openGraph: {
		title: TITLE,
		description: DESCRIPTION,
		siteName: TITLE,
		type: 'website',
		url: 'https://tldraw.dev',
		images: FACEBOOK_CARD,
	},
	twitter: {
		creator: TWITTER_HANDLE,
		description: DESCRIPTION,
		card: 'summary_large_image',
		images: TWITTER_CARD,
	},
	applicationName: TITLE,
	appleWebApp: {
		capable: true,
		title: TITLE,
		statusBarStyle: 'black',
	},
	formatDetection: {
		telephone: false,
	},
	icons: [
		{ rel: 'shortcut icon', url: '/favicon.svg' },
		{ rel: 'icon', url: 'favicon-32x32.svg', sizes: '32x32' },
		{ rel: 'icon', url: 'favicon-16x16.svg', sizes: '16x16' },
		{ rel: 'apple-touch-icon', url: 'apple-touch-icon.png' },
		{ rel: 'apple-touch-icon', url: 'apple-touch-icon-152x152.svg', sizes: '152x152' },
		{ rel: 'apple-touch-icon', url: 'apple-touch-icon-180x180.svg', sizes: '180x180' },
		{ rel: 'apple-touch-icon', url: 'apple-touch-icon-167x167.svg', sizes: '167x167' },
	],
}

export const viewport: Viewport = {
	initialScale: 1,
	maximumScale: 1,
	width: 'device-width',
	height: 'device-height',
	themeColor: THEME_COLOR,
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
	return (
		<AutoRefresh>
			<html suppressHydrationWarning>
				<body>
					<Providers>
						{children}
						<Analytics />
					</Providers>
				</body>
			</html>
		</AutoRefresh>
	)
}
