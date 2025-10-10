import { Page } from '@playwright/test'
import { DB } from '@tldraw/dotcom-shared'
import fs from 'fs'
import { Kysely, PostgresDialect, sql } from 'kysely'
import pg from 'pg'
import { OTHER_USERS, USERS } from '../consts'
import { getStorageStateFileName } from './helpers'

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
		readonly page: Page,
		private parallelIndex: number
	) {}

	async reset() {
		await this.cleanUpUser(true)
		await this.cleanUpUser(false)
	}

	async getUserId(isOther: boolean = false) {
		const email = isOther ? OTHER_USERS[this.parallelIndex] : USERS[this.parallelIndex]
		const dbUser = await sql<{
			id: string
		}>`SELECT id FROM public.user WHERE email = ${email ?? ''}`.execute(db)
		if (!dbUser.rows[0]) return
		return dbUser.rows[0].id
	}

	/**
	 * Check if a user is migrated to the groups model
	 */
	async isUserMigrated(isOther: boolean = false): Promise<boolean> {
		const id = await this.getUserId(isOther)
		if (!id) return false

		const result = await sql<{
			flags: string | null
		}>`SELECT flags FROM public.user WHERE id = ${id}`.execute(db)

		return result.rows[0]?.flags?.includes('groups_backend') ?? false
	}

	private async cleanUpUser(isOther: boolean) {
		const fileName = getStorageStateFileName(this.parallelIndex, isOther ? 'suppy' : 'huppy')
		if (!fs.existsSync(fileName)) return
		const id = await this.getUserId(isOther)
		if (!id) return
		try {
			// eslint-disable-next-line no-restricted-globals
			await fetch(`http://localhost:3000/api/app/__test__/user/${id}/prepare-for-test`, {
				method: 'POST',
				headers: {
					'x-legacy': process.env.TLDRAW_INIT_MODE === 'new' ? 'false' : 'true',
				},
			})
		} catch (e) {
			console.error('Error', e)
		}
	}
}
