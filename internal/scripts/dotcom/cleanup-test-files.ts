import { DeleteObjectCommand, S3Client } from '@aws-sdk/client-s3'
import { Client } from 'pg'
import { makeEnv } from '../lib/makeEnv'

const env = makeEnv([
	'CLOUDFLARE_ACCOUNT_ID',
	'CLOUDFLARE_API_TOKEN',
	'R2_ACCESS_KEY_ID',
	'R2_ACCESS_KEY_SECRET',
	'SUPABASE_STAGING_DB_URL',
])

const CLOUDFLARE_API_BASE_URL = 'https://api.cloudflare.com/client/v4'
const CLOUDFLARE_ACCOUNTS_URL = `${CLOUDFLARE_API_BASE_URL}/accounts/${env.CLOUDFLARE_ACCOUNT_ID}`
const R2_URL = `https://${env.CLOUDFLARE_ACCOUNT_ID}.r2.cloudflarestorage.com`
const R2_STAGING_BUCKET = 'rooms-preview'

const R2 = new S3Client({
	region: 'auto',
	endpoint: R2_URL,
	credentials: {
		accessKeyId: env.R2_ACCESS_KEY_ID,
		secretAccessKey: env.R2_ACCESS_KEY_SECRET,
	},
})

async function cleanupTestFiles() {
	const response = await fetch(
		`${CLOUDFLARE_ACCOUNTS_URL}/d1/database/0c0f43fd-2bca-45fe-833e-dd570cf82740/query`,
		{
			method: 'POST',
			headers: {
				Authorization: `Bearer ${env.CLOUDFLARE_API_TOKEN}`,
				'Content-Type': 'application/json',
			},
			body: JSON.stringify({
				sql: 'SELECT id FROM test_file',
			}),
		}
	)

	const result = await response.json()
	if (!result.success) {
		throw new Error('Failed to query D1 database')
	}

	const fileIds = result.results.map((row: any) => row.id)

	for (const fileId of fileIds) {
		try {
			const deleteParams = {
				Bucket: R2_STAGING_BUCKET,
				Key: `app_rooms/${fileId}`,
			}

			const deleteResponse = await R2.send(new DeleteObjectCommand(deleteParams))
			// TODO: Unsure if this is the correct way to check for a successful delete
			if (
				!deleteResponse.$metadata.httpStatusCode ||
				deleteResponse.$metadata.httpStatusCode !== 204
			) {
				console.error('Failed to delete file from R2 staging bucket')
				continue
			}

			const stagingClient = new Client({
				connectionString: env.SUPABASE_STAGING_DB_URL,
			})
			await stagingClient.connect()

			const deleteFileQuery = `DELETE FROM file WHERE id = $1`
			const deleteResult = await stagingClient.query(deleteFileQuery, [fileId])
			await stagingClient.end()

			if (deleteResult.rowCount === 0) {
				console.error('Failed to delete file from Supabase database - no rows affected')
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
						sql: `DELETE FROM test_file WHERE id = '${fileId}'`,
					}),
				}
			)

			if (!d1Response.ok) {
				console.error('Failed to delete record from D1 database')
				continue
			}
		} catch (error) {
			console.error('Failed to delete file', error)
		}
	}

	console.log(`Successfully cleaned up ${fileIds.length} test files`)
}

cleanupTestFiles().catch(console.error)
