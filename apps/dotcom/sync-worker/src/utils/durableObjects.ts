import { ROOM_PREFIX } from '@tldraw/dotcom-shared'
import { TLFileDurableObject } from '../TLFileDurableObject'
import { TLLoggerDurableObject } from '../TLLoggerDurableObject'
import type { TLPostgresReplicator } from '../TLPostgresReplicator'
import { TLStatsDurableObject } from '../TLStatsDurableObject'
import type { TLUserDurableObject } from '../TLUserDurableObject'
import { Environment } from '../types'

export function getReplicator(env: Environment) {
	return env.TL_PG_REPLICATOR.get(env.TL_PG_REPLICATOR.idFromName('0'), {
		locationHint: 'weur',
	}) as any as TLPostgresReplicator
}

export function getUserDurableObject(env: Environment, userId: string) {
	return env.TL_USER.get(env.TL_USER.idFromName(userId)) as any as TLUserDurableObject
}

export function getLogger(env: Environment) {
	return env.TL_LOGGER.get(env.TL_LOGGER.idFromName('logger')) as any as TLLoggerDurableObject
}

function roomDurableObjectId(env: Environment, roomId: string) {
	return env.TLDR_DOC.idFromName(`/${ROOM_PREFIX}/${roomId}`)
}

/**
 * The durable object id for a room, as a string, without creating or waking the object —
 * `idFromName` is a local derivation with no network cost.
 *
 * This is the value analytics indexes on, so a writer running in worker context can attribute a
 * datapoint to the room it is _about_ and have it join to the events the room itself emits. It
 * shares its name derivation with {@link getRoomDurableObject}, so the two cannot drift apart and
 * start naming different objects for the same room.
 *
 * `roomId` is a file id, not a published slug: resolve a published slug through
 * `getPublishedFileInfo` first, or this yields a valid-looking id for an object that never existed.
 */
export function getRoomDurableObjectId(env: Environment, roomId: string) {
	return roomDurableObjectId(env, roomId).toString()
}

export function getRoomDurableObject(env: Environment, roomId: string) {
	return env.TLDR_DOC.get(roomDurableObjectId(env, roomId)) as any as TLFileDurableObject
}

function shouldRecordStats(env: Environment): boolean {
	return env.TLDRAW_ENV === 'production'
}

export function getStatsDurableObjct(env: Environment) {
	if (shouldRecordStats(env)) {
		return env.TL_STATS.get(env.TL_STATS.idFromName('stats')) as any as TLStatsDurableObject
	}

	return {
		recordUserDoAbort: async () => {},
		recordReplicatorBootRetry: async () => {},
		recordReplicatorPostgresUpdate: async () => {},
		unusualNumberOfUserDOAborts: async () => false,
		unusualNumberOfReplicatorBootRetries: async () => false,
		isReplicatorGettingUpdates: async () => true,
	} as any as TLStatsDurableObject
}
