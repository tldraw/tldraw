import { BlogSearchBar } from '@/components/blog/blog-search-bar'
import { Metadata } from 'next'

export const metadata: Metadata = {
	metadataBase: new URL('https://tldraw.dev'),
	title: {
		default: 'Blog',
		template: `%s • tldraw Blog`,
	},
	description: 'The latest news from the team on the tldraw blog.',
}

export default async function Layout({ children }: { children: React.ReactNode }) {
	return (
		<>
			<BlogSearchBar />
			{children}
		</>
	)
}
