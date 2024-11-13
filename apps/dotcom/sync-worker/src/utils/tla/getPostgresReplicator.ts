import { TLPostgresReplicator } from '../../TLPostgresReplicator'
import { Environment } from '../../types'

export function getPostgresReplicator(env: Environment) {
	const id = env.TL_PG_REPLICATOR.idFromName('0')
	return env.TL_PG_REPLICATOR.get(id, { locationHint: 'weur' }) as any as TLPostgresReplicator
}
