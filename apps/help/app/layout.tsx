import { Header } from '@/components/header'
import { GeistSans } from 'geist/font/sans'
import type { Metadata } from 'next'
import { ThemeProvider } from 'next-themes'
import localFont from 'next/font/local'
import './globals.css'

const ShantellSans = localFont({
	src: './shantell-sans.woff2',
	weight: '400',
	display: 'swap',
	variable: '--font-shantell-sans',
})

export const metadata: Metadata = {
	title: {
		default: 'tldraw help',
		template: '%s • tldraw help',
	},
	description: 'How-to guides and tips for using tldraw.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
	return (
		<html
			lang="en"
			className={`${GeistSans.variable} ${ShantellSans.variable} font-sans antialiased`}
			suppressHydrationWarning
		>
			<body className="overflow-x-hidden bg-white text-zinc-800 dark:bg-zinc-950 dark:text-zinc-300">
				<ThemeProvider attribute="class" defaultTheme="light" enableSystem={false}>
					<Header />
					{children}
				</ThemeProvider>
			</body>
		</html>
	)
}
