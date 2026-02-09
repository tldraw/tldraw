import { RichText } from '@/components/portable-text'
import { getPage } from '@/sanity/queries'
import type { Metadata } from 'next'
import { notFound } from 'next/navigation'

interface LicensePageProps {
	params: Promise<{ slug: string[] }>
}

export async function generateMetadata({ params }: LicensePageProps): Promise<Metadata> {
	const { slug } = await params
	const page = await getPage(`get-a-license/${slug.join('/')}`)
	if (!page) return {}
	return {
		title: page.seo?.metaTitle || page.title,
		description: page.seo?.metaDescription,
	}
}

export default async function LicensePage({ params }: LicensePageProps) {
	const { slug } = await params
	const page = await getPage(`get-a-license/${slug.join('/')}`)

	if (!page) notFound()

	return (
		<article className="mx-auto max-w-3xl px-4 py-16 sm:px-6 sm:py-24">
			<h1 className="text-4xl font-bold tracking-tight text-zinc-900 dark:text-white">
				{page.title}
			</h1>
			{page.body && (
				<div className="mt-8">
					<RichText value={page.body} />
				</div>
			)}
		</article>
	)
}
