import { BlogSearchBar } from '@/components/blog/blog-search-bar'

export default async function Layout({ children }: { children: React.ReactNode }) {
	return (
		<>
			<BlogSearchBar />
			{children}
		</>
	)
}
