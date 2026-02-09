import Link from 'next/link'

export default function NotFound() {
	return (
		<div className="flex min-h-[60vh] items-center justify-center px-4">
			<div className="mx-auto max-w-md text-center">
				<p className="text-6xl font-bold text-zinc-900 dark:text-white">404</p>
				<h1 className="mt-4 text-2xl font-bold text-zinc-900 dark:text-white">Page not found</h1>
				<p className="mt-2 text-zinc-600 dark:text-zinc-400">
					Sorry, we couldn&apos;t find the page you&apos;re looking for.
				</p>
				<Link
					href="/"
					className="mt-8 inline-flex rounded-lg bg-zinc-900 px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-zinc-700 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-200"
				>
					Go home
				</Link>
			</div>
		</div>
	)
}
