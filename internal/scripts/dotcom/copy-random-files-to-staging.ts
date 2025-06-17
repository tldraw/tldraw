import { GetObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3'
import { writeFileSync } from 'fs'
import { nanoid } from 'nanoid'
import { join } from 'path'
import { Client } from 'pg'
import { makeEnv } from '../lib/makeEnv'

const env = makeEnv([
	'CLOUDFLARE_ACCOUNT_ID',
	'CLOUDFLARE_API_TOKEN',
	'R2_ACCESS_KEY_ID',
	'R2_ACCESS_KEY_SECRET',
	'SUPABASE_DB_URL',
])

const R2_URL = `https://${env.CLOUDFLARE_ACCOUNT_ID}.r2.cloudflarestorage.com`
const R2_PRODUCTION_BUCKET = 'rooms'
const R2_STAGING_BUCKET = 'rooms-preview'
const CLOUDFLARE_API_BASE_URL = 'https://api.cloudflare.com/client/v4'
const CLOUDFLARE_ACCOUNTS_URL = `${CLOUDFLARE_API_BASE_URL}/accounts/${env.CLOUDFLARE_ACCOUNT_ID}`

const R2 = new S3Client({
	region: 'auto',
	endpoint: R2_URL,
	credentials: {
		accessKeyId: env.R2_ACCESS_KEY_ID,
		secretAccessKey: env.R2_ACCESS_KEY_SECRET,
	},
})

async function getRandomFileIds(n: number): Promise<string[]> {
	const client = new Client({
		connectionString: env.SUPABASE_DB_URL,
	})
	await client.connect()

	const threeDays = 3 * 24 * 60 * 60 * 1000

	const query = `
		SELECT * FROM file
		TABLESAMPLE BERNOULLI(30)
		WHERE "shared" = true
		  AND ("updatedAt" - "createdAt") >= $1
		LIMIT $2;
	`

	const { rows } = await client.query(query, [threeDays, n])
	await client.end()

	if (!rows || rows.length === 0) {
		console.log('No files found matching the criteria')
		return []
	}

	return rows.map((r) => r.id)
}

async function copyFilesToStaging(fileIds: string[]) {
	const copiedIds: string[] = []
	for (const fileId of fileIds) {
		try {
			const getParams = {
				Bucket: R2_PRODUCTION_BUCKET,
				Key: `app_rooms/${fileId}`,
			}

			const getResponse = await R2.send(new GetObjectCommand(getParams))

			if (!getResponse.Body) {
				console.error('Failed to download file - no body')
				continue
			}

			const fileContent = await getResponse.Body.transformToByteArray()

			const newId = nanoid()

			const putParams = {
				Bucket: R2_STAGING_BUCKET,
				Key: `app_rooms/${newId}`,
				Body: Buffer.from(fileContent),
				ContentType: 'application/octet-stream',
			}

			const putResponse = await R2.send(new PutObjectCommand(putParams))
			if (!putResponse.$metadata.httpStatusCode || putResponse.$metadata.httpStatusCode !== 200) {
				console.error('Failed to upload file to staging bucket')
				continue
			}

			const d1Response = await fetch(
				`${CLOUDFLARE_ACCOUNTS_URL}/d1/database/0c0f43fd-2bca-45fe-833e-dd570cf82740/query`,
				{
					method: 'POST',
					headers: {
						Authorization: `Bearer ${env.CLOUDFLARE_API_TOKEN}`,
						'Content-Type': 'application/json',
					},
					body: JSON.stringify({
						sql: `INSERT INTO test_file (id) VALUES ('${newId}')`,
					}),
				}
			)

			if (!d1Response.ok) {
				console.error('Failed to store id in D1')
				continue
			}

			copiedIds.push(newId)
		} catch (error) {
			console.error('Error copying file:', error)
		}
	}
	console.log(`Successfully copied ${copiedIds.length} files to staging`)

	if (copiedIds.length > 0) {
		const testFilesPath = join(
			__dirname,
			'../../../apps/dotcom/client/e2e/fixtures/test-files.json'
		)
		writeFileSync(testFilesPath, JSON.stringify(copiedIds, null, 2))
		console.log('Updated test files')
	}
}

async function main() {
	const n = 10

	console.log('Getting random file IDs...')
	const fileIds = await getRandomFileIds(n)
	if (fileIds.length === 0) {
		console.log('No files found to copy')
		return
	}

	console.log('\nCopying files to staging...')
	await copyFilesToStaging(fileIds)
}

main().catch(console.error)
