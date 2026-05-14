/* eslint-disable no-console */
// tldraw API client + outgoing webhook lifecycle. Provider-agnostic — every
// adapter goes through this to read/write shapes and learn its webhook secrets.

import { config, tldrWebhookUrl } from './config'

export interface RpcOp {
	command: string
	params: unknown
}

export async function tldrawRpc(operations: RpcOp[]): Promise<void> {
	const res = await fetch(
		`${config.tldrApiBase}/api/app/file/${config.tldrFileSlug}/whiteboard-rpc`,
		{
			method: 'POST',
			headers: {
				Authorization: `Bearer ${config.tldrApiToken}`,
				'Content-Type': 'application/json',
			},
			body: JSON.stringify({ operations }),
		}
	)
	if (!res.ok) {
		const text = await res.text().catch(() => '')
		throw new Error(`tldraw RPC ${res.status}: ${text}`)
	}
}

/** Like tldrawRpc but tolerates 409s (used during idempotent initial sync). */
export async function tldrawRpcSoft(operations: RpcOp[]): Promise<void> {
	try {
		await tldrawRpc(operations)
	} catch (e) {
		const msg = e instanceof Error ? e.message : String(e)
		if (!msg.includes('409')) console.warn('tldraw RPC soft-error:', msg)
	}
}

// ---- Webhook lifecycle -------------------------------------------------------

/** Webhook id → secret. Populated by syncTldrawWebhooks(). */
export const tldrawWebhookSecrets = new Map<string, string>()

interface RegisteredWebhook {
	id: string
	url: string
	eventType: string
}

async function listOurWebhooks(): Promise<RegisteredWebhook[]> {
	const res = await fetch(
		`${config.tldrApiBase}/api/app/file/${config.tldrFileSlug}/webhooks`,
		{ headers: { Authorization: `Bearer ${config.tldrApiToken}` } }
	)
	if (!res.ok) throw new Error(`listWebhooks ${res.status}: ${await res.text().catch(() => '')}`)
	const json = (await res.json()) as { webhooks: RegisteredWebhook[] }
	return json.webhooks
}

async function deleteOurWebhook(id: string): Promise<void> {
	const res = await fetch(
		`${config.tldrApiBase}/api/app/file/${config.tldrFileSlug}/webhooks/${id}`,
		{ method: 'DELETE', headers: { Authorization: `Bearer ${config.tldrApiToken}` } }
	)
	if (!res.ok && res.status !== 404) {
		console.warn(`deleteWebhook ${id} ${res.status}: ${await res.text().catch(() => '')}`)
	}
}

async function createOurWebhook(eventType: string, filter?: { paths: string[] }) {
	const res = await fetch(
		`${config.tldrApiBase}/api/app/file/${config.tldrFileSlug}/webhooks`,
		{
			method: 'POST',
			headers: {
				Authorization: `Bearer ${config.tldrApiToken}`,
				'Content-Type': 'application/json',
			},
			body: JSON.stringify({ url: tldrWebhookUrl, eventType, filter }),
		}
	)
	const json = (await res.json()) as { error?: boolean; id?: string; secret?: string }
	if (!res.ok || json.error || !json.id || !json.secret) {
		console.warn(`createWebhook ${eventType} failed:`, json)
		return
	}
	tldrawWebhookSecrets.set(json.id, json.secret)
	console.log(`registered ${eventType} → ${json.id}`)
}

/**
 * Cleans up old subscriptions pointing at our URL and re-registers fresh
 * ones, capturing each (id → secret) for signature verification.
 */
export async function syncTldrawWebhooks() {
	if (!config.tldrPublicUrl) {
		console.warn(
			'TLDR_PUBLIC_URL not set — skipping tldraw webhook registration. ' +
				'External → tldraw still works; tldraw → external does not.'
		)
		return
	}
	const existing = await listOurWebhooks().catch((e) => {
		console.warn('could not list existing webhooks:', e)
		return [] as RegisteredWebhook[]
	})
	for (const w of existing) {
		if (w.url === tldrWebhookUrl) await deleteOurWebhook(w.id)
	}
	await createOurWebhook('shape.updated', { paths: ['x', 'y', 'props'] })
	await createOurWebhook('shape.deleted')
	await createOurWebhook('binding.created')
	await createOurWebhook('binding.deleted')
}
