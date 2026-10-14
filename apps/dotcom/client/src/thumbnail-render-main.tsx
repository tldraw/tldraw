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

// SPIKE (#11096): a warm page. The worker loads this page once in a kept-alive browser and then
// calls this per job, so the bundle, fonts and stylesheet are paid for once rather than per render.
// Each job remounts the editor under a new key and resolves when the page reaches a terminal marker.
if (window.location.protocol === 'about:') {
	let jobCount = 0
	;(window as any).__tldrawRenderJob = (pushed: {
		records: any[]
		schema: any
		renderParams: any
	}): Promise<{ error: string | null; result: unknown; ms: number }> => {
		const startedAt = performance.now()
		for (const el of [document.body, document.documentElement]) {
			delete el.dataset.thumbnailReady
			delete el.dataset.thumbnailError
		}
		;(window as any).__TLDRAW_WARM__ = true
		;(window as any).__TLDRAW_RESULT__ = undefined
		root.render(
			<ThumbnailRenderBoundary key={++jobCount}>
				<ThumbnailRenderView
					data={{
						ok: true,
						token: '',
						records: pushed.records,
						schema: pushed.schema,
						renderParams: pushed.renderParams,
					}}
				/>
			</ThumbnailRenderBoundary>
		)
		return new Promise((resolve) => {
			const done = () => {
				const { thumbnailReady, thumbnailError } = document.body.dataset
				if (thumbnailReady !== 'true' && thumbnailError === undefined) return false
				observer.disconnect()
				resolve({
					error: thumbnailError ?? null,
					result: (window as any).__TLDRAW_RESULT__ ?? null,
					ms: performance.now() - startedAt,
				})
				return true
			}
			const observer = new MutationObserver(done)
			observer.observe(document.body, { attributes: true })
			done()
		})
	}
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
