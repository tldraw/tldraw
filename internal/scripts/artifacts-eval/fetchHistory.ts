import { existsSync, mkdirSync, statSync, writeFileSync } from 'fs'
import { join } from 'path'
import { nicelog } from '../lib/nicelog'
import { HISTORY_BUCKETS } from './lib/config'
import { createR2Client, getObjectBytes } from './lib/r2'
import type { RoomSample } from './lib/types'
import { historyDir, loadRooms, resolveWorkDir, writeJson } from './lib/workdir'

interface FetchArgs {
	'work-dir'?: string
	'max-versions'?: number
	strategy?: 'latest' | 'spread'
	concurrency?: number
	slug?: string
}

function pickVersions(room: RoomSample, maxVersions: number | undefined, strategy: string) {
	if (!maxVersions || room.timestamps.length <= maxVersions) return room.timestamps
	if (strategy === 'spread') {
		const step = (room.timestamps.length - 1) / (maxVersions - 1)
		return Array.from({ length: maxVersions }, (_, i) => room.timestamps[Math.round(i * step)])
	}
	return room.timestamps.slice(-maxVersions)
}

async function runPool<T>(items: T[], concurrency: number, fn: (item: T) => Promise<void>) {
	let next = 0
	const workers = Array.from({ length: Math.min(concurrency, items.length) }, async () => {
		while (next < items.length) {
			const item = items[next++]
			await fn(item)
		}
	})
	await Promise.all(workers)
}

export async function fetchHistory(args: FetchArgs) {
	const workDir = resolveWorkDir(args)
	const allRooms = loadRooms(workDir)
	const rooms = allRooms.filter((room) => !args.slug || room.slug === args.slug)
	const r2 = createR2Client()
	const concurrency = args.concurrency ?? 8

	for (const room of rooms) {
		const bucket = HISTORY_BUCKETS[room.env]
		const dir = historyDir(workDir, room.slug)
		mkdirSync(dir, { recursive: true })
		const versions = pickVersions(room, args['max-versions'], args.strategy ?? 'latest')
		if (versions.length < room.timestamps.length) {
			nicelog(`${room.slug}: thinning ${room.timestamps.length} -> ${versions.length} versions`)
		}

		let fetched = 0
		let skipped = 0
		let bytes = 0
		await runPool(versions, concurrency, async (timestamp) => {
			const filePath = join(dir, `${timestamp}.json`)
			const key = `${room.isApp ? 'app_rooms' : 'public_rooms'}/${room.slug}/${timestamp}`
			if (existsSync(filePath)) {
				bytes += statSync(filePath).size
				skipped++
				return
			}
			for (let attempt = 0; ; attempt++) {
				try {
					const body = await getObjectBytes(r2, bucket, key)
					writeFileSync(filePath, body)
					bytes += body.length
					fetched++
					return
				} catch (err) {
					if (attempt >= 7) throw err
					nicelog(`  retry ${attempt + 1} for ${key}: ${(err as Error).name ?? err}`)
					await new Promise((resolve) => setTimeout(resolve, 2000 * (attempt + 1)))
				}
			}
		})

		room.fetchedBytes = bytes
		nicelog(
			`${room.slug}: fetched=${fetched} skipped=${skipped} bytes=${(bytes / 1024 / 1024).toFixed(1)}MB` +
				(bytes === room.totalRawBytes ? '' : ` (listing said ${room.totalRawBytes})`)
		)
	}

	writeJson(join(workDir, 'rooms.json'), allRooms)
	nicelog('Done')
}
