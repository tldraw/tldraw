import { Button } from '@/components/ui/button'
import type { Metadata } from 'next'

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
				<Button href="/" className="mt-8 font-semibold">
					Back to home
				</Button>
			</div>
		</div>
	)
}
