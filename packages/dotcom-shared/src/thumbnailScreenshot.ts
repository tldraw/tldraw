// The Browser Rendering `/screenshot` request contract, shared by the sync-worker's thumbnail
// captures (thumbnailRender.ts) and the dev capture script (apps/dotcom/client/scripts/
// browser-run-thumbnail.ts) so the local harness can't drift from production.

// The render page marks a terminal state on <body>/<html>: success sets data-thumbnail-ready once
// the exported image has painted; any failure sets data-thumbnail-error. Waiting on EITHER lets a
// failed render return as soon as it errors instead of holding scarce Browser Run capacity for the
// whole render timeout.
export const THUMBNAIL_SETTLED_SELECTOR = '[data-thumbnail-ready="true"], [data-thumbnail-error]'
// The captured element exists only on the success path, so a failed render errors out immediately
// rather than screenshotting the error page. Scoped to <body> so it resolves to a single element
// (both <html> and <body> carry the ready marker).
const THUMBNAIL_CAPTURE_SELECTOR = 'body[data-thumbnail-ready="true"]'

// `timeoutMs` bounds both navigation and the settle+export wait; the render page sizes its own
// settle budget under it (THUMBNAIL_SETTLE_TIMEOUT_MS), so pass THUMBNAIL_RENDER_TIMEOUT_MS to keep
// the two deadlines from drifting.
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
		// The terminal selector is the real completion signal. Not `load` (nor network idle): one
		// stalled subresource — e.g. a bookmark preview pointing at the board's own OG image route —
		// holds `load` open until this timeout, failing the capture before waitForSelector runs even
		// though the page marked itself ready long before. The render page's settle wait and the SDK's
		// asset-inlining delay are separately bounded, so it reaches a terminal state regardless.
		gotoOptions: {
			waitUntil: 'domcontentloaded',
			timeout: timeoutMs,
		},
		waitForSelector: {
			selector: THUMBNAIL_SETTLED_SELECTOR,
			timeout: timeoutMs,
		},
		// `selector` targets without waiting (waitForSelector above is the wait), so a missing element
		// fails fast rather than re-waiting the timeout.
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
