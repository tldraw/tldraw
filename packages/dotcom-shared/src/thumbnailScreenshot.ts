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
const THUMBNAIL_CAPTURE_SELECTOR = 'body[data-thumbnail-ready="true"]'

// Shared so the worker and the page cannot drift: a mismatched name is silent, the page just fetches.
export const THUMBNAIL_RENDER_GLOBAL = '__TLDRAW_RENDER__'

// Tells the page a push is coming. Without it every pull render would wait for a push that never
// lands. Set only by getThumbnailRenderRequestBase, alongside the script itself.
export const THUMBNAIL_RENDER_PUSH_PARAM = 'push'

// Where a measure page leaves its result for the worker's `/content` read. The page clears
// everything else first, so the response stays the size of the answer rather than of the push.
export const THUMBNAIL_MEASURE_RESULT_ID = 'tldraw-measure-result'

// Builds the `/screenshot` request body. `timeoutMs` is granted to navigation and to the
// settle+export wait *individually* — these are per-phase timers, not a cap on the call. They
// exist so Browser Run gives up on a dead page early; bounding the call as a whole is the
// sync-worker's job. The render page sizes its own settle budget under the same value
// (THUMBNAIL_SETTLE_TIMEOUT_MS), so pass THUMBNAIL_RENDER_TIMEOUT_MS to keep the deadlines from
// drifting.
export function getThumbnailScreenshotRequestBody({
	renderUrl,
	width,
	height,
	timeoutMs,
	injectedScript,
}: {
	renderUrl: string
	width: number
	height: number
	timeoutMs: number
	/** Run in the page after navigation; how the worker pushes the records in. */
	injectedScript?: string
}) {
	return {
		...getThumbnailRenderRequestBase({ renderUrl, width, height, timeoutMs, injectedScript }),
		// Capture the success-only element (it fills the viewport, so this matches a full-viewport
		// screenshot). On a failure it's absent, so the capture errors out immediately instead of
		// screenshotting the error page. `selector` targets an element without waiting (waitForSelector
		// is the wait), so a missing element fails fast rather than re-waiting the timeout.
		selector: THUMBNAIL_CAPTURE_SELECTOR,
		screenshotOptions: {
			type: 'png',
		},
	}
}

// Builds the `/content` request body for a measure. Same page, wait and timeouts as a screenshot;
// the answer is the page's HTML, read for THUMBNAIL_MEASURE_RESULT_ID or the error marker.
export function getThumbnailContentRequestBody(
	options: Parameters<typeof getThumbnailRenderRequestBase>[0]
) {
	return {
		...getThumbnailRenderRequestBase(options),
		// Browser Run caches quick action responses for a few seconds by default, keyed on the request.
		cacheTTL: 0,
	}
}

function getThumbnailRenderRequestBase({
	renderUrl,
	width,
	height,
	timeoutMs,
	injectedScript,
}: {
	renderUrl: string
	width: number
	height: number
	timeoutMs: number
	/** Run in the page after navigation; how the worker pushes the records in. */
	injectedScript?: string
}) {
	const url = new URL(renderUrl)
	if (injectedScript) url.searchParams.set(THUMBNAIL_RENDER_PUSH_PARAM, '1')
	const headers = getThumbnailScreenshotExtraHeaders(url.toString())
	return {
		url: url.toString(),
		...(headers ? { setExtraHTTPHeaders: headers } : null),
		...(injectedScript ? { addScriptTag: [{ content: injectedScript }] } : null),
		viewport: {
			width,
			height,
			deviceScaleFactor: 1,
		},
		// Waiting for a terminal selector is the real completion signal; waiting on network activity is
		// fragile because background app requests (e.g. feature-flag polling) can keep the network
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
