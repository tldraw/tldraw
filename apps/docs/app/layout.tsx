import { Footer } from '@/components/Footer'
import { Metadata, Viewport } from 'next'
import AutoRefresh from '../components/AutoRefresh'
import '../styles/globals.css'
import '../styles/hljs.css'
import '../styles/parameters-table.css'
import { Providers } from './providers'

const TITLE = 'tldraw docs'
const DESCRIPTION =
	'Developer documentation for tldraw. Build infinite canvas experiences for the web.'
const TWITTER_HANDLE = '@tldraw'
const TWITTER_CARD = 'social-twitter.png'
const FACEBOOK_CARD = 'social-og.png'
const THEME_COLOR = '#FFFFFF'

export const metadata: Metadata = {
	metadataBase: new URL('https://www.tldraw.dev'),
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
		{ rel: 'mask-icon', url: 'safari-pinned-tab.svg', color: THEME_COLOR },
		{ rel: 'shortcut icon', url: '/favicon.svg' },
		{ rel: 'icon', url: 'favicon-32x32.png', sizes: '32x32' },
		{ rel: 'icon', url: 'favicon-16x16.png', sizes: '16x16' },
		{ rel: 'apple-touch-icon', url: 'touch-icon-iphone.png' },
		{ rel: 'apple-touch-icon', url: 'apple-touch-icon-152x152.png', sizes: '152x152' },
		{ rel: 'apple-touch-icon', url: 'apple-touch-icon-180x180.png', sizes: '180x180' },
		{ rel: 'apple-touch-icon', url: 'apple-touch-icon-167x167.png', sizes: '167x167' },
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
						<div className="wrapper">
							<div className="layout">{children}</div>
							<Footer />
						</div>
					</Providers>
				</body>
				<script
					async
					src="https://tag.clearbitscripts.com/v1/pk_98af4b0c7c25466da0035c32bc6789bd/tags.js"
					referrerPolicy="strict-origin-when-cross-origin"
				/>
			</html>
		</AutoRefresh>
	)
}
