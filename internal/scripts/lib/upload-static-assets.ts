import fs from 'fs'
import path from 'path'
import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3'
import mime from 'mime'
import { exec } from './exec'
import { makeEnv } from './makeEnv'

const env = makeEnv(['R2_ACCESS_KEY_ID', 'R2_ACCESS_KEY_SECRET'])

const R2_URL = 'https://c34edc4e76350954b63adebde86d5eb1.r2.cloudflarestorage.com'
const R2_BUCKET = 'cdn'
const ASSETS_FOLDER = './packages/assets'

// How many files to upload to the CDN at once.
const UPLOAD_CONCURRENCY = 16

const R2 = new S3Client({
	region: 'auto',
	endpoint: R2_URL,
	credentials: {
		accessKeyId: env.R2_ACCESS_KEY_ID,
		secretAccessKey: env.R2_ACCESS_KEY_SECRET,
	},
})

async function uploadFile(key: string, fullPath: string) {
	const fileStream = fs.createReadStream(fullPath)
	const contentType = mime.getType(fullPath) ?? 'application/octet-stream'
	const uploadParams = {
		Bucket: R2_BUCKET,
		Key: key,
		Body: fileStream,
		ContentType: contentType,
		// these assets will never change, so we can cache them forever:
		CacheControl: 'public, max-age=31536000, immutable',
	}
	await R2.send(new PutObjectCommand(uploadParams))
	process.stdout.write(`  • ${key} ✔️\n`)
}

function collectFiles(
	prefix: string,
	directoryPath: string
): Array<{ key: string; fullPath: string }> {
	const files: Array<{ key: string; fullPath: string }> = []

	for (const entry of fs.readdirSync(directoryPath, { withFileTypes: true })) {
		const fullPath = path.join(directoryPath, entry.name)
		const key = path.join(prefix, entry.name)

		if (entry.isDirectory()) {
			files.push(...collectFiles(key, fullPath))
		} else if (entry.isFile()) {
			files.push({ key, fullPath })
		}
	}

	return files
}

export async function uploadStaticAssets(version: string) {
	try {
		await exec('yarn', ['refresh-assets'], { env: { ALLOW_REFRESH_ASSETS_CHANGES: '1' } })

		const entries = fs.readdirSync(ASSETS_FOLDER, { withFileTypes: true })

		// Gather every file across all asset folders up front so we can upload
		// them with bounded concurrency instead of one at a time.
		const files: Array<{ key: string; fullPath: string }> = []
		for (const entry of entries) {
			if (entry.name.startsWith('.')) continue
			if (!entry.isDirectory()) continue

			const folderName = entry.name
			files.push(...collectFiles(`${version}/${folderName}`, `${ASSETS_FOLDER}/${folderName}`))
		}

		console.log(`Uploading ${files.length} static assets to CDN...`)

		// Upload files in parallel, keeping at most UPLOAD_CONCURRENCY requests in
		// flight at a time. Workers pull from a shared queue until it's empty.
		let next = 0
		async function worker() {
			while (next < files.length) {
				const { key, fullPath } = files[next++]
				await uploadFile(key, fullPath)
			}
		}
		await Promise.all(
			Array.from({ length: Math.min(UPLOAD_CONCURRENCY, files.length) }, () => worker())
		)

		console.log('Uploaded!')
	} catch (e) {
		console.error(e)
		process.exit(1)
	}
}
