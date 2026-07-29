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

/**
 * The durable object id a room is addressed by. Split out from `getRoomDurableObject` because
 * telemetry indexes on this value without wanting a stub — and because both must derive it the same
 * way: an id computed from a different name is a different object, silently.
 */
export function getRoomDurableObjectId(env: Environment, roomId: string) {
	return env.TLDR_DOC.idFromName(`/${ROOM_PREFIX}/${roomId}`)
}

export function getRoomDurableObject(env: Environment, roomId: string) {
	return env.TLDR_DOC.get(getRoomDurableObjectId(env, roomId)) as any as TLFileDurableObject
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
