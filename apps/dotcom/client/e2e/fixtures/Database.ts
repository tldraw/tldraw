import { Page } from '@playwright/test'
import { DB, userHasFlag } from '@tldraw/dotcom-shared'
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

		return userHasFlag(result.rows[0]?.flags, 'groups_backend')
	}

	/**
	 * Migrate a user to the groups model
	 */
	async migrateUser(isOther: boolean = false): Promise<void> {
		const id = await this.getUserId(isOther)
		const inviteSecret = 'test' + Math.random().toString(36).substring(2, 15)
		if (!id) throw new Error('User not found')

		// Call the migration function
		await sql`SELECT * FROM migrate_user_to_groups(${id}, ${inviteSecret})`.execute(db)
	}

	/**
	 * Enable groups frontend flag for a user
	 */
	async enableGroupsFrontend(isOther: boolean = false): Promise<void> {
		const id = await this.getUserId(isOther)
		if (!id) throw new Error('User not found')

		// Get current flags
		const result = await sql<{
			flags: string | null
		}>`SELECT flags FROM public.user WHERE id = ${id}`.execute(db)

		const currentFlags = result.rows[0]?.flags || ''
		const flagsArray = currentFlags.split(/[,\s]+/).filter(Boolean)

		// Add groups_frontend if not present
		if (!flagsArray.includes('groups_frontend')) {
			flagsArray.push('groups_frontend')
		}

		// Update with new flags
		const newFlags = flagsArray.join(',')
		await sql`UPDATE public.user SET flags = ${newFlags} WHERE id = ${id}`.execute(db)
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
			})
		} catch (e) {
			console.error('Error', e)
		}
	}
}
