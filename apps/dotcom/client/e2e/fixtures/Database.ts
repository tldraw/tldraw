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

const defaultUser = {
	color: 'salmon',
	avatar: '',
	exportFormat: 'png',
	exportTheme: 'light',
	exportBackground: false,
	exportPadding: false,
	createdAt: 1731610733963,
	updatedAt: 1731610733963,
	flags: '',
	locale: null,
	animationSpeed: null,
	areKeyboardShortcutsEnabled: true,
	edgeScrollSpeed: null,
	colorScheme: null,
	isSnapMode: null,
	isWrapMode: null,
	isDynamicSizeMode: null,
	isPasteAtCursorMode: null,
	enhancedA11yMode: null,
}

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

	private async cleanUpUser(isOther: boolean) {
		const fileName = getStorageStateFileName(this.parallelIndex, isOther ? 'suppy' : 'huppy')
		if (!fs.existsSync(fileName)) return
		const id = await this.getUserId(isOther)
		if (!id) return
		try {
			await db.updateTable('user').set(defaultUser).where('id', '=', id).execute()

			await sql`DELETE FROM public.file WHERE "ownerId" = ${id}`.execute(db)
			// await fetch(`http://localhost:3000/api/app/__test__/user/${id}/reboot`)
		} catch (e) {
			console.error('Error', e)
		}
	}
}
