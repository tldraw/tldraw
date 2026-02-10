import { Button } from '@/components/ui/button'

export default function NotFound() {
	return (
		<div className="flex min-h-[60vh] items-center justify-center px-4">
			<div className="mx-auto max-w-md text-center">
				<p className="text-6xl font-bold text-zinc-900 dark:text-white">404</p>
				<h1 className="mt-4 text-2xl font-bold text-zinc-900 dark:text-white">Page not found</h1>
				<p className="mt-2 text-zinc-600 dark:text-zinc-400">
					Sorry, we couldn&apos;t find the page you&apos;re looking for.
				</p>
				<Button href="/" className="mt-8 font-semibold">
					Go home
				</Button>
			</div>
		</div>
	)
}
