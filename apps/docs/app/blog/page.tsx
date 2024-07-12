import { Breadcrumbs } from '@/components/blog/breadcrumbs'
import { PostPreview } from '@/components/blog/post-preview'
import { PageTitle } from '@/components/page-title'
import { allCategories, allPosts } from 'contentlayer/generated'
import { notFound } from 'next/navigation'

export default function Page() {
	const category = allCategories.find((category) => category.slug === 'all-posts')
	if (!category) notFound()

	return (
		<>
			<section className="pb-6 mb-6 md:mb-12 md:pb-12 border-b border-zinc-100">
				<Breadcrumbs className="mb-2" />
				<PageTitle>{category.name}</PageTitle>
				<p className="mt-4 text-zinc-800 text-lg max-w-2xl">{category.description}</p>
			</section>
			<section className="space-y-12">
				{allPosts
					.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
					.map((post, index) => (
						<PostPreview key={index} post={post} />
					))}
			</section>
		</>
	)
}
