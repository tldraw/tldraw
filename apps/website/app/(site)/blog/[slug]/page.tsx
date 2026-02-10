import { RichText } from '@/components/portable-text'
import { CommunitySection } from '@/components/sections/community-section'
import { ChevronLeft, ChevronRight } from '@/components/ui/chevron-icon'
import { formatDateShort, stripHtml } from '@/lib/utils'
import { urlFor } from '@/sanity/image'
import { getBlogPost, getBlogPosts } from '@/sanity/queries'
import type { Metadata } from 'next'
import Image from 'next/image'
import Link from 'next/link'
import { notFound } from 'next/navigation'

interface BlogPostPageProps {
	params: Promise<{ slug: string }>
}

export async function generateMetadata({ params }: BlogPostPageProps): Promise<Metadata> {
	const { slug } = await params
	const post = await getBlogPost(slug)
	if (!post) return {}

	return {
		title: post.seo?.metaTitle || post.title,
		description: post.seo?.metaDescription || stripHtml(post.excerpt),
		openGraph: post.seo?.ogImage
			? { images: [{ url: urlFor(post.seo.ogImage).width(1200).height(630).url() }] }
			: post.coverImage
				? { images: [{ url: urlFor(post.coverImage).width(1200).height(630).url() }] }
				: undefined,
	}
}

export async function generateStaticParams() {
	const posts = await getBlogPosts()
	return posts?.map((post) => ({ slug: post.slug.current })) || []
}

export default async function BlogPostPage({ params }: BlogPostPageProps) {
	const { slug } = await params
	const post = await getBlogPost(slug)

	if (!post) notFound()

	const allPosts = await getBlogPosts()
	const currentIndex = allPosts.findIndex((p) => p.slug.current === slug)
	const prevPost = currentIndex < allPosts.length - 1 ? allPosts[currentIndex + 1] : null
	const nextPost = currentIndex > 0 ? allPosts[currentIndex - 1] : null

	return (
		<>
			<article className="mx-auto max-w-content px-4 py-16 sm:px-6 sm:py-24 lg:px-8">
				<div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-brand-link">
					<Link href="/blog" className="hover:text-blue-700 dark:hover:text-blue-300">
						Blog
					</Link>
					{post.category && (
						<>
							<span>/</span>
							<Link
								href={`/blog/category/${post.category.slug.current}`}
								className="hover:text-blue-700 dark:hover:text-blue-300"
							>
								{post.category.title}
							</Link>
						</>
					)}
				</div>
				<h1 className="mt-4 text-3xl font-bold tracking-tight text-zinc-900 dark:text-white sm:text-5xl">
					{post.title}
				</h1>
				<p className="mt-4 text-sm text-zinc-500 dark:text-zinc-400">
					{formatDateShort(post.publishedAt)}
					{post.author?.name && <> · {post.author.name}</>}
				</p>
				{post.coverImage && (
					<Image
						src={urlFor(post.coverImage).width(1200).height(630).url()}
						alt={post.coverImage.alt || post.title}
						width={1200}
						height={630}
						className="mt-12 rounded-lg"
						priority
					/>
				)}
				<div className="mt-12 lg:px-10">
					<RichText value={post.body} className="text-base" />
				</div>
				{(prevPost || nextPost) && (
					<nav className="mt-16 flex flex-wrap items-start justify-between gap-6 lg:px-8">
						{prevPost ? (
							<Link
								href={`/blog/${prevPost.slug.current}`}
								className="group flex min-w-0 flex-1 basis-0 items-start gap-2 text-md text-brand-link hover:text-brand-link/90 sm:min-w-[200px] dark:hover:text-brand-link/90"
							>
								<ChevronLeft className="mt-0.5 h-3.5 w-3.5 flex-shrink-0" />
								<span className="min-w-0 break-words">{prevPost.title}</span>
							</Link>
						) : (
							<div />
						)}
						{nextPost ? (
							<Link
								href={`/blog/${nextPost.slug.current}`}
								className="group flex min-w-0 flex-1 basis-0 flex-row-reverse items-start justify-end gap-2 text-md text-brand-link hover:text-brand-link/90 sm:min-w-[200px] sm:justify-end dark:hover:text-brand-link/90"
							>
								<ChevronRight className="mt-0.5 h-3.5 w-3.5 flex-shrink-0" />
								<span className="min-w-0 break-words text-right">{nextPost.title}</span>
							</Link>
						) : (
							<div />
						)}
					</nav>
				)}
			</article>
			<CommunitySection />
		</>
	)
}
