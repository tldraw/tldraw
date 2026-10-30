import { RoomSnapshot } from '@tldraw/sync-core'
import { VersionAuthor } from './versionIndexStorage'

export interface SeedVersion {
	iso: string
	snapshot: RoomSnapshot
	authors: VersionAuthor[]
	name: string | null
}

const MINUTE = 60_000
const DAY = 24 * 60 * MINUTE

// Spread so every thinning tier shows up: weekly (>30d), daily (8-30d), and all sessions (<7d).
const SESSIONS: {
	daysAgo: number
	hour: number
	versions: number
	authors: number[]
	name?: string
}[] = [
	{ daysAgo: 40, hour: 10, versions: 2, authors: [0], name: 'First sketch' },
	{ daysAgo: 20, hour: 14, versions: 3, authors: [0, 1] },
	{ daysAgo: 12, hour: 9, versions: 2, authors: [1] },
	{ daysAgo: 6, hour: 11, versions: 4, authors: [0], name: 'Before review' },
	{ daysAgo: 6, hour: 16, versions: 2, authors: [2] },
	{ daysAgo: 3, hour: 13, versions: 3, authors: [0, 1] },
	{ daysAgo: 1, hour: 10, versions: 3, authors: [1, 2], name: 'Reviewed' },
	{ daysAgo: 1, hour: 15, versions: 2, authors: [0] },
	{ daysAgo: 0, hour: -1, versions: 2, authors: [0] },
]

type Rec = {
	id: string
	typeName: string
	parentId?: string
	index?: string
	x?: number
	y?: number
} & Record<string, any>

/** Shapes in an order where parents and arrow endpoints always come before what depends on them. */
function buildOrder(shapes: Rec[], bindings: Rec[]): Rec[] {
	const byId = new Map(shapes.map((s) => [s.id, s]))
	const deps = new Map<string, string[]>()
	for (const s of shapes) deps.set(s.id, byId.has(s.parentId!) ? [s.parentId!] : [])
	for (const b of bindings) deps.get(b.fromId)?.push(b.toId)
	const sorted = [...shapes].sort(
		(a, b) =>
			Number(a.type === 'arrow') - Number(b.type === 'arrow') || (a.index! < b.index! ? -1 : 1)
	)
	const out: Rec[] = []
	const placed = new Set<string>()
	const place = (s: Rec) => {
		if (placed.has(s.id)) return
		placed.add(s.id)
		for (const d of deps.get(s.id) ?? []) if (byId.has(d)) place(byId.get(d)!)
		out.push(s)
	}
	sorted.forEach(place)
	return out
}

/**
 * Fake history ending in `current`: earlier versions hold a growing prefix of its shapes, with a
 * nudged shape here and there so versions show updates as well as additions.
 */
export function planSeedVersions(args: {
	current: RoomSnapshot
	userIds: string[]
	now: number
}): SeedVersion[] {
	const { current, userIds, now } = args
	const records = current.documents.map((d) => d.state as Rec)
	const shapes = records.filter((r) => r.typeName === 'shape')
	const bindings = records.filter((r) => r.typeName === 'binding')
	const rest = current.documents.filter((d) => {
		const t = (d.state as Rec).typeName
		return t !== 'shape' && t !== 'binding'
	})
	const order = buildOrder(shapes, bindings)

	const total = SESSIONS.reduce((n, s) => n + s.versions, 0)
	const versions: SeedVersion[] = []
	let i = 0
	for (const session of SESSIONS) {
		const start =
			session.hour < 0
				? now - (session.versions + 1) * 6 * MINUTE
				: startOfDay(now - session.daysAgo * DAY) + session.hour * 60 * MINUTE
		for (let v = 0; v < session.versions; v++) {
			i++
			const isLast = i === total
			const count = isLast ? order.length : Math.max(1, Math.round((order.length * i) / total))
			const kept = new Set(order.slice(0, count).map((s) => s.id))
			// Nudge the newest shape on odd steps: the next version moves it back, an update.
			const nudged = !isLast && i % 2 === 1 ? order[count - 1]?.id : undefined
			const nudgeClock = (current.documentClock ?? 0) + i
			const documents = [
				...rest,
				...current.documents
					.filter((d) => {
						const r = d.state as Rec
						if (r.typeName === 'shape') return kept.has(r.id)
						if (r.typeName === 'binding') return kept.has(r.fromId) && kept.has(r.toId)
						return false
					})
					.map((d) =>
						d.state.id === nudged
							? {
									// A fresh clock, or the delta builder reads it as unchanged and replay fails its hash.
									lastChangedClock: nudgeClock,
									state: { ...d.state, x: ((d.state as Rec).x ?? 0) - 60 },
								}
							: d
					),
			]
			const authorIdx = session.authors[v % session.authors.length]
			versions.push({
				iso: new Date(isLast ? now : start + v * 7 * MINUTE).toISOString(),
				snapshot: isLast
					? current
					: nudged
						? {
								...current,
								documents,
								clock: Math.max(current.clock ?? 0, nudgeClock),
								documentClock: nudgeClock,
							}
						: { ...current, documents },
				authors: [{ userId: userIds[authorIdx % userIds.length] }],
				name: session.name && v === session.versions - 1 ? session.name : null,
			})
		}
	}
	return versions
}

function startOfDay(t: number) {
	const d = new Date(t)
	d.setUTCHours(0, 0, 0, 0)
	return d.getTime()
}
