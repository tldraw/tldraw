import { IRequest } from 'itty-router'
import { Environment, isDebugLogging } from '../../types'

// SPIKE, not for merge. Can a measure's result come back through the `scrape` quick action instead
// of the render page POSTing it to /app/thumbnail-render/result?
//
// GET /api/app/__scrape-spike/page  stand-in render page: waits for a pushed global, writes fake
//                                   bounds JSON into #result, then sets the ready marker.
// GET /api/app/__scrape-spike/run?bytes=N&action=scrape|content
//                                   drives that page through env.BROWSER.quickAction and reports
//                                   whether the binding took the request, whether the push landed,
//                                   how much came back, and what it cost.
//
// Preview and dev only (isDebugLogging).

const PAGE = `<!doctype html><html><head></head><body><div id="editor"></div><script>
(function () {
	const params = new URLSearchParams(location.search)
	const bytes = Number(params.get('bytes') || 0)
	const teardown = params.get('teardown') !== '0'
	function done(pushed) {
		// Stand-in for the editor's DOM, which a real measure page carries: one node per shape.
		const editor = document.getElementById('editor')
		const bounds = {}
		for (let i = 0; i * 70 < bytes; i++) {
			bounds['shape:' + i] = { x: i, y: i * 2, w: 100.5, h: 50.25 }
			const node = document.createElement('div')
			node.className = 'tl-shape'
			node.textContent = 'shape ' + i
			editor.appendChild(node)
		}
		const result = JSON.stringify({ nonce: pushed.nonce, bounds })
		if (teardown) {
			// Measure mode only: everything but the answer goes before the ready marker, so /content
			// returns the bounds and not the pushed board or the editor DOM.
			for (const script of Array.from(document.scripts)) script.remove()
			document.head.replaceChildren()
			document.body.replaceChildren()
		}
		const pre = document.createElement('pre')
		pre.id = 'result'
		pre.textContent = result
		document.body.appendChild(pre)
		document.body.dataset.thumbnailReady = 'true'
	}
	if (window.__SCRAPE_SPIKE__) return done(window.__SCRAPE_SPIKE__)
	Object.defineProperty(window, '__SCRAPE_SPIKE__', { configurable: true, set: done, get: () => undefined })
})()
</script></body></html>`

export async function scrapeMeasureSpikePage(_request: IRequest, env: Environment) {
	if (!isDebugLogging(env)) return new Response('Not Found', { status: 404 })
	return new Response(PAGE, { headers: { 'content-type': 'text/html; charset=utf-8' } })
}

export async function scrapeMeasureSpikeRun(request: IRequest, env: Environment) {
	if (!isDebugLogging(env)) return new Response('Not Found', { status: 404 })
	if (!env.BROWSER)
		return Response.json({ error: 'BROWSER binding not configured' }, { status: 500 })

	const url = new URL(request.url)
	const action = url.searchParams.get('action') === 'content' ? 'content' : 'scrape'
	const bytes = Number(url.searchParams.get('bytes') || 1000)
	// Size of the filler pushed alongside the nonce, standing in for the board's records.
	const pushBytes = Number(url.searchParams.get('pushBytes') || 0)
	const teardown = url.searchParams.get('teardown') === '0' ? '0' : '1'
	// Overridable in case Browser Run cannot reach the host the request arrived on.
	const pageOrigin = url.searchParams.get('pageOrigin') || url.origin
	const pageUrl = `${pageOrigin}/api/app/__scrape-spike/page?bytes=${bytes}&teardown=${teardown}`
	const nonce = crypto.randomUUID()
	const body = {
		url: pageUrl,
		addScriptTag: [
			{
				content: `window.__SCRAPE_SPIKE__=${JSON.stringify({ nonce, records: 'R'.repeat(pushBytes) })}`,
			},
		],
		gotoOptions: { waitUntil: 'domcontentloaded', timeout: 30_000 },
		waitForSelector: { selector: '[data-thumbnail-ready="true"]', timeout: 30_000 },
		...(action === 'scrape' ? { elements: [{ selector: '#result' }] } : null),
	}

	const startedAt = Date.now()
	let response: Response
	try {
		response = await env.BROWSER.quickAction(action, body)
	} catch (error) {
		return Response.json({
			action,
			bytes,
			pageUrl,
			threw: String(error),
			ms: Date.now() - startedAt,
		})
	}
	const ms = Date.now() - startedAt
	const raw = await response.text()
	const report: Record<string, unknown> = {
		action,
		bytes,
		pushBytes,
		teardown,
		pageUrl,
		status: response.status,
		ms,
		browserMs: response.headers.get('X-Browser-Ms-Used'),
		responseChars: raw.length,
	}
	try {
		const json = JSON.parse(raw)
		report.success = json.success
		report.errors = json.errors
		if (action === 'scrape') {
			const first = json.result?.[0]?.results?.[0]
			const parsed = first?.text ? JSON.parse(first.text) : undefined
			report.resultKeys = Object.keys(first ?? {})
			report.pushLanded = parsed?.pushed?.nonce === nonce
			report.shapes = parsed ? Object.keys(parsed.bounds).length : undefined
		} else {
			const html = String(json.result)
			const match = html.match(/<pre id="result">([\s\S]*?)<\/pre>/)
			const text = match?.[1].replace(/&quot;/g, '"').replace(/&amp;/g, '&')
			const parsed = text ? JSON.parse(text) : undefined
			report.htmlChars = html.length
			report.resultChars = match?.[1].length
			report.overheadChars = match ? html.length - match[1].length : undefined
			report.pushLanded = parsed?.nonce === nonce
			report.shapes = parsed ? Object.keys(parsed.bounds).length : undefined
			report.pushEchoed = html.includes('__SCRAPE_SPIKE__')
			report.editorDomEchoed = html.includes('tl-shape')
			if (html.length < 2000) report.html = html
		}
	} catch (error) {
		report.parseError = String(error)
		report.rawHead = raw.slice(0, 500)
	}
	return Response.json(report)
}
