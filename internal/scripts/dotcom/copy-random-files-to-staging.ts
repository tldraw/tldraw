import { GetObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3'
import type { TlaFile } from '@tldraw/dotcom-shared'
import { writeFileSync } from 'fs'
import { nanoid } from 'nanoid'
import { join } from 'path'
import { Client } from 'pg'
import { makeEnv } from '../lib/makeEnv'

const env = makeEnv([
	'CLOUDFLARE_ACCOUNT_ID',
	'R2_ACCESS_KEY_ID',
	'R2_ACCESS_KEY_SECRET',
	'SUPABASE_PRODUCTION_DB_URL',
	'SUPABASE_STAGING_DB_URL',
	'STAGING_OWNER_ID',
])

const R2_URL = `https://${env.CLOUDFLARE_ACCOUNT_ID}.r2.cloudflarestorage.com`
const R2_PRODUCTION_BUCKET = 'rooms'
const R2_STAGING_BUCKET = 'rooms-preview'

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
		connectionString: env.SUPABASE_PRODUCTION_DB_URL,
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

	// Create one staging client for all database operations
	const stagingClient = new Client({
		connectionString: env.SUPABASE_STAGING_DB_URL,
	})
	await stagingClient.connect()

	try {
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

				const newId = `test_${nanoid()}`

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

				const now = Date.now()
				const testFile: TlaFile = {
					id: newId,
					name: 'Test File',
					ownerId: env.STAGING_OWNER_ID,
					ownerName: 'Test User',
					ownerAvatar: '',
					thumbnail: '',
					shared: false,
					sharedLinkType: 'link',
					published: false,
					lastPublished: 0,
					publishedSlug: nanoid(),
					createdAt: now,
					updatedAt: now,
					isEmpty: false,
					isDeleted: false,
					createSource: null,
					owningGroupId: null,
				}

				const insertQuery = `
					INSERT INTO file (id, name, "ownerId", "ownerName", "ownerAvatar", thumbnail, shared, "sharedLinkType", published, "lastPublished", "publishedSlug", "createdAt", "updatedAt", "isEmpty", "isDeleted", "owningGroupId")
					VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
				`
				await stagingClient.query(insertQuery, [
					testFile.id,
					testFile.name,
					testFile.ownerId,
					testFile.ownerName,
					testFile.ownerAvatar,
					testFile.thumbnail,
					testFile.shared,
					testFile.sharedLinkType,
					testFile.published,
					testFile.lastPublished,
					testFile.publishedSlug,
					testFile.createdAt,
					testFile.updatedAt,
					testFile.isEmpty,
					testFile.isDeleted,
					testFile.owningGroupId,
				])

				copiedIds.push(newId)
			} catch (error) {
				console.error('Error copying file:', error)
			}
		}
	} finally {
		await stagingClient.end()
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
	const n = parseInt(process.env.STAGING_TEST_FILES_COUNT || '10')
	console.log(`Getting ${n} random file IDs...`)
	const fileIds = await getRandomFileIds(n)
	if (fileIds.length === 0) {
		console.log('No files found to copy')
		return
	}

	console.log('\nCopying files to staging...')
	await copyFilesToStaging(fileIds)
}

main().catch(console.error)
