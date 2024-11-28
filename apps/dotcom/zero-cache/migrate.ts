/* eslint-disable no-console */
import { existsSync, readdirSync } from 'fs'
import { createServer } from 'http'
import postgres from 'postgres'

const postgresConnectionString: string =
	process.env.CI === 'true'
		? process.env.BOTCOM_POSTGRES_POOLED_CONNECTION_STRING!
		: 'postgresql://user:password@127.0.0.1:6543/postgres'

if (!postgresConnectionString) {
	throw new Error('Missing BOTCOM_POSTGRES_POOLED_CONNECTION_STRING env var')
}

const migrationsPath = `./migrations`
if (!existsSync(migrationsPath)) {
	throw new Error(`Migrations path not found: ${migrationsPath}`)
}

const init = `
CREATE SCHEMA IF NOT EXISTS migrations;

CREATE TABLE IF NOT EXISTS migrations.applied_migrations (
  filename VARCHAR PRIMARY KEY,
  applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
`

/**
INSERT INTO migrations.applied_migrations (filename) VALUES 
('000_seed.sql'),
('001_replicator_boot.sql'),
('002_add_user_id.sql'),
('003_make_published_slug_unique.sql'),
('004_guest_column_on_file_state.sql'),
('005_update_file_trigger.sql'),
('006_add_file_soft_delete.sql'),
('007_update_file_owner_details.sql')
ON CONFLICT DO NOTHING;
 */

const shouldSignalSuccess = process.argv.includes('--signal-success')

async function waitForPostgres() {
	let attempts = 0
	do {
		try {
			const sql = postgres(postgresConnectionString)
			await sql`SELECT 1`
			break
		} catch (_e) {
			if (attempts++ > 20) {
				throw new Error('Failed to connect to postgres')
			}
			console.log('Waiting for postgres' + '.'.repeat(attempts))
			await new Promise((resolve) => setTimeout(resolve, 500))
		}
		// eslint-disable-next-line no-constant-condition
	} while (true)
	const sql = postgres(postgresConnectionString)
	await sql.unsafe(init).simple()
}

async function migrate(summary: string[]) {
	await postgres(postgresConnectionString).begin(async (sql) => {
		const appliedMigrations = await sql`SELECT filename FROM migrations.applied_migrations`
		const migrations = readdirSync(`./migrations`).sort()
		if (migrations.length === 0) {
			throw new Error('No migrations found')
		}

		// check that all applied migrations exist
		for (const appliedMigration of appliedMigrations) {
			if (!migrations.includes(appliedMigration.filename)) {
				throw new Error(`Previously-applied migration ${appliedMigration.filename} not found`)
			}
		}

		for (const migration of migrations) {
			if (appliedMigrations.some((m: any) => m.filename === migration)) {
				summary.push(`🏃 ${migration} already applied`)
				continue
			}

			try {
				await sql.file(`${migrationsPath}/${migration}`).execute()
				await sql`INSERT INTO migrations.applied_migrations (filename) VALUES (${migration})`
				summary.push(`✅ ${migration} applied`)
			} catch (e) {
				summary.push(`❌ ${migration} failed`)
				throw e
			}
		}
	})
}
async function run() {
	try {
		await waitForPostgres()
	} catch (e) {
		console.error(e)
		process.exit(1)
	}

	const summary: string[] = []
	try {
		await migrate(summary)
		console.log(summary.join('\n'))
		// need to do this to close the db connection
		if (shouldSignalSuccess) {
			const s = createServer((_, res) => {
				res.end('ok')
			})
			s.listen(7654)
		} else {
			process.exit(0)
		}
	} catch (e) {
		console.error(e)
		console.error(summary.join('\n'))
		console.error('🧹 Rolling back...')
		process.exit(1)
	}
}

run()
