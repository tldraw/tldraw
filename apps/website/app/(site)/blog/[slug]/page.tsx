import { Markdown } from '@/components/markdown'
import { CommunitySection } from '@/components/sections/community-section'
import { ChevronLeft, ChevronRight } from '@/components/ui/chevron-icon'
import { formatDateShort } from '@/lib/utils'
import { db } from '@/utils/ContentDatabase'
import { toBlogPostSummary } from '@/utils/collections'
import type { Metadata } from 'next'
import Image from 'next/image'
import Link from 'next/link'
import { notFound } from 'next/navigation'

interface BlogPostPageProps {
	params: Promise<{ slug: string }>
}

export async function generateMetadata({ params }: BlogPostPageProps): Promise<Metadata> {
	const { slug } = await params
	const page = await db.getPage(`/blog/${slug}`)
	if (!page) return {}
	const meta = page.metadata ? JSON.parse(page.metadata) : {}

	return {
		title: meta.metaTitle || page.title,
		description: meta.metaDescription || meta.excerpt || page.description,
		openGraph: page.hero ? { images: [{ url: page.hero }] } : undefined,
	}
}

export async function generateStaticParams() {
	const pages = await db.getPagesBySection('blog')
	return pages.map((p) => ({ slug: p.path.replace('/blog/', '') }))
}

export default async function BlogPostPage({ params }: BlogPostPageProps) {
	const { slug } = await params
	const page = await db.getPage(`/blog/${slug}`)

	if (!page) notFound()

	const meta = page.metadata ? JSON.parse(page.metadata) : {}
	const allPages = await db.getPagesBySection('blog')
	const allPosts = allPages.map(toBlogPostSummary)
	const currentIndex = allPosts.findIndex((p) => p.slug === slug)
	const prevPost = currentIndex < allPosts.length - 1 ? allPosts[currentIndex + 1] : null
	const nextPost = currentIndex > 0 ? allPosts[currentIndex - 1] : null

	return (
		<>
			<article className="max-w-content mx-auto px-4 py-16 sm:px-6 sm:py-24 lg:px-8">
				<div className="text-brand-link flex items-center gap-1.5 text-xs font-semibold tracking-wider uppercase">
					<Link href="/blog" className="hover:text-blue-700 dark:hover:text-blue-300">
						Blog
					</Link>
					{meta.category && (
						<>
							<span>/</span>
							<Link
								href={`/blog/category/${meta.category}`}
								className="hover:text-blue-700 dark:hover:text-blue-300"
							>
								{meta.category}
							</Link>
						</>
					)}
				</div>
				<h1 className="mt-4 text-3xl font-bold tracking-tight text-zinc-900 sm:text-5xl dark:text-white">
					{page.title}
				</h1>
				<p className="mt-4 text-sm text-zinc-500 dark:text-zinc-400">
					{page.date && formatDateShort(page.date)}
					{meta.author && <> · {meta.author}</>}
				</p>
				{page.hero && (
					<Image
						src={page.hero}
						alt={page.title}
						width={1200}
						height={630}
						className="mt-12 rounded-md"
						priority
					/>
				)}
				<div className="mt-12 lg:px-10">
					<Markdown content={page.content} className="text-base" />
				</div>
				{(prevPost || nextPost) && (
					<nav className="mt-16 flex flex-wrap items-start justify-between gap-6 lg:px-8">
						{prevPost ? (
							<Link
								href={`/blog/${prevPost.slug}`}
								className="text-md group text-brand-link hover:text-brand-link/90 dark:hover:text-brand-link/90 flex min-w-0 flex-1 basis-0 items-start gap-2 sm:min-w-[200px]"
							>
								<ChevronLeft className="mt-0.5 h-3.5 w-3.5 shrink-0" />
								<span className="min-w-0 wrap-break-word">{prevPost.title}</span>
							</Link>
						) : (
							<div />
						)}
						{nextPost ? (
							<Link
								href={`/blog/${nextPost.slug}`}
								className="text-md group text-brand-link hover:text-brand-link/90 dark:hover:text-brand-link/90 flex min-w-0 flex-1 basis-0 flex-row-reverse items-start justify-end gap-2 sm:min-w-[200px] sm:justify-end"
							>
								<ChevronRight className="mt-0.5 h-3.5 w-3.5 shrink-0" />
								<span className="min-w-0 text-right wrap-break-word">{nextPost.title}</span>
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
