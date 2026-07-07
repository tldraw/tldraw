import { useEffect, useRef, useState } from 'react'
import { Env, SET_STATE } from './channel'
import { Controls } from './controls'
import { sketchbooks, sketchesById } from './registry'
import { SketchView } from './sketch-view'

const LOCALES = ['en', 'fr', 'es', 'de', 'ja']

function postState(
	frame: HTMLIFrameElement | null,
	id: string,
	args: Record<string, unknown>,
	env: Env
) {
	if (frame && frame.contentWindow) {
		frame.contentWindow.postMessage({ type: SET_STATE, id, args, env }, window.location.origin)
	}
}

export function App() {
	const [selectedId, setSelectedId] = useState(sketchbooks[0]?.sketches[0]?.id)
	const selected = selectedId ? sketchesById.get(selectedId) : undefined
	const [args, setArgs] = useState<Record<string, unknown>>(() => ({
		...(selected?.sketch.args ?? {}),
	}))
	const [theme, setTheme] = useState<'light' | 'dark'>('light')
	const [locale, setLocale] = useState('en')
	const frameRef = useRef<HTMLIFrameElement | null>(null)
	const env: Env = { theme, locale }

	// Reset args to the sketch's authored defaults when the selection changes.
	useEffect(() => {
		setArgs({ ...(selected?.sketch.args ?? {}) })
	}, [selectedId, selected])

	// Push args + env into the preview frame whenever any of them change. Build the
	// env from the primitive deps rather than `env` (a fresh object every render).
	useEffect(() => {
		if (selected) postState(frameRef.current, selected.id, args, { theme, locale })
	}, [selected, args, theme, locale])

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
			<div className="main">
				<div className="toolbar">
					<label className="toolbar__field">
						<span>theme</span>
						<select value={theme} onChange={(e) => setTheme(e.target.value as 'light' | 'dark')}>
							<option value="light">light</option>
							<option value="dark">dark</option>
						</select>
					</label>
					<label className="toolbar__field">
						<span>locale</span>
						<select value={locale} onChange={(e) => setLocale(e.target.value)}>
							{LOCALES.map((l) => (
								<option key={l} value={l}>
									{l}
								</option>
							))}
						</select>
					</label>
				</div>
				<main className="stage">
					{selected ? (
						<div className="workbench">
							<SketchView title={`${selected.sketchbook.title} · ${selected.name}`}>
								<iframe
									ref={frameRef}
									className="sketch-frame"
									title={selected.id}
									src={`sketch.html?id=${encodeURIComponent(selected.id)}`}
									onLoad={() => postState(frameRef.current, selected.id, args, env)}
								/>
							</SketchView>
							<Controls loaded={selected} args={args} onChange={setArgs} />
						</div>
					) : (
						<p className="stage__empty">No sketches found.</p>
					)}
				</main>
			</div>
		</div>
	)
}
