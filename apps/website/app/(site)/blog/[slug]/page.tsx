import { RichText } from '@/components/portable-text'
import { formatDate, stripHtml } from '@/lib/utils'
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

	return (
		<article className="mx-auto max-w-3xl px-4 py-16 sm:px-6 sm:py-24">
			{post.category && (
				<Link
					href={`/blog/category/${post.category.slug.current}`}
					className="text-sm font-medium uppercase tracking-wider text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200"
				>
					{post.category.title}
				</Link>
			)}
			<h1 className="mt-4 text-4xl font-bold tracking-tight text-zinc-900 dark:text-white sm:text-5xl">
				{post.title}
			</h1>
			<div className="mt-6 flex items-center gap-4">
				{post.author?.avatar && (
					<Image
						src={urlFor(post.author.avatar).width(40).height(40).url()}
						alt={post.author.name}
						width={40}
						height={40}
						className="rounded-full"
					/>
				)}
				<div>
					<p className="font-medium text-zinc-900 dark:text-white">{post.author?.name}</p>
					<p className="text-sm text-zinc-500 dark:text-zinc-400">{formatDate(post.publishedAt)}</p>
				</div>
			</div>
			{post.coverImage && (
				<Image
					src={urlFor(post.coverImage).width(1200).height(630).url()}
					alt={post.coverImage.alt || post.title}
					width={1200}
					height={630}
					className="mt-8 rounded-lg"
					priority
				/>
			)}
			<div className="mt-8">
				<RichText value={post.body} />
			</div>
		</article>
	)
}
