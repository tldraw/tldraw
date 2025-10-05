import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
	title: 'tldraw - Infinite Canvas',
	description: 'A tldraw app optimized for v0.dev development environment',
}

export default function RootLayout({
	children,
}: {
	children: React.ReactNode
}) {
	return (
		<html lang="en">
			<body>{children}</body>
		</html>
	)
}
