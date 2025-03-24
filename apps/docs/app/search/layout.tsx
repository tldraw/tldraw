import { Metadata } from 'next'

export const metadata: Metadata = {
	metadataBase: new URL('https://tldraw.dev'),
	title: {
		default: 'Search',
		template: `%s • tldraw SDK`,
	},
	description: 'Documentation for the tldraw SDK.',
}

export default async function Layout({ children }: { children: React.ReactNode }) {
	return children
}
