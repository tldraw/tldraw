import { readdirSync } from 'fs'
import { exec } from '../../../internal/scripts/lib/exec'
import { getPostgres, waitForPostgres } from './postgres'

async function checkMigrations() {
	const db = getPostgres('check-migrations')
	const appliedMigrations = await db`SELECT filename FROM migrations.applied_migrations`.execute()
	const migrations = readdirSync(`./migrations`).sort()
	if (migrations.length === 0) {
		throw new Error('No migrations found')
	}

	console.log('Checking migrations')
	// check that all applied migrations exist
	for (const appliedMigration of appliedMigrations) {
		if (!migrations.includes(appliedMigration.filename)) {
			console.error(`Migration ${appliedMigration.filename} is missing. Will clean the db.`)
			await exec('yarn', ['clean'])
			break
		}
	}
	console.log('Migration check complete.')
}

async function run() {
	try {
		await waitForPostgres()
		await checkMigrations()
	} catch (e) {
		console.error(e)
		process.exit(1)
	}
	process.exit(0)
}

run()
