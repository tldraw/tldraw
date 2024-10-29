import { execSync } from 'child_process'
import path from 'path'

export class Database {
	constructor() {}

	async reset() {
		const scriptPath = path.resolve(__dirname, '../../../sync-worker/')
		execSync(`${scriptPath}/reset-db.sh > /dev/null 2>&1`, { cwd: scriptPath })
	}
}
