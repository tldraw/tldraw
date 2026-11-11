import { DatabaseSync } from 'node:sqlite'
import { composeRules, createStructureRule } from '@tldraw/permissions'
import { createRecordType, StoreSchema, type UnknownRecord } from '@tldraw/store'
import {
	getTlsyncProtocolVersion,
	InMemorySyncStorage,
	NodeSqliteWrapper,
	perRecord,
	SQLiteSyncStorage,
	TLSocketRoom,
	type TLSyncRule,
} from '@tldraw/sync-core'
import { isEqual } from '@tldraw/utils'
import { vi } from 'vitest'

// Random sessions push random, often malformed, edits to three rooms holding the same document:
// in memory, in memory with the push's ops shuffled, and SQLite. All three must match a model
// written apart from the rules, a refused push must change and broadcast nothing, and an
// accepted one must store exactly what was pushed. More runs: PERMISSIONS_FUZZ_SEEDS=500.

const NUM_SEEDS = Number(process.env.PERMISSIONS_FUZZ_SEEDS ?? 10)
const PUSHES = 30
const SESSIONS = ['s1', 's2', 's3']

type Rec = UnknownRecord & Record<string, any>
// ids stay plain strings here
const asRec = (r: Record<string, unknown>) => r as Rec
type Doc = Map<string, Rec>

// pass-through validators, so malformed records reach the rules instead of failing validation
const schema = StoreSchema.create<any>(
	Object.fromEntries(
		['page', 'shape', 'binding', 'asset', 'document'].map((t) => [
			t,
			createRecordType<any>(t, { scope: 'document', validator: { validate: (v) => v } }),
		])
	)
)

/** mulberry32: long period, seedable. */
class FuzzRandom {
	private state: number
	constructor(seed: number) {
		this.state = seed >>> 0 || 1
	}
	next() {
		let t = (this.state = (this.state + 0x6d2b79f5) >>> 0)
		t = Math.imul(t ^ (t >>> 15), t | 1)
		t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
		return ((t ^ (t >>> 14)) >>> 0) / 4294967296
	}
	int(n: number) {
		return Math.floor(this.next() * n)
	}
	bool(p = 0.5) {
		return this.next() < p
	}
	pick<T>(items: readonly T[]): T {
		return items[this.int(items.length)]
	}
	shuffle<T>(items: T[]): T[] {
		for (let i = items.length - 1; i > 0; i--) {
			const j = this.int(i + 1)
			;[items[i], items[j]] = [items[j], items[i]]
		}
		return items
	}
}

/** Stable [0, 1) from a string, so the deny rule is the same in every room. */
function hash(s: string) {
	let h = 2166136261
	for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619)
	return (h >>> 0) / 4294967296
}

let nextId = 0
const id = (prefix: string) => `${prefix}:n${nextId++}`
const page = (pageId: string): Rec =>
	asRec({ id: pageId, typeName: 'page', name: pageId, index: 'a1' })
const shape = (parentId: string, type = 'geo'): Rec =>
	asRec({ id: id('shape'), typeName: 'shape', type, parentId, x: 0 })
const binding = (fromId: string, toId: string): Rec =>
	asRec({ id: id('binding'), typeName: 'binding', fromId, toId, terminal: 'end' })

const ofType = (doc: Doc, typeName: string) =>
	[...doc.values()].filter((r) => r.typeName === typeName)
const isContainer = (r: Rec) => r.type === 'frame' || r.type === 'group'

/** The page a shape ends up on, walking parents; null for a missing parent, a non-shape parent or a cycle. */
function pageOf(doc: Doc, start: Rec): string | null {
	const seen = new Set<string>()
	let current: Rec | undefined = start
	while (current && current.typeName === 'shape') {
		if (seen.has(current.id)) return null
		seen.add(current.id)
		current = doc.get(current.parentId)
	}
	return current?.typeName === 'page' ? current.id : null
}

function subtree(doc: Doc, rootId: string) {
	const out = new Set([rootId])
	for (let grew = true; grew; ) {
		grew = false
		for (const s of ofType(doc, 'shape')) {
			if (!out.has(s.id) && out.has(s.parentId)) grew = !!out.add(s.id)
		}
	}
	return out
}

function generateDocument(rng: FuzzRandom): Doc {
	const doc: Doc = new Map()
	const pageIds = Array.from({ length: 1 + rng.int(3) }, () => id('page'))
	for (const p of pageIds) doc.set(p, page(p))
	if (rng.bool(0.5)) doc.set('asset:a', asRec({ id: 'asset:a', typeName: 'asset' }))
	for (let i = 0, n = rng.int(12); i < n; i++) {
		const containers = ofType(doc, 'shape').filter(isContainer)
		const parentId =
			containers.length && rng.bool(0.4) ? rng.pick(containers).id : rng.pick(pageIds)
		const s = shape(parentId, rng.pick(['geo', 'geo', 'frame', 'group']))
		doc.set(s.id, s)
	}
	for (let i = 0, n = rng.int(4); i < n; i++) {
		const shapes = ofType(doc, 'shape')
		const from = shapes.length ? rng.pick(shapes) : null
		const to = from && shapes.find((s) => s !== from && pageOf(doc, s) === pageOf(doc, from))
		if (from && to) {
			const b = binding(from.id, to.id)
			doc.set(b.id, b)
		}
	}
	return doc
}

/** A random edit: 1-3 ops, a quarter of them deliberately broken. */
function generateEdit(rng: FuzzRandom, before: Doc): Doc {
	const w: Doc = new Map(before)
	for (let i = 0, n = 1 + rng.int(3); i < n; i++) applyRandomOp(rng, w, rng.bool(0.25))
	return w
}

function applyRandomOp(rng: FuzzRandom, w: Doc, bad: boolean) {
	const pageIds = ofType(w, 'page').map((p) => p.id)
	const shapes = ofType(w, 'shape')
	const bindings = ofType(w, 'binding')
	const brokenRef = () =>
		rng.pick(['shape:missing', 'page:missing', 'asset:a', ...pageIds, ...shapes.map((s) => s.id)])
	const set = (r: Rec) => w.set(r.id, r)
	const ops: Array<() => void> = [
		() => {
			const options = [...pageIds, ...shapes.filter(isContainer).map((s) => s.id)]
			set(
				shape(bad || !options.length ? brokenRef() : rng.pick(options), rng.pick(['geo', 'frame']))
			)
		},
		() => set(page(id('page'))),
	]
	if (shapes.length) {
		ops.push(
			() => {
				const s = rng.pick(shapes)
				set({ ...s, x: s.x + 1 })
			},
			() => {
				const s = rng.pick(shapes)
				const sub = subtree(w, s.id)
				const options = [
					...pageIds,
					...shapes.filter((c) => isContainer(c) && !sub.has(c.id)).map((c) => c.id),
				]
				// a bad reparent can make a cycle (into its own subtree) or point at nothing
				const parentId = bad
					? rng.pick([...sub, 'shape:missing'])
					: options.length
						? rng.pick(options)
						: null
				if (parentId) set({ ...s, parentId })
			},
			() => {
				const s = rng.pick(shapes)
				const doomed = bad ? new Set([s.id]) : subtree(w, s.id)
				for (const d of doomed) w.delete(d)
				for (const b of bindings)
					if (!bad && (doomed.has(b.fromId) || doomed.has(b.toId))) w.delete(b.id)
			},
			() => {
				const from = rng.pick(shapes)
				const to = bad ? brokenRef() : rng.pick(shapes.filter((s) => s.id !== from.id))?.id
				if (to) set(binding(from.id, to))
			}
		)
	}
	if (bindings.length) {
		ops.push(
			() => {
				const b = rng.pick(bindings)
				set(
					rng.bool()
						? { ...b, terminal: 'start' }
						: { ...b, toId: bad ? brokenRef() : (rng.pick(shapes)?.id ?? 'shape:missing') }
				)
			},
			() => w.delete(rng.pick(bindings).id)
		)
	}
	if (pageIds.length > 1) ops.push(() => w.delete(rng.pick(pageIds)))
	rng.pick(ops)()
}

/** Records the push breaks, by the rules the structure rule promises, written without its code. */
function structureBreaks(before: Doc, after: Doc): string[] {
	const broken: string[] = []
	for (const [recordId, next] of after) {
		const prev = before.get(recordId)
		if (prev && isEqual(prev, next)) continue
		if (next.typeName === 'shape' && (!prev || prev.parentId !== next.parentId)) {
			if (!pageOf(after, next)) broken.push(recordId)
		}
		if (
			next.typeName === 'binding' &&
			(!prev || prev.fromId !== next.fromId || prev.toId !== next.toId)
		) {
			const from = after.get(next.fromId)
			const to = after.get(next.toId)
			const fromPage = from?.typeName === 'shape' ? pageOf(after, from) : null
			const toPage = to?.typeName === 'shape' ? pageOf(after, to) : null
			if (!fromPage || fromPage !== toPage) broken.push(recordId)
		}
	}
	return broken
}

const denies = (sessionId: string, recordId: string, type: string) =>
	hash(`${sessionId}|${recordId}|${type}`) < 0.15

const denyRule = perRecord<any, undefined>(({ record, type }, { session }) =>
	denies(session.sessionId, record.id, type) ? 'denied' : null
)

class World {
	room: TLSocketRoom<any, undefined>
	storage: InMemorySyncStorage<any> | SQLiteSyncStorage<any>
	sockets = new Map<string, ReturnType<typeof makeSocket>>()
	errors: string[] = []
	expected: { before: Doc; after: Doc } | null = null
	private clock = 0

	constructor(doc: Doc, sqlite: boolean) {
		const snapshot = {
			documents: [...doc.values()].map((state) => ({ state, lastChangedClock: 0 })),
			clock: 0,
			documentClock: 0,
			schema: schema.serialize(),
		}
		this.storage = sqlite
			? new SQLiteSyncStorage<any>({
					sql: new NodeSqliteWrapper(new DatabaseSync(':memory:')),
					snapshot,
				})
			: new InMemorySyncStorage<any>({ snapshot })
		// what the rule reads must be the document the push started from and the one it would leave
		const observe: TLSyncRule<any, undefined> = ({ changes, before, after }) => {
			for (const { prev, next } of changes) {
				const recordId = (next ?? prev).id
				if (!isEqual(before(recordId), this.expected!.before.get(recordId)))
					this.errors.push(`before(${recordId}) is not the stored record`)
				if (!isEqual(after(recordId), this.expected!.after.get(recordId)))
					this.errors.push(`after(${recordId}) is not the pushed record`)
			}
			return null
		}
		this.room = new TLSocketRoom<any, undefined>({
			schema,
			storage: this.storage,
			authorize: composeRules(observe, createStructureRule(), denyRule),
			log: { warn: () => {}, error: (...args: any[]) => this.errors.push(args.join(' ')) },
		})
		for (const sessionId of SESSIONS) {
			const socket = makeSocket()
			this.room.handleSocketConnect({ sessionId, socket })
			this.room.handleSocketMessage(
				sessionId,
				JSON.stringify({
					type: 'connect',
					connectRequestId: 'c-' + sessionId,
					lastServerClock: 0,
					protocolVersion: getTlsyncProtocolVersion(),
					schema: schema.serialize(),
				})
			)
			this.sockets.set(sessionId, socket)
		}
	}

	read(): Doc {
		return new Map(this.storage.getSnapshot().documents.map((d) => [d.state.id, d.state as Rec]))
	}

	push(sessionId: string, before: Doc, after: Doc, order: string[]) {
		this.expected = { before, after }
		const ops: Record<string, unknown> = {}
		for (const recordId of order) {
			ops[recordId] = after.has(recordId) ? ['put', after.get(recordId)] : ['remove']
		}
		for (const socket of this.sockets.values()) socket.send.mockClear()
		const clientClock = ++this.clock
		this.room.handleSocketMessage(
			sessionId,
			JSON.stringify({ type: 'push', clientClock, diff: ops })
		)
		for (const s of SESSIONS) (this.room as any).room._flushDataMessages(s)
		const sent = (s: string) =>
			this.sockets
				.get(s)!
				.send.mock.calls.map((c) => JSON.parse(c[0]))
				.flatMap((m: any) => (m.type === 'data' ? m.data : [m]))
		const result = sent(sessionId).find((m: any) => m.type === 'push_result')
		const broadcast = SESSIONS.filter((s) => s !== sessionId).some((s) =>
			sent(s).some((m: any) => m.type === 'patch')
		)
		return { result, broadcast }
	}
}

function makeSocket() {
	return {
		send: vi.fn(),
		close: vi.fn(),
		readyState: 1,
		addEventListener: vi.fn(),
		removeEventListener: vi.fn(),
	}
}

function runSeed(seed: number) {
	const rng = new FuzzRandom(seed)
	let doc = generateDocument(rng)
	const worlds = [new World(doc, false), new World(doc, false), new World(doc, true)]
	const stats = { accepted: 0, structure: 0, denied: 0 }

	for (let i = 0; i < PUSHES; i++) {
		const sessionId = rng.pick(SESSIONS)
		const after = generateEdit(rng, doc)
		const touched = [...new Set([...doc.keys(), ...after.keys()])].filter(
			(k) => !isEqual(doc.get(k), after.get(k))
		)
		if (touched.length === 0) continue
		const where = `seed ${seed}, push ${i} by ${sessionId}: ${touched.join(', ')}`
		const shuffled = rng.shuffle([...touched])
		const outcomes = worlds.map((w, n) =>
			w.push(sessionId, doc, after, n === 1 ? shuffled : touched)
		)

		// the model's verdict
		const breaks = structureBreaks(doc, after)
		const deniedIds = touched
			.filter((k) =>
				denies(sessionId, k, !doc.has(k) ? 'create' : !after.has(k) ? 'delete' : 'update')
			)
			.sort()
		const expected = breaks.length
			? 'structure'
			: deniedIds.length
				? { reason: 'denied', ids: deniedIds }
				: 'commit'

		for (const [n, { result, broadcast }] of outcomes.entries()) {
			const room = ['memory', 'memory shuffled', 'sqlite'][n]
			expect(result, `${where} (${room}): no push_result`).toBeDefined()
			if (expected === 'commit') {
				// a client that is behind gets its accepted push back as a rebase
				expect(result.action, `${where} (${room})`).not.toBe('discard')
				expect(worlds[n].read(), `${where} (${room}): stored`).toEqual(after)
			} else {
				expect(result.action, `${where} (${room})`).toBe('discard')
				expect(worlds[n].read(), `${where} (${room}): a refused push changed storage`).toEqual(doc)
				expect(broadcast, `${where} (${room}): a refused push was broadcast`).toBe(false)
				if (expected === 'structure') {
					expect(result.refused.reason, `${where} (${room}), breaks ${breaks}`).toMatch(
						/^(dangling parent|dangling binding|split binding)$/
					)
				} else {
					expect(result.refused, `${where} (${room})`).toEqual(expected)
				}
			}
			expect(worlds[n].errors, `${where} (${room})`).toEqual([])
		}
		if (expected === 'commit') {
			stats.accepted++
			doc = after
		} else if (expected === 'structure') stats.structure++
		else stats.denied++
	}
	for (const w of worlds) w.room.close()
	return stats
}

describe('permissions fuzz through TLSocketRoom', () => {
	for (let i = 0; i < NUM_SEEDS; i++) {
		const seed = Math.floor(Math.random() * 2 ** 32)
		it(`seed ${seed}`, () => {
			const stats = runSeed(seed)
			expect(stats.accepted + stats.structure + stats.denied).toBeGreaterThan(0)
		})
	}

	it('exercises every outcome across a fixed batch of seeds', () => {
		const totals = { accepted: 0, structure: 0, denied: 0 }
		for (let seed = 1; seed <= 30; seed++) {
			const stats = runSeed(seed)
			totals.accepted += stats.accepted
			totals.structure += stats.structure
			totals.denied += stats.denied
		}
		expect(totals.accepted).toBeGreaterThan(50)
		expect(totals.structure).toBeGreaterThan(20)
		expect(totals.denied).toBeGreaterThan(20)
	})
})
