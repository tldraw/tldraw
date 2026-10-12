import { TLRecord } from '@tldraw/tlschema'
import { IRequest } from 'itty-router'
import { Environment, isDebugLogging } from '../../types'
import { ThumbnailRenderJob, renderParamsForJob } from '../../utils/renderTokens'
import { getSharedFileRoomSnapshot } from './getSharedFile'
import { sliceSnapshotForRender } from './sliceSnapshotForRender'

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

// Second spike: does a page sent as `html` (no URL, so a private worker could serve it) load the
// board's image assets? `fetch` and `sendBeacon` are known to be dropped in html mode; `<img>`,
// CSS backgrounds and `@font-face` are not yet tested.
//
// GET /api/app/__scrape-spike/run-images?mode=html|url[&img=<extra absolute url>...]
//   mode=url sends the same page by URL, as the control.

const PIXEL_PNG_BASE64 =
	'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8DwHwAFBQIAX8jx0gAAAABJRU5ErkJggg=='

export async function scrapeMeasureSpikePixel(_request: IRequest, env: Environment) {
	if (!isDebugLogging(env)) return new Response('Not Found', { status: 404 })
	const bytes = Uint8Array.from(atob(PIXEL_PNG_BASE64), (c) => c.charCodeAt(0))
	return new Response(bytes, {
		headers: { 'content-type': 'image/png', 'cache-control': 'no-store' },
	})
}

function imagesPage(probes: { name: string; url: string }[], fontUrl: string, fetchUrl: string) {
	return `<!doctype html><html><head><style>
@font-face { font-family: SpikeFont; src: url(${JSON.stringify(fontUrl)}) format('woff2'); }
#bg { width: 4px; height: 4px; }
</style></head><body><div id="bg"></div><script>
(async function () {
	const probes = ${JSON.stringify(probes)}
	const withTimeout = (promise, ms) =>
		Promise.race([promise, new Promise((resolve) => setTimeout(() => resolve('timeout'), ms))])
	const results = { origin: location.origin, href: location.href.slice(0, 80) }
	results.images = await Promise.all(
		probes.map(({ name, url }) =>
			withTimeout(
				new Promise((resolve) => {
					const img = new Image()
					img.onload = () => resolve({ name, outcome: 'load', width: img.naturalWidth })
					img.onerror = () => resolve({ name, outcome: 'error' })
					img.src = url
					document.body.appendChild(img)
				}),
				8000
			).then((r) => (r === 'timeout' ? { name, outcome: 'timeout' } : r))
		)
	)
	// The SDK exports images by fetching them into data URLs, so fetch matters as much as <img>.
	results.fetch = await withTimeout(
		fetch(${JSON.stringify(fetchUrl)}).then(
			(r) => 'status ' + r.status,
			(e) => 'error ' + e
		),
		8000
	)
	results.font = await withTimeout(
		document.fonts.load('16px SpikeFont').then(
			(faces) => 'faces ' + faces.length,
			(e) => 'error ' + e
		),
		8000
	)
	const bg = document.getElementById('bg')
	bg.style.backgroundImage = 'url(' + JSON.stringify(probes[0].url) + ')'
	results.cssBackground = getComputedStyle(bg).backgroundImage.slice(0, 60)
	document.body.replaceChildren()
	const pre = document.createElement('pre')
	pre.id = 'result'
	pre.textContent = JSON.stringify(results)
	document.body.appendChild(pre)
	document.body.dataset.thumbnailReady = 'true'
})()
</script></body></html>`
}

function imageProbesFor(url: URL) {
	const origin = url.origin
	return {
		probes: [
			{ name: 'data-uri', url: `data:image/png;base64,${PIXEL_PNG_BASE64}` },
			{ name: 'worker-origin', url: `${origin}/api/app/__scrape-spike/pixel.png?n=${Date.now()}` },
			{
				name: 'app-static',
				url: `https://pr-11096-preview-deploy.tldraw.com/social-og.png?n=${Date.now()}`,
			},
			{ name: 'third-party', url: `https://www.google.com/favicon.ico?n=${Date.now()}` },
			...url.searchParams.getAll('img').map((extra, i) => ({ name: `extra-${i}`, url: extra })),
		],
		fontUrl: 'https://pr-11096-preview-deploy.tldraw.com/Shantell_Sans-Tldrawish.woff2',
		fetchUrl: `${origin}/api/app/__scrape-spike/pixel.png?fetch=${Date.now()}`,
	}
}

export async function scrapeMeasureSpikeImagesPage(request: IRequest, env: Environment) {
	if (!isDebugLogging(env)) return new Response('Not Found', { status: 404 })
	const { probes, fontUrl, fetchUrl } = imageProbesFor(new URL(request.url))
	return new Response(imagesPage(probes, fontUrl, fetchUrl), {
		headers: { 'content-type': 'text/html; charset=utf-8' },
	})
}

export async function scrapeMeasureSpikeRunImages(request: IRequest, env: Environment) {
	if (!isDebugLogging(env)) return new Response('Not Found', { status: 404 })
	if (!env.BROWSER)
		return Response.json({ error: 'BROWSER binding not configured' }, { status: 500 })

	const url = new URL(request.url)
	const mode = url.searchParams.get('mode') === 'url' ? 'url' : 'html'
	const { probes, fontUrl, fetchUrl } = imageProbesFor(url)
	const allow = url.searchParams.getAll('allow')
	const reject = url.searchParams.getAll('reject')
	const pageUrl = new URL('/api/app/__scrape-spike/images-page', url.origin)
	for (const extra of url.searchParams.getAll('img')) pageUrl.searchParams.append('img', extra)
	const body = {
		...(mode === 'html'
			? { html: imagesPage(probes, fontUrl, fetchUrl) }
			: { url: pageUrl.toString() }),
		gotoOptions: { waitUntil: 'domcontentloaded', timeout: 30_000 },
		waitForSelector: { selector: '[data-thumbnail-ready="true"]', timeout: 30_000 },
		...(allow.length ? { allowRequestPattern: allow } : null),
		...(reject.length ? { rejectRequestPattern: reject } : null),
	}

	const startedAt = Date.now()
	let response: Response
	try {
		response = await env.BROWSER.quickAction('content', body)
	} catch (error) {
		return Response.json({ mode, allow, reject, threw: String(error), ms: Date.now() - startedAt })
	}
	const raw = await response.text()
	const report: Record<string, unknown> = {
		mode,
		allow,
		reject,
		status: response.status,
		ms: Date.now() - startedAt,
		browserMs: response.headers.get('X-Browser-Ms-Used'),
	}
	try {
		const html = String(JSON.parse(raw).result)
		const match = html.match(/<pre id="result">([\s\S]*?)<\/pre>/)
		const text = match?.[1].replace(/&quot;/g, '"').replace(/&amp;/g, '&')
		report.page = text ? JSON.parse(text) : { htmlHead: html.slice(0, 500) }
	} catch (error) {
		report.parseError = String(error)
		report.rawHead = raw.slice(0, 500)
	}
	return Response.json(report)
}

// Third spike batch.
//
// GET /api/app/__scrape-spike/uploads?prefix=&limit=  read-only listing of UPLOADS, to find an
//   image to push through image-resize-worker's service-binding path.
// GET /api/app/__scrape-spike/run-snapshot?selector=0|1&mode=url|html
//   the `snapshot` quick action, which returns HTML and a screenshot in one call: can screenshots
//   carry their timings out in the HTML instead of a beacon?
// /run-images also takes allow=<regex> / reject=<regex> (repeatable), passed to Browser Run as
//   allowRequestPattern / rejectRequestPattern: can request filtering lock an html-mode page down?

export async function scrapeMeasureSpikeUploads(request: IRequest, env: Environment) {
	if (!isDebugLogging(env)) return new Response('Not Found', { status: 404 })
	const url = new URL(request.url)
	const listed = await env.UPLOADS.list({
		prefix: url.searchParams.get('prefix') || undefined,
		limit: Math.min(Number(url.searchParams.get('limit') || 50), 500),
	})
	return Response.json(
		listed.objects.map((o) => ({
			key: o.key,
			size: o.size,
			uploaded: o.uploaded,
		}))
	)
}

export async function scrapeMeasureSpikeRunSnapshot(request: IRequest, env: Environment) {
	if (!isDebugLogging(env)) return new Response('Not Found', { status: 404 })
	if (!env.BROWSER)
		return Response.json({ error: 'BROWSER binding not configured' }, { status: 500 })

	const url = new URL(request.url)
	const withSelector = url.searchParams.get('selector') !== '0'
	const mode = url.searchParams.get('mode') === 'html' ? 'html' : 'url'
	const nonce = crypto.randomUUID()
	// teardown=0: the screenshot needs something on the page, and the result element rides along.
	const pageUrl = `${url.origin}/api/app/__scrape-spike/page?bytes=700&teardown=0`
	// An html-mode page is about:blank, so its query string is baked in instead.
	const page =
		mode === 'html' ? PAGE.replace('location.search', `'?bytes=700&teardown=0'`) : undefined
	const body = {
		...(page ? { html: page } : { url: pageUrl }),
		addScriptTag: [{ content: `window.__SCRAPE_SPIKE__=${JSON.stringify({ nonce })}` }],
		viewport: { width: 400, height: 300, deviceScaleFactor: 1 },
		gotoOptions: { waitUntil: 'domcontentloaded', timeout: 30_000 },
		waitForSelector: { selector: '[data-thumbnail-ready="true"]', timeout: 30_000 },
		...(withSelector ? { selector: 'body[data-thumbnail-ready="true"]' } : null),
		screenshotOptions: { type: 'png' },
	}

	const startedAt = Date.now()
	let response: Response
	try {
		response = await env.BROWSER.quickAction('snapshot', body)
	} catch (error) {
		return Response.json({ mode, withSelector, threw: String(error), ms: Date.now() - startedAt })
	}
	const raw = await response.text()
	const report: Record<string, unknown> = {
		mode,
		withSelector,
		status: response.status,
		ms: Date.now() - startedAt,
		browserMs: response.headers.get('X-Browser-Ms-Used'),
		contentType: response.headers.get('content-type'),
		responseChars: raw.length,
	}
	try {
		const json = JSON.parse(raw)
		report.success = json.success
		report.errors = json.errors
		const result = json.result ?? {}
		report.resultKeys = Object.keys(result)
		const html = typeof result.content === 'string' ? result.content : ''
		const screenshot = typeof result.screenshot === 'string' ? result.screenshot : ''
		report.htmlChars = html.length
		report.resultInHtml = html.includes(nonce)
		report.screenshotBase64Chars = screenshot.length
		if (screenshot) {
			const bytes = Uint8Array.from(atob(screenshot.slice(0, 64)), (c) => c.charCodeAt(0))
			// PNG IHDR: width and height are big-endian at bytes 16..23.
			const view = new DataView(bytes.buffer)
			report.screenshotPng = bytes[1] === 0x50 && bytes[2] === 0x4e
			if (report.screenshotPng) {
				report.screenshotSize = `${view.getUint32(16)}x${view.getUint32(20)}`
			}
		}
	} catch (error) {
		report.parseError = String(error)
		report.rawHead = raw.slice(0, 500)
	}
	return Response.json(report)
}

// Fourth spike: the real render page, sent as `html` to the `snapshot` quick action.
//
// GET /api/app/__scrape-spike/run-real?slug=<file slug>[&capture=live][&embed=0][&lock=1][&out=png]
//   Reads the board, fetches the deployed render page's HTML and adds a <base> pointing at the app
//   origin (so its bundle, CSS and fonts load from there), embeds the rendered page's image assets as
//   data URIs resized through image-resize-worker, pushes the records in, and captures.
//   lock=1 allows only data:, blob: and the app origin. out=png returns the image itself.
//   Preview and dev only; skips the access checks a real surface applies.

export async function scrapeMeasureSpikeRunReal(request: IRequest, env: Environment) {
	if (!isDebugLogging(env)) return new Response('Not Found', { status: 404 })
	if (!env.BROWSER)
		return Response.json({ error: 'BROWSER binding not configured' }, { status: 500 })
	const url = new URL(request.url)
	const slug = url.searchParams.get('slug')
	if (!slug) return Response.json({ error: 'slug is required' }, { status: 400 })
	const capture = url.searchParams.get('capture') === 'live' ? 'live' : undefined
	const measure = url.searchParams.get('mode') === 'measure'
	// A measure draws nothing, so its assets are dead weight unless asked for.
	const embed = measure
		? url.searchParams.get('embed') === '1'
		: url.searchParams.get('embed') !== '0'
	const lock = url.searchParams.get('lock') === '1'
	const renderOrigin = url.searchParams.get('renderOrigin') || env.MCP_SCREENSHOT_RENDER_ORIGIN
	if (!renderOrigin) return Response.json({ error: 'no render origin' }, { status: 500 })
	const imageWorker =
		url.searchParams.get('imageWorker') ||
		renderOrigin.replace('-preview-deploy.tldraw.com', '-images.tldraw.xyz')
	const width = Number(url.searchParams.get('width') || 1200)
	const height = Number(url.searchParams.get('height') || 630)
	const report: Record<string, unknown> = {
		slug,
		mode: measure ? 'measure' : 'screenshot',
		capture: capture ?? 'export',
		embed,
		lock,
	}

	const snapshot = await getSharedFileRoomSnapshot(env, slug, { access: 'render' }).catch(
		(error) => {
			report.snapshotError = String(error)
			return undefined
		}
	)
	if (!snapshot?.documents) return Response.json(report, { status: 404 })
	let records = snapshot.documents.map((d) => d.state) as TLRecord[]
	const pageId = url.searchParams.get('pageId') || undefined
	const job: ThumbnailRenderJob = {
		v: 1,
		kind: 'shared_file',
		slug,
		access: 'render',
		version: 0,
		camera: 'content',
		...(pageId ? { pageId } : null),
		...(capture ? { capture } : null),
		...(measure ? { mode: 'measure' as const } : null),
		x: 0,
		y: 0,
		z: 1,
		width,
		height,
		theme: 'light',
		exp: Date.now() + 60_000,
	}
	records = sliceSnapshotForRender(records, job) ?? records
	report.records = records.length

	// Images only: the thumbnail is at most a few hundred pixels across, so 1200 wide is plenty.
	const assetsReport: unknown[] = []
	if (embed) {
		records = await Promise.all(
			records.map(async (record) => {
				const asset = record as TLRecord & { type?: string; props?: { src?: string | null } }
				const src = asset.props?.src
				if (record.typeName !== 'asset' || asset.type !== 'image' || !src?.startsWith('http')) {
					return record
				}
				const resizeUrl = `${imageWorker}/${src.replace(/^https?:\/\//, '')}?w=1200`
				const response = await fetch(resizeUrl, { headers: { Accept: 'image/webp' } })
				const contentType = response.headers.get('content-type') ?? ''
				if (!response.ok || !contentType.startsWith('image/')) {
					assetsReport.push({ src, status: response.status, contentType })
					return record
				}
				const bytes = new Uint8Array(await response.arrayBuffer())
				let binary = ''
				for (let i = 0; i < bytes.length; i += 0x8000) {
					binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000))
				}
				const dataUri = `data:${contentType};base64,${btoa(binary)}`
				assetsReport.push({ src, bytes: bytes.length, contentType, dataUriChars: dataUri.length })
				return { ...asset, props: { ...asset.props, src: dataUri } } as TLRecord
			})
		)
	}
	report.assets = assetsReport

	const pageResponse = await fetch(`${renderOrigin}/__thumbnail-render`)
	let html = await pageResponse.text()
	report.renderPage = { status: pageResponse.status, chars: html.length }
	html = html.replace(/<head([^>]*)>/i, (head) => `${head}<base href="${renderOrigin}/">`)

	const push = `window.__TLDRAW_RENDER__=${JSON.stringify({
		error: false,
		records,
		schema: snapshot.schema,
		renderParams: renderParamsForJob(job),
	})}`
	report.pushChars = push.length

	const escaped = renderOrigin.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
	const body = {
		html,
		addScriptTag: [{ content: push }],
		viewport: { width, height, deviceScaleFactor: 1 },
		gotoOptions: { waitUntil: 'domcontentloaded', timeout: 45_000 },
		waitForSelector: {
			selector: '[data-thumbnail-ready="true"], [data-thumbnail-error]',
			timeout: 45_000,
		},
		...(lock ? { allowRequestPattern: ['^data:.*', '^blob:.*', `^${escaped}/.*`] } : null),
		screenshotOptions: { type: 'png' },
	}

	if (measure) return runRealMeasure(env, body, records, report)

	const startedAt = Date.now()
	let response: Response
	try {
		response = await env.BROWSER.quickAction('snapshot', body)
	} catch (error) {
		return Response.json({ ...report, threw: String(error), ms: Date.now() - startedAt })
	}
	report.status = response.status
	report.ms = Date.now() - startedAt
	report.browserMs = response.headers.get('X-Browser-Ms-Used')
	const raw = await response.text()
	let json: any
	try {
		json = JSON.parse(raw)
	} catch {
		return Response.json({ ...report, rawHead: raw.slice(0, 500) })
	}
	if (!json.success) return Response.json({ ...report, errors: json.errors })
	const content: string = json.result?.content ?? ''
	const screenshot: string = json.result?.screenshot ?? ''
	report.htmlChars = content.length
	report.ready = /<body[^>]*data-thumbnail-ready="true"/.test(content)
	report.error = content.match(/<body[^>]*data-thumbnail-error="([^"]*)"/)?.[1]
	report.screenshotBase64Chars = screenshot.length
	if (url.searchParams.get('out') === 'png' && screenshot) {
		return new Response(
			Uint8Array.from(atob(screenshot), (c) => c.charCodeAt(0)),
			{
				headers: {
					'content-type': 'image/png',
					'x-spike-report': JSON.stringify(report).slice(0, 4000),
				},
			}
		)
	}
	return Response.json(report)
}

function decodeHtmlText(text: string) {
	return text.replace(/&(lt|gt|amp|quot|nbsp|#39);/g, (_, entity: string) =>
		entity === 'lt'
			? '<'
			: entity === 'gt'
				? '>'
				: entity === 'amp'
					? '&'
					: entity === 'quot'
						? '"'
						: entity === 'nbsp'
							? '\u00a0'
							: "'"
	)
}

// The measure half of run-real: the same page and push, through `content`, with the bounds read
// back out of the cleared page. Checked against what the records themselves say for every unrotated
// shape with a stored size, which the page's geometry must agree with.
async function runRealMeasure(
	env: Environment,
	body: Record<string, unknown>,
	records: TLRecord[],
	report: Record<string, unknown>
) {
	const { screenshotOptions: _, viewport: __, ...contentBody } = body as any
	const startedAt = Date.now()
	let response: Response
	try {
		response = await env.BROWSER!.quickAction('content', {
			...contentBody,
			viewport: { width: 1200, height: 630, deviceScaleFactor: 1 },
		})
	} catch (error) {
		return Response.json({ ...report, threw: String(error), ms: Date.now() - startedAt })
	}
	report.status = response.status
	report.ms = Date.now() - startedAt
	report.browserMs = response.headers.get('X-Browser-Ms-Used')
	const raw = await response.text()
	report.responseChars = raw.length
	let html: string
	try {
		const json = JSON.parse(raw)
		if (!json.success) return Response.json({ ...report, errors: json.errors })
		html = String(json.result)
	} catch {
		return Response.json({ ...report, rawHead: raw.slice(0, 500) })
	}
	report.htmlChars = html.length
	report.ready = /<body[^>]*data-thumbnail-ready="true"/.test(html)
	report.error = html.match(/<body[^>]*data-thumbnail-error="([^"]*)"/)?.[1]
	const match = html.match(/<pre id="thumbnail-result">([\s\S]*?)<\/pre>/)
	if (!match) return Response.json({ ...report, htmlHead: html.slice(0, 800) })
	report.overheadChars = html.length - match[1].length
	report.pushEchoed = html.includes('__TLDRAW_RENDER__')
	const result = JSON.parse(decodeHtmlText(match[1])) as {
		bounds: Record<string, { x: number; y: number; w: number; h: number; text?: string }>
		timings: Record<string, number>
	}
	report.timings = result.timings
	const shapes = records.filter((r) => r.typeName === 'shape') as any[]
	report.shapesInRecords = shapes.length
	report.shapesMeasured = Object.keys(result.bounds).length
	report.texts = Object.values(result.bounds)
		.map((b) => b.text)
		.filter(Boolean)
	report.checks = shapes
		.filter(
			(shape) =>
				shape.rotation === 0 &&
				shape.parentId?.startsWith('page:') &&
				typeof shape.props?.w === 'number' &&
				typeof shape.props?.h === 'number'
		)
		.map((shape) => {
			const b = result.bounds[shape.id]
			const scale = typeof shape.props.scale === 'number' ? shape.props.scale : 1
			return {
				type: shape.type,
				stored: [shape.x, shape.y, shape.props.w * scale, shape.props.h * scale].map(Math.round),
				measured: b ? [b.x, b.y, b.w, b.h].map(Math.round) : null,
			}
		})
	return Response.json(report)
}
