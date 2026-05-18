/* eslint-disable no-console */
// Notion provider adapter. Owns:
//   - notionProject shapes (a card per database row)
//   - reference markers appended to the page body when a cross-provider
//     arrow is drawn from a Notion project to anything else

import type { NotionProjectShape } from '@tldraw/dotcom-shared'
import { createShapeId } from '@tldraw/tlschema'
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
	archived?: boolean
	in_trash?: boolean
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
const COLUMN_W = 292
const COLUMN_H = 800
const COLUMN_GAP = 24
const COLUMN_HEADER_OFFSET = 56
const COLUMN_PADDING_X = 16
const CARDS_PER_COLUMN_MAX = 5

interface NotionColumnLayout {
	key: string // lowercased status; '__other__' is the fallback bucket
	name: string
	color: string
	xOffset: number
}

const NOTION_COLUMNS: NotionColumnLayout[] = [
	{ key: 'proposal', name: 'Proposal', color: 'light-violet', xOffset: 0 },
	{ key: 'backlog', name: 'Backlog', color: 'grey', xOffset: COLUMN_W + COLUMN_GAP },
	{ key: 'evergreen', name: 'Evergreen', color: 'orange', xOffset: (COLUMN_W + COLUMN_GAP) * 2 },
	{
		key: 'in progress',
		name: 'In progress',
		color: 'yellow',
		xOffset: (COLUMN_W + COLUMN_GAP) * 3,
	},
	{ key: 'done', name: 'Done', color: 'light-green', xOffset: (COLUMN_W + COLUMN_GAP) * 4 },
	{ key: 'cancelled', name: 'Cancelled', color: 'red', xOffset: (COLUMN_W + COLUMN_GAP) * 5 },
	{
		key: 'needs human review',
		name: 'Needs human review',
		color: 'light-blue',
		xOffset: (COLUMN_W + COLUMN_GAP) * 6,
	},
	{ key: '__other__', name: 'Other', color: 'grey', xOffset: (COLUMN_W + COLUMN_GAP) * 7 },
]

function columnKeyForStatus(status: string | null): string {
	if (!status) return '__other__'
	const norm = status.toLowerCase().trim()
	return NOTION_COLUMNS.some((c) => c.key === norm) ? norm : '__other__'
}

interface NotionColumnRecord {
	key: string
	name: string
	shapeId: string
	box: Box
}

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
	private readonly tasksDatabaseId: string | null
	private readonly pollIntervalMs: number
	private readonly notion: <T = unknown>(method: string, path: string, body?: unknown) => Promise<T>
	private readonly pagesById = new Map<string, NotionEntity>()
	private readonly columnsByKey = new Map<string, NotionColumnRecord>()
	private statusPropertyInfo: { name: string; type: 'status' | 'select' } | null = null
	private pollTimer: NodeJS.Timeout | null = null

	constructor(opts: NotionAdapterOptions = {}) {
		const token = opts.token ?? process.env.NOTION_TOKEN
		const databaseId = opts.databaseId ?? process.env.NOTION_DATABASE_ID
		if (!token) throw new Error('NotionAdapter: NOTION_TOKEN env required')
		if (!databaseId) throw new Error('NotionAdapter: NOTION_DATABASE_ID env required')
		this.originX = opts.originX ?? 0
		this.originY = opts.originY ?? 0
		this.databaseId = databaseId
		this.tasksDatabaseId = process.env.NOTION_TASK_DATABASE_ID ?? null
		this.pollIntervalMs =
			opts.pollIntervalMs ?? Number(process.env.NOTION_POLL_INTERVAL_MS ?? 10_000)
		this.notion = makeNotionClient(token)
	}

	// ---- ProviderAdapter ----

	async hydrate(): Promise<void> {
		console.log(`[notion] hydrating database ${this.databaseId}…`)
		await this.discoverStatusProperty()
		const pages = await this.queryAllPages()

		// Group pages by column key, respecting the per-column cap.
		const pagesByCol = new Map<string, NotionPage[]>()
		for (const page of pages) {
			const key = columnKeyForStatus(readStatus(page))
			const list = pagesByCol.get(key) ?? []
			if (list.length >= CARDS_PER_COLUMN_MAX) continue
			list.push(page)
			pagesByCol.set(key, list)
		}

		// Delete any column shapes left over from previous runs (we redraw the
		// layout from scratch, collapsing gaps).
		for (const col of NOTION_COLUMNS) {
			await tldrawRpcSoft([
				{ command: 'deleteShape', params: { id: createShapeId(`notion-col/${col.key}`) } },
			])
		}
		this.columnsByKey.clear()

		// Render only columns that have at least one card. Pack them tight.
		let xCursor = 0
		for (const col of NOTION_COLUMNS) {
			const list = pagesByCol.get(col.key) ?? []
			if (list.length === 0) {
				console.log(`[notion] hide empty column "${col.name}"`)
				continue
			}
			const positioned = { ...col, xOffset: xCursor }
			const shape = this.buildColumnShape(positioned)
			await tldrawRpcSoft([{ command: 'createShape', params: { shape } }])
			this.columnsByKey.set(col.key, {
				key: col.key,
				name: col.name,
				shapeId: shape.id,
				box: { x: shape.x, y: shape.y, w: COLUMN_W, h: COLUMN_H },
			})
			xCursor += COLUMN_W + COLUMN_GAP
		}

		// Place cards into the (now visible) columns.
		let placed = 0
		for (const [key, list] of pagesByCol) {
			if (!this.columnsByKey.has(key)) continue
			for (let i = 0; i < list.length; i++) {
				await this.upsertCard(list[i], key, i)
				placed++
			}
		}
		console.log(`[notion] hydrated ${placed} pages into ${this.columnsByKey.size} columns`)
		this.startPolling()
	}

	private async discoverStatusProperty(): Promise<void> {
		try {
			const db = await this.notion<{ properties: Record<string, any> }>(
				'GET',
				`/v1/databases/${this.databaseId}`
			)
			const entries = Object.entries(db.properties)
			// Prefer a property literally named "Status".
			for (const [name, prop] of entries) {
				if (name.toLowerCase() === 'status' && (prop.type === 'status' || prop.type === 'select')) {
					this.statusPropertyInfo = { name, type: prop.type }
					console.log(`[notion] status property: name="${name}" type=${prop.type}`)
					return
				}
			}
			// Fallback: first status-typed, then first select-typed.
			for (const [name, prop] of entries) {
				if (prop.type === 'status') {
					this.statusPropertyInfo = { name, type: 'status' }
					console.log(`[notion] status property (fallback): name="${name}" type=status`)
					return
				}
			}
			for (const [name, prop] of entries) {
				if (prop.type === 'select') {
					this.statusPropertyInfo = { name, type: 'select' }
					console.log(`[notion] status property (fallback): name="${name}" type=select`)
					return
				}
			}
			console.warn(`[notion] no status/select property found on projects DB`)
		} catch (e) {
			console.warn(`[notion] discoverStatusProperty failed:`, e)
		}
	}

	async resync(): Promise<void> {
		const ids = this.ownedShapeIds()
		if (ids.length > 0) {
			console.log(`[notion] resync: deleting ${ids.length} shapes`)
			const CHUNK = 500
			for (let i = 0; i < ids.length; i += CHUNK) {
				await tldrawRpcSoft([{ command: 'deleteShapes', params: { ids: ids.slice(i, i + CHUNK) } }])
			}
		}
		this.pagesById.clear()
		this.columnsByKey.clear()
		await this.hydrate()
	}

	ownedShapeIds(): string[] {
		const out: string[] = []
		for (const p of this.pagesById.values()) out.push(p.shapeId)
		for (const c of this.columnsByKey.values()) out.push(c.shapeId)
		return out
	}

	matchesIncomingWebhook(ctx: IncomingWebhookContext): boolean {
		// Notion's webhooks send a `Notion-Webhook-Verification-Token` on
		// registration, then a body with `verification_token` field. After
		// verification, deliveries carry `notion-version` header. We use
		// the header presence as our match heuristic.
		return (
			typeof ctx.headers['notion-version'] === 'string' ||
			(ctx.parsedBody !== null && typeof (ctx.parsedBody as any)?.verification_token === 'string')
		)
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
			// If the page is archived/trashed, treat it as a deletion.
			if (page.archived || page.in_trash) {
				const existing = this.pagesById.get(pageId)
				if (existing) {
					console.log(`[notion] webhook: page ${pageId} archived — deleting card`)
					await tldrawRpcSoft([{ command: 'deleteShape', params: { id: existing.shapeId } }])
					this.pagesById.delete(pageId)
				}
				return
			}
			const key = columnKeyForStatus(readStatus(page))
			const others = [...this.pagesById.values()].filter(
				(e) => e.pageId !== pageId && columnKeyForStatus(e.status) === key
			).length
			if (others >= CARDS_PER_COLUMN_MAX && !this.pagesById.has(pageId)) return
			await this.upsertCard(page, key, others)
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

	async handleShapeUpdated(shape: TldrawShape): Promise<void> {
		if (shape.type !== 'notionProject') return
		const props = shape.props as any
		const pageId = props.pageId as string | undefined
		if (!pageId) return
		const entity = this.pagesById.get(pageId)
		if (!entity) return
		const center = {
			x: shape.x + (props.w as number) / 2,
			y: shape.y + (props.h as number) / 2,
		}
		console.log(
			`[notion] card moved: pageId=${pageId} center=(${center.x.toFixed(0)}, ${center.y.toFixed(0)})`
		)

		let target: NotionColumnRecord | null = null
		for (const col of this.columnsByKey.values()) {
			if (
				center.x >= col.box.x &&
				center.x <= col.box.x + col.box.w &&
				center.y >= col.box.y &&
				center.y <= col.box.y + col.box.h
			) {
				target = col
				break
			}
		}
		if (!target) {
			console.log(`[notion] card ${pageId}: no column under center, no-op`)
			return
		}
		if (target.key === '__other__') {
			console.log(`[notion] card ${pageId}: hit "Other" column, skipping status update`)
			return
		}

		const currentKey = columnKeyForStatus(entity.status)
		if (currentKey === target.key) {
			console.log(`[notion] card ${pageId}: already in "${target.name}", no-op`)
			return
		}

		if (!this.statusPropertyInfo) {
			console.warn(`[notion] no status property discovered, can't update`)
			return
		}

		console.log(`[notion] card ${pageId}: "${entity.status ?? '(none)'}" → "${target.name}"`)
		try {
			const propValue =
				this.statusPropertyInfo.type === 'status'
					? { status: { name: target.name } }
					: { select: { name: target.name } }
			await this.notion('PATCH', `/v1/pages/${pageId}`, {
				properties: { [this.statusPropertyInfo.name]: propValue },
			})
			entity.status = target.name
			console.log(`[notion] card ${pageId}: status updated to "${target.name}"`)
		} catch (e) {
			console.warn(`[notion] failed to update status for ${pageId}:`, e)
		}
	}

	async addReference(self: NotionEntity, other: ExternalEntity): Promise<void> {
		if (other.provider === 'github') {
			await this.addGithubTask(self.pageId, other)
			return
		}
		await this.editPageMarker(self.pageId, (refs) => {
			const key = `${other.provider}:${other.externalId}`
			if (!refs.some((r) => r.key === key)) {
				refs.push({ key, title: other.title, url: other.url })
			}
			return refs
		})
	}

	async removeReference(self: NotionEntity, other: ExternalEntity): Promise<void> {
		if (other.provider === 'github') {
			await this.removeGithubTask(self.pageId, other.url)
			return
		}
		await this.editPageMarker(self.pageId, (refs) => {
			const key = `${other.provider}:${other.externalId}`
			return refs.filter((r) => r.key !== key)
		})
	}

	// ---- internals ----

	private startPolling() {
		if (this.pollTimer) {
			console.log(`[notion] startPolling: timer already exists, skipping`)
			return
		}
		console.log(`[notion] startPolling: scheduling every ${this.pollIntervalMs}ms`)
		this.pollTimer = setInterval(() => {
			console.log(`[notion] tick`)
			void this.pollChanges().catch((e) => console.warn('[notion] poll failed:', e))
		}, this.pollIntervalMs)
	}

	private async pollChanges() {
		const pages = await this.queryAllPages()
		console.log(`[notion] poll: fetched ${pages.length} pages, ${this.pagesById.size} on canvas`)
		let created = 0
		let updated = 0
		let deleted = 0
		const seenIds = new Set<string>()
		const indexByKey = new Map<string, number>()

		for (const page of pages) {
			const newTitle = readTitle(page)
			const newStatus = readStatus(page)
			const key = columnKeyForStatus(newStatus)

			if (!this.columnsByKey.has(key)) {
				// Status maps to a column that's not on the canvas (it was empty at
				// hydrate time). If we had this page on canvas before, drop it.
				const existing = this.pagesById.get(page.id)
				if (existing) {
					console.log(`[notion] - delete card: ${page.id} status moved to hidden column "${key}"`)
					await tldrawRpcSoft([{ command: 'deleteShape', params: { id: existing.shapeId } }])
					this.pagesById.delete(page.id)
					deleted++
				}
				seenIds.add(page.id)
				continue
			}

			const idx = indexByKey.get(key) ?? 0
			if (idx >= CARDS_PER_COLUMN_MAX) {
				// Column full for this poll. Mark as "seen" so we don't delete it,
				// but skip upserting (no slot).
				seenIds.add(page.id)
				continue
			}
			indexByKey.set(key, idx + 1)
			seenIds.add(page.id)
			const existing = this.pagesById.get(page.id)
			if (!existing) {
				console.log(`[notion] + create card: ${page.id} "${newTitle}" (status=${newStatus})`)
				await this.upsertCard(page, key, idx)
				created++
			} else if (existing.title !== newTitle || existing.status !== newStatus) {
				console.log(
					`[notion] ~ update card: ${page.id} "${existing.title}" → "${newTitle}" ` +
						`(status: ${existing.status} → ${newStatus})`
				)
				await this.upsertCard(page, key, idx)
				updated++
			}
		}

		for (const [id, entity] of this.pagesById) {
			if (!seenIds.has(id)) {
				console.log(`[notion] - delete card: ${id} "${entity.title}" (fell out of latest 20)`)
				await tldrawRpcSoft([{ command: 'deleteShape', params: { id: entity.shapeId } }])
				this.pagesById.delete(id)
				deleted++
			}
		}
		if (created || updated || deleted) {
			console.log(`[notion] poll done: +${created} ~${updated} -${deleted}`)
		}
	}

	private async queryAllPages(): Promise<NotionPage[]> {
		const res = await this.notion<NotionQueryResult>(
			'POST',
			`/v1/databases/${this.databaseId}/query`,
			{
				page_size: 20,
				sorts: [{ timestamp: 'last_edited_time', direction: 'descending' }],
			}
		)
		const all = res.results.length
		const live = res.results.filter((p) => !p.archived && !p.in_trash)
		if (live.length !== all) {
			console.log(`[notion] queryAllPages: filtered ${all - live.length} archived/trashed pages`)
		}
		return live
	}

	private placeCardInColumn(key: string, index: number): Box {
		const col = this.columnsByKey.get(key)
		if (!col) {
			// Column is hidden (no cards rendered for this status). Fall back to origin
			// so callers can still construct a shape; pollChanges guards against ever
			// reaching here by skipping pages whose column isn't visible.
			console.warn(`[notion] placeCardInColumn: no visible column for key "${key}"`)
			return {
				x: this.originX,
				y: this.originY + COLUMN_HEADER_OFFSET + index * (CARD_H + CARD_GAP),
				w: CARD_W,
				h: CARD_H,
			}
		}
		return {
			x: col.box.x + COLUMN_PADDING_X,
			y: col.box.y + COLUMN_HEADER_OFFSET + index * (CARD_H + CARD_GAP),
			w: CARD_W,
			h: CARD_H,
		}
	}

	private buildColumnShape(layout: NotionColumnLayout): any {
		return {
			id: createShapeId(`notion-col/${layout.key}`),
			typeName: 'shape',
			type: 'geo',
			x: this.originX + layout.xOffset,
			y: this.originY,
			rotation: 0,
			index: 'a1',
			parentId: 'page:page',
			isLocked: true,
			opacity: 1,
			meta: {},
			props: {
				geo: 'rectangle',
				w: COLUMN_W,
				h: COLUMN_H,
				color: layout.color,
				fill: 'semi',
				dash: 'draw',
				size: 's',
				font: 'draw',
				align: 'middle',
				verticalAlign: 'start',
				labelColor: 'black',
				url: '',
				growY: 0,
				scale: 1,
				richText: {
					type: 'doc',
					content: [{ type: 'paragraph', content: [{ type: 'text', text: layout.name }] }],
				},
			},
		}
	}

	private async upsertCard(page: NotionPage, columnKey: string, index: number): Promise<void> {
		const title = readTitle(page)
		const status = readStatus(page)
		const existing = this.pagesById.get(page.id)
		const box = this.placeCardInColumn(columnKey, index)
		const shape: NotionProjectShape = {
			id: existing
				? (existing.shapeId as NotionProjectShape['id'])
				: createShapeId(`notion/${page.id}`),
			typeName: 'shape',
			type: 'notionProject',
			x: box.x,
			y: box.y,
			rotation: 0,
			index: 'a2',
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
					params: {
						shape: {
							id: shape.id,
							type: 'notionProject',
							x: box.x,
							y: box.y,
							props: shape.props,
						},
					},
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

	// ---- github tasks (sub-database or page-body fallback) ----

	/**
	 * Adds the GitHub issue as a task on the Notion project. If the project
	 * page has a child database named like "Tasks", a new row is added there
	 * with the issue title (linked to the issue URL). Otherwise falls back to
	 * a `to_do` block on the page body. Idempotent on both paths.
	 */
	private async addGithubTask(pageId: string, issue: ExternalEntity): Promise<void> {
		console.log(`[notion] addGithubTask: page=${pageId} issue=${issue.url}`)
		let tasksDbId = await this.findTasksDatabase(pageId)
		if (!tasksDbId && this.tasksDatabaseId) {
			console.log(
				`[notion] addGithubTask: using env NOTION_TASK_DATABASE_ID=${this.tasksDatabaseId}`
			)
			tasksDbId = this.tasksDatabaseId
		}
		if (tasksDbId) {
			console.log(`[notion] addGithubTask: using tasks DB ${tasksDbId}`)
			await this.addTaskToDatabase(tasksDbId, issue, pageId)
			return
		}
		console.log(`[notion] addGithubTask: no tasks DB found, falling back to to_do block`)
		const existing = await this.findGithubTaskBlock(pageId, issue.url)
		if (existing) return
		await this.notion('PATCH', `/v1/blocks/${pageId}/children`, {
			children: [
				{
					object: 'block',
					type: 'to_do',
					to_do: {
						rich_text: [
							{
								type: 'text',
								text: { content: issue.title, link: { url: issue.url } },
							},
						],
						checked: false,
					},
				},
			],
		})
	}

	private async removeGithubTask(pageId: string, url: string): Promise<void> {
		let tasksDbId = await this.findTasksDatabase(pageId)
		if (!tasksDbId && this.tasksDatabaseId) tasksDbId = this.tasksDatabaseId
		if (tasksDbId) {
			await this.removeTaskFromDatabase(tasksDbId, pageId, url)
			return
		}
		const blockId = await this.findGithubTaskBlock(pageId, url)
		if (!blockId) return
		try {
			await this.notion('DELETE', `/v1/blocks/${blockId}`)
		} catch (e) {
			console.warn(`[notion] couldn't delete to_do block ${blockId}:`, e)
		}
	}

	private async findGithubTaskBlock(pageId: string, url: string): Promise<string | null> {
		const blocks = await this.notion<{ results: any[] }>(
			'GET',
			`/v1/blocks/${pageId}/children?page_size=100`
		)
		for (const b of blocks.results) {
			if (b.type !== 'to_do') continue
			const rt = b.to_do?.rich_text ?? []
			if (rt.some((t: any) => t.text?.link?.url === url)) return b.id
		}
		return null
	}

	/**
	 * Walks the page's top-level blocks looking for a child_database whose title
	 * matches /task/i. Returns the database id (which equals the block id for
	 * child_database blocks) or null.
	 */
	private async findTasksDatabase(pageId: string): Promise<string | null> {
		try {
			const blocks = await this.notion<{ results: any[] }>(
				'GET',
				`/v1/blocks/${pageId}/children?page_size=100`
			)
			console.log(
				`[notion] findTasksDatabase: page ${pageId} has ${blocks.results.length} top-level blocks`
			)
			const typeCounts: Record<string, number> = {}
			for (const b of blocks.results) {
				typeCounts[b.type] = (typeCounts[b.type] ?? 0) + 1
			}
			console.log(`[notion] findTasksDatabase: block types:`, typeCounts)
			for (const b of blocks.results) {
				if (b.type !== 'child_database') continue
				const title = (b.child_database?.title as string) ?? ''
				console.log(`[notion] findTasksDatabase: child_database block id=${b.id} title="${title}"`)
				if (/task/i.test(title)) {
					console.log(`[notion] findTasksDatabase: MATCH on "${title}"`)
					return b.id
				}
			}
			console.log(`[notion] findTasksDatabase: no matching child_database`)
		} catch (e) {
			console.warn(`[notion] findTasksDatabase failed for ${pageId}:`, e)
		}
		return null
	}

	private async addTaskToDatabase(
		dbId: string,
		issue: ExternalEntity,
		projectPageId: string
	): Promise<void> {
		const titlePropName = await this.getTitlePropertyName(dbId)
		if (!titlePropName) {
			console.warn(`[notion] tasks DB ${dbId}: no title property found`)
			return
		}
		const relationPropName = await this.findProjectRelationProperty(dbId)
		const existing = await this.findTaskInProject(dbId, projectPageId, issue.url, relationPropName)
		if (existing) {
			console.log(`[notion] task already exists for ${issue.url}`)
			return
		}
		const properties: Record<string, unknown> = {
			[titlePropName]: {
				title: [{ type: 'text', text: { content: issue.title } }],
			},
		}
		if (relationPropName) {
			properties[relationPropName] = { relation: [{ id: projectPageId }] }
			console.log(`[notion] + task: linking via relation "${relationPropName}" → ${projectPageId}`)
		} else {
			console.log(`[notion] + task: no project-relation property found on DB ${dbId}`)
		}
		const children = [
			{
				object: 'block',
				type: 'paragraph',
				paragraph: {
					rich_text: [
						{ type: 'text', text: { content: 'GitHub issue: ' } },
						{
							type: 'text',
							text: { content: issue.url, link: { url: issue.url } },
						},
					],
				},
			},
		]
		try {
			await this.notion('POST', '/v1/pages', {
				parent: { database_id: dbId },
				properties,
				children,
			})
			console.log(`[notion] + task: "${issue.title}" → DB ${dbId}`)
		} catch (e) {
			console.warn(`[notion] failed to create task in DB ${dbId}:`, e)
		}
	}

	/**
	 * Looks at the tasks DB schema for a relation property whose target is the
	 * projects DB (`this.databaseId`). Returns the property name or null.
	 */
	private async findProjectRelationProperty(tasksDbId: string): Promise<string | null> {
		try {
			const db = await this.notion<{ properties: Record<string, any> }>(
				'GET',
				`/v1/databases/${tasksDbId}`
			)
			const want = this.databaseId.replace(/-/g, '').toLowerCase()
			for (const [name, prop] of Object.entries(db.properties)) {
				if (prop.type !== 'relation') continue
				const target = (prop.relation?.database_id as string | undefined) ?? ''
				if (target.replace(/-/g, '').toLowerCase() === want) {
					return name
				}
			}
		} catch (e) {
			console.warn(`[notion] findProjectRelationProperty failed for ${tasksDbId}:`, e)
		}
		return null
	}

	private async removeTaskFromDatabase(
		dbId: string,
		projectPageId: string,
		url: string
	): Promise<void> {
		const relationPropName = await this.findProjectRelationProperty(dbId)
		const pageId = await this.findTaskInProject(dbId, projectPageId, url, relationPropName)
		if (!pageId) return
		try {
			await this.notion('PATCH', `/v1/pages/${pageId}`, { archived: true })
			console.log(`[notion] - task: archived page ${pageId}`)
		} catch (e) {
			console.warn(`[notion] failed to archive task page ${pageId}:`, e)
		}
	}

	private async getTitlePropertyName(dbId: string): Promise<string | null> {
		try {
			const db = await this.notion<{ properties: Record<string, { type: string }> }>(
				'GET',
				`/v1/databases/${dbId}`
			)
			for (const [name, prop] of Object.entries(db.properties)) {
				if (prop.type === 'title') return name
			}
		} catch (e) {
			console.warn(`[notion] getTitlePropertyName failed for ${dbId}:`, e)
		}
		return null
	}

	/**
	 * Finds a task page in `dbId` that belongs to `projectPageId` (via relation
	 * if available) and whose body contains a link to `issueUrl`. Returns the
	 * task page id or null.
	 */
	private async findTaskInProject(
		dbId: string,
		projectPageId: string,
		issueUrl: string,
		relationPropName: string | null
	): Promise<string | null> {
		try {
			const body: Record<string, unknown> = { page_size: 100 }
			if (relationPropName) {
				body.filter = {
					property: relationPropName,
					relation: { contains: projectPageId },
				}
			}
			const res = await this.notion<{ results: any[] }>('POST', `/v1/databases/${dbId}/query`, body)
			for (const page of res.results) {
				const blocks = await this.notion<{ results: any[] }>(
					'GET',
					`/v1/blocks/${page.id}/children?page_size=20`
				)
				for (const b of blocks.results) {
					if (b.type !== 'paragraph') continue
					const rt = (b.paragraph?.rich_text ?? []) as any[]
					if (rt.some((t) => t.text?.link?.url === issueUrl)) return page.id
				}
			}
		} catch (e) {
			console.warn(`[notion] findTaskInProject failed for DB ${dbId}:`, e)
		}
		return null
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
			const txt = (b.paragraph?.rich_text ?? []).map((t: any) => t.plain_text ?? '').join('')
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
					rich_text: [{ type: 'text', text: { content: r.title, link: { url: r.url } } }],
				},
			})),
		]

		await this.notion('PATCH', `/v1/blocks/${pageId}/children`, { children })
	}
}
