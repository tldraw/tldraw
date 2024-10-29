import { Page } from '@playwright/test'
import { execSync } from 'child_process'
import path from 'path'

export class Database {
	constructor(private readonly page: Page) {}

	async reset() {
		await this.page.evaluate(() => {
			;(window as any).tla_dev_clear()
		})
		const scriptPath = path.resolve(__dirname, '../../../sync-worker/')
		execSync(`${scriptPath}/reset-db.sh > /dev/null 2>&1`, { cwd: scriptPath })
	}
}
