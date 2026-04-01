import { IndexKey, uniqueId } from '@tldraw/utils'
import { describe, expect, it } from 'vitest'
import { createMutators, parseFlags, userHasFlag } from './mutators'
import {
	TlaFile,
	TlaFileState,
	TlaGroup,
	TlaGroupFile,
	TlaGroupUser,
	TlaSchema,
	TlaUser,
} from './tlaSchema'
import { ZErrorCode } from './types'

// ---- helpers ----

function makeUser(overrides: Partial<TlaUser> & { id: string }): TlaUser {
	return {
		name: 'Test',
		email: 'test@test.com',
		avatar: '',
		color: '#000',
		exportFormat: 'png',
		exportTheme: 'auto',
		exportBackground: true,
		exportPadding: true,
		createdAt: 1,
		updatedAt: 1,
		flags: 'groups_backend',
		locale: null,
		animationSpeed: null,
		areKeyboardShortcutsEnabled: null,
		edgeScrollSpeed: null,
		colorScheme: null,
		isSnapMode: null,
		isWrapMode: null,
		isDynamicSizeMode: null,
		isPasteAtCursorMode: null,
		inputMode: null,
		enhancedA11yMode: null,
		isZoomDirectionInverted: null,
		allowAnalyticsCookie: null,
		...overrides,
	}
}

function makeFile(overrides: Partial<TlaFile> & { id: string }): TlaFile {
	return {
		name: 'Untitled',
		ownerId: null,
		owningGroupId: null,
		ownerName: '',
		ownerAvatar: '',
		thumbnail: '',
		shared: false,
		sharedLinkType: 'edit',
		published: false,
		lastPublished: 0,
		publishedSlug: uniqueId(),
		createdAt: 1,
		updatedAt: 1,
		isEmpty: true,
		isDeleted: false,
		createSource: null,
		...overrides,
	}
}

function makeGroupUser(
	overrides: Partial<TlaGroupUser> & { userId: string; groupId: string }
): TlaGroupUser {
	return {
		createdAt: 1,
		updatedAt: 1,
		role: 'admin',
		userName: 'Test',
		userColor: '#000',
		index: 'a1' as IndexKey,
		...overrides,
	}
}

function makeGroupFile(
	overrides: Partial<TlaGroupFile> & { fileId: string; groupId: string }
): TlaGroupFile {
	return {
		createdAt: 1,
		updatedAt: 1,
		index: null,
		...overrides,
	}
}

function makeGroup(overrides: Partial<TlaGroup> & { id: string }): TlaGroup {
	return {
		name: 'Test Group',
		inviteSecret: null,
		isDeleted: false,
		createdAt: 1,
		updatedAt: 1,
		...overrides,
	}
}

function makeFileState(
	overrides: Partial<TlaFileState> & { userId: string; fileId: string }
): TlaFileState {
	return {
		firstVisitAt: null,
		lastEditAt: null,
		lastSessionState: null,
		lastVisitAt: null,
		isFileOwner: false,
		isPinned: false,
		...overrides,
	}
}

// Table storage keyed by table name
interface TableStore {
	user: TlaUser[]
	file: TlaFile[]
	file_state: TlaFileState[]
	group: TlaGroup[]
	group_user: TlaGroupUser[]
	group_file: TlaGroupFile[]
}

const TABLE_PKS: Record<keyof TableStore, string[]> = {
	user: ['id'],
	file: ['id'],
	file_state: ['userId', 'fileId'],
	group: ['id'],
	group_user: ['userId', 'groupId'],
	group_file: ['fileId', 'groupId'],
}

/**
 * Build a mock Transaction that resolves zql builder queries against in-memory data.
 *
 * The `tx.run(query)` API passes an AST, but the builder stores filter info.
 * We intercept via Proxy so `.where()` chains build up predicates, and
 * `.one()` / the final run resolves them.
 *
 * This is a simplified mock — it handles the subset of queries used by mutators:
 *   zql.<table>.where(col, '=', val)...one()
 *   zql.<table>.where(col, '=', val)
 */
function createMockTx(
	store: TableStore,
	opts: { location: 'server' | 'client' } = { location: 'server' }
) {
	// Track mutations for assertions
	const mutations: Array<{ op: string; table: string; data: any }> = []

	function getRows(table: keyof TableStore) {
		return store[table] ?? []
	}

	function matchPk(table: keyof TableStore, row: any, data: any) {
		return TABLE_PKS[table].every((pk) => row[pk] === data[pk])
	}

	// The mutate object provides insert/update/upsert/delete for each table
	function makeTableMutator(tableName: keyof TableStore) {
		return {
			insert: async (data: any) => {
				mutations.push({ op: 'insert', table: tableName, data })
				;(store[tableName] as any[]).push({ ...data })
			},
			update: async (data: any) => {
				mutations.push({ op: 'update', table: tableName, data })
				const rows = store[tableName] as any[]
				const idx = rows.findIndex((r) => matchPk(tableName, r, data))
				if (idx >= 0) Object.assign(rows[idx], data)
			},
			upsert: async (data: any) => {
				mutations.push({ op: 'upsert', table: tableName, data })
				const rows = store[tableName] as any[]
				const idx = rows.findIndex((r) => matchPk(tableName, r, data))
				if (idx >= 0) {
					Object.assign(rows[idx], data)
				} else {
					rows.push({ ...data })
				}
			},
			delete: async (data: any) => {
				mutations.push({ op: 'delete', table: tableName, data })
				const rows = store[tableName] as any[]
				const idx = rows.findIndex((r) => matchPk(tableName, r, data))
				if (idx >= 0) rows.splice(idx, 1)
			},
		}
	}

	const mutate: any = {}
	for (const t of Object.keys(store) as (keyof TableStore)[]) {
		mutate[t] = makeTableMutator(t)
	}

	// tx.run(query) — the query is a builder that carries an AST.
	// We need to resolve it against our store.
	// The builder from createBuilder(schema) returns objects with .ast property.
	// We parse the AST to figure out which table + where clauses + one().
	function resolveAst(ast: any): any[] {
		const table = ast.table as keyof TableStore
		let rows = [...getRows(table)]

		// Apply where conditions
		if (ast.where) {
			rows = applyCondition(rows, ast.where)
		}

		return rows
	}

	function applyCondition(rows: any[], cond: any): any[] {
		if (!cond) return rows
		if (cond.type === 'simple') {
			const field = cond.left?.name
			const val = cond.right?.value
			const op = cond.op
			return rows.filter((r) => {
				if (op === '=') return r[field] === val
				if (op === '!=') return r[field] !== val
				return true
			})
		}
		if (cond.type === 'and') {
			let result = rows
			for (const sub of cond.conditions) {
				result = applyCondition(result, sub)
			}
			return result
		}
		if (cond.type === 'or') {
			const sets = cond.conditions.map((c: any) => applyCondition(rows, c))
			const merged = new Set<any>()
			for (const s of sets) for (const r of s) merged.add(r)
			return [...merged]
		}
		return rows
	}

	const tx = {
		location: opts.location,
		clientID: '',
		mutationID: 0,
		reason: opts.location === 'server' ? 'authoritative' : 'optimistic',
		mutate,
		query: undefined as any,
		run: async (query: any) => {
			// query is a Query object from createBuilder
			// It has a `.ast` property
			const ast = query.ast ?? query
			const rows = resolveAst(ast)
			// If the query was `.one()`, return first or null
			if (ast.limit === 1) {
				return rows[0] ?? null
			}
			return rows
		},
		dbTransaction: {
			query: async (sql: string, params: unknown[]) => {
				// Handle the specific SQL for assertNotMaxFiles
				if (sql.includes('count(*)') && sql.includes('"file"')) {
					const userId = params[0]
					const count = store.file.filter(
						(f) => !f.isDeleted && (f.ownerId === userId || f.owningGroupId === userId)
					).length
					return [{ count: String(count) }]
				}
				return []
			},
		},
	} as unknown as import('@rocicorp/zero').Transaction<TlaSchema>

	return { tx, mutations, store }
}

async function expectValid(fn: () => Promise<any>) {
	await expect(fn()).resolves.not.toThrow()
}

function expectForbidden(fn: () => Promise<any>) {
	return expect(fn()).rejects.toThrow(ZErrorCode.forbidden)
}

function expectBadRequest(fn: () => Promise<any>) {
	return expect(fn()).rejects.toThrow(ZErrorCode.bad_request)
}

// ---- tests ----

describe('parseFlags / userHasFlag', () => {
	it('parses comma-separated', () => {
		expect(parseFlags('groups_backend,groups_frontend')).toEqual([
			'groups_backend',
			'groups_frontend',
		])
	})
	it('parses space-separated', () => {
		expect(parseFlags('groups_backend groups_frontend')).toEqual([
			'groups_backend',
			'groups_frontend',
		])
	})
	it('handles null/undefined', () => {
		expect(parseFlags(null)).toEqual([])
		expect(parseFlags(undefined)).toEqual([])
	})
	it('userHasFlag checks presence', () => {
		expect(userHasFlag('groups_backend', 'groups_backend')).toBe(true)
		expect(userHasFlag('groups_frontend', 'groups_backend')).toBe(false)
	})
})

describe('user mutations', () => {
	const userId = 'user_aaaa11112222bbbb'

	it('user can update own profile', async () => {
		const { tx } = createMockTx({
			user: [makeUser({ id: userId })],
			file: [],
			file_state: [],
			group: [],
			group_user: [],
			group_file: [],
		})
		const m = createMutators(userId)
		await expectValid(() => m.user.update(tx, { id: userId, name: 'New Name' }))
	})

	it('user cannot update another user', async () => {
		const otherId = 'user_other1234567890'
		const { tx } = createMockTx({
			user: [makeUser({ id: userId }), makeUser({ id: otherId })],
			file: [],
			file_state: [],
			group: [],
			group_user: [],
			group_file: [],
		})
		const m = createMutators(userId)
		await expectForbidden(() => m.user.update(tx, { id: otherId, name: 'Hacked' }))
	})

	it('cannot change immutable field (email)', async () => {
		const { tx } = createMockTx({
			user: [makeUser({ id: userId })],
			file: [],
			file_state: [],
			group: [],
			group_user: [],
			group_file: [],
		})
		const m = createMutators(userId)
		await expectForbidden(() => m.user.update(tx, { id: userId, email: 'evil@evil.com' }))
	})

	it('user can change own flags field', async () => {
		const { tx } = createMockTx({
			user: [makeUser({ id: userId })],
			file: [],
			file_state: [],
			group: [],
			group_user: [],
			group_file: [],
		})
		const m = createMutators(userId)
		// flags is NOT in immutableColumns.user, so this should succeed
		await expectValid(() =>
			m.user.update(tx, { id: userId, flags: 'groups_backend,groups_frontend' })
		)
	})
})

describe('file mutations', () => {
	const userId = 'user_aaaa11112222bbbb'
	const groupId = 'group_aaa11112222bbb'

	function baseStore() {
		return {
			user: [makeUser({ id: userId })],
			file: [] as TlaFile[],
			file_state: [] as TlaFileState[],
			group: [makeGroup({ id: groupId })],
			group_user: [makeGroupUser({ userId, groupId, role: 'admin' })],
			group_file: [] as TlaGroupFile[],
		}
	}

	it('group member can update file', async () => {
		const s = baseStore()
		const f = makeFile({ id: 'file_aaaa11112222bbbb', owningGroupId: groupId })
		s.file.push(f)
		const { tx } = createMockTx(s)
		const m = createMutators(userId)
		await expectValid(() => m.file.update(tx, { id: f.id, name: 'Renamed' }))
	})

	it('shared user without group membership cannot update file', async () => {
		const otherId = 'user_other1234567890'
		const s = baseStore()
		const f = makeFile({
			id: 'file_aaaa11112222bbbb',
			owningGroupId: groupId,
			shared: true,
		})
		s.file.push(f)
		// otherId is NOT in the group
		const { tx } = createMockTx(s)
		const m = createMutators(otherId)
		await expectForbidden(() => m.file.update(tx, { id: f.id, name: 'Hacked' }))
	})

	it('cannot change immutable field (ownerId)', async () => {
		const s = baseStore()
		const f = makeFile({ id: 'file_aaaa11112222bbbb', owningGroupId: groupId })
		s.file.push(f)
		const { tx } = createMockTx(s)
		const m = createMutators(userId)
		await expectForbidden(() => m.file.update(tx, { id: f.id, ownerId: 'evil' }))
	})

	it('cannot change immutable field (owningGroupId)', async () => {
		const s = baseStore()
		const f = makeFile({ id: 'file_aaaa11112222bbbb', owningGroupId: groupId })
		s.file.push(f)
		const { tx } = createMockTx(s)
		const m = createMutators(userId)
		await expectForbidden(() =>
			m.file.update(tx, { id: f.id, owningGroupId: 'evil_group_1234567' })
		)
	})

	it('cannot change immutable field (isDeleted)', async () => {
		const s = baseStore()
		const f = makeFile({ id: 'file_aaaa11112222bbbb', owningGroupId: groupId })
		s.file.push(f)
		const { tx } = createMockTx(s)
		const m = createMutators(userId)
		await expectForbidden(() => m.file.update(tx, { id: f.id, isDeleted: true }))
	})

	it('unrelated user cannot update file', async () => {
		const strangerId = 'user_stranger12345678'
		const s = baseStore()
		const f = makeFile({ id: 'file_aaaa11112222bbbb', owningGroupId: groupId, shared: false })
		s.file.push(f)
		const { tx } = createMockTx(s)
		const m = createMutators(strangerId)
		await expectForbidden(() => m.file.update(tx, { id: f.id, name: 'Nope' }))
	})
})

describe('file creation', () => {
	const userId = 'user_aaaa11112222bbbb'
	const groupId = 'group_aaa11112222bbb'

	it('migrated user can create file in own group', async () => {
		const s = {
			user: [makeUser({ id: userId, flags: 'groups_backend' })],
			file: [],
			file_state: [],
			group: [makeGroup({ id: groupId })],
			group_user: [makeGroupUser({ userId, groupId })],
			group_file: [],
		}
		const { tx } = createMockTx(s)
		const m = createMutators(userId)
		await expectValid(() =>
			m.createFile(tx, {
				fileId: 'file_aaaa11112222bbbb',
				groupId,
				name: 'New File',
				time: Date.now(),
				createSource: null,
			})
		)
	})

	it('migrated user cannot create file in another group', async () => {
		const otherGroup = 'group_other123456789'
		const s = {
			user: [makeUser({ id: userId, flags: 'groups_backend' })],
			file: [],
			file_state: [],
			group: [makeGroup({ id: groupId }), makeGroup({ id: otherGroup })],
			group_user: [makeGroupUser({ userId, groupId })],
			group_file: [],
		}
		const { tx } = createMockTx(s)
		const m = createMutators(userId)
		await expectForbidden(() =>
			m.createFile(tx, {
				fileId: 'file_aaaa11112222bbbb',
				groupId: otherGroup,
				name: 'Nope',
				time: Date.now(),
				createSource: null,
			})
		)
	})
})

describe('file_state mutations', () => {
	const userId = 'user_aaaa11112222bbbb'
	const groupId = 'group_aaa11112222bbb'
	const fileId = 'file_aaaa11112222bbbb'

	it('user can update own file_state', async () => {
		const s = {
			user: [makeUser({ id: userId })],
			file: [makeFile({ id: fileId, owningGroupId: groupId, shared: true })],
			file_state: [makeFileState({ userId, fileId })],
			group: [makeGroup({ id: groupId })],
			group_user: [makeGroupUser({ userId, groupId })],
			group_file: [],
		}
		const { tx } = createMockTx(s)
		const m = createMutators(userId)
		await expectValid(() => m.file_state.update(tx, { userId, fileId, lastVisitAt: Date.now() }))
	})

	it("user cannot update another user's file_state", async () => {
		const otherId = 'user_other1234567890'
		const s = {
			user: [makeUser({ id: userId })],
			file: [makeFile({ id: fileId, owningGroupId: groupId })],
			file_state: [makeFileState({ userId: otherId, fileId })],
			group: [],
			group_user: [],
			group_file: [],
		}
		const { tx } = createMockTx(s)
		const m = createMutators(userId)
		await expectForbidden(() =>
			m.file_state.update(tx, { userId: otherId, fileId, lastVisitAt: Date.now() })
		)
	})

	it('server cannot update file_state for inaccessible file', async () => {
		const inaccessibleFile = makeFile({
			id: 'file_inaccessible12345',
			owningGroupId: groupId,
			shared: false,
		})
		const s = {
			user: [makeUser({ id: userId })],
			file: [inaccessibleFile],
			file_state: [makeFileState({ userId, fileId: inaccessibleFile.id })],
			group: [makeGroup({ id: groupId })],
			group_user: [], // userId NOT a member
			group_file: [],
		}
		const { tx } = createMockTx(s, { location: 'server' })
		const m = createMutators(userId)
		await expectForbidden(() =>
			m.file_state.update(tx, { userId, fileId: inaccessibleFile.id, lastVisitAt: Date.now() })
		)
	})
})

describe('onEnterFile', () => {
	const userId = 'user_aaaa11112222bbbb'
	const groupId = 'group_aaa11112222bbb'
	const fileId = 'file_aaaa11112222bbbb'

	it('user with access can enter file', async () => {
		const s = {
			user: [makeUser({ id: userId })],
			file: [makeFile({ id: fileId, owningGroupId: groupId })],
			file_state: [],
			group: [makeGroup({ id: groupId })],
			group_user: [makeGroupUser({ userId, groupId })],
			group_file: [makeGroupFile({ fileId, groupId })],
		}
		const { tx } = createMockTx(s, { location: 'server' })
		const m = createMutators(userId)
		await m.onEnterFile(tx, { fileId, time: Date.now() })
		// file_state should be upserted
		expect(s.file_state.length).toBe(1)
	})

	it('user without access cannot enter file', async () => {
		const s = {
			user: [makeUser({ id: userId })],
			file: [makeFile({ id: fileId, owningGroupId: groupId, shared: false })],
			file_state: [],
			group: [makeGroup({ id: groupId })],
			group_user: [], // not a member
			group_file: [],
		}
		const { tx } = createMockTx(s, { location: 'server' })
		const m = createMutators(userId)
		await expectForbidden(() => m.onEnterFile(tx, { fileId, time: Date.now() }))
	})

	it('entering file already in group does not create duplicate group_file', async () => {
		const s = {
			user: [makeUser({ id: userId })],
			file: [makeFile({ id: fileId, owningGroupId: groupId, shared: true })],
			file_state: [],
			group: [makeGroup({ id: groupId })],
			group_user: [makeGroupUser({ userId, groupId })],
			group_file: [makeGroupFile({ fileId, groupId })],
		}
		const { tx } = createMockTx(s, { location: 'server' })
		const m = createMutators(userId)
		await m.onEnterFile(tx, { fileId, time: Date.now() })
		// Should NOT create a new group_file since it's already in user's group
		expect(s.group_file.length).toBe(1)
	})
})

describe('group mutations', () => {
	const userId = 'user_aaaa11112222bbbb'

	it('migrated user can create group', async () => {
		const s = {
			user: [makeUser({ id: userId, flags: 'groups_backend' })],
			file: [],
			file_state: [],
			group: [],
			group_user: [],
			group_file: [],
		}
		const { tx } = createMockTx(s)
		const m = createMutators(userId)
		const groupId = 'group_new123456789ab'
		await m.createGroup(tx, { id: groupId, name: 'My Group' })
		expect(s.group.length).toBe(1)
		expect(s.group_user.length).toBe(1)
		expect((s.group_user as TlaGroupUser[])[0]?.role).toBe('owner')
	})

	it('owner can update group name', async () => {
		const groupId = 'group_aaa11112222bbb'
		const s = {
			user: [makeUser({ id: userId, flags: 'groups_backend' })],
			file: [],
			file_state: [],
			group: [makeGroup({ id: groupId })],
			group_user: [makeGroupUser({ userId, groupId, role: 'owner' })],
			group_file: [],
		}
		const { tx } = createMockTx(s)
		const m = createMutators(userId)
		await expectValid(() => m.updateGroup(tx, { id: groupId, name: 'Renamed' }))
	})

	it('admin cannot update group name', async () => {
		const groupId = 'group_aaa11112222bbb'
		const s = {
			user: [makeUser({ id: userId, flags: 'groups_backend' })],
			file: [],
			file_state: [],
			group: [makeGroup({ id: groupId })],
			group_user: [makeGroupUser({ userId, groupId, role: 'admin' })],
			group_file: [],
		}
		const { tx } = createMockTx(s)
		const m = createMutators(userId)
		await expectForbidden(() => m.updateGroup(tx, { id: groupId, name: 'Renamed' }))
	})

	it('owner can delete group', async () => {
		const groupId = 'group_aaa11112222bbb'
		const fileId = 'file_aaaa11112222bbbb'
		const s = {
			user: [makeUser({ id: userId, flags: 'groups_backend' })],
			file: [makeFile({ id: fileId, owningGroupId: groupId })],
			file_state: [],
			group: [makeGroup({ id: groupId })],
			group_user: [makeGroupUser({ userId, groupId, role: 'owner' })],
			group_file: [makeGroupFile({ fileId, groupId })],
		}
		const { tx } = createMockTx(s)
		const m = createMutators(userId)
		await m.deleteGroup(tx, { id: groupId })
		expect(s.group[0]?.isDeleted).toBe(true)
		expect(s.file[0]?.isDeleted).toBe(true)
		expect(s.group_file.length).toBe(0)
	})

	it('non-owner cannot delete group', async () => {
		const groupId = 'group_aaa11112222bbb'
		const s = {
			user: [makeUser({ id: userId, flags: 'groups_backend' })],
			file: [],
			file_state: [],
			group: [makeGroup({ id: groupId })],
			group_user: [makeGroupUser({ userId, groupId, role: 'admin' })],
			group_file: [],
		}
		const { tx } = createMockTx(s)
		const m = createMutators(userId)
		await expectForbidden(() => m.deleteGroup(tx, { id: groupId }))
	})
})

describe('membership', () => {
	const userId = 'user_aaaa11112222bbbb'
	const groupId = 'group_aaa11112222bbb'
	const memberId = 'user_member12345678ab'

	it('owner can set member roles', async () => {
		const s = {
			user: [makeUser({ id: userId, flags: 'groups_backend' })],
			file: [],
			file_state: [],
			group: [makeGroup({ id: groupId })],
			group_user: [
				makeGroupUser({ userId, groupId, role: 'owner' }),
				makeGroupUser({ userId: memberId, groupId, role: 'admin' }),
			],
			group_file: [],
		}
		const { tx } = createMockTx(s)
		const m = createMutators(userId)
		await m.setGroupMemberRole(tx, { groupId, targetUserId: memberId, role: 'owner' })
		expect(s.group_user.find((gu) => gu.userId === memberId)?.role).toBe('owner')
	})

	it('admin cannot set member roles', async () => {
		const s = {
			user: [makeUser({ id: userId, flags: 'groups_backend' })],
			file: [],
			file_state: [],
			group: [makeGroup({ id: groupId })],
			group_user: [
				makeGroupUser({ userId, groupId, role: 'admin' }),
				makeGroupUser({ userId: memberId, groupId, role: 'admin' }),
			],
			group_file: [],
		}
		const { tx } = createMockTx(s)
		const m = createMutators(userId)
		await expectForbidden(() =>
			m.setGroupMemberRole(tx, { groupId, targetUserId: memberId, role: 'owner' })
		)
	})

	it('cannot demote last owner to admin', async () => {
		const s = {
			user: [makeUser({ id: userId, flags: 'groups_backend' })],
			file: [],
			file_state: [],
			group: [makeGroup({ id: groupId })],
			group_user: [
				makeGroupUser({ userId, groupId, role: 'owner' }),
				makeGroupUser({ userId: memberId, groupId, role: 'admin' }),
			],
			group_file: [],
		}
		const { tx } = createMockTx(s)
		const m = createMutators(userId)
		await expectForbidden(() =>
			m.setGroupMemberRole(tx, { groupId, targetUserId: userId, role: 'admin' })
		)
	})

	it('last owner cannot leave group', async () => {
		const s = {
			user: [makeUser({ id: userId, flags: 'groups_backend' })],
			file: [],
			file_state: [],
			group: [makeGroup({ id: groupId })],
			group_user: [makeGroupUser({ userId, groupId, role: 'owner' })],
			group_file: [],
		}
		const { tx } = createMockTx(s)
		const m = createMutators(userId)
		await expectForbidden(() => m.leaveGroup(tx, { groupId }))
	})

	it('non-owner member can leave group', async () => {
		const s = {
			user: [makeUser({ id: userId, flags: 'groups_backend' })],
			file: [],
			file_state: [],
			group: [makeGroup({ id: groupId })],
			group_user: [
				makeGroupUser({ userId: 'user_owner12345678ab', groupId, role: 'owner' }),
				makeGroupUser({ userId, groupId, role: 'admin' }),
			],
			group_file: [],
		}
		const { tx } = createMockTx(s)
		const m = createMutators(userId)
		await m.leaveGroup(tx, { groupId })
		expect(s.group_user.find((gu) => gu.userId === userId)).toBeUndefined()
	})
})

describe('file operations across groups', () => {
	const userId = 'user_aaaa11112222bbbb'
	const groupA = 'group_aaa11112222bbb'
	const groupB = 'group_bbb11112222ccc'
	const fileId = 'file_aaaa11112222bbbb'

	it('member of both groups can move file between them', async () => {
		const s = {
			user: [makeUser({ id: userId, flags: 'groups_backend' })],
			file: [makeFile({ id: fileId, owningGroupId: groupA })],
			file_state: [],
			group: [makeGroup({ id: groupA }), makeGroup({ id: groupB })],
			group_user: [
				makeGroupUser({ userId, groupId: groupA }),
				makeGroupUser({ userId, groupId: groupB }),
			],
			group_file: [makeGroupFile({ fileId, groupId: groupA })],
		}
		const { tx } = createMockTx(s)
		const m = createMutators(userId)
		await m.moveFileToGroup(tx, { fileId, groupId: groupB })
		expect(s.file[0]?.owningGroupId).toBe(groupB)
	})

	it('member of source group only cannot move file to other group', async () => {
		const s = {
			user: [makeUser({ id: userId, flags: 'groups_backend' })],
			file: [makeFile({ id: fileId, owningGroupId: groupA })],
			file_state: [],
			group: [makeGroup({ id: groupA }), makeGroup({ id: groupB })],
			group_user: [makeGroupUser({ userId, groupId: groupA })],
			group_file: [makeGroupFile({ fileId, groupId: groupA })],
		}
		const { tx } = createMockTx(s)
		const m = createMutators(userId)
		await expectForbidden(() => m.moveFileToGroup(tx, { fileId, groupId: groupB }))
	})

	it('member of target group only cannot move file from other group', async () => {
		const s = {
			user: [makeUser({ id: userId, flags: 'groups_backend' })],
			file: [makeFile({ id: fileId, owningGroupId: groupA })],
			file_state: [],
			group: [makeGroup({ id: groupA }), makeGroup({ id: groupB })],
			group_user: [makeGroupUser({ userId, groupId: groupB })],
			group_file: [makeGroupFile({ fileId, groupId: groupA })],
		}
		const { tx } = createMockTx(s)
		const m = createMutators(userId)
		await expectForbidden(() => m.moveFileToGroup(tx, { fileId, groupId: groupB }))
	})

	it('admin can remove file from group', async () => {
		const s = {
			user: [makeUser({ id: userId, flags: 'groups_backend' })],
			file: [makeFile({ id: fileId, owningGroupId: groupA })],
			file_state: [makeFileState({ userId, fileId })],
			group: [makeGroup({ id: groupA })],
			group_user: [makeGroupUser({ userId, groupId: groupA, role: 'admin' })],
			group_file: [makeGroupFile({ fileId, groupId: groupA })],
		}
		const { tx } = createMockTx(s)
		const m = createMutators(userId)
		await m.removeFileFromGroup(tx, { fileId, groupId: groupA })
		expect(s.file[0]?.isDeleted).toBe(true)
	})

	it('member with file access can add file link to group', async () => {
		const s = {
			user: [makeUser({ id: userId, flags: 'groups_backend' })],
			file: [makeFile({ id: fileId, owningGroupId: groupA })],
			file_state: [],
			group: [makeGroup({ id: groupA }), makeGroup({ id: groupB })],
			group_user: [
				makeGroupUser({ userId, groupId: groupA }),
				makeGroupUser({ userId, groupId: groupB }),
			],
			group_file: [makeGroupFile({ fileId, groupId: groupA })],
		}
		const { tx } = createMockTx(s, { location: 'server' })
		const m = createMutators(userId)
		await m.addFileLinkToGroup(tx, { fileId, groupId: groupB })
		expect(s.group_file.find((gf) => gf.groupId === groupB)).toBeDefined()
	})

	it('member without file access cannot add file link to group', async () => {
		const otherGroup = 'group_other123456789'
		const s = {
			user: [makeUser({ id: userId, flags: 'groups_backend' })],
			file: [makeFile({ id: fileId, owningGroupId: otherGroup, shared: false })],
			file_state: [],
			group: [makeGroup({ id: groupB }), makeGroup({ id: otherGroup })],
			group_user: [makeGroupUser({ userId, groupId: groupB })],
			group_file: [],
		}
		const { tx } = createMockTx(s, { location: 'server' })
		const m = createMutators(userId)
		await expectForbidden(() => m.addFileLinkToGroup(tx, { fileId, groupId: groupB }))
	})

	it('non-member cannot add file link to group', async () => {
		const s = {
			user: [makeUser({ id: userId, flags: 'groups_backend' })],
			file: [makeFile({ id: fileId, owningGroupId: groupA, shared: true })],
			file_state: [],
			group: [makeGroup({ id: groupA }), makeGroup({ id: groupB })],
			group_user: [makeGroupUser({ userId, groupId: groupA })],
			group_file: [],
		}
		const { tx } = createMockTx(s, { location: 'server' })
		const m = createMutators(userId)
		await expectForbidden(() => m.addFileLinkToGroup(tx, { fileId, groupId: groupB }))
	})
})

describe('home group special case', () => {
	const userId = 'user_aaaa11112222bbbb'

	it('home group shortcut passes membership check', async () => {
		// createFile with groupId === userId should pass the membership check
		// even without a group_user row, because of the userId === groupId shortcut
		const s = {
			user: [makeUser({ id: userId, flags: 'groups_backend' })],
			file: [],
			file_state: [],
			group: [makeGroup({ id: userId })],
			group_user: [makeGroupUser({ userId, groupId: userId, role: 'owner' })],
			group_file: [],
		}
		const { tx } = createMockTx(s)
		const m = createMutators(userId)
		// This exercises the userId === groupId shortcut in assertUserIsGroupMember
		await expectValid(() =>
			m.createFile(tx, {
				fileId: 'file_home123456789ab',
				groupId: userId,
				name: 'Home file',
				time: Date.now(),
				createSource: null,
			})
		)
	})

	it('home group shortcut passes ownership check', async () => {
		// updateGroup with id === userId should pass assertUserIsGroupOwner
		// via the shortcut, even if there's no group_user row
		const s = {
			user: [makeUser({ id: userId, flags: 'groups_backend' })],
			file: [],
			file_state: [],
			group: [makeGroup({ id: userId })],
			group_user: [],
			group_file: [],
		}
		const { tx } = createMockTx(s)
		const m = createMutators(userId)
		await expectValid(() => m.updateGroup(tx, { id: userId, name: 'My Home' }))
	})
})

describe('regenerateGroupInviteSecret', () => {
	const userId = 'user_aaaa11112222bbbb'
	const groupId = 'group_aaa11112222bbb'

	it('admin can regenerate invite secret', async () => {
		const s = {
			user: [makeUser({ id: userId, flags: 'groups_backend' })],
			file: [],
			file_state: [],
			group: [makeGroup({ id: groupId, inviteSecret: 'old_secret_1234567' })],
			group_user: [makeGroupUser({ userId, groupId, role: 'admin' })],
			group_file: [],
		}
		const { tx } = createMockTx(s, { location: 'server' })
		const m = createMutators(userId)
		await m.regenerateGroupInviteSecret(tx, { id: groupId })
		// inviteSecret should have changed
		expect(s.group[0]?.inviteSecret).not.toBe('old_secret_1234567')
	})

	it('non-member cannot regenerate invite secret', async () => {
		const nonAdminId = 'user_nonadmin1234567'
		const s = {
			user: [makeUser({ id: nonAdminId, flags: 'groups_backend' })],
			file: [],
			file_state: [],
			group: [makeGroup({ id: groupId })],
			// No group_user for nonAdminId — not a member at all
			group_user: [],
			group_file: [],
		}
		const { tx } = createMockTx(s, { location: 'server' })
		const m = createMutators(nonAdminId)
		await expectForbidden(() => m.regenerateGroupInviteSecret(tx, { id: groupId }))
	})
})

describe('immutable column bypass attempts', () => {
	const userId = 'user_aaaa11112222bbbb'
	const groupId = 'group_aaa11112222bbb'

	it('cannot change file.ownerId to self', async () => {
		const s = {
			user: [makeUser({ id: userId })],
			file: [makeFile({ id: 'file_aaaa11112222bbbb', owningGroupId: groupId })],
			file_state: [],
			group: [makeGroup({ id: groupId })],
			group_user: [makeGroupUser({ userId, groupId })],
			group_file: [],
		}
		const { tx } = createMockTx(s)
		const m = createMutators(userId)
		await expectForbidden(() => m.file.update(tx, { id: 'file_aaaa11112222bbbb', ownerId: userId }))
	})

	it('cannot change file.owningGroupId', async () => {
		const s = {
			user: [makeUser({ id: userId })],
			file: [makeFile({ id: 'file_aaaa11112222bbbb', owningGroupId: groupId })],
			file_state: [],
			group: [makeGroup({ id: groupId })],
			group_user: [makeGroupUser({ userId, groupId })],
			group_file: [],
		}
		const { tx } = createMockTx(s)
		const m = createMutators(userId)
		await expectForbidden(() =>
			m.file.update(tx, { id: 'file_aaaa11112222bbbb', owningGroupId: 'evil_group_12345' })
		)
	})

	it('cannot set isDeleted:true', async () => {
		const s = {
			user: [makeUser({ id: userId })],
			file: [makeFile({ id: 'file_aaaa11112222bbbb', owningGroupId: groupId })],
			file_state: [],
			group: [makeGroup({ id: groupId })],
			group_user: [makeGroupUser({ userId, groupId })],
			group_file: [],
		}
		const { tx } = createMockTx(s)
		const m = createMutators(userId)
		await expectForbidden(() => m.file.update(tx, { id: 'file_aaaa11112222bbbb', isDeleted: true }))
	})

	it('cannot set isDeleted:false (falsy value still blocked)', async () => {
		const s = {
			user: [makeUser({ id: userId })],
			file: [makeFile({ id: 'file_aaaa11112222bbbb', owningGroupId: groupId, isDeleted: false })],
			file_state: [],
			group: [makeGroup({ id: groupId })],
			group_user: [makeGroupUser({ userId, groupId })],
			group_file: [],
		}
		const { tx } = createMockTx(s)
		const m = createMutators(userId)
		await expectForbidden(() =>
			m.file.update(tx, { id: 'file_aaaa11112222bbbb', isDeleted: false })
		)
	})

	it('cannot update file_state for inaccessible file on server', async () => {
		const s = {
			user: [makeUser({ id: userId })],
			file: [makeFile({ id: 'file_secret12345678', owningGroupId: groupId, shared: false })],
			file_state: [makeFileState({ userId, fileId: 'file_secret12345678' })],
			group: [makeGroup({ id: groupId })],
			group_user: [], // not a member
			group_file: [],
		}
		const { tx } = createMockTx(s, { location: 'server' })
		const m = createMutators(userId)
		await expectForbidden(() =>
			m.file_state.update(tx, { userId, fileId: 'file_secret12345678', lastVisitAt: Date.now() })
		)
	})

	it('cannot change immutable file_state field (firstVisitAt)', async () => {
		const s = {
			user: [makeUser({ id: userId })],
			file: [makeFile({ id: 'file_aaaa11112222bbbb', owningGroupId: groupId })],
			file_state: [makeFileState({ userId, fileId: 'file_aaaa11112222bbbb', firstVisitAt: 1 })],
			group: [makeGroup({ id: groupId })],
			group_user: [makeGroupUser({ userId, groupId })],
			group_file: [],
		}
		const { tx } = createMockTx(s)
		const m = createMutators(userId)
		await expectForbidden(() =>
			m.file_state.update(tx, {
				userId,
				fileId: 'file_aaaa11112222bbbb',
				firstVisitAt: 999,
			})
		)
	})
})

describe('file access control logic', () => {
	const userId = 'user_aaaa11112222bbbb'
	const groupId = 'group_aaa11112222bbb'

	it('non-member can enter shared file (read access)', async () => {
		const otherId = 'user_other1234567890'
		const s = {
			user: [makeUser({ id: userId })],
			file: [makeFile({ id: 'file_shared123456789', owningGroupId: groupId, shared: true })],
			file_state: [],
			group: [makeGroup({ id: groupId })],
			group_user: [makeGroupUser({ userId: otherId, groupId })],
			group_file: [],
		}
		const { tx } = createMockTx(s, { location: 'server' })
		const m = createMutators(userId)
		// onEnterFile uses assertUserCanAccessFile (allowGuestAccess=true)
		await expectValid(() => m.onEnterFile(tx, { fileId: 'file_shared123456789', time: Date.now() }))
	})

	it('cannot enter deleted file', async () => {
		const s = {
			user: [makeUser({ id: userId })],
			file: [makeFile({ id: 'file_deleted1234567a', owningGroupId: groupId, isDeleted: true })],
			file_state: [],
			group: [makeGroup({ id: groupId })],
			group_user: [makeGroupUser({ userId, groupId })],
			group_file: [],
		}
		const { tx } = createMockTx(s, { location: 'server' })
		const m = createMutators(userId)
		await expectBadRequest(() =>
			m.onEnterFile(tx, { fileId: 'file_deleted1234567a', time: Date.now() })
		)
	})

	it('cannot enter file with neither ownerId nor owningGroupId', async () => {
		const s = {
			user: [makeUser({ id: userId })],
			file: [
				makeFile({
					id: 'file_orphan12345678a',
					ownerId: null,
					owningGroupId: null,
					shared: false,
				}),
			],
			file_state: [],
			group: [],
			group_user: [],
			group_file: [],
		}
		const { tx } = createMockTx(s, { location: 'server' })
		const m = createMutators(userId)
		await expectBadRequest(() =>
			m.onEnterFile(tx, { fileId: 'file_orphan12345678a', time: Date.now() })
		)
	})
})

describe('cross-user isolation', () => {
	const userA = 'user_aaaa11112222bbbb'
	const userB = 'user_bbbb22223333cccc'
	const groupA = 'group_aaa11112222bbb'

	it('user A files never accessible to unrelated user B', async () => {
		const s = {
			user: [makeUser({ id: userA }), makeUser({ id: userB })],
			file: [makeFile({ id: 'file_userA123456789a', owningGroupId: groupA, shared: false })],
			file_state: [],
			group: [makeGroup({ id: groupA })],
			group_user: [makeGroupUser({ userId: userA, groupId: groupA })],
			group_file: [],
		}
		const { tx } = createMockTx(s, { location: 'server' })
		const mB = createMutators(userB)
		// User B cannot update A's file
		await expectForbidden(() => mB.file.update(tx, { id: 'file_userA123456789a', name: 'Stolen' }))
		// User B cannot enter A's file
		await expectForbidden(() =>
			mB.onEnterFile(tx, { fileId: 'file_userA123456789a', time: Date.now() })
		)
	})
})
