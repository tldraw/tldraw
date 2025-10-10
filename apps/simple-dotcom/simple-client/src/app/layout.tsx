import { ThemeProvider } from '@/components/theme-provider'
import { Toaster } from '@/components/ui/sonner'
import { TooltipProvider } from '@/components/ui/tooltip'
import { SessionProvider } from '@/lib/session-provider'
import type { Metadata } from 'next'
import { Geist_Mono, Inter } from 'next/font/google'
import './globals.css'
import { QueryProvider } from './providers'

const interSans = Inter({
	variable: '--font-inter-sans',
	subsets: ['latin'],
})

const geistMono = Geist_Mono({
	variable: '--font-geist-mono',
	subsets: ['latin'],
})

export const metadata: Metadata = {
	title: 'Simple tldraw',
	description: 'Collaborative whiteboard with infinite canvas',
}

export default function RootLayout({
	children,
}: Readonly<{
	children: React.ReactNode
}>) {
	return (
		<html lang="en" suppressHydrationWarning>
			<body className={`${interSans.variable} ${geistMono.variable} antialiased`}>
				<ThemeProvider
					attribute="class"
					defaultTheme="system"
					enableSystem
					disableTransitionOnChange
				>
					<QueryProvider>
						<SessionProvider>
							<TooltipProvider delayDuration={500}>{children}</TooltipProvider>
						</SessionProvider>
					</QueryProvider>
					<Toaster />
				</ThemeProvider>
			</body>
		</html>
	)
}
