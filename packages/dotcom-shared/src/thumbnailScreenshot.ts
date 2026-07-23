// The Browser Rendering `/screenshot` request contract shared by the sync-worker's thumbnail
// captures (thumbnailRender.ts, via the BROWSER binding's Quick Action) and the dev capture script
// (apps/dotcom/client/scripts/browser-run-thumbnail.ts, via the REST API). Both drive the same
// render pages, so the wait strategy, terminal selectors, and capture target live here — one place
// — and the local harness can't drift from production.

// The render page marks a terminal state on <body>/<html>: success sets data-thumbnail-ready once
// the exported image has painted; any failure (bad token, snapshot load, export, or image decode)
// sets data-thumbnail-error. The screenshot wait resolves on EITHER, so a failed render returns as
// soon as it errors instead of burning the whole render timeout holding scarce Browser Run
// capacity.
export const THUMBNAIL_SETTLED_SELECTOR = '[data-thumbnail-ready="true"], [data-thumbnail-error]'
// The element the screenshot actually captures. It exists only on the success path, so when the
// wait above resolves on a failure there is nothing to screenshot and the capture returns an error
// immediately (surfaced as a render failure) rather than capturing the error page. Scoped to
// <body> so it resolves to a single element (both <html> and <body> carry the ready marker).
export const THUMBNAIL_CAPTURE_SELECTOR = 'body[data-thumbnail-ready="true"]'

// Builds the `/screenshot` request body. `timeoutMs` bounds both navigation and the settle+export
// wait; the render page sizes its own settle budget under it (THUMBNAIL_SETTLE_TIMEOUT_MS), so pass
// THUMBNAIL_RENDER_TIMEOUT_MS to keep the two deadlines from drifting.
export function getThumbnailScreenshotRequestBody({
	renderUrl,
	width,
	height,
	timeoutMs,
}: {
	renderUrl: string
	width: number
	height: number
	timeoutMs: number
}) {
	const headers = getThumbnailScreenshotExtraHeaders(renderUrl)
	return {
		url: renderUrl,
		...(headers ? { setExtraHTTPHeaders: headers } : null),
		viewport: {
			width,
			height,
			deviceScaleFactor: 1,
		},
		// Waiting for a terminal selector is the real completion signal; waiting on network activity is
		// fragile because background app requests (e.g. replicator-status polling) can keep the network
		// busy indefinitely. `load` is a milder form of that same trap, so it stops here at
		// domcontentloaded: `load` does not fire until every subresource settles, and one stalled image
		// request is enough to hold it open until this timeout — at which point the capture fails
		// without ever reaching the waitForSelector below, even though the page had marked itself ready
		// long before. A board whose bookmark preview image points back at that board's own OG image
		// route does exactly this. Nothing is lost by not waiting for `load`: the render page's settle
		// wait (THUMBNAIL_SETTLE_TIMEOUT_MS) and the SDK's asset-inlining delay (maxExportDelayMs) are
		// separately bounded, so the page reaches a terminal state on its own schedule regardless.
		gotoOptions: {
			waitUntil: 'domcontentloaded',
			timeout: timeoutMs,
		},
		// Resolve as soon as the render page reaches either terminal state (ready or error), so a
		// failed render doesn't hold Browser Run capacity for the full timeout.
		waitForSelector: {
			selector: THUMBNAIL_SETTLED_SELECTOR,
			timeout: timeoutMs,
		},
		// Capture the success-only element (it fills the viewport, so this matches a full-viewport
		// screenshot). On a failure it's absent, so the capture errors out immediately instead of
		// screenshotting the error page. `selector` targets an element without waiting (waitForSelector
		// above is the wait), so a missing element fails fast rather than re-waiting the timeout.
		selector: THUMBNAIL_CAPTURE_SELECTOR,
		screenshotOptions: {
			type: 'png',
		},
	}
}

function getThumbnailScreenshotExtraHeaders(renderUrl: string) {
	const { hostname } = new URL(renderUrl)
	if (hostname.endsWith('.ngrok-free.dev')) {
		return {
			'ngrok-skip-browser-warning': 'true',
		}
	}
	return null
}
