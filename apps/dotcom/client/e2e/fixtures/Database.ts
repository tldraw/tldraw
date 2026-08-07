import { Page } from '@playwright/test'
import { DB } from '@tldraw/dotcom-shared'
import { Kysely, PostgresDialect, sql } from 'kysely'
import pg from 'pg'
import { OTHER_USERS, USERS } from '../consts'

const db = new Kysely<DB>({
	dialect: new PostgresDialect({
		pool: new pg.Pool({
			connectionString: 'postgresql://user:password@127.0.0.1:6432/postgres',
			application_name: 'migrate',
			idleTimeoutMillis: 10_000,
			max: 10,
		}),
	}),
	log: ['error'],
})

export class Database {
	constructor(
		readonly page: Page | null,
		private parallelIndex: number
	) {}

	// TODO: no server-side test route resets a user's data anymore (the legacy DO's
	// __test__prepareForTest was removed with TLUserDurableObject). Callers that rely on this to
	// isolate tests currently get a no-op; reintroduce a route built on adminRoutes.ts's
	// performUserDeletion/hardDeleteAppFile if that isolation is needed again.
	async reset() {}

	getEmail(isOther: boolean = false) {
		return getTestUserEmail(this.parallelIndex, isOther ? 'suppy' : 'huppy')
	}

	async getUserId(isOther: boolean = false) {
		return await this.getUserIdByEmail(this.getEmail(isOther))
	}

	async getUserIdByEmail(email: string) {
		const dbUser = await sql<{
			id: string
		}>`SELECT id FROM public.user WHERE email = ${email ?? ''}`.execute(db)
		if (!dbUser.rows[0]) return
		return dbUser.rows[0].id
	}
}

export type TestUser = 'huppy' | 'suppy'

export function getTestUserEmail(index: number, user: TestUser) {
	return user === 'suppy' ? OTHER_USERS[index] : USERS[index]
}
