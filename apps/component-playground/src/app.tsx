import { useEffect, useRef, useState } from 'react'
import { SET_ARGS } from './channel'
import { Controls } from './controls'
import { sketchbooks, sketchesById } from './registry'
import { SketchView } from './sketch-view'

function postArgs(frame: HTMLIFrameElement | null, id: string, args: Record<string, unknown>) {
	if (frame && frame.contentWindow) {
		frame.contentWindow.postMessage({ type: SET_ARGS, id, args }, window.location.origin)
	}
}

export function App() {
	const [selectedId, setSelectedId] = useState(sketchbooks[0]?.sketches[0]?.id)
	const selected = selectedId ? sketchesById.get(selectedId) : undefined
	const [args, setArgs] = useState<Record<string, unknown>>(() => ({
		...(selected?.sketch.args ?? {}),
	}))
	const frameRef = useRef<HTMLIFrameElement | null>(null)

	// Reset args to the sketch's authored defaults when the selection changes.
	useEffect(() => {
		setArgs({ ...(selected?.sketch.args ?? {}) })
	}, [selectedId, selected])

	// Push args into the preview frame whenever they change.
	useEffect(() => {
		if (selected) postArgs(frameRef.current, selected.id, args)
	}, [selected, args])

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
					<div className="workbench">
						<SketchView title={`${selected.sketchbook.title} · ${selected.name}`}>
							<iframe
								ref={frameRef}
								className="sketch-frame"
								title={selected.id}
								src={`sketch.html?id=${encodeURIComponent(selected.id)}`}
								onLoad={() => postArgs(frameRef.current, selected.id, args)}
							/>
						</SketchView>
						<Controls loaded={selected} args={args} onChange={setArgs} />
					</div>
				) : (
					<p className="stage__empty">No sketches found.</p>
				)}
			</main>
		</div>
	)
}
