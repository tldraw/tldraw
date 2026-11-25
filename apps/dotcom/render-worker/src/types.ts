import { AnalyticsEngineDataset } from '@cloudflare/workers-types'
import { SentryEnvironment } from '@tldraw/worker-shared'
import { HeadlessWorkerRpc } from './headlessShadow'

// The Browser Rendering binding's Quick Actions method, copied from sync-worker's BrowserBinding.
// Cloudflare exposes `env.BROWSER.quickAction` so a Worker can call the Quick Action endpoints
// straight through the binding — no @cloudflare/puppeteer, no API token. Requires
// compatibility_date >= 2026-03-24. Not in @cloudflare/workers-types yet, so the small surface used
// here is declared locally; it resolves to a standard `Response` (PNG bytes, with an
// `X-Browser-Ms-Used` header).
export interface BrowserBinding {
	quickAction(action: 'screenshot', options: unknown): Promise<Response>
}

export interface Environment extends SentryEnvironment {
	// Cloudflare Browser Rendering binding — the worker's production render path. Undefined under
	// `wrangler dev` (local dev has no route to Browser Run) and in tests; the render call fails
	// closed there unless LOCAL_SCREENSHOT_SERVICE_URL is set.
	BROWSER: BrowserBinding | undefined

	// The browser_run_session spend ledger and the screenshot shadow's render_shadow_compare, in the
	// same MEASURE dataset sync-worker uses. Neither carries board identity. Undefined in tests.
	MEASURE: AnalyticsEngineDataset | undefined

	// The headless editor's worker, for the screenshot shadow (headlessShadow.ts). Deployed separately
	// and bound on staging only; unbound, the shadow never runs.
	HEADLESS_WORKER: HeadlessWorkerRpc | undefined

	// Origin serving the render page (THUMBNAIL_RENDER_PATH): the app host where it is deployed
	// (a route there hands the page to this worker), the client's dev server in local dev. Set per environment in wrangler.toml.
	RENDER_PAGE_ORIGIN: string | undefined

	// Development only: a local HTTP screenshot service (the client dev server's Playwright endpoint)
	// to use instead of the BROWSER binding, which cannot reach Browser Run in local dev. Set in
	// [env.dev.vars]; unset everywhere else, which keeps deployed environments on the binding.
	LOCAL_SCREENSHOT_SERVICE_URL: string | undefined
}
