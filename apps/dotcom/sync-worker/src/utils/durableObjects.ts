import { TLLoggerDurableObject } from '../TLLoggerDurableObject'
import type { TLPostgresReplicator } from '../TLPostgresReplicator'
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
