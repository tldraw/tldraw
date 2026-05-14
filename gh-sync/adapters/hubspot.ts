/* eslint-disable no-console */
// HubSpot provider adapter. Owns:
//   - hubspotCompany shapes (one per company that has at least one active deal)
//   - cross-provider references written as note engagements on the company

import { createShapeId } from '@tldraw/tlschema'
import type { HubspotCompanyShape } from '@tldraw/dotcom-shared'
import { tldrawRpcSoft } from '../tldraw'
import type {
	Box,
	ExternalEntity,
	IncomingWebhookContext,
	ProviderAdapter,
	TldrawShape,
} from '../types'

// ---- entity -----------------------------------------------------------------

export interface HubspotEntity extends ExternalEntity {
	provider: 'hubspot'
	companyId: string
	domain: string | null
	activeDealCount: number
}

// ---- HubSpot REST client (minimal) -----------------------------------------

const HUBSPOT_BASE = 'https://api.hubapi.com'

function makeHubspotClient(token: string) {
	return async function hub<T = unknown>(
		method: string,
		path: string,
		body?: unknown
	): Promise<T> {
		const res = await fetch(`${HUBSPOT_BASE}${path}`, {
			method,
			headers: {
				Authorization: `Bearer ${token}`,
				...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
			},
			body: body !== undefined ? JSON.stringify(body) : undefined,
		})
		if (!res.ok) {
			const text = await res.text().catch(() => '')
			throw new Error(`HubSpot ${method} ${path} → ${res.status}: ${text}`)
		}
		if (res.status === 204) return undefined as T
		return (await res.json()) as T
	}
}

interface HSCompany {
	id: string
	properties: { name?: string; domain?: string | null }
}

interface HSDeal {
	id: string
	properties: { dealstage?: string; pipeline?: string; associations?: unknown }
}

interface HSSearchResult<T> {
	results: T[]
	paging?: { next?: { after: string } }
}

// v4 associations return `toObjectId` (number). Older endpoints / formats
// may return `id` (string). Tolerate both — normalize to a string id.
interface HSAssociationResultRaw {
	id?: string | number
	toObjectId?: string | number
}
interface HSAssociationsPage {
	results: HSAssociationResultRaw[]
	paging?: { next?: { after: string } }
}

function associationId(r: HSAssociationResultRaw): string | null {
	const raw = r.toObjectId ?? r.id
	if (raw === undefined || raw === null || raw === '') return null
	return String(raw)
}

// HubSpot uses "closedwon" / "closedlost" as terminal stages in default pipelines.
// Custom pipelines may use different IDs — operators can extend this list via env.
const TERMINAL_STAGES = new Set([
	'closedwon',
	'closedlost',
	...(process.env.HUBSPOT_TERMINAL_STAGES ?? '')
		.split(',')
		.map((s) => s.trim())
		.filter(Boolean),
])

// ---- layout -----------------------------------------------------------------

const CARD_W = 260
const CARD_H = 96
const CARD_GAP = 12
const CARDS_PER_COLUMN = 12
const COLUMN_GAP = 20

// ---- adapter ----------------------------------------------------------------

export interface HubspotAdapterOptions {
	originX?: number
	originY?: number
	token?: string
	portalId?: string // used for building https://app.hubspot.com/contacts/<portal>/company/<id> URLs
	pollIntervalMs?: number
}

export class HubspotAdapter implements ProviderAdapter<HubspotEntity> {
	readonly providerId = 'hubspot' as const
	readonly shapeType = 'hubspotCompany' as const

	private readonly originX: number
	private readonly originY: number
	private readonly portalId: string | null
	private readonly pollIntervalMs: number
	private readonly hub: <T = unknown>(method: string, path: string, body?: unknown) => Promise<T>
	private readonly companiesById = new Map<string, HubspotEntity>()
	private pollTimer: NodeJS.Timeout | null = null

	constructor(opts: HubspotAdapterOptions = {}) {
		const token = opts.token ?? process.env.HUBSPOT_TOKEN
		if (!token) throw new Error('HubspotAdapter: HUBSPOT_TOKEN env required')
		this.originX = opts.originX ?? 0
		this.originY = opts.originY ?? 0
		this.portalId = opts.portalId ?? process.env.HUBSPOT_PORTAL_ID ?? null
		this.pollIntervalMs =
			opts.pollIntervalMs ?? Number(process.env.HUBSPOT_POLL_INTERVAL_MS ?? 120_000)
		this.hub = makeHubspotClient(token)
	}

	// ---- ProviderAdapter ----

	async hydrate(): Promise<void> {
		console.log(`[hubspot] hydrating companies with active deals…`)
		const companies = await this.fetchCompaniesWithActiveDeals()
		companies.forEach((c, i) => this.upsertCard(c, i))
		console.log(`[hubspot] hydrated ${companies.length} companies`)
		this.startPolling()
	}

	async resync(): Promise<void> {
		const ids = this.ownedShapeIds()
		if (ids.length > 0) {
			console.log(`[hubspot] resync: deleting ${ids.length} shapes`)
			const CHUNK = 500
			for (let i = 0; i < ids.length; i += CHUNK) {
				await tldrawRpcSoft([
					{ command: 'deleteShapes', params: { ids: ids.slice(i, i + CHUNK) } },
				])
			}
		}
		this.companiesById.clear()
		await this.hydrate()
	}

	ownedShapeIds(): string[] {
		return [...this.companiesById.values()].map((c) => c.shapeId)
	}

	matchesIncomingWebhook(ctx: IncomingWebhookContext): boolean {
		// HubSpot webhooks set `X-HubSpot-Signature-v3` (or the legacy v1/v2 variants).
		return (
			typeof ctx.headers['x-hubspot-signature-v3'] === 'string' ||
			typeof ctx.headers['x-hubspot-signature'] === 'string'
		)
	}

	async handleIncomingWebhook(_ctx: IncomingWebhookContext): Promise<void> {
		// v1: don't process webhooks — polling covers it.
		// Future: parse the events array and refetch the affected companies.
	}

	entityForShapeId(shapeId: string): HubspotEntity | null {
		for (const e of this.companiesById.values()) {
			if (e.shapeId === shapeId) return e
		}
		return null
	}

	async handleShapeUpdated(_shape: TldrawShape): Promise<void> {
		// No drag behavior; cards are just reference objects.
	}

	async addReference(self: HubspotEntity, other: ExternalEntity): Promise<void> {
		// Append a note engagement on the company. HubSpot doesn't have native
		// "issue" or "project" link properties, so notes carry the reference.
		const body =
			`<p>gh-sync: feature request</p>` +
			`<p>${other.provider}: <a href="${other.url}">${other.title}</a></p>` +
			`<!-- gh-sync:${other.provider}:${other.externalId} -->`
		try {
			await this.hub('POST', '/crm/v3/objects/notes', {
				properties: {
					hs_note_body: body,
					hs_timestamp: Date.now(),
				},
				associations: [
					{
						to: { id: self.companyId },
						types: [
							{
								associationCategory: 'HUBSPOT_DEFINED',
								// 190 = note → company
								associationTypeId: 190,
							},
						],
					},
				],
			})
		} catch (e) {
			console.warn('[hubspot] addReference (note creation) failed:', e)
		}
	}

	async removeReference(self: HubspotEntity, other: ExternalEntity): Promise<void> {
		// Find the note we wrote (identified by the comment marker we baked in)
		// and delete it. HubSpot's full-text search on notes isn't great so we
		// page through this company's note associations.
		try {
			const marker = `gh-sync:${other.provider}:${other.externalId}`
			const assoc = await this.hub<HSAssociationsPage>(
				'GET',
				`/crm/v4/objects/companies/${self.companyId}/associations/notes?limit=100`
			)
			for (const a of assoc.results) {
				const noteId = associationId(a)
				if (!noteId) continue
				const note = await this.hub<{ id: string; properties: { hs_note_body?: string } }>(
					'GET',
					`/crm/v3/objects/notes/${noteId}?properties=hs_note_body`
				)
				if (note.properties.hs_note_body?.includes(marker)) {
					await this.hub('DELETE', `/crm/v3/objects/notes/${noteId}`)
					return
				}
			}
		} catch (e) {
			console.warn('[hubspot] removeReference failed:', e)
		}
	}

	// ---- internals ----

	private startPolling() {
		if (this.pollTimer) return
		this.pollTimer = setInterval(() => {
			void this.pollChanges().catch((e) => console.warn('[hubspot] poll failed:', e))
		}, this.pollIntervalMs)
	}

	private async pollChanges() {
		const companies = await this.fetchCompaniesWithActiveDeals()
		const seenIds = new Set<string>()
		companies.forEach((c, i) => {
			seenIds.add(c.id)
			this.upsertCard(c, i)
		})
		for (const [id, entity] of this.companiesById) {
			if (!seenIds.has(id)) {
				await tldrawRpcSoft([{ command: 'deleteShape', params: { id: entity.shapeId } }])
				this.companiesById.delete(id)
			}
		}
	}

	/**
	 * Find companies that have at least one deal not in a terminal stage.
	 * Strategy: search deals filtered by stage, walk the unique associated
	 * company ids, then fetch those companies' basic properties.
	 */
	private async fetchCompaniesWithActiveDeals(): Promise<
		Array<HSCompany & { activeDealCount: number }>
	> {
		const dealsByCompany = new Map<string, number>()
		let after: string | undefined
		for (let i = 0; i < 50; i++) {
			const search: HSSearchResult<HSDeal> = await this.hub<HSSearchResult<HSDeal>>(
				'POST',
				`/crm/v3/objects/deals/search`,
				{
					filterGroups: [
						{
							filters: [...TERMINAL_STAGES].map((s) => ({
								propertyName: 'dealstage',
								operator: 'NEQ',
								value: s,
							})),
						},
					],
					properties: ['dealstage'],
					limit: 100,
					after,
				}
			)
			// For each deal, find its associated companies.
			for (const deal of search.results) {
				const assoc = await this.hub<HSAssociationsPage>(
					'GET',
					`/crm/v4/objects/deals/${deal.id}/associations/companies?limit=10`
				).catch(() => ({ results: [] }) as HSAssociationsPage)
				for (const c of assoc.results) {
					const id = associationId(c)
					if (!id) continue
					dealsByCompany.set(id, (dealsByCompany.get(id) ?? 0) + 1)
				}
			}
			after = search.paging?.next?.after
			if (!after) break
		}

		// Now batch-fetch the company records we need. Filter once more so we
		// never send `{id: undefined}` to HubSpot's batch endpoint (which 400s).
		const companyIds = [...dealsByCompany.keys()].filter((id) => typeof id === 'string' && id.length > 0)
		const out: Array<HSCompany & { activeDealCount: number }> = []
		const BATCH = 100
		for (let i = 0; i < companyIds.length; i += BATCH) {
			const slice = companyIds.slice(i, i + BATCH)
			const res = await this.hub<{ results: HSCompany[] }>(
				'POST',
				`/crm/v3/objects/companies/batch/read`,
				{ properties: ['name', 'domain'], inputs: slice.map((id) => ({ id })) }
			).catch((e) => {
				console.warn('[hubspot] batch read companies failed:', e)
				return { results: [] }
			})
			for (const c of res.results) {
				out.push({ ...c, activeDealCount: dealsByCompany.get(c.id) ?? 1 })
			}
		}
		// Sort by deal count desc, then name asc for stable layout.
		out.sort(
			(a, b) =>
				b.activeDealCount - a.activeDealCount ||
				(a.properties.name ?? '').localeCompare(b.properties.name ?? '')
		)
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

	private async upsertCard(
		company: HSCompany & { activeDealCount: number },
		index: number
	): Promise<void> {
		const existing = this.companiesById.get(company.id)
		const box = existing?.box ?? this.placeCard(index)
		const url = this.portalId
			? `https://app.hubspot.com/contacts/${this.portalId}/company/${company.id}`
			: ''
		const shape: HubspotCompanyShape = {
			id: existing
				? (existing.shapeId as HubspotCompanyShape['id'])
				: createShapeId(`hubspot/${company.id}`),
			typeName: 'shape',
			type: 'hubspotCompany',
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
				companyId: company.id,
				name: company.properties.name ?? '(unnamed)',
				domain: company.properties.domain ?? null,
				activeDealCount: company.activeDealCount,
				url,
			},
		} as HubspotCompanyShape

		if (existing) {
			await tldrawRpcSoft([
				{
					command: 'updateShape',
					params: { shape: { id: shape.id, type: 'hubspotCompany', props: shape.props } },
				},
			])
		} else {
			await tldrawRpcSoft([{ command: 'createShape', params: { shape } }])
		}

		this.companiesById.set(company.id, {
			provider: 'hubspot',
			externalId: company.id,
			shapeId: shape.id,
			box,
			title: company.properties.name ?? '(unnamed)',
			url,
			companyId: company.id,
			domain: company.properties.domain ?? null,
			activeDealCount: company.activeDealCount,
		})
	}
}
