/* eslint-disable no-console */
// Notion provider adapter. Owns:
//   - notionProject shapes (a card per database row)
//   - reference markers appended to the page body when a cross-provider
//     arrow is drawn from a Notion project to anything else

import { createShapeId } from '@tldraw/tlschema'
import type { NotionProjectShape } from '@tldraw/dotcom-shared'
import { tldrawRpcSoft } from '../tldraw'
import type {
	Box,
	ExternalEntity,
	IncomingWebhookContext,
	ProviderAdapter,
	TldrawShape,
} from '../types'

// env vars are read by the constructor (lazy) so this file can be imported
// even when the user hasn't configured Notion — only registering the adapter
// triggers the validation.

// ---- entity -----------------------------------------------------------------

export interface NotionEntity extends ExternalEntity {
	provider: 'notion'
	pageId: string
	status: string | null
}

// ---- Notion REST client (minimal) ------------------------------------------

const NOTION_BASE = 'https://api.notion.com'

function makeNotionClient(token: string) {
	return async function notion<T = unknown>(
		method: string,
		path: string,
		body?: unknown
	): Promise<T> {
		const res = await fetch(`${NOTION_BASE}${path}`, {
			method,
			headers: {
				Authorization: `Bearer ${token}`,
				'Notion-Version': '2022-06-28',
				...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
			},
			body: body !== undefined ? JSON.stringify(body) : undefined,
		})
		if (!res.ok) {
			const text = await res.text().catch(() => '')
			throw new Error(`Notion ${method} ${path} → ${res.status}: ${text}`)
		}
		return (await res.json()) as T
	}
}

interface NotionPage {
	id: string
	url: string
	last_edited_time: string
	properties: Record<string, NotionProperty>
}

interface NotionProperty {
	type: string
	[key: string]: unknown
}

interface NotionQueryResult {
	results: NotionPage[]
	next_cursor: string | null
	has_more: boolean
}

// Pull a plain-text title from a Notion `title`-type property.
function readTitle(page: NotionPage): string {
	for (const prop of Object.values(page.properties)) {
		if (prop.type === 'title') {
			const arr = (prop as any).title as Array<{ plain_text: string }>
			return arr.map((p) => p.plain_text).join('') || ''
		}
	}
	return ''
}

// Best-effort status reader: looks for a "Status" property, falls back to
// the first select/status-typed property we find.
function readStatus(page: NotionPage): string | null {
	const props = page.properties
	const candidate = props['Status'] ?? props['status']
	const fallback = Object.values(props).find((p) => p.type === 'status' || p.type === 'select')
	const p = candidate ?? fallback
	if (!p) return null
	if (p.type === 'status') return (p as any).status?.name ?? null
	if (p.type === 'select') return (p as any).select?.name ?? null
	return null
}

// ---- layout -----------------------------------------------------------------

const CARD_W = 260
const CARD_H = 100
const CARD_GAP = 12
const CARDS_PER_COLUMN = 12
const COLUMN_GAP = 20

// ---- adapter ----------------------------------------------------------------

export interface NotionAdapterOptions {
	originX?: number
	originY?: number
	token?: string // defaults to NOTION_TOKEN env
	databaseId?: string // defaults to NOTION_DATABASE_ID env
	pollIntervalMs?: number
}

export class NotionAdapter implements ProviderAdapter<NotionEntity> {
	readonly providerId = 'notion' as const
	readonly shapeType = 'notionProject' as const

	private readonly originX: number
	private readonly originY: number
	private readonly databaseId: string
	private readonly pollIntervalMs: number
	private readonly notion: <T = unknown>(method: string, path: string, body?: unknown) => Promise<T>
	private readonly pagesById = new Map<string, NotionEntity>()
	private pollTimer: NodeJS.Timeout | null = null

	constructor(opts: NotionAdapterOptions = {}) {
		const token = opts.token ?? process.env.NOTION_TOKEN
		const databaseId = opts.databaseId ?? process.env.NOTION_DATABASE_ID
		if (!token) throw new Error('NotionAdapter: NOTION_TOKEN env required')
		if (!databaseId) throw new Error('NotionAdapter: NOTION_DATABASE_ID env required')
		this.originX = opts.originX ?? 0
		this.originY = opts.originY ?? 0
		this.databaseId = databaseId
		this.pollIntervalMs =
			opts.pollIntervalMs ?? Number(process.env.NOTION_POLL_INTERVAL_MS ?? 60_000)
		this.notion = makeNotionClient(token)
	}

	// ---- ProviderAdapter ----

	async hydrate(): Promise<void> {
		console.log(`[notion] hydrating database ${this.databaseId}…`)
		const pages = await this.queryAllPages()
		pages.forEach((page, i) => this.upsertCard(page, i))
		console.log(`[notion] hydrated ${pages.length} pages`)
		this.startPolling()
	}

	async resync(): Promise<void> {
		const ids = this.ownedShapeIds()
		if (ids.length > 0) {
			console.log(`[notion] resync: deleting ${ids.length} shapes`)
			const CHUNK = 500
			for (let i = 0; i < ids.length; i += CHUNK) {
				await tldrawRpcSoft([
					{ command: 'deleteShapes', params: { ids: ids.slice(i, i + CHUNK) } },
				])
			}
		}
		this.pagesById.clear()
		await this.hydrate()
	}

	ownedShapeIds(): string[] {
		return [...this.pagesById.values()].map((p) => p.shapeId)
	}

	matchesIncomingWebhook(ctx: IncomingWebhookContext): boolean {
		// Notion's webhooks send a `Notion-Webhook-Verification-Token` on
		// registration, then a body with `verification_token` field. After
		// verification, deliveries carry `notion-version` header. We use
		// the header presence as our match heuristic.
		return typeof ctx.headers['notion-version'] === 'string' || ctx.parsedBody !== null && typeof (ctx.parsedBody as any)?.verification_token === 'string'
	}

	async handleIncomingWebhook(ctx: IncomingWebhookContext): Promise<void> {
		// Notion webhook URL verification flow: log the token and ack so the
		// operator can paste it into the integration setup.
		const body = ctx.parsedBody as any
		if (body?.verification_token) {
			console.log(`[notion] webhook verification token: ${body.verification_token}`)
			return
		}
		// Real event: refetch the page if we recognize it.
		const pageId = body?.entity?.id as string | undefined
		if (!pageId) return
		try {
			const page = await this.notion<NotionPage>('GET', `/v1/pages/${pageId}`)
			const existing = this.pagesById.get(pageId)
			const index = existing
				? [...this.pagesById.keys()].indexOf(pageId)
				: this.pagesById.size
			await this.upsertCard(page, index)
		} catch (e) {
			console.warn(`[notion] failed to refresh page ${pageId}:`, e)
		}
	}

	entityForShapeId(shapeId: string): NotionEntity | null {
		for (const e of this.pagesById.values()) {
			if (e.shapeId === shapeId) return e
		}
		return null
	}

	async handleShapeUpdated(_shape: TldrawShape): Promise<void> {
		// No drag-driven behavior for Notion cards in v1 — they're just
		// reference objects. Future: drag onto a hubspot company to link.
	}

	async addReference(self: NotionEntity, other: ExternalEntity): Promise<void> {
		await this.editPageMarker(self.pageId, (refs) => {
			const key = `${other.provider}:${other.externalId}`
			if (!refs.some((r) => r.key === key)) {
				refs.push({ key, title: other.title, url: other.url })
			}
			return refs
		})
	}

	async removeReference(self: NotionEntity, other: ExternalEntity): Promise<void> {
		await this.editPageMarker(self.pageId, (refs) => {
			const key = `${other.provider}:${other.externalId}`
			return refs.filter((r) => r.key !== key)
		})
	}

	// ---- internals ----

	private startPolling() {
		if (this.pollTimer) return
		this.pollTimer = setInterval(() => {
			void this.pollChanges().catch((e) => console.warn('[notion] poll failed:', e))
		}, this.pollIntervalMs)
	}

	private async pollChanges() {
		const pages = await this.queryAllPages()
		// Reconcile: upsert anything new or edited, delete anything removed.
		const seenIds = new Set<string>()
		pages.forEach((page, i) => {
			seenIds.add(page.id)
			const existing = this.pagesById.get(page.id)
			const newTitle = readTitle(page)
			const newStatus = readStatus(page)
			if (!existing) {
				this.upsertCard(page, i)
			} else if (existing.title !== newTitle || existing.status !== newStatus) {
				this.upsertCard(page, i)
			}
		})
		for (const [id, entity] of this.pagesById) {
			if (!seenIds.has(id)) {
				await tldrawRpcSoft([{ command: 'deleteShape', params: { id: entity.shapeId } }])
				this.pagesById.delete(id)
			}
		}
	}

	private async queryAllPages(): Promise<NotionPage[]> {
		const out: NotionPage[] = []
		let cursor: string | null = null
		for (let i = 0; i < 50; i++) {
			const res: NotionQueryResult = await this.notion<NotionQueryResult>(
				'POST',
				`/v1/databases/${this.databaseId}/query`,
				cursor ? { start_cursor: cursor, page_size: 100 } : { page_size: 100 }
			)
			out.push(...res.results)
			if (!res.has_more || !res.next_cursor) break
			cursor = res.next_cursor
		}
		return out
	}

	private placeCard(index: number): Box {
		const col = Math.floor(index / CARDS_PER_COLUMN)
		const row = index % CARDS_PER_COLUMN
		return {
			x: this.originX + col * (CARD_W + COLUMN_GAP),
			y: this.originY + row * (CARD_H + CARD_GAP),
			w: CARD_W,
			h: CARD_H,
		}
	}

	private async upsertCard(page: NotionPage, index: number): Promise<void> {
		const title = readTitle(page)
		const status = readStatus(page)
		const existing = this.pagesById.get(page.id)
		const box = existing?.box ?? this.placeCard(index)
		const shape: NotionProjectShape = {
			id: existing
				? (existing.shapeId as NotionProjectShape['id'])
				: createShapeId(`notion/${page.id}`),
			typeName: 'shape',
			type: 'notionProject',
			x: box.x,
			y: box.y,
			rotation: 0,
			index: 'a1',
			parentId: 'page:page',
			isLocked: false,
			opacity: 1,
			meta: {},
			props: {
				w: CARD_W,
				h: CARD_H,
				pageId: page.id,
				title,
				status,
				url: page.url,
			},
		} as NotionProjectShape

		if (existing) {
			await tldrawRpcSoft([
				{
					command: 'updateShape',
					params: { shape: { id: shape.id, type: 'notionProject', props: shape.props } },
				},
			])
		} else {
			await tldrawRpcSoft([{ command: 'createShape', params: { shape } }])
		}

		this.pagesById.set(page.id, {
			provider: 'notion',
			externalId: page.id,
			shapeId: shape.id,
			box,
			title,
			url: page.url,
			pageId: page.id,
			status,
		})
	}

	// ---- body marker references (Notion blocks) ----

	private static MARKER_HEADING = 'gh-sync:refs'

	/**
	 * Notion has no inline HTML comments, so we mark the references block by
	 * a child block whose plain-text equals MARKER_HEADING, followed by
	 * paragraph blocks of the references. To edit, we list children, find the
	 * marker (if any), delete everything after it up to a closing marker,
	 * and re-append.
	 */
	private async editPageMarker(
		pageId: string,
		mutate: (
			refs: { key: string; title: string; url: string }[]
		) => { key: string; title: string; url: string }[]
	): Promise<void> {
		const blocks = await this.notion<{ results: any[] }>(
			'GET',
			`/v1/blocks/${pageId}/children?page_size=100`
		)
		const items = blocks.results
		const startIdx = items.findIndex((b) => {
			if (b.type !== 'paragraph') return false
			const txt = (b.paragraph?.rich_text ?? [])
				.map((t: any) => t.plain_text ?? '')
				.join('')
			return txt.trim() === NotionAdapter.MARKER_HEADING
		})

		// Parse existing refs from the blocks after the marker until we hit
		// something that isn't a `- [title](url)` style paragraph.
		const existing: { key: string; title: string; url: string }[] = []
		const toDelete: string[] = []
		if (startIdx !== -1) {
			toDelete.push(items[startIdx].id) // delete marker itself; re-add below
			for (let i = startIdx + 1; i < items.length; i++) {
				const b = items[i]
				if (b.type !== 'paragraph') break
				const richText = b.paragraph?.rich_text ?? []
				const link = richText.find((t: any) => t.text?.link?.url)
				if (!link) break
				const url = link.text.link.url
				const title = richText.map((t: any) => t.plain_text ?? '').join('')
				existing.push({ key: url, title, url })
				toDelete.push(b.id)
			}
		}

		// Remove old block(s) so we can re-write cleanly.
		for (const id of toDelete) {
			try {
				await this.notion('DELETE', `/v1/blocks/${id}`)
			} catch (e) {
				console.warn(`[notion] couldn't delete block ${id}:`, e)
			}
		}

		const next = mutate(existing)
		if (next.length === 0) return

		const children = [
			{
				object: 'block',
				type: 'paragraph',
				paragraph: {
					rich_text: [{ type: 'text', text: { content: NotionAdapter.MARKER_HEADING } }],
				},
			},
			...next.map((r) => ({
				object: 'block',
				type: 'paragraph',
				paragraph: {
					rich_text: [
						{ type: 'text', text: { content: r.title, link: { url: r.url } } },
					],
				},
			})),
		]

		await this.notion('PATCH', `/v1/blocks/${pageId}/children`, { children })
	}
}
