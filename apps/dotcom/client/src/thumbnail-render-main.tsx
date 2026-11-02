import { Component, ReactNode } from 'react'
import { Root, createRoot } from 'react-dom/client'
// The full app stylesheet, not a subset: the render page's job is to look exactly like the app,
// and hand-picking "the rules that reach the canvas" is how a fidelity bug ships. CSS is inert
// without the DOM that matches it, so the unused majority costs bytes, not correctness.
import '../styles/globals.css'
import {
	ThumbnailPushedSnapshot,
	ThumbnailRenderData,
	ThumbnailRenderView,
	acquireThumbnailRenderData,
	setThumbnailError,
} from './pages/thumbnail-render'

// Everything the SPA boots before its router — Sentry, Clerk and its CDN fetch, Helmet, the
// service worker — is deliberately absent: a capture pays for this entry's load on every render,
// and none of it can appear in the pixels.
//
// A render failure must end in a terminal marker: a page with neither data-thumbnail-ready nor
// data-thumbnail-error burns the whole Browser Run timeout instead of failing the capture in
// milliseconds. The SPA route this replaced sat under the router's error boundary; this boundary
// (and the ErrorFallback override inside <Tldraw>) stands in for it. Deliberately no window-level
// error or unhandledrejection handler: those fire on benign noise — a ResizeObserver loop as the
// editor mounts and the camera fits — and would fail a capture that was about to succeed.
class ThumbnailRenderBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
	state = { failed: false }
	static getDerivedStateFromError() {
		return { failed: true }
	}
	componentDidCatch(error: unknown) {
		setThumbnailError(error instanceof Error ? error.message : String(error))
	}
	render() {
		return this.state.failed ? null : this.props.children
	}
}

// Keyed so a rerender remounts the view (and the boundary, clearing a prior failure) rather than
// reconciling into the old editor — a fresh <Tldraw>, snapshot, camera fit and export each time.
let root: Root | null = null
let rootContainer: HTMLElement | null = null
let renderSeq = 0
function renderData(data: ThumbnailRenderData) {
	renderSeq++
	// A completed measure wipes <body> (publishMeasureResult, to keep the /content response small),
	// which removes #root. For warm reuse we recreate the container and a fresh root when that has
	// happened, so the next board mounts cleanly instead of rendering into a detached node.
	let container = document.getElementById('root')
	if (!container) {
		container = document.createElement('div')
		container.id = 'root'
		document.body.replaceChildren(container)
	}
	if (container !== rootContainer) {
		rootContainer = container
		root = createRoot(container)
	}
	root!.render(
		<ThumbnailRenderBoundary key={renderSeq}>
			<ThumbnailRenderView data={data} />
		</ThumbnailRenderBoundary>
	)
}

// Spike (driev/spike-hot-browser): let a warm, already-booted render page draw another board with no
// reload, so the hot-browser probe can reuse one page across renders and skip the page/editor boot.
// The worker pushes a new snapshot body (screenshot or measure mode) and calls this; we clear the
// terminal markers and remount the view, which re-runs the render (fit+export, or the measure) and
// re-signals data-thumbnail-ready. Inert when never called, so it is harmless on any build that ships it.
declare global {
	interface Window {
		__tldrawRerender?(body: ThumbnailPushedSnapshot): void
	}
}
window.__tldrawRerender = (body) => {
	for (const el of [document.body, document.documentElement]) {
		delete el.dataset.thumbnailReady
		delete el.dataset.thumbnailError
	}
	renderData({
		ok: true,
		token: '(warm)',
		records: body.records,
		schema: body.schema,
		renderParams: body.renderParams,
	})
}

async function boot() {
	renderData(await acquireThumbnailRenderData(new URL(window.location.href)))
}

// A rejected acquisition — a 200 whose body fails to parse, an unforeseen throw — reaches the error
// marker through the same view as any other failure.
boot().catch((error) => {
	renderData({ ok: false, message: error instanceof Error ? error.message : String(error) })
})
