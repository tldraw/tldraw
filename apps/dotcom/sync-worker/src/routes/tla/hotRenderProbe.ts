// Spike (driev/spike-hot-browser): a preview-only benchmark for keeping a Browser Run session + page
// warm across renders, instead of the pipeline's one cold Quick Action per render. It drives the same
// render page as the real pipeline through the `window.__tldrawRerender` hook (see
// thumbnail-render-main.tsx), so a warm page skips the browser launch AND the page/editor/font boot —
// most of a cold measure's time (see ThumbnailMeasureSignal: boot + waitForFonts dominate, the bounds
// read is cheap).
//
// Not wired into the OG/MCP paths. Gated on BROWSER_RUN_HOT_PROBE (previews only) and a bearer token.
// Uses @cloudflare/puppeteer Browser Sessions — the default Chromium, not Quick Actions.

import puppeteer from '@cloudflare/puppeteer'
import {
	DEFAULT_THUMBNAIL_HEIGHT,
	DEFAULT_THUMBNAIL_WIDTH,
	THUMBNAIL_RENDER_PATH,
	THUMBNAIL_RENDER_TIMEOUT_MS,
} from '@tldraw/dotcom-shared'
import { RoomSnapshot } from '@tldraw/sync-core'
import { THUMBNAIL_RENDER_TOKEN_TTL_MS } from '../../config'
import { Environment, ThumbnailBoardKind, envFlagWord } from '../../types'
import { ThumbnailRenderJob } from '../../utils/renderTokens'
import { loadDefaultWelcomeSnapshot } from '../../welcome/defaultWelcomeSnapshot'
import { thumbnailSnapshotBodyFor } from './getThumbnailSnapshot'
import { loadBoardSnapshot, resolveThumbnailBoard } from './thumbnailRender'

// Chromium sessions close after this long idle (the binding's max). A real "always on" setup would
// heartbeat inside it; the benchmark just needs the session alive between back-to-back calls.
const KEEP_ALIVE_MS = 20 * 60 * 1000

const HOOK_READY = 'typeof window.__tldrawRerender === "function"'
const READY_SELECTOR = '[data-thumbnail-ready="true"]'

export async function handleHotRenderProbe(request: Request, env: Environment): Promise<Response> {
	// The gate is the preview-only flag plus public-access resolution: the route exists only on previews
	// (isolated, ephemeral), defaults to the built-in welcome board, and resolves any requested board
	// under access:'public'. No bearer, so the benchmark is self-serve.
	if (envFlagWord(env.BROWSER_RUN_HOT_PROBE) !== 'true') {
		return new Response('hot render probe is not enabled', { status: 404 })
	}
	if (!env.BROWSER) return Response.json({ error: 'no BROWSER binding' }, { status: 500 })
	if (!env.MCP_SCREENSHOT_RENDER_ORIGIN) {
		return Response.json({ error: 'no MCP_SCREENSHOT_RENDER_ORIGIN' }, { status: 500 })
	}

	const input = (await request.json().catch(() => ({}))) as {
		slug?: string
		kind?: ThumbnailBoardKind
		mode?: 'measure' | 'screenshot'
		iterations?: number
	}
	const mode = input.mode ?? 'measure'
	const iterations = Math.min(Math.max(input.iterations ?? 3, 1), 10)

	// The benchmark board: a provided slug (resolved under the public gate), or — by default — the
	// committed welcome RoomSnapshot (~142 shapes, text and assets: representative, and needs no seeded
	// DB board on a fresh preview). Either way the push body is built by the real pipeline's function,
	// so the warm render draws exactly what a cold one would.
	let snapshot: RoomSnapshot | null
	let boardRef: {
		kind: ThumbnailBoardKind
		slug: string
		version: string | number
		access: 'public'
	}
	if (input.slug) {
		const resolved = await resolveThumbnailBoard(env, input.kind ?? 'shared_file', input.slug, {
			access: 'public',
		})
		if (!resolved.ok) return Response.json({ error: resolved.reason }, { status: 404 })
		snapshot = await loadBoardSnapshot(env, resolved.board, { access: resolved.board.access })
		boardRef = {
			kind: resolved.board.kind,
			slug: resolved.board.slug,
			version: resolved.board.version,
			access: 'public',
		}
	} else {
		snapshot = await loadDefaultWelcomeSnapshot(env)
		boardRef = { kind: 'shared_file', slug: 'welcome', version: 'welcome', access: 'public' }
	}
	if (!snapshot) return Response.json({ error: 'empty board' }, { status: 404 })

	const job: ThumbnailRenderJob = {
		v: 1,
		kind: boardRef.kind,
		slug: boardRef.slug,
		version: boardRef.version,
		access: boardRef.access,
		surface: 'mcp',
		...(mode === 'measure'
			? { mode: 'measure', pageId: firstPageId(snapshot) }
			: { camera: 'content' }),
		x: 0,
		y: 0,
		z: 1,
		width: DEFAULT_THUMBNAIL_WIDTH,
		height: DEFAULT_THUMBNAIL_HEIGHT,
		theme: 'light',
		exp: Date.now() + THUMBNAIL_RENDER_TOKEN_TTL_MS,
	}
	const pushBody = thumbnailSnapshotBodyFor(snapshot, job)
	if (pushBody.error) return Response.json({ error: pushBody.message }, { status: 400 })

	const renderUrl = new URL(THUMBNAIL_RENDER_PATH, env.MCP_SCREENSHOT_RENDER_ORIGIN).toString()
	// @cloudflare/puppeteer types the binding as its own BrowserWorker; ours declares only the Quick
	// Action surface. The binding is the same object either way.
	const binding = env.BROWSER as unknown as Parameters<typeof puppeteer.launch>[0]
	const now = () => Date.now()

	const out: Record<string, unknown> = { mode, board: boardRef.slug, iterations }

	// A single render through a given page: push the board, wait for the terminal ready marker.
	async function renderOnce(page: any) {
		const t0 = now()
		await page.evaluate((b: unknown) => (window as any).__tldrawRerender(b), pushBody)
		await page.waitForSelector(READY_SELECTOR, { timeout: THUMBNAIL_RENDER_TIMEOUT_MS })
		return now() - t0
	}
	async function bootPage(page: any) {
		await page.goto(renderUrl, {
			waitUntil: 'domcontentloaded',
			timeout: THUMBNAIL_RENDER_TIMEOUT_MS,
		})
		await page.waitForFunction(HOOK_READY, { timeout: THUMBNAIL_RENDER_TIMEOUT_MS })
	}

	// ---- COLD: a fresh browser + page + boot + one render, then close. The pipeline's per-render cost.
	try {
		const t0 = now()
		const b = await puppeteer.launch(binding)
		const page = await b.newPage()
		await bootPage(page)
		const bootMs = now() - t0
		const measureMs = await renderOnce(page)
		await b.close()
		out.cold = { totalMs: bootMs + measureMs, bootMs, renderMs: measureMs }
	} catch (e) {
		out.cold = { error: errText(e) }
	}

	// ---- WARM: reuse a live kept-alive session's booted page, or launch+boot one, then render N times.
	let browser: Awaited<ReturnType<typeof puppeteer.launch>> | undefined
	let reused = false
	try {
		const sessions = await puppeteer.sessions(binding).catch(() => [] as { sessionId: string }[])
		for (const s of sessions) {
			try {
				browser = await puppeteer.connect(binding, s.sessionId)
				reused = true
				break
			} catch {
				// session went away between listing and connecting; try the next
			}
		}
		if (!browser) browser = await puppeteer.launch(binding, { keep_alive: KEEP_ALIVE_MS })

		let page = (await browser.pages())[0]
		let warmBootMs = 0
		const hookReady =
			page &&
			(await page
				.evaluate(() => typeof (window as any).__tldrawRerender === 'function')
				.catch(() => false))
		if (!hookReady) {
			if (!page) page = await browser.newPage()
			const t0 = now()
			await bootPage(page)
			warmBootMs = now() - t0
		}

		const warm: number[] = []
		for (let i = 0; i < iterations; i++) warm.push(await renderOnce(page))

		out.warm = {
			reusedSession: reused,
			// 0 when the warm page was reused across calls — that is the whole point.
			pageBootMs: warmBootMs,
			renderMs: warm,
			sessionId: typeof browser.sessionId === 'function' ? browser.sessionId() : undefined,
		}
		if (mode === 'measure') {
			out.sampleMeasure = await page
				.evaluate(() => document.getElementById('tldraw-measure-result')?.textContent ?? null)
				.catch(() => null)
		}
		// Disconnect, do NOT close: the session stays warm for the next call.
		await browser.disconnect()
	} catch (e) {
		out.warm = { reusedSession: reused, error: errText(e) }
		try {
			await browser?.disconnect()
		} catch {
			// nothing to do
		}
	}

	return Response.json(out)
}

function firstPageId(snapshot: RoomSnapshot): string | undefined {
	for (const { state } of snapshot.documents) {
		const record = state as { typeName?: string; id?: string }
		if (record.typeName === 'page') return record.id
	}
	return undefined
}

function errText(e: unknown) {
	return e instanceof Error ? e.message : String(e)
}
