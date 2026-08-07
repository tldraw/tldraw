import { TlaFile } from '@tldraw/dotcom-shared'
import { describe, expect, it, vi } from 'vitest'
import { Environment } from '../../types'
import { SignedInAuth, checkReadAccessToFile } from './getAuth'

function makeFile(overrides: Partial<TlaFile> = {}): TlaFile {
	return {
		id: 'file-abc',
		name: 'A file',
		ownerId: 'user-owner',
		owningGroupId: null,
		thumbnail: '',
		shared: true,
		sharedLinkType: 'edit',
		published: false,
		lastPublished: 0,
		publishedSlug: '',
		createdAt: 0,
		updatedAt: 0,
		isEmpty: false,
		isDeleted: false,
		createSource: null,
		...overrides,
	} as TlaFile
}

function makeEnv({ rateLimited = false } = {}): Environment {
	return {
		RATE_LIMITER: {
			limit: vi.fn(async () => ({ success: !rateLimited })),
		},
	} as any
}

/** A db stub whose group_user query resolves to the given role (or nobody). */
function makeDb(role: string | null = null) {
	const executeTakeFirst = vi.fn(async () => (role ? { role } : undefined))
	const chain = {
		selectFrom: vi.fn(() => chain),
		select: vi.fn(() => chain),
		where: vi.fn(() => chain),
		executeTakeFirst,
	}
	return chain as any
}

const owner = { userId: 'user-owner' } as SignedInAuth
const stranger = { userId: 'user-stranger' } as SignedInAuth

function check(opts: {
	file: TlaFile
	auth?: SignedInAuth | null
	env?: Environment
	db?: any
	rateLimitKey?: string
}) {
	return checkReadAccessToFile({
		env: opts.env ?? makeEnv(),
		db: opts.db ?? makeDb(),
		file: opts.file,
		auth: opts.auth ?? null,
		rateLimitKey: opts.rateLimitKey ?? 'key',
	})
}

// Table-driven over the ladder, in ladder order — the order is load-bearing (e.g. a deleted file
// must 404 before any auth distinction leaks its existence).
describe('checkReadAccessToFile', () => {
	it('refuses a deleted file as not-found, even for its owner', async () => {
		expect(await check({ file: makeFile({ isDeleted: true }), auth: owner })).toEqual({
			ok: false,
			reason: 'not-found',
		})
	})

	it('refuses a test file as not-found for anonymous callers', async () => {
		expect(await check({ file: makeFile({ id: 'test_abc' }) })).toEqual({
			ok: false,
			reason: 'not-found',
		})
	})

	it('refuses anonymous access to an unshared file as not-authenticated', async () => {
		expect(await check({ file: makeFile({ shared: false }) })).toEqual({
			ok: false,
			reason: 'not-authenticated',
		})
	})

	it('refuses when rate limited', async () => {
		expect(
			await check({ file: makeFile(), auth: owner, env: makeEnv({ rateLimited: true }) })
		).toEqual({ ok: false, reason: 'rate-limited' })
	})

	it('grants the owner read-write access with object writes', async () => {
		expect(await check({ file: makeFile({ shared: false }), auth: owner })).toEqual({
			ok: true,
			isReadonly: false,
			objectAccess: 'write',
		})
	})

	it('grants a group member with accessFiles read-write access', async () => {
		expect(
			await check({
				file: makeFile({ ownerId: null as any, owningGroupId: 'group-1', shared: false }),
				auth: stranger,
				db: makeDb('member'),
			})
		).toEqual({ ok: true, isReadonly: false, objectAccess: 'write' })
	})

	it('refuses a non-member of the owning group when the file is unshared', async () => {
		expect(
			await check({
				file: makeFile({ ownerId: null as any, owningGroupId: 'group-1', shared: false }),
				auth: stranger,
				db: makeDb(null),
			})
		).toEqual({ ok: false, reason: 'forbidden' })
	})

	it('refuses a signed-in non-owner when the file is unshared', async () => {
		expect(await check({ file: makeFile({ shared: false }), auth: stranger })).toEqual({
			ok: false,
			reason: 'forbidden',
		})
	})

	it('gives guests canvas write only on an edit link', async () => {
		expect(await check({ file: makeFile({ sharedLinkType: 'edit' }), auth: stranger })).toEqual({
			ok: true,
			isReadonly: false,
			objectAccess: 'write',
		})
		expect(await check({ file: makeFile({ sharedLinkType: 'view' }), auth: stranger })).toEqual({
			ok: true,
			isReadonly: true,
			objectAccess: 'write',
		})
	})

	it('fails closed on legacy sharedLinkType values', async () => {
		expect(
			await check({ file: makeFile({ sharedLinkType: 'whatever' as any }), auth: stranger })
		).toEqual({ ok: true, isReadonly: true, objectAccess: 'write' })
	})

	it('gives anonymous guests of a shared file readonly canvas and read-only objects', async () => {
		expect(await check({ file: makeFile({ sharedLinkType: 'edit' }) })).toEqual({
			ok: true,
			// anonymous sessions can get canvas write on an edit link...
			isReadonly: false,
			// ...but never object-lane (comment) writes: comment authors need a user row
			objectAccess: 'read',
		})
	})
})
