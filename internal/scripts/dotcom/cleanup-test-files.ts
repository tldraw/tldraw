import { DeleteObjectCommand, S3Client } from '@aws-sdk/client-s3'
import { Client } from 'pg'
import { makeEnv } from '../lib/makeEnv'

const env = makeEnv([
	'CLOUDFLARE_ACCOUNT_ID',
	'R2_ACCESS_KEY_ID',
	'R2_ACCESS_KEY_SECRET',
	'SUPABASE_STAGING_DB_URL',
	'STAGING_OWNER_ID',
])

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
	const stagingClient = new Client({
		connectionString: env.SUPABASE_STAGING_DB_URL,
	})
	await stagingClient.connect()

	try {
		const selectQuery = `SELECT id FROM file WHERE file."ownerId" = $1 AND id LIKE 'test_%'`
		const selectResult = await stagingClient.query(selectQuery, [env.STAGING_OWNER_ID])

		const fileIds = selectResult.rows.map((row: any) => row.id)

		for (const fileId of fileIds) {
			try {
				const deleteParams = {
					Bucket: R2_STAGING_BUCKET,
					Key: `app_rooms/${fileId}`,
				}

				const deleteResponse = await R2.send(new DeleteObjectCommand(deleteParams))
				if (
					!deleteResponse.$metadata.httpStatusCode ||
					(deleteResponse.$metadata.httpStatusCode !== 200 &&
						deleteResponse.$metadata.httpStatusCode !== 204)
				) {
					console.error('Failed to delete file from R2 staging bucket')
					continue
				}

				const deleteFileQuery = `DELETE FROM file WHERE id = $1`
				const deleteResult = await stagingClient.query(deleteFileQuery, [fileId])

				if (deleteResult.rowCount === 0) {
					console.error('Failed to delete file from Supabase database - no rows affected')
					continue
				}
			} catch (error) {
				console.error('Failed to delete file', error)
			}
		}

		console.log(`Successfully cleaned up ${fileIds.length} test files`)
	} finally {
		await stagingClient.end()
	}
}

cleanupTestFiles().catch(console.error)
