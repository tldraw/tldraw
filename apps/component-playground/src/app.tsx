import { useState } from 'react'
import { LoadedSketch, sketchbooks, sketchesById } from './registry'
import { SketchView } from './sketch-view'

function renderSketch(loaded: LoadedSketch) {
	const { sketchbook, sketch } = loaded
	const args = sketch.args ?? {}
	if (sketch.render) return sketch.render(args)
	if (sketchbook.component) {
		const Component = sketchbook.component
		return <Component {...args} />
	}
	return <em>This sketch has no component or render().</em>
}

export function App() {
	const [selectedId, setSelectedId] = useState(sketchbooks[0]?.sketches[0]?.id)
	const selected = selectedId ? sketchesById.get(selectedId) : undefined

	return (
		<div className="layout">
			<nav className="sidebar">
				<h1 className="sidebar__brand">studio</h1>
				{sketchbooks.map((book) => (
					<div key={book.title} className="sidebar__book">
						<div className="sidebar__book-title">{book.title}</div>
						{book.sketches.map((s) => (
							<button
								key={s.id}
								className="sidebar__sketch"
								aria-current={s.id === selectedId ? 'true' : undefined}
								onClick={() => setSelectedId(s.id)}
							>
								{s.name}
							</button>
						))}
					</div>
				))}
			</nav>
			<main className="stage">
				{selected ? (
					<SketchView title={`${selected.sketchbook.title} · ${selected.name}`}>
						{renderSketch(selected)}
					</SketchView>
				) : (
					<p className="stage__empty">No sketches found.</p>
				)}
			</main>
		</div>
	)
}
