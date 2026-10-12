import { useEffect, useMemo, useState } from 'react'
import { atom, Editor, TLComponents, TldrawUiButton, useEditor, useValue } from 'tldraw'
import { ContentLayer } from './ContentLayer'
import { type Corpus, type Layout, layoutCorpus, levelOpacities, type PlacedNode } from './layout'
import { goToNode, goToWhole, nodesContaining, zoomAtCentre, zoomRange } from './navigation'

interface Hit {
	node: PlacedNode
	preview: string
}

function search(layout: Layout, query: string): Hit[] {
	const needle = query.trim().toLowerCase()
	if (needle.length < 2) return []
	const hits: Hit[] = []
	for (const node of layout.nodes) {
		const haystack = `${node.label ?? ''} ${node.title ?? ''} ${node.text}`
		const at = haystack.toLowerCase().indexOf(needle)
		if (at === -1) continue
		const from = Math.max(0, at - 30)
		hits.push({
			node,
			preview: (from > 0 ? '…' : '') + haystack.slice(from, at + needle.length + 50).trim() + '…',
		})
		if (hits.length >= 60) break
	}
	// Coarsest first: the reader wants to know which part of the work a word
	// lives in before being dropped into one paragraph of it.
	return hits.sort((a, b) => a.node.depth - b.node.depth)
}

function shorten(text: string, words = 5) {
	const parts = text.split(/\s+/)
	return parts.slice(0, words).join(' ') + (parts.length > words ? '…' : '')
}

/**
 * A zoom control for a range no wheel makes obvious. Reading a whole work takes
 * a couple of hundred times magnification, so the slider is logarithmic: each
 * equal step along it is an equal multiple of zoom, which makes the levels come
 * past at an even rate rather than all bunched at one end.
 */
function ZoomSlider({ layout }: { layout: Layout }) {
	const editor = useEditor()
	const [min, max] = useMemo(() => zoomRange(layout), [layout])
	const span = Math.log(max / min)

	const position = useValue(
		'zoom position',
		() => {
			const zoom = editor.getZoomLevel()
			return Math.min(1, Math.max(0, Math.log(zoom / min) / span))
		},
		[editor, min, span]
	)

	return (
		<label className="sz-zoom" title="Zoom">
			<span className="sz-zoom-end">whole</span>
			<input
				type="range"
				min={0}
				max={1}
				step={0.001}
				value={position}
				onChange={(e) =>
					zoomAtCentre(editor, layout, min * Math.exp(span * e.currentTarget.valueAsNumber))
				}
			/>
			<span className="sz-zoom-end">detail</span>
		</label>
	)
}

function Breadcrumb({ layout }: { layout: Layout }) {
	const editor = useEditor()
	// Joined into a string because a fresh array every camera frame would
	// re-render the trail on every pan, identical or not.
	const trailIds = useValue(
		'breadcrumb',
		() => {
			const { x, y } = editor.getViewportPageBounds().center
			const chain = nodesContaining(layout, x, y)
			// Stop at the level actually being read. The chain always runs to a
			// leaf, so without this the whole-work view claims to be showing
			// whichever leaf happens to sit under the middle of the screen.
			const opacities = levelOpacities(layout.nominals, editor.getZoomLevel())
			let deepest = 0
			opacities.forEach((opacity, depth) => {
				if (opacity > 0.5) deepest = depth
			})
			return chain
				.filter((node) => node.depth <= deepest)
				.map((node) => node.id)
				.join('\t')
		},
		[editor, layout]
	)
	const byId = useMemo(() => new Map(layout.nodes.map((node) => [node.id, node])), [layout])
	const trail = useMemo(
		() => (trailIds ? trailIds.split('\t').map((id) => byId.get(id)!) : []),
		[trailIds, byId]
	)
	if (trail.length <= 1) return null
	return (
		<div className="sz-crumbs">
			{trail.map((node, i) => (
				<button
					key={node.id}
					className="sz-crumb"
					title="Zoom back out to here"
					onClick={() => goToNode(editor, layout, node)}
				>
					{i > 0 && <span className="sz-crumb-sep">›</span>}
					{node.label ?? node.title ?? shorten(node.text)}
				</button>
			))}
		</div>
	)
}

function Controls({
	layout,
	matches,
}: {
	layout: Layout
	matches: ReturnType<typeof atom<ReadonlySet<string>>>
}) {
	const editor = useEditor()
	const [query, setQuery] = useState('')

	const hits = useMemo(() => search(layout, query), [layout, query])
	// Another component's signal: cannot be set during this one's render. Only
	// publish when the set actually changed, or every keystroke re-renders every
	// node on the canvas — including the ones that matched before and still do.
	useEffect(() => {
		const ids = new Set(hits.map((hit) => hit.node.id))
		const current = matches.get()
		if (ids.size === current.size && [...ids].every((id) => current.has(id))) return
		matches.set(ids)
	}, [hits, matches])

	return (
		<div className="sz-controls">
			<div className="sz-bar">
				<ZoomSlider layout={layout} />
				<TldrawUiButton type="normal" onClick={() => goToWhole(editor, layout)}>
					Whole thing
				</TldrawUiButton>
				<input
					className="sz-search"
					value={query}
					placeholder="Search every level…"
					onChange={(e) => setQuery(e.currentTarget.value)}
				/>
			</div>
			{hits.length > 0 && (
				<ul className="sz-hits">
					{hits.slice(0, 10).map((hit) => (
						<li key={hit.node.id}>
							<button onClick={() => goToNode(editor, layout, hit.node)}>
								<span className="sz-hit-where">
									{hit.node.label ?? hit.node.title ?? `level ${hit.node.depth}`}
								</span>
								<span className="sz-hit-text">{hit.preview}</span>
							</button>
						</li>
					))}
					{hits.length > 10 && <li className="sz-hits-more">and {hits.length - 10} more</li>}
				</ul>
			)}
			<Breadcrumb layout={layout} />
		</div>
	)
}

/**
 * Build the editor wiring for one corpus. Called once at module scope so the
 * layout — a pure function of content that never changes — is computed a single
 * time and shared by the canvas layer, the camera and the search index.
 */
export function createSemanticZoom(corpus: Corpus) {
	const layout = layoutCorpus(corpus)

	// The canvas layer lives inside the camera transform and the controls live
	// outside it, so they occupy different component slots and cannot share React
	// state directly. A signal is the shared ground between them.
	const matches = atom<ReadonlySet<string>>('semantic zoom matches', new Set<string>())

	const components: TLComponents = {
		OnTheCanvas: function SemanticZoomCanvas() {
			const highlighted = useValue(matches)
			return <ContentLayer layout={layout} corpus={corpus} matches={highlighted} />
		},
		TopPanel: function SemanticZoomControls() {
			return <Controls layout={layout} matches={matches} />
		},
	}

	return {
		components,
		options: {
			camera: {
				// Reading a whole work end to end takes a couple of orders of
				// magnitude, and the default steps stop at 8x.
				zoomSteps: [0.25, 0.5, 1, 2, 4, 8, 16, 32, 64, 128, 256],
			},
		},
		onMount(editor: Editor) {
			goToWhole(editor, layout, 0)
		},
	}
}
