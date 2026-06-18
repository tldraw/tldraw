/* eslint-disable no-console */
import { existsSync, readFileSync, readdirSync } from 'fs'
import { createServer } from 'http'
import { Kysely, PostgresDialect, sql } from 'kysely'
import pg from 'pg'

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

// Tell Zero about schema changes so it updates its replica in place instead of a
// full reset (Supabase doesn't fire event triggers for ALTER PUBLICATION). Guarded
// because migrations run before Zero boots, so zero_0 may not exist yet on a fresh
// database. to_regprocedure resolves the no-arg overload (to_regproc returns NULL
// when the name is ambiguous, silently skipping the call).
// https://zero.rocicorp.dev/docs/connecting-to-postgres#schema-change-hooks
const notifyZeroOfSchemaChange = `
DO $$
BEGIN
  IF to_regprocedure('zero_0.update_schemas()') IS NOT NULL THEN
    PERFORM zero_0.update_schemas();
  END IF;
END $$;
`

const shouldSignalSuccess = process.argv.includes('--signal-success')
const dryRun = process.argv.includes('--dry-run')

const DRY_RUN_ROLLBACK = new Error('dry-run-rollback')

const db = new Kysely({
	dialect: new PostgresDialect({
		pool: new pg.Pool({
			connectionString: postgresConnectionString,
			application_name: 'migrate',
			idleTimeoutMillis: 10_000,
			max: 1,
		}),
	}),
	log: ['error'],
})

async function waitForPostgres() {
	let attempts = 0
	do {
		try {
			await sql`SELECT 1`.execute(db)
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
	await sql.raw(init).execute(db)
}

async function migrate(summary: string[], dryRun: boolean) {
	await db.transaction().execute(async (tx) => {
		const appliedMigrations = await sql<{
			filename: string
		}>`SELECT filename FROM migrations.applied_migrations`.execute(tx)
		const migrations = readdirSync(`./migrations`).sort()
		if (migrations.length === 0) {
			throw new Error('No migrations found')
		}

		// check that all applied migrations exist
		for (const appliedMigration of appliedMigrations.rows) {
			if (!migrations.includes(appliedMigration.filename)) {
				throw new Error(`Previously-applied migration ${appliedMigration.filename} not found`)
			}
		}

		// We hardcode the `zero_0` shard schema. If Zero is ever reconfigured with a
		// different app id or shard, that name changes and our guards would silently
		// stop firing, reverting us to full resets. Fail loudly if it drifts. (No rows
		// means Zero hasn't booted yet, expected on a fresh database.)
		const shardSchemas = await sql<{ nspname: string }>`
			SELECT DISTINCT n.nspname FROM pg_proc p
			JOIN pg_namespace n ON n.oid = p.pronamespace
			WHERE p.proname = 'update_schemas'
		`.execute(tx)
		const schemaNames = shardSchemas.rows.map((r) => r.nspname)
		if (schemaNames.length > 0 && !schemaNames.includes('zero_0')) {
			throw new Error(
				`Expected Zero shard schema "zero_0" but found ${schemaNames.join(', ')}. Update the hardcoded schema name in migrate.ts and add a new migration to enable ddlDetection on the new schema.`
			)
		}

		let appliedNewMigration = false
		for (const migration of migrations) {
			if (appliedMigrations.rows.some((m: any) => m.filename === migration)) {
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
				await sql.raw(migrationSql).execute(tx)
				await sql`INSERT INTO migrations.applied_migrations (filename) VALUES (${migration})`.execute(
					tx
				)
				appliedNewMigration = true
				summary.push(`✅ ${migration} applied`)
			} catch (e) {
				summary.push(`❌ ${migration} failed`)
				throw e
			}
		}

		// Notify Zero once after all DDL has run (see notifyZeroOfSchemaChange).
		if (appliedNewMigration) {
			await sql.raw(notifyZeroOfSchemaChange).execute(tx)
		}

		if (dryRun) {
			throw DRY_RUN_ROLLBACK
		}
	})
	await db.destroy()
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
