import { Head, Html, Main, NextScript } from 'next/document'

const TITLE = 'tldraw'
const DESCRIPTION =
	'Developer documentation for tldraw. Build infinite canvas experiences for the web.'
const URL = 'https://tldraw.dev'
const TWITTER_HANDLE = '@tldraw'
const TWITTER_CARD = 'social-twitter.png'
const FACEBOOK_CARD = 'social-og.png'
const THEME_COLOR = '#FFFFFF'
const THEME_ACCENT = '#FFFFFF'

export default function Document() {
	return (
		<Html lang="en">
			<Head>
				<meta name="application-name" content={TITLE} />
				<meta name="apple-mobile-web-app-capable" content="yes" />
				<meta name="apple-mobile-web-app-status-bar-style" content="default" />
				<meta name="apple-mobile-web-app-title" content={TITLE} />
				<meta name="description" content={DESCRIPTION} />
				<meta name="format-detection" content="telephone=no" />
				<meta name="mobile-web-app-capable" content="yes" />
				<meta name="msapplication-config" content="browserconfig.xml" />
				<meta name="msapplication-TileColor" content={THEME_ACCENT} />
				<meta name="msapplication-tap-highlight" content="no" />
				<meta name="theme-color" content={THEME_COLOR} />

				<link rel="apple-touch-icon" href="touch-icon-iphone.png" />
				<link rel="apple-touch-icon" sizes="152x152" href="apple-touch-icon-152x152.png" />
				<link rel="apple-touch-icon" sizes="180x180" href="apple-touch-icon-180x180.png" />
				<link rel="apple-touch-icon" sizes="167x167" href="apple-touch-icon-167x167.png" />

				<link rel="icon" type="image/png" sizes="32x32" href="favicon-32x32.png" />
				<link rel="icon" type="image/png" sizes="16x16" href="favicon-16x16.png" />
				<link rel="mask-icon" href="safari-pinned-tab.svg" color={THEME_COLOR} />
				<link rel="shortcut icon" href="/favicon.svg" />

				<link rel="manifest" href="/manifest.json" />

				{/* Twitter */}
				<meta name="twitter:card" content="summary" />
				<meta name="twitter:url" content={URL} />
				<meta name="twitter:title" content={TITLE} />
				<meta name="twitter:description" content={DESCRIPTION} />
				<meta name="twitter:image" content={`${URL}/${TWITTER_CARD}`} />
				<meta name="twitter:creator" content={TWITTER_HANDLE} />

				{/* Facebook */}
				<meta property="og:type" content="website" />
				<meta property="og:title" content={TITLE} />
				<meta property="og:description" content={DESCRIPTION} />
				<meta property="og:site_name" content={TITLE} />
				<meta property="og:url" content={URL} />
				<meta property="og:image" content={`${URL}/${FACEBOOK_CARD}`} />
			</Head>
			<body>
				<Main />
				<NextScript />
			</body>
		</Html>
	)
}
