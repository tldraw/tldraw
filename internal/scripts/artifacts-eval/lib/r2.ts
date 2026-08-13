import { GetObjectCommand, ListObjectsV2Command, S3Client } from '@aws-sdk/client-s3'
import { makeEnv } from '../../lib/makeEnv'

export interface ListedObject {
	key: string
	size: number
}

export function createR2Client() {
	const env = makeEnv(['CLOUDFLARE_ACCOUNT_ID', 'R2_ACCESS_KEY_ID', 'R2_ACCESS_KEY_SECRET'])
	return new S3Client({
		region: 'auto',
		endpoint: `https://${env.CLOUDFLARE_ACCOUNT_ID}.r2.cloudflarestorage.com`,
		credentials: {
			accessKeyId: env.R2_ACCESS_KEY_ID,
			secretAccessKey: env.R2_ACCESS_KEY_SECRET,
		},
		// Long history downloads hit occasional stalled reads; be patient and persistent.
		maxAttempts: 5,
		requestHandler: { requestTimeout: 120_000, connectionTimeout: 10_000 },
	})
}

export async function listAllObjects(
	r2: S3Client,
	bucket: string,
	prefix: string
): Promise<ListedObject[]> {
	const objects: ListedObject[] = []
	let continuationToken: string | undefined
	do {
		const batch = await r2.send(
			new ListObjectsV2Command({
				Bucket: bucket,
				Prefix: prefix,
				ContinuationToken: continuationToken,
			})
		)
		for (const obj of batch.Contents ?? []) {
			if (obj.Key) objects.push({ key: obj.Key, size: obj.Size ?? 0 })
		}
		continuationToken = batch.IsTruncated ? batch.NextContinuationToken : undefined
	} while (continuationToken)
	return objects
}

/** Enumerate slugs under e.g. `app_rooms/` using delimiter listing (CommonPrefixes). */
export async function listSlugs(r2: S3Client, bucket: string, rootPrefix: string, max: number) {
	const slugs: string[] = []
	let continuationToken: string | undefined
	do {
		const batch = await r2.send(
			new ListObjectsV2Command({
				Bucket: bucket,
				Prefix: rootPrefix,
				Delimiter: '/',
				ContinuationToken: continuationToken,
			})
		)
		for (const p of batch.CommonPrefixes ?? []) {
			if (!p.Prefix) continue
			slugs.push(p.Prefix.slice(rootPrefix.length, -1))
			if (slugs.length >= max) return slugs
		}
		continuationToken = batch.IsTruncated ? batch.NextContinuationToken : undefined
	} while (continuationToken)
	return slugs
}

export async function getObjectBytes(r2: S3Client, bucket: string, key: string): Promise<Buffer> {
	const res = await r2.send(new GetObjectCommand({ Bucket: bucket, Key: key }))
	if (!res.Body) throw new Error(`No body for ${bucket}/${key}`)
	return Buffer.from(await res.Body.transformToByteArray())
}
