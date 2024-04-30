import { exhaustiveSwitchError } from '@tldraw/utils'
import { getR2KeyForRoom, getRoomIdFromR2Key } from './r2'
import { Environment } from './types'

type TimeFrame = {
	start: number
	end: number
	keep: 'one' | 'all'
}

const MINUTE = 60 * 1000
const HOUR = 60 * MINUTE
const FOUR_HOURS = 4 * HOUR
const TWELEVE_HOURS = 12 * HOUR
const DAY = 24 * HOUR
const WEEK = 7 * DAY
const MONTH = 30 * DAY

const TIME_FRAMES: TimeFrame[] = [
	{
		start: 0,
		end: HOUR,
		keep: 'all',
	},
	{
		start: HOUR,
		end: FOUR_HOURS,
		keep: 'one',
	},
	{
		start: FOUR_HOURS,
		end: TWELEVE_HOURS,
		keep: 'one',
	},
	{
		start: TWELEVE_HOURS,
		end: DAY,
		keep: 'one',
	},
	{ start: DAY, end: WEEK, keep: 'one' },
	{ start: WEEK, end: MONTH, keep: 'one' },
]

function shouldDeleteSnapshot(
	uploaded: Date,
	timeFrameIndex: number,
	timeFrameSnapshots: boolean[],
	monthlySnapshots: Set<string>
) {
	// If the snapshot falls outside of all the time frames we keep one snapshot per month from there on
	if (timeFrameIndex === TIME_FRAMES.length) {
		const yearMonth = `${uploaded.getFullYear()}-${uploaded.getMonth()}`
		if (monthlySnapshots.has(yearMonth)) {
			return true
		}
		monthlySnapshots.add(yearMonth)
		return false
	}
	const timeFrame = TIME_FRAMES[timeFrameIndex]
	switch (timeFrame.keep) {
		case 'all':
			return false
		case 'one': {
			// If we have already preserverd a snapshot in this time frame, delete the rest
			if (timeFrameSnapshots[timeFrameIndex]) return true
			// Otherwise, preserve this snapshot and mark this time frame as done
			timeFrameSnapshots[timeFrameIndex] = true
			return false
		}
		default:
			exhaustiveSwitchError(timeFrame.keep)
	}
}

async function processRoom(roomId: string, versionCacheBucket: R2Bucket) {
	let snapshotsBatch = await versionCacheBucket.list({ prefix: getR2KeyForRoom(roomId) })
	const snapshots = [...snapshotsBatch.objects]
	while (snapshotsBatch.truncated) {
		const next = await versionCacheBucket.list({
			cursor: snapshotsBatch.cursor,
		})
		snapshots.push(...next.objects)
		snapshotsBatch = next
	}
	snapshots.sort((a, b) => a.uploaded.getDate() - b.uploaded.getDate())
	const monthlySnapshots = new Set<string>()
	const timeFrameSnapshots: boolean[] = Array(TIME_FRAMES.length).fill(false)
	let currentTimeFrameIndex = 0
	let currentTimeFrame = TIME_FRAMES[0]
	for (const snapshot of snapshots) {
		while (
			currentTimeFrameIndex < TIME_FRAMES.length &&
			snapshot.uploaded.getTime() > Date.now() - currentTimeFrame.end
		) {
			currentTimeFrame = TIME_FRAMES[++currentTimeFrameIndex]
		}
		if (
			shouldDeleteSnapshot(
				snapshot.uploaded,
				currentTimeFrameIndex,
				timeFrameSnapshots,
				monthlySnapshots
			)
		) {
			console.log('deleting', snapshot.uploaded, snapshot.key)
			// await versionCacheBucket.delete(snapshot.key)
		} else {
			console.log('keeping', snapshot.uploaded, snapshot.key)
		}
	}
}

export async function onScheduledEvent(
	_controller: ScheduledController,
	env: Environment,
	_ctx: ExecutionContext
) {
	const now = Date.now()
	const versionCacheBucket = env.ROOMS_HISTORY_EPHEMERAL
	let roomsBatch = await versionCacheBucket.list()
	const roomIds = new Set<string>(roomsBatch.objects.map((room) => getRoomIdFromR2Key(room.key)))
	while (roomsBatch.truncated) {
		const next = await versionCacheBucket.list({
			cursor: roomsBatch.cursor,
		})
		next.objects.forEach((room) => roomIds.add(getRoomIdFromR2Key(room.key)))
		roomsBatch = next
	}
	console.log('Number of rooms:', roomIds.size)
	for (const roomId of roomIds) {
		await processRoom(roomId, versionCacheBucket)
	}
	console.log('cron job took', Date.now() - now, 'ms')
}
