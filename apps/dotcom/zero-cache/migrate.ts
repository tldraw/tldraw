/* eslint-disable no-console */
import dotenv from 'dotenv'
import { existsSync, readdirSync } from 'fs'
import postgres from 'postgres'
dotenv.config()

const postgresConnectionString: string =
	process.env.BOTCOM_POSTGRES_CONNECTION_STRING! || process.env.ZSTART_DB!
if (!postgresConnectionString) {
	throw new Error('Missing BOTCOM_POSTGRES_CONNECTION_STRING or ZSTART_DB in .env')
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

async function waitForPostgres() {
	const sql = postgres(postgresConnectionString)
	process.stdout.write('Waiting for postgres')
	let attempts = 0
	do {
		try {
			await sql`SELECT 1`
			break
		} catch (_e) {
			if (attempts++ > 20) {
				throw new Error('Failed to connect to postgres')
			}
			process.stdout.write('.')
			await new Promise((resolve) => setTimeout(resolve, 250))
		}
		// eslint-disable-next-line no-constant-condition
	} while (true)
	await sql.unsafe(init).simple()
}
async function run() {
	await waitForPostgres()
	const sql = postgres(postgresConnectionString)
	const appliedMigrations = await sql`SELECT filename FROM migrations.applied_migrations`
	const migrations = readdirSync(`./migrations`).sort()
	if (migrations.length === 0) {
		throw new Error('No migrations found')
	}

	for (const migration of migrations) {
		if (appliedMigrations.some((m: any) => m.filename === migration)) {
			console.log(`🏃 ${migration} already applied`)
			continue
		}

		try {
			await sql.begin((s) => s.file(`${migrationsPath}/${migration}`).execute())
			await sql`INSERT INTO migrations.applied_migrations (filename) VALUES (${migration})`
			console.log(`✅ ${migration} applied`)
		} catch (e) {
			console.error(`❌ ${migration} failed`)
			console.error(e)
			process.exit(1)
		}
	}
}

run().catch((e) => {
	console.error(e)
	process.exit(1)
})
