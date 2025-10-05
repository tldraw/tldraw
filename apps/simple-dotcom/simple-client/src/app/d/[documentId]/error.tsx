'use client'

import Link from 'next/link'
import { useEffect } from 'react'

export default function DocumentError({
	error,
	reset,
}: {
	error: Error & { digest?: string }
	reset: () => void
}) {
	useEffect(() => {
		console.error('Document error:', error)
	}, [error])

	return (
		<div className="flex h-screen items-center justify-center">
			<div className="max-w-md text-center">
				<div className="mb-4 text-6xl">⚠️</div>
				<h2 className="mb-2 text-2xl font-bold">Something went wrong</h2>
				<p className="mb-6 text-gray-600">We encountered an error loading this document.</p>
				<div className="flex justify-center gap-2">
					<button
						onClick={reset}
						className="rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
					>
						Try again
					</button>
					<Link href="/dashboard" className="rounded-md border px-4 py-2 hover:bg-gray-50">
						Go to Dashboard
					</Link>
				</div>
			</div>
		</div>
	)
}
