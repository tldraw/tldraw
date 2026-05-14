/* eslint-disable no-console */
// HTTP server: status page + resync, tldraw webhook intake, and per-provider
// incoming webhook routing.

import { createHmac, timingSafeEqual } from 'node:crypto'
import { createServer, IncomingMessage, ServerResponse } from 'node:http'

import { config } from './config'
import { tldrawWebhookSecrets } from './tldraw'
import {
	clearArrowState,
	findEntity,
	handleBindingCreated,
	handleBindingDeleted,
	listAdapters,
	wiredArrowIds,
} from './arrows'
import type { IncomingWebhookContext, TldrawShape } from './types'

// Per-provider verification secrets the server needs to know about. The
// GitHub adapter declares its secret; other adapters will too.
import { GITHUB_WEBHOOK_SECRET_FOR_VERIFY } from './adapters/github'

interface TldrawWebhookEnvelope {
	event: string
	fileSlug: string
	timestamp: number
	data: {
		shape?: TldrawShape
		previous?: TldrawShape
		changed?: string[]
		shapeId?: string
		binding?: {
			id: string
			fromId: string
			toId: string
			type: string
			props: { terminal?: 'start' | 'end' }
		}
		bindingId?: string
	}
}

function verifyTldraw(
	body: string,
	signatureHeader: string | undefined,
	webhookId: string | undefined
): boolean {
	if (!signatureHeader || !webhookId) return false
	const secret = tldrawWebhookSecrets.get(webhookId)
	if (!secret) return false
	const expected = createHmac('sha256', secret).update(body).digest('hex')
	const received = signatureHeader.replace(/^sha256=/, '')
	if (expected.length !== received.length) return false
	return timingSafeEqual(Buffer.from(expected, 'hex'), Buffer.from(received, 'hex'))
}

function verifyGithub(body: string, header: string | undefined): boolean {
	if (!header) return false
	const expected =
		'sha256=' + createHmac('sha256', GITHUB_WEBHOOK_SECRET_FOR_VERIFY).update(body).digest('hex')
	if (expected.length !== header.length) return false
	return timingSafeEqual(Buffer.from(expected), Buffer.from(header))
}

async function readBody(req: IncomingMessage): Promise<string> {
	return new Promise((resolve) => {
		let body = ''
		req.on('data', (chunk) => (body += chunk))
		req.on('end', () => resolve(body))
	})
}

function reply(res: ServerResponse, code: number, body: string) {
	res.writeHead(code, { 'Content-Type': 'text/plain' })
	res.end(body)
}

// Resync state — single global flag, all adapters cleared in parallel.
let resyncing = false
async function runResync() {
	if (resyncing) return console.log('resync already running')
	resyncing = true
	try {
		clearArrowState()
		await Promise.all(listAdapters().map((a) => a.resync()))
		console.log('resync complete')
	} finally {
		resyncing = false
	}
}

function statusPageHtml(): string {
	const adapters = listAdapters()
	const rows = adapters
		.map(
			(a) =>
				`<tr><td>${a.providerId}</td><td>${a.ownedShapeIds().length}</td></tr>`
		)
		.join('')
	const arrows = wiredArrowIds().length
	return `<!doctype html>
<html><head><meta charset="utf-8"><title>gh-sync</title>
<style>
  :root{--bg:#fafafa;--surface:#fff;--border:#000;--muted:#5c5c61;--accent:#22c55e}
  body{font:500 12px/1.4 Inter,-apple-system,system-ui,sans-serif;background:var(--bg);color:#000;padding:24px;max-width:480px;margin:0 auto}
  h1{font-size:14px;font-weight:600;margin:0 0 16px}
  .card{background:var(--surface);border:1px solid var(--border);border-radius:3px;padding:16px;box-shadow:2px 3px 0 0 rgba(0,0,0,.2);margin-bottom:12px}
  table{width:100%;border-collapse:collapse;margin-bottom:12px}
  th,td{text-align:left;padding:4px 0;font-size:12px;border-bottom:1px solid #efefef}
  th{font-weight:600;text-transform:uppercase;font-size:9px;color:var(--muted)}
  button{font:600 12px/1 Inter,sans-serif;background:var(--accent);color:#000;border:1px solid var(--border);border-radius:3px;padding:10px 14px;cursor:pointer;box-shadow:2px 3px 0 0 rgba(0,0,0,.2)}
  button:active{transform:translate(2px,3px);box-shadow:none}
  button:disabled{opacity:.5;cursor:wait}
  small{color:var(--muted);font-size:10px}
</style></head><body>
<h1>gh-sync</h1>
<div class="card">
  <table>
    <thead><tr><th>Provider</th><th>Shapes</th></tr></thead>
    <tbody>${rows}<tr><td>arrows (linked)</td><td>${arrows}</td></tr></tbody>
  </table>
  <button id="resync">Resync everything</button>
  <small id="msg" style="margin-left:8px"></small>
</div>
<small>File: ${config.tldrFileSlug}</small>
<script>
const btn = document.getElementById('resync'), msg = document.getElementById('msg');
btn.addEventListener('click', async () => {
  btn.disabled = true; msg.textContent = 'wiping + re-pulling…';
  try {
    const r = await fetch('/resync', { method: 'POST' });
    msg.textContent = r.ok ? 'started — refresh in a few seconds' : 'failed: ' + r.status;
  } catch (e) { msg.textContent = 'error: ' + e.message }
  setTimeout(() => location.reload(), 5000);
});
</script></body></html>`
}

async function handle(req: IncomingMessage, res: ServerResponse) {
	const body = await readBody(req)
	try {
		if (req.url === '/' && (req.method === 'GET' || req.method === 'HEAD')) {
			res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' })
			res.end(statusPageHtml())
			return
		}

		if (req.url === '/resync' && req.method === 'POST') {
			console.log('resync requested')
			void runResync().catch((e) => console.error('resync failed:', e))
			return reply(res, 202, 'resync started')
		}

		if (req.url === '/tldraw-webhook') {
			const ok = verifyTldraw(
				body,
				req.headers['x-tldraw-signature'] as string,
				req.headers['x-tldraw-webhook-id'] as string
			)
			if (!ok) return reply(res, 401, 'invalid signature')
			const env = JSON.parse(body) as TldrawWebhookEnvelope
			if (env.event === 'shape.updated' && env.data.shape) {
				const hit = findEntity(env.data.shape.id)
				if (hit?.adapter.handleShapeUpdated) {
					await hit.adapter.handleShapeUpdated(env.data.shape)
				}
			} else if (env.event === 'binding.created' && env.data.binding) {
				await handleBindingCreated({
					id: env.data.binding.id,
					fromId: env.data.binding.fromId,
					toId: env.data.binding.toId,
					props: env.data.binding.props,
				})
			} else if (env.event === 'binding.deleted' && env.data.bindingId) {
				await handleBindingDeleted(env.data.bindingId)
			}
			return reply(res, 200, 'ok')
		}

		if (req.url === '/github-webhook') {
			const ok = verifyGithub(body, req.headers['x-hub-signature-256'] as string)
			if (!ok) return reply(res, 401, 'invalid signature')
			const ctx: IncomingWebhookContext = {
				headers: req.headers as Record<string, string | undefined>,
				rawBody: body,
				parsedBody: JSON.parse(body),
			}
			for (const adapter of listAdapters()) {
				if (adapter.matchesIncomingWebhook(ctx)) {
					await adapter.handleIncomingWebhook(ctx)
					break
				}
			}
			return reply(res, 200, 'ok')
		}

		// Generic per-provider webhook endpoints: e.g. /notion-webhook, /hubspot-webhook
		// can register a handler by matching on their headers.
		if (req.url && /^\/[a-z]+-webhook$/.test(req.url)) {
			const ctx: IncomingWebhookContext = {
				headers: req.headers as Record<string, string | undefined>,
				rawBody: body,
				parsedBody: safeJson(body),
			}
			for (const adapter of listAdapters()) {
				if (adapter.matchesIncomingWebhook(ctx)) {
					await adapter.handleIncomingWebhook(ctx)
					return reply(res, 200, 'ok')
				}
			}
			return reply(res, 404, 'no adapter matched')
		}

		reply(res, 404, 'not found')
	} catch (e) {
		console.error('handler error:', e)
		reply(res, 500, 'error')
	}
}

function safeJson(s: string): unknown {
	try {
		return JSON.parse(s)
	} catch {
		return null
	}
}

export function startServer() {
	const server = createServer(handle)
	server.listen(config.port, () => {
		console.log(`gh-sync listening on http://localhost:${config.port}`)
		console.log(`  • status / resync: http://localhost:${config.port}/`)
		console.log(
			`  • tldraw webhook: ${config.tldrPublicUrl || 'http://localhost:' + config.port}/tldraw-webhook`
		)
		console.log(
			`  • github webhook: ${config.tldrPublicUrl || 'http://localhost:' + config.port}/github-webhook`
		)
	})
}
