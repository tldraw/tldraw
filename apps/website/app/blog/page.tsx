import { BlogCard } from '@/components/sections/blog-card'
import { PageHeader } from '@/components/ui/page-header'
import { getBlogCategories, getBlogPosts } from '@/sanity/queries'
import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
	title: 'Blog',
	description: 'News, updates, and stories from the tldraw team.',
}

export default async function BlogPage() {
	const [posts, categories] = await Promise.all([getBlogPosts(), getBlogCategories()])

	return (
		<>
			<PageHeader title="Blog" description="News, updates, and stories from the tldraw team." />
			<div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
				{categories?.length > 0 && (
					<nav className="mb-8 flex flex-wrap gap-2">
						<Link
							href="/blog"
							className="rounded-full bg-zinc-900 px-4 py-1.5 text-sm font-medium text-white dark:bg-white dark:text-zinc-900"
						>
							All
						</Link>
						{categories.map((cat) => (
							<Link
								key={cat._id}
								href={`/blog/${cat.slug.current}`}
								className="rounded-full border border-zinc-200 px-4 py-1.5 text-sm font-medium text-zinc-600 transition-colors hover:border-zinc-300 hover:text-zinc-900 dark:border-zinc-700 dark:text-zinc-400 dark:hover:border-zinc-600 dark:hover:text-white"
							>
								{cat.title}
							</Link>
						))}
					</nav>
				)}
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
