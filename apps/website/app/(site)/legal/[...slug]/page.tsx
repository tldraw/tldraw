import { RichText } from '@/components/portable-text'
import { formatDate } from '@/lib/utils'
import { getLegalPage } from '@/sanity/queries'
import type { Metadata } from 'next'
import { notFound } from 'next/navigation'

interface LegalPageProps {
	params: Promise<{ slug: string[] }>
}

export async function generateMetadata({ params }: LegalPageProps): Promise<Metadata> {
	const { slug } = await params
	const page = await getLegalPage(slug.join('/'))
	if (!page) return {}
	return {
		title: page.title,
	}
}

export default async function LegalPage({ params }: LegalPageProps) {
	const { slug } = await params
	const page = await getLegalPage(slug.join('/'))

	if (!page) notFound()

	return (
		<article className="mx-auto max-w-3xl px-4 py-16 sm:px-6 sm:py-24">
			<h1 className="text-4xl font-bold tracking-tight text-zinc-900 dark:text-white">
				{page.title}
			</h1>
			{page.lastUpdated && (
				<p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
					Last updated: {formatDate(page.lastUpdated)}
				</p>
			)}
			<div className="mt-8">
				<RichText value={page.body} />
			</div>
		</article>
	)
}
