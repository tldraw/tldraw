import { Page } from '@playwright/test'
import { execSync } from 'child_process'
import path from 'path'

export class Database {
	constructor(readonly _page: Page) {}

	async reset() {
		const scriptLocation = path.join(__dirname, 'delete-test-user-data.sql')
		execSync(
			`PGPASSWORD=password psql -U user -d postgres -h 127.0.0.1 -p 6543 -f ${scriptLocation}`,
			{ stdio: 'ignore' }
		)
	}
}
