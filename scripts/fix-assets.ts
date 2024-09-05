import {
	DeleteObjectCommand,
	GetObjectCommand,
	ListObjectsV2Command,
	ListObjectsV2CommandOutput,
	PutObjectCommand,
	S3Client,
	_Object,
} from '@aws-sdk/client-s3'
import { writeFile } from 'fs/promises'
import { optimize } from 'svgo'
import { readJsonIfExists } from './lib/file'
import { makeEnv } from './lib/makeEnv'

const DRY_RUN = true

const env = makeEnv(['R2_ACCESS_KEY_ID', 'R2_ACCESS_KEY_SECRET'])

const R2_URL = 'https://c34edc4e76350954b63adebde86d5eb1.r2.cloudflarestorage.com'
const R2_BUCKET = 'cdn'

const dryRunMessage = DRY_RUN ? ' (skipped for dry run)' : ''

const R2 = new S3Client({
	region: 'auto',
	endpoint: R2_URL,
	credentials: {
		accessKeyId: env.R2_ACCESS_KEY_ID,
		secretAccessKey: env.R2_ACCESS_KEY_SECRET,
	},
})

async function main() {
	const objects = await readStoredObjectList()
	console.log(`Found ${objects.length} objects in objects.json`)

	const errorObjects = []

	let done = 0
	const concurrency = new Concurrency(25)
	const allDone = Promise.all(
		objects.map(async (object) => {
			try {
				await concurrency.add(() => processObject(object))
			} catch (err) {
				console.log('Error processing object', object.Key, err)
				errorObjects.push(object)
			} finally {
				done++
				console.log(
					`Done ${((done / objects.length) * 100).toFixed(1)}% (${done}/${objects.length}, ${errorObjects.length} errors)`
				)
			}
		})
	)

	await allDone
}

async function readStoredObjectList(): Promise<_Object[]> {
	const objects = readJsonIfExists('objects.json')
	if (!objects) throw new Error('objects.json not found')
	return objects
}

async function writeObjectListToObjectJson() {
	const objects = []
	for await (const object of listAllObjects()) {
		objects.push(object)
	}
	writeFile('objects.json', JSON.stringify(objects, null, 2))
	console.log(`Wrote ${objects.length} objects to objects.json`)
}

async function processObject(object: _Object) {
	if (object.Key!.startsWith('hi/')) {
		await deleteObject(object)
		return
	}

	const contents = await getOptimized(object)
	await uploadObject(object.Key!, contents)
}

const optimizedByEtag = new Map<string, { body: Uint8Array; contentType: string }>()
async function getOptimized(object: _Object) {
	const contents = await getObject(object)
	if (!object.Key!.endsWith('.svg')) return contents

	const etag = object.ETag
	if (!etag) throw new Error('No ETag')
	if (optimizedByEtag.has(etag)) return optimizedByEtag.get(etag)!

	console.log(`Optimizing ${object.Key} (${etag})`)
	const optimized = {
		contentType: contents.contentType,
		body: encode(optimize(decode(contents.body)).data),
	}
	optimizedByEtag.set(etag, optimized)
	return optimized
}

function encode(text: string): Uint8Array {
	return new TextEncoder().encode(text)
}
function decode(buffer: Uint8Array) {
	return new TextDecoder().decode(buffer)
}

async function uploadObject(
	key: string,
	{ body, contentType }: { body: Uint8Array; contentType: string }
) {
	console.log(`Uploading ${key} ${dryRunMessage}`)
	if (DRY_RUN) return
	await R2.send(
		new PutObjectCommand({
			Bucket: R2_BUCKET,
			Key: key,
			Body: body,
			ContentType: contentType,
			// these assets will never change, so we can cache them forever:
			CacheControl: 'public, max-age=31536000, immutable',
		})
	)
}

async function deleteObject(object: _Object) {
	console.log(`Deleting ${object.Key} ${dryRunMessage}`)
	if (DRY_RUN) return
	await R2.send(
		new DeleteObjectCommand({
			Bucket: R2_BUCKET,
			Key: object.Key,
		})
	)
}

const contentsByEtag = new Map<string, Promise<{ body: Uint8Array; contentType: string }>>()
async function getObject(object: _Object) {
	const etag = object.ETag
	if (!etag) throw new Error('No ETag')
	if (contentsByEtag.has(etag)) return contentsByEtag.get(etag)!
	const promise = (async () => {
		console.log(`Downloading ${object.Key} (${etag})`)
		const response = await R2.send(
			new GetObjectCommand({
				Bucket: R2_BUCKET,
				Key: object.Key,
			})
		)
		return {
			contentType: response.ContentType!,
			body: await response.Body!.transformToByteArray(),
		}
	})()
	contentsByEtag.set(etag, promise)
	return promise
}

async function* listAllObjects() {
	let page = 1
	let response: ListObjectsV2CommandOutput | null = null

	do {
		const listObjectsCommand: ListObjectsV2Command = new ListObjectsV2Command({
			Bucket: R2_BUCKET,
			ContinuationToken: response?.NextContinuationToken,
		})

		response = await R2.send(listObjectsCommand)
		if (response.Contents) {
			console.log(`Got page ${page++} (${response.Contents.length} objects)`)
			yield* response.Contents
		}
	} while (response.IsTruncated)
}

function assetName(key: string) {
	return key.split('/').slice(1).join('/')
}

class Concurrency {
	constructor(private limit: number) {}

	private queue: (() => Promise<void>)[] = []
	private running = 0

	async add(task: () => Promise<void>): Promise<T> {
		return new Promise((resolve, reject) => {
			this.queue.push(async () => {
				try {
					resolve(await task())
				} catch (error) {
					reject(error)
				}
			})
			this.run()
		})
	}

	private async run() {
		if (this.running >= this.limit) return
		if (this.queue.length === 0) return

		this.running++
		try {
			await this.queue.shift()!()
		} finally {
			this.running--
			this.run()
		}
	}
}

main().catch((error) => {
	console.log(error.stack)
	process.exit(1)
})

// async function uploadFile(key: string, fullPath: string) {
// 	const fileStream = fs.createReadStream(fullPath)
// 	const contentType = mime.getType(fullPath) ?? 'application/octet-stream'
// 	const uploadParams = {
// 		Bucket: R2_BUCKET,
// 		Key: key,
// 		Body: fileStream,
// 		ContentType: contentType,
// 		// these assets will never change, so we can cache them forever:
// 		CacheControl: 'public, max-age=31536000, immutable',
// 	}
// 	process.stdout.write(`  • ${key}`)
// 	await R2.send(new PutObjectCommand(uploadParams))
// 	process.stdout.write(' ✔️\n')
// }
