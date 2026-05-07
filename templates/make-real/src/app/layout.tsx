import './styles.css'

export const metadata = {
	title: 'tldraw make real starter kit',
	description: 'Draw a wireframe and turn it into a working HTML prototype with AI.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
	return (
		<html lang="en">
			<body>{children}</body>
		</html>
	)
}
