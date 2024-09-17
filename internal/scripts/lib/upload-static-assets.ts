import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3'
import fs from 'fs'
import mime from 'mime'
import path from 'path'
import { exec } from './exec'
import { makeEnv } from './makeEnv'

const env = makeEnv(['R2_ACCESS_KEY_ID', 'R2_ACCESS_KEY_SECRET'])

const R2_URL = 'https://c34edc4e76350954b63adebde86d5eb1.r2.cloudflarestorage.com'
const R2_BUCKET = 'cdn'
const ASSETS_FOLDER = './packages/assets'

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
	process.stdout.write(`  • ${key}`)
	await R2.send(new PutObjectCommand(uploadParams))
	process.stdout.write(' ✔️\n')
}

async function uploadDirectory(prefix: string, directoryPath: string) {
	const entries = fs.readdirSync(directoryPath, { withFileTypes: true })

	for (const entry of entries) {
		const fullPath = path.join(directoryPath, entry.name)
		const key = path.join(prefix, entry.name)

		if (entry.isDirectory()) {
			await uploadDirectory(key, fullPath)
		} else if (entry.isFile()) {
			await uploadFile(key, fullPath)
		}
	}
}

export async function uploadStaticAssets(version: string) {
	try {
		await exec('yarn', ['refresh-assets'], { env: { ALLOW_REFRESH_ASSETS_CHANGES: '1' } })

		const entries = fs.readdirSync(ASSETS_FOLDER, { withFileTypes: true })

		console.log('Uploading static assets to CDN...')

		// Loop through all the folders in the assets folder and upload them.
		for (const entry of entries) {
			if (entry.name.startsWith('.')) continue
			if (!entry.isDirectory()) continue

			const folderName = entry.name
			await uploadDirectory(`${version}/${folderName}`, `${ASSETS_FOLDER}/${folderName}`)
		}

		console.log('Uploaded!')
	} catch (e) {
		console.error(e)
		process.exit(1)
	}
}
