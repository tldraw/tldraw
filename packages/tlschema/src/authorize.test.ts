import { describe, expect, it } from 'vitest'
import { TLAuthorize, TLRecordChange, TLWriteContext, composeAuthorize } from './authorize'

const session = { sessionId: 's', meta: { userId: 'alice' } }
const ctx = {
	session,
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
		expect(composeAuthorize(yes, yes).read!(record, session)).toBe(true)
		expect(composeAuthorize(yes, no).read!(record, session)).toBe(false)
		expect(composeAuthorize(yes, yes).can!(session, 'tl:shape:create')).toBe(true)
		expect(composeAuthorize(yes, no).can!(session, 'tl:shape:create')).toBe(false)
	})

	it('leaves a hook unset when no object has it', () => {
		expect(composeAuthorize({ can: () => true }, {})).toEqual({ can: expect.any(Function) })
	})
})
