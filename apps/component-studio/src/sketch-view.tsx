import { ReactNode } from 'react'

/** The frame a single sketch is viewed in. Enriched in a later milestone. */
export function SketchView({ title, children }: { title: string; children: ReactNode }) {
	return (
		<section className="sketch-view">
			<header className="sketch-view__title">{title}</header>
			<div className="sketch-view__stage">{children}</div>
		</section>
	)
}
