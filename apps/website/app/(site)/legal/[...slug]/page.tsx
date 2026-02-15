import { Markdown } from '@/components/markdown'
import { formatDate } from '@/lib/utils'
import { db } from '@/utils/ContentDatabase'
import type { Metadata } from 'next'
import { notFound } from 'next/navigation'

interface LegalPageProps {
	params: Promise<{ slug: string[] }>
}

export async function generateMetadata({ params }: LegalPageProps): Promise<Metadata> {
	const { slug } = await params
	const page = await db.getPage(`/legal/${slug.join('/')}`)
	if (!page) return {}
	return {
		title: page.title,
	}
}

export default async function LegalPage({ params }: LegalPageProps) {
	const { slug } = await params
	const page = await db.getPage(`/legal/${slug.join('/')}`)

	if (!page) notFound()

	const meta = page.metadata ? JSON.parse(page.metadata) : {}

	return (
		<article className="mx-auto max-w-3xl px-4 py-16 sm:px-6 sm:py-24">
			<h1 className="text-4xl font-bold tracking-tight text-zinc-900 dark:text-white">
				{page.title}
			</h1>
			{meta.lastUpdated && (
				<p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
					Last updated: {formatDate(meta.lastUpdated)}
				</p>
			)}
			{page.content && (
				<div className="mt-8">
					<Markdown content={page.content} />
				</div>
			)}
		</article>
	)
}
