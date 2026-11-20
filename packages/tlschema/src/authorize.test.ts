import { describe, expect, it } from 'vitest'
import {
	TLAuthorize,
	TLRecordChange,
	TLWriteContext,
	bindAuthorizeCan,
	composeAuthorize,
} from './authorize'

const user = { userId: 'alice' }
const readCtx = { ...user, can: () => true }
const ctx = {
	...readCtx,
	before: { get: () => undefined },
	after: { get: () => undefined },
} as TLWriteContext
const changes: TLRecordChange[] = []

describe('composeAuthorize', () => {
	it('returns the first refusal from write, in order', () => {
		const calls: string[] = []
		const a: TLAuthorize = { write: () => (calls.push('a'), null) }
		const b: TLAuthorize = { write: () => (calls.push('b'), { reason: 'b' }) }
		const c: TLAuthorize = { write: () => (calls.push('c'), { reason: 'c' }) }
		expect(composeAuthorize(a, b, c).write!(changes, ctx)).toEqual({ reason: 'b' })
		expect(calls).toEqual(['a', 'b'])
	})

	it('allows read and can only when every hook allows', () => {
		const yes: TLAuthorize = { read: () => true, can: () => true }
		const no: TLAuthorize = { read: () => false, can: () => false }
		const record = {} as any
		expect(composeAuthorize(yes, yes).read!(record, readCtx)).toBe(true)
		expect(composeAuthorize(yes, no).read!(record, readCtx)).toBe(false)
		expect(composeAuthorize(yes, yes).can!('tl:shape:create', undefined, user)).toBe(true)
		expect(composeAuthorize(yes, no).can!('tl:shape:create', undefined, user)).toBe(false)
	})

	it('binds can to a user, and allows everything with no can', () => {
		const can: TLAuthorize['can'] = (_permission, _data, { userId }) => userId === 'alice'
		expect(bindAuthorizeCan(can, user)('tl:shape:create')).toBe(true)
		expect(bindAuthorizeCan(can, { userId: 'bob' })('tl:shape:create')).toBe(false)
		expect(bindAuthorizeCan(undefined, { userId: 'bob' })('tl:shape:create')).toBe(true)
	})

	it('leaves a hook unset when no object has it', () => {
		expect(composeAuthorize({ can: () => true }, {})).toEqual({ can: expect.any(Function) })
	})
})
