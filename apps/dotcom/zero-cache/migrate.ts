/* eslint-disable no-console */
import { readFileSync, readdirSync } from 'fs'
import { createServer } from 'http'
import postgres from 'postgres'
import { migrationsPath, postgresConnectionString, waitForPostgres } from './postgres'

console.log('Using connection string:', postgresConnectionString)

const shouldSignalSuccess = process.argv.includes('--signal-success')
const dryRun = process.argv.includes('--dry-run')

const DRY_RUN_ROLLBACK = new Error('dry-run-rollback')

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
