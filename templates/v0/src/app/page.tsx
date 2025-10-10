'use client'

import dynamic from 'next/dynamic'

const Tldraw = dynamic(() => import('./components/TldrawEditor'), {
	ssr: false,
	loading: () => <div className="flex items-center justify-center h-screen">Loading tldraw...</div>,
})

export default function Home() {
	return (
		<main className="tldraw">
			<Tldraw />
		</main>
	)
}
