import { UnknownRecord } from '@tldraw/store'
import {
	actorCan,
	canEditRecord,
	defineCommand,
	defineCommandSet,
	runCommand,
	TLCommandReader,
} from './commands'

type Rec = UnknownRecord & { n?: number }

const reader = (records: Rec[]): TLCommandReader<Rec> => {
	const map = new Map(records.map((r) => [r.id as string, r]))
	return { get: (id) => map.get(id), values: () => map.values() }
}
const num = { validate: (v: unknown) => v as { id: string; by: number } }
const anyone = { userId: 'u', permissions: [] }

const set = defineCommandSet<Rec>({
	commands: [
		defineCommand<Rec, { id: string; by: number }>({
			name: 'add',
			args: num,
			run(ctx, { id, by }) {
				const rec = ctx.get(id) ?? ctx.deny('missing')
				ctx.update(rec.id, { n: (rec.n ?? 0) + by })
				if ((ctx.get(id)!.n ?? 0) > 10) ctx.deny('too big')
			},
		}),
		defineCommand<Rec, { id: string; by: number }>({
			name: 'admin.reset',
			requires: 'admin',
			args: num,
			run(ctx, { id }) {
				ctx.delete(id)
			},
		}),
	],
})

describe('runCommand', () => {
	const r = reader([{ id: 'x:1', typeName: 'x', n: 5 } as Rec])

	it('returns the final records, and reads see earlier writes', () => {
		expect(runCommand(set, r, anyone, { name: 'add', args: { id: 'x:1', by: 2 } })).toEqual({
			ok: true,
			writes: { puts: [{ id: 'x:1', typeName: 'x', n: 7 }], deletes: [] },
		})
	})

	it('writes nothing when the command denies after writing', () => {
		expect(runCommand(set, r, anyone, { name: 'add', args: { id: 'x:1', by: 9 } })).toEqual({
			ok: false,
			reason: 'too big',
		})
		expect(r.get('x:1')!.n).toBe(5)
	})

	it('checks `requires` before it runs', () => {
		const call = { name: 'admin.reset', args: { id: 'x:1', by: 0 } }
		expect(runCommand(set, r, anyone, call)).toEqual({
			ok: false,
			reason: 'missing permission: admin',
		})
		expect(runCommand(set, r, { userId: null, permissions: ['*'] }, call)).toMatchObject({
			ok: true,
			writes: { deletes: ['x:1'] },
		})
	})

	it('rejects unknown commands and invalid args', () => {
		expect(runCommand(set, r, anyone, { name: 'nope', args: {} })).toMatchObject({ ok: false })
		const strict = defineCommandSet<Rec>({
			commands: [
				defineCommand({
					name: 'c',
					args: {
						validate: () => {
							throw new Error('bad')
						},
					},
					run() {},
				}),
			],
		})
		expect(runCommand(strict, r, anyone, { name: 'c', args: 1 })).toEqual({
			ok: false,
			reason: 'invalid args: bad',
		})
	})

	it('refuses duplicate command names', () => {
		const c = defineCommand<Rec, any>({ name: 'd', args: num, run() {} })
		expect(() => defineCommandSet({ commands: [c, c] })).toThrow('Duplicate command: d')
	})
})

describe('canEditRecord', () => {
	const rec = { id: 'x:1', typeName: 'x' } as Rec
	const none = { get: () => undefined, getAll: () => [] }
	const ctx = {
		op: 'update' as const,
		prev: rec,
		next: rec,
		...none,
		before: none,
		isClient: false,
	}

	it('needs the edit permission unless the type is open', () => {
		const s = defineCommandSet<Rec>({ edit: { openTypes: ['open'] } })
		expect(canEditRecord(s, anyone, ctx)).toBe(false)
		expect(canEditRecord(s, { userId: 'u', permissions: ['edit'] }, ctx)).toBe(true)
		const open = { ...rec, typeName: 'open' }
		expect(canEditRecord(s, anyone, { ...ctx, prev: open, next: open })).toBe(true)
	})

	it('denies command-only types for everyone', () => {
		const s = defineCommandSet<Rec>({ edit: { commandOnlyTypes: ['x'] } })
		expect(canEditRecord(s, { userId: 'u', permissions: ['*'] }, ctx)).toBe(false)
	})

	it('treats * as every permission', () => {
		expect(actorCan({ userId: null, permissions: ['*'] }, 'anything')).toBe(true)
		expect(actorCan({ userId: null, permissions: [] }, undefined)).toBe(true)
	})
})
