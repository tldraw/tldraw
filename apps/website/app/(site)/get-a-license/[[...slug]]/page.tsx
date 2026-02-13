import { Markdown } from '@/components/markdown'
import { db } from '@/utils/ContentDatabase'
import type { Metadata } from 'next'
import { notFound } from 'next/navigation'

interface LicensePageProps {
	params: Promise<{ slug?: string[] }>
}

export async function generateMetadata({ params }: LicensePageProps): Promise<Metadata> {
	const { slug } = await params
	const path = slug ? `/get-a-license/${slug.join('/')}` : '/get-a-license'
	const page = await db.getPage(path)
	if (!page) return {}
	const meta = page.metadata ? JSON.parse(page.metadata) : {}
	return {
		title: meta.metaTitle || page.title,
		description: meta.metaDescription || page.description,
	}
}

export default async function LicensePage({ params }: LicensePageProps) {
	const { slug } = await params
	const path = slug ? `/get-a-license/${slug.join('/')}` : '/get-a-license'
	const page = await db.getPage(path)

	if (!page) notFound()

	return (
		<article className="mx-auto max-w-3xl px-4 py-16 sm:px-6 sm:py-24">
			<h1 className="text-4xl font-bold tracking-tight text-zinc-900 dark:text-white">
				{page.title}
			</h1>
			{page.content && (
				<div className="mt-8">
					<Markdown content={page.content} />
				</div>
			)}
		</article>
	)
}
