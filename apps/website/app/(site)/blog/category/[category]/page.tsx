import { BlogCard } from '@/components/sections/blog-card'
import { CategoryNav } from '@/components/ui/category-nav'
import { PageHeader } from '@/components/ui/page-header'
import { db } from '@/utils/ContentDatabase'
import { getBlogCategories, toBlogPostSummary } from '@/utils/collections'
import type { Metadata } from 'next'
import { notFound } from 'next/navigation'

interface CategoryPageProps {
	params: Promise<{ category: string }>
}

export async function generateMetadata({ params }: CategoryPageProps): Promise<Metadata> {
	const { category } = await params
	const categories = await getBlogCategories()
	const cat = categories.find((c) => c.slug === category)
	if (!cat) return {}
	return {
		title: `${cat.title} - Blog`,
		description: `Blog posts about ${cat.title}.`,
	}
}

export async function generateStaticParams() {
	const categories = await getBlogCategories()
	return categories.map((cat) => ({ category: cat.slug }))
}

export default async function BlogCategoryPage({ params }: CategoryPageProps) {
	const { category } = await params
	const [allPages, categories] = await Promise.all([
		db.getPagesBySection('blog'),
		getBlogCategories(),
	])

	const currentCategory = categories.find((c) => c.slug === category)
	if (!currentCategory) notFound()

	// Filter posts by category
	const posts = allPages.map(toBlogPostSummary).filter((p) => p.category?.slug === category)

	return (
		<>
			<PageHeader title={currentCategory.title} />
			<div className="max-w-content mx-auto px-4 py-12 sm:px-6 lg:px-8">
				<CategoryNav
					categories={categories.map((c) => ({
						_id: c.id,
						title: c.title,
						slug: { current: c.slug },
					}))}
					activeCategory={category}
				/>
				{posts.length > 0 ? (
					<div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
						{posts.map((post) => (
							<BlogCard key={post.id} post={post} />
						))}
					</div>
				) : (
					<p className="text-center text-zinc-500 dark:text-zinc-400">
						No posts in this category yet.
					</p>
				)}
			</div>
		</>
	)
}
