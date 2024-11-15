import { Page } from '@playwright/test'
import postgres from 'postgres'
import { OTHER_USERS, USERS } from '../consts'

const sql = postgres('postgresql://user:password@127.0.0.1:6543/postgres')

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
	edgeScrollSpeed: null,
	colorScheme: null,
	isSnapMode: null,
	isWrapMode: null,
	isDynamicSizeMode: null,
	isPasteAtCursorMode: null,
}

export class Database {
	constructor(
		readonly page: Page,
		private parallelIndex: number
	) {}

	async reset() {
		await this.cleanUpUser(USERS[this.parallelIndex])
		await this.cleanUpUser(OTHER_USERS[this.parallelIndex])
	}

	private async cleanUpUser(user: string) {
		if (!user) return
		const dbUser = await sql`SELECT id FROM public.user WHERE email = ${user}`.execute()
		if (!dbUser[0]) return
		const id = dbUser[0].id
		try {
			await sql`
  UPDATE public.user
  SET ${sql(defaultUser)}
  WHERE id = ${id}
`.execute()

			await sql`DELETE FROM public.file WHERE "ownerId" = ${id}`.execute()
		} catch (e) {
			console.error('Error', e)
		}
	}
}
