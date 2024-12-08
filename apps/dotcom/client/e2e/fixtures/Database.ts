import { Page } from '@playwright/test'
import fs from 'fs'
import postgres from 'postgres'
import { OTHER_USERS, USERS } from '../consts'
import { getStorageStateFileName } from './helpers'

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
		await this.cleanUpUser(true)
		await this.cleanUpUser(false)
	}

	async getUserId(isOther: boolean = false) {
		const email = isOther ? OTHER_USERS[this.parallelIndex] : USERS[this.parallelIndex]
		const dbUser = await sql`SELECT id FROM public.user WHERE email = ${email ?? ''}`.execute()
		if (!dbUser[0]) return
		return dbUser[0].id
	}

	private async cleanUpUser(isOther: boolean) {
		const fileName = getStorageStateFileName(this.parallelIndex, isOther ? 'suppy' : 'huppy')
		if (!fs.existsSync(fileName)) return
		const id = await this.getUserId(isOther)
		if (!id) return
		try {
			await sql`
  UPDATE public.user
  SET ${sql(defaultUser)}
  WHERE id = ${id}
`.execute()

			await sql`DELETE FROM public.file WHERE "ownerId" = ${id}`.execute()
			// await fetch(`http://localhost:3000/api/app/__test__/user/${id}/reboot`)
		} catch (e) {
			console.error('Error', e)
		}
	}
}
