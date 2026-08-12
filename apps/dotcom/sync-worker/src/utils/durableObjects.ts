import { ROOM_PREFIX } from '@tldraw/dotcom-shared'
import { TLFileDurableObject } from '../TLFileDurableObject'
import type { TLFileEffectProcessor } from '../TLFileEffectProcessor'
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

export function getFileEffectProcessor(env: Environment) {
	return env.TL_FILE_EFFECTS.get(env.TL_FILE_EFFECTS.idFromName('0'), {
		locationHint: 'weur',
	}) as any as TLFileEffectProcessor
}

export function getLogger(env: Environment) {
	return env.TL_LOGGER.get(env.TL_LOGGER.idFromName('logger')) as any as TLLoggerDurableObject
}

export function getRoomDurableObject(env: Environment, roomId: string) {
	return env.TLDR_DOC.get(
		env.TLDR_DOC.idFromName(`/${ROOM_PREFIX}/${roomId}`)
	) as any as TLFileDurableObject
}

export function getRoomDurableObjectById(env: Environment, objectId: string) {
	return env.TLDR_DOC.get(env.TLDR_DOC.idFromString(objectId)) as any as TLFileDurableObject
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
