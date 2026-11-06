/**
 * Random pushes, user changes, rule changes, external writes, and reconnects against a rules room.
 * After every flush, each client must hold exactly what the rules let it read, with hidden fields
 * replaced: no more (a leak), no less, and no stale placeholder.
 */
import { compileRules, useCaseRules, type TLRuleUser, type TLRulesDefinition } from '@tldraw/rules'
import { describe, it } from 'vitest'
import { R, disposables, doc, makeRoom, page, shape } from './rulesHarness'

function rng(seed: number) {
	let s = seed >>> 0 || 1
	return () => {
		s ^= s << 13
		s >>>= 0
		s ^= s >> 17
		s ^= s << 5
		s >>>= 0
		return s / 4294967296
	}
}

function permissive(def: TLRulesDefinition): TLRulesDefinition {
	const types: any = {}
	for (const [t, v] of Object.entries(def.types ?? {})) {
		const { create: _c, update: _u, delete: _d, ...rest } = v as any
		types[t] = rest
	}
	return { ...def, types, default: { ...def.default, write: 'true' } } as any
}

const card = (text: string) => ({
	type: 'doc',
	content: [{ type: 'paragraph', content: [{ type: 'text', text }] }],
})

interface Scenario {
	name: string
	rules: TLRulesDefinition[]
	users: TLRuleUser[]
}
const scenarios: Scenario[] = [
	{
		name: 'reveal',
		rules: [
			permissive(useCaseRules.reveal),
			useCaseRules.reveal,
			{ ...permissive(useCaseRules.reveal), pushes: 'per-record' } as any,
		],
		users: [{ id: 'dealer', role: 'dealer' }, { id: 'a' }, { id: 'b' }, { id: 'c', role: 'x' }],
	},
	{
		name: 'teamPages',
		rules: [
			permissive(useCaseRules.teamPages),
			useCaseRules.teamPages,
			{ ...useCaseRules.teamPages, pushes: 'per-record' } as any,
		],
		users: [
			{ id: 'r', teams: ['red'] },
			{ id: 'b', teams: ['blue'] },
			{ id: 'n', teams: [] },
			{ id: 'rb', teams: ['red', 'blue'] },
		],
	},
	{
		name: 'agent',
		rules: [
			permissive(useCaseRules.agent),
			useCaseRules.agent,
			{ ...useCaseRules.agent, pushes: 'per-record' } as any,
		],
		users: [
			{ id: 'h' },
			{ id: 'ag', role: 'agent', area: 'shape:f1' },
			{ id: 'ag2', role: 'agent', area: 'shape:f2' },
			{ id: 'ag3', role: 'agent', area: 'shape:s1' },
		],
	},
	{
		name: 'mixed',
		rules: [
			permissive(useCaseRules.reveal),
			permissive(useCaseRules.teamPages),
			permissive(useCaseRules.agent),
			useCaseRules.teamPages,
		],
		users: [
			{ id: 'dealer', role: 'dealer', teams: ['red'] },
			{ id: 'a', teams: [] },
			{ id: 'ag', role: 'agent', area: 'shape:f1', teams: ['blue'] },
			{ id: 'h', teams: ['red', 'blue'] },
		],
	},
]

function initial(): R[] {
	return [
		doc(),
		page('main'),
		page('p2', { team: 'red' }),
		page('p3'),
		shape('f1', { type: 'frame' }),
		shape('f2', { type: 'frame', parentId: 'shape:f1' }),
		shape('s1', { parentId: 'shape:f1', props: { richText: card('one') }, meta: { holder: 'a' } }),
		shape('s2', { parentId: 'shape:f2', props: { richText: card('two') }, meta: { holder: 'b' } }),
		shape('s3', { parentId: 'page:p2', props: { richText: card('three') } }),
		shape('s4', { props: { richText: card('four') }, meta: { holder: 'a', revealed: true } }),
		{ id: 'binding:b1', typeName: 'binding', fromId: 'shape:s1', toId: 'shape:s3', meta: {} },
	]
}

const parents = [
	'page:main',
	'page:p2',
	'page:p3',
	'shape:f1',
	'shape:f2',
	'shape:s1',
	'shape:missing',
]

function strip(r: R) {
	return JSON.parse(JSON.stringify(r))
}

function runFuzz(sc: Scenario, seed: number, steps: number) {
	const rand = rng(seed)
	const pick = <T>(xs: T[]): T => xs[Math.floor(rand() * xs.length)]
	const log: string[] = []
	let ruleIdx = 0
	const room = makeRoom(sc.rules[0], initial())
	const clients = sc.users.map((u, i) => room.connect(u, i % 2 ? 'page:p2' : 'page:main'))
	const users = new Map(clients.map((c) => [c.id, c.user]))
	let nextId = 0

	const check = (label: string) => {
		const sroom = room.server.room as any
		const rules = compileRules(sc.rules[ruleIdx])
		const docs = room.server.storage.getSnapshot().documents.map((d) => d.state)
		const pres = [...sroom.presenceStore.values()] as R[]
		const all = new Map<string, R>([...docs, ...pres].map((r) => [r.id, r]))
		const get = (id: string) => all.get(id)
		for (const c of clients) {
			const session = sroom.sessions.get(c.id)
			if (!session) continue
			if (c.store.isPossiblyCorrupted() || !(c.client as any).isConnectedToRoom)
				throw new Error(
					`[${sc.name} seed ${seed}] after ${label}: client ${c.id} corrupted=${c.store.isPossiblyCorrupted()} connected=${(c.client as any).isConnectedToRoom}\nlog:\n${log.join('\n')}`
				)
			const own = session.presenceId
			const user = users.get(c.id)!
			const expected: Record<string, R> = {}
			for (const r of all.values()) {
				if (r.id === own) continue
				if (rules.canRead(r, user, get)) expected[r.id] = strip(rules.redact(r, user, get))
			}
			const actual: Record<string, R> = {}
			for (const r of c.store.allRecords()) {
				if (r.typeName === 'instance_presence' && r.id === `instance_presence:${c.id}`) continue
				if (r.id === own) continue
				actual[r.id] = strip(r)
			}
			const ek = Object.keys(expected).sort()
			const ak = Object.keys(actual).sort()
			const diffs: string[] = []
			for (const k of new Set([...ek, ...ak])) {
				if (!(k in expected)) diffs.push(`extra ${k}`)
				else if (!(k in actual)) diffs.push(`missing ${k}`)
				else if (JSON.stringify(expected[k]) !== JSON.stringify(actual[k]))
					diffs.push(
						`value ${k}: exp ${JSON.stringify(expected[k])} got ${JSON.stringify(actual[k])}`
					)
			}
			if (diffs.length) {
				throw new Error(
					`[${sc.name} seed ${seed}] after ${label}: client ${c.id} ${JSON.stringify(user)}:\n  ${diffs.join('\n  ')}\nlog:\n${log.join('\n')}`
				)
			}
		}
	}
	check('connect')

	for (let step = 0; step < steps; step++) {
		const c = pick(clients)
		const roll = rand()
		const held = c.store
			.allRecords()
			.filter((r) => r.typeName === 'shape' || r.typeName === 'page' || r.typeName === 'binding')
		const shapes = held.filter((r) => r.typeName === 'shape')
		const pagesHeld = held.filter((r) => r.typeName === 'page')
		const nOps = rand() < 0.3 ? 2 + Math.floor(rand() * 2) : 1
		if (roll < 0.08) {
			const u = pick(sc.users)
			users.set(c.id, u)
			log.push(`updateSessionUser(${c.id}, ${JSON.stringify(u)})`)
			room.server.room.updateSessionUser(c.id, u)
		} else if (roll < 0.12) {
			ruleIdx = Math.floor(rand() * sc.rules.length)
			log.push(`updateRules(${ruleIdx})`)
			room.server.room.updateRules(sc.rules[ruleIdx])
		} else if (roll < 0.15) {
			const docs = room.server.storage
				.getSnapshot()
				.documents.map((d) => d.state)
				.filter((r: R) => r.typeName === 'shape' || r.typeName === 'page')
			const t = pick(docs) as R
			const r3 = rand()
			let next: R
			if (t.typeName === 'page')
				next = { ...t, meta: rand() < 0.5 ? { team: pick(['red', 'blue']) } : {} }
			else if (r3 < 0.3) next = { ...t, meta: { ...t.meta, hidden: rand() < 0.5 } }
			else if (r3 < 0.6) next = { ...t, meta: { ...t.meta, holder: pick(['a', 'b', null]) } }
			else if (r3 < 0.8) {
				let p = pick(parents)
				if (t.id === 'shape:f1' && p.startsWith('shape:')) p = 'page:p3'
				if (t.id === 'shape:f2' && (p === 'shape:f2' || p === 'shape:s1')) p = 'page:main'
				if (p === t.id) p = 'page:main'
				next = { ...t, parentId: p }
			} else next = { ...t, props: { ...t.props, richText: card('ext' + step) } }
			log.push(`external set ${JSON.stringify(next)}`)
			room.server.storage.transaction((txn: any) => txn.set(t.id, next))
			;(room.server.room as any).broadcastExternalStorageChanges()
		} else if (roll < 0.18) {
			const u = pick(sc.users)
			users.set(c.id, u)
			log.push(`reconnect ${c.id} as ${JSON.stringify(u)}`)
			c.socket.disconnect()
			room.flush()
			c.socket.connectOpts = { user: u }
			c.socket.connect()
		} else if (roll < 0.2) {
			const p = pick(['page:main', 'page:p2', 'page:p3'])
			log.push(`${c.id} presence -> ${p}`)
			c.presence.update((x: R) => (x ? { ...x, currentPageId: p } : x))
		} else {
			const ops: R[] = []
			const dels: string[] = []
			const desc: string[] = []
			for (let k = 0; k < nOps; k++) {
				const r2 = rand()
				const target = pick(shapes)
				if (r2 < 0.04) {
					ops.push(
						shape('missing', {
							type: 'frame',
							parentId: pick(['page:main', 'page:p2']),
							meta: rand() < 0.5 ? { hidden: true } : {},
						})
					)
					desc.push('create shape:missing')
				} else if (r2 < 0.15) {
					const id = `shape:n${nextId++}`
					const rec = shape(id.slice(6), {
						parentId: pick(parents),
						props: { richText: card('new' + nextId) },
						meta: rand() < 0.5 ? { holder: pick(['a', 'b', 'dealer']) } : {},
					})
					ops.push(rec)
					desc.push(`create ${id} parent=${rec.parentId} meta=${JSON.stringify(rec.meta)}`)
				} else if (r2 < 0.22 && target && !['shape:f1'].includes(target.id)) {
					dels.push(target.id)
					desc.push(`delete ${target.id}`)
				} else if (r2 < 0.27) {
					const id = `binding:n${nextId++}`
					const from = pick(['shape:s1', 'shape:s2', 'shape:s3', 'shape:s4', 'shape:f2'])
					ops.push({ id, typeName: 'binding', fromId: from, toId: 'shape:s4', meta: {} })
					desc.push(`create ${id} from=${from}`)
				} else if (r2 < 0.35 && pagesHeld.length) {
					const pg = pick(pagesHeld)
					const team = pick([undefined, 'red', 'blue'])
					const meta = { ...pg.meta }
					if (team) meta.team = team
					else delete meta.team
					ops.push({ ...pg, meta })
					desc.push(`page ${pg.id} team=${team}`)
				} else if (target) {
					const r3 = rand()
					let next: R
					if (r3 < 0.25) {
						let p = pick(parents)
						if (target.id === 'shape:f1' && p.startsWith('shape:')) p = 'page:p3'
						if (target.id === 'shape:f2' && (p === 'shape:f2' || p === 'shape:s1')) p = 'page:main'
						if (p === target.id) p = 'page:main'
						next = { ...target, parentId: p }
						desc.push(`${target.id}.parentId=${p}`)
					} else if (r3 < 0.45) {
						next = { ...target, x: target.x + 1 }
						desc.push(`${target.id}.x++`)
					} else if (r3 < 0.6) {
						const v = pick([true, false, undefined])
						next = { ...target, meta: { ...target.meta, hidden: v } }
						if (v === undefined) delete next.meta.hidden
						desc.push(`${target.id}.meta.hidden=${v}`)
					} else if (r3 < 0.75) {
						const v = pick([true, false])
						next = { ...target, meta: { ...target.meta, revealed: v } }
						desc.push(`${target.id}.meta.revealed=${v}`)
					} else if (r3 < 0.85) {
						const v = pick(['a', 'b', 'dealer', null])
						next = { ...target, meta: { ...target.meta, holder: v } }
						desc.push(`${target.id}.meta.holder=${v}`)
					} else {
						const t = 'txt' + Math.floor(rand() * 1000)
						next = { ...target, props: { ...target.props, richText: card(t) } }
						desc.push(`${target.id}.richText=${t}`)
					}
					ops.push(next)
				}
			}
			for (let i = ops.length - 1; i >= 0; i--) {
				const cur = c.store.get(ops[i].id as any)
				if (cur && JSON.stringify(cur) === JSON.stringify(ops[i])) ops.splice(i, 1)
			}
			if (!ops.length && !dels.length) continue
			log.push(`${c.id} push [${desc.join('; ')}]`)
			try {
				c.store.atomic(() => {
					if (ops.length) c.store.put(ops)
					if (dels.length) c.store.remove(dels as any)
				})
			} catch (e) {
				log.push(`  (local throw ${(e as Error).message})`)
			}
		}
		room.flush()
		check(`step ${step}: ${log[log.length - 1]}`)
	}
}

describe('read filtering under random pushes', () => {
	// Each run checks, after every flush, that every client holds exactly what the rules let it
	// read, with hidden fields replaced. Raise RULES_FUZZ_SEEDS and RULES_FUZZ_STEPS to search harder.
	const seeds = Number(process.env.RULES_FUZZ_SEEDS ?? 15)
	const steps = Number(process.env.RULES_FUZZ_STEPS ?? 40)
	for (const sc of scenarios) {
		it(`every client holds exactly what it may read: ${sc.name}`, () => {
			for (let seed = 1; seed <= seeds; seed++) {
				try {
					runFuzz(sc, seed, steps)
				} finally {
					while (disposables.length) disposables.pop()!()
				}
			}
		})
	}
})
