import { Component, ReactNode } from 'react'
import { createRoot } from 'react-dom/client'
// The full app stylesheet, not a subset: the render page's job is to look exactly like the app,
// and hand-picking "the rules that reach the canvas" is how a fidelity bug ships. CSS is inert
// without the DOM that matches it, so the unused majority costs bytes, not correctness.
import '../styles/globals.css'
import {
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

const root = createRoot(document.getElementById('root')!)

async function boot() {
	const data = await acquireThumbnailRenderData(new URL(window.location.href))
	root.render(
		<ThumbnailRenderBoundary>
			<ThumbnailRenderView data={data} />
		</ThumbnailRenderBoundary>
	)
}

// A rejected acquisition — a 200 whose body fails to parse, an unforeseen throw — reaches the error
// marker through the same view as any other failure.
boot().catch((error) => {
	root.render(
		<ThumbnailRenderView
			data={{ ok: false, message: error instanceof Error ? error.message : String(error) }}
		/>
	)
})
