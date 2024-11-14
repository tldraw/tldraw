import { Page } from '@playwright/test'
import postgres from 'postgres'
import { OTHER_USERS, USERS } from '../consts'

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
	sql = postgres('postgresql://user:password@127.0.0.1:6543/postgres')
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
		const dbUser = await this.sql`SELECT id FROM public.user WHERE email = ${user}`.execute()
		if (!dbUser[0]) return
		const id = dbUser[0].id
		try {
			await this.sql`
  UPDATE public.user
  SET ${this.sql(defaultUser)}
  WHERE id = ${id}
`.execute()

			await this.sql`DELETE FROM public.file WHERE "ownerId" = ${id}`.execute()
		} catch (e) {
			console.error('Error', e)
		}
	}
}
