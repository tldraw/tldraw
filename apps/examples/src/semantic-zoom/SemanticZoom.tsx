import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { atom, Editor, TLComponents, TldrawUiButton, useEditor, useValue } from 'tldraw'
import { ContentLayer } from './ContentLayer'
import {
	type Corpus,
	type Layout,
	layoutCorpus,
	levelOpacities,
	openingZoom,
	type PlacedNode,
} from './layout'
import { frameRect, goToNode, nodesContaining, runGuidedDive, suggestDivePath } from './navigation'

/** Where a search hit was found, and enough context to show it in the list. */
interface Hit {
	node: PlacedNode
	preview: string
}

function search(layout: Layout, query: string): Hit[] {
	const needle = query.trim().toLowerCase()
	if (needle.length < 2) return []
	const hits: Hit[] = []
	for (const node of layout.nodes) {
		const haystack = `${node.title ?? ''} ${node.text}`
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

function Breadcrumb({ layout }: { layout: Layout }) {
	const editor = useEditor()
	const trail = useValue(
		'breadcrumb',
		() => {
			const { x, y } = editor.getViewportPageBounds().center
			const chain = nodesContaining(layout, x, y)
			// Stop at the level actually being read. The chain always runs to a
			// leaf, so without this the whole-book view claims to be showing
			// whichever chapter happens to sit under the middle of the screen.
			const opacities = levelOpacities(layout.nominals, editor.getZoomLevel())
			let deepest = 0
			opacities.forEach((opacity, depth) => {
				if (opacity > 0.5) deepest = depth
			})
			return chain.filter((node) => node.depth <= deepest)
		},
		[editor, layout]
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
					{node.title ?? shorten(node.text)}
				</button>
			))}
		</div>
	)
}

function LinkToggle() {
	const editor = useEditor()
	const [on, setOn] = useState(true)
	useEffect(() => {
		editor.getContainer().classList.toggle('sz-hide-links', !on)
	}, [editor, on])
	return (
		<TldrawUiButton type="normal" onClick={() => setOn((v) => !v)}>
			{on ? 'Hide echoes' : 'Show echoes'}
		</TldrawUiButton>
	)
}

function Controls({
	layout,
	corpus,
	divePath,
	matches,
}: {
	layout: Layout
	corpus: Corpus
	divePath: string[]
	matches: ReturnType<typeof atom<ReadonlySet<string>>>
}) {
	const editor = useEditor()
	const [query, setQuery] = useState('')
	const [touring, setTouring] = useState(false)
	const cancelled = useRef(false)

	const hits = useMemo(() => search(layout, query), [layout, query])
	useEffect(() => {
		matches.set(new Set(hits.map((hit) => hit.node.id)))
	}, [hits, matches])

	const stopTour = useCallback(() => {
		cancelled.current = true
		setTouring(false)
	}, [])

	// Any deliberate camera input from the reader ends the tour immediately —
	// nothing is worse than a demo that fights you for the wheel.
	useEffect(() => {
		if (!touring) return
		const container = editor.getContainer()
		const opts = { capture: true, passive: true } as const
		container.addEventListener('wheel', stopTour, opts)
		container.addEventListener('pointerdown', stopTour, opts)
		return () => {
			container.removeEventListener('wheel', stopTour, opts)
			container.removeEventListener('pointerdown', stopTour, opts)
		}
	}, [touring, editor, stopTour])

	return (
		<div className="sz-controls">
			<div className="sz-bar">
				<TldrawUiButton
					type="normal"
					onClick={() => {
						if (touring) {
							stopTour()
							return
						}
						cancelled.current = false
						setTouring(true)
						runGuidedDive(editor, layout, divePath, () => cancelled.current).finally(() =>
							setTouring(false)
						)
					}}
				>
					{touring ? 'Stop tour' : 'Guided tour'}
				</TldrawUiButton>
				<TldrawUiButton type="normal" onClick={() => frameRect(editor, layout.bounds)}>
					Zoom all the way out
				</TldrawUiButton>
				<input
					className="sz-search"
					value={query}
					placeholder="Search every level…"
					onChange={(e) => setQuery(e.currentTarget.value)}
				/>
				{corpus.links?.length ? <LinkToggle /> : null}
			</div>
			{hits.length > 0 && (
				<ul className="sz-hits">
					{hits.slice(0, 10).map((hit) => (
						<li key={hit.node.id}>
							<button onClick={() => goToNode(editor, layout, hit.node)}>
								<span className="sz-hit-where">{hit.node.title ?? `level ${hit.node.depth}`}</span>
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
export function createSemanticZoom(corpus: Corpus, opts?: { divePathTo?: string }) {
	const layout = layoutCorpus(corpus)
	const divePath = suggestDivePath(layout, opts?.divePathTo)

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
			return <Controls layout={layout} corpus={corpus} divePath={divePath} matches={matches} />
		},
	}

	return {
		layout,
		components,
		options: {
			camera: {
				// Reading a whole work end to end takes a couple of orders of
				// magnitude, and the default steps stop at 8x.
				zoomSteps: [0.25, 0.5, 1, 2, 4, 8, 16, 32, 64, 128, 256],
			},
		},
		onMount(editor: Editor) {
			editor.zoomToBounds(layout.bounds, { targetZoom: openingZoom(layout.nominals) })
		},
	}
}
