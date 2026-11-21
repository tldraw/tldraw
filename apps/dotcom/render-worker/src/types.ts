import { AnalyticsEngineDataset } from '@cloudflare/workers-types'
import { SentryEnvironment } from '@tldraw/worker-shared'

// The Browser Rendering binding's Quick Actions method, copied from sync-worker's BrowserBinding.
// Cloudflare exposes `env.BROWSER.quickAction` so a Worker can call the Quick Action endpoints
// (`screenshot`, `content`, …) straight through the binding — no @cloudflare/puppeteer, no API
// token. Requires compatibility_date >= 2026-03-24. Not in @cloudflare/workers-types yet, so the
// small surface used here is declared locally; it resolves to a standard `Response` (PNG bytes for
// `screenshot`, `{ success, result: "<html>…" }` JSON for `content`, with an `X-Browser-Ms-Used`
// header).
export interface BrowserBinding {
	quickAction(action: 'screenshot' | 'content', options: unknown): Promise<Response>
}

export interface Environment extends SentryEnvironment {
	// Cloudflare Browser Rendering binding — the worker's production render path. Undefined under
	// `wrangler dev` (local dev has no route to Browser Run) and in tests; the render call fails
	// closed there unless LOCAL_SCREENSHOT_SERVICE_URL is set.
	BROWSER: BrowserBinding | undefined

	// The browser_run_session spend ledger — the one event this worker writes, to the same MEASURE
	// dataset sync-worker uses. Carries no board identity, only the session's numbers. Undefined in
	// tests.
	MEASURE: AnalyticsEngineDataset | undefined

	// Origin serving the render page (THUMBNAIL_RENDER_PATH). For now the client origin, same as
	// sync-worker's MCP_SCREENSHOT_RENDER_ORIGIN; the worker-owned render page is a later step. Set
	// per environment in wrangler.toml.
	RENDER_PAGE_ORIGIN: string | undefined

	// Development only: a local HTTP screenshot service (the client dev server's Playwright endpoint)
	// to use instead of the BROWSER binding, which cannot reach Browser Run in local dev. Set in
	// [env.dev.vars]; unset everywhere else, which keeps deployed environments on the binding.
	LOCAL_SCREENSHOT_SERVICE_URL: string | undefined
}
