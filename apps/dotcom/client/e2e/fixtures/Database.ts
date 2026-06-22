import fs from 'fs'
import path from 'path'
import { Page } from '@playwright/test'
import { DB, userHasFlag } from '@tldraw/dotcom-shared'
import { Kysely, PostgresDialect, sql } from 'kysely'
import pg from 'pg'
import { OTHER_USERS, USERS } from '../consts'
import { getStorageStateFileName } from './helpers'

// The parallel-dev wrapper (internal/scripts/dotcom-dev-parallel.ts) runs each worktree's stack on
// its own port block and writes the block's values to <repoRoot>/.dev-ports.json. This test process
// is spawned separately from the stack, so it can't inherit that env — read the file instead, and
// fall back to the natural pgbouncer port when it isn't present (e.g. a non-block dev stack).
function pooledConnectionString(): string {
	// Look for <repoRoot>/.dev-ports.json from a few candidate roots (the test process's cwd is the
	// client workspace; __dirname is this fixtures dir) so we don't depend on one resolution working.
	const roots = [
		typeof __dirname !== 'undefined' ? path.resolve(__dirname, '../../../../..') : null,
		path.resolve(process.cwd(), '../../..'),
		process.cwd(),
	].filter((r): r is string => r !== null)
	for (const root of roots) {
		try {
			const env = JSON.parse(fs.readFileSync(path.join(root, '.dev-ports.json'), 'utf8'))
			if (env.BOTCOM_POSTGRES_POOLED_CONNECTION_STRING) {
				return env.BOTCOM_POSTGRES_POOLED_CONNECTION_STRING
			}
		} catch {
			// not here — try the next candidate root
		}
	}
	return 'postgresql://user:password@127.0.0.1:6432/postgres'
}

const db = new Kysely<DB>({
	dialect: new PostgresDialect({
		pool: new pg.Pool({
			connectionString: pooledConnectionString(),
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

	async reset() {
		await this.cleanUpUser(true)
		await this.cleanUpUser(false)
	}

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

	/**
	 * Check if a user is migrated to the groups model
	 */
	async isUserMigrated(isOther: boolean = false): Promise<boolean> {
		return await this.isUserMigratedByEmail(this.getEmail(isOther))
	}

	async isUserMigratedByEmail(email: string): Promise<boolean> {
		const id = await this.getUserIdByEmail(email)
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
		await this.migrateUserByEmail(this.getEmail(isOther))
	}

	async migrateUserByEmail(email: string): Promise<void> {
		const id = await this.getUserIdByEmail(email)
		if (!id) throw new Error(`User not found: ${email}`)
		if (await this.isUserMigratedByEmail(email)) return

		const inviteSecret = 'test' + Math.random().toString(36).substring(2, 15)

		// Call the migration function
		await sql`SELECT * FROM migrate_user_to_groups(${id}, ${inviteSecret})`.execute(db)
	}

	/**
	 * Enable groups frontend flag for a user
	 */
	async enableGroupsFrontend(isOther: boolean = false): Promise<void> {
		await this.enableGroupsFrontendByEmail(this.getEmail(isOther))
	}

	async enableGroupsFrontendByEmail(email: string): Promise<void> {
		const id = await this.getUserIdByEmail(email)
		if (!id) throw new Error(`User not found: ${email}`)

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

	async ensureGroupsReadyByEmail(email: string): Promise<void> {
		await this.migrateUserByEmail(email)
		await this.enableGroupsFrontendByEmail(email)
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

export type TestUser = 'huppy' | 'suppy'

export function getTestUserEmail(index: number, user: TestUser) {
	return user === 'suppy' ? OTHER_USERS[index] : USERS[index]
}
