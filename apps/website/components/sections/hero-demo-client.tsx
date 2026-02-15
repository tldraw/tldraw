'use client'

import dynamic from 'next/dynamic'

// Loading placeholder matching HeroDemo layout (code block + canvas)
function HeroDemoLoading() {
	return (
		<div className="mt-12 w-full overflow-visible">
			<div className="">
				<div className="h-[400px] min-h-0 min-w-0 overflow-hidden rounded-md border-b lg:flex-2">
					<div className="flex items-center gap-2 border-b border-zinc-700 bg-zinc-900 px-4 py-2 dark:border-zinc-800 dark:bg-zinc-950">
						<span className="font-mono text-sm text-zinc-400">App.tsx</span>
					</div>
					<div className="h-32 animate-pulse bg-zinc-900 dark:bg-zinc-950" />
				</div>
				<div className="h-[400px] min-h-0 min-w-0 overflow-hidden rounded-md border-b lg:flex-2">
					<div className="flex h-full w-full items-center justify-center border-2 border-blue-500 dark:border-blue-400">
						<span className="animate-pulse text-zinc-400 dark:text-zinc-500">Loading canvas…</span>
					</div>
				</div>
			</div>
		</div>
	)
}

// Load HeroDemo only on client - tldraw has browser-only deps incompatible with SSR
export const HeroDemoClient = dynamic(
	() => import('./hero-demo').then((m) => ({ default: m.HeroDemo })),
	{ ssr: false, loading: () => <HeroDemoLoading /> }
)
