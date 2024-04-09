'use client'
import { Tldraw } from 'tldraw'

export default function Home() {
	return (
		<main>
			<div style={{ position: 'fixed', inset: 0 }}>
				<Tldraw />
			</div>
		</main>
	)
}
