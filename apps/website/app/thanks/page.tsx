import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
	title: 'Thank you',
}

export default function ThanksPage() {
	return (
		<div className="flex min-h-[60vh] items-center justify-center px-4">
			<div className="mx-auto max-w-md text-center">
				<h1 className="text-4xl font-bold tracking-tight text-zinc-900 dark:text-white">
					Thank you!
				</h1>
				<p className="mt-4 text-lg text-zinc-600 dark:text-zinc-400">
					We&apos;ve received your submission. We&apos;ll be in touch soon.
				</p>
				<Link
					href="/"
					className="mt-8 inline-flex rounded-lg bg-zinc-900 px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-zinc-700 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-200"
				>
					Back to home
				</Link>
			</div>
		</div>
	)
}
