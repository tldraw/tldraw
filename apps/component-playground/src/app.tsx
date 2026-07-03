import { useState } from 'react'
import { sketchbooks, sketchesById } from './registry'
import { SketchView } from './sketch-view'

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
						<iframe
							className="sketch-frame"
							title={selected.id}
							src={`sketch.html?id=${encodeURIComponent(selected.id)}`}
						/>
					</SketchView>
				) : (
					<p className="stage__empty">No sketches found.</p>
				)}
			</main>
		</div>
	)
}
