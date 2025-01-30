/* eslint-disable no-console */
import { execSync } from 'child_process'
import { getPostgresAndMigrations, waitForPostgres } from './postgres'

async function checkMigrations() {
	const { migrations, appliedMigrations } = await getPostgresAndMigrations('check-migrations')
	console.log('Checking migrations')
	// check that all applied migrations exist
	for (const appliedMigration of appliedMigrations) {
		if (!migrations.includes(appliedMigration.filename)) {
			console.error(`Migration ${appliedMigration.filename} is missing. Will clean the db.`)
			execSync('yarn clean')
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
