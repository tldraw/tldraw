import postgres from 'postgres'
import { Environment } from './types'

export function getPostgres(env: Environment) {
	return postgres(env.BOTCOM_POSTGRES_CONNECTION_STRING, {
		types: {
			bigint: {
				from: [20], // PostgreSQL OID for BIGINT
				parse: (value: string) => Number(value), // Convert string to number
				to: 20,
				serialize: (value: number) => String(value), // Convert number to string
			},
		},
	})
}
