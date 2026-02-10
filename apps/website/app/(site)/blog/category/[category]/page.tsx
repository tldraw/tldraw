import { BlogCard } from '@/components/sections/blog-card'
import { CategoryNav } from '@/components/ui/category-nav'
import { PageHeader } from '@/components/ui/page-header'
import { getBlogCategories, getBlogPosts } from '@/sanity/queries'
import type { Metadata } from 'next'
import { notFound } from 'next/navigation'

interface CategoryPageProps {
	params: Promise<{ category: string }>
}

export async function generateMetadata({ params }: CategoryPageProps): Promise<Metadata> {
	const { category } = await params
	const categories = await getBlogCategories()
	const cat = categories?.find((c) => c.slug.current === category)
	if (!cat) return {}
	return {
		title: `${cat.title} - Blog`,
		description: cat.description || `Blog posts about ${cat.title}.`,
	}
}

export async function generateStaticParams() {
	const categories = await getBlogCategories()
	return categories?.map((cat) => ({ category: cat.slug.current })) || []
}

export default async function BlogCategoryPage({ params }: CategoryPageProps) {
	const { category } = await params
	const [posts, categories] = await Promise.all([getBlogPosts(category), getBlogCategories()])

	const currentCategory = categories?.find((c) => c.slug.current === category)
	if (!currentCategory) notFound()

	return (
		<>
			<PageHeader title={currentCategory.title} description={currentCategory.description} />
			<div className="mx-auto max-w-content px-4 py-12 sm:px-6 lg:px-8">
				{categories && <CategoryNav categories={categories} activeCategory={category} />}
				{posts?.length > 0 ? (
					<div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
						{posts.map((post) => (
							<BlogCard key={post._id} post={post} />
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
