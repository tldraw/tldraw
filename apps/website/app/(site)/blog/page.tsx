import { BlogCard } from '@/components/sections/blog-card'
import { CategoryNav } from '@/components/ui/category-nav'
import { PageHeader } from '@/components/ui/page-header'
import { getBlogCategories, getBlogPosts } from '@/sanity/queries'
import type { Metadata } from 'next'

export const metadata: Metadata = {
	title: 'Blog',
	description: 'News, updates, and stories from the tldraw team.',
}

export default async function BlogPage() {
	const [posts, categories] = await Promise.all([getBlogPosts(), getBlogCategories()])

	return (
		<>
			<PageHeader title="Blog" description="News, updates, and stories from the tldraw team." />
			<div className="mx-auto max-w-content px-4 py-12 sm:px-6 lg:px-8">
				{categories?.length > 0 && <CategoryNav categories={categories} />}
				{posts?.length > 0 ? (
					<div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
						{posts.map((post) => (
							<BlogCard key={post._id} post={post} />
						))}
					</div>
				) : (
					<p className="text-center text-zinc-500 dark:text-zinc-400">
						No blog posts yet. Check back soon.
					</p>
				)}
			</div>
		</>
	)
}
