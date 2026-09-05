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

// The dedicated entry for the thumbnail render page (see thumbnail-render.html). Everything the SPA
// boots before its router — Sentry, Clerk and its CDN fetch, Helmet, the service worker — is
// deliberately absent: a capture pays for this entry's load on every render, and none of that can
// appear in the pixels. What must match the app exactly (the SDK build, tldraw.css, assetUrls,
// embed shape utils, the license key) is imported by the page module itself.

// Every failure this page can have must end in a terminal marker: a page with neither
// data-thumbnail-ready nor data-thumbnail-error burns the whole Browser Run timeout instead of
// failing the capture in milliseconds. The SPA route this replaced sat under the router's error
// boundary; this boundary and the window handlers below are what stand in for it.
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

window.addEventListener('error', (event) => setThumbnailError(event.message || 'Uncaught error'))
window.addEventListener('unhandledrejection', (event) => {
	const reason = event.reason
	setThumbnailError(reason instanceof Error ? reason.message : String(reason))
})

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
