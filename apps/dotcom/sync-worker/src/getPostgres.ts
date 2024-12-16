import postgres from 'postgres'
import { Environment } from './types'

/**
 * `pooled` should be almost always be true.
 */
export function getPostgres(
	env: Environment,
	{ pooled, name, idleTimeout = 30 }: { pooled: boolean; name: string; idleTimeout?: number }
) {
	return postgres(
		pooled ? env.BOTCOM_POSTGRES_POOLED_CONNECTION_STRING : env.BOTCOM_POSTGRES_CONNECTION_STRING,
		{
			types: {
				bigint: {
					from: [20], // PostgreSQL OID for BIGINT
					parse: (value: string) => Number(value), // Convert string to number
					to: 20,
					serialize: (value: number) => String(value), // Convert number to string
				},
			},
			idle_timeout: idleTimeout,
			connection: {
				application_name: name,
			},
		}
	)
}
