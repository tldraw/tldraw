/* eslint-disable no-console */
import { existsSync, readFileSync, readdirSync } from 'fs'
import { createServer } from 'http'
import postgres from 'postgres'

const postgresConnectionString: string =
	process.env.BOTCOM_POSTGRES_POOLED_CONNECTION_STRING ||
	'postgresql://user:password@127.0.0.1:6543/postgres'

if (!postgresConnectionString) {
	throw new Error('Missing BOTCOM_POSTGRES_POOLED_CONNECTION_STRING env var')
}
console.log('Using connection string:', postgresConnectionString)

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
const dryRun = process.argv.includes('--dry-run')

const DRY_RUN_ROLLBACK = new Error('dry-run-rollback')

async function waitForPostgres() {
	let attempts = 0
	do {
		try {
			const sql = postgres(postgresConnectionString, {
				connection: {
					application_name: 'waitForPostgres',
				},
			})
			await sql`SELECT 1`
			await sql.end()
			break
		} catch (_e) {
			if (attempts++ > 100) {
				throw new Error('Failed to connect to postgres')
			}
			console.log('Waiting for postgres' + '.'.repeat(attempts))
			await new Promise((resolve) => setTimeout(resolve, 500))
		}
		// eslint-disable-next-line no-constant-condition
	} while (true)
	const sql = postgres(postgresConnectionString)
	await sql.unsafe(init).simple()
	await sql.end()
}

async function migrate(summary: string[], dryRun: boolean) {
	const db = postgres(postgresConnectionString, {
		connection: {
			application_name: 'migrate',
		},
	})
	await db.begin(async (sql) => {
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
				const migrationSql = readFileSync(`${migrationsPath}/${migration}`, 'utf8').toString()
				if (migrationSql.match(/(BEGIN|COMMIT);/)) {
					throw new Error(
						`Migration ${migration} contains a transaction block. Migrations run in transactions, so you don't need to include them in the migration file.`
					)
				}
				await sql.unsafe(migrationSql).simple()
				await sql`INSERT INTO migrations.applied_migrations (filename) VALUES (${migration})`
				summary.push(`✅ ${migration} applied`)
			} catch (e) {
				summary.push(`❌ ${migration} failed`)
				throw e
			}
		}
		if (dryRun) {
			throw DRY_RUN_ROLLBACK
		}
	})
	db.end()
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
		await migrate(summary, dryRun)
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
		if (e === DRY_RUN_ROLLBACK) {
			console.log(summary.join('\n'))
			console.log('🧹 Rolling back dry run...')
			process.exit(0)
		}
		console.error(e)
		console.error(summary.join('\n'))
		console.error('🧹 Rolling back...')
		process.exit(1)
	}
}

run()
