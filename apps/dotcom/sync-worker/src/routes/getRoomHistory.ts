import { HistoryResponseBody } from '@tldraw/dotcom-shared'
import { notFound } from '@tldraw/worker-shared'
import { IRequest } from 'itty-router'
import { getR2KeyForRoom } from '../r2'
import { Environment } from '../types'
import { isRoomIdTooLong, roomIdIsTooLong } from '../utils/roomIdIsTooLong'
import { requireWriteAccessToFile } from '../utils/tla/getAuth'
import { isTestFile } from '../utils/tla/isTestFile'

function getMonthPrefix(date: Date): string {
	return date.toISOString().split('T')[0].substring(0, 7)
}

function getPreviousMonth(date: Date): Date {
	const prev = new Date(date)
	prev.setMonth(prev.getMonth() - 1)
	return prev
}

async function fetchTimestampsFromBatch(
	bucket: R2Bucket,
	roomKey: string,
	prefix: string,
	limit: number,
	cursor?: string
): Promise<{ timestamps: string[]; batch: any }> {
	const fullPrefix = `${roomKey}/${prefix}`
	const batch = await bucket.list({
		prefix: fullPrefix,
		limit,
		cursor,
	})

	const timestamps = batch.objects
		.map((o) => o.key.replace(roomKey + '/', ''))
		.filter((timestamp) => timestamp && timestamp !== roomKey)

	return { timestamps, batch }
}

async function fetchTimestampsForPrefix(
	bucket: R2Bucket,
	roomKey: string,
	prefix: string,
	limit?: number
): Promise<string[]> {
	const batchLimit = limit || 1000
	// eslint-disable-next-line prefer-const
	let { timestamps, batch } = await fetchTimestampsFromBatch(bucket, roomKey, prefix, batchLimit)

	// Continue listing if there are more objects
	while (batch.truncated && timestamps.length < (limit || Infinity)) {
		const next = await fetchTimestampsFromBatch(bucket, roomKey, prefix, batchLimit, batch.cursor)
		timestamps.push(...next.timestamps)
		batch = next.batch
	}

	// Sort
	return timestamps.sort((a, b) => b.localeCompare(a))
}

async function monthHasEntries(
	bucket: R2Bucket,
	roomKey: string,
	monthPrefix: string
): Promise<boolean> {
	const timestamps = await fetchTimestampsForPrefix(bucket, roomKey, monthPrefix, 1)
	return timestamps.length > 0
}

export async function getRoomHistory(
	request: IRequest,
	env: Environment,
	isApp: boolean
): Promise<Response> {
	const roomId = request.params.roomId

	if (!roomId) return notFound()
	if (isRoomIdTooLong(roomId)) return roomIdIsTooLong()

	if (isApp) {
		await requireWriteAccessToFile(request, env, roomId)
	}

	if (isTestFile(roomId)) {
		return new Response('Not found', { status: 404 })
	}

	const offset = request.query?.offset as string // offset is the earliest timestamp from the previous page

	const versionCacheBucket = env.ROOMS_HISTORY_EPHEMERAL
	const bucketKey = getR2KeyForRoom({ slug: roomId, isApp })

	let allTimestamps: string[] = []

	let currentMonth = new Date()
	let monthsChecked = 0
	const maxMonthsToCheck = 12
	const targetEntryCount = 1000

	if (offset) {
		try {
			currentMonth = new Date(offset)
		} catch (_e) {
			currentMonth = new Date()
		}
	} else {
		// If we don't have an offset we can check if the room doesn't have too many entries
		const allTimestampsForRoom = await fetchTimestampsForPrefix(
			versionCacheBucket,
			bucketKey,
			'',
			1000
		)

		// If we have fewer than 1000 entries, return them all
		if (allTimestampsForRoom.length < 1000) {
			const roomHistory: HistoryResponseBody = {
				timestamps: allTimestampsForRoom,
				hasMore: false,
			}
			return new Response(JSON.stringify(roomHistory), {
				headers: { 'content-type': 'application/json' },
			})
		}
	}

	// Find the first month with entries
	let foundMonthWithEntries = false
	while (!foundMonthWithEntries && monthsChecked < maxMonthsToCheck) {
		const monthPrefix = getMonthPrefix(currentMonth)
		const hasEntries = await monthHasEntries(versionCacheBucket, bucketKey, monthPrefix)

		if (hasEntries) {
			foundMonthWithEntries = true
		} else {
			currentMonth = getPreviousMonth(currentMonth)
			monthsChecked++
		}
	}

	// If we found a month with entries, start collecting timestamps
	if (foundMonthWithEntries) {
		let monthsCollected = 0
		const maxMonthsToCollect = 12

		// Collect timestamps from multiple months until we reach the target count
		while (allTimestamps.length < targetEntryCount && monthsCollected < maxMonthsToCollect) {
			const monthPrefix = getMonthPrefix(currentMonth)
			const monthTimestamps = await fetchTimestampsForPrefix(
				versionCacheBucket,
				bucketKey,
				monthPrefix
			)

			let filteredTimestamps = monthTimestamps
			if (offset) {
				// Only include timestamps that are strictly less than the offset
				// This ensures no duplicates when paginating
				filteredTimestamps = monthTimestamps.filter((ts) => ts < offset)
			}

			allTimestamps.push(...filteredTimestamps)

			currentMonth = getPreviousMonth(currentMonth)
			monthsCollected++
		}

		allTimestamps = allTimestamps.sort((a, b) => b.localeCompare(a))
	}

	let hasMore = false
	if (allTimestamps.length > 0) {
		// Check if there are more entries in previous months
		let checkMonth = currentMonth
		let monthsToCheck = 12

		while (monthsToCheck > 0) {
			const previousMonthPrefix = getMonthPrefix(checkMonth)
			const hasMoreEntries = await monthHasEntries(
				versionCacheBucket,
				bucketKey,
				previousMonthPrefix
			)

			if (hasMoreEntries) {
				hasMore = true
				break
			}

			checkMonth = getPreviousMonth(checkMonth)
			monthsToCheck--
		}
	}

	const response: HistoryResponseBody = {
		timestamps: allTimestamps,
		hasMore,
	}

	return new Response(JSON.stringify(response), {
		headers: { 'content-type': 'application/json' },
	})
}
