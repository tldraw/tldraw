import { Metadata } from 'next'
import { DocsSearchBar } from '@/components/docs/docs-search-bar'

export const metadata: Metadata = {
	metadataBase: new URL('https://tldraw.dev'),
	title: {
		default: 'Docs',
		template: `%s • tldraw Docs`,
	},
	description: 'Documentation for the tldraw SDK.',
}

export default async function Layout({ children }: { children: React.ReactNode }) {
	return (
		<>
			<DocsSearchBar />
			{children}
		</>
	)
}
