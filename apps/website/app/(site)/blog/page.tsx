import { BlogCard } from '@/components/sections/blog-card'
import { CategoryNav } from '@/components/ui/category-nav'
import { PageHeader } from '@/components/ui/page-header'
import { db } from '@/utils/ContentDatabase'
import { getBlogCategories, toBlogPostSummary } from '@/utils/collections'
import type { Metadata } from 'next'

export const metadata: Metadata = {
	title: 'Blog',
	description: 'News, updates, and stories from the tldraw team.',
}

export default async function BlogPage() {
	const [pages, categories] = await Promise.all([db.getPagesBySection('blog'), getBlogCategories()])

	const posts = pages.map(toBlogPostSummary)

	return (
		<>
			<PageHeader title="Blog" description="News, updates, and stories from the tldraw team." />
			<div className="max-w-content mx-auto px-4 py-12 sm:px-6 lg:px-8">
				{categories.length > 0 && (
					<CategoryNav
						categories={categories.map((c) => ({
							_id: c.id,
							title: c.title,
							slug: { current: c.slug },
						}))}
					/>
				)}
				{posts.length > 0 ? (
					<div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
						{posts.map((post) => (
							<BlogCard key={post.id} post={post} />
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
