import './globals.css'

export const metadata = {
	title: 'tldraw Next.js app template',
	description: 'An example of how to use tldraw in a Next.js app',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
	return (
		<html lang="en">
			<body>{children}</body>
		</html>
	)
}
