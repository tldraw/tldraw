/* eslint-disable no-console */
// GitHub provider adapter. Owns:
//   - githubIssue / githubColumn / githubLabel shapes
//   - GitHub issues + labels + sub-issues
//   - kanban hit-testing for state changes and label application

import { createShapeId, type TLArrowShape } from '@tldraw/tlschema'
import type {
	GithubColumnShape,
	GithubColumnState,
	GithubIssueLabel,
	GithubIssueShape,
	GithubLabelShape,
} from '@tldraw/dotcom-shared'
import { tldrawRpcSoft } from '../tldraw'
import type {
	Box,
	ExternalEntity,
	IncomingWebhookContext,
	ProviderAdapter,
	TldrawShape,
} from '../types'

// ---- env (this adapter's own config) ----------------------------------------

function required(name: string): string {
	const v = process.env[name]
	if (!v) {
		console.error(`Missing required env var: ${name}`)
		process.exit(1)
	}
	return v
}

const GITHUB_TOKEN = required('GITHUB_TOKEN')
const GITHUB_REPO = required('GITHUB_REPO')
const GITHUB_WEBHOOK_SECRET = required('GITHUB_WEBHOOK_SECRET')

const [OWNER, REPO] = GITHUB_REPO.split('/')
if (!OWNER || !REPO) throw new Error(`GITHUB_REPO must be "owner/name", got: ${GITHUB_REPO}`)

// ---- entity types -----------------------------------------------------------

export interface GithubEntity extends ExternalEntity {
	provider: 'github'
	number: number
	state: 'open' | 'closed'
	stateReason: 'completed' | 'not_planned' | 'reopened' | null
	labels: GithubIssueLabel[]
	assignee: string | null
	nodeId: number // GitHub's numeric `id` (needed by sub-issues API)
}

interface ColumnRecord {
	state: GithubColumnState
	shapeId: string
	box: Box
	name: string
}

interface LabelShowerRecord {
	name: string
	color: string
	shapeId: string
	box: Box
}

// ---- GitHub REST client -----------------------------------------------------

const GH_BASE = 'https://api.github.com'

async function gh<T = unknown>(method: string, path: string, body?: unknown): Promise<T> {
	const res = await fetch(`${GH_BASE}${path}`, {
		method,
		headers: {
			Authorization: `Bearer ${GITHUB_TOKEN}`,
			Accept: 'application/vnd.github+json',
			'X-GitHub-Api-Version': '2022-11-28',
			'User-Agent': 'tldraw-gh-sync',
			...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
		},
		body: body !== undefined ? JSON.stringify(body) : undefined,
	})
	if (!res.ok) {
		const text = await res.text().catch(() => '')
		throw new Error(`GitHub ${method} ${path} → ${res.status}: ${text}`)
	}
	if (res.status === 204) return undefined as T
	return (await res.json()) as T
}

interface GHIssue {
	id: number
	number: number
	title: string
	body: string | null
	state: 'open' | 'closed'
	state_reason: 'completed' | 'not_planned' | 'reopened' | null
	labels: Array<{ name: string; color: string }>
	assignee: { login: string } | null
	html_url: string
	pull_request?: unknown
}

interface GHLabel {
	name: string
	color: string
}

// ---- layout constants -------------------------------------------------------

const COLUMN_W = 320
const COLUMN_H = 1600
const COLUMN_GAP = 32
const ISSUE_W = 280
const ISSUE_H = 120
const ISSUE_PADDING = 16
const LABEL_W = 160
const LABEL_H = 32
const COLUMNS_Y = 0

interface ColumnLayout {
	state: GithubColumnState
	name: string
	color: string
	xOffset: number // relative to adapter origin
}

const COLUMNS_LAYOUT: ColumnLayout[] = [
	{ state: 'open', name: 'Open', color: '#22c55e', xOffset: 0 },
	{
		state: 'closed:completed',
		name: 'Closed · completed',
		color: '#8b5cf6',
		xOffset: COLUMN_W + COLUMN_GAP,
	},
	{
		state: 'closed:not_planned',
		name: 'Closed · not planned',
		color: '#818189',
		xOffset: (COLUMN_W + COLUMN_GAP) * 2,
	},
]

const LABEL_PANEL_XOFFSET = (COLUMN_W + COLUMN_GAP) * COLUMNS_LAYOUT.length + 48

// ---- helpers ----------------------------------------------------------------

const issueShapeId = (n: number) => createShapeId(`gh-issue/${OWNER}/${REPO}/${n}`)
const labelShapeId = (name: string) => createShapeId(`gh-label/${OWNER}/${REPO}/${name}`)
const columnShapeId = (state: GithubColumnState) => createShapeId(`gh-column/${state}`)
const subIssueArrowId = (parent: number, child: number) =>
	createShapeId(`gh-sub/${parent}/${child}`)

function classifyState(state: 'open' | 'closed', reason: string | null): GithubColumnState {
	if (state === 'open') return 'open'
	if (reason === 'not_planned') return 'closed:not_planned'
	return 'closed:completed'
}

function center(box: Box) {
	return { x: box.x + box.w / 2, y: box.y + box.h / 2 }
}

function pointInBox(p: { x: number; y: number }, box: Box): boolean {
	return p.x >= box.x && p.x <= box.x + box.w && p.y >= box.y && p.y <= box.y + box.h
}

// (moved into the adapter so it sees the configured origin)

// ---- adapter ----------------------------------------------------------------

export interface GithubAdapterOptions {
	originX?: number
	originY?: number
}

export class GithubAdapter implements ProviderAdapter<GithubEntity> {
	readonly providerId = 'github' as const
	readonly shapeType = 'githubIssue' as const

	private readonly originX: number
	private readonly originY: number

	private issuesByNumber = new Map<number, GithubEntity>()
	private columnsByState = new Map<GithubColumnState, ColumnRecord>()
	private labelShowersByName = new Map<string, LabelShowerRecord>()
	private subIssueArrows = new Map<string, { parent: number; child: number }>()

	constructor(opts: GithubAdapterOptions = {}) {
		this.originX = opts.originX ?? 0
		this.originY = opts.originY ?? 0
	}

	private placeIssueInColumn(state: GithubColumnState, index: number): { x: number; y: number } {
		const layout = COLUMNS_LAYOUT.find((c) => c.state === state)!
		return {
			x: this.originX + layout.xOffset + ISSUE_PADDING,
			y: this.originY + COLUMNS_Y + 56 + index * (ISSUE_H + ISSUE_PADDING),
		}
	}

	// ---- ProviderAdapter ----

	async hydrate(): Promise<void> {
		console.log(`[github] hydrating ${OWNER}/${REPO}…`)
		const [labels, issues] = await Promise.all([this.listAllLabels(), this.listAllIssues()])

		// Columns.
		for (const c of COLUMNS_LAYOUT) {
			const shape = this.buildColumnShape(c)
			await tldrawRpcSoft([{ command: 'createShape', params: { shape } }])
			this.columnsByState.set(c.state, {
				state: c.state,
				shapeId: shape.id,
				box: { x: shape.x, y: shape.y, w: COLUMN_W, h: COLUMN_H },
				name: c.name,
			})
		}

		// Label sprinklers.
		labels.forEach((label, i) => {
			const shape = this.buildLabelShape(label, i)
			void tldrawRpcSoft([{ command: 'createShape', params: { shape } }])
			this.labelShowersByName.set(label.name, {
				name: label.name,
				color: label.color,
				shapeId: shape.id,
				box: { x: shape.x, y: shape.y, w: LABEL_W, h: LABEL_H },
			})
		})

		// Issue cards.
		const indexByColumn = new Map<GithubColumnState, number>()
		for (const issue of issues) {
			const col = classifyState(issue.state, issue.state_reason)
			const idx = indexByColumn.get(col) ?? 0
			indexByColumn.set(col, idx + 1)
			const { x, y } = this.placeIssueInColumn(col, idx)
			const shape = this.buildIssueShape(issue, x, y)
			await tldrawRpcSoft([{ command: 'createShape', params: { shape } }])
			this.recordIssue(issue, shape.id, { x, y, w: ISSUE_W, h: ISSUE_H })
		}

		console.log(`[github] hydrated ${issues.length} issues, ${labels.length} labels`)
	}

	async resync(): Promise<void> {
		const ids = this.ownedShapeIds()
		if (ids.length > 0) {
			console.log(`[github] resync: deleting ${ids.length} shapes`)
			const CHUNK = 500
			for (let i = 0; i < ids.length; i += CHUNK) {
				await tldrawRpcSoft([
					{ command: 'deleteShapes', params: { ids: ids.slice(i, i + CHUNK) } },
				])
			}
		}
		this.issuesByNumber.clear()
		this.columnsByState.clear()
		this.labelShowersByName.clear()
		this.subIssueArrows.clear()
		await this.hydrate()
	}

	ownedShapeIds(): string[] {
		const out: string[] = []
		for (const r of this.issuesByNumber.values()) out.push(r.shapeId)
		for (const c of this.columnsByState.values()) out.push(c.shapeId)
		for (const l of this.labelShowersByName.values()) out.push(l.shapeId)
		for (const id of this.subIssueArrows.keys()) out.push(id)
		return out
	}

	matchesIncomingWebhook(ctx: IncomingWebhookContext): boolean {
		return typeof ctx.headers['x-github-event'] === 'string'
	}

	async handleIncomingWebhook(ctx: IncomingWebhookContext): Promise<void> {
		const event = ctx.headers['x-github-event']
		const payload = ctx.parsedBody as any
		if (event === 'issues') await this.handleIssueEvent(payload)
		else if (event === 'sub_issues') await this.handleSubIssueEvent(payload)
	}

	entityForShapeId(shapeId: string): GithubEntity | null {
		for (const e of this.issuesByNumber.values()) {
			if (e.shapeId === shapeId) return e
		}
		return null
	}

	async handleShapeUpdated(shape: TldrawShape): Promise<void> {
		if (shape.type !== 'githubIssue') return
		const number = (shape.props as any).number as number
		const record = this.issuesByNumber.get(number)
		if (!record) return

		record.box = { x: shape.x, y: shape.y, w: ISSUE_W, h: ISSUE_H }
		record.shapeId = shape.id

		const col = this.findColumnForCard(record.box)
		if (col) {
			const targetState =
				col.state === 'open' ? 'open' : col.state === 'closed:completed' ? 'closed' : 'closed'
			const targetReason =
				col.state === 'open'
					? 'reopened'
					: col.state === 'closed:completed'
						? 'completed'
						: 'not_planned'
			if (record.state !== targetState || record.stateReason !== targetReason) {
				console.log(`[github] #${record.number} → ${col.state}`)
				try {
					await this.setIssueState(record.number, targetState, targetReason)
					record.state = targetState
					record.stateReason = targetReason as GithubEntity['stateReason']
				} catch (e) {
					console.warn(`[github] failed to update #${record.number} state:`, e)
				}
			}
		}

		const shower = this.findLabelShowerOverlap(record.box)
		if (shower && !record.labels.some((l) => l.name === shower.name)) {
			console.log(`[github] #${record.number} + label "${shower.name}"`)
			try {
				await this.addLabelToIssue(record.number, shower.name)
			} catch (e) {
				console.warn(`[github] failed to label #${record.number}:`, e)
			}
		}
	}

	async addWithinProviderLink(parent: GithubEntity, child: GithubEntity): Promise<void> {
		await gh('POST', `/repos/${OWNER}/${REPO}/issues/${parent.number}/sub_issues`, {
			sub_issue_id: child.nodeId,
		})
		this.subIssueArrows.set(subIssueArrowId(parent.number, child.number), {
			parent: parent.number,
			child: child.number,
		})
	}

	async removeWithinProviderLink(parent: GithubEntity, child: GithubEntity): Promise<void> {
		await gh('DELETE', `/repos/${OWNER}/${REPO}/issues/${parent.number}/sub_issue`, {
			sub_issue_id: child.nodeId,
		})
		this.subIssueArrows.delete(subIssueArrowId(parent.number, child.number))
	}

	async addReference(self: GithubEntity, other: ExternalEntity): Promise<void> {
		await this.editBodyMarker(self.number, (refs) => {
			const key = `${other.provider}:${other.externalId}`
			if (!refs.some((r) => r.key === key)) {
				refs.push({ key, title: other.title, url: other.url })
			}
			return refs
		})
	}

	async removeReference(self: GithubEntity, other: ExternalEntity): Promise<void> {
		await this.editBodyMarker(self.number, (refs) => {
			const key = `${other.provider}:${other.externalId}`
			return refs.filter((r) => r.key !== key)
		})
	}

	// ---- internals ----

	private recordIssue(issue: GHIssue, shapeId: string, box: Box) {
		this.issuesByNumber.set(issue.number, {
			provider: 'github',
			externalId: `${OWNER}/${REPO}#${issue.number}`,
			shapeId,
			box,
			title: issue.title,
			url: issue.html_url,
			number: issue.number,
			state: issue.state,
			stateReason: issue.state_reason,
			labels: issue.labels.map((l) => ({ name: l.name, color: l.color })),
			assignee: issue.assignee?.login ?? null,
			nodeId: issue.id,
		})
	}

	private findColumnForCard(card: Box): ColumnRecord | null {
		const c = center(card)
		for (const col of this.columnsByState.values()) {
			if (pointInBox(c, col.box)) return col
		}
		return null
	}

	private findLabelShowerOverlap(card: Box): LabelShowerRecord | null {
		const c = center(card)
		for (const shower of this.labelShowersByName.values()) {
			if (pointInBox(c, shower.box)) return shower
		}
		return null
	}

	private async handleIssueEvent(payload: { action: string; issue?: GHIssue }) {
		const issue = payload.issue
		if (!issue) return
		const existing = this.issuesByNumber.get(issue.number)

		if (payload.action === 'opened' && !existing) {
			const col = classifyState(issue.state, issue.state_reason)
			const index = [...this.issuesByNumber.values()].filter(
				(r) => classifyState(r.state, r.stateReason) === col
			).length
			const { x, y } = this.placeIssueInColumn(col, index)
			const shape = this.buildIssueShape(issue, x, y)
			await tldrawRpcSoft([{ command: 'createShape', params: { shape } }])
			this.recordIssue(issue, shape.id, { x, y, w: ISSUE_W, h: ISSUE_H })
			return
		}
		if (!existing) return

		const targetCol = classifyState(issue.state, issue.state_reason)
		const currentCol = classifyState(existing.state, existing.stateReason)
		const props: Partial<GithubIssueShape['props']> = {
			title: issue.title,
			state: issue.state,
			stateReason: issue.state_reason,
			labels: issue.labels.map((l) => ({ name: l.name, color: l.color })),
			assignee: issue.assignee?.login ?? null,
		}
		const update: any = { id: existing.shapeId, type: 'githubIssue', props }
		if (targetCol !== currentCol) {
			const index = [...this.issuesByNumber.values()].filter(
				(r) => r.number !== issue.number && classifyState(r.state, r.stateReason) === targetCol
			).length
			const { x, y } = this.placeIssueInColumn(targetCol, index)
			update.x = x
			update.y = y
			existing.box = { x, y, w: ISSUE_W, h: ISSUE_H }
		}
		await tldrawRpcSoft([{ command: 'updateShape', params: { shape: update } }])
		existing.state = issue.state
		existing.stateReason = issue.state_reason
		existing.title = issue.title
		existing.labels = props.labels!
		existing.assignee = props.assignee ?? null
	}

	private async handleSubIssueEvent(payload: {
		action: string
		parent_issue?: GHIssue
		sub_issue?: GHIssue
	}) {
		const parent = payload.parent_issue?.number
		const child = payload.sub_issue?.number
		if (!parent || !child) return
		const parentCard = this.issuesByNumber.get(parent)
		const childCard = this.issuesByNumber.get(child)
		if (!parentCard || !childCard) return
		const id = subIssueArrowId(parent, child)

		if (payload.action === 'parent_issue_added' || payload.action === 'sub_issue_added') {
			const pc = center(parentCard.box)
			const cc = center(childCard.box)
			const arrow: TLArrowShape = {
				id,
				typeName: 'shape',
				type: 'arrow',
				x: 0,
				y: 0,
				rotation: 0,
				index: 'a1' as any,
				parentId: 'page:page' as any,
				isLocked: false,
				opacity: 1,
				meta: { gh: { parent, child } },
				props: {
					kind: 'arc' as any,
					dash: 'draw' as any,
					size: 'm' as any,
					fill: 'none' as any,
					color: 'grey' as any,
					labelColor: 'black' as any,
					bend: 0,
					start: { x: pc.x, y: pc.y },
					end: { x: cc.x, y: cc.y },
					arrowheadStart: 'none' as any,
					arrowheadEnd: 'arrow' as any,
					font: 'draw' as any,
					labelPosition: 0.5,
					scale: 1,
					elbowMidPoint: 0.5,
					richText: { type: 'doc', content: [{ type: 'paragraph' }] },
				} as TLArrowShape['props'],
			}
			await tldrawRpcSoft([{ command: 'createShape', params: { shape: arrow } }])
			this.subIssueArrows.set(id, { parent, child })
		} else if (
			payload.action === 'parent_issue_removed' ||
			payload.action === 'sub_issue_removed'
		) {
			await tldrawRpcSoft([{ command: 'deleteShape', params: { id } }])
			this.subIssueArrows.delete(id)
		}
	}

	// ---- shape constructors ----

	private buildColumnShape(c: (typeof COLUMNS_LAYOUT)[number]): GithubColumnShape {
		return {
			id: columnShapeId(c.state),
			typeName: 'shape',
			type: 'githubColumn',
			x: this.originX + c.xOffset,
			y: this.originY + COLUMNS_Y,
			rotation: 0,
			index: 'a1',
			parentId: 'page:page',
			isLocked: true,
			opacity: 1,
			meta: {},
			props: { w: COLUMN_W, h: COLUMN_H, name: c.name, state: c.state, color: c.color },
		} as GithubColumnShape
	}

	private buildLabelShape(label: GHLabel, index: number): GithubLabelShape {
		return {
			id: labelShapeId(label.name),
			typeName: 'shape',
			type: 'githubLabel',
			x: this.originX + LABEL_PANEL_XOFFSET,
			y: this.originY + index * (LABEL_H + 12),
			rotation: 0,
			index: 'a1',
			parentId: 'page:page',
			isLocked: true,
			opacity: 1,
			meta: {},
			props: {
				w: LABEL_W,
				h: LABEL_H,
				owner: OWNER,
				repo: REPO,
				name: label.name,
				color: label.color,
			},
		} as GithubLabelShape
	}

	private buildIssueShape(issue: GHIssue, x: number, y: number): GithubIssueShape {
		return {
			id: issueShapeId(issue.number),
			typeName: 'shape',
			type: 'githubIssue',
			x,
			y,
			rotation: 0,
			index: 'a1',
			parentId: 'page:page',
			isLocked: false,
			opacity: 1,
			meta: {},
			props: {
				w: ISSUE_W,
				h: ISSUE_H,
				owner: OWNER,
				repo: REPO,
				number: issue.number,
				title: issue.title,
				state: issue.state,
				stateReason: issue.state_reason,
				labels: issue.labels.map((l) => ({ name: l.name, color: l.color })),
				assignee: issue.assignee?.login ?? null,
				url: issue.html_url,
			},
		} as GithubIssueShape
	}

	// ---- GitHub REST ----

	private async listAllIssues(): Promise<GHIssue[]> {
		const out: GHIssue[] = []
		for (let page = 1; page < 50; page++) {
			const batch = await gh<GHIssue[]>(
				'GET',
				`/repos/${OWNER}/${REPO}/issues?state=all&per_page=100&page=${page}`
			)
			out.push(...batch.filter((i) => !i.pull_request))
			if (batch.length < 100) break
		}
		return out
	}

	private async listAllLabels(): Promise<GHLabel[]> {
		return gh<GHLabel[]>('GET', `/repos/${OWNER}/${REPO}/labels?per_page=100`)
	}

	private async setIssueState(
		num: number,
		state: 'open' | 'closed',
		stateReason: 'completed' | 'not_planned' | 'reopened' | null
	) {
		await gh('PATCH', `/repos/${OWNER}/${REPO}/issues/${num}`, { state, state_reason: stateReason })
	}

	private async addLabelToIssue(num: number, label: string) {
		await gh('POST', `/repos/${OWNER}/${REPO}/issues/${num}/labels`, { labels: [label] })
	}

	// ---- cross-provider references via body marker block ----

	private static MARKER_START = '<!-- gh-sync:refs:start -->'
	private static MARKER_END = '<!-- gh-sync:refs:end -->'

	/**
	 * Edits the issue's body in place, mutating the references list between
	 * our marker block. If the markers aren't present they're appended.
	 */
	private async editBodyMarker(
		num: number,
		mutate: (
			refs: { key: string; title: string; url: string }[]
		) => { key: string; title: string; url: string }[]
	): Promise<void> {
		const issue = await gh<GHIssue>('GET', `/repos/${OWNER}/${REPO}/issues/${num}`)
		const body = issue.body ?? ''
		const { prefix, refs, suffix } = this.splitBodyMarker(body)
		const next = mutate(refs)
		const block =
			GithubAdapter.MARKER_START +
			'\n## References\n' +
			next.map((r) => `- [${r.title}](${r.url})`).join('\n') +
			'\n' +
			GithubAdapter.MARKER_END
		const newBody = next.length === 0 ? prefix + suffix : prefix + block + suffix
		await gh('PATCH', `/repos/${OWNER}/${REPO}/issues/${num}`, { body: newBody })
	}

	private splitBodyMarker(body: string): {
		prefix: string
		refs: { key: string; title: string; url: string }[]
		suffix: string
	} {
		const startIdx = body.indexOf(GithubAdapter.MARKER_START)
		const endIdx = body.indexOf(GithubAdapter.MARKER_END)
		if (startIdx === -1 || endIdx === -1 || endIdx < startIdx) {
			return { prefix: body, refs: [], suffix: '' }
		}
		const between = body.slice(startIdx + GithubAdapter.MARKER_START.length, endIdx)
		const refs: { key: string; title: string; url: string }[] = []
		const linkRe = /-\s*\[([^\]]+)\]\(([^)]+)\)/g
		let m: RegExpExecArray | null
		while ((m = linkRe.exec(between)) !== null) {
			// We don't know the canonical `key` from a markdown link alone;
			// derive a stable one from the URL so duplicate detection works.
			refs.push({ key: m[2], title: m[1], url: m[2] })
		}
		return {
			prefix: body.slice(0, startIdx),
			refs,
			suffix: body.slice(endIdx + GithubAdapter.MARKER_END.length),
		}
	}
}

// ---- exported helper for the HTTP layer to verify GitHub deliveries ----

export const GITHUB_WEBHOOK_SECRET_FOR_VERIFY = GITHUB_WEBHOOK_SECRET
