/* eslint-disable no-console */
import { existsSync, readFileSync, readdirSync } from 'fs'
import { createServer } from 'http'
import { Kysely, PostgresDialect, sql } from 'kysely'
import pg from 'pg'
import { isNoTransactionMigration, splitSqlStatements } from './migrationFile'

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

interface PendingMigration {
	filename: string
	sql: string
	noTransaction: boolean
}

async function planMigrations(summary: string[]): Promise<PendingMigration[]> {
	const appliedMigrations = await sql<{
		filename: string
	}>`SELECT filename FROM migrations.applied_migrations`.execute(db)
	const applied = new Set(appliedMigrations.rows.map((row) => row.filename))
	const migrations = readdirSync(migrationsPath).sort()
	if (migrations.length === 0) {
		throw new Error('No migrations found')
	}

	// check that all applied migrations exist
	for (const filename of applied) {
		if (!migrations.includes(filename)) {
			throw new Error(`Previously-applied migration ${filename} not found`)
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
	`.execute(db)
	const schemaNames = shardSchemas.rows.map((r) => r.nspname)
	if (schemaNames.length > 0 && !schemaNames.includes('zero_0')) {
		throw new Error(
			`Expected Zero shard schema "zero_0" but found ${schemaNames.join(', ')}. Update the hardcoded schema name in migrate.ts and add a new migration to enable ddlDetection on the new schema.`
		)
	}

	const pending: PendingMigration[] = []
	for (const filename of migrations) {
		if (applied.has(filename)) {
			summary.push(`🏃 ${filename} already applied`)
			continue
		}
		const migrationSql = readFileSync(`${migrationsPath}/${filename}`, 'utf8')
		if (migrationSql.match(/(BEGIN|COMMIT);/)) {
			throw new Error(
				`Migration ${filename} contains a transaction block. The runner owns transactions: ordinary migrations already run inside one, and a "-- no-transaction" migration must not open one.`
			)
		}
		pending.push({
			filename,
			sql: migrationSql,
			noTransaction: isNoTransactionMigration(migrationSql),
		})
	}
	return pending
}

async function applyMigration(executor: Kysely<any>, step: PendingMigration, summary: string[]) {
	try {
		if (step.noTransaction) {
			for (const statement of splitSqlStatements(step.sql)) {
				await sql.raw(statement).execute(executor)
			}
		} else {
			await sql.raw(step.sql).execute(executor)
		}
		await sql`INSERT INTO migrations.applied_migrations (filename) VALUES (${step.filename})`.execute(
			executor
		)
		summary.push(`✅ ${step.filename} applied`)
	} catch (e) {
		summary.push(`❌ ${step.filename} failed`)
		throw e
	}
}

// The dry run applies everything in one transaction and rolls it back at the end. A
// no-transaction migration can't be rolled back, so applying it would make the dry run
// permanent; it is skipped, and the summary says so rather than let a green dry run imply
// the whole set was validated.
async function dryRunMigrations(pending: PendingMigration[], summary: string[]) {
	await db.transaction().execute(async (tx) => {
		for (const step of pending) {
			if (step.noTransaction) {
				console.warn(
					`\n⚠️  DRY RUN DID NOT VALIDATE ${step.filename}\n` +
						`   It is marked "-- no-transaction", so it cannot run inside the dry run's transaction\n` +
						`   and was skipped. The real migrate run is the first time it executes here, and the\n` +
						`   migrations after it were just validated against a schema without its effect.\n`
				)
				summary.push(`⚠️ ${step.filename} skipped (no-transaction, not validated by the dry run)`)
			} else {
				await applyMigration(tx, step, summary)
			}
		}

		// Notify Zero once after all DDL has run (see notifyZeroOfSchemaChange).
		if (pending.some((step) => !step.noTransaction)) {
			await sql.raw(notifyZeroOfSchemaChange).execute(tx)
		}

		throw DRY_RUN_ROLLBACK
	})
}

async function migrate(summary: string[], dryRun: boolean) {
	const pending = await planMigrations(summary)

	if (dryRun) {
		await dryRunMigrations(pending, summary)
		return
	}

	// Consecutive ordinary migrations share one transaction, as the whole run did before
	// no-transaction migrations existed; a no-transaction migration runs on its own,
	// outside any. Groups commit independently, so a failure part-way through leaves
	// earlier groups applied. Each ledger row is written with its own migration, so the
	// ledger still matches the schema and a re-run picks up where this one stopped.
	const groups: PendingMigration[][] = []
	for (const step of pending) {
		const last = groups[groups.length - 1]
		if (last && !last[0].noTransaction && !step.noTransaction) {
			last.push(step)
		} else {
			groups.push([step])
		}
	}
	for (const group of groups) {
		if (group[0].noTransaction) {
			await applyMigration(db, group[0], summary)
		} else {
			await db.transaction().execute(async (tx) => {
				for (const step of group) await applyMigration(tx, step, summary)
			})
		}
	}

	// Notify Zero once after all DDL has run (see notifyZeroOfSchemaChange).
	if (pending.length > 0) {
		await sql.raw(notifyZeroOfSchemaChange).execute(db)
	}

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
